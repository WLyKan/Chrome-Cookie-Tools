import { afterEach, describe, expect, it, vi } from "vitest";
import {
  scheduleWriteSuccessEffects,
  WRITE_STORAGE_AREAS,
} from "../utils/writeFlow";

describe("write flow", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("写入前始终清空 localStorage 和 sessionStorage", () => {
    expect(WRITE_STORAGE_AREAS).toEqual(["local", "session"]);
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
