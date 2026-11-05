/**
 * AirQualityScale
 * 提供空气质量标尺（AQI Scale）的本地构建能力，
 * 用于替代 WeatherKit /api/v1/airQualityScale 接口返回。
 *
 * 支持的标尺：
 * - HJ6332012.* — 中国国标 AQI
 * - EPA_NowCast.* — 美国 EPA AQI
 * - HK.AQHI.* — 香港 AQHI
 * - CN.AQHI.* — 中国 AQHI
 * - EU.EAQI.* — 欧洲 EAQI
 * - UBA.* — 德国 LQI
 *
 * 语言键说明：
 *   zh-Hans-CN  简体中文
 *   zh-Hant-HK  繁体中文
 *   en-US       英文（默认回退）
 */

import { Console } from "../utils/index.mjs";

// ─── 多语言字符串常量 ──────────────────────────────────────────────────────────

/** 空气质量标尺通用标签 */
const SCALE_DISPLAY_LABEL = {
    "zh-Hant-HK": "空氣質素",
    "zh-Hant-TW": "空氣品質",
    "zh-Hans-CN": "空气质量",
    "en-US": "Air Quality",
};

// ─── HJ6332012 中国国标 AQI ────────────────────────────────────────────────────

const HJ6332012 = {
    displayName: {
        "zh-Hans-CN": "空气质量指数",
        "zh-Hant-HK": "空氣質量指數",
        "en-US": "Air Quality Index",
    },
    shortDisplayName: {
        "zh-Hans-CN": "AQI",
        "zh-Hant-HK": "AQI",
        "en-US": "AQI",
    },
    longDisplayName: {
        "zh-Hans-CN": "中国 (HJ 633—2012)",
        "zh-Hant-HK": "中國 (HJ 633—2012)",
        "en-US": "China (HJ 633—2012)",
    },
    categories: [
        {
            range: [0, 50],
            glyph: "aqi.low",
            colors: ["#00E400"],
            categoryName: {
                "zh-Hans-CN": "优",
                "zh-Hant-HK": "優",
                "en-US": "Good",
            },
            recommendation: {
                "zh-Hans-CN": "空气质量令人满意，基本无空气污染。",
                "zh-Hant-HK": "空氣質量令人滿意，基本無空氣污染。",
                "en-US": "Air quality is satisfactory, and air pollution poses little or no risk.",
            },
        },
        {
            range: [51, 100],
            glyph: "aqi.low",
            colors: ["#FFFF00"],
            categoryName: {
                "zh-Hans-CN": "良",
                "zh-Hant-HK": "良",
                "en-US": "Moderate",
            },
            recommendation: {
                "zh-Hans-CN": "空气质量可接受，但某些污染物可能对极少数异常敏感人群健康有较弱影响。",
                "zh-Hant-HK": "空氣質量可接受，但某些污染物可能對極少數異常敏感人群健康有較弱影響。",
                "en-US": "Air quality is acceptable. However, there may be a risk for some people, particularly those who are unusually sensitive to air pollution.",
            },
        },
        {
            range: [101, 150],
            glyph: "aqi.medium",
            colors: ["#FF7E00"],
            categoryName: {
                "zh-Hans-CN": "轻度污染",
                "zh-Hant-HK": "輕度污染",
                "en-US": "Unhealthy for Sensitive Groups",
            },
            recommendation: {
                "zh-Hans-CN": "敏感人群症状有轻度加剧，健康人群出现刺激症状。建议儿童、老年人及心脏病、呼吸系统疾病患者应减少长时间、高强度的户外锻炼。",
                "zh-Hant-HK": "敏感人群症狀有輕度加劇，健康人群出現刺激症狀。建議兒童、老年人及心臟病、呼吸系統疾病患者應減少長時間、高強度的戶外鍛煉。",
                "en-US": "Members of sensitive groups may experience health effects. The general public is less likely to be affected. Children, the elderly, and people with heart or respiratory diseases should reduce prolonged or heavy outdoor exertion.",
            },
        },
        {
            range: [151, 200],
            glyph: "aqi.high",
            colors: ["#FF0000"],
            categoryName: {
                "zh-Hans-CN": "中度污染",
                "zh-Hant-HK": "中度污染",
                "en-US": "Unhealthy",
            },
            recommendation: {
                "zh-Hans-CN": "进一步加剧敏感人群症状，可能对心脏和呼吸系统有影响。儿童、老年人及心脏病、呼吸系统疾病患者应避免长时间、高强度的户外锻炼，一般人群适量减少户外运动。",
                "zh-Hant-HK": "進一步加劇敏感人群症狀，可能對心臟和呼吸系統有影響。兒童、老年人及心臟病、呼吸系統疾病患者應避免長時間、高強度的戶外鍛煉，一般人群適量減少戶外運動。",
                "en-US":
                    "Some members of the general public may experience health effects; members of sensitive groups may experience more serious health effects. Children, the elderly, and people with heart or respiratory diseases should avoid prolonged or heavy outdoor exertion. Everyone else should reduce outdoor exertion.",
            },
        },
        {
            range: [201, 300],
            glyph: "aqi.high",
            colors: ["#99004C"],
            categoryName: {
                "zh-Hans-CN": "重度污染",
                "zh-Hant-HK": "重度污染",
                "en-US": "Very Unhealthy",
            },
            recommendation: {
                "zh-Hans-CN": "心脏病和肺病患者症状显著加剧，运动耐受力降低，健康人群普遍出现症状。儿童、老年人和病人应停留在室内，避免体力消耗，一般人群应避免户外活动。",
                "zh-Hant-HK": "心臟病和肺病症狀顯著加劇，運動耐受力降低，健康人群普遍出現症狀。兒童、老年人和病人應停留在室內，避免體力消耗，一般人群應避免戶外活動。",
                "en-US": "Health warnings of emergency conditions. The entire population is more likely to be affected. Children, the elderly, and the ill should stay indoors. Everyone else should avoid outdoor exertion.",
            },
        },
        {
            range: [301, 500],
            glyph: "aqi.high",
            colors: ["#7E0023"],
            categoryName: {
                "zh-Hans-CN": "严重污染",
                "zh-Hant-HK": "嚴重污染",
                "en-US": "Hazardous",
            },
            recommendation: {
                "zh-Hans-CN": "健康人群运动耐受力降低，有明显强烈症状，提前出现某些疾病。儿童、老年人和病人应当留在室内，避免体力消耗。一般人群应避免户外活动。",
                "zh-Hant-HK": "健康人群運動耐受力降低，有明顯強烈症狀，提前出現某些疾病。兒童、老年人和病人應當留在室內，避免體力消耗。一般人群應避免戶外活動。",
                "en-US": "Health alert: everyone may experience more serious health effects. Children, the elderly, and the ill should remain indoors. Everyone else should avoid outdoor exertion.",
            },
        },
    ],
    gradient: {
        stops: [
            { location: 0, color: "#00E400" },
            { location: 50, color: "#00E400" },
            { location: 51, color: "#FFFF00" },
            { location: 100, color: "#FFFF00" },
            { location: 101, color: "#FF7E00" },
            { location: 150, color: "#FF7E00" },
            { location: 151, color: "#FF0000" },
            { location: 200, color: "#FF0000" },
            { location: 201, color: "#99004C" },
            { location: 300, color: "#99004C" },
            { location: 301, color: "#7E0023" },
        ],
    },
};

