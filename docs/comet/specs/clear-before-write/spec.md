# Clear Before Write 规范

**版本：** 1.1
**更新日期：** 2026-08-21

## 行为描述

写入数据时，自动清空目标站点的全部 localStorage 和 sessionStorage；仅当待写数据包含 Cookie 时清空目标站点 Cookie，确保页面存储状态一致，同时避免无 Cookie 写入场景触发不必要的站点权限申请。

## 触发条件

当用户执行以下操作时触发清空：
- 点击"写入数据"按钮
- 通过历史记录写入数据

## 清空范围

### localStorage
- 清空目标站点的全部 localStorage 数据
- 使用 `store.clear()` 方法清空

### sessionStorage
- 清空目标标签页的全部 sessionStorage 数据
- 使用 `store.clear()` 方法清空

### Cookie
- 仅当待写数据包含有效 Cookie 项时执行
- 清空目标站点同域的全部 Cookie
- 使用 `browser.cookies.getAll({ url })` 获取所有 Cookie
- 逐个调用 `browser.cookies.remove()` 删除
- 待写数据只有 localStorage/sessionStorage 时，不检查或申请 Cookie 主机权限

## 执行顺序

1. 清空目标站点的 localStorage
2. 清空目标标签页的 sessionStorage
3. 如待写数据包含 Cookie，检查主机权限并清空目标站点 Cookie
4. 执行写入操作
5. 写入成功 1 秒后刷新目标标签页并关闭 Popup

## 错误处理

- localStorage、sessionStorage、Cookie 的清空相互独立；单项失败仍继续尝试其余清空项
- 清空失败不应阻止写入操作
- 清空失败时降级为覆盖模式（现有行为）
- 清空失败记录到控制台日志，不影响用户界面提示

## 不变规则

- 清空操作在写入前自动执行
- 不提供用户选项控制清空行为
- 不改变读取逻辑
- 写入请求进行中以及成功后的 1 秒等待期间，写入按钮和历史写入项保持禁用，避免重复提交

## 更新记录

- 2026-08-21 / v1.1：增加 sessionStorage 全量清空；Cookie 改为按待写数据条件清空；页面刷新延迟到写入成功 1 秒后；写入相关按钮增加 loading 禁用。
