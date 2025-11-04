import { 
  CookieData, StoredCookieInfo, 
  CookieOperationResult, SOURCE_URL, 
  REQUIRED_COOKIE_NAMES,
} from './types.js';

/**
 * 从源网站读取 Cookie
 */
async function readCookiesFromSource(): Promise<CookieOperationResult> {
  try {
    // 获取源网站的所有 Cookie
    const cookies = await chrome.cookies.getAll({
      url: SOURCE_URL
    });

    if (!cookies || cookies.length === 0) {
      return {
        success: false,
        message: '未找到任何 Cookie'
      };
    }

    // 提取需要的 Cookie 值
    const cookieData: CookieData = {};
    const foundCookies: string[] = [];

    for (const cookie of cookies) {
      const name = cookie.name.toLowerCase();
      
      // 检查是否是需要的 Cookie
      if (REQUIRED_COOKIE_NAMES.some(req => req.toLowerCase() === name)) {
        cookieData[cookie.name] = cookie.value;
        foundCookies.push(cookie.name);
      }
    }

    // 验证是否找到了必要的 Cookie
    if (foundCookies.length === 0) {
      return {
        success: false,
        message: `未找到以下 Cookie: ${REQUIRED_COOKIE_NAMES.join(', ')}`
      };
    }

    // 保存到存储
    const storedInfo: StoredCookieInfo = {
      data: cookieData,
      sourceDomain: new URL(SOURCE_URL).hostname,
      timestamp: Date.now()
    };

    await chrome.storage.local.set({ cookieData: storedInfo });

    return {
      success: true,
      message: `成功读取 ${foundCookies.length} 个 Cookie: ${foundCookies.join(', ')}`,
      data: storedInfo
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    return {
      success: false,
      message: `读取 Cookie 失败: ${errorMessage}`
    };
  }
}

/**
 * 将 Cookie 写入目标网站
 */
async function writeCookiesToTarget(targetDomain: string): Promise<CookieOperationResult> {
  try {
    // 从存储中读取保存的 Cookie 数据
    const result = await chrome.storage.local.get('cookieData');
    
    if (!result.cookieData) {
      return {
        success: false,
        message: '未找到保存的 Cookie 数据，请先读取 Cookie'
      };
    }

    const storedInfo: StoredCookieInfo = result.cookieData;
    const cookieData = storedInfo.data;

    if (!cookieData || Object.keys(cookieData).length === 0) {
      return {
        success: false,
        message: 'Cookie 数据为空'
      };
    }

    // 构建目标 URL
    const targetUrl = targetDomain.startsWith('http') 
      ? targetDomain 
      : `https://${targetDomain}`;

    const targetUrlObj = new URL(targetUrl);
    const domain = targetUrlObj.hostname;

    // 写入每个 Cookie
    const writeResults: string[] = [];
    const errors: string[] = [];

    for (const [name, value] of Object.entries(cookieData)) {
      if (!value) continue;

      try {
        await chrome.cookies.set({
          url: targetUrl,
          name: name,
          value: value,
          domain: `.${domain}`, // 使用点开头允许子域名
          path: '/',
          secure: true,
          httpOnly: false, // 大多数 Cookie 都可以通过 JS 访问
          sameSite: 'lax'
        });

        writeResults.push(name);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '未知错误';
        errors.push(`${name}: ${errorMessage}`);
      }
    }

    if (writeResults.length === 0) {
      return {
        success: false,
        message: `写入 Cookie 失败: ${errors.join('; ')}`
      };
    }

    const message = errors.length > 0
      ? `成功写入 ${writeResults.length} 个 Cookie，${errors.length} 个失败: ${errors.join('; ')}`
      : `成功写入 ${writeResults.length} 个 Cookie: ${writeResults.join(', ')}`;

    return {
      success: true,
      message: message,
      data: storedInfo
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    return {
      success: false,
      message: `写入 Cookie 失败: ${errorMessage}`
    };
  }
}

/**
 * 监听来自 popup 或 content script 的消息
 */
chrome.runtime.onMessage.addListener((message: any, sender: chrome.runtime.MessageSender, sendResponse: (response: any) => void) => {
  if (message.action === 'readCookies') {
    readCookiesFromSource().then(result => {
      sendResponse(result);
    });
    return true; // 保持消息通道开放
  }

  if (message.action === 'writeCookies') {
    const targetDomain = message.targetDomain;
    if (!targetDomain) {
      sendResponse({
        success: false,
        message: '未提供目标域名'
      });
      return;
    }
    writeCookiesToTarget(targetDomain).then(result => {
      sendResponse(result);
    });
    return true; // 保持消息通道开放
  }

  if (message.action === 'getStoredCookies') {
    chrome.storage.local.get('cookieData').then((result: { cookieData?: StoredCookieInfo }) => {
      sendResponse({
        success: true,
        data: result.cookieData || null,
        message: result.cookieData ? '已找到保存的 Cookie 数据' : '未找到保存的 Cookie 数据'
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
        // 可以在这里添加自动读取逻辑（可选）
        console.log('检测到源网站已加载:', tab.url);
      }
    } catch (error) {
      // URL 解析失败，忽略
    }
  }
});
