### 🆕 New Features
  * 新增天气预警数据源设置：默认从 FlatBuffer 的 QWeather 灾害预警链接抓取并解析网页，同时保留用户自定义 QWeather API、彩云天气 API 和 WeatherKit 原始数据三种选项。 @VirgilClyne
  * QWeather 网页预警现在由数据源方法直接生成完整的 `weatherAlerts` 顶级对象，并将详情链接转换为 WeatherKit 域名的内部链接。 @VirgilClyne

### 🛠️ Bug Fixes
  * 修复 QWeather 网页预警标题裁剪，移除“天津市气象台更新”等发布机构前缀，同时保留“雷雨大风蓝色预警”等完整等级标题。 @VirgilClyne
  * 拆分 QWeather 地区标识和 API 坐标两条天气预警规则：地区标识严格匹配 9 位 Location ID，坐标继续交给用户配置的 API 处理，并在 Rewrite 模板与各客户端模块中保持一致。 @VirgilClyne

### ‼️ Breaking Changes
  * none

### 🔄 Other Changes
  * 将天气预警来源的 HTML 抓取、字段解析、`detailsUrl`、`attributionUrl` 和 metadata 构造收拢到 QWeather 与彩云天气数据源方法，Response 仅负责选择来源并合并顶级 slot。 @VirgilClyne
  * 将数据源标志补全收拢到实际注入流程；WeatherKit 直通和仅解析的数据不再被修改，空值、Apple、WeatherKit 与未知来源不再补充标志。 @VirgilClyne
  * 将 QWeather 内部版本更新至 `v5.3.0`、彩云天气内部版本更新至 `v4.2.2`，并补充 HTML 解析、数据源切换、严格 9 位地区标识和原始数据直通的回归测试。 @VirgilClyne
