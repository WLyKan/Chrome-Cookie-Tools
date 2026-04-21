# WXT + React

This template should help get you started developing with React in WXT.

# Cookie Tools

一个浏览器扩展工具，用于从源网站读取Cookie并写入到目标网站。

## 功能特性

- 📋 **配置管理**：自定义源网站URL和需要读取的Cookie名称
- 📖 **Cookie读取**：从指定源网站读取指定的Cookie
- ✍️ **Cookie写入**：将读取的Cookie写入到目标网站
- 🕒 **历史记录**：保存最近100个源网站URL，方便快速切换
- 🎨 **现代UI**：使用React + Tailwind CSS构建的美观界面
- 🔒 **权限管理**：动态请求网站访问权限，安全可控

## 技术栈

- [WXT](https://wxt.dev) - Web扩展开发框架
- [TypeScript](https://www.typescriptlang.org) - 类型安全
- [React](https://reactjs.org) - UI框架
- [Tailwind CSS](https://tailwindcss.com) - 样式框架
- [Lucide React](https://lucide.dev) - 图标库

## 项目结构

```
src/
├── entrypoints/          # 扩展入口点
│   ├── popup/           # Popup页面
│   │   ├── App.tsx      # 主应用组件
│   │   ├── ConfigTab.tsx    # 配置页面
│   │   ├── OperationTab.tsx # 操作页面
│   │   └── index.html   # HTML入口
│   └── background.ts    # Background Service Worker
├── components/ui/       # UI组件
│   ├── tabs.tsx
│   ├── button.tsx
│   ├── input.tsx
│   ├── label.tsx
│   └── card.tsx
├── lib/                 # 工具函数
│   └── utils.ts
└── types.ts            # TypeScript类型定义
```

### 开发指南

### 环境要求

- Node.js 18+
- pnpm 8+

### 开发命令

```bash
# 安装依赖
pnpm install

# 启动开发服务器（Chrome）
pnpm dev

# 启动开发服务器（Firefox）
pnpm dev:firefox

# 安装 shadcn 组件
pnpm dlx shadcn@latest add [组件名]

# 类型检查
pnpm compile

# 构建生产版本
pnpm build

# 构建Firefox版本
pnpm build:firefox

# 打包扩展
pnpm zip
```

### 加载开发版本

1. 运行 `pnpm dev`
2. 打开 `chrome://extensions/`
3. 开启「开发者模式」
4. 点击「加载已解压的扩展程序」
5. 选择 `.output/chrome-mv3` 目录

## 使用说明

### 1. 配置Cookie读取

1. 点击扩展图标打开Popup
2. 切换到「配置」标签页
3. 输入源网站URL（例如：`https://example.com`）
4. 添加需要读取的Cookie名称（例如：`sessionId`、`token`等）
5. 点击「保存配置」

### 2. 读取Cookie

1. 切换到「操作」标签页
2. 点击「读取Cookie」按钮
3. 如果需要权限，会弹出授权提示
4. 读取成功后，Cookie数据会显示在预览区域

### 3. 写入Cookie

1. 在「操作」标签页查看当前标签页信息（目标网站）
2. 点击「写入Cookie到当前标签页」按钮
3. Cookie会被写入到当前打开的浏览器标签页
4. 刷新页面验证Cookie是否写入成功

## 权限说明

此扩展需要以下权限：

- `storage` - 保存配置和Cookie数据
- `cookies` - 读取和写入Cookie
- `tabs` - 获取当前标签页信息
- `activeTab` - 访问当前活动标签页
- `<all_urls>` - 访问用户授权的网站（按需请求）

## 测试

请参考 [test-checklist.md](./test-checklist.md) 进行完整的功能测试。

## 许可证

MIT
