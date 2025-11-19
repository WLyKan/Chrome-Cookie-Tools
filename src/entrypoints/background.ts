import type {
  MessageType,
  ReadCookiesRequest,
  WriteCookiesRequest,
  SaveConfigRequest,
  MessageResponse,
  CookieData,
  CookieConfig,
  StoredCookieInfo,
} from "@/types";
import { DEFAULT_COOKIE_CONFIG } from "@/types";

export default defineBackground(() => {
  console.log("Cookie Tools Background Service Started", { id: browser.runtime.id });

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
    // 验证URL
    const url = new URL(sourceUrl);
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
 * 获取配置
 */
async function handleGetConfig(): Promise<MessageResponse<CookieConfig>> {
  try {
    const result = await browser.storage.sync.get("cookieConfig");
    const config = result.cookieConfig || DEFAULT_COOKIE_CONFIG;

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
 * 保存配置
 */
async function handleSaveConfig(
  request: SaveConfigRequest
): Promise<MessageResponse<CookieConfig>> {
  const config = request.payload;

  try {
    // 验证配置
    if (!config.sourceUrl) {
      return {
        success: false,
        error: "Source URL is required",
      };
    }

    if (!config.cookieNames || config.cookieNames.length === 0) {
      return {
        success: false,
        error: "At least one cookie name is required",
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

    // 更新时间戳
    config.updatedAt = Date.now();

    // 保存配置
    await browser.storage.sync.set({ cookieConfig: config });

    // 更新历史记录
    await updateUrlHistory(config.sourceUrl);

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
 * 更新URL历史记录（最多保留5条）
 */
async function updateUrlHistory(url: string): Promise<void> {
  try {
    const result = await browser.storage.sync.get("urlHistory");
    let history: string[] = result.urlHistory || [];

    // 移除重复项
    history = history.filter((item) => item !== url);

    // 添加到开头
    history.unshift(url);

    // 只保留最近5条
    history = history.slice(0, 5);

    await browser.storage.sync.set({ urlHistory: history });
  } catch (error) {
    console.error("Error updating URL history:", error);
  }
}
