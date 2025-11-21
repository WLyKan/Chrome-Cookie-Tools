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
  HistoryItem,
} from "@/types";
import { DEFAULT_STORAGE_CONFIG } from "@/types";

export default defineBackground(() => {

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

    // 验证URL
    const url = new URL(sourceUrl);
    const currentUrl = new URL(tab.url);

    if (url.hostname !== currentUrl.hostname) {
      return { success: false, error: `请在源站点（${url.hostname}）页面执行` };
    }

    // 向content script发送消息读取localStorage
    const response = await browser.tabs.sendMessage(tab.id, {
      type: 'READ_LOCALSTORAGE',
      payload: { keys },
    });

    if (response.success) {
      const data: LocalStorageData[] = response.data || [];

      // 保存读取到的LocalStorage数据
      const storedInfo: StoredLocalStorageInfo = {
        data,
        sourceUrl,
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
        error: response.error || 'Failed to read localStorage',
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

    // 验证URL
    const targetUrlObj = new URL(targetUrl);
    const currentUrl = new URL(tab.url);

    if (targetUrlObj.hostname !== currentUrl.hostname) {
      return { success: false, error: `请在目标站点（${targetUrlObj.hostname}）页面执行` };
    }

    // 向content script发送消息写入localStorage
    const response = await browser.tabs.sendMessage(tab.id, {
      type: 'WRITE_LOCALSTORAGE',
      payload: { data },
    });

    if (response.success) {
      return {
        success: true,
        data: response.count || 0,
      };
    } else {
      return {
        success: false,
        error: response.error || 'Failed to write localStorage',
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
    const result = await browser.storage.sync.get("cookieConfig");
    const config = result.cookieConfig || DEFAULT_STORAGE_CONFIG;

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
    // Validate configuration
    if (!config.sourceUrl) {
      return {
        success: false,
        error: "Source URL is required",
      };
    }

    // Backward compatibility: support both storageKeys and cookieNames
    const keys = config.storageKeys || (config as any).cookieNames || [];
    if (!keys || keys.length === 0) {
      return {
        success: false,
        error: "At least one storage key is required",
      };
    }

    // 验证URL格式
    try {
      new URL(config.sourceUrl);
    } catch {
      return {
        success: false,
        error: "Invalid source URL format",
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
    await browser.storage.sync.set({ cookieConfig: config });

    // Update history with storageKeys
    await updateUrlHistory(config.sourceUrl, config.storageKeys);

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
async function updateUrlHistory(url: string, storageKeys: string[]): Promise<void> {
  try {
    const result = await browser.storage.sync.get("urlHistory");
    let history: HistoryItem[] = result.urlHistory || [];

    // Remove duplicates (same URL)
    history = history.filter((item) => item.url !== url);

    // Add to beginning
    const newItem: HistoryItem = {
      url,
      storageKeys,
      timestamp: Date.now(),
    };
    history.unshift(newItem);

    // Keep only last 5 entries
    history = history.slice(0, 5);

    await browser.storage.sync.set({ urlHistory: history });
  } catch (error) {
    console.error("Error updating URL history:", error);
  }
}
