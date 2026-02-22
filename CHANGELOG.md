### 🆕 New Features
  * none

### 🛠️ Bug Fixes
  * 在 `parseWeatherKitURL.mjs` 的 `parseWeatherKitURL` 中修复国家参数解析优先级，现在优先使用查询参数中的国家信息，减少地区识别偏差。
  * 将 `Pollutants2AQI` 的默认空气质量计算算法更新为 `EU_EAQI`。

### 🔣 Dependencies
  * none

### ‼️ Breaking Changes
  * 数据集与天气相关配置结构已简化并合并；若依赖旧字段名或旧配置路径，需要同步调整。

### 🔄 Other Changes
  * 在 `AirQuality.mjs` 中抽离 `Pollutants2AQI` 与 `ConvertPollutants`，增强空气质量通用处理能力，便于在不同响应流程复用。
  * 调整天气注入条件与可用性判断逻辑，减少不必要覆盖并简化分支处理。
  * 将响应侧数据集注入流程改为并行执行，减少处理耗时。
  * 在 `AirQuality.mjs` 中将 `GetStpConversionFactors` 收敛为私有方法 `#GetStpConversionFactors`。
  * 统一使用 `parameters.dataSets` 驱动 DataSets 处理链路，简化请求侧过滤逻辑（移除不必要的正则），并统一响应注入阶段的执行路径。
  * 将原先通过正则进行的地区与可用性判断逻辑下沉到 `ColorfulClouds.mjs` 与 `QWeather.mjs` 的配置中统一管理。
