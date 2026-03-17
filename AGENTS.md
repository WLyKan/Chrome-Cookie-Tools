# Repository Guidelines

## 基础要求
- 总是使用中文回答。
- 使用 pnpm 包管理工具。

## 技术栈
- [WXT](https://wxt.dev) - A framework for building web extensions.
- [TypeScript](https://www.typescriptlang.org) - A superset of JavaScript with static typing.
- [React](https://reactjs.org) - A JavaScript library for building user interfaces.
- [Tailwind CSS](https://tailwindcss.com) - A utility-first CSS framework.
- [Shadcn UI](https://ui.shadcn.com) - A set of ready-to-use React components.

## Project Structure & Module Organization
- Source: `entrypoints/` (web extension entrypoints)
  - `background.ts`, `content/`, `popup/`, `options/`
- Shared code: `utils/` (e.g., `browser/`, `auth/`, `sync/`), `types/`
- Assets & static: `assets/`, `public/`, `docs/`
- Config: `wxt.config.ts`, `tailwind.config.js`, `tsconfig.json`
- Build output: `.output/` (e.g., `chrome-mv3/`, `firefox-mv2/`)
- Path aliases: use `@/` for project utils/types and `#imports` from WXT.
- 使用 `pnpm dlx shadcn@latest add [组件名]` 安装 shadcn 组件

## Build, Test, and Development Commands
- `pnpm dev` — Start Chrome dev build with hot reload.
- `pnpm dev:firefox` — Start Firefox dev build.
- `pnpm build` / `pnpm build:firefox` — Production builds.
- `pnpm zip` — Zip last build for store upload.
- `pnpm compile` — Type-check with TypeScript.
- Load locally (Chrome): open `chrome://extensions` → Load unpacked → `.output/chrome-mv3/`.

## Coding Style & Naming Conventions
- Language: TypeScript + React (functional components).
- Indentation: 2 spaces; use double quotes for strings; semicolons permitted.
- Files: libraries `.ts`; components `.tsx`. Component files in PascalCase; exports in camelCase.
- Imports: prefer path aliases (e.g., `@/utils/...`, `~/assets/tailwind.css`); group std/external/local.
- No ESLint/Prettier in repo; keep diffs small and consistent with nearby code.

## Testing Guidelines
- No formal test runner yet. Before PRs: `pnpm compile` must pass.
- Manual QA: verify `/p` selector in pages (content), options CRUD, category/pin/sort, Notion sync toggles.
- Confirm both Chrome and Firefox builds launch without console errors.

## Commit & Pull Request Guidelines
- Commits: Conventional-like style; emojis allowed (e.g., `✨ feat: ...`, `fix: ...`). Keep them small and focused; reference issues (`#123`) when relevant.
- PRs: include clear description, rationale, steps to reproduce/verify, screenshots/GIFs for UI changes, and mention affected entrypoints.

## Security & Configuration Tips
- Never commit secrets. Copy `.env.example` → `.env` and set: `WXT_CHROME_APP_CLIENT_ID_PREFIX`, `WXT_WEB_APP_CLIENT_ID_PREFIX`, `WXT_FIREFOX_EXTENSION_ID`.
- OAuth scopes and IDs are assembled in `wxt.config.ts`; keep published IDs stable.

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述（以 `SPEC.md` 为准）

**Storage Dev Tools** - 一个浏览器扩展，用于在开发环境之间传输 Cookie 或 LocalStorage 数据。

**核心功能：** 从源网站读取存储数据，写入到目标网站。支持两种存储类型：
- **Cookie 模式** - 使用 `chrome.cookies` API 读写 Cookie
- **LocalStorage 模式** - 使用 `chrome.scripting.executeScript` 读写页面的 LocalStorage

**技术栈：** WXT + React + TypeScript + Tailwind CSS + Shadcn UI

---

## 开发命令

```bash
# 安装依赖
pnpm install

# 启动开发服务器（Chrome）
pnpm dev

# Firefox 开发构建
pnpm dev:firefox

# 类型检查（PR 前必须通过）
pnpm compile

# 生产构建
pnpm build
pnpm build:firefox

# 打包扩展（用于上传到商店）
pnpm zip
```

**加载开发版本：** `chrome://extensions/` → 开发者模式 → 加载已解压的扩展程序 → 选择 `.output/chrome-mv3/`

**添加 Shadcn UI 组件：** `pnpm dlx shadcn@latest add [组件名]`

---

## 代码风格

- 总是使用中文回答和注释
- 2 空格缩进，双引号字符串
- 组件文件：PascalCase.tsx，导出名：camelCase
- 路径别名：`@/` 指向 `src/`
- 无 ESLint/Prettier，保持与周边代码一致的 diff 风格
- 使用 pnpm 包管理器
- 提交信息使用类约定式提交 + emoji（例如：`✨ feat: ...`）

---

## 架构概览

### 消息流转架构

```
Popup UI (React)
    ↓ browser.runtime.sendMessage()
Background Service Worker (background.ts)
    ↓ handleMessage()
    ├─ chrome.cookies API (Cookie 模式)
    └─ chrome.scripting.executeScript() (LocalStorage 模式)
    ↓ browser.storage.local.set() / .sync.set()
Popup UI ← Response
```

### 关键入口点

| 入口 | 位置 | 职责 |
|------|------|------|
| **Background Service Worker** | `src/entrypoints/background.ts` | 消息路由、Cookie/LocalStorage 读写、权限管理 |
| **Popup UI** | `src/entrypoints/popup/` | React 应用，包含「配置」和「操作」两个标签页 |
| **Content Script** | `src/entrypoints/content/index.ts` | 当前基本为空（功能已移至 background） |

### 消息类型（MessageType enum）

- `READ_COOKIES` - 读取源网站 Cookie（验证当前页 hostname 与源站一致）
- `WRITE_COOKIES` - 写入 Cookie 到当前标签页
- `READ_LOCALSTORAGE` - 使用 executeScript + MAIN world 读取页面 LocalStorage
- `WRITE_LOCALSTORAGE` - 使用 executeScript + MAIN world 写入页面 LocalStorage
- `GET_CONFIG` / `SAVE_CONFIG` - 配置管理（存于 `browser.storage.sync`）

### 存储策略

- **读取结果** (`lastReadCookies`, `lastReadLocalStorage`) - `browser.storage.local`（本地缓存）
- **配置历史** (`configHistory`) - `browser.storage.local`（本地存储，最近 10 条）
- **配置数据** (`config`) - `browser.storage.sync`（跨设备同步）

---

## 重要实现细节

### Cookie 读取验证
`handleReadCookies` 会验证当前标签页的 hostname 与源站 URL 的 hostname 一致，否则报错提示用户在正确的页面执行操作。

### LocalStorage 访问方式
LocalStorage 读写使用 `chrome.scripting.executeScript` 配合 `world: 'MAIN'`，因为 content script 运行在隔离的世界中无法访问页面的 LocalStorage。

### 开发环境标识
开发模式下扩展图标会显示 "DEV" 徽标（黄色背景）。

### 权限请求
Cookie 操作需要动态请求 `permissions` 和 `origins`，代码中使用 `browser.permissions.contains()` 检查，缺少权限时调用 `browser.permissions.request()` 请求用户授权。

### 类型系统
所有类型定义集中在 `src/types.ts`：
- `CookieData` - Cookie 结构
- `LocalStorageData` - { key, value } 结构
- `StorageConfig` - 存储配置（`storageKeys`, `storageType`, `updatedAt`）
- `MessageRequest<T>` / `MessageResponse<T>` - 消息契约

**注意：** 保留了对旧字段 `cookieNames` 的向后兼容支持，新代码应使用 `storageKeys`。

---

## 关键文件路径

```
src/entrypoints/background.ts       # Service Worker，核心消息处理
src/entrypoints/popup/App.tsx       # Popup 主组件
src/entrypoints/popup/ConfigTab.tsx # 配置管理 UI
src/entrypoints/popup/OperationTab.tsx # 读写操作 UI
src/types.ts                        # 所有 TypeScript 类型定义
wxt.config.ts                       # WXT 框架配置（权限、manifest）
```

---

## 测试指南

无自动化测试，手动 QA 参考以下文件：
- `test-checklist.md` - 完整功能测试清单
- `test-instructions.md` - 测试步骤说明

**PR 前必须执行：** `pnpm compile`（类型检查）
