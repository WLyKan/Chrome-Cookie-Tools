# Project Context

## Project Positioning

**Storage Dev Tools** 是一个面向开发者的 Chrome 浏览器扩展插件，用于在开发环境之间快速传输 Cookie 或 LocalStorage 数据。

- **阶段**: 已完成核心功能实现，进入优化改进阶段
- **核心价值**: 解决开发/测试/生产环境之间的数据同步问题，简化调试流程

## Core Users

- 前端开发者
- 测试工程师
- 需要跨环境调试的技术人员

## Core Workflows

1. 用户在源页面打开插件，选择或创建配置（指定要读取的 key）
2. 点击"读取"按钮，从当前标签页读取 Cookie/LocalStorage 数据
3. 切换到目标标签页，点击"写入"按钮
4. 查看操作结果，确认数据同步成功

## Current Scope

- Cookie 读写（保留完整属性：Domain、Path、Expires、Secure、SameSite）
- LocalStorage 读写（通过 `chrome.scripting.executeScript` + `world: "MAIN"`）
- 配置管理（保存最近 10 条历史，支持快速恢复）
- 浅色/暗色主题支持

## Current Non-Goals

- SessionStorage / IndexedDB 支持（未来版本考虑）
- 数据加密存储
- 团队配置共享

## Architecture Overview

```
src/
├── entrypoints/
│   ├── background.ts          # Service Worker：消息路由、Cookie/LocalStorage 读写
│   ├── popup/                 # Popup React 应用
│   │   ├── App.tsx           # 入口和 Tab 布局
│   │   ├── ConfigTab.tsx     # 配置管理 UI
│   │   └── OperationTab.tsx  # 读写操作 UI
│   └── content/index.ts      # Content Script（目前逻辑较少）
├── types.ts                   # 核心类型定义
├── components/ui/             # Shadcn UI 组件
└── lib/utils.ts               # 工具函数
```

**消息流架构**:
Popup UI → `browser.runtime.sendMessage()` → Background Service Worker → `chrome.scripting.executeScript()` → Web Pages

## Tech Stack

| 技术 | 版本 | 用途 |
|------|------|------|
| WXT | 0.20.11 | Web 扩展开发框架 |
| React | 19.1.1 | UI 框架 |
| TypeScript | 5.9.2 | 类型安全 |
| Tailwind CSS | 4.1.17 | 样式框架 |
| Shadcn UI | Latest | 组件库 |
| Lucide React | 0.554.0 | 图标库 |

## Engineering Assumptions

- 使用 `pnpm` 作为包管理器
- 路径别名 `@/` 指向 `src/`
- 逻辑组件/库使用 `.ts`，React 组件使用 `.tsx`
- 组件文件名 PascalCase，导出使用 camelCase
- 无 ESLint/Prettier，保持与周边代码一致，尽量小 diff
- 提交前必须通过 `pnpm compile` 类型检查
