import { TableItem } from "@/components/Table"
import dayjs from "dayjs"
import type {
  MessageType,
  ReadCookiesRequest,
  WriteCookiesRequest,
  ReadLocalStorageRequest,
  WriteLocalStorageRequest,
  ReadStorageRequest,
  WriteStorageRequest,
  SaveConfigRequest,
  MessageResponse,
  CookieData,
  StorageConfig,
  StoredCookieInfo,
  StoredLocalStorageInfo,
  LocalStorageData,
  StorageType,
  UnifiedStorageItem,
  StoredUnifiedInfo,
  ReadHistoryRecord,
} from "@/types";
import { DEFAULT_STORAGE_CONFIG, DEFAULT_TYPE } from "@/types";
import { objectToKeyValues } from "@/utils";
import upsertReadHistory, { getReadHistoryRecordId } from "@/utils/readHistory";

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
      case "READ_STORAGE":
        return await handleReadStorage(message as ReadStorageRequest);
      case "WRITE_STORAGE":
        return await handleWriteStorage(message as WriteStorageRequest);
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

    // 验证当前页面与源 URL 是否一致（仅在正确页面执行）
    const expectedUrl = new URL(sourceUrl);
    const currentUrl = new URL(tab.url);

    if (expectedUrl.hostname !== currentUrl.hostname) {
      return {
        success: false,
        error: `请在源站点（${expectedUrl.hostname}）页面执行`,
      };
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
        sourceUrl: sourceUrl,
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
): Promise<MessageResponse<{ okCount: number; failCount: number }>> {
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

    if (!injection || injection.length === 0) {
      return {
        success: false,
        error: 'Failed to write localStorage',
      };
    }

    const result = injection[0].result as { ok?: string[]; fail?: string[] } | undefined;
    const okCount = result?.ok?.length ?? 0;
    const failCount = result?.fail?.length ?? 0;

    return {
      success: true,
      data: {
        okCount,
        failCount,
      },
    };
  } catch (error) {
    console.error("Error writing localStorage:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to write localStorage",
    };
  }
}

/**
 * 统一读取：按 key 在 localStorage → sessionStorage → cookie 中取第一个匹配
 */