// ─── EPA_NowCast 美国 AQI ──────────────────────────────────────────────────────

const EPA_NOWCAST = {
    displayName: {
        "zh-Hans-CN": "空气质量指数",
        "zh-Hant-HK": "空氣質量指數",
        "en-US": "Air Quality Index",
    },
    shortDisplayName: {
        "zh-Hans-CN": "AQI",
        "zh-Hant-HK": "AQI",
        "en-US": "AQI",
    },
    longDisplayName: {
        "zh-Hans-CN": "美国 (EPA NowCast)",
        "zh-Hant-HK": "美國 (EPA NowCast)",
        "en-US": "United States (EPA NowCast)",
    },
    categories: [
        {
            range: [0, 50],
            glyph: "aqi.low",
            colors: ["#00E400"],
            categoryName: {
                "zh-Hans-CN": "优",
                "zh-Hant-HK": "優",
                "en-US": "Good",
            },
            recommendation: {
                "zh-Hans-CN": "空气质量令人满意，基本无空气污染。",
                "zh-Hant-HK": "空氣質量令人滿意，基本無空氣污染。",
                "en-US": "Air quality is satisfactory, and air pollution poses little or no risk.",
            },
        },
        {
            range: [51, 100],
            glyph: "aqi.low",
            colors: ["#FFFF00"],
            categoryName: {
                "zh-Hans-CN": "良",
                "zh-Hant-HK": "良",
                "en-US": "Moderate",
            },
            recommendation: {
                "zh-Hans-CN": "空气质量可接受，但某些污染物可能对极少数异常敏感人群健康有较弱影响。",
                "zh-Hant-HK": "空氣質量可接受，但某些污染物可能對極少數異常敏感人群健康有較弱影響。",
                "en-US": "Air quality is acceptable. However, there may be a risk for some people, particularly those who are unusually sensitive to air pollution.",
            },
        },
        {
            range: [101, 150],
            glyph: "aqi.medium",
            colors: ["#FF7E00"],
            categoryName: {
                "zh-Hans-CN": "敏感人群不健康",
                "zh-Hant-HK": "敏感人群不健康",
                "en-US": "Unhealthy for Sensitive Groups",
            },
            recommendation: {
                "zh-Hans-CN": "敏感人群症状有轻度加剧，健康人群出现刺激症状。建议儿童、老年人及心脏病、呼吸系统疾病患者应减少户外活动。",
                "zh-Hant-HK": "敏感人群症狀有輕度加劇，健康人群出現刺激症狀。建議兒童、老年人及心臟病、呼吸系統疾病患者應減少戶外活動。",
                "en-US": "Members of sensitive groups may experience health effects. The general public is less likely to be affected.",
            },
        },
        {
            range: [151, 200],
            glyph: "aqi.high",
            colors: ["#FF0000"],
            categoryName: {
                "zh-Hans-CN": "不健康",
                "zh-Hant-HK": "不健康",
                "en-US": "Unhealthy",
            },
            recommendation: {
                "zh-Hans-CN": "进一步加剧敏感人群症状，可能对心脏和呼吸系统有影响。一般人群应减少户外活动。",
                "zh-Hant-HK": "進一步加劇敏感人群症狀，可能對心臟和呼吸系統有影響。一般人群應減少戶外活動。",
                "en-US": "Some members of the general public may experience health effects; members of sensitive groups may experience more serious health effects.",
            },
        },
        {
            range: [201, 300],
            glyph: "aqi.high",
            colors: ["#99004C"],
            categoryName: {
                "zh-Hans-CN": "非常不健康",
                "zh-Hant-HK": "非常不健康",
                "en-US": "Very Unhealthy",
            },
            recommendation: {
                "zh-Hans-CN": "健康警告：所有人都可能出现更严重的健康影响。",
                "zh-Hant-HK": "健康警告：所有人都可能出現更嚴重的健康影響。",
                "en-US": "Health alert: everyone may experience more serious health effects.",
            },
        },
        {
            range: [301, 500],
            glyph: "aqi.high",
            colors: ["#7E0023"],
            categoryName: {
                "zh-Hans-CN": "危险",
                "zh-Hant-HK": "危險",
                "en-US": "Hazardous",
            },
            recommendation: {
                "zh-Hans-CN": "健康警告：所有人都可能出现严重的健康影响。应避免所有户外活动。",
                "zh-Hant-HK": "健康警告：所有人都可能出現嚴重的健康影響。應避免所有戶外活動。",
                "en-US": "Health warning of emergency conditions: everyone is more likely to be affected. Avoid all outdoor exertion.",
            },
        },
    ],
    gradient: {
        stops: [
            { location: 0, color: "#00E400" },
            { location: 50, color: "#00E400" },
            { location: 51, color: "#FFFF00" },
            { location: 100, color: "#FFFF00" },
            { location: 101, color: "#FF7E00" },
            { location: 150, color: "#FF7E00" },
            { location: 151, color: "#FF0000" },
            { location: 200, color: "#FF0000" },
            { location: 201, color: "#99004C" },
            { location: 300, color: "#99004C" },
            { location: 301, color: "#7E0023" },
        ],
    },
};

