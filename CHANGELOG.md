### 🆕 New Features
  * 为 Loon 增加有界供应商缓存、相同请求合并、失败冷却与可选运行统计，减少重复处理与额外查询。

### 🛠️ Bug Fixes
  * 修复 iOS 27.3 Beta 主天气 App 的 WeatherKit v3 兼容：协商 Apple JSON，适配原生读取器需要的状态与降水结构，逐产品校验并保留未知数据。
  * 修复内置空气质量算法的单位、无效值、零浓度、插值与分级边界，保留六项有效污染物浓度；修正原始 Apple QWeather CO 假标、加拿大 AQHI 换算与美标 InstantCast 精度。
  * 修复来源失败隔离、预警网页错误与过期记录处理；等待原生 HTTP 回调后单次完成，保留既有 Apple 数据。
  * 修复 WeatherKit Response 处理范围未同时受用户设置和 URL `dataSets` 约束的问题：现在只处理两者的交集，避免地图天气小组件只请求当前天气与空气质量时扩展处理其他数据集。
  * 修复和风天气历史空气质量接口路径多余斜杠的问题，确保请求使用正确的 `/v7/historical/air` 路径。

### 🔣 Dependencies
  * 增加 @noble/hashes@1.8.0，用于无 Node/WebCrypto 依赖的缓存键哈希。
  * 将 FlatBuffer Root 处理器迁移至已发布的 `@nsnanocat/flatbuffer-root@1.0.0`，移除仓库内重复实现。

### ‼️ Breaking Changes
  * Loon 原生条件与参数对象要求 3.5.1(983)；v3 替换限定主天气 App，其他后台客户端保留原传输。

### 🔄 Other Changes
  * Loon 使用独立的 request.loon.bundle.js、response.loon.bundle.js 和 scale.loon.bundle.js；其他客户端沿用原版 generic bundle。
  * 开发版 Loon 文件统一为 .lpx，更新生成与部署引用；增加源码回归、实际压缩脚本和原生表达式检查。
  * 从 BoxJs 设置中隐藏仅供插件参数使用的 `Storage` 选项，保留运行时配置行为。
  * 补充数据集交集、用户设置过滤、FlatBuffer 根槽映射和 QWeather 接口路径的回归测试。
