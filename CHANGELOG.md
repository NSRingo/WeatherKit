### 🆕 New Features
  * 新增 `Cloudflare Pages` 部署支持，提供 `functions/[[route]].js`、`pages/_routes.json` 以及独立的 Pages / Workers 开发与部署脚本；同时调整 `Vercel` 入口为 `edge/vercel.js`，统一 `Hono` 云端入口。 @001ProMax
  * 新增 FlatBuffer root overlay 编码能力，仅重写实际变更的数据集，并保留 Apple 未知或新增的根产品表，提升对新 `WeatherKit` schema 的兼容性。 @hhh2210
  * 新增可配置的 `WeatherKit` 重写服务端点，模块统一由 `Workers` 更名为 `Rewrite`，支持在 `weatherkit.pages.dev`、`dev.weatherkit.pages.dev` 与 `weather.nanocat.cloud` 之间选择。 @VirgilClyne
  * 新增通用 FlatBuffer 根表处理器，并将 `WeatherKit` 改为按请求数据集逐 slot 解码和回写；未选数据集、未配置字段及新 schema slot 均保持原始二进制内容。 @VirgilClyne
  * 新增 QWeather 灾害预警页面重写与 `weatherAlerts` 接口适配，在请求脚本阶段预处理并直接构造 Apple WeatherKit 兼容响应。 @VirgilClyne

### 🛠️ Bug Fixes
  * 修复 `forecastNextHour` 在 iOS 27 下因元数据过期过快而失效的问题，并完善多段降水状态推导与描述匹配，避免复合天气短语被后续关键词错误覆盖。 @hhh2210
  * 修复 `WeatherKit` `dataSets` 与 availability 改写逻辑：仅过滤插件可注入的数据集，保留 Apple 原生 capability，避免固定列表吞掉新增能力或数据集。 @hhh2210
  * 修复天气注入后每日降水量字段的保留逻辑，避免第三方数据覆盖或破坏 `WeatherKit` 原始的全天 / 白天 / 夜间降水总量配对关系。 @hhh2210
  * 修复空气质量数据兼容性：统一 Apple 内置 AQ scale 为无版本别名、迁移旧 scale 标识、忽略不可用等级哨兵值，并修正和风天气 `reportedTime` 为 epoch seconds。 @hhh2210
  * 修复 `forecastNextHour` FlatBuffer 编码时未知天气枚举被静默编码为 `CLEAR` 的问题。 @hhh2210
  * 修复和风天气分钟预报的 `reportedTime`，改为使用接口返回的 `updateTime`，不再误写为本地读取时间。 @VirgilClyne
  * 修复云端路由对 `dev.weatherkit.*` 与 `*.pages.dev` 域名的识别，并限制 Cloudflare Pages Functions 只处理 WeatherKit API 路径。 @VirgilClyne
  * 为 QWeather 预警响应补充事件来源回退值，确保缺少来源字段时仍返回 Apple 兼容数据。 @VirgilClyne
  * 修复 QWeather 预警“防御指南”显示在描述正文的问题，改为映射到 Apple 预警详情的“建议的行动”。 @VirgilClyne

### 🔣 Dependencies
  * 切换 `@nsnanocat/util` 到公共 npm registry 来源。 @hhh2210
  * 移除 `src/proto` 子模块，改用 `@nsringo/weatherkit` 包，并更新至 `v1.1.2`。 @001ProMax @VirgilClyne
  * 将 `@nsnanocat/util` 更新至 `v2.7.0`。 @VirgilClyne

### ‼️ Breaking Changes
  * none

### 🔄 Other Changes
  * 更新 `DataSets` 参数默认值与说明，明确其仅控制插件可修改的数据集，其余 Apple 数据集继续透传。 @hhh2210
  * 为 `Hono` 根路径新增 `GET /` 健康检查响应 `OK`。 @hhh2210
  * 将构建工具由 `Rspack` 迁移至 `Rollup`，统一正式版与开发版构建配置。 @VirgilClyne
  * 调整 `Vercel` 部署入口为 `src/Hono.js`，并完善 Cloudflare Pages 的构建输出与路由配置。 @001ProMax @VirgilClyne
  * 新增覆盖空气质量 scale、NextHour 条件推导、降水总量、provider metadata、request availability、FlatBuffer overlay 与 selective decode 的回归测试。 @hhh2210
  * 新增 FlatBuffer 根表处理器契约、逐 slot 编解码、选择性数据集回写及 QWeather 预警的回归测试。 @VirgilClyne
