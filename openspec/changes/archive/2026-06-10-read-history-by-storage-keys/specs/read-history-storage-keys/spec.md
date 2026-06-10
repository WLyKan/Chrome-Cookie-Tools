## ADDED Requirements

### Requirement: 读取历史按 storageKeys 去重

系统 SHALL 在去重读取历史记录时，将 storageKeys 集合作为第三个维度，与 host 和 identityKey 一起决定记录的唯一性。同一 host + identityKey 但不同 storageKeys 集合的记录 MUST 被视为不同的历史槽位。

#### Scenario: 同域名同用户不同 key 配置产生独立记录
- **WHEN** 用户在 example.com 上先用 `["token","REFRESH_TOKEN"]` 读取，再用 `["ticket","JSESSIONID"]` 读取
- **THEN** 历史列表中 MUST 存在两条独立记录，互不覆盖

#### Scenario: 同域名同用户相同 key 集合（顺序不同）合并为一条
- **WHEN** 用户在 example.com 上先用 `["token","REFRESH_TOKEN"]` 读取，再用 `["REFRESH_TOKEN","token"]` 读取
- **THEN** 历史列表中 MUST 只有一条记录，第二次读取覆盖第一次

### Requirement: storageKeys 排序后比较

系统 SHALL 在比较两个 storageKeys 集合是否相同时，先对 keys 按字母排序再逐项比较。排序 MUST 使用默认字符串排序（Unicode 码点顺序）。

#### Scenario: 大小写不同的 key 视为不同
- **WHEN** 一条记录的 storageKeys 为 `["Token"]`，另一条为 `["token"]`
- **THEN** 系统 MUST 将它们视为不同的 key 集合

#### Scenario: 空 storageKeys 集合
- **WHEN** 一条记录的 storageKeys 为空数组 `[]`，另一条为 `["token"]`
- **THEN** 系统 MUST 将它们视为不同的 key 集合

### Requirement: ReadHistoryRecord 包含 storageKeys 字段

`ReadHistoryRecord` 接口 SHALL 新增 `storageKeys: string[]` 字段，记录本次读取使用的 key 配置。该字段 MUST 在写入历史记录时由 background script 从当前 config 中获取并填入。

#### Scenario: 新记录包含 storageKeys
- **WHEN** background script 写入一条新的读取历史记录
- **THEN** 该记录的 `storageKeys` 字段 MUST 为本次读取使用的 config.storageKeys 的副本

### Requirement: 复合 ID 包含 storageKeys

`getReadHistoryRecordId` 函数 SHALL 生成格式为 `host + \x1f + identityKey + \x1f + sortedStorageKeys` 的复合 ID。sortedStorageKeys 为排序后的 storageKeys 用逗号 join 的字符串。

#### Scenario: ID 格式正确
- **WHEN** 调用 `getReadHistoryRecordId("https://example.com/path", "1001", ["token","REFRESH_TOKEN"])`
- **THEN** 返回值 MUST 为 `"example.com\x1f1001\x1fREFRESH_TOKEN,token"`

#### Scenario: 空 storageKeys 的 ID
- **WHEN** 调用 `getReadHistoryRecordId("https://example.com/path", "1001", [])`
- **THEN** 返回值 MUST 为 `"example.com\x1f1001\x1f"`

### Requirement: 旧格式记录向后兼容

对于没有 `storageKeys` 字段的旧记录，系统 SHALL 在去重时将其视为通配——即旧记录可以被任何 storageKeys 的新记录匹配并覆盖。

#### Scenario: 新记录覆盖同域名同用户的旧记录
- **WHEN** 存在一条旧格式记录（无 storageKeys 字段），且新记录的 host 和 identityKey 与旧记录相同
- **THEN** 新记录 MUST 覆盖旧记录，历史列表中只保留新记录

### Requirement: UI 激活记录匹配

`OperationTab.tsx` 中匹配激活历史记录时，SHALL 优先按 `host + identityKey + storageKeys` 精确匹配。若无精确匹配，MUST 回退到仅按 host 匹配。

#### Scenario: 精确匹配优先
- **WHEN** 用户当前配置的 storageKeys 为 `["token"]`，历史中有两条同域名记录分别对应 `["token"]` 和 `["ticket"]`
- **THEN** 系统 MUST 自动选中 `["token"]` 对应的记录

#### Scenario: 回退到 host 匹配
- **WHEN** 用户当前配置的 storageKeys 为 `["newKey"]`，历史中无精确匹配但有同域名记录
- **THEN** 系统 MUST 回退到按 host 匹配，选中该域名的记录