async function handleReadStorage(
  request: ReadStorageRequest
): Promise<MessageResponse<UnifiedStorageItem[]>> {
  const { sourceUrl, keys } = request.payload;

  try {
    console.log("[StorageDevTools][background] handleReadStorage: start", {
      sourceUrl,
      keys,
    });

    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.id || !tab.url) {
      return { success: false, error: "未找到活动标签页" };
    }

    const expectedUrl = new URL(sourceUrl);
    const currentUrl = new URL(tab.url);
    if (expectedUrl.hostname !== currentUrl.hostname) {
      return {
        success: false,
        error: `请在源站点（${expectedUrl.hostname}）页面执行`,
      };
    }

    // 注入脚本：一次性读取所有 key 的 localStorage 和 sessionStorage
    const scriptResult = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (keys: string[]) => {
        const local: Record<string, string | null> = {};
        const session: Record<string, string | null> = {};
        for (const k of keys) {
          local[k] = window.localStorage.getItem(k);
          session[k] = window.sessionStorage.getItem(k);
        }
        return { local, session };
      },
      args: [keys],
      world: "MAIN",
    });

    const { local = {}, session = {} } = (scriptResult?.[0]?.result as { local?: Record<string, string | null>; session?: Record<string, string | null> }) || {};
    console.log("[StorageDevTools][background] handleReadStorage: LS/SS result", {
      local,
      session,
    });

    // 读取 Cookie（包含 Session Cookie）
    // 注意：这里不再调用 browser.permissions.request，以避免在非用户手势上下文中触发
    // “This function must be called during a user gesture” 错误。
    // 如果没有权限，则仅跳过 Cookie 读取，继续返回 localStorage / sessionStorage 结果。
    const cookieMap: Record<string, CookieData> = {};
    let hasPermission = await browser.permissions.contains({
      permissions: ["cookies"],
      origins: [`${expectedUrl.protocol}//${expectedUrl.hostname}/*`],
    });

    if (!hasPermission) {
      console.warn("[StorageDevTools][background] handleReadStorage: cookies permission missing", {
        origin: `${expectedUrl.protocol}//${expectedUrl.hostname}/*`,
      });
    }
    console.log("[StorageDevTools][background] handleReadStorage: hasPermission", hasPermission, keys);
    if (hasPermission) {
      for (const name of keys) {
        const list = await browser.cookies.getAll({ url: sourceUrl, name });
        console.log("[StorageDevTools][background] handleReadStorage: name, list", {
          name,
          list,
        });
        if (list.length > 0) {
          const c = list[0];
          cookieMap[name] = {
            name: c.name,
            value: c.value,
            domain: c.domain,
            path: c.path,
            secure: c.secure,
            httpOnly: c.httpOnly,
            sameSite: c.sameSite,
            expirationDate: c.expirationDate,
          };
        }
      }
    }
    console.log("[StorageDevTools][background] handleReadStorage: cookie result", {
      cookieKeys: Object.keys(cookieMap),
    });

    // 按 key 顺序，每个 key 取第一个匹配：localStorage → sessionStorage → cookie
    const items: UnifiedStorageItem[] = [];
    for (const key of keys) {
      const localVal = local[key];
      if (localVal != null && localVal !== "") {
        items.push({ key, value: localVal, source: "localStorage" });
        continue;
      }
      const sessionVal = session[key];
      if (sessionVal != null && sessionVal !== "") {
        items.push({ key, value: sessionVal, source: "sessionStorage" });
        continue;
      }
      const cookie = cookieMap[key];
      if (cookie) {
        items.push({
          key,
          value: cookie.value,
          source: "cookie",
          cookieData: cookie,
        });
      }
    }

    const stored: StoredUnifiedInfo = {
      items,
      sourceUrl,
      timestamp: Date.now(),
    };
    await browser.storage.local.set({ lastReadUnified: stored });

    // 读取 personInfo（用户名/用户编号），并记录最近 10 条读取历史
    try {
      const personInfoRes = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => window.localStorage.getItem("personInfo"),
        world: "MAIN",
      });
      const personInfoRaw = personInfoRes?.[0]?.result as string | null | undefined;
      if (typeof personInfoRaw === "string" && personInfoRaw.trim() !== "") {
        const parsed = JSON.parse(personInfoRaw) as { staffName?: unknown; staffCode?: unknown };
        const staffName = typeof parsed.staffName === "string" ? parsed.staffName : "";
        const staffCode = typeof parsed.staffCode === "string" ? parsed.staffCode : "";
        if (staffCode) {
          const record: ReadHistoryRecord = {
            id: getReadHistoryRecordId(sourceUrl, staffCode),
            staffName: staffName || staffCode,
            staffCode,
            sourceUrl,
            timestamp: stored.timestamp,
            items,
          };
          const result = await browser.storage.local.get("readHistory");
          const history = (result.readHistory || []) as ReadHistoryRecord[];
          const next = upsertReadHistory(history, record, 10);
          await browser.storage.local.set({ readHistory: next });
        }
      }
    } catch (error) {
      console.warn("[StorageDevTools][background] handleReadStorage: failed to save readHistory", error);
    }

    console.log("[StorageDevTools][background] handleReadStorage: done", {
      itemCount: items.length,
      items,
    });

    return { success: true, data: items };
  } catch (error) {
    console.error("Error in handleReadStorage:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "读取失败",
    };
  }
}

/**
 * 统一写入：按每条 item.source 写回 localStorage / sessionStorage / cookie
 */
