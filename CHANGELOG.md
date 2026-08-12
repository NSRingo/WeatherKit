### 🆕 New Features
  * 统一 QWeather 与彩云天气的预警事件名称和 CAP 分类：彩云天气按 `CAPAlertCategory` 映射全部 12 个标准类别，QWeather 通过 `eventType.code` 分类，未知事件回退来源提供的本地化事件名称。 @VirgilClyne

### 🛠️ Bug Fixes
  * 修复国际天气预警标题被 `issued` 规则错误截断的问题，支持 CAP `issued ... by ...` 标题和翻译后的 `issues` / `issued` 标题，并使用来源本地化事件名称回退；例如 `Coastal Flood Advisory` 不再显示为 `d August ...`。 @shindgew @VirgilClyne
  * 修复预警标题优先级，保留包含等级的完整来源标题，避免 `暴雨蓝色预警` 被通用事件名称 `暴雨` 覆盖。 @VirgilClyne
  * 修正 QWeather 英文预警正文的首字母大小写，同时保留 `NWS`、`GMT` 等正文缩写。 @VirgilClyne
  * 完善 QWeather 与彩云天气的语言参数映射，统一简体中文、繁体中文、英文和日文地区变体的来源请求语言。 @VirgilClyne

### 🔣 Dependencies
  * 将 `@nsnanocat/util` 更新至 `v2.7.4`。 @001ProMax @VirgilClyne

### ‼️ Breaking Changes
  * none

### 🔄 Other Changes
  * 更新模块功能说明，新增“修改天气预警数据”，并添加 `hhh2210` 为项目贡献者。 @VirgilClyne
  * 将 QWeather 内部版本更新至 `v5.2.1`、彩云天气内部版本更新至 `v4.2.1`，移除不再使用的旧 QWeather 预警枚举。 @VirgilClyne
  * 更新天气预警字段映射文档，并补充标题语法、来源解析、事件名称回退和全部 CAP 分类的回归测试。 @VirgilClyne
