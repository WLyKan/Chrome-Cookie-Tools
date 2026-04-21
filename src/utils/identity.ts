import type { UnifiedStorageItem } from "@/types";

export interface UserIdentity {
  staffCode: string;
  staffName: string;
}

const STAFF_CODE_KEYS = [
  "staffCode",
  "staffNo",
  "employeeCode",
  "empCode",
  "userCode",
  "account",
  "uid",
  "userId",
  "id",
];

const STAFF_NAME_KEYS = [
  "staffName",
  "userName",
  "username",
  "employeeName",
  "name",
  "realName",
  "nickName",
];

const NESTED_KEYS = ["data", "user", "result", "profile", "employee", "staff", "accountInfo"];

function normalizeIdentityValue(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "";
}

function findByKeys(target: Record<string, unknown>, candidates: string[]): string {
  for (const key of candidates) {
    const value = normalizeIdentityValue(target[key]);
    if (value) return value;
  }
  return "";
}

function parseJsonObject(value: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function collectCandidateObjects(root: Record<string, unknown>): Record<string, unknown>[] {
  const visited = new Set<Record<string, unknown>>();
  const queue: Record<string, unknown>[] = [root];
  const candidates: Record<string, unknown>[] = [];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || visited.has(current)) continue;
    visited.add(current);
    candidates.push(current);

    for (const nestedKey of NESTED_KEYS) {
      const nested = current[nestedKey];
      if (nested && typeof nested === "object" && !Array.isArray(nested)) {
        queue.push(nested as Record<string, unknown>);
      }
    }
  }

  return candidates;
}

/**
 * 从 localStorage 的 personInfo 原始字符串中提取用户标识。
 */
export function extractIdentityFromPersonInfoRaw(personInfoRaw: string): UserIdentity | null {
  const trimmedRaw = personInfoRaw.trim();
  if (!trimmedRaw) return null;

  const root = parseJsonObject(trimmedRaw);
  if (!root) return null;

  const objects = collectCandidateObjects(root);
  for (const obj of objects) {
    const staffCode = findByKeys(obj, STAFF_CODE_KEYS);
    if (!staffCode) continue;
    const staffName = findByKeys(obj, STAFF_NAME_KEYS) || staffCode;
    return { staffCode, staffName };
  }

  return null;
}

/**
 * 兜底：当 personInfo 不可用时，尝试从已读取的存储项里提取用户标识。
 */
export function extractIdentityFromStorageItems(items: UnifiedStorageItem[]): UserIdentity | null {
  const map = new Map<string, string>();
  for (const item of items) {
    if (!item.key) continue;
    map.set(item.key.toLowerCase(), item.value);
  }

  let staffCode = "";
  for (const key of STAFF_CODE_KEYS) {
    const value = normalizeIdentityValue(map.get(key.toLowerCase()));
    if (value) {
      staffCode = value;
      break;
    }
  }
  if (!staffCode) return null;

  let staffName = "";
  for (const key of STAFF_NAME_KEYS) {
    const value = normalizeIdentityValue(map.get(key.toLowerCase()));
    if (value) {
      staffName = value;
      break;
    }
  }

  return {
    staffCode,
    staffName: staffName || staffCode,
  };
}
