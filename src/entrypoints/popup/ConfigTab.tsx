import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { CookieConfig, HistoryItem } from "@/types";
import { MessageType } from "@/types";

interface ConfigTabProps {
  onConfigSaved?: () => void;
}

export function ConfigTab({ onConfigSaved }: ConfigTabProps) {
  const [sourceUrl, setSourceUrl] = useState("");
  const [cookieNamesText, setCookieNamesText] = useState("");
  const [urlHistory, setUrlHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // 加载配置
  useEffect(() => {
    loadConfig();
    loadUrlHistory();
  }, []);

  const loadConfig = async () => {
    try {
      const response = await browser.runtime.sendMessage({
        type: MessageType.GET_CONFIG,
      });

      if (response.success && response.data) {
        const config: CookieConfig = response.data;
        setSourceUrl(config.sourceUrl);
        setCookieNamesText(config.cookieNames.join("\n"));
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

  const handleSaveConfig = async () => {
    setLoading(true);
    setMessage(null);

    try {
      // 验证输入
      if (!sourceUrl.trim()) {
        setMessage({ type: "error", text: "请输入源网站URL" });
        return;
      }

      // 解析Cookie名称（一行一个）
      const validCookieNames = cookieNamesText
        .split(/\n|,|;|\s+/)
        .map((name) => name.trim())
        .filter((name) => name !== "");

      if (validCookieNames.length === 0) {
        setMessage({ type: "error", text: "请至少添加一个Cookie名称" });
        return;
      }

      const config: CookieConfig = {
        sourceUrl: sourceUrl.trim(),
        cookieNames: validCookieNames,
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
    setCookieNamesText(item.cookieNames.join("\n"));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>配置</CardTitle>
        <CardDescription>设置源网站和需要读取的Cookie</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
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
                    title={`url: ${item.url}\n Cookies: ${item.cookieNames?.join(', ')}`}
                  >
                    {new URL(item.url).hostname}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Cookie名称 */}
        <div className="space-y-2">
          <Label htmlFor="cookieNames">Cookie名称（一行一个）</Label>
          <Textarea
            id="cookieNames"
            placeholder="refreshToken\ntoken\ntenantId"
            value={cookieNamesText}
            onChange={(e) => setCookieNamesText(e.target.value)}
            rows={5}
          />
          <p className="text-xs text-muted-foreground">
            每行输入一个Cookie名称
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
        <Button onClick={handleSaveConfig} disabled={loading} className="w-full">
          {loading ? "保存中..." : "保存配置"}
        </Button>
      </CardContent>
    </Card>
  );
}
