// 把对象数组kv对象数组
export function objectToKeyValues(obj: Record<string, string>) {
  return Object.keys(obj).map((key) => ({ key, value: obj[key] }));
}

export { default as upsertReadHistory } from "./readHistory";
