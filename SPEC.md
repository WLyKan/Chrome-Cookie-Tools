# Chrome Cookie Tools - 产品需求规范文档

## 1. 项目概述

### 1.1 产品定位
**Storage Dev Tools** 是一个面向开发者的Chrome浏览器扩展插件，用于在开发环境之间快速传输Cookie或LocalStorage数据。

### 1.2 核心价值
- 解决开发/测试/生产环境之间的数据同步问题
- 支持认证Token和配置数据的跨环境传输
- 简化开发流程，提高调试效率

### 1.3 目标用户
- 前端开发者
- 测试工程师
- 需要跨环境调试的技术人员

---

## 2. 功能需求

### 2.1 核心功能

#### 2.1.1 Cookie读写
| 功能 | 描述 |
|------|------|
| 读取Cookie | 从当前激活标签页读取指定key的Cookie |
| 写入Cookie | 将读取的Cookie写入到当前激活标签页 |
| 属性处理 | 保留Domain、Path、Expires、Secure、SameSite等属性 |
| 会话Cookie | 支持 Session Cookie（浏览器关闭即失效） |
| HttpOnly Cookie | 检测到时提示用户手动处理 |

#### 2.1.2 LocalStorage读写
| 功能 | 描述 |
|------|------|
| 读取LocalStorage | 从当前页面读取指定key的LocalStorage值 |
| 写入LocalStorage | 将读取的值写入到目标页面的LocalStorage |
| 格式处理 | 按原始字符串处理，不进行JSON解析 |
| 编码处理 | 原样处理，不进行编码转换 |
| 容量处理 | 超过限制时明确提示用户 |

#### 2.1.3 数据验证
- 写入后立即验证，确保值一致
- 实时验证用户输入的key格式
- 非法字符或格式问题时立即提示

### 2.2 配置管理

#### 2.2.1 配置内容
```typescript
interface StorageConfig {
  storageKeys: string[];        // 存储key列表
  storageType: 'cookie' | 'localStorage';
  sourceUrl?: string;           // 源URL（可选）
  targetUrl?: string;           // 目标URL（可选）
  updatedAt: string;            // 更新时间
}
```

#### 2.2.2 配置历史
- 保存最近10个配置
- 按最近最常使用排序
- 支持点击历史快速恢复配置
- 仅本地存储，不跨设备同步

#### 2.2.3 配置输入
- 多行文本输入，一行一个key
- 实时验证key格式
- 非法字符立即提示

### 2.3 操作流程

#### 2.3.1 标准操作流程
```
1. 用户在源页面打开插件
2. 选择或创建配置
3. 点击"读取"按钮
4. 切换到目标标签页
5. 点击"写入"按钮
6. 查看操作结果
```

#### 2.3.2 操作规则
- **只针对当前激活的标签页操作**
- 读写操作手动触发，不自动同步
- 强制覆盖目标已存在的数据

---

## 3. 数据处理策略

### 3.1 数据类型
- **混合类型**：同时处理敏感数据（认证Token）和配置数据

### 3.2 冲突处理
| 场景 | 策略 |
|------|------|
| 目标数据已存在 | 强制覆盖 |
| 批量写入部分失败 | 跳过失败项，完成后tip告知结果 |
| 容量超限 | 明确提示用户 |

### 3.3 数据缓存
| 数据类型 | 存储方式 | 保留策略 |
|---------|---------|---------|
| 读取的Cookie/LocalStorage | browser.storage.local | 临时缓存 |
| 配置历史 | browser.storage.local | 最近10条 |
| 配置数据 | browser.storage.sync | 跨设备同步 |

### 3.4 错误处理
- 操作结果：简要显示成功/失败数量
- 错误日志：临时显示，关闭即丢失
- 失败重试：记录失败项，支持重新操作

---

## 4. 用户界面设计

### 4.1 布局结构
```
┌─────────────────────────────────┐
│  Header (Logo + 标题 + DEV标识)  │
├─────────────────────────────────┤
│  [操作] [配置] Tabs              │
├─────────────────────────────────┤
│                                  │
│         Tab Content             │
│                                  │
└─────────────────────────────────┘
```

### 4.2 Tab划分
- **操作Tab**：执行读写操作，显示当前配置摘要
- **配置Tab**：管理存储key，查看历史记录

### 4.3 主题支持
- 支持浅色/暗色模式
- 自动跟随系统或手动切换

### 4.4 空状态设计
- 简洁的"暂无数据"提示
- 避免过多引导文字

### 4.5 反馈方式
- Toast提示：操作结果反馈
- 加载指示：操作进行中的状态
- 图标标记：关键状态标识

---

## 5. 技术实现

### 5.1 架构设计

#### 5.1.1 消息传递架构
```
Popup UI → browser.runtime.sendMessage() → Background Service Worker
                                                        ↓
                                          chrome.scripting.executeScript()
                                                        ↓
                                                    Web Pages
```

#### 5.1.2 关键技术点
- **LocalStorage操作**：使用 `world: 'MAIN'` 注入脚本访问页面LocalStorage
- **Cookie操作**：使用 `chrome.cookies` API
- **权限管理**：动态请求 `cookies` 和 `scripting` 权限

### 5.2 核心代码结构

#### 5.2.1 Background Service Worker
```typescript
// 消息类型
enum MessageType {
  READ_COOKIES = 'READ_COOKIES',
  WRITE_COOKIES = 'WRITE_COOKIES',
  READ_LOCALSTORAGE = 'READ_LOCALSTORAGE',
  WRITE_LOCALSTORAGE = 'WRITE_LOCALSTORAGE',
  GET_CONFIG = 'GET_CONFIG',
  SAVE_CONFIG = 'SAVE_CONFIG',
}

// 消息处理
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // 路由到对应handler
});
```

