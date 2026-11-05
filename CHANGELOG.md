# v3.3.4 — 空气算法、配置语义与平台代理修复

本次针对 v3.3.3 与上游/PR #107 对比中复现的问题作定点修复，不覆盖旧标签。参考移植的算法代码保留 Horatio、PR #107 `831852f` 和 Apache-2.0 来源说明；未整套引入其 JSON 协商、缓存或额外依赖。

## 修复内容

- **算法与单位：**美标计算按污染物精度截断但保留物理浓度；PM10 超量程 604→605 的 AQI 从 500 连续到 501。修正 ppb/ppm 同单位转换、CN25 零值、加拿大 AQHI 单位一致性与四舍五入；缺少必要输入、未知算法及负分项不再伪装为有效结果。CO 仅在明确 mg/m³ 时转为 µg/m³，重复调用不放大、不修改原对象。
- **配置语义：**空 Replace 禁用指数替换，不被自动补入 HJ6332012；昨日来源不随今日来源暗改。算法 None、WeatherKit 与未知来源不默认计算；候选失败或指数未改变不重查昨日、不覆盖 Apple。已知比较依开关保留，未知比较只按显式来源补齐，WK3 继续限制同源同标准。
- **平台代理：**修正 Surge/Loon/Stash 响应阶段 `$done` 直接返回响应修改对象，请求阶段保留合成响应包装。修复 Surge 空数组参数；实际 `$argument` 控制请求超时与日志，而非只读取环境默认。
- **模块设置：**名称、类型、选项标签与帮助对照上游整理，保持 23 参数和 US 默认；保留本机兼容选项并注明范围。Stash 五脚本共用一个可编辑 argument；未支持的 WK3 天气/API 预警不伪装可用。
- **执行日志：**五平台共用 INFO 开始/结束及原有处理摘要，DEBUG/ALL 查看更多过程；OFF 静默。兼容只提供 console.log 的客户端，格式化时遮蔽令牌及完整私人设置。
- **验证：**将实际串行回归接入 CI，再构建旧入口与五平台发行产物；每份模块必须含五条正确平台/版本脚本引用，避免零匹配假通过。修复分支 [Build 42037645244](https://github.com/patrickyanxxxxx/WeatherKit-WK3/actions/runs/42037645244) **338/338 通过、0 跳过**，构建和归档成功。

## 默认与升级

默认仍为今日/昨日 `ColorfulCloudsUS`、内置算法 `WAQI_InstantCast_US`（只在 Calculate 时使用）、分钟彩云、预警 QWeatherWeb、INFO、单次 8000ms。已保存参数不会被强制重置，更新模块后请核对自己的选项。

使用本 Fork Release 附件中名称含 `.WK3.` 的模块；Egern/Surge/Loon/Stash/QX 均引用对应版本平台脚本。最新入口：[Egern](https://github.com/patrickyanxxxxx/WeatherKit-WK3/releases/latest/download/iRingo.WeatherKit.WK3.yaml)、[Surge](https://github.com/patrickyanxxxxx/WeatherKit-WK3/releases/latest/download/iRingo.WeatherKit.WK3.sgmodule)、[Loon](https://github.com/patrickyanxxxxx/WeatherKit-WK3/releases/latest/download/iRingo.WeatherKit.WK3.lpx)、[Stash](https://github.com/patrickyanxxxxx/WeatherKit-WK3/releases/latest/download/iRingo.WeatherKit.WK3.stoverride)、[Quantumult X](https://github.com/patrickyanxxxxx/WeatherKit-WK3/releases/latest/download/iRingo.WeatherKit.WK3.snippet)。保留 v3.3.3 便于回退；现用 Gist 未修改。

## 保留的边界

- v3.3.3 Egern 用户反馈正常；**本补丁尚无新设备验收**，其他平台代理仍仅模拟/脚本回放。
- WK3 当前/逐日/逐小时天气仍透传，未知结构不猜测写入；QX 二进制仍透传，Shadowrocket 无本机 WK3 模块。
- 12 个选项包含 None；WK3 不保证所有算法目标可编码。InstantCast 单组浓度计算不等同于 EPA NowCast 时间加权，也不自动提供加拿大 AQHI 的三小时均值。
- 已被来源错误标为 µg/m³ 的 CO 无法仅凭单位判断原值应否放大，不凭猜测修正。跨来源/算法昨日比较不伪造结果。

---

# v3.3.3 — WK3 本机处理与多平台代理统一架构

基于 NSRingo/WeatherKit v3.3.2，保留上游 WK2 入口与中文独立提交历史，增加 iOS 27 WK3 本机处理。Egern、Surge、Loon、Stash、Quantumult X 共用 `src/wk3/` 业务核心、参数与路由，客户端只适配运行时。

## 更新内容

- WK3 空气质量有界替换：支持已验证的国标转彩云美标及同标准更新，香港 Apple 缺 AQ 时按条件补入彩云美标；保留其他数据槽与未知字段。
- 增加已验证结构的分钟降水、同源同标准昨日空气等级比较；来源或结构不兼容时保持原始数据。
- 严格匹配 Apple 原有预警事件后补全原生详情，保留原事件 ID；不能匹配时不伪造预警。
- 内置空气质量提供上游 12 个选项（包含 `None`），默认 **`WAQI_InstantCast_US`**；仅当今日指数来源选为 `Calculate` 时执行本地算法。今日、昨日来源默认仍为 **`ColorfulCloudsUS`**。
- 统一五平台构建：版本化发行生成 10 份独立 JS 和 5 份 WK3 模块；Egern 的 23 项参数、五类脚本、七条分流规则保留。五类路由同源，排除 `wk3_` 原生预警标识的重复匹配。
- 修复 Fork CI 的缺失 checkout token、包读取令牌回退和 Node latest 漂移，固定 Node 22；无新增依赖。

## 下载与安装

推荐使用本次发行中**文件名包含 `.WK3.`** 的模块，不要用旧版模块来测试 WK3。

| 客户端 | 模块下载 | 验证范围 |
| --- | --- | --- |
| Egern | [iRingo.WeatherKit.WK3.yaml](https://github.com/patrickyanxxxxx/WeatherKit-WK3/releases/download/v3.3.3/iRingo.WeatherKit.WK3.yaml) | 本机接口与合成回放通过；本次 Rollup 产物尚无设备验收。 |
| Surge | [iRingo.WeatherKit.WK3.sgmodule](https://github.com/patrickyanxxxxx/WeatherKit-WK3/releases/download/v3.3.3/iRingo.WeatherKit.WK3.sgmodule) | 参数、字节回放及实际脚本合成 AQI 60→87 通过；尚无设备验收。 |
| Loon | [iRingo.WeatherKit.WK3.lpx](https://github.com/patrickyanxxxxx/WeatherKit-WK3/releases/download/v3.3.3/iRingo.WeatherKit.WK3.lpx) | 参数与二进制脚本模拟通过；尚无设备验收。 |
| Stash | [iRingo.WeatherKit.WK3.stoverride](https://github.com/patrickyanxxxxx/WeatherKit-WK3/releases/download/v3.3.3/iRingo.WeatherKit.WK3.stoverride) | 配置、参数及二进制脚本模拟通过；尚无设备验收。 |
| Quantumult X | [iRingo.WeatherKit.WK3.snippet](https://github.com/patrickyanxxxxx/WeatherKit-WK3/releases/download/v3.3.3/iRingo.WeatherKit.WK3.snippet) | 仅请求/文本路径；**WK3 二进制天气透传，不转换**，无交互参数界面。 |

先停用冲突的旧天气模块，再安装对应客户端模块；模块会下载同版本、对应平台的 JS。不要跨平台交换脚本。现用 Gist 没有被替换，旧 Gist 用户不会被自动升级。发行包保留的上游非 WK3 产物属于旧入口，不是本次 WK3 推荐安装项。

## 默认配置

- 今日/昨日空气指数：`ColorfulCloudsUS`；原始标准替换范围 `HJ6332012`。
- 本地计算算法：`WAQI_InstantCast_US`，仅 `Calculate` 来源时使用。
- 分钟降水：`ColorfulClouds`；预警：`QWeatherWeb`，可选 `WeatherKit` 原样透传。
- WK2 天气来源：`ColorfulClouds`；逐日/逐小时替换默认均关闭。
- 替换范围 `CN`，香港缺 AQ 有专用条件；日志 `INFO`、单次请求超时默认 8000 毫秒。设备已保存参数不会被默认值强制覆盖。

## 已知限制

- **WK3 当前、逐日、逐小时天气尚无经真实样本验证的 codec，仍保持 Apple 原始数据**；选择 WK2 天气来源不能解锁这些 WK3 替换能力。
- Quantumult X 的 WK3 AQ、分钟雨等二进制修改不支持；Shadowrocket 没有 WK3 本机模块。
- 新发行产物没有各客户端实机验收；原 Gist 的历史设备确认不能替代本版验证。预警补全依赖严格唯一匹配，网络及第三方服务也可能不可用。
- 12 个算法选项不代表所有目标标准都可写入 WK3。无法确认的跨标准转换会透传；AQHI 配置及单位换算限制沿用上游实现。

## 验证记录

- 共享核心与平台测试 **106/106** 通过，发行构建测试 **2/2** 通过，分组执行避免本机并发打包超时。
- `72229ed` 的 GitHub Build [42004403531](https://github.com/patrickyanxxxxx/WeatherKit-WK3/actions/runs/42004403531) 通过安装、旧入口构建、WK3 构建、产物检查及归档；CI 构建成功不等于客户端实机通过。
- 此次架构迁移保留 26 个协议、算法、来源文件的内容不变，更新导入和构建路径；CLI 与资源命名保持兼容。
