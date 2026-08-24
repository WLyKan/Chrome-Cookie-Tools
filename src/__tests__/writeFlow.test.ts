import { afterEach, describe, expect, it, vi } from "vitest";
import type { UnifiedStorageItem } from "../types";
import {
  buildWriteClearPlan,
  scheduleWriteSuccessEffects,
} from "../utils/writeFlow";

describe("write flow", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("写入前始终清空 localStorage 和 sessionStorage", () => {
    const items: UnifiedStorageItem[] = [
      { source: "localStorage", key: "token", value: "value" },
    ];

    expect(buildWriteClearPlan(items).storageAreas).toEqual(["local", "session"]);
  });

  it("仅当待写数据包含有效 Cookie 项时清空 Cookie", () => {
    const storageItems: UnifiedStorageItem[] = [
      { source: "localStorage", key: "token", value: "local" },
      { source: "sessionStorage", key: "ticket", value: "session" },
    ];
    const cookieItems: UnifiedStorageItem[] = [
      ...storageItems,
      {
        source: "cookie",
        key: "JSESSIONID",
        value: "cookie",
        cookieData: { name: "JSESSIONID", value: "cookie" },
      },
    ];

    expect(buildWriteClearPlan(storageItems).clearCookies).toBe(false);
    expect(buildWriteClearPlan(cookieItems).clearCookies).toBe(true);
  });

  it("写入成功 1 秒后才刷新页面并关闭 Popup", () => {
    vi.useFakeTimers();
    const reload = vi.fn();
    const close = vi.fn();

    scheduleWriteSuccessEffects({ reload, close });

    vi.advanceTimersByTime(999);
    expect(reload).not.toHaveBeenCalled();
    expect(close).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(reload).toHaveBeenCalledOnce();
    expect(close).toHaveBeenCalledOnce();
    expect(reload.mock.invocationCallOrder[0]).toBeLessThan(
      close.mock.invocationCallOrder[0],
    );
  });
});
