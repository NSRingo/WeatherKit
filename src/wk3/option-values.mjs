// Module string controls display their stored values. Reuse readable labels
// across clients; existing canonical values remain accepted by scripts.
const indexSources = {
    Calculate: "iRingo内置算法",
    ColorfulCloudsUS: "彩云天气（美标）",
    ColorfulCloudsCN: "彩云天气（国标）",
    QWeather: "和风天气",
};
export const moduleOptionLabels = {
    "AirQuality.Current.Index.Provider": indexSources,
    "AirQuality.Comparison.Yesterday.IndexProvider": indexSources,
    "AirQuality.Calculate.Algorithm": {
        None: "不转换", UBA: "德国LQI", EU_EAQI: "欧盟EAQI",
        WAQI_InstantCast_US: "美标InstantCast", WAQI_InstantCast_CN: "国标InstantCast（2012）",
        WAQI_InstantCast_CN_25_DRAFT: "国标InstantCast（2025草案）",
        CA_AQHI: "加拿大AQHI", HK_AQHI: "香港AQHI", AQHI_Multi_CN: "AQHI-Multi（中国）",
        AQHI_Multi_CN_HK: "AQHI-Multi（中国+香港）", CN_DEATH_AQHI: "中国健康风险AQHI",
        CN_DEATH_HK_AQHI: "中国+香港健康风险AQHI",
    },
};
export function displayModuleOption(key, value) {
    return moduleOptionLabels[key]?.[value] ?? value;
}
export function normalizeModuleOption(key, value) {
    const labels = moduleOptionLabels[key];
    return labels ? Object.keys(labels).find(option => labels[option] === value) ?? value : value;
}
