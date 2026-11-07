# WK3 模块：安装与参数

[返回项目首页](../README.md) · [完整发行记录](../CHANGELOG.md)

推荐从 [Releases](https://github.com/patrickyanxxxxx/WeatherKit-WK3/releases/latest) 安装文件名包含 **`.WK3.`** 的对应客户端模块。模块引用同一版本的两个平台专用 JS，下载脚本由客户端完成，运行和数据转换在设备本机执行；第三方数据仍需要联网获取。不要跨客户端混用 JS，也不要同时启用正式普通模块与测试普通模块。

## 下载与配置入口

| 客户端 | 正式模块 | 参数入口 |
| --- | --- | --- |
| Egern | [iRingo.WeatherKit.WK3.yaml](https://github.com/patrickyanxxxxx/WeatherKit-WK3/releases/latest/download/iRingo.WeatherKit.WK3.yaml) | 模块设置面板；空气指数来源及算法显示中文，旧内部值仍兼容。 |
| Surge | [iRingo.WeatherKit.WK3.sgmodule](https://github.com/patrickyanxxxxx/WeatherKit-WK3/releases/latest/download/iRingo.WeatherKit.WK3.sgmodule) | 模块参数。 |
| Loon | [iRingo.WeatherKit.WK3.lpx](https://github.com/patrickyanxxxxx/WeatherKit-WK3/releases/latest/download/iRingo.WeatherKit.WK3.lpx) | 插件参数面板。 |
| Stash | [iRingo.WeatherKit.WK3.stoverride](https://github.com/patrickyanxxxxx/WeatherKit-WK3/releases/latest/download/iRingo.WeatherKit.WK3.stoverride) | 编辑首条脚本 `argument` 中的 JSON，其余四条共享。 |
| Quantumult X | [iRingo.WeatherKit.WK3.snippet](https://github.com/patrickyanxxxxx/WeatherKit-WK3/releases/latest/download/iRingo.WeatherKit.WK3.snippet) | 无交互参数面板；请求／文本路径可用，WK3 二进制天气始终透传。 |

启用 MITM 并信任证书，确认 `weatherkit.apple.com` 被处理。升级整个模块，不只替换某一条脚本；客户端可能保留旧参数，更新后请核对来源、算法和替换目标。独立实验雷达模块可与普通模块并用，但本目录的普通模块不包含二维雷达计算。

旧 `iRingo.WeatherKit.Rewrite.*` 是上游兼容入口，不是本 Fork 的 WK3 本机推荐模块。仓库中的 `iRingo.WeatherKit.WK3.yaml` 为生成配置，正式安装优先使用发行附件。

## 23 项参数

下表列出模块生成默认值，内部键名保留以便 Surge／Stash 配置及问题定位。Egern 的中文显示值会在脚本入口还原为对应内部值。

| 参数 | 默认值 | 用途 |
| --- | --- | --- |
| `DataSets` | airQuality、currentWeather、forecastDaily、forecastHourly、forecastNextHour、locationInfo、news、historicalComparisons、weatherAlerts、weatherChanges | 选择数据集；WK3 仅改 AQ、分钟降水、预警，其余透传。空值／`[]` 关闭处理。 |
| `Weather.Replace` | `CN` | 普通天气处理范围；WK3 AQ 独立处理，不受此项限制。 |
| `Weather.Provider` | `ColorfulClouds` | WK2 天气来源；不改变 WK3 当前、逐日、逐小时天气。 |
| `Weather.ReplaceDaily` | `false` | WK2 逐日替换开关。 |
| `Weather.ReplaceHourly` | `false` | WK2 逐小时替换开关。 |
| `WeatherAlerts.Provider` | `QWeatherWeb` | 和风网页补全 Apple 已有预警；`WeatherKit` 保留原数据。 |
| `NextHour.Provider` | `ColorfulClouds` | 单点下一小时雨雪分钟来源，也可选 `QWeather`／`WeatherKit`。 |
| `AirQuality.Current.Index.Provider` | `Calculate` | 今日指数来源：内置算法、`ColorfulCloudsUS`、`ColorfulCloudsCN` 或 `QWeather`。 |
| `AirQuality.Current.Index.Replace` | `HJ6332012` | 要替换的**原始标准**；逗号分隔，空值／`[]` 不替换。 |
| `AirQuality.Current.Index.ForceCNPrimaryPollutants` | `true` | 国标不超过 50 时仍显示主要污染物。 |
| `AirQuality.Current.Pollutants.Provider` | `ColorfulClouds` | 原 Apple 污染物缺失时的补全来源，可选和风。 |
| `AirQuality.Current.Pollutants.Units.Replace` | `[]` | 要转换单位的标准；默认不额外转换。 |
| `AirQuality.Current.Pollutants.Units.Mode` | `Scale` | 标准单位、指定单位或强制单位；`None` 保留来源单位。 |
| `AirQuality.Comparison.ReplaceWhenCurrentChange` | `false` | 指数变化后是否重算已有有效趋势。 |
| `AirQuality.Comparison.Yesterday.IndexProvider` | `ColorfulCloudsUS` | 昨日指数来源；比较逻辑见下文。 |
| `AirQuality.Comparison.Yesterday.PollutantsProvider` | `QWeather` | 昨日内置计算需要的真实污染物来源。 |
| `AirQuality.Calculate.Algorithm` | `EU_EAQI` | 内置算法选择，见下表。 |
| `AirQuality.Calculate.AllowOverRange` | `true` | 允许内置国标／美标超过 500；不绕过有效性与编码范围校验。 |
| `API.ColorfulClouds.Token` | 空 | 自有彩云令牌；空值使用原有公开令牌。 |
| `API.QWeather.Host` | `devapi.qweather.com` | 按和风账户提供的 API 主机配置。 |
| `API.QWeather.Token` | 空 | 使用和风 API 时填写；和风网页预警不需要。 |
| `LogLevel` | `INFO` | `DEBUG`／`ALL` 显示更多细节，`OFF` 静默。 |
| `HTTP_TIMEOUT_MS` | `8000` | 单次脚本网络请求超时，单位毫秒；宿主脚本总超时另计。 |

### 内置算法

| 内部值 | 显示含义 |
| --- | --- |
| `None` | 不转换 |
| `UBA` | 德国 LQI |
| `EU_EAQI` | 欧盟 EAQI |
| `WAQI_InstantCast_US` | 美标 InstantCast |
| `WAQI_InstantCast_CN` | 国标 InstantCast（2012） |
| `WAQI_InstantCast_CN_25_DRAFT` | 国标 InstantCast（2025 草案，非正式标准） |
| `CA_AQHI` | 加拿大 AQHI |
| `HK_AQHI` | 香港 AQHI |
| `AQHI_Multi_CN` | AQHI-Multi（中国） |
| `AQHI_Multi_CN_HK` | AQHI-Multi（中国＋香港） |
| `CN_DEATH_AQHI` | 中国健康风险 AQHI |
| `CN_DEATH_HK_AQHI` | 中国＋香港健康风险 AQHI |

只有今日来源选择 `Calculate` 才执行上表算法；Egern 面板显示“iRingo内置算法”。已有 Apple 污染物优先保留，缺失时才取所选来源。

### 替换目标和地区

替换目标描述输入而非输出。例如原响应为 `EPA_NowCast` 时，只填 `HJ6332012` 不会转成欧盟；按需加入 `EPA_NowCast`、`EU.EAQI`、`UBA`、`CA.AQHI`、`HK.AQHI`、`CN.AQHI`。空目标必须继续保持关闭效果，不会自动补进所有标准。

台北／澳门不再被普通天气地区判断拦住，但数据源本身仍有支持范围。Apple 污染物存在时可本地计算；台北原响应缺失且 `country=TW` 时，彩云上游 AQ 白名单不含 TW，应选支持 TW 的和风并配置有效 API。请求失败或缺少必要污染物时保留原数据，不更改国家码。

### 昨日比较

- 相同来源、标准及算法的两天数据比较类别趋势。
- 今日显示标准与昨日选择不同时，彩云美标／国标来源可按上游流程比较**彩云自己的今日与昨日**；趋势来源会写入署名和日志。不是把欧盟类别与美标类别硬比较。
- 内置昨日重算需要实际历史污染物。彩云只给昨日类别时，不能据此重算其他算法；和风历史受地区、账户及接口可用性限制。
- `false` 保留有效原趋势；来源失败只使比较未知，不应阻断今日指数。

## 如何看日志

在 `WeatherKit.api.weather.response` 查看 `WK3 AQ patch`、`WK3 missing AQ patch`、`WK3 nextHour patch`、`WK3 alerts summary/details`。`WK3 alerts titles` 提供有限的标题对照，不含 UUID、URL 或坐标载荷。

`[buildSettings] Settings: [REDACTED]` 是敏感设置脱敏，不是报错；`✅ response` 只表示执行结束，不代表每项转换都成功。EAQI 标尺使用 Apple 原生无版本资源，脚本不再合成这条色带。旧测试构建标识不会出现在正式脚本。

## 功能边界

- WK3 AQ、雨雪分钟和原预警补全可用，其他天气产品继续保留原数据。
- 泛称预警是同地区、同等级、精确时间、唯一候选约束下的推断；缺项或歧义不转详情，事件 UUID 不重生成。
- 轻雪的未命名文字条件可省略，数值曲线是否正确显示仍取决于具体客户端和天气结构。
- 一小时二维雷达地图另见 [首页实验进度](../README.md#一小时降水雷达地图开发中)，本次普通模块发行不启用实验后端。
