import {
  LocalStorageData,
  StoredLocalStorageInfo,
  LocalStorageOperationResult,
  DEFAULT_SOURCE_URL,
  LOCAL_STORAGE_KEYS,
  ReadKeysConfig,
  DEFAULT_READ_KEYS,
  SourceUrlConfig,
  DEFAULT_SOURCE_URL_CONFIG,
} from './types.js';

// 依赖 activeTab 权限，不进行运行时权限请求

/**
 * 在当前活动标签页（应为源网站）读取指定 localStorage 键
 */
async function readLocalStorageFromActiveTab(): Promise<LocalStorageOperationResult> {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.id || !tab.url) {
      return { success: false, message: '未找到活动标签页', data: null };
    }

    // 获取当前配置的源网站 URL
    const { sourceUrlConfig } = await chrome.storage.sync.get('sourceUrlConfig');
    const cfg: SourceUrlConfig = sourceUrlConfig || DEFAULT_SOURCE_URL_CONFIG;
    const sourceUrl = cfg.current || DEFAULT_SOURCE_URL;

    const url = new URL(tab.url);
    const source = new URL(sourceUrl);
    if (url.hostname !== source.hostname) {
      return { success: false, message: `请在源站点页面执行，当前为 ${url.hostname}，期望为 ${source.hostname}` };
    }

    // 读取配置的键名
    const { readKeysConfig } = await chrome.storage.sync.get('readKeysConfig');
    const keysCfg: ReadKeysConfig = readKeysConfig && Array.isArray(readKeysConfig.keys)
      ? readKeysConfig as ReadKeysConfig
      : DEFAULT_READ_KEYS;
    const keysToRead: string[] = (keysCfg.keys && keysCfg.keys.length > 0) ? keysCfg.keys : Array.from(LOCAL_STORAGE_KEYS);

    // activeTab 授权下，可直接对活动页注入脚本

    const injection = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (keys: string[]) => {
        const result: Record<string, string> = {};
        for (const k of keys) {
          const v = window.localStorage.getItem(k);
          if (typeof v === 'string') result[k] = v;
        }
        return result;
      },
      args: [keysToRead],
      world: 'MAIN'
    });

    const data: LocalStorageData = (injection[0]?.result || {}) as LocalStorageData;
    const foundKeys = Object.keys(data);
    if (foundKeys.length === 0) {
      return { success: false, message: `未找到以下键: ${keysToRead.join(', ')}`, data: null };
    }

    const storedInfo: StoredLocalStorageInfo = {
      data,
      sourceDomain: url.hostname,
      timestamp: Date.now()
    };
    await chrome.storage.local.set({ localStorageData: storedInfo });

    return { success: true, message: `成功读取 ${foundKeys.length} 个键: ${foundKeys.join(', ')}`, data: storedInfo };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    return { success: false, message: `读取 localStorage 失败: ${errorMessage}` };
  }
}

/**
 * 将已保存的数据写入当前活动标签页的 localStorage
 */
async function writeLocalStorageToActiveTab(): Promise<LocalStorageOperationResult> {
  try {
    const { localStorageData } = await chrome.storage.local.get('localStorageData');
    if (!localStorageData) {
      return { success: false, message: '未找到保存的数据，请先读取 localStorage' };
    }

    const storedInfo = localStorageData as StoredLocalStorageInfo;
    const data = storedInfo.data as LocalStorageData;
    if (!data || Object.keys(data).length === 0) {
      return { success: false, message: 'localStorage 数据为空' };
    }

    // 仅对当前活动页注入
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!activeTab || !activeTab.id || !activeTab.url) {
      return { success: false, message: '未找到活动标签页' };
    }
    // 可选：如需限制必须是 HTTPS，或白名单域名，可在此添加校验

    const keys = Object.keys(data);
    const injection = await chrome.scripting.executeScript({
      target: { tabId: activeTab.id },
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
      args: [keys.map(k => [k, data[k]!] as [string, string])],
      world: 'MAIN'
    });

    const result = injection[0]?.result as { ok: string[]; fail: string[] } | undefined;
    if (!result) return { success: false, message: '写入执行失败' };

    const msg = result.fail.length > 0
      ? `成功写入 ${result.ok.length} 个键，失败 ${result.fail.length} 个: ${result.fail.join(', ')}`
      : `成功写入 ${result.ok.length} 个键: ${result.ok.join(', ')}`;
    return { success: true, message: msg, data: storedInfo };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    return { success: false, message: `写入 localStorage 失败: ${errorMessage}` };
  }
}

/**
 * 监听来自 popup 或 content script 的消息
 */
