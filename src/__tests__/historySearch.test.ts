import { describe, expect, it } from "vitest";
import type { ReadHistoryRecord } from "../types";
import { matchesHistoryQuery } from "../utils/historySearch";

function makeRecord(staffName: string, staffCode = "1001"): ReadHistoryRecord {
  return {
    id: `${staffCode}-id`,
    staffName,
    staffCode,
    sourceUrl: "https://example.com",
    timestamp: Date.now(),
    items: [],
  };
}

describe("history search", () => {
  it("应支持姓名首字母搜索", () => {
    const record = makeRecord("张三");
    expect(matchesHistoryQuery(record, "zs")).toBe(true);
  });

  it("应继续支持姓名全拼搜索", () => {
    const record = makeRecord("张三");
    expect(matchesHistoryQuery(record, "zhangsan")).toBe(true);
  });
});
