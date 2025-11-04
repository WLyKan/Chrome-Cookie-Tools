import { StoredCookieInfo, CookieOperationResult } from './src/types.js';

/**
 * 显示状态消息
 */
function showStatus(elementId: string, message: string, isSuccess: boolean) {
  const element = document.getElementById(elementId);
  if (!element) return;

  element.textContent = message;
  element.className = `status ${isSuccess ? 'success' : 'error'}`;
  
  // 3秒后自动隐藏成功消息
  if (isSuccess) {
    setTimeout(() => {
      element.className = 'status';
    }, 3000);
  }
}

/**
 * 显示 Cookie 信息
 */
function displayCookieInfo(storedInfo: StoredCookieInfo | null) {
  const cookieInfo = document.getElementById('cookieInfo');
  const cookieList = document.getElementById('cookieList');
  const cookieTimestamp = document.getElementById('cookieTimestamp');

  if (!cookieInfo || !cookieList || !cookieTimestamp) return;

  if (!storedInfo || !storedInfo.data) {
    cookieInfo.classList.remove('show');
    return;
  }

  // 显示 Cookie 列表
  const cookies = storedInfo.data;
  cookieList.innerHTML = '';

  for (const [name, value] of Object.entries(cookies)) {
    const item = document.createElement('div');
    item.className = 'cookie-item';
    item.innerHTML = `<strong>${name}:</strong> ${value ? value.substring(0, 50) + (value.length > 50 ? '...' : '') : '(空)'}`;
    cookieList.appendChild(item);
  }

  // 显示时间戳
  const date = new Date(storedInfo.timestamp);
  cookieTimestamp.textContent = `保存时间: ${date.toLocaleString('zh-CN')}`;

  cookieInfo.classList.add('show');
}

/**
 * 读取 Cookie
 */
async function readCookies() {
  const readBtn = document.getElementById('readBtn') as HTMLButtonElement;
  if (!readBtn) return;

  readBtn.disabled = true;
  readBtn.textContent = '读取中...';

  try {
    const response = await chrome.runtime.sendMessage({ action: 'readCookies' }) as CookieOperationResult;

    if (response.success && response.data) {
      showStatus('readStatus', response.message, true);
      displayCookieInfo(response.data as StoredCookieInfo);
    } else {
      showStatus('readStatus', response.message, false);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    showStatus('readStatus', `读取失败: ${errorMessage}`, false);
  } finally {
    readBtn.disabled = false;
    readBtn.textContent = '读取 Cookie';
  }
}

/**
 * 写入 Cookie
 */
async function writeCookies() {
  const writeBtn = document.getElementById('writeBtn') as HTMLButtonElement;
  const targetDomainInput = document.getElementById('targetDomain') as HTMLInputElement;

  if (!writeBtn || !targetDomainInput) return;

  const targetDomain = targetDomainInput.value.trim();
  if (!targetDomain) {
    showStatus('writeStatus', '请输入目标网站域名', false);
    return;
  }

  writeBtn.disabled = true;
  writeBtn.textContent = '写入中...';

  try {
    const response = await chrome.runtime.sendMessage({
      action: 'writeCookies',
      targetDomain: targetDomain
    }) as CookieOperationResult;

    showStatus('writeStatus', response.message, response.success);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    showStatus('writeStatus', `写入失败: ${errorMessage}`, false);
  } finally {
    writeBtn.disabled = false;
    writeBtn.textContent = '写入 Cookie';
  }
}

/**
 * 加载已保存的 Cookie 信息
 */
async function loadStoredCookies() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'getStoredCookies' }) as {
      success: boolean;
      data: StoredCookieInfo | null;
      message: string;
    };

    if (response.success && response.data) {
      displayCookieInfo(response.data);
    }
  } catch (error) {
    console.error('加载 Cookie 信息失败:', error);
  }
}

/**
 * 初始化
 */
function init() {
  // 绑定按钮事件
  const readBtn = document.getElementById('readBtn');
  const writeBtn = document.getElementById('writeBtn');

  if (readBtn) {
    readBtn.addEventListener('click', readCookies);
  }

  if (writeBtn) {
    writeBtn.addEventListener('click', writeCookies);
  }

  // 加载已保存的 Cookie 信息
  loadStoredCookies();
}

// 页面加载完成后初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
