import { TableItem } from "@/components/Table"
import dayjs from "dayjs"
import type {
  MessageType,
  ReadCookiesRequest,
  WriteCookiesRequest,
  ReadLocalStorageRequest,
  WriteLocalStorageRequest,
  SaveConfigRequest,
  MessageResponse,
  CookieData,
  StorageConfig,
  StoredCookieInfo,
  StoredLocalStorageInfo,
  LocalStorageData,
} from "@/types";
import { DEFAULT_STORAGE_CONFIG } from "@/types";
import { objectToKeyValues } from "@/utils"

export default defineBackground(() => {
  // 设置开发环境徽标
  if (import.meta.env.DEV) {
    chrome.action.setBadgeText({ text: 'DEV' });
    chrome.action.setBadgeBackgroundColor({ color: '#FCD34D' }); // yellow-300
  }

  // 监听来自popup的消息
  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    handleMessage(message).then(sendResponse);
    return true; // 保持消息通道开放以支持异步响应
  });
});

/**
 * 处理消息路由
 */
async function handleMessage(message: any): Promise<MessageResponse> {
  try {
    switch (message.type) {
      case "READ_COOKIES":
        return await handleReadCookies(message as ReadCookiesRequest);
      case "WRITE_COOKIES":
        return await handleWriteCookies(message as WriteCookiesRequest);
      case "READ_LOCALSTORAGE":
        return await handleReadLocalStorage(message as ReadLocalStorageRequest);
      case "WRITE_LOCALSTORAGE":
        return await handleWriteLocalStorage(message as WriteLocalStorageRequest);
      case "GET_CONFIG":
        return await handleGetConfig();
      case "SAVE_CONFIG":
        return await handleSaveConfig(message as SaveConfigRequest);
      default:
        return {
          success: false,
          error: `Unknown message type: ${message.type}`,
        };
    }
  } catch (error) {
    console.error("Error handling message:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * 读取源网站的Cookie
 */
async function handleReadCookies(
  request: ReadCookiesRequest
): Promise<MessageResponse<CookieData[]>> {
  const { sourceUrl, cookieNames } = request.payload;

  try {
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });

    if (!tab || !tab.id || !tab.url) {
      return { success: false, error: '未找到活动标签页' };
    }
    // 验证URL
    const url = new URL(sourceUrl);
    const currentUrl = new URL(tab.url);

    if (url.hostname !== currentUrl.hostname) {
      return { success: false, error: `请在源站点（${url.hostname}）页面执行 ` };
    }

    const domain = url.hostname;

    // 检查权限
    const hasPermission = await browser.permissions.contains({
      permissions: ["cookies"],
      origins: [`${url.protocol}//${domain}/*`],
    });

    if (!hasPermission) {
      // 请求权限
      const granted = await browser.permissions.request({
        permissions: ["cookies"],
        origins: [`${url.protocol}//${domain}/*`],
      });

      if (!granted) {
        return {
          success: false,
          error: `Permission denied for ${domain}`,
        };
      }
    }

    // 读取指定的Cookie
    const cookies: CookieData[] = [];

    for (const cookieName of cookieNames) {
      const cookieList = await browser.cookies.getAll({
        url: sourceUrl,
        name: cookieName,
      });

      if (cookieList.length > 0) {
        const cookie = cookieList[0];
        cookies.push({
          name: cookie.name,
          value: cookie.value,
          domain: cookie.domain,
          path: cookie.path,
          secure: cookie.secure,
          httpOnly: cookie.httpOnly,
          sameSite: cookie.sameSite,
          expirationDate: cookie.expirationDate,
        });
      }
    }

    // 保存读取到的Cookie数据
    const storedInfo: StoredCookieInfo = {
      cookies,
      sourceUrl,
      timestamp: Date.now(),
    };

    await browser.storage.local.set({ lastReadCookies: storedInfo });

    return {
      success: true,
      data: cookies,
    };
  } catch (error) {
    console.error("Error reading cookies:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to read cookies",
    };
  }
}

/**
 * 写入Cookie到目标网站
 */
async function handleWriteCookies(
  request: WriteCookiesRequest
): Promise<MessageResponse<number>> {
  const { targetUrl, cookies } = request.payload;

  try {
    // 验证URL
    const url = new URL(targetUrl);
    const domain = url.hostname;

    // 检查权限
    const hasPermission = await browser.permissions.contains({
      origins: [`${url.protocol}//${domain}/*`],
    });

    if (!hasPermission) {
      // 请求权限
      const granted = await browser.permissions.request({
        origins: [`${url.protocol}//${domain}/*`],
      });

      if (!granted) {
        return {
          success: false,
          error: `Permission denied for ${domain}`,
        };
      }
    }

    // 写入Cookie
    let successCount = 0;
    const errors: string[] = [];

    for (const cookie of cookies) {
      try {
        await browser.cookies.set({
          url: targetUrl,
          name: cookie.name,
          value: cookie.value,
          domain: cookie.domain || domain,
          path: cookie.path || "/",
          secure: cookie.secure ?? url.protocol === "https:",
          httpOnly: cookie.httpOnly ?? false,
          sameSite: cookie.sameSite || "lax",
          expirationDate: cookie.expirationDate,
        });
        successCount++;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        errors.push(`${cookie.name}: ${errorMsg}`);
        console.error(`Failed to set cookie ${cookie.name}:`, err);
      }
    }

    if (successCount === 0) {
      return {
        success: false,
        error: `Failed to write any cookies. Errors: ${errors.join("; ")}`,
      };
    }

    return {
      success: true,
      data: successCount,
    };
  } catch (error) {
    console.error("Error writing cookies:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to write cookies",
    };
  }
}

/**
 * 读取源网站的LocalStorage
 */
async function handleReadLocalStorage(
  request: ReadLocalStorageRequest
): Promise<MessageResponse<LocalStorageData[]>> {
  const { sourceUrl, keys } = request.payload;

  try {
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });

    if (!tab || !tab.id || !tab.url) {
      return { success: false, error: '未找到活动标签页' };
    }

    const response = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (keys: string[]) => {
        const result: Record<string, string> = {};
        for (const k of keys) {
          const v = window.localStorage.getItem(k);
          if (typeof v === 'string') result[k] = v;
        }
        return result;
      },
      args: [keys],
      world: 'MAIN',
    });

    if (response?.length > 0) {
      const data: LocalStorageData[] = objectToKeyValues(response[0].result || {});

      // 保存读取到的LocalStorage数据
      const storedInfo: StoredLocalStorageInfo = {
        data,
        sourceUrl: tab.url,
        timestamp: Date.now(),
      };

      await browser.storage.local.set({ lastReadLocalStorage: storedInfo });

      return {
        success: true,
        data,
      };
    } else {
      return {
        success: false,
        error: 'Failed to read localStorage',
      };
    }
  } catch (error) {
    console.error("Error reading localStorage:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to read localStorage",
    };
  }
}

