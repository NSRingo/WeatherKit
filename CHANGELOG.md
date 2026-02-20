### 🆕 New Features
  * 使用正则表达式，以国家代码为判断来启用模块功能。
  * 支持替换更多标准的空气指数。
  * 内置算法支持德国LQI和欧盟EAQI。
  * 实现和风天气的GeoAPI，现在可以本地查询location ID了。
  * 重构和风天气和彩云天气的空气质量生成逻辑，将网络和数据处理分开。
  * 重构了AirQuality.Config.Scales的结构。
  * 提升了单位转换的精度（15 位小数）。
  * 支持欧盟标准（20 度）的STP。
  * 缓存了和风天气和彩云天气的部分网络数据。
  * 详尽展示了空气质量的数据源。
  * 提升了计算空气指数时的精度。

### 🛠️ Bug Fixes
  * 修复了德国LQI指数边界，导致有时数值偏小的问题。

### ‼️ Breaking Changes
  * 空气质量相关的设置结构经过了大幅修改。

### 🔣 Dependencies
  * 升级了 `@nsnanocat/util`
    * 修复 Stash 不存在 $argument 的情况下，脚本直接错误退出的问题.
    * 新增`[储存] 配置类型 (Storage)`选项，提供如下三个选项，其中 `Argument` 为默认选项：
      * `Argument`: 优先使用来自`插件选项`与`模块参数`等，由 `$argument` 传入的配置，`$argument` 不包含的设置项由 `PersistentStore (BoxJs)` 提供。 
      * `PersistentStore`: 只使用来自 `BoxJs` 等，由 `$persistentStore` 提供的配置；
      * `database`: 只使用由作者的 `database.mjs` 文件提供的默认配置，其他任何自定义配置不再起作用。
      * `未选择/未填写`： 配置优先级依旧是 `$persistentStore (BoxJs)` > `$argument` > `database`
    * ⚠️ 注意：`[储存] 配置类型 (Storage)`选项只能经由 `$argument` 进行配置，可通过支持 `$argument` 的插件选项或模块参数进行设置。对于本就不支持 `$argument` 的 app (如 Quantumult X)，始终按照 `未选择/未填写` 模式进行处理（与旧版逻辑一致）。

### 🔄 Other Changes
  * 数据集和未来一小时降水强度默认限制在彩云天气的支持范围内。
  * 今日空气质量和对比昨日默认限制在彩云天气的支持范围内。
  * 默认使用彩云天气替换了CN天气。
  * 默认使用内置算法，转为德国LQI。
  * 适配[NSNanoCat/util](https://github.com/NSNanoCat/util/tree/v2.1.5) v2.1.5
    * 将部分设置剥离到 BoxJs。
    * 增加了新的配置优先级选项
  * 清除了不再使用的代码。
  * 完善了AirQuality、ColorfulClouds和QWeather的类型检查。
  * 重写了查找主要污染物的逻辑。
  * 更改了内置算法设置的key name。
  * 调整了一大堆日志的位置。
  * 增加了新的阻断 Apple QUIC 流量的规则。
