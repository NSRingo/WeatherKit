# v3.3.7 — 修复 Surge WK3 二进制回传与天气增强无效果

修复 Surge 普通模块在已有脚本执行记录时仍无法正常显示天气增强数据的问题。用户已确认 `3.3.6-test-surge-binary.1` 测试版通过，本版纳入同一项原生字节回传修复。

## 修复内容

- **Surge 使用原生二进制回传：**启用 `binary-body-mode` 时，将 ArrayBuffer、Uint8Array 及其他 TypedArray 的准确字节范围作为 `Uint8Array` 返回给 Surge。避免原先转换成字符串后，被宿主按 UTF-8 再编码而损坏 WK3 FlatBuffer。
- **保留原天气数据：**修复覆盖需要改写的 AQ、分钟雨与预警响应，也覆盖海外等应保留原数据的响应。文本结果继续使用字符串；Loon、Stash、Egern、Quantumult X 的现有输出方式保持不变。
- **补充宿主接口回归：**检查高位字节、请求／响应输出、子数组边界和文本透传；纠正旧测试先将字符串按字符码恢复再解码、因而未覆盖宿主 UTF-8 编码行为的问题。
- 23 项模块参数、默认来源、空气质量算法及原有回退处理保持不变。

## 实机验证

用户确认 Surge 测试版通过。真实抓包中五份完整 WK3 响应均可直接正常解码，不再出现二进制转字符串后的 UTF-8 二次编码；四份国内／香港响应的彩云美标 AQI 与同批数据源一致，三份大陆响应已写入彩云分钟雨；另有匹配预警的标题、发布机构及 Apple 原生详情入口。海外响应保留原来源。

本轮分钟雨样本均为零降水，预警详情正文未在抓包中点击验证；这些具体边界不扩展为逐项界面验收。抓包及个人信息不纳入发行附件。

## 下载与升级

