import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/toast";
import type { ReadHistoryRecord, StorageConfig, StoredUnifiedInfo, UnifiedStorageItem } from "@/types";
import { MessageType } from "@/types";
import { normalizeReadHistoryHost } from "@/utils/readHistory";
import { matchesHistoryQuery } from "@/utils/historySearch";
import { Download, Upload, Database, Search } from "lucide-react";

/** 历史行内展示：各存储项 source:key=value，分号连接 */
function formatHistoryRecordItemsSummary(items: UnifiedStorageItem[] | undefined): string {
  if (!items?.length) return "";
  return items.map((it) => `${it.source}:${it.key}=${it.value}`).join("; ");
}

export function OperationTab() {
  const [config, setConfig] = useState<StorageConfig | null>(null);
  const [currentTab, setCurrentTab] = useState<{ url: string; title: string } | null>(null);
  const [items, setItems] = useState<UnifiedStorageItem[]>([]);
  const [historyRecords, setHistoryRecords] = useState<ReadHistoryRecord[]>([]);
  const [activeHistoryId, setActiveHistoryId] = useState<string>("");
  const [historySearchText, setHistorySearchText] = useState("");
  const [historySearchOpen, setHistorySearchOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const activeRecord = historyRecords.find((r) => r.id === activeHistoryId);
  const storageKeys = Array.isArray(config?.storageKeys) ? config.storageKeys : [];
  const filteredHistoryRecords = historyRecords.filter((record) =>
    matchesHistoryQuery(record, historySearchText),
  );
  const currentDataDomainWithPort = (() => {
    const sourceUrl = activeRecord?.sourceUrl || currentTab?.url || "";
    if (!sourceUrl) return "--";
    try {
      return new URL(sourceUrl).host || "--";
    } catch {
      return "--";
    }
  })();

  useEffect(() => {
    loadConfig();
    getCurrentTab();
    loadReadHistory();
  }, []);

  useEffect(() => {
    if (config) {
      loadSavedData();
    }
  }, [config]);

  const loadConfig = async () => {
    try {
      const response = await browser.runtime.sendMessage({
        type: MessageType.GET_CONFIG,
      });
      if (response.success && response.data) {
        setConfig(response.data);
      }
    } catch (error) {
      console.error("Failed to load config:", error);
    }
  };

  const getCurrentTab = async () => {
    try {
      const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
      if (tab && tab.url) {
        setCurrentTab({
          url: tab.url,
          title: tab.title || new URL(tab.url).hostname,
        });
      }
    } catch (error) {
      console.error("Failed to get current tab:", error);
    }
  };

  const loadSavedData = async () => {
    if (!config) return;
    try {
      const result = await browser.storage.local.get("lastReadUnified");
      const stored = result.lastReadUnified as { items?: UnifiedStorageItem[] } | undefined;
      if (stored?.items?.length) {
        setItems(stored.items);
        // toast.info(`已加载上次保存的 ${stored.items.length} 条数据`);
      } else {
        setItems([]);
      }
    } catch (error) {
      console.error("Failed to load saved data:", error);
    }
  };

  const loadReadHistory = async (options?: { setActiveFirst?: boolean }) => {
    try {
      const result = await browser.storage.local.get("readHistory");
      const list = (result.readHistory || []) as ReadHistoryRecord[];
      setHistoryRecords(Array.isArray(list) ? list : []);
      if ((options?.setActiveFirst || !activeHistoryId) && list?.length) setActiveHistoryId(list[0].id);
    } catch (error) {
      console.error("Failed to load read history:", error);
    }
  };

  const handleReadData = async () => {
    if (!config) {
      toast.error("请先设置需要获取的存储键名");
      return;
    }
    if (!currentTab?.url) {
      toast.error("无法获取当前标签页信息，请确认页面已打开");
      return;
    }

    setLoading(true);
    try {
      const keys = config.storageKeys ?? (config as { cookieNames?: string[] }).cookieNames ?? [];
      console.log("[StorageDevTools][popup] handleReadData: send", {
        sourceUrl: currentTab.url,
        keys,
      });
      const response = await browser.runtime.sendMessage({
        type: MessageType.READ_STORAGE,
        payload: {
          sourceUrl: currentTab.url,
          keys,
        },
      });

      console.log("[StorageDevTools][popup] handleReadData: response", response);

      if (response.success && response.data) {
        setItems(response.data);
        await loadReadHistory({ setActiveFirst: true });
        if (response.data.length === 0) {
          toast.info("未找到任何数据");
        } else {
          toast.success(`成功读取 ${response.data.length} 条数据`);
        }
      } else {
        toast.error(response.error || "读取失败");
      }
    } catch (error) {
      toast.error("读取数据时出错");
      console.error("Error reading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleActivateRecord = async (record: ReadHistoryRecord) => {
    const nextItems = record.items || [];
    setActiveHistoryId(record.id);
    setItems(nextItems);
    try {
      const stored: StoredUnifiedInfo = {
        items: nextItems,
        sourceUrl: record.sourceUrl,
        timestamp: record.timestamp,
      };
      await browser.storage.local.set({ lastReadUnified: stored });
    } catch (error) {
      console.error("Failed to persist lastReadUnified:", error);
      toast.error("已切换数据，但未写入本地缓存");
    }
    await handleWriteData(nextItems, { activatedRecord: record });
  };

  const handleWriteData = async (
    itemsToWrite: UnifiedStorageItem[] = items,
    options?: { activatedRecord?: ReadHistoryRecord },
  ) => {
    if (itemsToWrite.length === 0) {
      toast.error("没有可写入的数据，请先读取");
      return;
    }
    if (!currentTab?.url) {
      toast.error("无法获取当前标签页信息");
      return;
    }

    setLoading(true);
    try {
      console.log("[StorageDevTools][popup] handleWriteData: send", {
        targetUrl: currentTab.url,
        items: itemsToWrite,
      });
      const response = await browser.runtime.sendMessage({
        type: MessageType.WRITE_STORAGE,
        payload: {
          targetUrl: currentTab.url,
          items: itemsToWrite,
        },
      });

      console.log("[StorageDevTools][popup] handleWriteData: response", response);

      if (response.success) {
        const {
          okCount = 0,
          failCount = 0,
          cookieFailures = [],
        } = (response.data ?? {}) as {
          okCount?: number;
          failCount?: number;
          cookieFailures?: string[];
        };
        const activatedLabel = options?.activatedRecord
          ? `已激活：${options.activatedRecord.staffName}（${options.activatedRecord.staffCode}），`
          : "";
        if (failCount > 0) {
          toast.info(`${activatedLabel}成功写入 ${okCount} 条，${failCount} 条失败`);
          if (cookieFailures.length > 0) {
            console.warn("[StorageDevTools][popup] cookie write failures", cookieFailures);
            toast.error(`Cookie写入失败原因：${cookieFailures[0]}`);
          }
        } else {
          toast.success(`${activatedLabel}成功写入 ${okCount} 条数据`);
        }
      } else {
        toast.error(response.error || "写入失败");
      }
    } catch (error) {
      toast.error("写入数据时出错");
      console.error("Error writing data:", error);
      loadSavedData();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardDescription>读取并写入存储数据到当前标签页</CardDescription>
        <div className="relative">
          <div className="pointer-events-none absolute inset-0 rounded-lg bg-linear-to-r from-blue-500/12 via-violet-500/8 to-fuchsia-500/12 opacity-0 transition-opacity duration-200 peer-focus-within:opacity-100" />
          <Search className="pointer-events-none absolute left-2.5 top-1/2 z-10 h-3.5 w-3.5 -translate-y-1/2 text-blue-500/85 transition-colors duration-200 peer-focus-within:text-violet-500" />
          <input
            type="text"
            value={historySearchText}
            onFocus={() => setHistorySearchOpen(true)}
            onBlur={() => {
              setTimeout(() => setHistorySearchOpen(false), 120);
            }}
            onChange={(event) => {
              setHistorySearchText(event.target.value);
              setHistorySearchOpen(true);
            }}
            placeholder="搜索历史（工号/姓名/拼音），历史记录（最多 100 条）"
            className="peer h-9 w-full rounded-lg border border-blue-200/70 bg-linear-to-r from-blue-50/70 via-background to-violet-50/60 pr-3 pl-8 text-xs text-foreground placeholder:text-muted-foreground transition-all duration-200 hover:border-violet-300/65 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/25 focus-visible:border-violet-400/60 dark:border-blue-400/35 dark:from-blue-500/10 dark:to-violet-500/10 dark:hover:border-violet-400/55"
          />
          {historySearchOpen && (
            <div className="absolute z-20 mt-1.5 max-h-44 w-full overflow-y-auto rounded-lg border border-violet-300/40 bg-popover/95 shadow-xl shadow-violet-500/10 backdrop-blur-sm dark:border-blue-400/30">
              {filteredHistoryRecords.length > 0 ? (
                filteredHistoryRecords.map((r) => {
                  const active = r.id === activeHistoryId;
                  const host = normalizeReadHistoryHost(r.sourceUrl);
                  const itemsSummary = formatHistoryRecordItemsSummary(r.items);
                  const historyDetailLine = [
                    `${r.items?.length ?? 0} 条`,
                    host,
                    ...(itemsSummary ? [itemsSummary] : []),
                  ].join(" · ");
                  return (
                    <button
                      key={`search-${r.id}`}
                      type="button"
                      onClick={() => {
                        setHistorySearchText(`${r.staffName} ${r.staffCode}`);
                        setHistorySearchOpen(false);
                        void handleActivateRecord(r);
                      }}
                      className={[
                        "w-full min-w-0 border-b border-border/60 px-2.5 py-2 text-left transition-colors duration-150 last:border-b-0 hover:bg-violet-500/10",
                        active ? "bg-linear-to-r from-blue-500/12 to-violet-500/16 hover:from-blue-500/16 hover:to-violet-500/22" : "",
                      ].join(" ")}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="truncate text-sm font-medium">
                          {r.staffName}（{r.staffCode}）
                        </div>
                        <div className="shrink-0 text-[10px] text-muted-foreground">
                          {new Date(r.timestamp).toLocaleString()}
                        </div>
                      </div>
                      <div
                        className="mt-1 min-w-0 w-full truncate text-left text-xs text-muted-foreground"
                        title={itemsSummary || undefined}
                      >
                        {historyDetailLine}
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="px-2 py-2 text-xs text-muted-foreground">没有匹配的历史记录</div>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pb-2">
        <div className="space-y-2">
          <Label>存储数据（{activeRecord ? `${activeRecord.staffName} ${activeRecord.staffCode}` : "--"}）({items.length})</Label>
          <div className="rounded-md border border-border px-3 py-2 text-xs text-muted-foreground space-y-1">
            <div className="truncate" title={currentDataDomainWithPort}>
              主域名/端口：{currentDataDomainWithPort}
            </div>
            <div>提示：同名 key 可能存在多个来源，写入时会按来源分别写回</div>
          </div>
          {items.length > 0 ? (
            <div className="max-h-40 overflow-y-auto border border-border rounded-md">
              {items.map((item, index) => (
                <div
                  key={`${item.key}-${index}`}
                  className="p-2 border-b border-border last:border-b-0 hover:bg-muted/50"
                >
                  <div className="flex items-center gap-2">
                    <Database className="h-3 w-3 text-muted-foreground shrink-0" />
                    <span className="font-medium text-sm">{item.key}</span>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {item.source === "localStorage"
                        ? "local"
                        : item.source === "sessionStorage"
                          ? "session"
                          : "cookie"}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 truncate pl-5">
                    {item.value?.substring(0, 50)}
                    {(item.value?.length ?? 0) > 50 ? "..." : ""}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="border border-border rounded-md px-3 py-4 text-xs text-muted-foreground">
              暂无已读取的存储数据，请先点击“读取数据”
            </div>
          )}
        </div>

        {/* 固定在底部的操作区：读取 / 写入 数据 */}
        <div className="sticky bottom-0 left-0 pt-2 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80">
          <div className="flex gap-2">
            <Button
              onClick={handleReadData}
              disabled={loading || !config}
              className="flex-1"
              variant="outline"
            >
              <Download className="h-4 w-4 mr-2" />
              {loading ? "读取中..." : "读取数据"}
            </Button>
            <Button
              onClick={() => {
                void handleWriteData();
              }}
              disabled={loading || items.length === 0 || !currentTab}
              className="flex-1"
              variant="default"
            >
              <Upload className="h-4 w-4 mr-2" />
              {loading ? "写入中..." : "写入数据"}
            </Button>
          </div>
        </div>

        {historyRecords.length > 0 && (
          <div className="border border-border rounded-md">
            <div className="px-2 py-1 text-xs text-muted-foreground border-b border-border">
              历史记录（最多 100 条）
            </div>
            <div className="max-h-40 overflow-y-auto">
              {historyRecords.map((r) => {
                const active = r.id === activeHistoryId;
                const origin = normalizeReadHistoryHost(r.sourceUrl);
                const itemsSummary = formatHistoryRecordItemsSummary(r.items);
                const historyDetailLine = [
                  `${r.items?.length ?? 0} 条`,
                  origin,
                  ...(itemsSummary ? [itemsSummary] : []),
                ].join(" · ");
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => handleActivateRecord(r)}
                    className={[
                      "w-full min-w-0 text-left px-2 py-2 border-b border-border last:border-b-0 hover:bg-muted/50",
                      active ? "bg-muted" : "",
                    ].join(" ")}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-medium truncate">
                        {r.staffName}（{r.staffCode}）
                      </div>
                      <div className="text-[10px] text-muted-foreground shrink-0">
                        {new Date(r.timestamp).toLocaleString()}
                      </div>
                    </div>
                    <div
                      className="mt-1 min-w-0 w-full truncate text-left text-xs text-muted-foreground"
                      title={itemsSummary || undefined}
                    >
                      {historyDetailLine}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
