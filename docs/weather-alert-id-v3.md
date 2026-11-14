# WK3 预警标识兼容修复

2026-11-06 在 macOS 27.3(26C5035r)、Loon for Mac 0.5.0(1011) 复测 v3.3.4。11 种算法、None、目标外保留及数据集控制已在系统天气显示，但完整系统日志发现 WeatherAlert.id 的类型错误；普通天气显示正常不能证明预警已被采用。

原生错误为：weatherAlerts.alerts[n].id 需要 String，实际收到 dictionary。进一步读取本机这次请求的临时天气响应，确认 WK3 将 UUID 表示为仅含 bytes 的对象，数组恰好 16 个 0–255 整数。读取器需要同一组字节对应的标准 UUID 字符串。原始响应仅留在本机忽略目录，回归使用独立合成数据。

修复只在已知 weatherAlerts 产品的 alerts[].id 路径转换该表示，保留 UUID 全部字节、原字符串标识、预警正文、来源、详情地址、令牌及其他字段。不生成随机标识、不删除预警，也不把任意对象转成字符串。已是原生字符串且其他字段不变时，保留正文、空白和验证头。

这属于新 JSON 传输的读取器兼容，原 Apple 预警在未选择来源替换、选择 WeatherKit 或第三方补充失败时也需要执行。供应商结果同样校验，未知非法标识不能覆盖已有可读预警。原版来源选择、预警合并、指数目标、昨日对比和缓存边界继续保留。

Regression coverage includes release/development entries, disabled replacement, retained Apple source, supplementation failure, malformed identifiers, existing strings, unknown products and repeated execution. The Mac candidate showed warning banners and four full warning details; with all replacement datasets disabled, two original Apple warnings remained visible. See [Mac native observations](mac-native-validation.md).