// ─── EU EAQI 欧洲 ──────────────────────────────────────────────────────────────

const EU_EAQI = {
    displayName: {
        "zh-Hans-CN": "欧洲空气质量指数",
        "zh-Hant-HK": "歐洲空氣質量指數",
        "en-US": "European Air Quality Index",
    },
    shortDisplayName: {
        "zh-Hans-CN": "EAQI",
        "zh-Hant-HK": "EAQI",
        "en-US": "EAQI",
    },
    longDisplayName: {
        "zh-Hans-CN": "欧洲 (EAQI)",
        "zh-Hant-HK": "歐洲 (EAQI)",
        "en-US": "Europe (EAQI)",
    },
    categories: [
        {
            range: [0, 20],
            glyph: "aqi.low",
            colors: ["#1E88E5"],
            categoryName: {
                "zh-Hans-CN": "非常好",
                "zh-Hant-HK": "非常好",
                "en-US": "Very Good",
            },
            recommendation: {
                "zh-Hans-CN": "享受户外活动。",
                "zh-Hant-HK": "享受戶外活動。",
                "en-US": "Enjoy your usual outdoor activities.",
            },
        },
        {
            range: [21, 40],
            glyph: "aqi.low",
            colors: ["#00C853"],
            categoryName: {
                "zh-Hans-CN": "好",
                "zh-Hant-HK": "好",
                "en-US": "Good",
            },
            recommendation: {
                "zh-Hans-CN": "享受户外活动。",
                "zh-Hant-HK": "享受戶外活動。",
                "en-US": "Enjoy your usual outdoor activities.",
            },
        },
        {
            range: [41, 60],
            glyph: "aqi.medium",
            colors: ["#FFEB3B"],
            categoryName: {
                "zh-Hans-CN": "中等",
                "zh-Hant-HK": "中等",
                "en-US": "Moderate",
            },
            recommendation: {
                "zh-Hans-CN": "敏感人群应考虑减少户外活动。",
                "zh-Hant-HK": "敏感人群應考慮減少戶外活動。",
                "en-US": "Sensitive individuals should consider reducing outdoor exertion.",
            },
        },
        {
            range: [61, 80],
            glyph: "aqi.high",
            colors: ["#FF9800"],
            categoryName: {
                "zh-Hans-CN": "差",
                "zh-Hant-HK": "差",
                "en-US": "Poor",
            },
            recommendation: {
                "zh-Hans-CN": "敏感人群应减少户外活动。",
                "zh-Hant-HK": "敏感人群應減少戶外活動。",
                "en-US": "Sensitive groups should reduce outdoor exertion.",
            },
        },
        {
            range: [81, 100],
            glyph: "aqi.high",
            colors: ["#F44336"],
            categoryName: {
                "zh-Hans-CN": "非常差",
                "zh-Hant-HK": "非常差",
                "en-US": "Very Poor",
            },
            recommendation: {
                "zh-Hans-CN": "所有人应减少户外活动。",
                "zh-Hant-HK": "所有人應減少戶外活動。",
                "en-US": "Everyone should reduce outdoor exertion.",
            },
        },
    ],
    gradient: {
        stops: [
            { location: 0, color: "#1E88E5" },
            { location: 20, color: "#1E88E5" },
            { location: 21, color: "#00C853" },
            { location: 40, color: "#00C853" },
            { location: 41, color: "#FFEB3B" },
            { location: 60, color: "#FFEB3B" },
            { location: 61, color: "#FF9800" },
            { location: 80, color: "#FF9800" },
            { location: 81, color: "#F44336" },
        ],
    },
};

