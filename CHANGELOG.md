### 🆕 New Features
  * 新增可配置的 `WeatherKit` 重写服务端点，模块统一由 `Workers` 更名为 `Rewrite`，支持在 `weatherkit.pages.dev`、`dev.weatherkit.pages.dev` 与 `weather.nanocat.cloud` 之间选择。 @VirgilClyne
  * 新增通用 FlatBuffer 根表处理器，并将 `WeatherKit` 改为按请求数据集逐 slot 解码和回写；未选数据集、未配置字段及新 schema slot 均保持原始二进制内容。 @VirgilClyne

### 🛠️ Bug Fixes
  * 修复和风天气分钟预报的 `reportedTime`，改为使用接口返回的 `updateTime`，不再误写为本地读取时间。 @VirgilClyne
  * 修复云端路由对 `dev.weatherkit.*` 与 `*.pages.dev` 域名的识别，并限制 Cloudflare Pages Functions 只处理 WeatherKit API 路径。 @VirgilClyne

### 🔣 Dependencies
  * 移除 `src/proto` 子模块，改用 `@nsringo/weatherkit` 包，并更新至 `v1.1.2`。 @001ProMax @VirgilClyne
  * 将 `@nsnanocat/util` 更新至 `v2.7.0`，并切换到公共 npm registry。 @VirgilClyne

### ‼️ Breaking Changes
  * none

### 🔄 Other Changes
  * 将构建工具由 `Rspack` 迁移至 `Rollup`，统一正式版与开发版构建配置。 @VirgilClyne
  * 调整 `Vercel` 部署入口为 `src/Hono.js`，并完善 Cloudflare Pages 的构建输出与路由配置。 @001ProMax @VirgilClyne
  * 新增 FlatBuffer 根表处理器契约、逐 slot 编解码与选择性数据集回写测试。 @VirgilClyne
