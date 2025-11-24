import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { StorageConfig, HistoryItem } from "@/types";
import { MessageType } from "@/types";

interface ConfigTabProps {
  onConfigSaved?: () => void;
}

export function ConfigTab({ onConfigSaved }: ConfigTabProps) {
  const [sourceUrl, setSourceUrl] = useState("");
  const [storageKeysText, setStorageKeysText] = useState("");
  const [storageType, setStorageType] = useState<'localStorage' | 'cookie'>('localStorage');
  const [urlHistory, setUrlHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Load configuration
  useEffect(() => {
    setMessage(null);
    loadConfig();
    loadUrlHistory();
  }, []);

  const loadConfig = async () => {
    try {
      const response = await browser.runtime.sendMessage({
        type: MessageType.GET_CONFIG,
      });

      if (response.success && response.data) {
        const config: StorageConfig = response.data;
        setSourceUrl(config.sourceUrl);
        // Backward compatibility: support both storageKeys and cookieNames
        const keys = (config as any).storageKeys || (config as any).cookieNames || [];
        setStorageKeysText(keys.join("\n"));
        setStorageType(config.storageType || 'localStorage');
      }
    } catch (error) {
      console.error("Failed to load config:", error);
    }
  };

  const loadUrlHistory = async () => {
    try {
      const result = await browser.storage.sync.get("urlHistory");
      setUrlHistory(result.urlHistory || []);
    } catch (error) {
      console.error("Failed to load URL history:", error);
    }
  };

  const handleSaveConfig = async (params?: { storageType?: "localStorage" | "cookie"; url?: string }) => {
    setLoading(true);
    setMessage(null);

    const targetUrl = params?.url?.trim() ?? sourceUrl.trim();
    const targetType = params?.storageType ?? storageType;

    try {
      // 验证输入
      if (!targetUrl) {
        setMessage({ type: "error", text: "请输入源网站URL" });
        return;
      }

      // Parse storage keys (one per line)
      const validStorageKeys = storageKeysText
        .split(/\n|,|;|\s+/)
        .map((name) => name.trim())
        .filter((name) => name !== "");

      if (validStorageKeys.length === 0) {
        setMessage({ type: "error", text: "请至少添加一个存储键名" });
        return;
      }

      const config: StorageConfig = {
        sourceUrl: targetUrl,
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
        await loadUrlHistory();
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

  const handleSelectFromHistory = (item: HistoryItem) => {
    setSourceUrl(item.url);
    // Backward compatibility: support both storageKeys and cookieNames
    const keys = (item as any).storageKeys || (item as any).cookieNames || [];
    setStorageKeysText(keys.join("\n"));
    handleSaveConfig({ url: item.url });
  };

  const handleStorageTypeChange = (checked: boolean) => {
    setStorageType(checked ? 'cookie' : 'localStorage');
    handleSaveConfig({ storageType: checked ? 'cookie' : 'localStorage' });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>配置</CardTitle>
        <CardDescription>设置源网站和需要读取的存储数据</CardDescription>
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

        {/* 源网站URL */}
        <div className="space-y-2">
          <Label htmlFor="sourceUrl">源网站URL</Label>
          <Input
            id="sourceUrl"
            type="url"
            placeholder="https://example.com"
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
          />

          {/* 历史记录 */}
          {urlHistory.length > 0 && (
            <div className="mt-2">
              <p className="text-xs text-muted-foreground mb-1">历史记录:</p>
              <div className="flex flex-wrap gap-1">
                {urlHistory.map((item, index) => (
                  <button
                    key={index}
                    onClick={() => handleSelectFromHistory(item)}
                    className="text-xs px-2 py-1 bg-muted hover:bg-accent rounded text-foreground transition-colors"
                    title={`url: ${item.url}\n存储键: ${((item as any).storageKeys || (item as any).cookieNames || []).join(', ')}`}
                  >
                    {new URL(item.url).hostname}
                  </button>
                ))}
              </div>
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
