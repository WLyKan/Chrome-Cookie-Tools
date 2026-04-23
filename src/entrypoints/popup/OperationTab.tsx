import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

  const sourceBadge = (source: UnifiedStorageItem["source"]) => {
    if (source === "localStorage") {
      return (
        <span className="inline-flex shrink-0 items-center rounded-full bg-emerald-500/12 px-2 py-0.5 text-[10px] font-medium text-emerald-800 ring-1 ring-emerald-500/25 dark:text-emerald-300 dark:ring-emerald-400/30">
          local
        </span>
      );
    }
    if (source === "sessionStorage") {
      return (
        <span className="inline-flex shrink-0 items-center rounded-full bg-sky-500/12 px-2 py-0.5 text-[10px] font-medium text-sky-800 ring-1 ring-sky-500/25 dark:text-sky-300 dark:ring-sky-400/30">
          session
        </span>
      );
    }
    return (
      <span className="inline-flex shrink-0 items-center rounded-full bg-violet-500/12 px-2 py-0.5 text-[10px] font-medium text-violet-800 ring-1 ring-violet-500/25 dark:text-violet-300 dark:ring-violet-400/30">
        cookie
      </span>
    );
  };

  return (
    <Card className="flex h-full min-h-0 flex-col gap-0 overflow-y-auto overflow-x-hidden border-border/80 py-0 shadow-sm ring-1 ring-border/30">
      <CardHeader className="shrink-0 space-y-3 border-b border-border/60 px-4 pb-3 pt-4">
        <div className="space-y-1">
          <CardDescription className="text-xs leading-relaxed">
            读取并写入存储数据到当前标签页
          </CardDescription>
        </div>
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
            <div className="absolute z-20 mt-1.5 max-h-64 w-full overflow-y-auto rounded-lg border border-violet-300/40 bg-popover/95 shadow-xl shadow-violet-500/10 backdrop-blur-sm dark:border-blue-400/30">
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
      <CardContent className="flex min-h-0 flex-1 flex-col gap-0 px-0 pb-0 pt-0">
        <div className="space-y-5 px-4 py-4">
        <section className="space-y-2" aria-labelledby="storage-preview-heading">
          <Label
            id="storage-preview-heading"
            className="text-sm font-medium text-foreground"
          >
            当前数据
            <span className="ml-1.5 font-normal text-muted-foreground">
              ·{" "}
              {activeRecord
                ? `${activeRecord.staffName}（${activeRecord.staffCode}）`
                : "未关联历史身份"}
              · {items.length} 条
            </span>
          </Label>
          <div className="space-y-1.5 rounded-lg border border-border/70 bg-muted/20 px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
            <div className="truncate font-medium text-foreground/90" title={currentDataDomainWithPort}>
              主域名 / 端口：<span className="font-normal">{currentDataDomainWithPort}</span>
            </div>
            <p>同名 key 可能来自不同存储；写入时按来源分别写回当前页。</p>
          </div>
          {items.length > 0 ? (
            <div
              className="max-h-44 overflow-y-auto rounded-lg border border-border/70 bg-card/60 shadow-xs"
              role="list"
            >
              {items.map((item, index) => (
                <div
                  key={`${item.key}-${index}`}
                  role="listitem"
                  className="border-b border-border/60 p-2.5 transition-colors duration-200 last:border-b-0 motion-reduce:transition-none hover:bg-muted/40"
                >
                  <div className="flex items-center gap-2">
                    <Database className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                      {item.key}
                    </span>
                    {sourceBadge(item.source)}
                  </div>
                  <div className="mt-1.5 truncate pl-5 text-xs text-muted-foreground">
                    {item.value?.substring(0, 56)}
                    {(item.value?.length ?? 0) > 56 ? "…" : ""}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-border/80 bg-muted/10 px-3 py-6 text-center text-xs leading-relaxed text-muted-foreground">
              暂无已读取的数据。在目标业务页打开本扩展，点击「读取数据」。
            </div>
          )}
        </section>

        {historyRecords.length > 0 && (
          <section className="overflow-hidden rounded-lg border border-border/70 bg-card/40 shadow-xs" aria-label="读取历史列表">
            <div className="border-b border-border/60 bg-muted/30 px-3 py-2">
              <p className="text-xs font-medium text-foreground">读取历史</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">最多保留 100 条，点击一行可写入当前页</p>
            </div>
            <div className="max-h-44 overflow-y-auto">
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
                      "w-full min-w-0 cursor-pointer border-b border-border/50 px-3 py-2.5 text-left transition-colors duration-200 last:border-b-0 motion-reduce:transition-none",
                      "hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                      active ? "bg-muted/70 ring-1 ring-inset ring-border/50" : "",
                    ].join(" ")}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="truncate text-sm font-medium text-foreground">
                        {r.staffName}（{r.staffCode}）
                      </div>
                      <div className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
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
          </section>
        )}
        </div>

        <div className="sticky bottom-0 z-20 shrink-0 border-t border-border/70 bg-background/95 px-4 py-3 shadow-[0_-8px_24px_-10px_rgba(0,0,0,0.1)] backdrop-blur-sm supports-backdrop-filter:bg-background/85 dark:shadow-[0_-8px_24px_-10px_rgba(0,0,0,0.35)]">
          <div className="flex gap-2">
            <Button
              type="button"
              onClick={handleReadData}
              disabled={loading || !config}
              className="flex-1 cursor-pointer gap-2 shadow-xs transition-colors duration-200 motion-reduce:transition-none"
              variant="outline"
            >
              <Download className="size-4 shrink-0" aria-hidden />
              {loading ? "读取中…" : "读取数据"}
            </Button>
            <Button
              type="button"
              onClick={() => {
                void handleWriteData();
              }}
              disabled={loading || items.length === 0 || !currentTab}
              className="flex-1 cursor-pointer gap-2 shadow-sm transition-colors duration-200 motion-reduce:transition-none"
              variant="default"
            >
              <Upload className="size-4 shrink-0" aria-hidden />
              {loading ? "写入中…" : "写入数据"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
