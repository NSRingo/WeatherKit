### 🆕 New Features
  * 新增 WK3（v3 接口）全产品 FlatBuffer 处理：当前天气、逐日与逐小时预报、下一小时降水、气象预警、空气质量统一经协议包完整 Schema/Codec 编解码，替换、补齐与原始数据保留语义与 WK2 对齐。 @hhh2210
  * Surge、Loon、Quantumult X、Stash 与 Egern 正式版模块新增 `api.v3.weather` 响应规则，与 v2 拆分匹配。
  * v3 响应新增被动 JSON 处理：仅在响应实际为 `application/json` 时进入 JSON 分支，直接复用既有产品注入函数，不修改请求 Accept；FlatBuffer 路径行为不变。
  * WK3 分钟降水支持 `STOP_START` 条件条目与摘要 condition 枚举向量写入；WK3 预警集合补全 metadata 读写。
  * 各平台模块的 QUIC 拦截规则排除 Apple Relay（`mask-api.icloud.com`）；Quantumult X 不支持复合规则语法，维持原样。

### 🛠️ Bug Fixes
  * 修复彩云云量分数未换算为百分比即取整的问题。 @hhh2210
  * 修复和风天气 CO 浓度的重复换算问题：仅在明确标注 mg/m3 时换算为 µg/m3。 @hhhoratioxu
  * 修复空气质量指数边界比较的二进制浮点误判，为取整比较增加 EPSILON 容差。 @hhhoratioxu
  * 修复 Quantumult X 响应状态码未规范化导致的处理异常。

### 🔣 Dependencies
  * 更新 `@nsringo/weatherkit` 至 `2.1.0`：提供完整 WK3 Schema/Codec（经 macOS 27.3 真机布局与成对样本验证），入口为 `Common`/`WK2`/`WK3` 命名空间。 @hhh2210
  * 更新 `@nsnanocat/flatbuffer-root` 至 `1.1.0`：新增 `decodeWithReport` 分类报告与 `inspectTable`，slot 读写或解码失败隔离处理并保留原始数据。
  * 更新 `@nsnanocat/util` 至 `2.7.5`，使 `PersistentStore` 与未设置 `Storage` 时保持一致。
  * `Storage` 选项仅可通过 `$argument` 设置（BoxJs 不再显示），默认值为 `Argument`：配置优先级 database -> PersistentStore (BoxJs) -> $argument；不支持 $argument 的平台不受此选项影响。

### ‼️ Breaking Changes
  * none

### 🔄 Other Changes
  * WeatherKit 处理器按协议版本拆分为 `WeatherKit2`/`WeatherKit3`，UUID 字节与字符串转换下沉共享模块，仅版本差异字段按 `version` 分流处理。
  * WK3 解码失败边界细化：已请求但解析失败的产品保留 Apple 原始包，物理缺失才允许补齐；带未知字段的产品整段不透明保留。
  * WK3 回归改用运行时合成 FlatBuffer 夹具（AQ 合成编码器源自 @patrickyanxxxxx），真机成对样本移至闭源协议仓。
  * 移除天气地图拦截规则；CI 拆分脚本与模块任务，共享依赖准备。
