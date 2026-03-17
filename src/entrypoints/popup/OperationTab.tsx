import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { StorageConfig, UnifiedStorageItem } from "@/types";
import { MessageType } from "@/types";
import { Download, Upload, Database } from "lucide-react";
import { toast } from "sonner";

export function OperationTab() {
  const [config, setConfig] = useState<StorageConfig | null>(null);
  const [currentTab, setCurrentTab] = useState<{ url: string; title: string } | null>(null);
  const [items, setItems] = useState<UnifiedStorageItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadConfig();
    getCurrentTab();
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
        toast.info(`已加载上次保存的 ${stored.items.length} 条数据`);
      } else {
        setItems([]);
      }
    } catch (error) {
      console.error("Failed to load saved data:", error);
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
        {config && (
          <div className="bg-muted/50 dark:bg-muted/20 p-3 rounded-md space-y-1 text-sm">
            <div className="flex items-start">
              <span className="font-medium w-[90px] pr-1 shrink-0">当前网址:</span>
              <span className="text-muted-foreground break-all">{currentTab?.url || "--"}</span>
            </div>
            <div className="flex items-start">
              <span className="font-medium w-[90px] pr-1 shrink-0">存储键:</span>
              <span className="text-muted-foreground whitespace-pre-wrap">
                {Array.isArray(config.storageKeys) ? config.storageKeys.join("\n") : config.storageKeys || "--"}
              </span>
            </div>
          </div>
        )}

        {items.length > 0 && (
          <div className="space-y-2">
            <Label>存储数据 ({items.length})</Label>
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
          </div>
        )}

        {/* 固定在底部的操作区：读取 / 写入 数据 */}
        <div className="sticky bottom-0 left-0 pt-2 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
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
      </CardContent>
    </Card>
  );
}
