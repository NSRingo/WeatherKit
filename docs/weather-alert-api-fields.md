# WeatherAlert API 字段映射说明

本文记录 Apple 官方 `alertDetails` 页面、`/api/v1/weatherAlerts` JSON 和本项目 QWeather 转换器之间的字段对应关系。

## 官方入口与请求参数

官方页面入口：

```text
https://weatherkit.apple.com/alertDetails/index.html?ids={ids}&lang={language}&timezone={timezone}&party={party}
```

页面 bundle 会读取以下查询参数：

| 参数 | 官方页面用途 | 本项目用法 |
| --- | --- | --- |
| `ids` | 传给 `/api/v1/weatherAlerts?lang=...&ids=...` 获取预警 JSON。官方形态通常是逗号分隔 WeatherAlert UUID。 | 模块改写后，坐标形态为 `{latitude},{longitude}`，由本项目接口转为 QWeather Alert API 请求。旧 QWeather 页面标识仍由脚本兼容。 |
| `lang` | 选择页面本地化文案，并筛选 `messages[].language`。 | 传给 QWeather 的语言参数，并写回 `messages[].language`。 |
| `timezone` | 只用于页面时间格式化。 | 从原始 WeatherKit 请求透传到 `alertDetails` 页面 URL。 |
| `party` | `party=apple` 表示 Apple 第一方上下文，会隐藏部分第三方脚注。 | 生成坐标版 `alertDetails` URL 时固定写 `apple`。 |

官方页面实际请求数据时只拼接：

```text
/api/v1/weatherAlerts?lang={lang}&ids={ids}
```

`timezone` 和 `party` 不传给 API，只影响页面渲染。

## 官方页面显式渲染字段

官方 bundle 的页面处理流程是：先解析 `/api/v1/weatherAlerts` 返回的数组，再过滤出有效事件。有效事件至少需要：

- `description`
- `severity`
- `effectiveTime`
- `source`

页面会直接渲染或显式消费以下字段：

| JSON 字段 | 页面位置 | 官方处理 | 本项目当前填充值 |
| --- | --- | --- | --- |
| `description` | 卡片标题 | 作为每张预警卡片标题。 | QWeather 标题去掉 `xxx发布` 前缀后的预警名称，例如 `高温橙色预警`。 |
| `severity` | 严重程度区块 | 显示本地化严重程度文案。 | QWeather `severity` 规范化为 `extreme` / `severe` / `moderate` / `minor` / `unknown`。 |
| `eventOnsetTime` | 事件开始时间区块 | 有值才显示，按 `timezone` 格式化。 | QWeather `onsetTime`，没有则回退 `effectiveTime`。HTML 分支回退发布时间。 |
| `messages[].text` | 描述区块 | 会处理换行和 URL 自动链接；多语言消息按 `lang` 筛选。 | `description`、`criteria`、防御指南按空行拼接；防御指南继续保留在描述中。 |
| `messages[].language` | 描述区块方向和筛选 | 用于语言筛选和文字方向。 | 来自页面 `lang` 参数。 |
| `responses[]` | 建议的行动 | 固定枚举 token 会被转换为本地化行动文案。 | 优先用 QWeather `responseTypes`；没有则从防御指南推断。 |
| `urgency` | 紧急程度区块 | 有值才显示本地化紧急程度文案。 | QWeather `urgency` 规范化；没有则 `unknown`。 |
| `areaName` | 受影响区域区块 | 有值才显示。 | QWeather `areaName`；HTML 分支使用页面城市/行政区。 |
| `source` | 签发者区块 | 作为“签发者 / Issued By”的主文本。 | QWeather `senderName`，或 HTML 标题里的 `xxx气象台`；不是数据来源网站。 |
| `reportedAt` | 签发者区块脚注 | 官方脚本只在 `eventSource === "EUMETNET"` 时保留；其他来源会置空。 | 仍写入发布时间，供兼容和非官方渲染使用；Apple 官方页面对 CN 不显示。 |
| `attributionURL` | “查看警报来源”链接 | 作为签发者区块下的来源链接。 | API 分支使用 `https://www.12379.cn/`；HTML 分支使用对应 QWeather 页面。 |
| `eventSource` | 脚注/免责声明逻辑 | 不单独显示；用于 EUMETNET 免责声明和部分国家脚注。 | 中国预警写 `CN`。 |

`responses[]` 支持的官方枚举顺序：

```text
evacuate, shelter, execute, prepare, avoid, monitor, assess, allClear, none
```

