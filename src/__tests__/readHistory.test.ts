import { describe, it, expect } from "vitest";
import type { ReadHistoryRecord } from "../types";
import { upsertReadHistory } from "../utils";

function makeRecord(id: string, ts: number): ReadHistoryRecord {
  return {
    id,
    staffName: `name-${id}`,
    staffCode: id,
    sourceUrl: "https://example.com",
    timestamp: ts,
    items: [{ key: "k", value: "v", source: "localStorage" }],
  };
}

describe("upsertReadHistory", () => {
  it("应该按 id 去重并置顶", () => {
    const a1 = makeRecord("A", 1);
    const b1 = makeRecord("B", 2);
    const a2 = makeRecord("A", 3);

    const history = [a1, b1];
    const next = upsertReadHistory(history, a2, 10);

    expect(next.map((r) => r.id)).toEqual(["A", "B"]);
    expect(next[0].timestamp).toBe(3);
  });

  it("应该只保留最近 max 条", () => {
    const history: ReadHistoryRecord[] = [];
    for (let i = 0; i < 12; i++) history.push(makeRecord(String(i), i));

    const next = upsertReadHistory(history, makeRecord("X", 999), 10);
    expect(next).toHaveLength(10);
    expect(next[0].id).toBe("X");
  });
});

