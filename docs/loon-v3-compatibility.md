# Loon WeatherKit v3 兼容与供应商处理边界

2026-11-05 核对 [Loon Rewrite](https://nsloon.app/docs/Rewrite/rewrite_v2/)、[Script](https://nsloon.app/docs/Script/script_v2/)、[Script API](https://nsloon.app/docs/Script/script_api/) 与[插件](https://nsloon.app/docs/Plugin/)。最低 Loon 版本为 3.5.1(983)。本文描述源码与自动验证范围，不包含个人订阅、设备授权或原始位置记录。

## v3 主应用传输

原生 Rewrite 只为 HTTPS Apple v3 天气 GET 请求、主天气 App 的 iOS/macOS User-Agent 前缀协商 Apple JSON。响应还要求 200 和 application/json，使用必要 URL Guard、一个 script Action 及原生参数对象。其余后台客户端与未识别的 WK3 二进制保留 Apple 原传输；不使用 WK2 schema 解码 WK3。

Apple 的 WK3 FlatBuffer JSON 表示与主应用 JSON 读取器不同。后者要求字符串天气状态、标量降水和每日降水总量；原生 Mac 日志曾明确报告数组类型不匹配及缺字段，并清缓存走 CloudKit 回退。现将已知原始 Apple 产品和供应商结果适配为该读取器所需表示，也处理未选择数据替换的已知分时产品；未知产品和字段保留。独立 condition 记录数组（包括空数组）不当作字符串概述处理。

供应商整数、时间、Unicode 与有限数值按已知字段校验；异常按产品回退。没有改动时保留原正文、空白与缓存验证头；改写后移除旧 bodyBytes、长度和校验标记，设置 no-store。JSON 最多 1,048,576 UTF-16 码元及 4 MiB UTF-8，每产品累计数组元素 8192、深度 64、节点 100000。它们是脚本工作边界，无法限制宿主已接收的 HTTP 缓冲。

## 空气质量与请求开销

11 种内置算法与 None 保留六项有效物理浓度，按模型定义参与指数计算。修复空值、负数、非有限值、零浓度、单位、分级与插值边界；加拿大 AQHI 使用正确 ppb 换算及最近整数取整，美标 InstantCast 保留 WAQI 臭氧分段并按浓度精度截断。研究模型和当前浓度换算不等于官方日均发布值，不新增后台采样。

原始 Apple QWeather 的 CO 存在 mg 数值配 µg 标签的历史格式，只有该入口修复假标；已归一化供应商结果依据明确单位处理，不按浓度大小猜测。已有有效浓度优先，只补缺项；完整六项数据没有补充请求。模型未定义的污染物不填 index=-1，物理浓度仍保留。先匹配原版指数目标列表再应用算法，默认 HJ6332012。默认保留已有昨日对比，缺失或明确开启重算时使用所选的独立昨日来源；污染物补齐不绕过指数目标。

供应商请求合并、Loon 有界持久缓存与冷却复用相同入口。默认缓存 60/180/15/15 秒、三并发、16 个在途、8000 ms 发起预算；失败回调返回前不会提前完成脚本，不依赖取消 API 或清理计时器。预警网页缓存区分来源失败与真实无预警。诊断默认关闭，只输出不含令牌、URL 和坐标的摘要。单产品错误不阻止其他健康产品。备用查询需要明确开启 ProviderFallback.Enabled（默认 false），且 Apple 与所选来源都不可用并有另一来源专用凭据；只填写 Token 不会自动改变来源。

原有按需解码、实际修改产品编码、预警延迟复制和单次最终缓存序列化减少临时对象。完整六项污染物与原生功能列表无需额外供应商工作；普通空气质量标尺通过原生 Rewrite 处理，HK/CN 自定义图例使用独立小脚本。

## 构建与验证

Loon 使用 request.loon.bundle.js、response.loon.bundle.js、scale.loon.bundle.js；原版其他客户端的 generic bundle 文件名和模板继续保留。版本由原版发布流程决定，本改动不指定 Fork 版本或下载地址。CI 中的 0.0.0-test 仅用于生成验证夹具，不是可订阅发行版本。

构建同时生成 dist/LICENSE.txt，包含项目 Apache-2.0、@noble/hashes 的完整 MIT 许可与公开地理数据出处；沿用原版的 dist 发行打包即可携带这些说明。

`npm test` 检查算法、供应商失败、缓存边界、WK2 编解码、WK3 开发／发布入口及未知字段保留。`npm run build:loon` 编译原生入口并生成 Loon 文件，再执行 40 个压缩脚本 VM 场景与 15 个表达式／路由／jq 检查；这些检查不等于 Loon 真实配置解析器或设备耗电测量。

Native macOS observations on 2026-11-06 and 07 covered all eleven algorithms and None, six physical concentrations, the original target-standard restriction, and disabled datasets. Warning banners and four full warning details were visible. The system-log snapshot contained no decoding errors, invalid weather or CloudKit fallback. The actual candidate runtime files were byte-identical to the three artifacts from commit 4d1f127. See [Mac native observations](mac-native-validation.md) for the exact scope and limitations.

The locked Node v22.23.4 CI passed 335 regressions, 40 compiled VM scenarios, 15 expression/route/jq checks and all twelve original argument defaults. The 0.0.0-test version is only a build fixture. Valid dedicated QWeather credentials, the final all-WeatherKit source combination, background/watch customization, long-running VPN operation and device battery or memory percentages were not comprehensively accepted.

Original behavior and default settings are documented in [the original behavior audit](original-behavior-audit.md).
