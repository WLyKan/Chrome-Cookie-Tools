# Context Log

## [2026-07-30] wiki-init | Initial scaffold created

- Created `context/index.md`, `context/project.md`, `context/rules.md`, and `context/log.md`
- Initialized `context/specs/`, `context/changes/`, and `context/archive/changes/`
- Updated `AGENTS.md` with context/ navigation section

## [2026-08-21] write-flow-safety | 写入流程安全性调整

- 写入前增加 sessionStorage 全量清空，localStorage 与 sessionStorage 的清空失败互不影响
- 仅当待写数据包含 Cookie 时检查权限并清空 Cookie
- 写入成功 1 秒后刷新当前页面并关闭 Popup
- 写入相关按钮和历史项在 loading 期间禁用，防止重复写入
- 同步更新 `SPEC.md` 与 `docs/comet/specs/clear-before-write/spec.md` v1.1