#### 5.2.2 LocalStorage注入函数
```typescript
// 读取
chrome.scripting.executeScript({
  target: { tabId: tab.id },
  func: (keys: string[]) => {
    const result: Record<string, string> = {};
    for (const k of keys) {
      const v = window.localStorage.getItem(k);
      if (typeof v === 'string') result[k] = v;
    }
    return result;
  },
  args: [keys],
  world: 'MAIN',
});

// 写入
chrome.scripting.executeScript({
  target: { tabId: tab.id },
  func: (entries: [string, string][]) => {
    const okKeys: string[] = [];
    const failKeys: string[] = [];
    for (const [k, v] of entries) {
      try {
        window.localStorage.setItem(k, v);
        okKeys.push(k);
      } catch (e) {
        failKeys.push(k);
      }
    }
    return { ok: okKeys, failed: failKeys };
  },
  args: [data],
  world: 'MAIN',
});
```

### 5.3 权限配置
```typescript
// wxt.config.ts
permissions: [
  'storage',
  'tabs',
  'scripting',
  'activeTab',
  'cookies',
],
host_permissions: ['<all_urls>'],
```

### 5.4 开发调试功能
- **调试模式**：显示详细日志和调试信息
- **模拟数据**：无需真实环境即可测试UI
- **DEV标识**：界面显示黄色DEV徽标

---

## 6. 边界情况处理

### 6.1 数据边界
| 场景 | 处理方式 |
|------|---------|
| 大量数据（50+ key） | 不支持，用户场景仅3-5个key |
| 大字符串value | 完整传输，原样处理 |
| 特殊编码（base64等） | 原样处理，不转换 |
| JSON字符串 | 按字符串处理，不解析 |

### 6.2 Cookie边界
| 场景 | 处理方式 |
|------|---------|
| Session Cookie | 支持同步，生命周期随浏览器会话 |
| HttpOnly Cookie | 提示用户手动处理 |
| 多个同名Cookie | 不存在，只读取当前标签页 |
| SameSite限制 | 分开读写，不涉及跨域传输 |

### 6.3 操作边界
| 场景 | 处理方式 |
|------|---------|
| 多标签页同域名 | 只操作当前激活标签页 |
| 无权限页面 | 动态请求权限 |
| 写入失败 | 跳过失败项，完成后告知 |
| 页面未加载完成 | 等待加载后操作 |

### 6.4 UI边界
| 场景 | 处理方式 |
|------|---------|
| 无配置历史 | 显示空状态提示 |
| 读取无数据 | 提示用户key不存在 |
| Popup空间小 | 分Tab展示，精简布局 |
| 暗色模式 | 完整支持 |

---

## 7. 非功能需求

### 7.1 性能要求
- 读写操作响应时间 < 1秒
- Popup打开时间 < 500ms
- 支持的key数量：3-5个（正常场景）

### 7.2 安全要求
- 仅开发环境使用，不涉及生产安全风险
- 不添加额外的安全警告提示
- 敏感数据本地缓存，不上传

### 7.3 兼容性要求
- Chrome 88+
- Edge 88+
- 其他Chromium内核浏览器

### 7.4 可维护性要求
- TypeScript类型安全
- 清晰的代码结构
- 完善的错误处理

---

## 8. 用户故事

### 8.1 作为开发者，我需要...
| 故事 | 优先级 |
|------|-------|
| 将开发环境的登录状态同步到测试环境 | P0 |
| 快速传输特定的配置数据 | P0 |
| 保存常用配置，避免重复输入 | P1 |
| 查看操作结果，确认写入成功 | P0 |
| 在暗色环境下舒适使用 | P1 |

### 8.2 使用场景
```
场景：在开发环境和测试环境之间切换登录状态

1. 开发者正在 dev.example.com 调试
2. 打开插件，选择配置（包含auth_token等key）
3. 点击"读取LocalStorage"
4. 切换到 staging.example.com
5. 点击"写入LocalStorage"
6. 收到Toast提示：成功写入3个key
7. 刷新页面，登录状态已同步
```

---

## 9. 待讨论问题

### 9.1 技术权衡
- [ ] 是否需要支持Cookie的 `world: 'MAIN'` 注入方式（替代chrome.cookies API）
- [ ] 配置历史是否需要支持搜索/过滤
- [ ] 是否需要支持key的正则匹配模式

### 9.2 产品扩展
- [ ] 是否需要支持SessionStorage
- [ ] 是否需要支持IndexedDB
- [ ] 是否需要支持数据加密存储

### 9.3 用户反馈收集点
- [ ] 实际使用中key的数量范围
- [ ] 最常用的存储类型比例
- [ ] 操作失败的常见原因

---

## 10. 版本规划

### 10.1 当前版本（优化改进）
- 完善现有功能
- 修复已知问题
- 优化用户体验

### 10.2 未来版本
- 支持更多存储类型
- 支持配置导入导出
- 支持团队配置共享

---

## 附录：技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| WXT | 0.20.11 | Web扩展开发框架 |
| React | 19.1.1 | UI框架 |
| TypeScript | 5.9.2 | 类型安全 |
| Tailwind CSS | 4.1.17 | 样式框架 |
| Shadcn UI | Latest | 组件库 |
| Lucide React | 0.554.0 | 图标库 |
