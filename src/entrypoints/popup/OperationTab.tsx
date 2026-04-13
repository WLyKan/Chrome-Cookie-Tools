import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/toast";
import type { ReadHistoryRecord, StorageConfig, StoredUnifiedInfo, UnifiedStorageItem } from "@/types";
import { MessageType } from "@/types";
import { normalizeReadHistoryOrigin } from "@/utils/readHistory";
import { Download, Upload, Database } from "lucide-react";

/** 历史行内展示：各存储项 key=value，分号连接 */
function formatHistoryRecordItemsSummary(items: UnifiedStorageItem[] | undefined): string {
  if (!items?.length) return "";
  return items.map((it) => `${it.key}=${it.value}`).join("; ");
}

export function OperationTab() {
  const [config, setConfig] = useState<StorageConfig | null>(null);
  const [currentTab, setCurrentTab] = useState<{ url: string; title: string } | null>(null);
  const [items, setItems] = useState<UnifiedStorageItem[]>([]);
  const [historyRecords, setHistoryRecords] = useState<ReadHistoryRecord[]>([]);
  const [activeHistoryId, setActiveHistoryId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const activeRecord = historyRecords.find((r) => r.id === activeHistoryId);
  const storageKeys = Array.isArray(config?.storageKeys) ? config.storageKeys : [];
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
      toast.info(`已激活：${record.staffName}（${record.staffCode}）`);
    } catch (error) {
      console.error("Failed to persist lastReadUnified:", error);
      toast.error("已切换数据，但未写入本地缓存");
    }
  };

  const handleWriteData = async () => {
    if (items.length === 0) {
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
        items,
      });
      const response = await browser.runtime.sendMessage({
        type: MessageType.WRITE_STORAGE,
        payload: {
          targetUrl: currentTab.url,
          items,
        },
      });

      console.log("[StorageDevTools][popup] handleWriteData: response", response);

      if (response.success) {
        const { okCount = 0, failCount = 0 } = response.data ?? {};
        if (failCount > 0) {
          toast.info(`成功写入 ${okCount} 条，${failCount} 条失败`);
        } else {
          toast.success(`成功写入 ${okCount} 条数据`);
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
        <CardTitle>操作</CardTitle>
        <CardDescription>读取并写入存储数据到当前标签页</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pb-2">
        <div className="space-y-2">
          <Label>存储数据（{activeRecord ? `${activeRecord.staffName} ${activeRecord.staffCode}` : "--"}）({items.length})</Label>
          <div className="rounded-md border border-border px-3 py-2 text-xs text-muted-foreground space-y-1">
            <div className="truncate" title={currentDataDomainWithPort}>
              主域名/端口：{currentDataDomainWithPort}
            </div>
            <div className="break-all">
              存储键：{storageKeys.length > 0 ? storageKeys.join(", ") : "--"}
            </div>
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
              onClick={handleWriteData}
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
              历史记录（最多 20 条）
            </div>
            <div className="max-h-40 overflow-y-auto">
              {historyRecords.map((r) => {
                const active = r.id === activeHistoryId;
                const origin = normalizeReadHistoryOrigin(r.sourceUrl);
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
