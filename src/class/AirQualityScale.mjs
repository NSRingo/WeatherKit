/**
 * AirQualityScale
 * 提供空气质量标尺（AQI Scale）的本地构建能力，
 * 用于替代 WeatherKit /api/v1/airQualityScale 接口返回。
 *
 * 语言键说明：
 *   zh-Hans  简体中文
 *   zh-Hant  繁体中文
 *   en       英文（默认回退）
 */

// ─── 多语言字符串常量 ──────────────────────────────────────────────────────────

/** 空气质量标尺通用标签 */
const SCALE_DISPLAY_LABEL = {
    "zh-Hant-HK": "空氣質素",
    "zh-Hant": "空氣品質",
    "zh-Hans": "空气质量",
    "en": "Air Quality",
};

/** HK AQHI 顶层元数据 */
const HK_AQHI_META = {
    displayName: {
        "zh-Hant": "AQHI (HK)",
        "zh-Hans": "AQHI (HK)",
        "en":      "AQHI (HK)",
    },
    shortDisplayName: {
        "zh-Hant": "AQHI",
        "zh-Hans": "AQHI",
        "en":      "AQHI",
    },
    longDisplayName: {
        "zh-Hant": "香港 (AQHI)",
        "zh-Hans": "香港 (AQHI)",
        "en":      "Hong Kong (AQHI)",
    },
};

/**
 * HK EPD 五大风险等级（低/中/高/甚高/严重），每级含 categoryName、recommendation、颜色与图标。
 * 级别: 低(1-3), 中(4-6), 高(7), 甚高(8-10), 严重(11)
 */
const HK_AQHI_CATEGORIES = [
    // 低 (1-3)
    {
        range: [1, 3],
        glyph: "aqi.low",
        // #58E156 RGB(88, 225, 86) = 2/3 #04DE71 RGB(4, 222, 113) + 1/3 #FFE620 RGB(255, 230, 32)
        colors: ["#04DE71", "#04DE71", "#58E156"],
        categoryName: {
            "zh-Hant": "低",
            "zh-Hans": "低",
            "en":      "Low",
        },
        recommendation: {
            "zh-Hant": "可如常活動。",
            "zh-Hans": "可如常活动。",
            "en":      "No response action is required.",
        },
    },
    // 中 (4-6)
    {
        range: [4, 6],
        glyph: "aqi.medium",
        colors: ["#FFE620", "#FFBE10", "#FF9500"],
        categoryName: {
            "zh-Hant": "中",
            "zh-Hans": "中",
            "en":      "Moderate",
        },
        recommendation: {
            "zh-Hant": "一般可如常活動，但個別出現症狀的人士應考慮減少戶外體力消耗。",
            "zh-Hans": "一般可如常活动，但個別出现症状的人士应考虑减少户外体力消耗。",
            "en":      "No response action is normally required. Individuals who are experiencing symptoms are advised to consider reducing outdoor physical exertion.",
        },
    },
    // 高 (7)
    {
        range: [7, 7],
        glyph: "aqi.high",
        colors: ["#FA114F"],
        categoryName: {
            "zh-Hant": "高",
            "zh-Hans": "高",
            "en":      "High",
        },
        recommendation: {
            "zh-Hant": "心臟病或呼吸系統疾病患者、兒童及長者應減少戶外體力消耗，以及減少在戶外逗留的時間，特別在交通繁忙地方。心臟病或呼吸系統疾病患者在參與體育活動前應諮詢醫生意見，在體能活動期間應多作歇息。",
            "zh-Hans": "心脏病或呼吸系统疾病患者、儿童及长者应减少户外体力消耗，以及减少在户外逗留的时间，特别在交通繁忙地方。心脏病或呼吸系统疾病患者在参与体育活动前应咨询医生意见，在体能活动期间应多作歇息。",
            "en":      "People with existing heart or respiratory illnesses, Children and the elderly are advised to reduce outdoor physical exertion, and to reduce the time of their stay outdoors, especially in areas with heavy traffic. People with existing heart or respiratory illnesses should also seek advice from a medical doctor before participating in sport activities and take more breaks during physical activities.",
        },
    },
    // 甚高 (8-10)
    {
        range: [8, 10],
        glyph: "aqi.high",
        colors: ["#D11343", "#A91537", "#80172B"],
        categoryName: {
            "zh-Hant": "甚高",
            "zh-Hans": "甚高",
            "en":      "Very High",
        },
        recommendation: {
            "zh-Hant": "心臟病或呼吸系統疾病患者、兒童及長者應盡量減少戶外體力消耗，以及盡量減少在戶外逗留的時間，特別在交通繁忙地方。從事重體力勞動的戶外工作僱員的僱主應評估戶外工作的風險，並採取適當的預防措施保障僱員的健康。一般市民應減少戶外體力消耗，以及減少在戶外逗留的時間，特別在交通繁忙地方。",
            "zh-Hans": "心脏病或呼吸系统疾病患者、儿童及长者应尽量减少户外体力消耗，以及尽量减少在户外逗留的时间，特别在交通繁忙地方。从事重体力劳动的户外工作僱员的僱主应评估户外工作的风险，并採取适当的预防措施保障僱员的健康。一般市民应减少户外体力消耗，以及减少在户外逗留的时间，特别在交通繁忙地方。",
            "en":      "People with existing heart or respiratory illnesses, Children and the elderly are advised to reduce to the minimum outdoor physical exertion, and to reduce to the minimum the time of their stay outdoors, especially in areas with heavy traffic. Employers of outdoor workers performing heavy manual work are advised to assess the risk of outdoor work, and take appropriate preventive measures to protect the health of their employees. The general public is advised to reduce outdoor physical exertion, and to reduce the time of their stay outdoors, especially in areas with heavy traffic.",
        },
    },
    // 严重 (11 = 10+)
    {
        range: [11, 11],
        glyph: "aqi.high",
        colors: ["#80172B"],
        categoryName: {
            "zh-Hant": "嚴重",
            "zh-Hans": "严重",
            "en":      "Serious",
        },
        recommendation: {
            "zh-Hant": "心臟病或呼吸系統疾病患者、兒童及長者應避免戶外體力消耗，以及避免在戶外逗留，特別在交通繁忙地方。從事重體力勞動的戶外工作僱員的僱主應評估戶外工作的風險，並採取適當的預防措施保障僱員的健康。一般市民應盡量減少戶外體力消耗，以及盡量減少在戶外逗留的時間，特別在交通繁忙地方。",
            "zh-Hans": "心脏病或呼吸系统疾病患者、儿童及长者应避免户外体力消耗，以及避免在户外逗留，特别在交通繁忙地方。从事重体力劳动的户外工作雇员的雇主应评估户外工作的风险，并采取适当的预防措施保障雇员的健康。一般市民应尽量减少户外体力消耗，以及尽量减少在户外逗留的时间，特别在交通繁忙地方。",
            "en":      "People with existing heart or respiratory illnesses, Children and the elderly are advised to avoid outdoor physical exertion, and to avoid staying outdoors, especially in areas with heavy traffic. Employers of outdoor workers performing heavy manual work are advised to assess the risk of outdoor work, and take appropriate preventive measures to protect the health of their employees. The general public is advised to reduce to the minimum outdoor physical exertion, and to reduce to the minimum the time of their stay outdoors, especially in areas with heavy traffic.",
        },
    },
];

