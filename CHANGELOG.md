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