| 客户端 | 正式模块 |
| --- | --- |
| Surge | [iRingo.WeatherKit.WK3.sgmodule](https://github.com/patrickyanxxxxx/WeatherKit-WK3/releases/download/v3.3.7/iRingo.WeatherKit.WK3.sgmodule) |
| Egern | [iRingo.WeatherKit.WK3.yaml](https://github.com/patrickyanxxxxx/WeatherKit-WK3/releases/download/v3.3.7/iRingo.WeatherKit.WK3.yaml) |
| Loon | [iRingo.WeatherKit.WK3.lpx](https://github.com/patrickyanxxxxx/WeatherKit-WK3/releases/download/v3.3.7/iRingo.WeatherKit.WK3.lpx) |
| Stash | [iRingo.WeatherKit.WK3.stoverride](https://github.com/patrickyanxxxxx/WeatherKit-WK3/releases/download/v3.3.7/iRingo.WeatherKit.WK3.stoverride) |
| Quantumult X | [iRingo.WeatherKit.WK3.snippet](https://github.com/patrickyanxxxxx/WeatherKit-WK3/releases/download/v3.3.7/iRingo.WeatherKit.WK3.snippet) |

Surge 用户先停用 `3.3.6-test-surge-binary.1` 或旧普通模块，安装／更新整个正式模块，确认五类脚本均引用 v3.3.7，再核对已保存的个人参数。MITM 需启用 `weatherkit.apple.com` 并信任证书。独立雷达模块可继续启用；请勿同时启用两个普通天气模块。

本次沿用五平台发行构建，模块自动加载各自同版本的 JS，无需手动导入脚本，也不能跨平台交换脚本。

## 保留的限制

- WK3 当前、逐日及逐小时天气继续保留 Apple 数据。
- Quantumult X 的 WK3 二进制天气响应继续直通，Shadowrocket 暂无本机 WK3 模块。
- 预警仅补全可严格匹配的 Apple 原事件；第三方数据源失败或结构不兼容时保留原数据。
- 部分城市 UV 防晒时段建议可能显示英文，既有问题本次未修改。
- 本次发行只包含普通天气模块的 Surge 修复，实验雷达继续在独立分支维护。

---

# v3.3.6 — 大陆缺失空气质量补入与 Loon、预警兼容修复

合入 `wk3/ios27-wk3-review` 的已验收修复，保留中文独立提交。用户已确认 Loon 测试版 2 可用，并确认 Egern 测试版的大陆缺 AQ 补入生效；Surge、Stash 本轮通过实际压缩脚本及抓包回放，尚无对应设备反馈。

## 更新内容

- **大陆缺 AQ 自动补入：**Egern、Surge、Loon、Stash 共用已验证的美标编码器。当 WK3 原响应缺少 AQ 子表、请求和设置启用 `airQuality`、天气替换范围命中大陆、今日来源为 `ColorfulCloudsUS` 且指数替换目标非空时，补入完整美标指数、污染物、单位、来源和同源昨日等级比较。已有 AQ 继续按原始标准与替换目标处理；数据源不可用或数据不完整时保留原响应。原预警及其他天气数据保留。
- **Loon 原生字节回写：**ArrayBuffer、TypedArray 按准确字节范围作为 `Uint8Array` 回传，避免二进制转字符串导致天气不可用；文本响应保持字符串。
- **保留 Apple availability：**合并 Apple 原有能力并补齐模块能力，保留未知字段、错误状态及语言响应头，不再用固定列表覆盖或把错误强制改成 200。
- **非 Egern 预警兼容：**Surge、Loon、Stash、Quantumult X 构建兼容普通响应头的大小写，预警定位符采用局部 Base64 编解码，减少对宿主 API 的依赖。保留原 Apple 事件 UUID、严格唯一匹配和载荷校验；Egern 预警实现保持原样。Quantumult X 的修复限于预警详情请求，二进制响应仍直通。
- 保留五平台共享核心、23 项模块参数、US 默认、日志等级与脱敏；没有新增依赖或缓存层。

## 模块下载与升级

安装文件名含 `.WK3.` 的对应平台模块；同次发行的十份 JS 为模块自动加载的依赖，无需单独导入。附件中的旧上游模块不是 WK3 推荐入口。

| 客户端 | 本次模块 | 设置与支持范围 |
| --- | --- | --- |
| Egern | [iRingo.WeatherKit.WK3.yaml](https://github.com/patrickyanxxxxx/WeatherKit-WK3/releases/download/v3.3.6/iRingo.WeatherKit.WK3.yaml) | 原生模块参数面板；大陆补 AQ 已有测试版实机确认，预警实现不变。 |
| Surge | [iRingo.WeatherKit.WK3.sgmodule](https://github.com/patrickyanxxxxx/WeatherKit-WK3/releases/download/v3.3.6/iRingo.WeatherKit.WK3.sgmodule) | 模块参数；支持 WK3 AQ、分钟雨、昨日比较及匹配预警补全。 |
| Loon | [iRingo.WeatherKit.WK3.lpx](https://github.com/patrickyanxxxxx/WeatherKit-WK3/releases/download/v3.3.6/iRingo.WeatherKit.WK3.lpx) | 插件参数面板；已验收测试版 2 的字节回写、缺 AQ 和预警修复纳入正式版。 |
| Stash | [iRingo.WeatherKit.WK3.stoverride](https://github.com/patrickyanxxxxx/WeatherKit-WK3/releases/download/v3.3.6/iRingo.WeatherKit.WK3.stoverride) | 编辑首条脚本 argument 的 JSON，其他四条通过 YAML 锚点共享。 |
| Quantumult X | [iRingo.WeatherKit.WK3.snippet](https://github.com/patrickyanxxxxx/WeatherKit-WK3/releases/download/v3.3.6/iRingo.WeatherKit.WK3.snippet) | 无模块参数面板；请求/文本路径可用，WK3 二进制响应直通，不执行 AQ、分钟雨或预警摘要改写。 |

停用测试模块或其他冲突天气模块，再安装或更新对应正式模块；不要同时启用测试版和正式版。五类脚本分别负责 availability 响应、空气标尺请求、预警网页请求、原生预警详情请求、天气响应。MITM 需启用 `weatherkit.apple.com` 并信任证书。下载后脚本在代理 App 本机执行，Apple、彩云、和风数据仍需联网。

默认今日/昨日指数来源为 `ColorfulCloudsUS`，指数替换目标 `HJ6332012`，内置算法 `WAQI_InstantCast_US`（仅来源选 `Calculate` 时运行）；分钟雨 `ColorfulClouds`、预警 `QWeatherWeb`、天气范围 `CN`、日志 `INFO`、单次请求超时 8000ms。已有个人参数不会被强制重置。空指数替换目标禁用大陆缺 AQ 补入；选择 `WeatherKit`、算法 `None` 或非美标来源不会触发这条补入路径。

查看 `WeatherKit.api.weather.response` 日志可确认 AQ 执行过程；成功补入包含 `WK3 missing AQ patch`，availability 日志不代表天气补入已经运行。

## 已知问题与限制

- **保留 UV 英文建议问题：**部分城市紫外线卡片的防晒时段建议显示英文，例如 `Use sun protection 11:00–16:00.`，标题和等级仍为中文。本次没有修改该文案或语言设置。现有代码核查及历史成都抓包回放未发现 UV 产品被改写；客户端本地化回退是候选解释，根因尚未证实。
- WK3 当前、逐日、逐小时天气仍保留 Apple 数据；参数中的天气来源选择不能启用这些 WK3 替换功能。分钟雨只处理已验证结构。
- 预警仅补全可严格匹配的 Apple 原有事件，不凭空新增；第三方网页变化或失配时保留原信息。未实现上游预警 API 来源。
- Quantumult X 二进制限制如上；Shadowrocket 暂无本机 WK3 模块。

## 验证

测试分支 [Build 42123745628](https://github.com/patrickyanxxxxx/WeatherKit-WK3/actions/runs/42123745628) 完整回归 **359/359 通过、0 失败、0 跳过**，旧入口及五平台构建、模块生成和归档成功。四款支持二进制改写的平台均完成真实缺 AQ 抓包与模拟数据源回放，原天气 arena 和预警保留；回放中的 AQI 87 为模拟值，不代表城市实时读数。标签发布另行运行完整回归与构建。

---

# v3.3.5 — 修复代理软件内脚本日志为空

针对用户在 Egern、Loon 实机反馈的“脚本有执行记录，日志正文仍为空”，将五平台共用日志出口统一为 `console.log`。v3.3.4 优先调用 `console.info/debug/warn/error`；这些方法存在不代表客户端会把它们收进脚本日志，因此原来的方法存在性回退不足以保证日志可见。

- 保留 INFO/DEBUG/WARN/ERROR/OFF 等应用层过滤与敏感数据遮蔽，不改变算法、参数默认、天气处理或安全回退。
- 每条消息先格式化、脱敏并合成一个字符串，再调用一次 `console.log`，兼容 Loon 以单个主参数记录日志的接口。
- Egern、Loon 的正式压缩 bundle 在同样的诊断环境下，默认 INFO 从 0 条 `console.log` 变为 4 条；五平台日志及平台回归 33/33 通过，修复分支完整 CI 测试和构建成功。
- 请更新模块，让脚本地址切到 v3.3.5，确认设备中 `LogLevel` 为 INFO/DEBUG/ALL；旧脚本的历史执行记录不会补写日志；旧发行版保留。
- 这是日志兼容修复，尚待用户实机确认恢复；不能把模拟输出当作 Egern/Loon 实机日志已修复的结论。QX 二进制透传、WK3 当前/日/小时天气透传等限制不变。

---

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
