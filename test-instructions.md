# 插件测试指南

## 测试步骤

### 1. 加载插件到 Chrome

1. 打开 Chrome 浏览器
2. 访问 `chrome://extensions/`
3. 开启右上角的"开发者模式"开关
4. 点击"加载已解压的扩展程序"
5. 选择项目根目录：`D:\Codes\chrome-cookie-tools`
6. 确认插件已加载（应该显示在扩展程序列表中）

### 2. 测试读取 Cookie 功能

1. 首先访问源网站：`https://ai-dev.supcon.com/agenthub/home`
2. 确保已登录（这样才会有 Cookie）
3. 点击浏览器工具栏中的插件图标（如果没有图标，会显示一个默认图标）
4. 在弹出窗口中，点击"读取 Cookie"按钮
5. 检查是否显示成功消息和已保存的 Cookie 信息

**预期结果：**
- 成功读取 `REFRESH_TOKEN`、`token`、`tenantId` 等 Cookie
- 显示成功消息，例如："成功读取 3 个 Cookie: REFRESH_TOKEN, token, tenantId"
- 在下方显示已保存的 Cookie 列表和保存时间

### 3. 测试写入 Cookie 功能

1. 在弹出窗口的"目标网站域名"输入框中输入目标网站域名
   - 例如：`example.com` 或 `https://example.com`
2. 点击"写入 Cookie"按钮
3. 检查是否显示成功消息

**预期结果：**
- 显示成功消息，例如："成功写入 3 个 Cookie: REFRESH_TOKEN, token, tenantId"
- 如果目标网站已打开，可以检查该网站的 Cookie 是否已写入

### 4. 检查浏览器控制台

1. 打开 Chrome 开发者工具（F12）
2. 切换到"Console"标签
3. 检查是否有错误信息

**常见问题：**
- 如果显示权限错误，需要检查 `manifest.json` 中的权限配置
- 如果显示模块导入错误，需要检查构建输出

### 5. 测试错误处理

1. **测试未登录状态读取 Cookie：**
   - 在没有登录源网站的情况下，尝试读取 Cookie
   - 应该显示错误消息："未找到以下 Cookie: REFRESH_TOKEN, token, tenantId"

2. **测试空目标域名写入：**
   - 不输入目标域名，直接点击"写入 Cookie"
   - 应该显示错误消息："请输入目标网站域名"

3. **测试未读取 Cookie 就写入：**
   - 清除存储的 Cookie 数据（或首次使用）
   - 直接点击"写入 Cookie"
   - 应该显示错误消息："未找到保存的 Cookie 数据，请先读取 Cookie"

## 调试技巧

### 查看 Service Worker 日志

1. 在 `chrome://extensions/` 页面
2. 找到插件，点击"service worker"链接（或"检查视图"）
3. 查看控制台中的日志信息

### 查看 Popup 日志

1. 右键点击插件图标
2. 选择"检查弹出内容"
3. 查看控制台中的日志信息

### 清除存储数据

如果需要清除保存的 Cookie 数据：
1. 打开 Chrome 开发者工具（F12）
2. 切换到"Application"标签
3. 左侧选择"Storage" > "Local Storage"
4. 找到插件的存储，删除 `cookieData` 键

## 预期行为

✅ **正常情况：**
- 能够成功读取源网站的 Cookie
- 能够成功保存 Cookie 数据
- 能够成功将 Cookie 写入目标网站
- 界面显示友好，状态消息清晰

❌ **异常情况处理：**
- 未登录时显示友好的错误提示
- 输入验证正常工作
- 错误信息清晰易懂

## 测试清单

- [ ] 插件能够成功加载到 Chrome
- [ ] 能够读取源网站的 Cookie
- [ ] Cookie 数据能够正确保存
- [ ] 能够将 Cookie 写入目标网站
- [ ] 错误处理正常工作
- [ ] 界面显示正常
- [ ] 控制台无错误信息

