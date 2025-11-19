# AGENTS.md - AI 编程助手指南

## 项目概览

这是一个 **Chrome Manifest V3 扩展程序**，用于在不同网站之间传输 localStorage 数据。核心功能是从源站（默认为：`https://ai-dev.supcon.com`，可自定义）读取指定键值，并写入到用户当前访问的目标网站。

## 架构设计

### 三层架构模式

```
popup.html/popup.ts (UI层)
    ↕ chrome.runtime.sendMessage
background.ts (Service Worker层，业务逻辑)
    ↕ chrome.scripting.executeScript
页面上下文 (MAIN world，操作 localStorage)
```

**关键设计决策**：
- 使用 **Service Worker** (background.ts) 而非持久化后台页面（MV3 要求）
- 通过 `chrome.scripting.executeScript` 在 `world: 'MAIN'` 上下文执行，直接访问页面的 `window.localStorage`
- 依赖 `activeTab` 权限避免运行时权限请求，简化用户体验

### 数据流

1. **读取流程**：用户在源站页面点击"读取" → popup 发送消息 → background 验证 URL 匹配 → 注入脚本读取 localStorage → 保存到 `chrome.storage.local`
2. **写入流程**：用户切换到目标站点点击"写入" → background 从 `chrome.storage.local` 获取数据 → 注入脚本写入 localStorage

## 开发工作流

### 构建与调试

```bash
npm run build        # 单次编译 TypeScript → dist/
npm run watch        # 监听模式（推荐开发时使用）
```

**调试步骤**：
1. 运行 `npm run watch`
2. Chrome 访问 `chrome://extensions/`
3. 启用"开发者模式"，点击"加载已解压的扩展程序"，选择项目根目录
4. 修改代码后，点击扩展卡片的刷新按钮（Service Worker 需重新加载）

**关键调试点**：
- Background 日志：`chrome://extensions/` → 扩展卡片 → "Service Worker" 链接 → 控制台
- Popup 日志：右键扩展图标 → "检查弹出内容"
- 页面注入脚本：在目标页面的开发者工具控制台查看

### 文件结构约定

```
manifest.json           # MV3 配置，定义权限、Service Worker 入口
src/
  types.ts             # 类型定义、常量配置（SOURCE_URL, DEFAULT_READ_KEYS）
  background.ts        # Service Worker，消息处理、localStorage 操作逻辑
popup.html             # UI（内联样式，无外部 CSS）
popup.ts               # UI 交互逻辑，事件绑定
dist/                  # 编译输出（TypeScript → JavaScript）
```

**编译输出路径**：所有 `.ts` 文件编译到 `dist/` 目录，保持相对路径结构（如 `src/background.ts` → `dist/src/background.js`）

## 项目特定模式

### 1. 消息通信模式

Background 支持的消息类型（`message.action`）：
- `readLocalStorage` - 从活动标签页读取 localStorage
- `writeLocalStorage` - 写入 localStorage 到活动标签页
- `getStoredLocalStorage` - 获取已保存的数据
- `getReadKeysConfig` - 获取用户配置的键名列表
- `saveReadKeysConfig` - 保存键名配置到 `chrome.storage.sync`

**示例**（popup.ts 调用）：
```typescript
const response = await chrome.runtime.sendMessage({ 
  action: 'readLocalStorage' 
}) as LocalStorageOperationResult;
```

### 2. 脚本注入模式

使用 `chrome.scripting.executeScript` 在页面上下文执行：
```typescript
chrome.scripting.executeScript({
  target: { tabId: tab.id },
  func: (keys: string[]) => { /* 在页面上下文运行 */ },
  args: [keysToRead],
  world: 'MAIN'  // 关键：访问页面的真实 localStorage
});
```

**注意**：函数体会序列化传输，不能引用外部变量，必须通过 `args` 传递。

### 3. 双存储策略

- `chrome.storage.local` - 存储读取的 localStorage 数据（`StoredLocalStorageInfo`）
- `chrome.storage.sync` - 存储用户配置的键名列表（`ReadKeysConfig`），跨设备同步

### 4. URL 验证模式

读取时强制校验当前标签页必须匹配 `SOURCE_URL` 的 hostname：
```typescript
const url = new URL(tab.url);
const source = new URL(SOURCE_URL);
if (url.hostname !== source.hostname) {
  return { success: false, message: `请在源站点页面执行` };
}
```

写入时无域名限制，允许任意 HTTPS/HTTP 页面（可在 `writeLocalStorageToActiveTab` 中添加白名单逻辑）。

## 配置与扩展

### 修改源站或默认键名

编辑 `src/types.ts`：
```typescript
export const SOURCE_URL = 'https://your-source.com/path';
export const DEFAULT_READ_KEYS: ReadKeysConfig = {
  keys: ['key1', 'key2', 'key3'],
  updatedAt: 0,
};
```

### 添加新的消息处理

在 `src/background.ts` 的 `chrome.runtime.onMessage.addListener` 中添加新的 `if` 分支：
```typescript
if (message.action === 'yourNewAction') {
  // 处理逻辑
  sendResponse({ success: true, message: 'OK' });
  return true; // 保持异步响应通道
}
```

## 权限说明

- `storage` - 保存数据到本地/云同步
- `tabs` - 查询活动标签页 URL
- `scripting` - 注入脚本到页面上下文
- `activeTab` - 对当前活动标签页执行操作（无需额外权限提示）
- `host_permissions` - `https://ai-dev.supcon.com/*` 强制权限，`optional_host_permissions` 用于用户按需授权

## 常见陷阱

1. **Service Worker 生命周期**：MV3 的 Service Worker 可能在空闲时被终止，不要依赖全局变量持久化状态
2. **模块导入路径**：`.ts` 文件导入时需写 `.js` 扩展名（如 `from './types.js'`），因为 TypeScript 编译后路径保持不变
3. **消息响应**：异步处理消息时必须 `return true` 并使用 `sendResponse`，否则消息通道会提前关闭
4. **脚本上下文隔离**：`world: 'MAIN'` 可访问页面 localStorage，默认 `ISOLATED` 上下文不可访问

## 技术栈

- TypeScript 5.3+（严格模式）
- Chrome Extension Manifest V3
- 无外部框架依赖（原生 DOM API）
- 编译目标：ES2020 + ES Modules
