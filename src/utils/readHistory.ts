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
 * 由页面 URL（按 host）和身份键生成读取历史记录的稳定 id。
 *
 * @param fullUrl 读取时的页面完整 URL
 * @param identityKey 用户编号；没有编号时可用用户名；都没有时用 host 兜底
 */
export function getReadHistoryRecordId(fullUrl: string, identityKey: string): string {
  const host = normalizeReadHistoryHost(fullUrl);
  return `${host}${READ_HISTORY_ID_SEP}${identityKey || host}`;
}

function getReadHistoryIdentityKey(record: ReadHistoryRecord): string {
  return record.staffCode || record.staffName || normalizeReadHistoryHost(record.sourceUrl);
}

function isSameReadHistorySlot(a: ReadHistoryRecord, b: ReadHistoryRecord): boolean {
  return (
    normalizeReadHistoryHost(a.sourceUrl) === normalizeReadHistoryHost(b.sourceUrl) &&
    getReadHistoryIdentityKey(a) === getReadHistoryIdentityKey(b)
  );
}

function normalizeReadHistoryRecord(record: ReadHistoryRecord): ReadHistoryRecord {
  return {
    ...record,
    id: getReadHistoryRecordId(record.sourceUrl, getReadHistoryIdentityKey(record)),
  };
}

/**
 * Insert a read record at the head: dedupe by **host(+port) + identity key**, cap at `max`.
 */
export default function upsertReadHistory(
  history: ReadHistoryRecord[],
  record: ReadHistoryRecord,
  max: number = 100,
): ReadHistoryRecord[] {
  const normalized = normalizeReadHistoryRecord(record);
  const next = [
    normalized,
    ...history
      .filter((h) => !isSameReadHistorySlot(h, normalized))
      .map(normalizeReadHistoryRecord),
  ];
  return next.slice(0, Math.max(0, max));
}
