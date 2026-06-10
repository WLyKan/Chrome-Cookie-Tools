## Why

当前读取历史的去重键是 `host + identityKey`（域名 + 工号/用户名），同一域名、同一用户使用不同的 `storageKeys` 配置读取时，新记录会覆盖旧记录，导致用户丢失之前的读取结果。当用户在同站点上切换不同的 key 组合（如先读 `token,REFRESH_TOKEN`，再读 `ticket,JSESSIONID`）时，第一条历史记录会被覆盖掉。

## What Changes

- 在 `ReadHistoryRecord` 类型上新增 `storageKeys: string[]` 字段，记录本次读取使用的 key 配置
- 修改 `isSameReadHistorySlot` 去重逻辑：除了比较 host 和 identityKey，还要比较 storageKeys 集合是否一致（排序后比较，顺序无关）
- 修改 `getReadHistoryRecordId`：将排序后的 storageKeys 拼入复合 ID（`host + \x1f + identityKey + \x1f + sortedKeys`）
- 修改 `background.ts` 中写入历史记录的调用，传入本次读取使用的 storageKeys
- 修改 `OperationTab.tsx` 中的历史记录匹配逻辑，使其感知 storageKeys 维度
- 更新相关测试用例

## Capabilities

### New Capabilities
- `read-history-storage-keys`: 读取历史记录按 storageKeys 配置去重，同一域名+用户的不同 key 配置产生独立历史记录

### Modified Capabilities
（无现有 spec 需要修改）

## Impact

- **类型变更**: `ReadHistoryRecord` 接口新增 `storageKeys` 字段
- **核心逻辑**: `src/utils/readHistory.ts` — 去重函数和 ID 生成函数签名变更
- **Background**: `src/entrypoints/background.ts:534` — 构造 record 时需传入 storageKeys
- **Popup**: `src/entrypoints/popup/OperationTab.tsx:132` — 历史记录匹配逻辑需考虑 storageKeys
- **测试**: `src/__tests__/readHistory.test.ts` — 需要更新测试用例以覆盖 storageKeys 维度
- **旧数据**: 已有历史记录（无 storageKeys 字段）将自然淘汰，无需迁移
