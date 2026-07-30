# Agent Rules

## General Rules

- 语言：回答与注释一律使用中文
- 新工作从 `context/changes/<slug>/` 开始
- 使用 `solution.md` 进行技术实现设计
- 保持 `context/specs/` 作为稳定的行为源
- 保持 `context/changes/` 仅用于活跃工作
- 保持 `AGENTS.md` 作为导航和协作指导，不要复制演化中的项目细节

## Default Workflow

1. 在 `context/changes/<slug>/request.md` 下捕获需求
2. 编写或优化 `solution.md`
3. 对于非简单工作，编写 `tasks.md` 和任务文件
4. 将稳定的行为变更同步回 `context/specs/`
5. 在 `context/log.md` 中追加重要里程碑
6. 将已完成的变更归档到 `context/archive/changes/`

## Project Execution Rules

- 除非用户要求，否则不要重启本地服务
- 使用 `pnpm` 进行包管理和运行命令
- 编辑代码前先阅读相关稳定规范和当前变更文档
- 需要新增能力时，优先复用现有模块（background.ts、popup/、types.ts）
- 提交前必须通过 `pnpm compile` 类型检查

## Decomposition Rules

- 一个任务应该有一个主导目标
- 每个任务应该明确涉及的文件、验证方式和完成标准
- 非简单变更应该有审查笔记
- 当行为或运行规则发生变化时更新 context 文档

## Storage & Permission Rules

- 配置与缓存位置：
  - 读取结果 → `browser.storage.local`
  - 配置历史（最近 10 条）→ `browser.storage.local`
  - 当前配置 → `browser.storage.sync`（跨设备同步）
- 旧字段 `cookieNames` 仍需兼容，新逻辑使用 `storageKeys`
- Cookie 域名校验：当前标签页 hostname 必须匹配配置中的源站 hostname
- LocalStorage 访问：必须通过 `chrome.scripting.executeScript` + `world: "MAIN"`
- 权限请求：操作前检查权限，不足时使用 `browser.permissions.request()` 申请
