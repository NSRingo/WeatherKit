# WK3 FlatBuffer 天气替换

本分支接入 `NSRingo/apple.WeatherKit` 的完整 WK3 schema 与 `WK3.Codec`，在
`Response.dev.mjs` 中替换当前、逐日、逐小时天气。`WeatherKit3.mjs` 保留产品注册和
供应商数据形态适配，字段布局与枚举读写统一由协议包负责。

## 三个 PR 的衔接

- [apple.WeatherKit #1](https://github.com/NSRingo/apple.WeatherKit/pull/1) 提供 Schema/Codec；
  协议包只负责表示层，不管理请求或供应商。
- [WeatherKit #110](https://github.com/NSRingo/WeatherKit/pull/110) 负责 JSON 协商和 JSON 响应。
  符合地区、供应商、数据集设置的主 App 请求继续协商 `Accept: application/json`。
- [WeatherKit #111](https://github.com/NSRingo/WeatherKit/pull/111) 按实际响应 Content-Type
  处理 WK3 FlatBuffer；不修改 Request.dev.mjs，也不覆盖 #110 的 Accept 选择。

正常主 App JSON 响应在 JSON 分支返回，二进制 decoder/encoder 不执行；每个产品
只调用一次供应商。仍收到 FlatBuffer 的请求进入本 PR 的产品替换与原始数据保留链。
这让两种格式共享既有产品注入函数，不需要第二套客户端白名单或自动重试协议。

建议保留上述 JSON 优先策略，由维护者确认长期路线。下方主 App 二进制验收使用专用
测试模块保留原生 Accept，用于证明 codec 与原生客户端兼容，不表示切换主 App 默认路由。
macOS 小组件 JSON 白名单在补完显示与连续刷新验收后，可沿 #110 的协商边界扩展。

## 合并顺序

#110 和协议包 #1 可分别审阅。#111 保持 Draft，等待 #1 发布，再更新协议依赖及
lockfile、同步已合并的 #110、重跑组合验证后合并。现有 2.0.5 没有 WK3.Schema/Codec，
本分支暂时使用协议包源码构建产物验证。

本分支的 cloudCover 修复与 #110 相同，同步到已合并 #110 的 dev 后消除这部分重复。
样本说明使用独立文件名，避免两个 PR 同时新增 README 的冲突。

## 验证

本地使用协议包分支生成的 `dist/index.js` 替换本 worktree 的
`node_modules/@nsringo/weatherkit/dist/index.js`，package.json 和 lockfile 未修改。
协议包发布前可按这一方式复现；两个仓库的分支名均为 `codex/wk3-binary-codecs`。

```sh
# 在 apple.WeatherKit 中
npm run WK3
npm run tsc
npm test
npm run build

# 在 WeatherKit 中，协议包位于相邻的 ../apple.WeatherKit
cp ../apple.WeatherKit/dist/index.js node_modules/@nsringo/weatherkit/dist/index.js
node --test tests/*.test.mjs
npm run build
npm run build:dev
```

- 协议包 26 项测试通过；主仓库 141 项测试通过，正式和开发构建通过。
- 回归用例验证三类天气注入、供应商失败时单产品保留、未来字段保留，以及未选中产品
  的完整原始 arena 逐字节保留。关闭替换或选择 WeatherKit 时响应逐字节不变。
- 2026-11-14，macOS 27.3 (26C5035r) + Surge 6.12.0，成都、苏州主 App 实测请求和响应
  均为 `application/vnd.apple.flatbuffer;messageType=WK3.Weather`。
- 成都响应：当前 17.20°，今日 18.81° / 12.03°；彩云逐日 11 项、逐小时 274 项。
- 苏州响应与页面对齐如下；当前、逐日、逐小时 metadata.providerName 均为彩云天气。

| 项目 | 二进制解码值 | 页面显示 |
| --- | --- | --- |
| 当前温度 | 18.16° | 18° |
| 今日最高 / 最低 | 18.16° / 16.41° | 18° / 16° |
| 17 时 | 18.00° | 18° |
| 18 时 | 17.68° | 18° |
| 19 时 | 17.49° | 17° |

## 组合验证

将 #110 的 JSON 改动与本分支合并到独立 checkout，并使用协议包 #1 的构建产物。
组合回归覆盖主 App JSON 协商、JSON 不进入 binary codec、每个产品只调用一次供应商、
未协商 JSON 的 Widget 请求保持 FlatBuffer，以及新旧 schema 的成对样本对照。
组合后的 161 项测试全部通过（0 跳过），正式和开发构建通过。对应提交见 PR 正文。

后续客户端验收按入口分别记录：macOS 小组件的 JSON 路径补实际显示和连续刷新；
Siri、地图等入口先确认请求与响应格式，再测试该入口，不预先声明客户端覆盖。
