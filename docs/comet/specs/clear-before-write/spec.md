# Clear Before Write 规范

## 行为描述

写入数据时，自动清空目标站点的全部 localStorage 和 Cookie，确保目标站点状态与源站点完全一致。

## 触发条件

当用户执行以下操作时触发清空：
- 点击"写入数据"按钮
- 通过历史记录写入数据

## 清空范围

### localStorage
- 清空目标站点的全部 localStorage 数据
- 使用 `store.clear()` 方法清空

### Cookie
- 清空目标站点同域的全部 Cookie
- 使用 `browser.cookies.getAll({ url })` 获取所有 Cookie
- 逐个调用 `browser.cookies.remove()` 删除

## 执行顺序

1. 清空目标站点的 localStorage（如有待写入的 localStorage 数据）
2. 清空目标站点的 Cookie（如有待写入的 Cookie 数据）
3. 执行写入操作

## 错误处理

- 清空失败不应阻止写入操作
- 清空失败时降级为覆盖模式（现有行为）
- 清空失败记录到控制台日志，不影响用户界面提示

## 不变规则

- 清空操作在写入前自动执行
- 不提供用户选项控制清空行为
- 不清空 sessionStorage
- 不改变读取逻辑
