import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CookieData } from "../types";
import { setCookiesOnUrl } from "../utils/extension-storage-helpers";

const cookie: CookieData = {
  name: "JSESSIONID",
  value: "test-session",
  domain: "source.example.test",
  path: "/app",
  httpOnly: true,
  secure: true,
  sameSite: "no_restriction",
};

describe("Cookie 写入", () => {
  const set = vi.fn();
  const getAll = vi.fn();

  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubGlobal("browser", { cookies: { set, getAll } });
    set.mockResolvedValue({ storeId: "1" });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it.each([
    ["http:", true, "no_restriction", false, "lax"],
    ["http:", true, "strict", false, "strict"],
    ["https:", false, "no_restriction", true, "no_restriction"],
    ["https:", false, "unspecified", false, "unspecified"],
    ["https:", undefined, undefined, true, "lax"],
  ] as const)(
    "%s 适配 Secure=%s、SameSite=%s 并回读",
    async (protocol, previousSecure, previousSameSite, secure, sameSite) => {
      const url = new URL(`${protocol}//target.example.test:8080/other`);
      const historical = {
        ...cookie,
        secure: previousSecure,
        sameSite: previousSameSite,
      };
      getAll.mockResolvedValue([
        { ...cookie, domain: url.hostname, hostOnly: true, secure, sameSite },
      ]);

      expect(await setCookiesOnUrl(url, [historical])).toEqual({
        successCount: 1,
        errors: [],
      });
      expect(set).toHaveBeenCalledWith({
        url: url.href,
        name: cookie.name,
        value: cookie.value,
        path: "/app",
        httpOnly: true,
        secure,
        sameSite,
        expirationDate: undefined,
      });
      expect(getAll).toHaveBeenCalledWith({
        domain: url.hostname,
        name: cookie.name,
        path: "/app",
        storeId: "1",
      });
      expect(historical.secure).toBe(previousSecure);
      expect(historical.sameSite).toBe(previousSameSite);
    },
  );

  it("回读只匹配目标主机和路径，并继续处理后续 Cookie", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const url = new URL("https://target.example.test/");
    const saved = { ...cookie, domain: url.hostname, hostOnly: true };
    getAll
      .mockResolvedValueOnce([
        { ...saved, domain: `.${url.hostname}`, hostOnly: false },
        { ...saved, path: "/" },
        { ...saved, value: "old-session" },
      ])
      .mockResolvedValueOnce([{ ...saved, name: "another-cookie" }]);

    expect(
      await setCookiesOnUrl(url, [cookie, { ...cookie, name: "another-cookie" }]),
    ).toEqual({
      successCount: 1,
      errors: ["JSESSIONID: 写入后回读未找到匹配的 Cookie"],
    });
  });

  it("写入接口没有返回 Cookie 时，仍以独立回读结果为准", async () => {
    const url = new URL("https://target.example.test/other");
    set.mockResolvedValue(undefined);
    getAll.mockResolvedValue([
      { ...cookie, domain: url.hostname, hostOnly: true },
    ]);

    expect(await setCookiesOnUrl(url, [cookie])).toEqual({
      successCount: 1,
      errors: [],
    });
  });

  it("过期记录在调用浏览器写入接口前报错", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const url = new URL("https://target.example.test/");

    expect(await setCookiesOnUrl(url, [{ ...cookie, expirationDate: 1 }])).toEqual({
      successCount: 0,
      errors: ["JSESSIONID: 历史 Cookie 已过期，请重新读取"],
    });
    expect(set).not.toHaveBeenCalled();
    expect(getAll).not.toHaveBeenCalled();
  });
});
