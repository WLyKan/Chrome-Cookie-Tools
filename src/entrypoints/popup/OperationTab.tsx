import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { CookieConfig, CookieData } from "@/types";
import { MessageType } from "@/types";
import { Download, Upload, Cookie } from "lucide-react";

export function OperationTab() {
  const [config, setConfig] = useState<CookieConfig | null>(null);
  const [targetUrl, setTargetUrl] = useState("");
  const [cookies, setCookies] = useState<CookieData[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);

  useEffect(() => {
    loadConfig();
  }, []);

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

  const handleReadCookies = async () => {
    if (!config) {
      setMessage({ type: "error", text: "请先在配置页设置源网站和Cookie名称" });
      return;
    }

    setLoading(true);
    setMessage(null);
    setCookies([]);

    try {
      const response = await browser.runtime.sendMessage({
        type: MessageType.READ_COOKIES,
        payload: {
          sourceUrl: config.sourceUrl,
          cookieNames: config.cookieNames,
        },
      });

      if (response.success && response.data) {
        setCookies(response.data);
        if (response.data.length === 0) {
          setMessage({ type: "info", text: "未找到任何Cookie" });
        } else {
          setMessage({ type: "success", text: `成功读取 ${response.data.length} 个Cookie` });
        }
      } else {
        setMessage({ type: "error", text: response.error || "读取Cookie失败" });
      }
    } catch (error) {
      setMessage({ type: "error", text: "读取Cookie时出错" });
      console.error("Error reading cookies:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleWriteCookies = async () => {
    if (cookies.length === 0) {
      setMessage({ type: "error", text: "没有可写入的Cookie，请先读取" });
      return;
    }

    if (!targetUrl.trim()) {
      setMessage({ type: "error", text: "请输入目标网站URL" });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const response = await browser.runtime.sendMessage({
        type: MessageType.WRITE_COOKIES,
        payload: {
          targetUrl: targetUrl.trim(),
          cookies,
        },
      });

      if (response.success) {
        setMessage({ type: "success", text: `成功写入 ${response.data} 个Cookie` });
      } else {
        setMessage({ type: "error", text: response.error || "写入Cookie失败" });
      }
    } catch (error) {
      setMessage({ type: "error", text: "写入Cookie时出错" });
      console.error("Error writing cookies:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>操作</CardTitle>
        <CardDescription>读取和写入Cookie</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 当前配置摘要 */}
        {config && (
          <div className="bg-gray-50 p-3 rounded-md space-y-1 text-sm">
            <div className="flex items-start">
              <span className="font-medium text-gray-700 min-w-20">源网站:</span>
              <span className="text-gray-600 break-all">{config.sourceUrl}</span>
            </div>
            <div className="flex items-start">
              <span className="font-medium text-gray-700 min-w-20">Cookie:</span>
              <span className="text-gray-600">{config.cookieNames.join(", ")}</span>
            </div>
          </div>
        )}

        {/* 读取Cookie */}
        <div className="space-y-2">
          <Button onClick={handleReadCookies} disabled={loading || !config} className="w-full">
            <Download className="h-4 w-4 mr-2" />
            {loading ? "读取中..." : "读取Cookie"}
          </Button>
        </div>

        {/* Cookie数据预览 */}
        {cookies.length > 0 && (
          <div className="space-y-2">
            <Label>Cookie数据 ({cookies.length})</Label>
            <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-md">
              {cookies.map((cookie, index) => (
                <div
                  key={index}
                  className="p-2 border-b border-gray-100 last:border-b-0 hover:bg-gray-50"
                >
                  <div className="flex items-center gap-2">
                    <Cookie className="h-3 w-3 text-gray-400" />
                    <span className="font-medium text-sm">{cookie.name}</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1 truncate pl-5">
                    {cookie.value.substring(0, 50)}
                    {cookie.value.length > 50 ? "..." : ""}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 目标URL */}
        <div className="space-y-2">
          <Label htmlFor="targetUrl">目标网站URL</Label>
          <Input
            id="targetUrl"
            type="url"
            placeholder="https://target.com"
            value={targetUrl}
            onChange={(e) => setTargetUrl(e.target.value)}
          />
        </div>

        {/* 写入Cookie */}
        <div className="space-y-2">
          <Button
            onClick={handleWriteCookies}
            disabled={loading || cookies.length === 0}
            className="w-full"
            variant="default"
          >
            <Upload className="h-4 w-4 mr-2" />
            {loading ? "写入中..." : "写入Cookie"}
          </Button>
        </div>

        {/* 消息提示 */}
        {message && (
          <div
            className={`p-3 rounded text-sm ${
              message.type === "success"
                ? "bg-green-50 text-green-800 border border-green-200"
                : message.type === "error"
                ? "bg-red-50 text-red-800 border border-red-200"
                : "bg-blue-50 text-blue-800 border border-blue-200"
            }`}
          >
            {message.text}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
