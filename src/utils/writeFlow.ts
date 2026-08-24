import type { UnifiedStorageItem } from "@/types";

const WRITE_STORAGE_AREAS = ["local", "session"] as const;

export const WRITE_SUCCESS_DELAY_MS = 1000;

export interface WriteClearPlan {
  storageAreas: typeof WRITE_STORAGE_AREAS;
  clearCookies: boolean;
}

export interface WriteSuccessEffects {
  reload: () => void;
  close: () => void;
}

/**
 * 生成统一写入前的清空计划：页面存储始终全量清空，Cookie 仅在确有 Cookie 待写时处理。
 */
export function buildWriteClearPlan(items: UnifiedStorageItem[]): WriteClearPlan {
  return {
    storageAreas: WRITE_STORAGE_AREAS,
    clearCookies: items.some(
      (item) => item.source === "cookie" && Boolean(item.cookieData),
    ),
  };
}

/**
 * 写入成功后延迟刷新当前页面，再关闭 Popup。
 */
export function scheduleWriteSuccessEffects(
  effects: WriteSuccessEffects,
): ReturnType<typeof setTimeout> {
  return setTimeout(() => {
    effects.reload();
    effects.close();
  }, WRITE_SUCCESS_DELAY_MS);
}