/** 渐变色 stops（与 CA.AQHI 参考保持一致） */
const HK_AQHI_GRADIENT = {
    stops: [
        { location: 1,   color: "#04DE71" },
        { location: 2.5, color: "#04DE71" },
        { location: 4,   color: "#FFE620" },
        { location: 6,   color: "#FF9500" },
        { location: 7,   color: "#FA114F" },
        { location: 8,   color: "#D11343" },
        { location: 9.5, color: "#80172B" },
    ],
};

// ─── 工具函数 ──────────────────────────────────────────────────────────────────

/**
 * 从三键 i18n map 中根据语言标签获取字符串。
 * 回退链：zh-Hans → zh-Hant → en
 * @param {{ "zh-Hans": string, "zh-Hant": string, "en": string }} map
 * @param {"zh-Hans"|"zh-Hant"|"en"} lang
 * @returns {string}
 */
function i18n(map, lang) {
    return map[lang] ?? map["en"] ?? "";
}

/**
 * 将请求语言映射为响应中的地区语言标签：
 * zh-Hans* -> zh-CN, zh-Hant-TW -> zh-TW, 其余 zh* -> zh-HK, 非中文 -> en
 * @param {string} language
 * @returns {"zh-HK"|"zh-CN"|"zh-TW"|"en"}
 */
function normalizeScaleLanguage(language) {
    if (/zh-Hans/i.test(language)) return "zh-CN";
    if (/^zh-Hant-TW$/i.test(language)) return "zh-TW";
    if (/^zh/i.test(language)) return "zh-HK";
    return "en";
}

// ─── AirQualityScale 类 ────────────────────────────────────────────────────────

export default class AirQualityScale {
    /**
     * 将 Apple WeatherKit BCP47 语言标签规范化为三键形式：zh-Hans / zh-Hant / en。
     * 例：zh-Hans-HK → zh-Hans，zh-Hant-TW → zh-Hant，en-GB → en
     * @param {string} language
     * @returns {"zh-Hans"|"zh-Hant"|"en"}
     */
    static normalizeLanguage(language) {
        if (/zh-Hans/i.test(language)) return "zh-Hans";
        if (/zh-Hant/i.test(language)) return "zh-Hant";
        if (/^zh/i.test(language))     return "zh-Hant"; // 无脚本标签的 zh-* 默认繁体
        return "en";
    }

    /**
     * 构建 HK AQHI 标尺 JSON 响应体。
     * 格式与 WeatherKit /api/v1/airQualityScale/{lang}/CA.AQHI.2414 保持一致。
     *
     * @param {string} language - 请求的语言标签，如 "zh-Hans-HK"、"en"
     * @param {string} scaleName - 标尺名称，如 "HK.AQHI.2414"
     * @returns {{ status: number, headers: Record<string, string>, body: string }}
     */
    static buildHKAQHIScale(language, scaleName) {
        const lang = AirQualityScale.normalizeLanguage(language);

        // 展开每一级 categoryNumber (1~11)
        const categories = [];
        for (const band of HK_AQHI_CATEGORIES) {
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
            name: scaleName,
            displayName:      i18n(HK_AQHI_META.displayName, lang),
            shortDisplayName: i18n(HK_AQHI_META.shortDisplayName, lang),
            longDisplayName:  i18n(HK_AQHI_META.longDisplayName, lang),
            displayLabel:     i18n(SCALE_DISPLAY_LABEL, lang),
            language: normalizeScaleLanguage(language),
            version: 1,
            aqi: {
                numerical: true,
                ascending: true,
                range: [1, 11],
                categories,
                gradient: HK_AQHI_GRADIENT,
            },
        };

        return {
            status: 200,
            headers: {
                "Content-Type": "application/json",
                "Cache-Control": "max-age=31536000, public, s-maxage=31536000",
            },
            body: JSON.stringify(scale),
        };
    }
}