async function handleWriteStorage(
  request: WriteStorageRequest
): Promise<MessageResponse<{ okCount: number; failCount: number }>> {
  const { targetUrl, items } = request.payload;

  try {
    console.log("[StorageDevTools][background] handleWriteStorage: start", {
      targetUrl,
      itemCount: items.length,
      items,
    });

    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.id || !tab.url) {
      return { success: false, error: "未找到活动标签页" };
    }

    const url = new URL(targetUrl);
    const domain = url.hostname;

    const localEntries: [string, string][] = [];
    const sessionEntries: [string, string][] = [];
    const cookieItems: CookieData[] = [];

    for (const item of items) {
      if (item.source === "localStorage") {
        localEntries.push([item.key, item.value]);
      } else if (item.source === "sessionStorage") {
        sessionEntries.push([item.key, item.value]);
      } else if (item.source === "cookie" && item.cookieData) {
        cookieItems.push(item.cookieData);
      }
    }

    console.log("[StorageDevTools][background] handleWriteStorage: grouped", {
      localCount: localEntries.length,
      sessionCount: sessionEntries.length,
      cookieCount: cookieItems.length,
    });

    let okCount = 0;
    let failCount = 0;

    // 写入 localStorage
    if (localEntries.length > 0) {
      const res = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: (entries: [string, string][]) => {
          const ok: string[] = [];
          const fail: string[] = [];
          for (const [k, v] of entries) {
            try {
              window.localStorage.setItem(k, v);
              ok.push(k);
            } catch {
              fail.push(k);
            }
          }
          return { ok, fail };
        },
        args: [localEntries],
        world: "MAIN",
      });
      const r = (res?.[0]?.result as { ok?: string[]; fail?: string[] }) || {};
      okCount += r.ok?.length ?? 0;
      failCount += r.fail?.length ?? 0;
      console.log("[StorageDevTools][background] handleWriteStorage: localStorage result", r);
    }

    // 写入 sessionStorage
    if (sessionEntries.length > 0) {
      const res = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: (entries: [string, string][]) => {
          const ok: string[] = [];
          const fail: string[] = [];
          for (const [k, v] of entries) {
            try {
              window.sessionStorage.setItem(k, v);
              ok.push(k);
            } catch {
              fail.push(k);
            }
          }
          return { ok, fail };
        },
        args: [sessionEntries],
        world: "MAIN",
      });
      const r = (res?.[0]?.result as { ok?: string[]; fail?: string[] }) || {};
      okCount += r.ok?.length ?? 0;
      failCount += r.fail?.length ?? 0;
      console.log("[StorageDevTools][background] handleWriteStorage: sessionStorage result", r);
    }

    // 写入 Cookie
    if (cookieItems.length > 0) {
      const hasPermission = await browser.permissions.contains({
        origins: [`${url.protocol}//${domain}/*`],
      });
      if (!hasPermission) {
        const granted = await browser.permissions.request({
          origins: [`${url.protocol}//${domain}/*`],
        });
        if (!granted) {
          failCount += cookieItems.length;
          console.warn("[StorageDevTools][background] handleWriteStorage: cookie permission denied", {
            targetUrl,
            cookieCount: cookieItems.length,
          });
        } else {
          for (const cookie of cookieItems) {
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
              okCount++;
            } catch {
              failCount++;
            }
          }
        }
      } else {
        for (const cookie of cookieItems) {
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
            okCount++;
          } catch {
            failCount++;
          }
        }
      }
    }

    console.log("[StorageDevTools][background] handleWriteStorage: done", {
      okCount,
      failCount,
    });

    return {
      success: true,
      data: { okCount, failCount },
    };
  } catch (error) {
    console.error("Error in handleWriteStorage:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "写入失败",
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
 * 更新配置历史
 * - 仅使用 browser.storage.local 存储
 * - 保留最近 10 条，按最近使用排序
 */
async function updateConfigHistory(config: StorageConfig): Promise<void> {
  try {
    const result = await browser.storage.local.get("configHistory");
    let history = result.configHistory || [];

    // 移除相同类型 + 相同 key 列表的旧记录
    history = history.filter(
      (item: TableItem) =>
        item.type !== config.storageType ||
        item.content !== config.storageKeys.join(","),
    );

    // 新记录插到最前面
    const storageType: StorageType = (config.storageType || DEFAULT_TYPE) as StorageType;
    const newItem: TableItem = {
      type: storageType,
      content: config.storageKeys.join(","),
      createdAt: dayjs().format("YYYY:MM HH:mm:ss"),
    };
    history.unshift(newItem);

    // 只保留最近 10 条
    history = history.slice(0, 10);

    await browser.storage.local.set({ configHistory: history });
  } catch (error) {
    console.error("Error updating config history:", error);
  }
}
