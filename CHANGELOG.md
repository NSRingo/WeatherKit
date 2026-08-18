### 🆕 New Features
  * 新增按 `Settings.DataSets` 配置选择 WeatherKit 数据集的处理范围：配置项通过数据集映射对应 FlatBuffer root slot，选择的数据集参与 Response 解码与 Inject，未选择的数据槽保持原始内容透传。 @VirgilClyne

### 🛠️ Bug Fixes
  * 修复 Request 脚本按 `Settings.DataSets` 裁剪 URL `dataSets` 的问题，保留 WeatherKit 原始请求参数，避免把 App 的最低数据需求误当成脚本处理范围。 @VirgilClyne
  * 修复 Response 脚本误用请求 `dataSets` 作为解析和 Inject 范围的问题，改为使用用户设置及其 FlatBuffer slot 映射，因此可以处理请求参数未列出但响应中实际存在的数据集。 @VirgilClyne
  * 修正 full 数据集配置的设置名与 FlatBuffer slot 映射，统一 `weatherChange`、`trendComparison` 等选项的名称、类型说明和 BoxJs 数据集描述。 @VirgilClyne

### ‼️ Breaking Changes
  * none

### 🔄 Other Changes
  * 正式版参数配置继续只暴露已支持的 6 个数据集，完整数据集选项保留给 full/开发配置；相关数据集映射和原始 slot 透传行为补充回归测试。 @VirgilClyne
