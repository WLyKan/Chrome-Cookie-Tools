import { describe, it, expect } from "vitest";
import type { ReadHistoryRecord } from "../types";
import upsertReadHistory, { getReadHistoryRecordId } from "../utils/readHistory";

function makeRecord(
  staffCode: string,
  ts: number,
  sourceUrl: string = "https://example.com/path",
): ReadHistoryRecord {
  return {
    id: getReadHistoryRecordId(sourceUrl, staffCode),
    staffName: `name-${staffCode}`,
    staffCode,
    sourceUrl,
    timestamp: ts,
    items: [{ key: "k", value: "v", source: "localStorage" }],
  };
}

describe("upsertReadHistory", () => {
  it("应按 origin+工号去重并置顶", () => {
    const a1 = makeRecord("A", 1, "https://example.com/foo");
    const b1 = makeRecord("B", 2, "https://example.com/foo");
    const a2 = makeRecord("A", 3, "https://example.com/bar#/hash");

    const history = [a1, b1];
    const next = upsertReadHistory(history, a2, 10);

    expect(next).toHaveLength(2);
    expect(next[0].sourceUrl).toBe("https://example.com/bar#/hash");
    expect(next[0].timestamp).toBe(3);
    expect(next.map((r) => r.staffCode)).toEqual(["A", "B"]);
  });

  it("同工号、不同 origin 应保留多条", () => {
    const onA = makeRecord("same", 1, "https://a.example.com/");
    const onB = makeRecord("same", 2, "https://b.example.com/");
    const next = upsertReadHistory([onA], onB, 10);
    expect(next).toHaveLength(2);
    expect(next[0].sourceUrl).toBe("https://b.example.com/");
    expect(next[0].timestamp).toBe(2);
    expect(next[1].sourceUrl).toBe("https://a.example.com/");
  });

  it("应该只保留最近 max 条", () => {
    const history: ReadHistoryRecord[] = [];
    for (let i = 0; i < 12; i++) {
      history.push(makeRecord(String(i), i, `https://host-${i}.test/`));
    }

    const next = upsertReadHistory(history, makeRecord("X", 999, "https://host-x.test/"), 10);
    expect(next).toHaveLength(10);
    expect(next[0].staffCode).toBe("X");
    expect(next[0].id).toBe(getReadHistoryRecordId("https://host-x.test/", "X"));
  });
});
