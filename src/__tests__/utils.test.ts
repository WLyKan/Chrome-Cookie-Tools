import { describe, it, expect } from "vitest";
import { objectToKeyValues } from "../utils";

describe("objectToKeyValues", () => {
  it("应该把对象转换为 key/value 数组", () => {
    const input = { a: "1", b: "2" };
    const result = objectToKeyValues(input);

    expect(result).toEqual([
      { key: "a", value: "1" },
      { key: "b", value: "2" },
    ]);
  });

  it("空对象应该返回空数组", () => {
    const result = objectToKeyValues({});
    expect(result).toEqual([]);
  });
});