chrome.runtime.onMessage.addListener((message: any, sender: chrome.runtime.MessageSender, sendResponse: (response: any) => void) => {
  if (message.action === 'readLocalStorage') {
    readLocalStorageFromActiveTab().then(result => {
      sendResponse(result);
    });
    return true; // 保持消息通道开放
  }

  if (message.action === 'writeLocalStorage') {
    writeLocalStorageToActiveTab().then(result => {
      sendResponse(result);
    });
    return true; // 保持消息通道开放
  }

  if (message.action === 'getStoredLocalStorage') {
    chrome.storage.local.get('localStorageData').then((result: { localStorageData?: StoredLocalStorageInfo }) => {
      sendResponse({
        success: true,
        data: result.localStorageData || null,
        message: result.localStorageData ? '已找到保存的 localStorage 数据' : '未找到保存的 localStorage 数据'
      });
    });
    return true;
  }

  if (message.action === 'getReadKeysConfig') {
    chrome.storage.sync.get('readKeysConfig').then((result: { readKeysConfig?: ReadKeysConfig }) => {
      const cfg = result.readKeysConfig && Array.isArray(result.readKeysConfig.keys)
        ? result.readKeysConfig as ReadKeysConfig
        : DEFAULT_READ_KEYS;
      sendResponse({ success: true, data: cfg, message: 'OK' });
    });
    return true;
  }

  if (message.action === 'saveReadKeysConfig') {
    const keys: unknown = message.keys;
    const arr = Array.isArray(keys) ? keys : [];
    const normalized = Array.from(new Set(
      arr
        .map(k => (typeof k === 'string' ? k.trim() : ''))
        .filter(k => k.length > 0)
    ));
    const cfg: ReadKeysConfig = { keys: normalized.length > 0 ? normalized : DEFAULT_READ_KEYS.keys, updatedAt: Date.now() };
    chrome.storage.sync.set({ readKeysConfig: cfg }).then(() => {
      sendResponse({ success: true, message: '保存成功', data: cfg });
    }).catch((e: unknown) => {
      const msg = e instanceof Error ? e.message : '保存失败';
      sendResponse({ success: false, message: msg });
    });
    return true;
  }

  if (message.action === 'getSourceUrlConfig') {
    chrome.storage.sync.get('sourceUrlConfig').then((result: { sourceUrlConfig?: SourceUrlConfig }) => {
      const cfg = result.sourceUrlConfig || DEFAULT_SOURCE_URL_CONFIG;
      sendResponse({ success: true, data: cfg, message: 'OK' });
    });
    return true;
  }

  if (message.action === 'saveSourceUrlConfig') {
    const url: unknown = message.url;
    if (typeof url !== 'string' || url.trim().length === 0) {
      sendResponse({ success: false, message: '无效的 URL' });
      return true;
    }

    // 验证 URL 格式
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url.trim());
    } catch {
      sendResponse({ success: false, message: 'URL 格式错误，请输入完整的 URL（如 https://example.com）' });
      return true;
    }

    // 获取现有配置
    chrome.storage.sync.get('sourceUrlConfig').then((result: { sourceUrlConfig?: SourceUrlConfig }) => {
      const oldCfg = result.sourceUrlConfig || DEFAULT_SOURCE_URL_CONFIG;
      const newUrl = parsedUrl.href;
      
      // 更新历史记录（去重并限制为5个）
      const history = [newUrl, ...oldCfg.history.filter(u => u !== newUrl)].slice(0, 5);
      
      const cfg: SourceUrlConfig = {
        current: newUrl,
        history,
        updatedAt: Date.now()
      };

      chrome.storage.sync.set({ sourceUrlConfig: cfg }).then(() => {
        sendResponse({ success: true, message: '保存成功', data: cfg });
      }).catch((e: unknown) => {
        const msg = e instanceof Error ? e.message : '保存失败';
        sendResponse({ success: false, message: msg });
      });
    });
    return true;
  }

  return false;
});

/**
 * 监听标签页更新，自动检测源网站
 */
chrome.tabs.onUpdated.addListener((tabId: number, changeInfo: chrome.tabs.TabChangeInfo, tab: chrome.tabs.Tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    chrome.storage.sync.get('sourceUrlConfig').then((result: { sourceUrlConfig?: SourceUrlConfig }) => {
      const cfg = result.sourceUrlConfig || DEFAULT_SOURCE_URL_CONFIG;
      const sourceUrl = cfg.current || DEFAULT_SOURCE_URL;
      try {
        const url = new URL(tab.url!);
        const source = new URL(sourceUrl);
        if (url.hostname === source.hostname) {
          // 可选：自动读取 localStorage（默认仅提示）
          console.log('检测到源网站已加载:', tab.url);
        }
      } catch (error) {
        // URL 解析失败，忽略
      }
    });
  }
});
