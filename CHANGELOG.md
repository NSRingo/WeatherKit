### 🆕 New Features
  * 新增 `Cloudflare Pages` 部署支持，提供 `functions/[[route]].js`、`pages/_routes.json` 以及独立的 Pages / Workers 开发与部署脚本；同时调整 `Vercel` 入口为 `edge/vercel.js`，统一 `Hono` 云端入口。 @001ProMax
  * 新增 FlatBuffer root overlay 编码能力，仅重写实际变更的数据集，并保留 Apple 未知或新增的根产品表，提升对新 `WeatherKit` schema 的兼容性。 @hhh2210

### 🛠️ Bug Fixes
  * 修复 `forecastNextHour` 在 iOS 27 下因元数据过期过快而失效的问题，并完善多段降水状态推导与描述匹配，避免复合天气短语被后续关键词错误覆盖。 @hhh2210
  * 修复 `WeatherKit` `dataSets` 与 availability 改写逻辑：仅过滤插件可注入的数据集，保留 Apple 原生 capability，避免固定列表吞掉新增能力或数据集。 @hhh2210
  * 修复天气注入后每日降水量字段的保留逻辑，避免第三方数据覆盖或破坏 `WeatherKit` 原始的全天 / 白天 / 夜间降水总量配对关系。 @hhh2210
  * 修复空气质量数据兼容性：统一 Apple 内置 AQ scale 为无版本别名、迁移旧 scale 标识、忽略不可用等级哨兵值，并修正和风天气 `reportedTime` 为 epoch seconds。 @hhh2210
  * 修复 `forecastNextHour` FlatBuffer 编码时未知天气枚举被静默编码为 `CLEAR` 的问题。 @hhh2210

### 🔣 Dependencies
  * 切换 `@nsnanocat/util` 到公共 npm registry 来源。 @hhh2210

### ‼️ Breaking Changes
  * none

### 🔄 Other Changes
  * 更新 `DataSets` 参数默认值与说明，明确其仅控制插件可修改的数据集，其余 Apple 数据集继续透传。 @hhh2210
  * 为 `Hono` 根路径新增 `GET /` 健康检查响应 `OK`。 @hhh2210
  * 新增覆盖空气质量 scale、NextHour 条件推导、降水总量、provider metadata、request availability、FlatBuffer overlay 与 selective decode 的回归测试。 @hhh2210
