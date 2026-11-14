# WK3 FlatBuffer 天气替换

本分支接入 `NSRingo/apple.WeatherKit` 的完整 WK3 schema 与 `WK3.Codec`，在
`Response.dev.mjs` 中替换当前、逐日、逐小时天气。`WeatherKit3.mjs` 保留产品注册和
供应商数据形态适配，字段布局与枚举读写统一由协议包负责。

## 与其他改动的关系

- #110 负责主 App 的 JSON 路径，独立审阅。本分支以 dev 为基础，不包含 #110 的 JSON 实现。
- 本分支先保持 Draft，等待协议包合并、发布，再更新 `@nsringo/weatherkit` 依赖和 lockfile。
  现有 2.0.5 没有 `WK3.Schema` / `WK3.Codec`，无法直接运行本分支。
- 分支中的彩云 cloudCover 修复与 #110 的对应修复相同；#110 合并后同步 dev，消除这部分重复。
- macOS 小组件的 JSON 白名单是另一项客户端策略变更，单独提交。

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

后续客户端验收按入口分别记录：macOS 小组件的 JSON 路径补实际显示和连续刷新；
Siri、地图等入口先确认请求与响应格式，再测试该入口，不预先声明客户端覆盖。