// ─── UBA 德国 LQI ──────────────────────────────────────────────────────────────

const UBA = {
    displayName: {
        "zh-Hans-CN": "德国空气质量指数",
        "zh-Hant-HK": "德國空氣質量指數",
        "en-US": "German Air Quality Index",
    },
    shortDisplayName: {
        "zh-Hans-CN": "LQI",
        "zh-Hant-HK": "LQI",
        "en-US": "LQI",
    },
    longDisplayName: {
        "zh-Hans-CN": "德国 (UBA LQI)",
        "zh-Hant-HK": "德國 (UBA LQI)",
        "en-US": "Germany (UBA LQI)",
    },
    categories: [
        {
            range: [0, 0.99],
            glyph: "aqi.low",
            colors: ["#00C853"],
            categoryName: {
                "zh-Hans-CN": "非常好",
                "zh-Hant-HK": "非常好",
                "en-US": "Very Good",
            },
            recommendation: {
                "zh-Hans-CN": "可以自由进行户外活动。",
                "zh-Hant-HK": "可以自由進行戶外活動。",
                "en-US": "You can freely engage in outdoor activities.",
            },
        },
        {
            range: [1, 1.99],
            glyph: "aqi.low",
            colors: ["#64DD17"],
            categoryName: {
                "zh-Hans-CN": "好",
                "zh-Hant-HK": "好",
                "en-US": "Good",
            },
            recommendation: {
                "zh-Hans-CN": "可以自由进行户外活动。",
                "zh-Hant-HK": "可以自由進行戶外活動。",
                "en-US": "You can usually engage in outdoor activities without restriction.",
            },
        },
        {
            range: [2, 2.99],
            glyph: "aqi.medium",
            colors: ["#FFEB3B"],
            categoryName: {
                "zh-Hans-CN": "中等",
                "zh-Hant-HK": "中等",
                "en-US": "Moderate",
            },
            recommendation: {
                "zh-Hans-CN": "敏感人群应减少户外活动。",
                "zh-Hant-HK": "敏感人群應減少戶外活動。",
                "en-US": "Sensitive individuals should reduce outdoor exertion.",
            },
        },
        {
            range: [3, 3.99],
            glyph: "aqi.high",
            colors: ["#FF9800"],
            categoryName: {
                "zh-Hans-CN": "差",
                "zh-Hant-HK": "差",
                "en-US": "Poor",
            },
            recommendation: {
                "zh-Hans-CN": "敏感人群应避免户外活动。",
                "zh-Hant-HK": "敏感人群應避免戶外活動。",
                "en-US": "Sensitive groups should avoid outdoor exertion.",
            },
        },
        {
            range: [4, 4],
            glyph: "aqi.high",
            colors: ["#F44336"],
            categoryName: {
                "zh-Hans-CN": "非常差",
                "zh-Hant-HK": "非常差",
                "en-US": "Very Poor",
            },
            recommendation: {
                "zh-Hans-CN": "所有人应减少户外活动。",
                "zh-Hant-HK": "所有人應減少戶外活動。",
                "en-US": "Everyone should reduce outdoor exertion.",
            },
        },
    ],
    gradient: {
        stops: [
            { location: 0, color: "#00C853" },
            { location: 1, color: "#64DD17" },
            { location: 2, color: "#FFEB3B" },
            { location: 3, color: "#FF9800" },
            { location: 4, color: "#F44336" },
        ],
    },
};

