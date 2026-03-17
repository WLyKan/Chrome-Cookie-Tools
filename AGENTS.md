## Storage Dev Tools - AI 使用说明

> 详细产品需求与交互以 `SPEC.md` 为准，本文件只保留对 AI 编码最关键的摘要，避免重复和 token 浪费。

---

### 1. 基本约定

- **语言**：回答与注释一律使用中文。
- **包管理**：统一使用 `pnpm`。
- **技术栈**：WXT + React + TypeScript + Tailwind CSS + Shadcn UI。
- **代码风格**：
  - 2 空格缩进，字符串使用双引号。
  - 逻辑组件/库：`.ts`；React 组件：`.tsx`。
  - 组件文件名 PascalCase，导出使用 camelCase。
  - 路径别名：`@/` 指向 `src/`；按「标准库 / 第三方 / 本地」分组导入。
  - 无 ESLint/Prettier，保持与周边代码一致，尽量小 diff。

---

### 2. 运行与构建（只保留高频命令）

```bash
pnpm install          # 安装依赖
pnpm dev              # Chrome 开发调试
pnpm build            # 生产构建（Chrome）
pnpm compile          # 类型检查（必须通过）
pnpm zip              # 打包扩展
```

Chrome 加载开发版本：打开 `chrome://extensions` → 启用开发者模式 →「加载已解压的扩展程序」→ 选择 `.output/chrome-mv3/`。

Shadcn 组件安装：`pnpm dlx shadcn@latest add [组件名]`。

---

### 3. 项目结构（与 AI 相关的关键位置）

- `src/entrypoints/background.ts`：Service Worker，消息路由、Cookie / LocalStorage 读写、权限/存储管理。
- `src/entrypoints/popup/`：Popup React 应用，主要包含：
  - `App.tsx`：入口和 Tab 布局。
  - `ConfigTab.tsx`：配置管理 UI。
  - `OperationTab.tsx`：读写操作 UI。
- `src/entrypoints/content/index.ts`：content script，目前逻辑很少，大部分功能在 `background.ts`。
- `src/types.ts`：核心类型定义（`CookieData`、`LocalStorageData`、`StorageConfig`、`MessageRequest/Response` 等）。
- `wxt.config.ts`：WXT 配置、权限、manifest。

需要新增能力时，优先复用以上模块，而不是在随机文件里新建逻辑。

---

### 4. 架构与消息流（AI 编码时需牢记）

存储读写不直接在 UI 中进行，而是通过消息转发到 `background.ts`：

1. Popup UI 触发操作（读取 / 写入 Cookie 或 LocalStorage）。
2. 使用 `browser.runtime.sendMessage()` 发送消息（`MessageType` 枚举）。
3. `background.ts` 中的 `handleMessage` 分发到对应处理函数：
   - Cookie：调用 `chrome.cookies`。
   - LocalStorage：通过 `chrome.scripting.executeScript` + `world: "MAIN"` 操作页面 LocalStorage。
4. 结果和错误写入 `browser.storage.local` / `browser.storage.sync`，再回传给 Popup。

**消息类型（简要）**：`READ_COOKIES`、`WRITE_COOKIES`、`READ_LOCALSTORAGE`、`WRITE_LOCALSTORAGE`、`GET_CONFIG`、`SAVE_CONFIG` 等，具体定义以 `src/types.ts` 与 `background.ts` 为准。

---

### 5. 存储与权限关键点（避免 AI 误改）

- **配置与缓存位置**（只记最终结论）：
  - 读取结果：`lastReadCookies` / `lastReadLocalStorage` → `browser.storage.local`。
  - 配置历史：`configHistory` → `browser.storage.local`，只保留最近 10 条。
  - 当前配置：`config` → `browser.storage.sync`，支持跨设备。
- **字段兼容性**：
  - 旧字段 `cookieNames` 仍需兼容，新逻辑一律使用 `storageKeys`。
- **Cookie 域名校验**：
  - `handleReadCookies` 会校验当前标签页 hostname 必须匹配配置中的源站 hostname，不满足时返回错误提示。
- **LocalStorage 访问**：
  - 必须通过 `chrome.scripting.executeScript` + `world: "MAIN"`，不能在 content script 里直接访问。
- **权限请求**：
  - 操作 Cookie 前要通过 `browser.permissions.contains()` 检查权限，不足时使用 `browser.permissions.request()` 申请。

---

### 6. 安全与配置

- 不要提交任何密钥/敏感信息。
- 本地开发时复制 `.env.example` 为 `.env`，设置：
  - `WXT_CHROME_APP_CLIENT_ID_PREFIX`
  - `WXT_WEB_APP_CLIENT_ID_PREFIX`
  - `WXT_FIREFOX_EXTENSION_ID`
- OAuth 相关 ID 和权限在 `wxt.config.ts` 中拼装，已发布的 ID 尽量保持稳定。

---

### 7. 测试与提交要求（精简版）

- **最小要求**：提交前必须跑通 `pnpm compile`。
- 暂无自动化测试，手动验证重点：
  - Popup 中配置编辑、历史选择、读写流程是否正常。
  - Cookie / LocalStorage 在不同环境间读写是否符合预期（尤其是域名校验和覆盖策略）。
  - Chrome / Firefox 构建后的扩展加载是否无明显报错。
- 提交信息建议使用类约定式风格，可带 emoji，例如：`✨ feat: add cookie sync`、`fix: handle storage error`。
