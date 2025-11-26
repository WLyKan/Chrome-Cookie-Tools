import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { StorageConfig, CookieData, LocalStorageData } from "@/types";
import { MessageType } from "@/types";
import { Download, Upload, Cookie, Database } from "lucide-react";

export function OperationTab() {
  const [config, setConfig] = useState<StorageConfig | null>(null);
  const [currentTab, setCurrentTab] = useState<{ url: string; title: string } | null>(null);
  const [cookies, setCookies] = useState<CookieData[]>([]);
  const [localStorageData, setLocalStorageData] = useState<LocalStorageData[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);

  useEffect(() => {
    loadConfig();
    getCurrentTab();
  }, []);

  // Load saved data when config changes
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
      const storageType = config.storageType || 'localStorage';

      if (storageType === 'cookie') {
        // Only load cookie data
        const result = await browser.storage.local.get('lastReadCookies');

        if (result.lastReadCookies && result.lastReadCookies.cookies) {
          setCookies(result.lastReadCookies.cookies);
          setLocalStorageData([]); // Clear localStorage data

          if (result.lastReadCookies.cookies.length > 0) {
            setMessage({
              type: "info",
              text: `已加载上次保存的 ${result.lastReadCookies.cookies.length} 个 Cookie`
            });
          }
        } else {
          setCookies([]);
        }
      } else {
        // Only load localStorage data
        const result = await browser.storage.local.get('lastReadLocalStorage');

        if (result.lastReadLocalStorage && result.lastReadLocalStorage.data) {
          setLocalStorageData(result.lastReadLocalStorage.data);
          setCookies([]); // Clear cookie data

          if (result.lastReadLocalStorage.data.length > 0) {
            setMessage({
              type: "info",
              text: `已加载上次保存的 ${result.lastReadLocalStorage.data.length} 个 LocalStorage 数据`
            });
          }
        } else {
          setLocalStorageData([]);
        }
      }
    } catch (error) {
      console.error("Failed to load saved data:", error);
    }
  };

  const handleReadData = async () => {
    if (!config) {
      setMessage({ type: "error", text: "请先设置源网站和需要获取的存储键名" });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const storageType = config.storageType || 'localStorage';
      // Backward compatibility: support both storageKeys and cookieNames
      const keys = config.storageKeys || (config as any).cookieNames || [];

      if (storageType === 'localStorage') {
        // Read LocalStorage
        const response = await browser.runtime.sendMessage({
          type: MessageType.READ_LOCALSTORAGE,
          payload: {
            source: config.storageType,
            keys: keys,
          },
        });

        if (response.success && response.data) {
          setLocalStorageData(response.data);
          if (response.data.length === 0) {
            setMessage({ type: "info", text: "未找到任何 LocalStorage 数据" });
          } else {
            setMessage({ type: "success", text: `成功读取 ${response.data.length} 个 LocalStorage 数据` });
          }
        } else {
          setMessage({ type: "error", text: response.error || "读取 LocalStorage 失败" });
        }
      } else {
        // Read Cookie
        const response = await browser.runtime.sendMessage({
          type: MessageType.READ_COOKIES,
          payload: {
            source: config.storageType,
            cookieNames: keys,
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
      }
    } catch (error) {
      setMessage({ type: "error", text: "读取数据时出错" });
      console.error("Error reading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleWriteData = async () => {
    const storageType = config?.storageType || 'localStorage';
    const hasData = storageType === 'localStorage' ? localStorageData.length > 0 : cookies.length > 0;

    if (!hasData) {
      setMessage({ type: "error", text: "没有可写入的数据，请先读取" });
      return;
    }

    if (!currentTab || !currentTab.url) {
      setMessage({ type: "error", text: "无法获取当前标签页信息" });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      if (storageType === 'localStorage') {
        // 写入 LocalStorage
        const response = await browser.runtime.sendMessage({
          type: MessageType.WRITE_LOCALSTORAGE,
          payload: {
            targetUrl: currentTab.url,
            data: localStorageData,
          },
        });

        if (response.success) {
          setMessage({ type: "success", text: `成功写入 ${response.data} 个 LocalStorage 数据到当前标签页` });
        } else {
          setMessage({ type: "error", text: response.error || "写入 LocalStorage 失败" });
        }
      } else {
        // 写入 Cookie
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
      }
    } catch (error) {
      setMessage({ type: "error", text: "写入数据时出错" });
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
        <CardDescription>
          {config?.storageType === 'cookie' ? '读取和写入 Cookie' : '读取和写入 LocalStorage'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 当前配置摘要 */}
        {config && (
          <div className="bg-gray-50 p-3 rounded-md space-y-1 text-sm">
            <div className="flex items-start">
              <span className="font-medium text-gray-700 w-[90px] pr-1 shrink-0">当前网址:</span>
              <span className="text-gray-600 break-all">{currentTab?.url || '--'}</span>
            </div>
            <div className="flex items-start">
              <span className="font-medium text-gray-700 w-[90px] pr-1">
                {config.storageType === 'cookie' ? 'Cookie:' : 'LocalStorage:'}
              </span>
              <span className="text-gray-600 whitespace-pre-wrap">
                {Array.isArray(config.storageKeys) ? config.storageKeys.join('\n') : config.storageKeys || '--'}
              </span>
            </div>
            <div className="flex items-start">
              <span className="font-medium text-gray-700 w-[90px] pr-1">存储类型:</span>
              <span className="text-gray-600">
                {config.storageType === 'cookie' ? 'Cookie' : 'LocalStorage'}
              </span>
            </div>
          </div>
        )}

        {/* 读取数据 */}
        <div className="space-y-2">
          <Button onClick={handleReadData} disabled={loading || !config} className="w-full">
            <Download className="h-4 w-4 mr-2" />
            {loading ? "读取中..." : config?.storageType === 'cookie' ? "读取 Cookie" : "读取 LocalStorage"}
          </Button>
        </div>

        {/* 数据预览 */}
        {(cookies.length > 0 || localStorageData.length > 0) && (
          <div className="space-y-2">
            <Label>
              {config?.storageType === 'cookie'
                ? `Cookie数据 (${cookies.length})`
                : `LocalStorage 数据 (${localStorageData.length})`}
            </Label>
            <div className="max-h-40 overflow-y-auto border border-border rounded-md">
              {config?.storageType === 'cookie' ? (
                cookies.map((cookie, index) => (
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
                ))
              ) : (
                localStorageData.map((item, index) => (
                  <div
                    key={index}
                    className="p-2 border-b border-border last:border-b-0 hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-2">
                      <Database className="h-3 w-3 text-muted-foreground" />
                      <span className="font-medium text-sm">{item.key}</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 truncate pl-5">
                      {item.value?.substring(0, 50)}
                      {item.value?.length > 50 ? "..." : ""}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* 写入数据 */}
        <div className="space-y-2">
          <Button
            onClick={handleWriteData}
            disabled={loading || (cookies.length === 0 && localStorageData.length === 0) || !currentTab}
            className="w-full"
            variant="default"
          >
            <Upload className="h-4 w-4 mr-2" />
            {loading ? "写入中..." : config?.storageType === 'cookie' ? "写入 Cookie 到当前标签页" : "写入 LocalStorage 到当前标签页"}
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
