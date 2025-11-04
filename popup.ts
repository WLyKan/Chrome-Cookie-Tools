import { StoredLocalStorageInfo, LocalStorageOperationResult, ReadKeysConfig } from './src/types.js';

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
 * 显示 localstorage 信息
 */
function displayStorageInfo(storedInfo: StoredLocalStorageInfo | null) {
  const info = document.getElementById('cookieInfo');
  const list = document.getElementById('cookieList');
  const ts = document.getElementById('cookieTimestamp');
  if (!info || !list || !ts) return;

  if (!storedInfo || !storedInfo.data) {
    info.classList.remove('show');
    return;
  }

  // 显示 localstorage 列表
  const data = storedInfo.data;
  list.innerHTML = '';

  for (const [name, value] of Object.entries(data)) {
    const item = document.createElement('div');
    item.className = 'cookie-item';
    item.innerHTML = `<strong>${name}:</strong> ${value ? value.substring(0, 50) + (value.length > 50 ? '...' : '') : '(空)'}`;
    list.appendChild(item);
  }

  // 显示时间戳
  const date = new Date(storedInfo.timestamp);
  ts.textContent = `保存时间: ${date.toLocaleString('zh-CN')}`;

  info.classList.add('show');
}

/**
 * 读取 Cookie
 */
async function readLocalStorage() {
  const btn = document.getElementById('readBtn') as HTMLButtonElement;
  if (!btn) return;

  btn.disabled = true;
  btn.textContent = '读取中...';

  try {
    const response = await chrome.runtime.sendMessage({ action: 'readLocalStorage' }) as LocalStorageOperationResult;

    if (response.success && response.data) {
      showStatus('readStatus', response.message, true);
      displayStorageInfo(response.data as StoredLocalStorageInfo);
    } else {
      showStatus('readStatus', response.message, false);
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : '未知错误';
    showStatus('readStatus', `读取失败: ${msg}`, false);
  } finally {
    btn.disabled = false;
    btn.textContent = '读取 localStorage';
  }
}

/**
 * 写入 Cookie
 */
async function writeLocalStorage() {
  const btn = document.getElementById('writeBtn') as HTMLButtonElement;
  if (!btn) return;
  btn.disabled = true;
  btn.textContent = '写入中...';
  try {
    const response = await chrome.runtime.sendMessage({ action: 'writeLocalStorage' }) as LocalStorageOperationResult;
    showStatus('writeStatus', response.message, response.success);
  } catch (e) {
    const msg = e instanceof Error ? e.message : '未知错误';
    showStatus('writeStatus', `写入失败: ${msg}`, false);
  } finally {
    btn.disabled = false;
    btn.textContent = '写入 localStorage';
  }
}

/**
 * 加载已保存的 localstorage 信息
 */
async function loadStored() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'getStoredLocalStorage' }) as {
      success: boolean; data: StoredLocalStorageInfo | null; message: string;
    };
    if (response.success && response.data) {
      displayStorageInfo(response.data);
    }
    // 加载键名配置
    const cfg = await chrome.runtime.sendMessage({ action: 'getReadKeysConfig' }) as {
      success: boolean; data: ReadKeysConfig; message: string;
    };
    if (cfg.success && cfg.data) {
      const keysInput = document.getElementById('keysInput') as HTMLTextAreaElement | null;
      if (keysInput) {
        keysInput.value = cfg.data.keys.join('\n');
      }
    }
  } catch {}
}

async function saveKeys() {
  const btn = document.getElementById('saveKeysBtn') as HTMLButtonElement | null;
  const keysInput = document.getElementById('keysInput') as HTMLTextAreaElement | null;
  if (!btn || !keysInput) return;
  btn.disabled = true;
  btn.textContent = '保存中...';
  try {
    const raw = keysInput.value || '';
    const keys = raw
      .split(/\n|,|;|\s+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);
    const res = await chrome.runtime.sendMessage({ action: 'saveReadKeysConfig', keys });
    showStatus('saveKeysStatus', res?.message || '已保存', !!res?.success);
  } catch (e) {
    const msg = e instanceof Error ? e.message : '未知错误';
    showStatus('saveKeysStatus', `保存失败: ${msg}`, false);
  } finally {
    btn.disabled = false;
    btn.textContent = '保存配置';
  }
}

/**
 * 初始化
 */
function init() {
  // 绑定按钮事件
  const readBtn = document.getElementById('readBtn');
  const writeBtn = document.getElementById('writeBtn');
  const saveKeysBtn = document.getElementById('saveKeysBtn');

  if (readBtn) {
    readBtn.addEventListener('click', readLocalStorage);
  }

  if (writeBtn) {
    writeBtn.addEventListener('click', writeLocalStorage);
  }
  if (saveKeysBtn) {
    saveKeysBtn.addEventListener('click', saveKeys);
  }

  // 加载已保存的 localstorage 信息
  loadStored();
}

// 页面加载完成后初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
