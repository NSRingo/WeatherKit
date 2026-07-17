export default function filterWeatherKitDataSets(requestedDataSets = [], enabledDataSets = [], configurableDataSets = []) {
    const enabled = new Set(enabledDataSets);
    const configurable = new Set(configurableDataSets);

    // 配置只负责开关插件已知的数据集；Apple 后续新增的数据集必须原样透传。
    return requestedDataSets.filter(dataSet => !configurable.has(dataSet) || enabled.has(dataSet));
}
