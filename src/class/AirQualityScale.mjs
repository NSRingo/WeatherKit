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

/** HK AQHI 顶层元数据 */
const HK_AQHI_META = {
    displayName: {
        "zh-Hans": "AQHI（香港）",
        "zh-Hant": "AQHI（香港）",
        "en":      "AQHI (HK)",
    },
    shortDisplayName: {
        "zh-Hans": "AQHI",
        "zh-Hant": "AQHI",
        "en":      "AQHI",
    },
    longDisplayName: {
        "zh-Hans": "香港 (AQHI)",
        "zh-Hant": "香港 (AQHI)",
        "en":      "Hong Kong (AQHI)",
    },
    displayLabel: {
        "zh-Hans": "空气质量",
        "zh-Hant": "空氣質素",
        "en":      "Air Quality",
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
        colors: ["#2094FA", "#2094FA", "#6AAFB1"],
        categoryName: {
            "zh-Hans": "健康风险低",
            "zh-Hant": "健康風險低",
            "en":      "Low Health Risk",
        },
        recommendation: {
            "zh-Hans": "空气质量良好，适合户外活动。",
            "zh-Hant": "空氣質素良好，適合戶外活動。",
            "en":      "The air quality is good. Enjoy your usual outdoor activities.",
        },
    },
    // 中 (4-6)
    {
        range: [4, 6],
        glyph: "aqi.medium",
        colors: ["#FFE620", "#FFBE10", "#FF9500"],
        categoryName: {
            "zh-Hans": "健康风险中等",
            "zh-Hant": "健康風險中等",
            "en":      "Moderate Health Risk",
        },
        recommendation: {
            "zh-Hans": "如无不适，无需减少户外活动。高危人士若感不适，应考虑减少高强度户外活动。",
            "zh-Hant": "如無不適，無需減少戶外活動。高危人士若感不適，應考慮減少高強度戶外活動。",
            "en":      "No need to reduce outdoor activities unless you experience symptoms such as coughing and throat irritation. People with high health risk should consider reducing or rescheduling strenuous outdoor activities if they experience symptoms.",
        },
    },
    // 高 (7)
    {
        range: [7, 7],
        glyph: "aqi.high",
        colors: ["#FD5328"],
        categoryName: {
            "zh-Hans": "健康风险高",
            "zh-Hant": "健康風險高",
            "en":      "High Health Risk",
        },
        recommendation: {
            "zh-Hans": "如出现不适，应考虑减少高强度户外活动。高危人士、儿童及老人应减少高强度户外活动。",
            "zh-Hant": "如出現不適，應考慮減少高強度戶外活動。高危人士、兒童及老人應減少高強度戶外活動。",
            "en":      "Reduce or reschedule strenuous outdoor activities if you experience symptoms such as coughing and throat irritation. People with high health risk, children and the elderly should reduce or reschedule strenuous outdoor activities.",
        },
    },
    // 甚高 (8-10)
    {
        range: [8, 10],
        glyph: "aqi.high",
        colors: ["#FA114F", "#A91537", "#80172B"],
        categoryName: {
            "zh-Hans": "健康风险甚高",
            "zh-Hant": "健康風險甚高",
            "en":      "Very High Health Risk",
        },
        recommendation: {
            "zh-Hans": "应减少高强度户外活动，尤其在出现不适时。高危人士、儿童及老人应避免高强度户外活动。",
            "zh-Hant": "應減少高強度戶外活動，尤其在出現不適時。高危人士、兒童及老人應避免高強度戶外活動。",
            "en":      "Reduce or reschedule strenuous outdoor activities. People with high health risk, children and the elderly should avoid strenuous outdoor activities.",
        },
    },
    // 严重 (11 = 10+)
    {
        range: [11, 11],
        glyph: "aqi.high",
        colors: ["#80172B"],
        categoryName: {
            "zh-Hans": "健康风险严重",
            "zh-Hant": "健康風險嚴重",
            "en":      "Serious Health Risk",
        },
        recommendation: {
            "zh-Hans": "减少或调整户外活动，尤其在出现咳嗽和喉咙刺激等症状时。高危人士、儿童及老人应避免户外活动。",
            "zh-Hant": "減少或調整戶外活動，尤其在出現咳嗽和喉嚨刺激等症狀時。高危人士、兒童及老人應避免戶外活動。",
            "en":      "Reduce or reschedule outdoor activities, especially if you experience symptoms such as coughing and throat irritation. People with high health risk, children and the elderly should avoid outdoor activities.",
        },
    },
];

/** 渐变色 stops（与 CA.AQHI 参考保持一致） */
const HK_AQHI_GRADIENT = {
    stops: [
        { location: 1,   color: "#2094FA" },
        { location: 2.5, color: "#2094FA" },
        { location: 4,   color: "#FFE620" },
        { location: 6,   color: "#FF9500" },
        { location: 7,   color: "#FD5328" },
        { location: 8,   color: "#FA114F" },
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
        if (/^zh/i.test(language))     return "zh-Hans"; // 无脚本标签的 zh-* 默认简体
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
            displayLabel:     i18n(HK_AQHI_META.displayLabel, lang),
            language: lang,
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
                "Content-Type": "application/json; charset=utf-8",
                "Cache-Control": "max-age=86400",
            },
            body: JSON.stringify(scale),
        };
    }
}
