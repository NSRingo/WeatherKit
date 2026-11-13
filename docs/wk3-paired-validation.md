# 27.3 JSON / FlatBuffer 成对验证

2026-11-13，macOS 27.3 (26C5035r)。杭州、天津、西雅图及西雅图复测共四组，
每组同 URL / 地点 / 请求参数，仅改变 Accept；启动差小于 2 ms。
抓取时旁路改写，恢复后继续使用 WK3 Preview。使用当前 dev 的三个产品 codec
解码，并独立读取原始 vtable 的时间整数与分钟向量长度。

## 结果

| 样本 | 完整字段行数 | 已对齐 | 当前产品 codec 缺失 | 摘要 condition 缺失 | 返回值/版本差异 |
|---|---:|---:|---:|---:|---:|
| 杭州 | 2121 | 48 | 2073 | 0 | 0 |
| 天津 | 2057 | 48 | 2009 | 0 | 0 |
| 西雅图 | 2436 | 420 | 2014 | 1 | 1 |
| 西雅图复测 | 2448 | 422 | 2014 | 1 | 11 |
| 合计 | 9062 | 938 | 8110 | 2 | 12 |

“已对齐”包括逐值相同、float32 表示精度、UUID 字节/字符串等价和明确的缺省值。
空气质量污染物按名称对齐；原始数组顺序相反。时间戳保持整数精确比较。

| 字段（样本） | JSON 值 | FlatBuffer 解码值 | 是否一致 | 原因 / 原始字节复核 |
|---|---|---|---|---|
| AQ index（杭州） | 50 | 50 | 是 | short 标量一致 |
| AQ CO amount（杭州） | 0.7 | 0.699999988079071 | 是 | 同一 float32；单位枚举相同 |
| alert severity（西雅图） | MINOR | MINOR | 是 | 枚举一致 |
| alert importance（西雅图） | LOW | LOW | 是 | 枚举一致 |
| alert responses（西雅图） | MONITOR | MONITOR | 是 | 枚举一致 |
| nextHour minutes（西雅图） | 81 条 | 81 条 | 是 | 所有已声明分钟字段逐项比对 |
| nextHour.summary[0].condition[0] | CLEAR | 未输出 | 否 | 当前 schema 将摘要槽 2 标记 deprecated |
| AQ metadata.expireTime（西雅图） | 1794571344 | 1794571285 | 否 | 原始槽 1 的 uint32 确为 1794571285 |
| AQ metadata.expireTime（复测） | 1794571287 | 1794571351 | 否 | 原始槽 1 的 uint32 确为 1794571351 |
| nextHour.metadata.reportedTime（复测） | 1794569160 | 1794569280 | 否 | 原始时间值相差 120 秒 |
| nextHour.forecastEnd（复测） | 1794574560 | 1794574680 | 否 | 原始时间值也相差 120 秒 |
| nextHour.minutes（复测） | 82 条 | 84 条 | 否 | 原始向量长度 84；多出两条、共八个字段 |
| currentWeather / daily / hourly 等 | 有值 | 未输出 | 否 | dev 没有这些产品的 WK3 codec；没有套用 WK2 或占位 ubyte |

完整 9062 行由 `node scripts/compare-wk3-pair.mjs output/wk3-paired` 生成，
列为字段名、JSON 值、FlatBuffer 解码值、是否一致及原因，并带样本名。
四组成对脱敏响应和 SHA-256 已存入 `tests/fixtures/wk3-paired/`，可重复生成表格。

## 已定位与下一步

- cloudCover 在彩云 provider 边界修正为百分比，覆盖小时与日间/夜间预报；
  0.5 → 50、0.8 → 80，回归另覆盖 0、0.005、1。
- 三个已实现产品中，样本内的枚举和单位标签逐项对齐；发现的时间差直接存在于原始
  整数中。复测的 reportedTime 和 forecastEnd 同时相差 120 秒，记录为不同产品版本，
  不归因于枚举或单位换算。
- 要输出分钟摘要 condition，需要在协议包补充槽 2 的向量定义和读取器；当前样本是
  单元素 CLEAR，确定元素宽度还需多元素摘要样本。
- 要解码当前/逐日/逐小时等其余产品，需要在协议包定义其表和 codec，再用本组样本
  重跑全字段表。当前 8110 项记录为 schema/codec 缺项。
- 当前分钟雨样本的雨强为零；检验非零雨强数值换算，需要追加正在降雨地区的原始成对样本。
