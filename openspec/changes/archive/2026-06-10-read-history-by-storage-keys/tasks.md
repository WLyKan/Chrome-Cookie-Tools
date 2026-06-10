## 1. 类型变更

- [x] 1.1 在 `src/types.ts` 的 `ReadHistoryRecord` 接口中新增 `storageKeys: string[]` 字段

## 2. 核心逻辑（src/utils/readHistory.ts）

- [x] 2.1 修改 `getReadHistoryRecordId` 函数签名，新增 `storageKeys: string[]` 参数，将排序后的 keys 拼入 ID（格式：`host + \x1f + identityKey + \x1f + sortedStorageKeys`）
- [x] 2.2 修改 `getReadHistoryIdentityKey` 函数，增加从 `record.items` 推导 storageKeys 的辅助逻辑（`items.map(i => i.key).sort()`），用于旧记录兼容
- [x] 2.3 修改 `isSameReadHistorySlot` 函数，新增 storageKeys 集合比较；若一方无 storageKeys 字段则视为通配（向后兼容）
- [x] 2.4 修改 `normalizeReadHistoryRecord` 函数，在重建 ID 时传入 storageKeys（优先用 record.storageKeys，回退到从 items 推导）

## 3. Background 写入（src/entrypoints/background.ts）

- [x] 3.1 修改 `background.ts:534` 处构造 record 的代码，将 `config.storageKeys` 传入 `getReadHistoryRecordId` 并写入 record 的 `storageKeys` 字段

## 4. Popup 匹配逻辑（src/entrypoints/popup/OperationTab.tsx）

- [x] 4.1 修改 `loadReadHistory` 中激活记录匹配逻辑：优先按 `host + identityKey + storageKeys` 精确匹配，找不到时回退到仅按 host 匹配

## 5. 测试

- [x] 5.1 更新 `src/__tests__/readHistory.test.ts`：修改 `makeRecord` 辅助函数以支持 storageKeys，更新现有测试用例
- [x] 5.2 新增测试用例：同域名同用户不同 storageKeys 产生独立记录
- [x] 5.3 新增测试用例：同域名同用户相同 storageKeys（顺序不同）合并为一条
- [x] 5.4 新增测试用例：旧格式记录（无 storageKeys）被新记录覆盖（向后兼容）
