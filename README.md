# WXT + React

This template should help get you started developing with React in WXT.

# Chrome Cookie Tools

一个 Chrome 浏览器插件，用于从指定网站读取 localStorage 并写入到目标网站。

## 功能特性

- ✅ 从 `https://ai-dev.supcon.com/agenthub/home` 读取 localStorage 指定键
- ✅ 保存键值数据（refreshToken, token, tenantId 等）
- ✅ 将保存的数据写入到目标网站的 localStorage
- ✅ 友好的用户界面
- ✅ 支持显示已保存的数据摘要

## 项目结构

```
chrome-cookie-tools/
├── manifest.json          # Chrome 插件配置文件
├── popup.html            # 弹出窗口界面
├── popup.ts              # 弹出窗口逻辑
├── src/
│   ├── types.ts          # TypeScript 类型定义
│   └── background.ts     # Service Worker 后台脚本
├── dist/                 # 编译输出目录（构建后生成）
├── icons/                # 插件图标（需要添加）
├── tsconfig.json         # TypeScript 配置
└── package.json          # 项目依赖配置
```

## 开发步骤

### 1. 安装依赖

```bash
npm install
```

### 2. 开发/构建项目

```bash
# 安装shadcn组件
pnpm dlx shadcn@latest add button


npm run build
```

### 3. 加载插件到 Chrome

1. 打开 Chrome 浏览器
2. 访问 `chrome://extensions/`
3. 开启"开发者模式"
4. 点击"加载已解压的扩展程序"
5. 选择项目根目录（包含 `manifest.json` 的目录）

### 4. 使用插件

1. 点击浏览器工具栏中的插件图标
2. 在弹出窗口中点击"读取 localStorage"按钮，从源网站读取指定键
3. 在"目标网站域名"输入框中输入目标网站域名（例如：`example.com` 或 `https://example.com`）
4. 点击"写入 localStorage"按钮，将数据写入目标网站

## 配置说明

### 需要读取的 localStorage 键

默认读取以下键：
- `refreshToken`
- `token`
- `tenantId`

如需修改，请编辑 `src/types.ts` 中的 `LOCAL_STORAGE_KEYS` 数组。

### 源网站 URL

默认源网站：`https://ai-dev.supcon.com/agenthub/home`

如需修改，请编辑 `src/types.ts` 中的 `SOURCE_URL` 常量。

## 注意事项

1. **权限要求**：插件需要以下权限：
   - `storage` - 保存数据
   - `tabs` - 查询标签页
   - `scripting` - 在页面上下文执行脚本
   - `activeTab` - 对当前活动标签页执行脚本

2. **写入限制**：
   - 必须先打开目标网站页面，才能在其上下文写入 localStorage
   - 确保目标网站域名格式正确

3. **数据安全**：
   - 数据存储在扩展的本地存储中
   - 包含敏感信息的键值请谨慎处理

## 开发命令

- `npm run build` - 编译 TypeScript 代码
- `npm run watch` - 监听文件变化并自动编译
- `npm run clean` - 清理编译输出目录

## 故障排除

### 无法读取 localStorage

- 确保已在源网站页面且为活动标签页
- 检查浏览器控制台是否有错误信息
- 确认插件权限已正确配置

### 无法写入 localStorage

- 检查目标网站域名格式是否正确
- 确认已打开目标网站页面（需要在页面上下文写入）
- 查看浏览器控制台的错误信息

## 许可证

MIT
