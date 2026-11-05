#  iRingo: 🌤 WeatherKit

此 Fork 以 NSRingo/WeatherKit **v3.3.2** 为基点，v3.3.3 增加本机 WK3 处理，保留原版 WK2 入口；业务统一放在平台无关的 `src/wk3/`，Egern 与其他代理共用处理逻辑。中文独立提交历史已保留。

## 本分支更新

- WK3 FlatBuffer 有界读写：在已验证结构内替换空气质量，保留其他数据槽与未知字段；国标 AQI 可转换为同源美标 AQI。香港在 Apple WK3 缺少 AQ 数据时，可按现有条件补入彩云美标 AQ。
- WK3 已实现分钟降水、同源同标准的昨日空气等级比较，以及严格匹配原事件 ID 的天气预警补全；失败或未验证结构保持 Apple 原始数据。
- 保留 WK2 的天气来源选择与天气处理；内置空气质量算法提供上游的 12 种选择，包含 InstantCast、EAQI、UBA 和 AQHI 系列。**默认 `WAQI_InstantCast_US`**，但仅在今日空气指数来源选择 `Calculate` 时用于本地计算。
- Egern 模块保留五类脚本、七条分流规则与 23 个可调参数；另外提供 Surge、Loon、Stash 和 Quantumult X 的独立模板及构建脚本。新增内容按功能分为独立提交，不压缩历史。

## 模块适配状态

| 软件 | 模块格式 | 当前验证范围 |
| --- | --- | --- |
| Egern | `modules/iRingo.WeatherKit.WK3.yaml` | 本机 `ctx` 入口、参数与 WK3 处理通过合成回放；既有 Gist 版的美标 AQI、分钟降水与昨日对比曾经设备确认，本分支新 Rollup 产物尚未设备验证。仓库模块仍指向既有 Gist JS。 |
| Surge | `.sgmodule` | 独立 JS 构建、参数传递与合成 WK3 AQ 响应端到端回放通过（AQI 60→87）；未设备验证。 |
| Loon | `.lpx` | 独立 JS、位置参数与二进制响应模拟通过；未设备验证。 |
| Stash | `.stoverride` | 独立 JS、配置解析、参数与二进制响应模拟通过；未设备验证。 |
| Quantumult X | `.snippet` | 请求/文本路径及脚本模拟通过；**WK3 二进制天气响应只透传，不作转换**；模块无可交互的参数选择界面。 |
| Shadowrocket | 无 WK3 本机模块 | 上游仅提供服务端 Rewrite 模板；本分支没有经过验证的本机二进制适配，故不提供伪装可用的模块。 |

五平台统一构建入口为 `npm run build:wk3`：调用 Egern `scripts/build-egern.mjs` 和其他平台 `scripts/build-wk3-platform.mjs`，生成 10 份平台专用 JS。打标签时添加 `-- --version <版本号>`，同时生成 5 份模块至 `dist/` 根目录；Egern 模块改为指向同版本的发行附件，与其他平台一同进入现有构建/Release 工作流。仓库中的 `modules/iRingo.WeatherKit.WK3.yaml` 仍指向既有 Gist，不影响现用订阅；五平台脚本不能互换。

## 代码组织

- `src/wk3/class`、`function`、`process`、`proto`、`utils`：五平台共用的编解码、算法、来源处理与业务逻辑，按上游分类保留；不再嵌套在 Egern 目录。
- `src/wk3/entry`：共用的配置归一化与请求／响应处理；`runtime.mjs`、`parameters.mjs`、`routes.mjs` 分别维护共享 HTTP 封装、参数和五类路由。
- `src/platform/wk3-adapter.mjs`：Surge/Loon/Stash/Quantumult X 的客户端对象适配；Egern 原生上下文直接调用同一组共享入口。客户端网络 API 和输出格式由各自 Rollup 构建器绑定，不混入业务算法。
- `tests/wk3/`：共享协议及业务测试；根目录 `tests/wk3-*.test.mjs`：跨平台代理和发行构建测试。

## 默认配置

| 设置 | 默认值 | 生效范围 |
| --- | --- | --- |
| 今日空气指数来源 | `ColorfulCloudsUS` | 彩云美标；仅匹配原始标准 `HJ6332012` 后才尝试替换。 |
| 昨日空气指数来源 | `ColorfulCloudsUS` | 与今日同来源、同标准才比较；否则保持未知。 |
| 内置 AQ 计算算法 | `WAQI_InstantCast_US` | **只有来源设为 `Calculate` 才执行**；其余 11 种上游算法可选，WK3 目标标准不兼容时透传。 |
| 分钟降水 | `ColorfulClouds` | 已验证的分钟雨结构；未知条件透传。 |
| 天气预警 | `QWeatherWeb` | 严格匹配后补全原生详情；`WeatherKit` 为原样透传。 |
| 天气来源 | `ColorfulClouds` | WK2 可用；WK3 当前/逐日/逐小时天气仍透传 Apple。 |
| 逐日/逐小时替换 | `false` / `false` | WK2 开关，WK3 不生效。 |
| 天气替换范围 / 请求超时 / 日志 | `CN` / `8000` 毫秒 / `INFO` | 香港缺 AQ 补入另有专用条件；第三方令牌按需在设备上配置。 |

上述为生成模块的默认参数，不覆盖已安装模块或设备上的个性化参数。改变内置算法默认值也**不会**自动将今日指数来源改为 `Calculate`。

## 已知限制与发布

- WK3 `currentWeather`、`forecastDaily`、`forecastHourly` 缺少经真实样本验证的编解码映射；不可把上游 WK2 codec 直接用于 WK3。现阶段这三类数据原样透传，即使在设置中选择了天气数据源。
- Quantumult X 二进制天气不可转换；其他平台代理仅通过脚本模拟，没有客户端实机结论。原生预警补全也依赖可严格匹配到的原事件，失配时原样返回。
- 本 Fork 的 v3.3.3 WK3 模块在 [Releases](https://github.com/patrickyanxxxxx/WeatherKit-WK3/releases) 获取，文件名含 `.WK3.`。发行附件中的 Egern YAML 引用同版本 JS；仓库内 `modules/` 的旧 Gist 模块仅保留兼容，不自动更新用户已安装配置。
- 上游的私有 GitHub Packages 依赖在无权限环境会使干净 `npm install` 返回 401。本分支使用已有依赖及上游已声明的 Rollup 工具完成验证，没有新增依赖。

验证命令：`node --test tests/wk3/*.test.mjs tests/wk3-modules.test.mjs tests/wk3-platform-adapter.test.mjs tests/wk3-release-build.test.mjs`。普通分支运行 `npm run build:wk3` 仅生成五平台脚本；打标签时 CI 使用实际标签版本运行 `npm run build:wk3 -- --version <版本号>`，将十份脚本与五份模块一起写入 `dist/` 并进入现有附件上传步骤。指定版本构建本身不创建标签或 Release；发版后仍须核对客户端能访问每个附件 URL。