如果 `responses` 同时包含多个动作且包含 `none`，官方页面会移除 `none`，避免“无需行动”和其他行动同时出现。

## 官方页面间接使用或不显示的字段

这些字段属于官方 JSON 结构，但 `alertDetails` 页面不会直接画成一行：

| JSON 字段 | 页面用途 | 本项目当前策略 |
| --- | --- | --- |
| `id` | React key、锚点、详情链接片段。 | 用来源标识和预警标识生成稳定 UUID。 |
| `detailsUrl` | 官方 JSON 中通常是 `#{id}`。 | 写为 `#{id}`。 |
| `areaId` | 官方 JSON 保留字段，页面不显示。 | QWeather 有 `areaId` / `areaCode` 就透传；HTML 分支从页面标识末尾行政代码取得。 |
| `countryCode` | 官方 JSON 保留字段，页面不显示。 | 坐标/API 分支默认 `CN`；页面标识以 `101` 开头也写 `CN`。 |
| `effectiveTime` | 有效事件必需字段，页面不单独显示。 | QWeather `effectiveTime`，没有则用 `issuedTime`。 |
| `expireTime` | 参与时间对象转换；9999 年会被官方页面置空。 | QWeather `expireTime` / `expiresTime`；HTML 分支用 `9999-12-31T23:59:59Z`。 |
| `eventEndTime` | 官方 JSON 保留字段，页面当前不显示。 | QWeather `eventEndTime` / `endTime` / `expireTime`。 |
| `issuedTime` | 官方 JSON 保留字段，页面当前不显示。 | QWeather `issuedTime`。 |
| `certainty` | 官方 JSON 保留字段，页面当前不显示。 | QWeather `certainty` 规范化；没有则 `unknown`。 |
| `importance` | 官方 JSON 保留字段，页面当前不显示。 | QWeather 有值就透传；否则从 `severity` 推导：`extreme/severe -> high`、`minor -> low`、其他 `normal`。 |
| `significance` | 官方 JSON 保留字段，页面当前不显示。 | 仅透传可识别枚举：`advisory` / `watch` / `warning` / `statement` / `emergency` / `unknown`。 |
| `phenomenon` | 官方 JSON 保留字段，页面当前不显示。 | QWeather `eventType.name`。HTML 分支不伪造。 |
| `token` | 官方 JSON 保留字段，页面当前不显示。 | QWeather `token`，没有则用 `eventType.code` 或 `icon`。 |
| `name` | 官方 JSON 类型名。 | 固定 `WeatherAlert`。 |
| `precedence` | 官方 JSON 排序/优先级字段。 | 使用数组下标。 |

## 数据来源语义

字段语义必须保持分离：

| 语义 | 字段 | 示例 |
| --- | --- | --- |
| 签发机构 | `source` | `南京市气象台` |
| 数据发布/聚合网站链接 | `attributionURL` | `https://www.12379.cn/` 或 QWeather 页面 |
| 页面数据来源文字兜底 | HTML 提取时的 `data-source__txt` | `国家预警信息发布中心` |

也就是说，`source` 不是“国家预警信息发布中心”这种网站/平台名，除非无法拿到具体签发机构时才作为兜底。

## 本项目转换入口

| 入口 | 位置 | 说明 |
| --- | --- | --- |
| HTML 页面提取 | `src/class/WeatherAlerts.mjs` 的 `ExtractQWeather()` | 保留旧 QWeather 页面解析；从页面标题提取签发机构，从防御指南提取 `guidelines`。 |
| API 坐标提取 | `src/class/QWeather.mjs` 的 `WeatherAlert()` | 请求 QWeather `weatheralert/v1/current/{latitude}/{longitude}`，标准化为 `WeatherAlerts.Build()` 可消费结构。 |
| Apple JSON 构造 | `src/class/WeatherAlerts.mjs` 的 `Build()` | 输出官方 `/api/v1/weatherAlerts` 数组形态。 |
| v2 FlatBuffer 链接改写 | `src/class/WeatherAlerts.mjs` 的 `RewriteFlatBufferDetailsURL()` | 只改写现有 v2 `weatherAlerts` 的 `detailsUrl` / `attributionUrl` 到坐标版官方页面。 |

## 参考

- 官方页面：`https://weatherkit.apple.com/alertDetails/index.html`
- 官方 bundle：`https://weatherkit.apple.com/alertDetails/weather_alert.bundle.9559725d9c2934872fd6.js`
- 官方 API 形态：`https://weatherkit.apple.com/api/v1/weatherAlerts?lang=zh-CN&ids={ids}`
