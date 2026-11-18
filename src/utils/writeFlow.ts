export const WRITE_STORAGE_AREAS = ["local", "session"] as const;

export const WRITE_SUCCESS_DELAY_MS = 1000;

export interface WriteSuccessEffects {
  reload: () => void;
  close: () => void;
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
