### 🆕 New Features
  * none

### 🛠️ Bug Fixes
  * 修复 WeatherKit Response 处理范围未同时受用户设置和 URL `dataSets` 约束的问题：现在只处理两者的交集，避免地图天气小组件只请求当前天气与空气质量时扩展处理其他数据集。
  * 修复和风天气历史空气质量接口路径多余斜杠的问题，确保请求使用正确的 `/v7/historical/air` 路径。

### 🔣 Dependencies
  * 将 FlatBuffer Root 处理器迁移至已发布的 `@nsnanocat/flatbuffer-root@1.0.0`，移除仓库内重复实现。

### ‼️ Breaking Changes
  * none

### 🔄 Other Changes
  * 从 BoxJs 设置中隐藏仅供插件参数使用的 `Storage` 选项，保留运行时配置行为。
  * 补充数据集交集、用户设置过滤、FlatBuffer 根槽映射和 QWeather 接口路径的回归测试。
