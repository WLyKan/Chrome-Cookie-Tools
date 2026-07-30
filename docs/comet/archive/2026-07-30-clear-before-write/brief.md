# Outcome

写入数据时，先清空目标站点的全部 localStorage 和 Cookie，确保目标站点状态与源站点完全一致，避免旧数据残留导致后端接口异常（如注销登录状态）。

# Scope

- 写入 Cookie 前，清空目标站点同域的全部 Cookie
- 写入 localStorage 前，清空目标站点的全部 localStorage
- 清空操作在写入前自动执行，无需用户手动触发

# Non-goals

- 不清空 sessionStorage（用户未提及）
- 不提供"只清空指定 key"的选项（用户明确选择清空所有）
- 不改变读取逻辑

# Acceptance examples

1. **写入前清空**
   - 触发：用户点击"写入数据"按钮
   - 前置：自动清空目标站点的全部 localStorage 和同域 Cookie
   - 结果：写入新数据，目标站点无旧数据残留

# Constraints and invariants

- 清空操作必须在写入前完成
- 清空失败不应阻止写入（降级为覆盖模式）
- 保留现有的错误处理和 toast 提示

# Decisions

- [x] 清空范围：清空所有数据（用户明确选择，场景：避免旧数据导致后端注销登录）
- [x] 清空方式：写入前自动清空，无需用户选择
- [x] SessionStorage：暂不处理（用户未提及）

# Open questions

- CONFIRM: 写入数据时自动清空目标站点的全部 localStorage 和 Cookie

# Verification expectations

- 在目标站点写入数据后，检查旧 Cookie 和 localStorage 已被清除
- 验证写入的新数据与源站点一致
