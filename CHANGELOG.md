### 🆕 New Features
  * 新增加拿大 AQHI、香港 AQHI、AQHI-Multi（中国 / 中国+香港）及中国致死风险 AQHI（中国 / 中国+香港）六种空气质量健康指数算法，并可直接在插件与模块参数中选择。 @WordlessEcho
  * 新增 WeatherKit 兼容的香港与中国 AQHI 本地标尺响应，包含多语言名称、健康风险等级、颜色渐变和健康建议。 @WordlessEcho

### 🛠️ Bug Fixes
  * 修正香港 AQHI 标尺的颜色、风险说明、语言回退与地区代码，并使标尺响应头与 WeatherKit 保持一致。 @WordlessEcho
  * 为 Surge、Loon、Quantumult X 与 Stash 补充 `airQualityScale` 请求规则。 @WordlessEcho
  * 补齐开发版 Surge、Loon、Quantumult X 与 Stash 的 `airQualityScale` 请求规则，并为正式版和开发版 Stash 配置对应的脚本提供器。 @VirgilClyne
  * 统一在 Request 脚本中裁剪所有 `airQualityScale` 标识末尾的数字版本，并在写回请求路径后按完整路径匹配香港与中国 AQHI 本地标尺，避免版本化链接请求 Apple 时返回 404。 @VirgilClyne

### ‼️ Breaking Changes
  * none

### 🔄 Other Changes
  * 扩展空气质量数据源标志与标尺映射，使新增 AQHI 算法在计算、单位转换和 WeatherKit 编码流程中保持一致。 @WordlessEcho
  * 将 AQHI 算法迁移为无版本标尺标识，并移除 Response 与标尺解析流程中的重复裁剪逻辑，使所有 `airQualityScale` 链接处理统一由 Request 脚本负责。 @VirgilClyne