// ─── HK AQHI ───────────────────────────────────────────────────────────────────

const HK_AQHI = {
    displayName: {
        "zh-Hant-HK": "AQHI (HK)",
        "zh-Hans-CN": "AQHI (HK)",
        "en-US": "AQHI (HK)",
    },
    shortDisplayName: {
        "zh-Hant-HK": "AQHI",
        "zh-Hans-CN": "AQHI",
        "en-US": "AQHI",
    },
    longDisplayName: {
        "zh-Hant-HK": "香港 (AQHI)",
        "zh-Hans-CN": "香港 (AQHI)",
        "en-US": "Hong Kong (AQHI)",
    },
    categories: [
        // 低 (1-3)
        {
            range: [1, 3],
            glyph: "aqi.low",
            colors: ["#04DE71", "#04DE71", "#58E156"],
            categoryName: {
                "zh-Hant-HK": "低",
                "zh-Hans-CN": "低",
                "en-US": "Low",
            },
            recommendation: {
                "zh-Hant-HK": "可如常活動。",
                "zh-Hans-CN": "可如常活动。",
                "en-US": "No response action is required.",
            },
        },
        // 中 (4-6)
        {
            range: [4, 6],
            glyph: "aqi.medium",
            colors: ["#FFE620", "#FFBE10", "#FF9500"],
            categoryName: {
                "zh-Hant-HK": "中",
                "zh-Hans-CN": "中",
                "en-US": "Moderate",
            },
            recommendation: {
                "zh-Hant-HK": "一般可如常活動，但個別出現症狀的人士應考慮減少戶外體力消耗。",
                "zh-Hans-CN": "一般可如常活动，但個別出现症状的人士应考虑减少户外体力消耗。",
                "en-US": "No response action is normally required. Individuals who are experiencing symptoms are advised to consider reducing outdoor physical exertion.",
            },
        },
        // 高 (7)
        {
            range: [7, 7],
            glyph: "aqi.high",
            colors: ["#FA114F"],
            categoryName: {
                "zh-Hant-HK": "高",
                "zh-Hans-CN": "高",
                "en-US": "High",
            },
            recommendation: {
                "zh-Hant-HK": "心臟病或呼吸系統疾病患者、兒童及長者應減少戶外體力消耗。",
                "zh-Hans-CN": "心脏病或呼吸系统疾病患者、儿童及长者应减少户外体力消耗。",
                "en-US": "People with existing heart or respiratory illnesses, Children and the elderly are advised to reduce outdoor physical exertion.",
            },
        },
        // 甚高 (8-10)
        {
            range: [8, 10],
            glyph: "aqi.high",
            colors: ["#D11343", "#A91537", "#80172B"],
            categoryName: {
                "zh-Hant-HK": "甚高",
                "zh-Hans-CN": "甚高",
                "en-US": "Very High",
            },
            recommendation: {
                "zh-Hant-HK": "心臟病或呼吸系統疾病患者、兒童及長者應盡量減少戶外體力消耗。",
                "zh-Hans-CN": "心脏病或呼吸系统疾病患者、儿童及长者应尽量减少户外体力消耗。",
                "en-US": "People with existing heart or respiratory illnesses, Children and the elderly are advised to reduce to the minimum outdoor physical exertion.",
            },
        },
        // 严重 (11)
        {
            range: [11, 11],
            glyph: "aqi.high",
            colors: ["#80172B"],
            categoryName: {
                "zh-Hant-HK": "嚴重",
                "zh-Hans-CN": "严重",
                "en-US": "Serious",
            },
            recommendation: {
                "zh-Hant-HK": "心臟病或呼吸系統疾病患者、兒童及長者應避免戶外體力消耗。",
                "zh-Hans-CN": "心脏病或呼吸系统疾病患者、儿童及长者应避免户外体力消耗。",
                "en-US": "People with existing heart or respiratory illnesses, Children and the elderly are advised to avoid outdoor physical exertion.",
            },
        },
    ],
    gradient: {
        stops: [
            { location: 1, color: "#04DE71" },
            { location: 2.5, color: "#04DE71" },
            { location: 4, color: "#FFE620" },
            { location: 6, color: "#FF9500" },
            { location: 7, color: "#FA114F" },
            { location: 8, color: "#D11343" },
            { location: 9.5, color: "#80172B" },
        ],
    },
};

