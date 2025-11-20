import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { CookieConfig, CookieData } from "@/types";
import { MessageType } from "@/types";
import { Download, Upload, Cookie } from "lucide-react";

export function OperationTab() {
  const [config, setConfig] = useState<CookieConfig | null>(null);
  const [currentTab, setCurrentTab] = useState<{ url: string; title: string } | null>(null);
  const [cookies, setCookies] = useState<CookieData[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);

  useEffect(() => {
    loadConfig();
    getCurrentTab();
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

  const handleReadCookies = async () => {
    if (!config) {
      setMessage({ type: "error", text: "请先设置源网站和需要获取的Cookie名称" });
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

    if (!currentTab || !currentTab.url) {
      setMessage({ type: "error", text: "无法获取当前标签页信息" });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const response = await browser.runtime.sendMessage({
        type: MessageType.WRITE_COOKIES,
        payload: {
          targetUrl: currentTab.url,
          cookies,
        },
      });

      if (response.success) {
        setMessage({ type: "success", text: `成功写入 ${response.data} 个Cookie到当前标签页` });
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
            <div className="max-h-40 overflow-y-auto border border-border rounded-md">
              {cookies.map((cookie, index) => (
                <div
                  key={index}
                  className="p-2 border-b border-border last:border-b-0 hover:bg-muted/50"
                >
                  <div className="flex items-center gap-2">
                    <Cookie className="h-3 w-3 text-muted-foreground" />
                    <span className="font-medium text-sm">{cookie.name}</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 truncate pl-5">
                    {cookie.value.substring(0, 50)}
                    {cookie.value.length > 50 ? "..." : ""}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 写入Cookie */}
        <div className="space-y-2">
          <Button
            onClick={handleWriteCookies}
            disabled={loading || cookies.length === 0 || !currentTab}
            className="w-full"
            variant="default"
          >
            <Upload className="h-4 w-4 mr-2" />
            {loading ? "写入中..." : "写入Cookie到当前标签页"}
          </Button>
        </div>

        {/* 消息提示 */}
        {message && (
          <div
            className={`p-3 rounded text-sm ${
              message.type === "success"
                ? "bg-green-50 text-green-800 border border-green-200 dark:bg-green-950 dark:text-green-200 dark:border-green-800"
                : message.type === "error"
                ? "bg-red-50 text-red-800 border border-red-200 dark:bg-red-950 dark:text-red-200 dark:border-red-800"
                : "bg-blue-50 text-blue-800 border border-blue-200 dark:bg-blue-950 dark:text-blue-200 dark:border-blue-800"
            }`}
          >
            {message.text}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
