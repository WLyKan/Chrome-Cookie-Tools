import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
    <Card>
      <CardHeader>
        <CardDescription>设置需要读取的存储数据</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {configHistory.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">历史记录</p>
            <Table onRowClick={handleSelectFromHistory} data={configHistory} />
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="storageKeys">存储键名（一行一个）</Label>
          <Textarea
            id="storageKeys"
            placeholder={"REFRESH_TOKEN\ntoken\ntenantId"}
            value={storageKeysText}
            onChange={(e) => setStorageKeysText(e.target.value)}
            rows={5}
          />
          <p className="text-xs text-muted-foreground">每行输入一个键名</p>
        </div>

        <Button onClick={() => handleSaveConfig({})} disabled={loading} className="w-full">
          {loading ? "保存中..." : "保存配置"}
        </Button>
      </CardContent>
    </Card>
  );
}