// ─── CN AQHI ───────────────────────────────────────────────────────────────────

const CN_AQHI = {
    displayName: {
        "zh-Hans-CN": "AQHI (CN)",
    },
    shortDisplayName: {
        "zh-Hans-CN": "AQHI",
    },
    longDisplayName: {
        "zh-Hans-CN": "中国 (AQHI)",
    },
    categories: [
        {
            range: [1, 1],
            glyph: "aqi.low",
            colors: ["#2094FA"],
            categoryName: { "zh-Hans-CN": "极低" },
            recommendation: { "zh-Hans-CN": "适宜进行户外活动。" },
        },
        {
            range: [2, 3],
            glyph: "aqi.low",
            colors: ["#04DE71", "#CCFF66"],
            categoryName: { "zh-Hans-CN": "低" },
            recommendation: { "zh-Hans-CN": "正常进行户外活动。心肺疾病患者可遵照医嘱进行身体锻炼。" },
        },
        {
            range: [4, 5],
            glyph: "aqi.medium",
            colors: ["#FFE620", "#FF9500"],
            categoryName: { "zh-Hans-CN": "中" },
            recommendation: { "zh-Hans-CN": "心肺疾病患者应减少长时间、高强度的户外活动，并遵照医嘱进行身体锻炼。" },
        },
        {
            range: [6, 10],
            glyph: "aqi.high",
            colors: ["#FA114F", "#DC1346", "#BD143D", "#9F1634", "#80172B"],
            categoryName: { "zh-Hans-CN": "高" },
            recommendation: { "zh-Hans-CN": "心肺疾病患者、老人、儿童及孕妇应尽量减少户外活动。一般人群应减少长时间、高强度的户外活动。" },
        },
        {
            range: [11, 11],
            glyph: "aqi.high",
            colors: ["#80172B"],
            categoryName: { "zh-Hans-CN": "极高" },
            recommendation: { "zh-Hans-CN": "心肺疾病患者、老人、儿童及孕妇应避免户外活动。一般人群应尽量减少户外活动。" },
        },
    ],
    gradient: {
        stops: [
            { location: 1, color: "#2094FA" },
            { location: 2, color: "#04DE71" },
            { location: 3.5, color: "#CCFF66" },
            { location: 4, color: "#FFE620" },
            { location: 6, color: "#FA114F" },
            { location: 8, color: "#BD143D" },
            { location: 10, color: "#80172B" },
        ],
    },
};

