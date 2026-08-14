### 🆕 New Features
  * 彩云天气预警接入 v2.6 实况接口附带的预警数据，复用实况缓存，并将预警代码、事件类型和等级转换为 WeatherKit 数据。 @VirgilClyne

### 🛠️ Bug Fixes
  * 修复天气预警详情请求未按 `WeatherAlerts.Provider` 选择数据源的问题：彩云天气与 QWeather API 处理坐标标识，QWeather 网页处理 9 位地区标识，WeatherKit 保持原始请求；仅精确匹配天气预警路径。 @VirgilClyne
  * 修复预警标题裁剪不完整的问题，支持“江西省气象台2026年08月13日20时45分变更……”等变更类前缀，并移除 `[II/严重]`、`【…】` 等尾部等级标记。 @VirgilClyne

### ‼️ Breaking Changes
  * none

### 🔄 Other Changes
  * 将彩云天气内部版本更新至 `v4.3.0`，保留 v3 CAP 预警接口并明确命名为 `WeatherAlertV3CAP()`。 @VirgilClyne
