### 🆕 New Features
  * 新增 WeatherKit 兼容的香港与中国 AQHI 本地标尺响应，并为 Surge、Loon、Quantumult X 与 Stash 补充 `airQualityScale` 请求规则。 @WordlessEcho

### 🛠️ Bug Fixes
  * 补齐开发版 Surge、Loon、Quantumult X 与 Stash 的 `airQualityScale` 请求规则，并为正式版和开发版 Stash 配置对应的脚本提供器。 @VirgilClyne
  * 统一在 Request 脚本中裁剪所有 `airQualityScale` 标识末尾的数字版本，并在写回请求路径后按完整路径匹配香港与中国 AQHI 本地标尺，避免版本化链接请求 Apple 时返回 404。 @VirgilClyne
  * 修复 Stash 天气预警请求规则可能缺少必填的 `type: request` 字段、导致覆写配置无效的问题。 @VirgilClyne

### ‼️ Breaking Changes
  * none

### 🔄 Other Changes
  * 将空气质量标尺识别迁移为无版本标识，并移除 Response 与标尺解析流程中的重复裁剪逻辑，所有 `airQualityScale` 链接统一由 Request 脚本处理。 @VirgilClyne
  * 将 `AirQualityScale` 的完整标尺 JSON 与语言映射收进实例私有 `#Config`，并统一通过实例 `Build()` 构建本地响应。 @VirgilClyne
