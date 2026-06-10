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
 * @param storageKeys 本次读取使用的 storageKeys 配置；排序后拼入 id
 */
export function getReadHistoryRecordId(
  fullUrl: string,
  identityKey: string,
  storageKeys: string[] = [],
): string {
  const host = normalizeReadHistoryHost(fullUrl);
  const sortedKeys = [...storageKeys].sort().join(",");
  return `${host}${READ_HISTORY_ID_SEP}${identityKey || host}${READ_HISTORY_ID_SEP}${sortedKeys}`;
}

function getReadHistoryIdentityKey(record: ReadHistoryRecord): string {
  return record.staffCode || record.staffName || normalizeReadHistoryHost(record.sourceUrl);
}

/** 从 record 的 storageKeys 字段或 items 推导出排序后的 key 集合 */
function deriveStorageKeys(record: ReadHistoryRecord): string[] {
  if (record.storageKeys && record.storageKeys.length > 0) {
    return [...record.storageKeys].sort();
  }
  return record.items.map((i) => i.key).sort();
}

/** 比较两个 storageKeys 集合是否等价（排序后逐项比较） */
function isSameStorageKeySet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((k, i) => k === b[i]);
}

function isSameReadHistorySlot(a: ReadHistoryRecord, b: ReadHistoryRecord): boolean {
  const sameHost = normalizeReadHistoryHost(a.sourceUrl) === normalizeReadHistoryHost(b.sourceUrl);
  const sameIdentity = getReadHistoryIdentityKey(a) === getReadHistoryIdentityKey(b);
  if (!sameHost || !sameIdentity) return false;

  // 一方无 storageKeys 时视为通配（向后兼容旧记录）
  const aKeys = a.storageKeys;
  const bKeys = b.storageKeys;
  if (!aKeys || !bKeys) return true;

  return isSameStorageKeySet([...aKeys].sort(), [...bKeys].sort());
}

function normalizeReadHistoryRecord(record: ReadHistoryRecord): ReadHistoryRecord {
  const keys = deriveStorageKeys(record);
  return {
    ...record,
    storageKeys: record.storageKeys ?? record.items.map((i) => i.key),
    id: getReadHistoryRecordId(record.sourceUrl, getReadHistoryIdentityKey(record), keys),
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
