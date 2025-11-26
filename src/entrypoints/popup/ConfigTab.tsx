import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { StorageConfig, StorageType } from "@/types";
import { DEFAULT_TYPE, MessageType } from "@/types";
import Table, { TableItem } from "@/components/Table"

interface ConfigTabProps {
  onConfigSaved?: () => void;
}

export function ConfigTab({ onConfigSaved }: ConfigTabProps) {
  const [source, setSource] = useState("");
  const [storageKeysText, setStorageKeysText] = useState("");
  const [storageType, setStorageType] = useState<'localStorage' | 'cookie'>('localStorage');
  const [configHistory, setConfigHistory] = useState<TableItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Load configuration
  useEffect(() => {
    setMessage(null);
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
        setSource(config.storageType || DEFAULT_TYPE);
        // Backward compatibility: support both storageKeys and cookieNames
        const keys = (config as any).storageKeys || (config as any).cookieNames || [];
        setStorageKeysText(keys.join("\n"));
        setStorageType(config.storageType || 'localStorage');
      }
    } catch (error) {
      console.error("Failed to load config:", error);
    }
  };

  const loadConfigHistory = async () => {
    try {
      const result = await browser.storage.sync.get("configHistory");
      setConfigHistory(result.configHistory || []);
    } catch (error) {
      console.error("Failed to load config history:", error);
    }
  };

  const handleSaveConfig = async (params?: { type?: StorageType; keys?: string }) => {
    setLoading(true);
    setMessage(null);
    const targetType = params?.type ?? DEFAULT_TYPE;
    const keysText = params?.keys ?? storageKeysText;

    try {
      // Parse storage keys (one per line)
      const validStorageKeys = keysText
        .split(/\n|,|;|\s+/)
        .map((name) => name.trim())
        .filter((name) => name !== "");

      if (validStorageKeys.length === 0) {
        setMessage({ type: "error", text: "请至少添加一个存储键名" });
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
        setMessage({ type: "success", text: "配置保存成功！" });
        await loadConfigHistory();
        onConfigSaved?.();
      } else {
        setMessage({ type: "error", text: response.error || "保存失败" });
      }
    } catch (error) {
      setMessage({ type: "error", text: "保存配置时出错" });
      console.error("Error saving config:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectFromHistory = (item: TableItem) => {
    setSource(item.type || DEFAULT_TYPE);
    // Backward compatibility: support both storageKeys and cookieNames
    const keys = item.content || '';
    const formattedKeys = keys.split(`,`).join(`\n`);
    setStorageKeysText(formattedKeys);
    // Pass the formatted keys directly to handleSaveConfig to avoid async state update issues
    handleSaveConfig({ type: item.type || DEFAULT_TYPE, keys: formattedKeys });
  };

  const handleStorageTypeChange = (checked: boolean) => {
    setStorageType(checked ? 'cookie' : 'localStorage');
    handleSaveConfig({ type: checked ? 'cookie' : 'localStorage' });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>配置</CardTitle>
        <CardDescription>设置需要读取的存储数据</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 存储类型切换 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="storage-type">存储类型</Label>
            <div className="flex items-center gap-2">
              <span className={`text-sm ${storageType === 'localStorage' ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
                LocalStorage
              </span>
              <Switch
                id="storage-type"
                disabled
                checked={storageType === 'cookie'}
                onCheckedChange={handleStorageTypeChange}
              />
              <span className={`text-sm ${storageType === 'cookie' ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
                Cookie
              </span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            {storageType === 'localStorage' ? '当前读取 localStorage 数据' : '当前读取 Cookie 数据'}
          </p>
        </div>

        <div className="space-y-2">
          {/* 历史记录 */}
          {configHistory.length > 0 && (
            <div className="mt-2">
              <p className="text-xs text-muted-foreground mb-1">历史记录:</p>
              <Table onRowClick={handleSelectFromHistory} data={configHistory} />
            </div>
          )}
        </div>

        {/* 存储键名 */}
        <div className="space-y-2">
          <Label htmlFor="storageKeys">
            {storageType === 'localStorage' ? 'LocalStorage 键名（一行一个）' : 'Cookie 名称（一行一个）'}
          </Label>
          <Textarea
            id="storageKeys"
            placeholder="REFRESH_TOKEN\ntoken\ntenantId"
            value={storageKeysText}
            onChange={(e) => setStorageKeysText(e.target.value)}
            rows={5}
          />
          <p className="text-xs text-muted-foreground">
            {storageType === 'localStorage' ? '每行输入一个 LocalStorage 键名' : '每行输入一个 Cookie 名称'}
          </p>
        </div>

        {/* 消息提示 */}
        {message && (
          <div
            className={`p-3 rounded text-sm ${
              message.type === "success"
                ? "bg-green-50 text-green-800 border border-green-200 dark:bg-green-950 dark:text-green-200 dark:border-green-800"
                : "bg-red-50 text-red-800 border border-red-200 dark:bg-red-950 dark:text-red-200 dark:border-red-800"
            }`}
          >
            {message.text}
          </div>
        )}

        {/* 保存按钮 */}
        <Button onClick={() => handleSaveConfig({})} disabled={loading} className="w-full">
          {loading ? "保存中..." : "保存配置"}
        </Button>
      </CardContent>
    </Card>
  );
}
