# Chrome Cookie Tools

一个 Chrome 浏览器插件，用于从指定网站读取 Cookie 并写入到目标网站。

## 功能特性

- ✅ 从 `https://ai-dev.supcon.com/agenthub/home` 读取 Cookie
- ✅ 保存 Cookie 数据（refreshtoken, token, tenantId 等）
- ✅ 将保存的 Cookie 写入到目标网站
- ✅ 友好的用户界面
- ✅ 支持显示已保存的 Cookie 信息

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

### 2. 构建项目

```bash
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
2. 在弹出窗口中点击"读取 Cookie"按钮，从源网站读取 Cookie
3. 在"目标网站域名"输入框中输入目标网站域名（例如：`example.com` 或 `https://example.com`）
4. 点击"写入 Cookie"按钮，将 Cookie 写入目标网站

## 配置说明

### 需要读取的 Cookie

默认读取以下 Cookie：
- `refreshtoken`
- `token`
- `tenantId`

如需修改，请编辑 `src/types.ts` 中的 `REQUIRED_COOKIE_NAMES` 数组。

### 源网站 URL

默认源网站：`https://ai-dev.supcon.com/agenthub/home`

如需修改，请编辑 `src/types.ts` 中的 `SOURCE_URL` 常量。

## 注意事项

1. **权限要求**：插件需要以下权限：
   - `cookies` - 读取和写入 Cookie
   - `storage` - 保存 Cookie 数据
   - `tabs` - 监听标签页事件

2. **Cookie 写入限制**：
   - Chrome 的安全策略可能会限制某些 Cookie 的写入
   - 确保目标网站域名格式正确
   - 某些网站可能对 Cookie 有特殊要求（如 httpOnly、secure 等）

3. **数据安全**：
   - Cookie 数据存储在插件的本地存储中
   - 请勿将包含敏感信息的 Cookie 分享给他人

## 开发命令

- `npm run build` - 编译 TypeScript 代码
- `npm run watch` - 监听文件变化并自动编译
- `npm run clean` - 清理编译输出目录

## 故障排除

### 无法读取 Cookie

- 确保已访问源网站并登录
- 检查浏览器控制台是否有错误信息
- 确认插件权限已正确配置

### 无法写入 Cookie

- 检查目标网站域名格式是否正确
- 确认目标网站允许设置 Cookie
- 查看浏览器控制台的错误信息

## 许可证

MIT
