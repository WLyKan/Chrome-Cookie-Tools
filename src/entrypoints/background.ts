import { TableItem } from "@/components/Table";
import dayjs from "dayjs";
import type {
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
import {
  DEFAULT_STORAGE_CONFIG,
  DEFAULT_TYPE,
  MessageType,
} from "@/types";
import { objectToKeyValues } from "@/utils";
import {
  chromeCookieToCookieData,
  ensureEffectiveHostPermission,
  executeStorageBatchWrite,
  hasEffectiveHostPermission,
  originMatchPatternForUrl,
  queryActiveTabInCurrentWindow,
  readSourceHostnameGuard,
  setCookiesOnUrl,
} from "@/utils/extension-storage-helpers";
import {
  extractIdentityFromPersonInfoRaw,
  extractIdentityFromStorageItems,
} from "@/utils/identity";
import upsertReadHistory, { getReadHistoryRecordId } from "@/utils/readHistory";

function bgLog(...args: unknown[]) {
  if (import.meta.env.DEV) console.log(...args);
}

function bgWarnDev(...args: unknown[]) {
  if (import.meta.env.DEV) console.warn(...args);
}

export default defineBackground(() => {
  if (import.meta.env.DEV) {
    chrome.action.setBadgeText({ text: "DEV" });
    chrome.action.setBadgeBackgroundColor({ color: "#FCD34D" });
  }

  browser.runtime.onMessage.addListener((_message, _sender, sendResponse) => {
    handleMessage(_message).then(sendResponse);
    return true;
  });
});

/**
 * 处理消息路由
 */
async function handleMessage(message: any): Promise<MessageResponse> {
  try {
    switch (message.type) {
      case MessageType.READ_COOKIES:
        return await handleReadCookies(message as ReadCookiesRequest);
      case MessageType.WRITE_COOKIES:
        return await handleWriteCookies(message as WriteCookiesRequest);
      case MessageType.READ_LOCALSTORAGE:
        return await handleReadLocalStorage(message as ReadLocalStorageRequest);
      case MessageType.WRITE_LOCALSTORAGE:
        return await handleWriteLocalStorage(message as WriteLocalStorageRequest);
      case MessageType.GET_CONFIG:
        return await handleGetConfig();
      case MessageType.SAVE_CONFIG:
        return await handleSaveConfig(message as SaveConfigRequest);
      case MessageType.READ_STORAGE:
        return await handleReadStorage(message as ReadStorageRequest);
      case MessageType.WRITE_STORAGE:
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
 * 读取 Cookie（兼容旧消息类型，转调统一读取后仅返回 Cookie 并写入 lastReadCookies）
 */
async function handleReadCookies(
  request: ReadCookiesRequest,
): Promise<MessageResponse<CookieData[]>> {
  const { sourceUrl, cookieNames } = request.payload;
  const unified = await handleReadStorage({
    type: MessageType.READ_STORAGE,
    payload: { sourceUrl, keys: cookieNames },
  });
  if (!unified.success || unified.data === undefined) {
    return {
      success: false,
      error: unified.error ?? "读取失败",
    };
  }
  const byKey = new Map<string, CookieData>();
  for (const item of unified.data) {
    if (item.source === "cookie" && item.cookieData) {
      byKey.set(item.key, item.cookieData);
    }
  }
  const cookies: CookieData[] = [];
  for (const name of cookieNames) {
    const c = byKey.get(name);
    if (c) cookies.push(c);
  }
  const storedInfo: StoredCookieInfo = {
    cookies,
    sourceUrl,
    timestamp: Date.now(),
  };
  await browser.storage.local.set({ lastReadCookies: storedInfo });
  return { success: true, data: cookies };
}

/**
 * 写入 Cookie（兼容旧消息类型）
 */
async function handleWriteCookies(
  request: WriteCookiesRequest,
): Promise<MessageResponse<number>> {
  const { targetUrl, cookies } = request.payload;
  const items: UnifiedStorageItem[] = cookies.map((c) => ({
    key: c.name,
    value: c.value,
    source: "cookie",
    cookieData: c,
  }));
  const res = await handleWriteStorage({
    type: MessageType.WRITE_STORAGE,
    payload: { targetUrl, items },
  });
  if (!res.success) {
    return { success: false, error: res.error || "Failed to write cookies" };
  }
  return { success: true, data: res.data!.okCount };
}

/**
 * 读取 LocalStorage（兼容旧消息类型）
 */
async function handleReadLocalStorage(
  request: ReadLocalStorageRequest,
): Promise<MessageResponse<LocalStorageData[]>> {
  const { sourceUrl, keys } = request.payload;
  const unified = await handleReadStorage({
    type: MessageType.READ_STORAGE,
    payload: { sourceUrl, keys },
  });
  if (!unified.success || unified.data === undefined) {
    return {
      success: false,
      error: unified.error ?? "读取失败",
    };
  }
  const data: LocalStorageData[] = unified.data
    .filter((item) => item.source === "localStorage")
    .map((item) => ({ key: item.key, value: item.value }));
  const storedInfo: StoredLocalStorageInfo = {
    data,
    sourceUrl,
    timestamp: Date.now(),
  };
  await browser.storage.local.set({ lastReadLocalStorage: storedInfo });
  return { success: true, data };
}

/**
 * 写入 LocalStorage（兼容旧消息类型）
 */
async function handleWriteLocalStorage(
  request: WriteLocalStorageRequest,
): Promise<MessageResponse<{ okCount: number; failCount: number }>> {
  const { targetUrl, data } = request.payload;
  const items: UnifiedStorageItem[] = data.map((d) => ({
    key: d.key,
    value: d.value,
    source: "localStorage",
  }));
  const res = await handleWriteStorage({
    type: MessageType.WRITE_STORAGE,
    payload: { targetUrl, items },
  });
  if (!res.success || !res.data) {
    return res as MessageResponse<{ okCount: number; failCount: number }>;
  }
  return {
    success: true,
    data: {
      okCount: res.data.okCount,
      failCount: res.data.failCount,
    },
  };
}

/**
 * 统一读取：按 key 收集 localStorage / sessionStorage / cookie 的所有匹配
 */
async function handleReadStorage(
  request: ReadStorageRequest,
): Promise<MessageResponse<UnifiedStorageItem[]>> {
  const { sourceUrl, keys } = request.payload;

  try {
    bgLog("[StorageDevTools][background] handleReadStorage: start", {
      sourceUrl,
      keys,
    });

    const tab = await queryActiveTabInCurrentWindow();
    if (!tab?.id || !tab.url) {
      return { success: false, error: "未找到活动标签页" };
    }

    const hostErr = readSourceHostnameGuard(sourceUrl, tab.url);
    if (hostErr) return hostErr;

    const expectedUrl = new URL(sourceUrl);

    const scriptResult = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (keyList: string[]) => {
        const local: Record<string, string | null> = {};
        const session: Record<string, string | null> = {};
        for (const k of keyList) {
          local[k] = window.localStorage.getItem(k);
          session[k] = window.sessionStorage.getItem(k);
        }
        return { local, session };
      },
      args: [keys],
      world: "MAIN",
    });

    const { local = {}, session = {} } =
      (scriptResult?.[0]?.result as {
        local?: Record<string, string | null>;
        session?: Record<string, string | null>;
      }) || {};
    bgLog("[StorageDevTools][background] handleReadStorage: LS/SS result", {
      local,
      session,
    });

    const cookieMap: Record<string, CookieData> = {};
    const hasHost = await hasEffectiveHostPermission(expectedUrl);
    if (!hasHost) {
      console.warn(
        "[StorageDevTools][background] handleReadStorage: 主机权限未生效，已跳过 Cookie 读取",
        { origin: originMatchPatternForUrl(expectedUrl) },
      );
    }
    bgLog(
      "[StorageDevTools][background] handleReadStorage: hasHost",
      hasHost,
      keys,
    );
    if (hasHost) {
      for (const name of keys) {
        const list = await browser.cookies.getAll({ url: sourceUrl, name });
        bgLog("[StorageDevTools][background] handleReadStorage: name, list", {
          name,
          list,
        });
        if (list.length > 0) {
          cookieMap[name] = chromeCookieToCookieData(list[0]);
        }
      }
    }
    bgLog("[StorageDevTools][background] handleReadStorage: cookie result", {
      cookieKeys: Object.keys(cookieMap),
    });

    const items: UnifiedStorageItem[] = [];
    for (const key of keys) {
      const localVal = local[key];
      if (localVal != null && localVal !== "") {
        items.push({ key, value: localVal, source: "localStorage" });
      }
      const sessionVal = session[key];
      if (sessionVal != null && sessionVal !== "") {
        items.push({ key, value: sessionVal, source: "sessionStorage" });
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

    try {
      let identity = extractIdentityFromStorageItems(items);
      const personInfoRes = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => window.localStorage.getItem("personInfo"),
        world: "MAIN",
      });
      const personInfoRaw = personInfoRes?.[0]?.result as string | null | undefined;
      if (typeof personInfoRaw === "string" && personInfoRaw.trim() !== "") {
        identity = extractIdentityFromPersonInfoRaw(personInfoRaw) || identity;
      }

      if (identity?.staffCode) {
        const record: ReadHistoryRecord = {
          id: getReadHistoryRecordId(sourceUrl, identity.staffCode),
          staffName: identity.staffName || identity.staffCode,
          staffCode: identity.staffCode,
          sourceUrl,
          timestamp: stored.timestamp,
          items,
        };
        const result = await browser.storage.local.get("readHistory");
        const history = (result.readHistory || []) as ReadHistoryRecord[];
        const next = upsertReadHistory(history, record, 100);
        await browser.storage.local.set({ readHistory: next });
      } else {
        bgWarnDev(
          "[StorageDevTools][background] handleReadStorage: skip readHistory save, missing identity",
          { sourceUrl, itemCount: items.length },
        );
      }
    } catch (error) {
      bgWarnDev(
        "[StorageDevTools][background] handleReadStorage: failed to save readHistory",
        error,
      );
    }

    bgLog("[StorageDevTools][background] handleReadStorage: done", {
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
  request: WriteStorageRequest,
): Promise<
  MessageResponse<{ okCount: number; failCount: number; cookieFailures?: string[] }>
> {
  const { targetUrl, items } = request.payload;

  try {
    bgLog("[StorageDevTools][background] handleWriteStorage: start", {
      targetUrl,
      itemCount: items.length,
      items,
    });

    if (!items?.length) {
      return { success: false, error: "没有可写入的数据" };
    }

    const tab = await queryActiveTabInCurrentWindow();
    if (!tab?.id || !tab.url) {
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

    if (
      localEntries.length === 0 &&
      sessionEntries.length === 0 &&
      cookieItems.length === 0
    ) {
      return {
        success: false,
        error: "没有可识别的写入项（请检查每条数据的 source）",
      };
    }

    bgLog("[StorageDevTools][background] handleWriteStorage: grouped", {
      localCount: localEntries.length,
      sessionCount: sessionEntries.length,
      cookieCount: cookieItems.length,
    });

    let okCount = 0;
    let failCount = 0;
    const cookieFailures: string[] = [];

    if (localEntries.length > 0) {
      const r = await executeStorageBatchWrite(tab.id, localEntries, "local");
      okCount += r.ok.length;
      failCount += r.fail.length;
      bgLog("[StorageDevTools][background] handleWriteStorage: localStorage result", r);
    }

    if (sessionEntries.length > 0) {
      const r = await executeStorageBatchWrite(tab.id, sessionEntries, "session");
      okCount += r.ok.length;
      failCount += r.fail.length;
      bgLog("[StorageDevTools][background] handleWriteStorage: sessionStorage result", r);
    }

    if (cookieItems.length > 0) {
      const canWriteCookies = await ensureEffectiveHostPermission(url);
      if (!canWriteCookies) {
        failCount += cookieItems.length;
        for (const cookie of cookieItems) {
          cookieFailures.push(`cookie ${cookie.name}: 权限被拒绝，目标域 ${domain}`);
        }
        console.warn(
          "[StorageDevTools][background] handleWriteStorage: cookie permission denied",
          { targetUrl, cookieCount: cookieItems.length },
        );
      } else {
        const { successCount, errors } = await setCookiesOnUrl(
          targetUrl,
          url,
          cookieItems,
        );
        okCount += successCount;
        const failCookieCount = cookieItems.length - successCount;
        failCount += failCookieCount;
        for (const e of errors) {
          cookieFailures.push(e);
        }
      }
    }

    bgLog("[StorageDevTools][background] handleWriteStorage: done", {
      okCount,
      failCount,
      cookieFailures,
    });

    if (okCount === 0) {
      const detail =
        cookieFailures.length > 0 ? cookieFailures.join("; ") : undefined;
      return {
        success: false,
        error: detail || `写入失败：成功 0 条，失败 ${failCount} 条`,
        data: { okCount, failCount, cookieFailures },
      };
    }

    return {
      success: true,
      data: { okCount, failCount, cookieFailures },
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
    const result = await browser.storage.sync.get("config");
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
  request: SaveConfigRequest,
): Promise<MessageResponse<StorageConfig>> {
  const config = request.payload;

  try {
    const keys = config.storageKeys || (config as any).cookieNames || [];
    if (!keys || keys.length === 0) {
      return {
        success: false,
        error: "At least one storage key is required",
      };
    }

    config.updatedAt = Date.now();
    if (!config.storageKeys && (config as any).cookieNames) {
      config.storageKeys = (config as any).cookieNames;
      delete (config as any).cookieNames;
    }

    await browser.storage.sync.set({ config: config });

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
 * - 保留最近 20 条，按最近使用排序
 */
async function updateConfigHistory(config: StorageConfig): Promise<void> {
  try {
    const result = await browser.storage.local.get("configHistory");
    let history = result.configHistory || [];

    history = history.filter(
      (item: TableItem) =>
        item.type !== config.storageType ||
        item.content !== config.storageKeys.join(","),
    );

    const storageType: StorageType = (config.storageType || DEFAULT_TYPE) as StorageType;
    const newItem: TableItem = {
      type: storageType,
      content: config.storageKeys.join(","),
      createdAt: dayjs().format("YYYY:MM HH:mm:ss"),
    };
    history.unshift(newItem);

    history = history.slice(0, 20);

    await browser.storage.local.set({ configHistory: history });
  } catch (error) {
    console.error("Error updating config history:", error);
  }
}
