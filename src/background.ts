import {
  LocalStorageData,
  StoredLocalStorageInfo,
  LocalStorageOperationResult,
  SOURCE_URL,
  LOCAL_STORAGE_KEYS,
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

    const url = new URL(tab.url);
    const source = new URL(SOURCE_URL);
    if (url.hostname !== source.hostname) {
      return { success: false, message: `请在源站点页面执行，当前为 ${url.hostname}` };
    }

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
      args: [Array.from(LOCAL_STORAGE_KEYS)],
      world: 'MAIN'
    });

    const data: LocalStorageData = (injection[0]?.result || {}) as LocalStorageData;
    const foundKeys = Object.keys(data);
    if (foundKeys.length === 0) {
      return { success: false, message: `未找到以下键: ${Array.from(LOCAL_STORAGE_KEYS).join(', ')}`, data: null };
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
 * 在打开的目标站点标签页写入 localStorage（要求用户已打开目标站点）
 */
async function writeLocalStorageToTarget(targetDomain: string): Promise<LocalStorageOperationResult> {
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

    const normalizedTarget = targetDomain.startsWith('http') ? targetDomain : `https://${targetDomain}`;
    const targetUrl = new URL(normalizedTarget);

    // 仅对当前活动页注入，并校验域名匹配
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!activeTab || !activeTab.id || !activeTab.url) {
      return { success: false, message: '未找到活动标签页' };
    }
    const activeHost = new URL(activeTab.url).hostname;
    if (!activeHost.endsWith(targetUrl.hostname)) {
      return { success: false, message: `请在目标站点活动页执行，当前为 ${activeHost}` };
    }

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
    const targetDomain = message.targetDomain;
    if (!targetDomain) {
      sendResponse({
        success: false,
        message: '未提供目标域名'
      });
      return;
    }
    writeLocalStorageToTarget(targetDomain).then(result => {
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

  return false;
});

/**
 * 监听标签页更新，自动检测源网站
 */
chrome.tabs.onUpdated.addListener((tabId: number, changeInfo: chrome.tabs.TabChangeInfo, tab: chrome.tabs.Tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    try {
      const url = new URL(tab.url);
      if (url.hostname === new URL(SOURCE_URL).hostname) {
        // 可选：自动读取 localStorage（默认仅提示）
        console.log('检测到源网站已加载:', tab.url);
      }
    } catch (error) {
      // URL 解析失败，忽略
    }
  }
});
