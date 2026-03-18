import type { ReadHistoryRecord } from "@/types";

/**
 * 将一条读取记录插入历史（按 id 去重并置顶），并限制最多保留 max 条。
 */
export default function upsertReadHistory(
  history: ReadHistoryRecord[],
  record: ReadHistoryRecord,
  max: number = 10,
): ReadHistoryRecord[] {
  const next = [record, ...history.filter((h) => h.id !== record.id)];
  return next.slice(0, Math.max(0, max));
}

