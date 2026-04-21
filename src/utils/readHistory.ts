import type { ReadHistoryRecord } from "@/types";

/** 复合 id 分段符，避免与 URL 常见字符冲突 */
const READ_HISTORY_ID_SEP = "\u001f";

/**
 * 将页面完整 URL 规范为站点维度（主机 + 端口），用于读取历史去重。
 * 与 `new URL(href).host` 一致，忽略协议、path、query、hash。
 *
 * @param fullUrl 读取时的页面 URL
 * @returns 解析成功返回 host；失败时退回传入字符串（trim 后），避免中断写入流程
 */
export function normalizeReadHistoryHost(fullUrl: string): string {
  const s = fullUrl.trim();
  if (!s) return s;
  try {
    return new URL(s).host;
  } catch {
    return s;
  }
}

/**
 * 由页面 URL（按 host）和工号生成读取历史记录的稳定 id。
 *
 * @param fullUrl 读取时的页面完整 URL
 * @param staffCode 用户编号
 */
export function getReadHistoryRecordId(fullUrl: string, staffCode: string): string {
  return `${normalizeReadHistoryHost(fullUrl)}${READ_HISTORY_ID_SEP}${staffCode}`;
}

function isSameReadHistorySlot(a: ReadHistoryRecord, b: ReadHistoryRecord): boolean {
  return (
    normalizeReadHistoryHost(a.sourceUrl) === normalizeReadHistoryHost(b.sourceUrl) &&
    a.staffCode === b.staffCode
  );
}

/**
 * Insert a read record at the head: dedupe by **host(+port) + staffCode**, cap at `max`.
 */
export default function upsertReadHistory(
  history: ReadHistoryRecord[],
  record: ReadHistoryRecord,
  max: number = 100,
): ReadHistoryRecord[] {
  const normalized: ReadHistoryRecord = {
    ...record,
    id: getReadHistoryRecordId(record.sourceUrl, record.staffCode),
  };
  const next = [
    normalized,
    ...history.filter((h) => !isSameReadHistorySlot(h, normalized)),
  ];
  return next.slice(0, Math.max(0, max));
}