// ─── 工具函数 ──────────────────────────────────────────────────────────────────

/**
 * 从三键 i18n map 中根据语言标签获取字符串。
 * @param {Record<string, string>} map
 * @param {string} lang
 * @returns {string}
 */
function i18n(map, lang) {
    return map[lang] ?? map["en-US"] ?? "";
}

/**
 * 将请求语言映射为响应中的地区语言标签。
 * @param {string} language
 * @returns {"zh-HK"|"zh-CN"|"zh-TW"|"en"}
 */
function normalizeScaleLanguage(language) {
    if (/^zh-Hant-HK$/i.test(language)) return "zh-HK";
    if (/^zh-Hant/i.test(language)) return "zh-TW";
    if (/^zh/i.test(language)) return "zh-CN";
    return "en";
}

function parseScaleIdentity(scaleName) {
    const [name, version] = `${scaleName || ""}`.split(".");
    const parsedVersion = Number.parseInt(version, 10);
    return {
        name: name || scaleName,
        version: Number.isFinite(parsedVersion) ? parsedVersion : 1,
    };
}

// ─── AirQualityScale 类 ────────────────────────────────────────────────────────

export default class AirQualityScale {
    /**
     * 将 Apple WeatherKit BCP47 语言标签规范化为三键形式。
     * @param {string} language
     * @returns {"zh-Hans-CN"|"zh-Hant-HK"|"zh-Hant-TW"|"en-US"}
     */
    static normalizeLanguage(language) {
        if (/zh-Hant-HK/i.test(language)) return "zh-Hant-HK";
        if (/^zh-Hant/i.test(language)) return "zh-Hant-TW";
        if (/^zh/i.test(language)) return "zh-Hans-CN";
        return "en-US";
    }

    /**
     * 统一入口：根据 scaleName 构建对应的标尺响应。
     * @param {string} language - 请求的语言标签
     * @param {string} scaleName - 标尺名称，如 "HJ6332012.2604"、"EPA_NowCast.2604"
     * @returns {{ status: number, headers: Record<string, string>, body: string } | null}
     */
    static buildScale(language, scaleName) {
        Console.debug("☑️ AirQualityScale.buildScale", `language: ${language}`, `scaleName: ${scaleName}`);

        const scaleBaseName = scaleName?.split(".")?.[0];
        Console.debug(`scaleBaseName: ${scaleBaseName}`);

        let result = null;
        switch (scaleBaseName) {
            case "HJ6332012":
            case "HJ6332025_DRAFT":
                result = AirQualityScale.#buildGenericScale(language, scaleName, HJ6332012);
                break;
            case "EPA_NowCast":
                result = AirQualityScale.#buildGenericScale(language, scaleName, EPA_NOWCAST);
                break;
            case "EU":
            case "EAQI":
                result = AirQualityScale.#buildGenericScale(language, scaleName, EU_EAQI);
                break;
            case "UBA":
                result = AirQualityScale.#buildGenericScale(language, scaleName, UBA);
                break;
            case "HK":
                result = AirQualityScale.#buildAQHIScale(language, scaleName, HK_AQHI);
                break;
            case "CN":
                result = AirQualityScale.#buildAQHIScale(language, scaleName, CN_AQHI);
                break;
            default:
                Console.warn("AirQualityScale.buildScale", `未知的 scale: ${scaleName}，透传到 Apple`);
                result = null;
                break;
        }

        Console.debug("✅ AirQualityScale.buildScale", result ? "已构建本地响应" : "透传");
        return result;
    }

