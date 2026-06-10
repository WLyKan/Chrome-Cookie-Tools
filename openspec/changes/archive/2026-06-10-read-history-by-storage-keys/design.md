## Context

当前读取历史的去重维度是 `host × identityKey`。当同一用户在同一域名上使用不同的 `storageKeys` 配置读取时，新记录会覆盖旧记录。需要将去重维度扩展为 `host × identityKey × storageKeys`。

现有关键文件：
- `src/utils/readHistory.ts` — 去重逻辑和 ID 生成
- `src/entrypoints/background.ts:532-534` — 写入历史记录
- `src/entrypoints/popup/OperationTab.tsx:131-133` — 历史记录匹配与展示
- `src/types.ts:106-119` — `ReadHistoryRecord` 类型定义

## Goals / Non-Goals

**Goals:**
- 同一域名 + 同一用户 + 不同 storageKeys 配置 → 独立历史记录，互不覆盖
- storageKeys 排序后比较，顺序不同但集合相同视为同一配置
- 旧格式历史记录自然淘汰，无需迁移脚本

**Non-Goals:**
- 不做旧数据迁移（旧记录无 storageKeys 字段，自然老化淘汰）
- 不改变历史记录的最大条数限制（仍为 100）
- 不改变 UI 的搜索/过滤功能（`historySearch.ts` 不受影响）

## Decisions

### D1: storageKeys 作为 Record 字段而非 ID 内嵌

**选择**: 在 `ReadHistoryRecord` 上新增 `storageKeys: string[]` 字段，去重逻辑通过字段比较实现，ID 中也拼入排序后的 keys。

**理由**:
- ID 内嵌使得 ID 自身就是去重的完整表达，`normalizeReadHistoryRecord` 可以从 ID 重建去重语义
- 字段保留使得 UI 可以直接展示 key 配置，无需从 ID 解析
- 两者结合：ID 用于存储 key 和 React list key，字段用于展示和比较

**替代方案**: 只加字段不改 ID — 但这样 `normalizeReadHistoryRecord` 无法从旧记录的 items 正确推导 storageKeys（items 可能不完整），导致 ID 不稳定。

### D2: storageKeys 排序策略

**选择**: 按字母排序后 join（`["token","REFRESH_TOKEN"]` → `"REFRESH_TOKEN,token"`）。

**理由**:
- 语义上 storageKeys 是集合，顺序不影响读取结果
- 排序保证 `["a","b"]` 和 `["b","a"]` 产生相同的去重键
- 使用 `localeCompare` 或默认 `sort()` 即可，无需特殊排序算法

### D3: 旧数据处理策略

**选择**: 自然淘汰。旧记录（无 storageKeys 字段）在去重时视为"通配"——即旧记录会被任何新记录匹配并覆盖。

**理由**:
- 避免复杂的迁移逻辑
- 旧记录最多 100 条，用户正常使用几次后就会被新记录挤出
- 如果旧记录恰好与新记录的 host+identity 相同，用户大概率期望新数据覆盖旧数据

**实现**: `isSameReadHistorySlot` 中，若一方无 storageKeys 则视为匹配（向后兼容）。

### D4: UI 匹配逻辑

**选择**: `OperationTab.tsx` 中匹配激活记录时，优先按 `host + identityKey + storageKeys` 精确匹配，找不到时回退到仅按 host 匹配。

**理由**:
- 精确匹配让用户看到的是当前配置对应的历史记录
- 回退保证在没有精确匹配时仍能找到该域名的记录（比如首次用新配置读取前）
- 不做过滤——历史列表仍展示所有记录，用户可以自由切换

## Risks / Trade-offs

- **[ID 长度增长]** → storageKeys 拼入 ID 后 ID 会变长。Mitigation: storageKeys 通常只有 3-5 个短 key，总长度可控，不影响 chrome.storage.local 性能。
- **[旧记录被覆盖]** → 旧格式记录（无 storageKeys）会被新记录匹配并覆盖。Mitigation: 这符合用户预期（同域名同用户的新读取应该覆盖旧数据），且旧记录会自然淘汰。
- **[normalizeReadHistoryRecord 推导 storageKeys]** → 从 `items.map(i => i.key)` 推导可能不完整（某些 key 在页面上不存在时不会出现在 items 中）。Mitigation: 在 `background.ts` 写入时直接传入 config 中的 storageKeys，而非从 items 推导。`normalizeReadHistoryRecord` 仅用于旧记录的 ID 重建，此时用 items 推导是最佳近似。
