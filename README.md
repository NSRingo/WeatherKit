#  iRingo: 🌤 WeatherKit

dev 分支支持 WK3 空气质量处理，使用 `@nsringo/weatherkit@1.2.0` 的模型并复用现有空气质量配置、数据源和算法。只有请求与设置都包含 `airQuality` 时才处理；其他 WK3 数据集保持 Apple 原始数据。

当前采用 [WK3 b66 的局部 schema](https://github.com/NSRingo/apple.WeatherKit/blob/v1.2.0/WK3.Weather.fbs)。AQ 子树含未覆盖字段或枚举时保持原始数据；当前验证为静态和合成回放，尚无客户端实机验收结论。
