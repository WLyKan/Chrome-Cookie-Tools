import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { CookieConfig } from "@/types";
import { MessageType } from "@/types";
import { X, Plus } from "lucide-react";

interface ConfigTabProps {
  onConfigSaved?: () => void;
}

export function ConfigTab({ onConfigSaved }: ConfigTabProps) {
  const [sourceUrl, setSourceUrl] = useState("");
  const [cookieNames, setCookieNames] = useState<string[]>([""]);
  const [urlHistory, setUrlHistory] = useState<string[]>([]);
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
        setCookieNames(config.cookieNames.length > 0 ? config.cookieNames : [""]);
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

      // 过滤空的Cookie名称
      const validCookieNames = cookieNames.filter((name) => name.trim() !== "");
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

  const handleAddCookieName = () => {
    setCookieNames([...cookieNames, ""]);
  };

  const handleRemoveCookieName = (index: number) => {
    if (cookieNames.length > 1) {
      setCookieNames(cookieNames.filter((_, i) => i !== index));
    }
  };

  const handleCookieNameChange = (index: number, value: string) => {
    const newNames = [...cookieNames];
    newNames[index] = value;
    setCookieNames(newNames);
  };

  const handleSelectFromHistory = (url: string) => {
    setSourceUrl(url);
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
              <p className="text-xs text-gray-500 mb-1">历史记录:</p>
              <div className="flex flex-wrap gap-1">
                {urlHistory.map((url, index) => (
                  <button
                    key={index}
                    onClick={() => handleSelectFromHistory(url)}
                    className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-gray-700 transition-colors"
                  >
                    {new URL(url).hostname}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Cookie名称列表 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Cookie名称</Label>
            <Button type="button" size="sm" variant="outline" onClick={handleAddCookieName}>
              <Plus className="h-4 w-4 mr-1" />
              添加
            </Button>
          </div>

          <div className="space-y-2">
            {cookieNames.map((name, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  placeholder="Cookie名称"
                  value={name}
                  onChange={(e) => handleCookieNameChange(index, e.target.value)}
                />
                {cookieNames.length > 1 && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => handleRemoveCookieName(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 消息提示 */}
        {message && (
          <div
            className={`p-3 rounded text-sm ${
              message.type === "success"
                ? "bg-green-50 text-green-800 border border-green-200"
                : "bg-red-50 text-red-800 border border-red-200"
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
