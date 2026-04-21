import { describe, expect, it } from "vitest";
import {
  extractIdentityFromPersonInfoRaw,
  extractIdentityFromStorageItems,
} from "../utils/identity";

describe("identity utils", () => {
  it("应从标准 personInfo 结构提取身份", () => {
    const raw = JSON.stringify({
      staffCode: "1001",
      staffName: "张三",
    });

    expect(extractIdentityFromPersonInfoRaw(raw)).toEqual({
      staffCode: "1001",
      staffName: "张三",
    });
  });

  it("应从嵌套 personInfo 结构提取身份", () => {
    const raw = JSON.stringify({
      data: {
        user: {
          userCode: 2002,
          userName: "李四",
        },
      },
    });

    expect(extractIdentityFromPersonInfoRaw(raw)).toEqual({
      staffCode: "2002",
      staffName: "李四",
    });
  });

  it("personInfo 缺失时应可从读取项兜底提取", () => {
    const identity = extractIdentityFromStorageItems([
      { key: "token", value: "abc", source: "localStorage" },
      { key: "staffCode", value: "3003", source: "localStorage" },
      { key: "staffName", value: "王五", source: "localStorage" },
    ]);

    expect(identity).toEqual({
      staffCode: "3003",
      staffName: "王五",
    });
  });
});
