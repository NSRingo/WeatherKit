# Loon WeatherKit v3 兼容与供应商处理边界

2026-11-05 核对 [Loon Rewrite](https://nsloon.app/docs/Rewrite/rewrite_v2/)、[Script](https://nsloon.app/docs/Script/script_v2/)、[Script API](https://nsloon.app/docs/Script/script_api/) 与[插件](https://nsloon.app/docs/Plugin/)。最低 Loon 版本为 3.5.1(983)。本文描述源码与自动验证范围，不包含个人订阅、设备授权或原始位置记录。

## v3 主应用传输

原生 Rewrite 只为 HTTPS Apple v3 天气 GET 请求、主天气 App 的 iOS/macOS User-Agent 前缀协商 Apple JSON。响应还要求 200 和 application/json，使用必要 URL Guard、一个 script Action 及原生参数对象。其余后台客户端与未识别的 WK3 二进制保留 Apple 原传输；不使用 WK2 schema 解码 WK3。

Apple 的 WK3 FlatBuffer JSON 表示与主应用 JSON 读取器不同。后者要求字符串天气状态、标量降水和每日降水总量；原生 Mac 日志曾明确报告数组类型不匹配及缺字段，并清缓存走 CloudKit 回退。现将已知原始 Apple 产品和供应商结果适配为该读取器所需表示，也处理未选择数据替换的已知分时产品；未知产品和字段保留。独立 condition 记录数组（包括空数组）不当作字符串概述处理。

供应商整数、时间、Unicode 与有限数值按已知字段校验；异常按产品回退。没有改动时保留原正文、空白与缓存验证头；改写后移除旧 bodyBytes、长度和校验标记，设置 no-store。JSON 最多 1,048,576 UTF-16 码元及 4 MiB UTF-8，每产品累计数组元素 8192、深度 64、节点 100000。它们是脚本工作边界，无法限制宿主已接收的 HTTP 缓冲。

## 空气质量与请求开销

11 种内置算法与 None 保留六项有效物理浓度，按模型定义参与指数计算。修复空值、负数、非有限值、零浓度、单位、分级与插值边界；加拿大 AQHI 使用正确 ppb 换算及最近整数取整，美标 InstantCast 保留 WAQI 臭氧分段并按浓度精度截断。研究模型和当前浓度换算不等于官方日均发布值，不新增后台采样。

原始 Apple QWeather 的 CO 存在 mg 数值配 µg 标签的历史格式，只有该入口修复假标；已归一化供应商结果依据明确单位处理，不按浓度大小猜测。已有有效浓度优先，只补缺项；完整六项数据没有补充请求。模型未定义的污染物不填 index=-1，物理浓度仍保留。更换标准后不复用另一标准的昨日趋势。

供应商请求合并、Loon 有界持久缓存与冷却复用相同入口。默认缓存 60/180/15/15 秒、三并发、16 个在途、8000 ms 发起预算；失败回调返回前不会提前完成脚本，不依赖取消 API 或清理计时器。预警网页缓存区分来源失败与真实无预警。诊断默认关闭，只输出不含令牌、URL 和坐标的摘要。单产品错误不阻止其他健康产品。

原有按需解码、实际修改产品编码、预警延迟复制和单次最终缓存序列化减少临时对象。完整六项污染物与原生功能列表无需额外供应商工作；普通空气质量标尺通过原生 Rewrite 处理，HK/CN 自定义图例使用独立小脚本。

## 构建与验证

Loon 使用 request.loon.bundle.js、response.loon.bundle.js、scale.loon.bundle.js；原版其他客户端的 generic bundle 文件名和模板继续保留。版本由原版发布流程决定，本改动不指定 Fork 版本或下载地址。CI 中的 0.0.0-test 仅用于生成验证夹具，不是可订阅发行版本。

构建同时生成 dist/LICENSE.txt，包含项目 Apache-2.0、@noble/hashes 的完整 MIT 许可与公开地理数据出处；沿用原版的 dist 发行打包即可携带这些说明。

`npm test` 检查算法、供应商失败、缓存边界、WK2 编解码、WK3 开发／发布入口及未知字段保留。`npm run build:loon` 编译原生入口并生成 Loon 文件，再执行 35 个压缩脚本 VM 场景与 15 个表达式／路由／jq 检查；这些检查不等于 Loon 真实配置解析器或设备耗电测量。

执行逻辑相同的发行代码曾在 macOS 27.3、Loon for Mac 0.5.0(1011) 核对七种算法和六项污染物，最终轮次无解码错误、无效天气或 CloudKit 回退，11 类产品进入原生缓存；另有用户反馈 iPhone 使用成功。该事实与当前分支的静态、构建和 VM 验证分别报告，不扩展为所有算法、预警、手表、地区或长期 VPN 的原生验收。没有设备内存或电量下降比例。
