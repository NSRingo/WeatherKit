### 🛠️ Bug Fixes
  * 修复在 iOS/macOS 26 上无法正确解析 `极端天气信息 (WeatherAlerts)` 的问题
  * 修复`[空气质量] 本地替换算法`选择`None (不进行替换)`时无法正确处理的问题

### 🔄 Other Changes
  * `[空气质量] 本地替换算法`的默认值由 `WAQI InstantCast` 改为 `美国 (EPA NowCast)`
    * 使用过 `BoxJs` 进行过配置的用户需要手动更新修改此选项才会生效
    * 原因：`[空气质量] 对比昨日数据源`为`彩云天气`时，只提供`中国 (HJ 633—2012)`与`美国 (EPA NowCast)`两种标准的数据，若本地替换算法为`WAQI InstantCast`，则会导致无法正确对比数据，体现为：空气质量永远比昨日同时间差。

