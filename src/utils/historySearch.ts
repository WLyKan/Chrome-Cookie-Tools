import { pinyin } from "pinyin-pro";
import type { ReadHistoryRecord } from "@/types";

function normalizeSearchText(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, "");
}

function getNamePinyin(name: string): string {
  try {
    return normalizeSearchText(pinyin(name, { toneType: "none" }));
  } catch {
    return "";
  }
}

function getNamePinyinInitials(name: string): string {
  try {
    return normalizeSearchText(pinyin(name, { pattern: "first", toneType: "none" }));
  } catch {
    return "";
  }
}

/**
 * 判断历史记录是否匹配搜索词，支持工号、姓名、姓名全拼、姓名首字母。
 */
export function matchesHistoryQuery(record: ReadHistoryRecord, query: string): boolean {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return true;
  const staffCode = normalizeSearchText(record.staffCode);
  const staffName = normalizeSearchText(record.staffName);
  const staffNamePinyin = getNamePinyin(record.staffName);
  const staffNameInitials = getNamePinyinInitials(record.staffName);
  return (
    staffCode.includes(normalizedQuery) ||
    staffName.includes(normalizedQuery) ||
    staffNamePinyin.includes(normalizedQuery) ||
    staffNameInitials.includes(normalizedQuery)
  );
}
