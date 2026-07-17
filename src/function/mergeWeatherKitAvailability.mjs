export default function mergeWeatherKitAvailability(appleCapabilities, pluginCapabilities = []) {
    if (!Array.isArray(appleCapabilities)) return appleCapabilities;

    // 在 Apple 返回值上补齐插件能力，避免系统新增 capability 被固定列表吞掉。
    return [...new Set([...appleCapabilities, ...pluginCapabilities])];
}
