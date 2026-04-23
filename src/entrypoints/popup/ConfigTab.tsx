import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "@/components/ui/toast";
import type { StorageConfig, StorageType } from "@/types";
import { DEFAULT_TYPE, MessageType } from "@/types";
import Table, { TableItem } from "@/components/Table";

interface ConfigTabProps {
  onConfigSaved?: () => void;
}

export function ConfigTab({ onConfigSaved }: ConfigTabProps) {
  const [storageKeysText, setStorageKeysText] = useState("");
  const [configHistory, setConfigHistory] = useState<TableItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadConfig();
    loadConfigHistory();
  }, []);

  const loadConfig = async () => {
    try {
      const response = await browser.runtime.sendMessage({
        type: MessageType.GET_CONFIG,
      });

      if (response.success && response.data) {
        const config: StorageConfig = response.data;
        const keys = (config as StorageConfig & { cookieNames?: string[] }).storageKeys ?? (config as StorageConfig & { cookieNames?: string[] }).cookieNames ?? [];
        setStorageKeysText(keys.join("\n"));
      }
    } catch (error) {
      console.error("Failed to load config:", error);
    }
  };

  const loadConfigHistory = async () => {
    try {
      const result = await browser.storage.local.get("configHistory");
      setConfigHistory(result.configHistory || []);
    } catch (error) {
      console.error("Failed to load config history:", error);
    }
  };

  const handleSaveConfig = async (params?: { type?: StorageType; keys?: string }) => {
    setLoading(true);
    const targetType = params?.type ?? DEFAULT_TYPE;
    const keysText = params?.keys ?? storageKeysText;

    try {
      const validStorageKeys = keysText
        .split(/\n|,|;|\s+/)
        .map((name) => name.trim())
        .filter((name) => name !== "");

      if (validStorageKeys.length === 0) {
        toast.error("请至少添加一个存储键名");
        setLoading(false);
        return;
      }

      const config: StorageConfig = {
        storageKeys: validStorageKeys,
        storageType: targetType,
        updatedAt: Date.now(),
      };

      const response = await browser.runtime.sendMessage({
        type: MessageType.SAVE_CONFIG,
        payload: config,
      });

      if (response.success) {
        toast.success("配置保存成功");
        await loadConfigHistory();
        onConfigSaved?.();
      } else {
        toast.error(response.error || "保存失败");
      }
    } catch (error) {
      toast.error("保存配置时出错");
      console.error("Error saving config:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectFromHistory = (item: TableItem) => {
    const keys = item.content || "";
    const formattedKeys = keys.split(",").join("\n");
    setStorageKeysText(formattedKeys);
    handleSaveConfig({ type: (item.type || DEFAULT_TYPE) as StorageType, keys: formattedKeys });
  };

  return (
    <Card className="flex h-full min-h-0 flex-col gap-0 overflow-hidden border-border/80 py-0 shadow-sm ring-1 ring-border/30">
      <CardHeader className="shrink-0 space-y-1 border-b border-border/60 px-4 pb-4 pt-4">
        <CardDescription className="text-xs leading-relaxed">
          设置要读取的键名；保存后在「操作」页对当前标签页生效
        </CardDescription>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col gap-0 px-0 pb-0 pt-0">
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overflow-x-hidden px-4 py-5">
          {configHistory.length > 0 && (
            <div className="space-y-2 rounded-lg border border-border/60 bg-muted/25 p-3">
              <p className="text-xs font-medium text-foreground/90">最近使用的键名</p>
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                点击表格一行可快速填入并保存
              </p>
              <Table onRowClick={handleSelectFromHistory} data={configHistory} />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="storageKeys" className="text-sm font-medium text-foreground">
              存储键名（一行一个）
            </Label>
            <Textarea
              id="storageKeys"
              placeholder={"REFRESH_TOKEN\ntoken\ntenantId"}
              value={storageKeysText}
              onChange={(e) => setStorageKeysText(e.target.value)}
              rows={5}
              className="min-h-30 resize-y text-sm motion-reduce:transition-none"
            />
            <p className="text-xs leading-relaxed text-muted-foreground">
              支持 Cookie 名与 localStorage 键名；与目标页同源时才会读取到值
            </p>
          </div>
        </div>

        <div className="sticky bottom-0 z-20 shrink-0 border-t border-border/70 bg-background/95 px-4 py-3 shadow-[0_-8px_24px_-10px_rgba(0,0,0,0.1)] backdrop-blur-sm supports-backdrop-filter:bg-background/85 dark:shadow-[0_-8px_24px_-10px_rgba(0,0,0,0.35)]">
          <Button
            type="button"
            onClick={() => handleSaveConfig({})}
            disabled={loading}
            className="w-full cursor-pointer shadow-sm transition-colors duration-200 motion-reduce:transition-none"
          >
            {loading ? "保存中…" : "保存配置"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
