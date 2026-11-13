# WK3 主天气 JSON 适配（开发入口）

基于 `dev` 的 WK3 二进制支持，补充当前天气、逐日、逐小时天气替换。
不将 WK3 二进制交给 WK2 codec；不新增供应商、缓存、空气质量算法或平台构建分支。

## 请求与处理边界

- 仅 HTTPS `weatherkit.apple.com/api/v3/weather/` 的 GET，且 User-Agent 为
  `WeatherKit_Weather_iOS_` / `WeatherKit_Weather_macOS_` 前缀。
- 仅在天气来源选择彩云或和风、国家在既有 `Weather.Replace` 范围内，且 URL
  `dataSets` 与用户设置的交集包含当前、逐日或逐小时天气时协商 `Accept: application/json`。
- 小组件、后台客户端、WK2、仅请求空气质量或分钟雨等请求继续原路径；发布入口不变。
- JSON 响应调用现有六种产品注入函数，仍受 URL 与设置交集限制。未请求的产品
  不发起供应商请求。单产品异常、非有限数字或“暂不可用”结果保留 Apple 产品。
- JSON 协商改变了整个响应的表示，因此同包中未替换的已知 Apple 产品也需兼容
  主 App JSON reader：天气枚举向量转标量、降水统计保留分类量并补标量、预警 UUID
  字节对象转 UUID 字符串。未知根产品和未知嵌套对象不作转换。
- 返回 JSON 后删除旧 `bodyBytes`、正文长度、编码及缓存验证头。响应最多 4 MiB，
  遍历最多 64 层 / 100000 个节点，单数组最多 8192 项。

表示适配依据 [PR #107 的固定版本与原生观察](https://github.com/hhhoratioxu/WeatherKit/blob/355b5f5dad9d01cb13167949f8334a489b301811/docs/loon-v3-compatibility.md)。
派生代码保留作者及 Apache-2.0 声明；未引入该 PR 的缓存、备用来源、地理判定和算法重构。

## 验证

```sh
npm ci
npm run build
npm run build:dev
npm run build:dev-args
node --test tests/*.test.mjs
```

`weatherKit3JSON.test.mjs` 覆盖设置边界、三种天气替换、混合数据集、失败回退、
未知字段、字节正文和主 App 表示转换。`platformBundleReplay.test.mjs` 从实际构建的
request/response bundle 发起模拟供应商调用，检查 Surge `$done` 形状和天气结果。
测试夹具是合成数据，不代表本机原生解码或真实天气来源已经验收。

## macOS 验收（2026-11-13）

macOS 27.3（26C5035r）、Surge 6.12.0（12820），本地加载同一构建产物：

- 主 App 的 v3 请求实际协商 `application/json`；抓取的改写响应中，当前、逐日和
  逐小时产品均保留彩云来源（逐日 11 项、逐小时 274 项），空气标准为 `EU.EAQI`。
- 苏州、无锡预览显示当前天气、逐小时、逐日、分钟雨与 EAQI；无锡逐日详情中的
  当前温度、最高/最低温与主页面一致，小时图表可正常打开。
- 真机发现的 EAQI 污染物 `index=-1` 哨兵、降水分类枚举、`restOfDayForecast`
  和 `forecastPeriodic.forecasts[].periods[]` 均已补回归。修正后的三个有界日志窗口
  合计 30 次 WeatherData 更新成功，无 `Unable to decode` 或 CloudKit 回退记录。
- 未将原始位置、授权头或完整抓包加入仓库。未实测 iPhone、watchOS 或其他代理客户端；
  这不是长时间稳定性/耗电结论。后台小组件保留既有 WK3 二进制路径。

本机 GitHub 登录缺少 Packages 读取权限，因此协议依赖由公开 `v2.0.5` 标签
（`NSRingo/apple.WeatherKit@c87c1dcd851ea9293141bcfb32fde1b2cca564b9`）源码构建；
未改依赖声明或锁文件，也未声称与发布的 npm tarball 字节一致。
Siri 路由例外属于独立配置修复，不混入此协议补丁。
