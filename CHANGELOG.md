### 🆕 New Features
  * 新增替换`每小时预报`、`每日预报`数据功能 by @001ProMax
    * 默认使用`WeatherKit (不进行替换)`，替换为其他数据需手动开启
    * 支持`彩云天气`与`和风天气`数据源
  * 新增`[空气质量] 对比昨日数据源`数据源选择功能 by @WordlessEcho
    * 现在可以选择不同的数据源进行对比，不再局限于单一数据源。
    * 默认使用`自动选择 (与[空气质量] 数据源一致)`
    * 支持`彩云天气`与`和风天气`数据源

### 🛠️ Bug Fixes
  * 修复`对比昨日空气质量`逻辑
    * 现在总是先将空气质量指数转换为用户指定的标准后，再进行相同标准指数下的对比
  * 修复 `和风天气 GeoAPI` 路径
  * 修复 `和风天气` 数据源中空气质量原始单位转换错误的问题
    * 将错误的"ug/m3"更改为正确的"mg/m3"

### 🔣 Dependencies
  * 升级了 `@nsnanocat/util`
    * `Lodash` 新增 `escape`, `pick`, `omit` 方法
    * 修复了 `fetch`
    * 优化了 `notification`
    * 优化了 `done`
      * 在`Quanumult X`环境中，`StatusCodes` 会自动转换构建为 `StatusText`
        * 例如 response.status = 200, done(response) 时，会自动转换将 response.status 转换为 `HTTP/1.1 200 OK`
  * 升级了 `flatbuffers`

### ‼️ Breaking Changes
  * 移除替换`[当前天气] 数据源`设置项，与替换`每小时预报`、`每日预报`设置项合并为替换`[天气] 数据源`设置项
  * `[API] 和风天气主机` 改为文本框，以允许用户使用自己的 `API Host`

### 🔄 Other Changes
  * 全面重构，减少冗余代码与重复操作
  * 数据源支持缓存，减少重复请求
  * `和风天气 Token` 改为通过 Headers 发送
  * 调整调试信息等级，清理控制台输出
  * 空气质量在未达关注等级前不再置于显著位置
  * ~~iOS 26 临时解决方案: https://github.com/orgs/NSRingo/discussions/72~~
  * 已修复 26 的支持
