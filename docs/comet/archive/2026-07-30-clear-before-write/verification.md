# Acceptance evidence

<!-- comet-native:acceptance-evidence:start -->
[
  {
    "acceptance_id": "acceptance-38a403f2b03648d6c6ae2516db268d8c25009fb9d82ae4ed5ad171e80e04f802",
    "evidence_refs": [
      "src/entrypoints/background.ts",
      "src/utils/extension-storage-helpers.ts"
    ]
  },
  {
    "acceptance_id": "acceptance-5d9a4ed4d64c27c03c5c1e727a370cf92ccad98ee581289f869ab155dd855770",
    "evidence_refs": [
      "src/entrypoints/background.ts"
    ]
  },
  {
    "acceptance_id": "acceptance-ee53e9775450a27df226a612b7fbe4efdf0a6aa63da11617f13ae85d5a683445",
    "evidence_refs": [
      "src/entrypoints/background.ts",
      "src/utils/extension-storage-helpers.ts"
    ]
  }
]
<!-- comet-native:acceptance-evidence:end -->

# Commands and results

1. **代码审查**
   - 检查 `src/utils/extension-storage-helpers.ts` 中新增的 `executeStorageClearAll` 和 `removeAllCookiesOnUrl` 函数
   - 检查 `src/entrypoints/background.ts` 中 `handleWriteStorage` 函数的修改
   - 结果：代码逻辑正确，清空操作在写入前执行

2. **类型检查**
   - 运行 `npx tsc --noEmit`
   - 结果：仅有预先存在的 chrome 命名空间错误（项目已知问题），无新增错误

3. **内置检查**
   - 运行 `comet native check clear-before-write`
   - 结果：通过，生成 receipt `ac39341b081f504d7489d1c1b4b7910a3e2046abea1dcffb70139d6e4df9c1f2.json`

# Skipped checks

- 无跳过的检查

# Spec consistency

- 实现与 `specs/clear-before-write/spec.md` 一致
- 清空范围：全部 localStorage 和同域 Cookie
- 清空时机：写入前自动执行
- 错误处理：清空失败不阻止写入

# Known limitations and risks

1. **性能影响**：清空全部 Cookie 需要先获取所有 Cookie 列表，可能对 Cookie 数量较多的站点有轻微性能影响
2. **sessionStorage**：当前实现不处理 sessionStorage（用户未提及）

# Conclusion

实现符合规范要求。写入数据前会自动清空目标站点的全部 localStorage 和 Cookie，避免旧数据残留导致后端接口异常。清空失败时降级为覆盖模式，不影响正常写入流程。
