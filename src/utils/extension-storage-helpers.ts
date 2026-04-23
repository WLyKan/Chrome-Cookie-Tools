import type { CookieData } from "@/types";

/**
 * 根据页面 URL 生成 `permissions` API 使用的 origin 匹配串（含路径通配）。
 *
 * @param pageUrl 当前页完整 URL（含协议与主机）
 * @returns 形如 `https://example.com/*` 的匹配模式
 */
export function originMatchPatternForUrl(pageUrl: URL): string {
  return `${pageUrl.protocol}//${pageUrl.hostname}/*`;
}

/**
 * 检测扩展是否对该 URL 拥有**有效主机权限**（与用户「站点访问」设置一致）。
 * manifest 已声明 `cookies` 时，勿与 `permissions: ['cookies']` 组合进 `contains`，否则易被误判为未授权。
 *
 * @param pageUrl 目标页面 URL
 */
export async function hasEffectiveHostPermission(pageUrl: URL): Promise<boolean> {
  return browser.permissions.contains({
    origins: [originMatchPatternForUrl(pageUrl)],
  });
}

/**
 * 确保拥有该 URL 对应主机权限；若无则发起 `request`（需在用户手势上下文中调用才可能弹窗）。
 *
 * @param pageUrl 目标页面 URL
 * @returns 用户是否已授权（或原本已有权限）
 */
export async function ensureEffectiveHostPermission(pageUrl: URL): Promise<boolean> {
  if (await hasEffectiveHostPermission(pageUrl)) return true;
  return browser.permissions.request({
    origins: [originMatchPatternForUrl(pageUrl)],
  });
}

/**
 * 将 `chrome.cookies` 返回的 Cookie 转为项目内 `CookieData`。
 *
 * @param c Chrome Cookie 对象
 */
export function chromeCookieToCookieData(c: chrome.cookies.Cookie): CookieData {
  return {
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

/**
 * 查询当前窗口的活动标签页（需含 `url` 才可用于源站校验）。
 */
export async function queryActiveTabInCurrentWindow(): Promise<
  chrome.tabs.Tab | undefined
> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

/**
 * 校验「声明的源 URL」与当前标签页是否同主机，用于读 LS/SS 注入与读 Cookie 的一致性。
 *
 * @param sourceUrl 调用方声明的源地址
 * @param tabUrl 当前活动标签 `tab.url`
 * @returns 若不同主机则返回错误响应；一致则返回 `null`
 */
export function readSourceHostnameGuard(
  sourceUrl: string,
  tabUrl: string,
): { success: false; error: string } | null {
  const expectedUrl = new URL(sourceUrl);
  const currentUrl = new URL(tabUrl);
  if (expectedUrl.hostname !== currentUrl.hostname) {
    return {
      success: false,
      error: `请在源站点（${expectedUrl.hostname}）页面执行`,
    };
  }
  return null;
}

type StorageBatchResult = { ok: string[]; fail: string[] };

/**
 * 在指定标签页的 MAIN world 中批量写入 `localStorage` 或 `sessionStorage`。
 *
 * @param tabId 标签页 ID
 * @param entries 键值对列表
 * @param area 存储分区
 * @returns 成功与失败的 key 列表
 */
export async function executeStorageBatchWrite(
  tabId: number,
  entries: [string, string][],
  area: "local" | "session",
): Promise<StorageBatchResult> {
  if (entries.length === 0) {
    return { ok: [], fail: [] };
  }
  const res = await chrome.scripting.executeScript({
    target: { tabId },
    func: (payload: { entries: [string, string][]; area: "local" | "session" }) => {
      const store =
        payload.area === "local" ? window.localStorage : window.sessionStorage;
      const ok: string[] = [];
      const fail: string[] = [];
      for (const [k, v] of payload.entries) {
        try {
          store.setItem(k, v);
          ok.push(k);
        } catch {
          fail.push(k);
        }
      }
      return { ok, fail };
    },
    args: [{ entries, area }],
    world: "MAIN",
  });
  const raw = res?.[0]?.result as StorageBatchResult | undefined;
  return raw ?? { ok: [], fail: [] };
}

/**
 * 将多条 Cookie 写入浏览器（需已具备该 `targetUrl` 的主机权限）。
 *
 * @param targetUrl 写入时传给 `cookies.set` 的 URL
 * @param pageUrl 用于解析协议（决定默认 `secure`）
 * @param cookies 待写入的 Cookie 列表
 */
export async function setCookiesOnUrl(
  targetUrl: string,
  pageUrl: URL,
  cookies: CookieData[],
): Promise<{ successCount: number; errors: string[] }> {
  const errors: string[] = [];
  let successCount = 0;
  for (const cookie of cookies) {
    try {
      await browser.cookies.set({
        url: targetUrl,
        name: cookie.name,
        value: cookie.value,
        path: cookie.path || "/",
        secure: cookie.secure ?? pageUrl.protocol === "https:",
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
  return { successCount, errors };
}