    /**
     * 构建通用 AQI 标尺（HJ6332012、EPA_NowCast、EU_EAQI、UBA）。
     * @param {string} language
     * @param {string} scaleName
     * @param {object} scaleDef - 标尺定义常量
     * @returns {{ status: number, headers: Record<string, string>, body: string }}
     */
    static #buildGenericScale(language, scaleName, scaleDef) {
        const normalizeLang = AirQualityScale.normalizeLanguage(language);
        const scaleIdentity = parseScaleIdentity(scaleName);

        const categories = [];
        for (const band of scaleDef.categories) {
            const [min, max] = band.range;
            // 对于整数范围（AQI 0-50, 51-100 等），每个 category 一个条目
            // 对于小数范围（UBA 0-0.99, 1-1.99 等），也每个 category 一个条目
            categories.push({
                categoryNumber: categories.length + 1,
                range: [min, max === Number.POSITIVE_INFINITY ? 9999 : max],
                color: band.colors[0],
                categoryName: i18n(band.categoryName, normalizeLang),
                recommendation: i18n(band.recommendation, normalizeLang),
                glyph: band.glyph,
            });
        }

        const scale = {
            name: scaleIdentity.name,
            displayName: i18n(scaleDef.displayName, normalizeLang),
            shortDisplayName: i18n(scaleDef.shortDisplayName, normalizeLang),
            longDisplayName: i18n(scaleDef.longDisplayName, normalizeLang),
            displayLabel: i18n(SCALE_DISPLAY_LABEL, normalizeLang),
            language: normalizeScaleLanguage(language),
            version: scaleIdentity.version,
            aqi: {
                numerical: true,
                ascending: true,
                range: scaleDef === UBA ? [0, 4] : scaleDef === EU_EAQI ? [0, 100] : [0, 500],
                categories,
                gradient: scaleDef.gradient,
            },
        };

        return {
            status: 200,
            headers: {
                "Content-Type": "application/json; charset=utf-8",
                "Cache-Control": "no-store, max-age=0",
            },
            body: JSON.stringify(scale),
        };
    }

    /**
     * 构建 AQHI 标尺（HK、CN）。
     * @param {string} language
     * @param {string} scaleName
     * @param {object} scaleDef - AQHI 标尺定义常量
     * @returns {{ status: number, headers: Record<string, string>, body: string }}
     */
    static #buildAQHIScale(language, scaleName, scaleDef) {
        const normalizeLang = AirQualityScale.normalizeLanguage(language);
        const lang = normalizeLang === "zh-Hant-TW" ? "zh-Hant-HK" : normalizeLang;
        const scaleIdentity = parseScaleIdentity(scaleName);

        const categories = [];
        for (const band of scaleDef.categories) {
            const [min, max] = band.range;
            for (let idx = min; idx <= max; idx++) {
                categories.push({
                    categoryNumber: idx,
                    range: [idx, idx],
                    color: band.colors[idx - min],
                    categoryName: i18n(band.categoryName, lang),
                    recommendation: i18n(band.recommendation, lang),
                    glyph: band.glyph,
                });
            }
        }

        const scale = {
            name: scaleIdentity.name,
            displayName: i18n(scaleDef.displayName, lang),
            shortDisplayName: i18n(scaleDef.shortDisplayName, lang),
            longDisplayName: i18n(scaleDef.longDisplayName, lang),
            displayLabel: i18n(SCALE_DISPLAY_LABEL, normalizeLang),
            language: normalizeScaleLanguage(language),
            version: scaleIdentity.version,
            aqi: {
                numerical: true,
                ascending: true,
                range: [1, 11],
                categories,
                gradient: scaleDef.gradient,
            },
        };

        return {
            status: 200,
            headers: {
                "Content-Type": "application/json; charset=utf-8",
                "Cache-Control": "no-store, max-age=0",
            },
            body: JSON.stringify(scale),
        };
    }
}