/**
 * 写入LocalStorage到目标网站
 */
async function handleWriteLocalStorage(
  request: WriteLocalStorageRequest
): Promise<MessageResponse<number>> {
  const { targetUrl, data } = request.payload;

  try {
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });

    if (!tab || !tab.id || !tab.url) {
      return { success: false, error: '未找到活动标签页' };
    }

    const injection = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (entries: [string, string][]) => {
        const okKeys: string[] = [];
        const failKeys: string[] = [];
        for (const [k, v] of entries) {
          try {
            window.localStorage.setItem(k, v);
            okKeys.push(k);
          } catch (e) {
            failKeys.push(k);
          }
        }
        return { ok: okKeys, fail: failKeys };
      },
      args: [data.map(({key, value}) => [key, value] as [string, string])],
      world: 'MAIN',
    });

    if (injection?.length > 0) {
      return {
        success: true,
        data: injection[0].result?.ok?.length || 0,
      };
    } else {
      return {
        success: false,
        error: 'Failed to write localStorage',
      };
    }
  } catch (error) {
    console.error("Error writing localStorage:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to write localStorage",
    };
  }
}

/**
 * Get configuration
 */
async function handleGetConfig(): Promise<MessageResponse<StorageConfig>> {
  try {
    const result = await browser.storage.sync.get('config');
    const config = result.config || DEFAULT_STORAGE_CONFIG;

    return {
      success: true,
      data: config,
    };
  } catch (error) {
    console.error("Error getting config:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to get config",
    };
  }
}

/**
 * Save configuration
 */
async function handleSaveConfig(
  request: SaveConfigRequest
): Promise<MessageResponse<StorageConfig>> {
  const config = request.payload;

  try {
    // Backward compatibility: support both storageKeys and cookieNames
    const keys = config.storageKeys || (config as any).cookieNames || [];
    if (!keys || keys.length === 0) {
      return {
        success: false,
        error: "At least one storage key is required",
      };
    }

    // Update timestamp
    config.updatedAt = Date.now();
    // Normalize to use storageKeys
    if (!config.storageKeys && (config as any).cookieNames) {
      config.storageKeys = (config as any).cookieNames;
      delete (config as any).cookieNames;
    }

    // Save configuration
    await browser.storage.sync.set({ config: config });

    // Update history with storageKeys
    await updateConfigHistory(config);

    return {
      success: true,
      data: config,
    };
  } catch (error) {
    console.error("Error saving config:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to save config",
    };
  }
}

/**
 * Update URL history (keep last 5 entries, save both URL and storage keys)
 */
async function updateConfigHistory(config: StorageConfig): Promise<void> {
  try {
    const result = await browser.storage.sync.get("configHistory");
    let history = result.configHistory || [];

    // Remove duplicates (same source)
    history = history.filter(
      (item: TableItem) =>
        item.type !== config.storageType ||
        item.content !== config.storageKeys.join(',')
    );

    // Add to beginning
    const newItem = {
      type: `${config.storageType}`,
      content: config.storageKeys.join(','),
      createdAt: dayjs().format("YYYY:MM HH:mm:ss"),
    };
    history.unshift(newItem);

    // Keep only last 5 entries
    history = history.slice(0, 5);

    await browser.storage.sync.set({ configHistory: history });
  } catch (error) {
    console.error("Error updating URL history:", error);
  }
}
