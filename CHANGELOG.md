### 🆕 New Features
  * 新增加拿大 AQHI、香港 AQHI、AQHI-Multi（中国 / 中国+香港）及中国致死风险 AQHI（中国 / 中国+香港）六种空气质量健康指数算法，并可直接在插件与模块参数中选择。 @WordlessEcho
  * 新增 WeatherKit 兼容的香港与中国 AQHI 本地标尺响应，包含多语言名称、健康风险等级、颜色渐变和健康建议。 @WordlessEcho
  * 在正式版模块参数中开放 `AirQuality.Current.Pollutants.Provider`，可选择彩云天气或和风天气提供当前污染物数据。 @VirgilClyne

### 🛠️ Bug Fixes
  * 修正香港 AQHI 标尺的颜色、风险说明、语言回退与地区代码，并使本地标尺响应头与 WeatherKit 保持一致。 @WordlessEcho
  * 为正式版与开发版的 Surge、Loon、Quantumult X 和 Stash 补齐 `airQualityScale` 请求规则及 Stash 脚本提供器；统一裁剪标尺标识末尾的数字版本并按完整路径返回香港与中国 AQHI 本地标尺，避免版本化链接请求 Apple 时返回 404。 @WordlessEcho @VirgilClyne
  * 修复 Stash 天气预警请求规则缺少必填 `type: request`、导致覆写配置无效的问题。 @VirgilClyne
  * 修复天气预警请求未按标识类型正确处理的问题：页面地区标识固定使用和风天气网页，坐标标识按所选数据源处理且 `QWeatherWeb` 自动使用和风天气 API，原生或不支持的标识返回 WeatherKit 兼容的空结果。 @VirgilClyne
  * 将 `weatherAlerts` 纳入正式版默认可配置数据集，避免启用天气预警数据源后请求遗漏预警数据。 @VirgilClyne
  * 补充彩云天气与和风天气的默认服务令牌并统一请求、响应脚本的读取路径，未自定义令牌时仍可使用对应天气服务。 @VirgilClyne
  * 恢复正式构建生成普通 Egern 模块 `iRingo.WeatherKit.yaml`。 @VirgilClyne

### ‼️ Breaking Changes
  * none

### 🔄 Other Changes
  * 拆分 release、full 与 dev 参数构建配置：正式模块只暴露已支持的设置，完整设置保留给 BoxJS，开发模块使用独立模板、脚本与输出名称。 @VirgilClyne
  * 扩展空气质量数据源标志与标尺映射，使新增 AQHI 算法在计算、单位转换和 WeatherKit 编码流程中保持一致。 @WordlessEcho
  * 将 AQHI 算法迁移为无版本标尺标识，并统一 `AirQualityScale` 的配置、路径解析与本地响应构建；所有 `airQualityScale` 链接处理由 Request 脚本负责。 @VirgilClyne
