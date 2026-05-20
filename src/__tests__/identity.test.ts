import { describe, expect, it } from "vitest";
import {
  applyUsernameCookieFallback,
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

  it("用户名和工号应可从 personInfo 中独立提取", () => {
    expect(extractIdentityFromPersonInfoRaw(JSON.stringify({ userName: "吴迪" }))).toEqual({
      staffCode: "",
      staffName: "吴迪",
    });
    expect(extractIdentityFromPersonInfoRaw(JSON.stringify({ staffCode: "4004" }))).toEqual({
      staffCode: "4004",
      staffName: "",
    });
  });

  it("用户名和工号应可从读取项中独立提取", () => {
    expect(extractIdentityFromStorageItems([
      { key: "username", value: "赵六", source: "cookie" },
    ])).toEqual({
      staffCode: "",
      staffName: "赵六",
    });
    expect(extractIdentityFromStorageItems([
      { key: "staffCode", value: "5005", source: "localStorage" },
    ])).toEqual({
      staffCode: "5005",
      staffName: "",
    });
  });

  it("已有工号但用户名缺失时应使用 username Cookie 兜底", () => {
    expect(
      applyUsernameCookieFallback(
        { staffCode: "4004", staffName: "4004" },
        "%E8%B5%B5%E5%85%AD",
      ),
    ).toEqual({
      staffCode: "4004",
      staffName: "赵六",
    });
  });

  it("没有工号时也应可使用 username Cookie 生成用户名身份", () => {
    expect(applyUsernameCookieFallback(null, "吴迪")).toEqual({
      staffCode: "",
      staffName: "吴迪",
    });
  });

  it("已有用户名时不应被 username Cookie 覆盖", () => {
    expect(
      applyUsernameCookieFallback(
        { staffCode: "5005", staffName: "孙七" },
        "赵六",
      ),
    ).toEqual({
      staffCode: "5005",
      staffName: "孙七",
    });
  });
});
