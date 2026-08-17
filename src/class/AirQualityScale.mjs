/**
 * 提供空气质量标尺（AQI Scale）的本地响应能力。
 * Provides local responses for air-quality scales.
 */
export default class AirQualityScale {
    static Name = "AirQualityScale";
    static Version = "1.0.0";
    static Author = "Virgil Clyne & Wordless Echo";

    #Config = {
        Headers: {
            "Content-Type": "application/json",
            "Cache-Control": "max-age=31536000, public, s-maxage=31536000",
        },
        Language: {
            en: "en-US",
            "en-au": "en-US",
            "en-ca": "en-US",
            "en-gb": "en-US",
            "en-ie": "en-US",
            "en-in": "en-US",
            "en-latn": "en-US",
            "en-latn-au": "en-US",
            "en-nz": "en-US",
            "en-sg": "en-US",
            "en-us": "en-US",
            "en-za": "en-US",
            zh: "zh-Hant-TW",
            "zh-hans": "zh-Hans-CN",
            "zh-cn": "zh-Hans-CN",
            "zh-sg": "zh-Hans-CN",
            "zh-hans-cn": "zh-Hans-CN",
            "zh-hans-hk": "zh-Hans-CN",
            "zh-hans-mo": "zh-Hans-CN",
            "zh-hans-sg": "zh-Hans-CN",
            "zh-hant": "zh-Hant-TW",
            "zh-tw": "zh-Hant-TW",
            "zh-hant-tw": "zh-Hant-TW",
            "zh-hk": "zh-Hant-HK",
            "zh-mo": "zh-Hant-HK",
            "zh-hant-hk": "zh-Hant-HK",
            "zh-hant-mo": "zh-Hant-HK",
        },
        AirQualityScale: {
            "HK.AQHI": {
                "zh-Hans-CN": {
                    name: "HK.AQHI",
                    displayName: "AQHI (HK)",
                    shortDisplayName: "AQHI",
                    longDisplayName: "香港 (AQHI)",
                    displayLabel: "空气质量",
                    language: "zh-CN",
                    version: 1,
                    aqi: {
                        numerical: true,
                        ascending: true,
                        range: [1, 11],
                        categories: [
                            {
                                categoryNumber: 1,
                                range: [1, 1],
                                color: "#04DE71",
                                categoryName: "低",
                                recommendation: "可如常活动。",
                                glyph: "aqi.low",
                            },
                            {
                                categoryNumber: 2,
                                range: [2, 2],
                                color: "#04DE71",
                                categoryName: "低",
                                recommendation: "可如常活动。",
                                glyph: "aqi.low",
                            },
                            {
                                categoryNumber: 3,
                                range: [3, 3],
                                color: "#58E156",
                                categoryName: "低",
                                recommendation: "可如常活动。",
                                glyph: "aqi.low",
                            },
                            {
                                categoryNumber: 4,
                                range: [4, 4],
                                color: "#FFE620",
                                categoryName: "中",
                                recommendation: "一般可如常活动，但個別出现症状的人士应考虑减少户外体力消耗。",
                                glyph: "aqi.medium",
                            },
                            {
                                categoryNumber: 5,
                                range: [5, 5],
                                color: "#FFBE10",
                                categoryName: "中",
                                recommendation: "一般可如常活动，但個別出现症状的人士应考虑减少户外体力消耗。",
                                glyph: "aqi.medium",
                            },
                            {
                                categoryNumber: 6,
                                range: [6, 6],
                                color: "#FF9500",
                                categoryName: "中",
                                recommendation: "一般可如常活动，但個別出现症状的人士应考虑减少户外体力消耗。",
                                glyph: "aqi.medium",
                            },
                            {
                                categoryNumber: 7,
                                range: [7, 7],
                                color: "#FA114F",
                                categoryName: "高",
                                recommendation: "心脏病或呼吸系统疾病患者、儿童及长者应减少户外体力消耗，以及减少在户外逗留的时间，特别在交通繁忙地方。心脏病或呼吸系统疾病患者在参与体育活动前应咨询医生意见，在体能活动期间应多作歇息。",
                                glyph: "aqi.high",
                            },
                            {
                                categoryNumber: 8,
                                range: [8, 8],
                                color: "#D11343",
                                categoryName: "甚高",
                                recommendation:
                                    "心脏病或呼吸系统疾病患者、儿童及长者应尽量减少户外体力消耗，以及尽量减少在户外逗留的时间，特别在交通繁忙地方。从事重体力劳动的户外工作僱员的僱主应评估户外工作的风险，并採取适当的预防措施保障僱员的健康。一般市民应减少户外体力消耗，以及减少在户外逗留的时间，特别在交通繁忙地方。",
                                glyph: "aqi.high",
                            },
                            {
                                categoryNumber: 9,
                                range: [9, 9],
                                color: "#A91537",
                                categoryName: "甚高",
                                recommendation:
                                    "心脏病或呼吸系统疾病患者、儿童及长者应尽量减少户外体力消耗，以及尽量减少在户外逗留的时间，特别在交通繁忙地方。从事重体力劳动的户外工作僱员的僱主应评估户外工作的风险，并採取适当的预防措施保障僱员的健康。一般市民应减少户外体力消耗，以及减少在户外逗留的时间，特别在交通繁忙地方。",
                                glyph: "aqi.high",
                            },
                            {
                                categoryNumber: 10,
                                range: [10, 10],
                                color: "#80172B",
                                categoryName: "甚高",
                                recommendation:
                                    "心脏病或呼吸系统疾病患者、儿童及长者应尽量减少户外体力消耗，以及尽量减少在户外逗留的时间，特别在交通繁忙地方。从事重体力劳动的户外工作僱员的僱主应评估户外工作的风险，并採取适当的预防措施保障僱员的健康。一般市民应减少户外体力消耗，以及减少在户外逗留的时间，特别在交通繁忙地方。",
                                glyph: "aqi.high",
                            },
                            {
                                categoryNumber: 11,
                                range: [11, 11],
                                color: "#80172B",
                                categoryName: "严重",
                                recommendation:
                                    "心脏病或呼吸系统疾病患者、儿童及长者应避免户外体力消耗，以及避免在户外逗留，特别在交通繁忙地方。从事重体力劳动的户外工作雇员的雇主应评估户外工作的风险，并采取适当的预防措施保障雇员的健康。一般市民应尽量减少户外体力消耗，以及尽量减少在户外逗留的时间，特别在交通繁忙地方。",
                                glyph: "aqi.high",
                            },
                        ],
                        gradient: {
                            stops: [
                                {
                                    location: 1,
                                    color: "#04DE71",
                                },
                                {
                                    location: 2.5,
                                    color: "#04DE71",
                                },
                                {
                                    location: 4,
                                    color: "#FFE620",
                                },
                                {
                                    location: 6,
                                    color: "#FF9500",
                                },
                                {
                                    location: 7,
                                    color: "#FA114F",
                                },
                                {
                                    location: 8,
                                    color: "#D11343",
                                },
                                {
                                    location: 9.5,
                                    color: "#80172B",
                                },
                            ],
                        },
                    },
                },
                "zh-Hant-HK": {
                    name: "HK.AQHI",
                    displayName: "AQHI (HK)",
                    shortDisplayName: "AQHI",
                    longDisplayName: "香港 (AQHI)",
                    displayLabel: "空氣質素",
                    language: "zh-HK",
                    version: 1,
                    aqi: {
                        numerical: true,
                        ascending: true,
                        range: [1, 11],
                        categories: [
                            {
                                categoryNumber: 1,
                                range: [1, 1],
                                color: "#04DE71",
                                categoryName: "低",
                                recommendation: "可如常活動。",
                                glyph: "aqi.low",
                            },
                            {
                                categoryNumber: 2,
                                range: [2, 2],
                                color: "#04DE71",
                                categoryName: "低",
                                recommendation: "可如常活動。",
                                glyph: "aqi.low",
                            },
                            {
                                categoryNumber: 3,
                                range: [3, 3],
                                color: "#58E156",
                                categoryName: "低",
                                recommendation: "可如常活動。",
                                glyph: "aqi.low",
                            },
                            {
                                categoryNumber: 4,
                                range: [4, 4],
                                color: "#FFE620",
                                categoryName: "中",
                                recommendation: "一般可如常活動，但個別出現症狀的人士應考慮減少戶外體力消耗。",
                                glyph: "aqi.medium",
                            },
                            {
                                categoryNumber: 5,
                                range: [5, 5],
                                color: "#FFBE10",
                                categoryName: "中",
                                recommendation: "一般可如常活動，但個別出現症狀的人士應考慮減少戶外體力消耗。",
                                glyph: "aqi.medium",
                            },
                            {
                                categoryNumber: 6,
                                range: [6, 6],
                                color: "#FF9500",
                                categoryName: "中",
                                recommendation: "一般可如常活動，但個別出現症狀的人士應考慮減少戶外體力消耗。",
                                glyph: "aqi.medium",
                            },
                            {
                                categoryNumber: 7,
                                range: [7, 7],
                                color: "#FA114F",
                                categoryName: "高",
                                recommendation: "心臟病或呼吸系統疾病患者、兒童及長者應減少戶外體力消耗，以及減少在戶外逗留的時間，特別在交通繁忙地方。心臟病或呼吸系統疾病患者在參與體育活動前應諮詢醫生意見，在體能活動期間應多作歇息。",
                                glyph: "aqi.high",
                            },
                            {
                                categoryNumber: 8,
                                range: [8, 8],
                                color: "#D11343",
                                categoryName: "甚高",
                                recommendation:
                                    "心臟病或呼吸系統疾病患者、兒童及長者應盡量減少戶外體力消耗，以及盡量減少在戶外逗留的時間，特別在交通繁忙地方。從事重體力勞動的戶外工作僱員的僱主應評估戶外工作的風險，並採取適當的預防措施保障僱員的健康。一般市民應減少戶外體力消耗，以及減少在戶外逗留的時間，特別在交通繁忙地方。",
                                glyph: "aqi.high",
                            },
                            {
                                categoryNumber: 9,
                                range: [9, 9],
                                color: "#A91537",
                                categoryName: "甚高",
                                recommendation:
                                    "心臟病或呼吸系統疾病患者、兒童及長者應盡量減少戶外體力消耗，以及盡量減少在戶外逗留的時間，特別在交通繁忙地方。從事重體力勞動的戶外工作僱員的僱主應評估戶外工作的風險，並採取適當的預防措施保障僱員的健康。一般市民應減少戶外體力消耗，以及減少在戶外逗留的時間，特別在交通繁忙地方。",
                                glyph: "aqi.high",
                            },
                            {
                                categoryNumber: 10,
                                range: [10, 10],
                                color: "#80172B",
                                categoryName: "甚高",
                                recommendation:
                                    "心臟病或呼吸系統疾病患者、兒童及長者應盡量減少戶外體力消耗，以及盡量減少在戶外逗留的時間，特別在交通繁忙地方。從事重體力勞動的戶外工作僱員的僱主應評估戶外工作的風險，並採取適當的預防措施保障僱員的健康。一般市民應減少戶外體力消耗，以及減少在戶外逗留的時間，特別在交通繁忙地方。",
                                glyph: "aqi.high",
                            },
                            {
                                categoryNumber: 11,
                                range: [11, 11],
                                color: "#80172B",
                                categoryName: "嚴重",
                                recommendation:
                                    "心臟病或呼吸系統疾病患者、兒童及長者應避免戶外體力消耗，以及避免在戶外逗留，特別在交通繁忙地方。從事重體力勞動的戶外工作僱員的僱主應評估戶外工作的風險，並採取適當的預防措施保障僱員的健康。一般市民應盡量減少戶外體力消耗，以及盡量減少在戶外逗留的時間，特別在交通繁忙地方。",
                                glyph: "aqi.high",
                            },
                        ],
                        gradient: {
                            stops: [
                                {
                                    location: 1,
                                    color: "#04DE71",
                                },
                                {
                                    location: 2.5,
                                    color: "#04DE71",
                                },
                                {
                                    location: 4,
                                    color: "#FFE620",
                                },
                                {
                                    location: 6,
                                    color: "#FF9500",
                                },
                                {
                                    location: 7,
                                    color: "#FA114F",
                                },
                                {
                                    location: 8,
                                    color: "#D11343",
                                },
                                {
                                    location: 9.5,
                                    color: "#80172B",
                                },
                            ],
                        },
                    },
                },
                "zh-Hant-TW": {
                    name: "HK.AQHI",
                    displayName: "AQHI (HK)",
                    shortDisplayName: "AQHI",
                    longDisplayName: "香港 (AQHI)",
                    displayLabel: "空氣品質",
                    language: "zh-TW",
                    version: 1,
                    aqi: {
                        numerical: true,
                        ascending: true,
                        range: [1, 11],
                        categories: [
                            {
                                categoryNumber: 1,
                                range: [1, 1],
                                color: "#04DE71",
                                categoryName: "低",
                                recommendation: "可如常活動。",
                                glyph: "aqi.low",
                            },
                            {
                                categoryNumber: 2,
                                range: [2, 2],
                                color: "#04DE71",
                                categoryName: "低",
                                recommendation: "可如常活動。",
                                glyph: "aqi.low",
                            },
                            {
                                categoryNumber: 3,
                                range: [3, 3],
                                color: "#58E156",
                                categoryName: "低",
                                recommendation: "可如常活動。",
                                glyph: "aqi.low",
                            },
                            {
                                categoryNumber: 4,
                                range: [4, 4],
                                color: "#FFE620",
                                categoryName: "中",
                                recommendation: "一般可如常活動，但個別出現症狀的人士應考慮減少戶外體力消耗。",
                                glyph: "aqi.medium",
                            },
                            {
                                categoryNumber: 5,
                                range: [5, 5],
                                color: "#FFBE10",
                                categoryName: "中",
                                recommendation: "一般可如常活動，但個別出現症狀的人士應考慮減少戶外體力消耗。",
                                glyph: "aqi.medium",
                            },
                            {
                                categoryNumber: 6,
                                range: [6, 6],
                                color: "#FF9500",
                                categoryName: "中",
                                recommendation: "一般可如常活動，但個別出現症狀的人士應考慮減少戶外體力消耗。",
                                glyph: "aqi.medium",
                            },
                            {
                                categoryNumber: 7,
                                range: [7, 7],
                                color: "#FA114F",
                                categoryName: "高",
                                recommendation: "心臟病或呼吸系統疾病患者、兒童及長者應減少戶外體力消耗，以及減少在戶外逗留的時間，特別在交通繁忙地方。心臟病或呼吸系統疾病患者在參與體育活動前應諮詢醫生意見，在體能活動期間應多作歇息。",
                                glyph: "aqi.high",
                            },
                            {
                                categoryNumber: 8,
                                range: [8, 8],
                                color: "#D11343",
                                categoryName: "甚高",
                                recommendation:
                                    "心臟病或呼吸系統疾病患者、兒童及長者應盡量減少戶外體力消耗，以及盡量減少在戶外逗留的時間，特別在交通繁忙地方。從事重體力勞動的戶外工作僱員的僱主應評估戶外工作的風險，並採取適當的預防措施保障僱員的健康。一般市民應減少戶外體力消耗，以及減少在戶外逗留的時間，特別在交通繁忙地方。",
                                glyph: "aqi.high",
                            },
                            {
                                categoryNumber: 9,
                                range: [9, 9],
                                color: "#A91537",
                                categoryName: "甚高",
                                recommendation:
                                    "心臟病或呼吸系統疾病患者、兒童及長者應盡量減少戶外體力消耗，以及盡量減少在戶外逗留的時間，特別在交通繁忙地方。從事重體力勞動的戶外工作僱員的僱主應評估戶外工作的風險，並採取適當的預防措施保障僱員的健康。一般市民應減少戶外體力消耗，以及減少在戶外逗留的時間，特別在交通繁忙地方。",
                                glyph: "aqi.high",
                            },
                            {
                                categoryNumber: 10,
                                range: [10, 10],
                                color: "#80172B",
                                categoryName: "甚高",
                                recommendation:
                                    "心臟病或呼吸系統疾病患者、兒童及長者應盡量減少戶外體力消耗，以及盡量減少在戶外逗留的時間，特別在交通繁忙地方。從事重體力勞動的戶外工作僱員的僱主應評估戶外工作的風險，並採取適當的預防措施保障僱員的健康。一般市民應減少戶外體力消耗，以及減少在戶外逗留的時間，特別在交通繁忙地方。",
                                glyph: "aqi.high",
                            },
                            {
                                categoryNumber: 11,
                                range: [11, 11],
                                color: "#80172B",
                                categoryName: "嚴重",
                                recommendation:
                                    "心臟病或呼吸系統疾病患者、兒童及長者應避免戶外體力消耗，以及避免在戶外逗留，特別在交通繁忙地方。從事重體力勞動的戶外工作僱員的僱主應評估戶外工作的風險，並採取適當的預防措施保障僱員的健康。一般市民應盡量減少戶外體力消耗，以及盡量減少在戶外逗留的時間，特別在交通繁忙地方。",
                                glyph: "aqi.high",
                            },
                        ],
                        gradient: {
                            stops: [
                                {
                                    location: 1,
                                    color: "#04DE71",
                                },
                                {
                                    location: 2.5,
                                    color: "#04DE71",
                                },
                                {
                                    location: 4,
                                    color: "#FFE620",
                                },
                                {
                                    location: 6,
                                    color: "#FF9500",
                                },
                                {
                                    location: 7,
                                    color: "#FA114F",
                                },
                                {
                                    location: 8,
                                    color: "#D11343",
                                },
                                {
                                    location: 9.5,
                                    color: "#80172B",
                                },
                            ],
                        },
                    },
                },
                "en-US": {
                    name: "HK.AQHI",
                    displayName: "AQHI (HK)",
                    shortDisplayName: "AQHI",
                    longDisplayName: "Hong Kong (AQHI)",
                    displayLabel: "Air Quality",
                    language: "en",
                    version: 1,
                    aqi: {
                        numerical: true,
                        ascending: true,
                        range: [1, 11],
                        categories: [
                            {
                                categoryNumber: 1,
                                range: [1, 1],
                                color: "#04DE71",
                                categoryName: "Low",
                                recommendation: "No response action is required.",
                                glyph: "aqi.low",
                            },
                            {
                                categoryNumber: 2,
                                range: [2, 2],
                                color: "#04DE71",
                                categoryName: "Low",
                                recommendation: "No response action is required.",
                                glyph: "aqi.low",
                            },
                            {
                                categoryNumber: 3,
                                range: [3, 3],
                                color: "#58E156",
                                categoryName: "Low",
                                recommendation: "No response action is required.",
                                glyph: "aqi.low",
                            },
                            {
                                categoryNumber: 4,
                                range: [4, 4],
                                color: "#FFE620",
                                categoryName: "Moderate",
                                recommendation: "No response action is normally required. Individuals who are experiencing symptoms are advised to consider reducing outdoor physical exertion.",
                                glyph: "aqi.medium",
                            },
                            {
                                categoryNumber: 5,
                                range: [5, 5],
                                color: "#FFBE10",
                                categoryName: "Moderate",
                                recommendation: "No response action is normally required. Individuals who are experiencing symptoms are advised to consider reducing outdoor physical exertion.",
                                glyph: "aqi.medium",
                            },
                            {
                                categoryNumber: 6,
                                range: [6, 6],
                                color: "#FF9500",
                                categoryName: "Moderate",
                                recommendation: "No response action is normally required. Individuals who are experiencing symptoms are advised to consider reducing outdoor physical exertion.",
                                glyph: "aqi.medium",
                            },
                            {
                                categoryNumber: 7,
                                range: [7, 7],
                                color: "#FA114F",
                                categoryName: "High",
                                recommendation:
                                    "People with existing heart or respiratory illnesses, Children and the elderly are advised to reduce outdoor physical exertion, and to reduce the time of their stay outdoors, especially in areas with heavy traffic. People with existing heart or respiratory illnesses should also seek advice from a medical doctor before participating in sport activities and take more breaks during physical activities.",
                                glyph: "aqi.high",
                            },
                            {
                                categoryNumber: 8,
                                range: [8, 8],
                                color: "#D11343",
                                categoryName: "Very High",
                                recommendation:
                                    "People with existing heart or respiratory illnesses, Children and the elderly are advised to reduce to the minimum outdoor physical exertion, and to reduce to the minimum the time of their stay outdoors, especially in areas with heavy traffic. Employers of outdoor workers performing heavy manual work are advised to assess the risk of outdoor work, and take appropriate preventive measures to protect the health of their employees. The general public is advised to reduce outdoor physical exertion, and to reduce the time of their stay outdoors, especially in areas with heavy traffic.",
                                glyph: "aqi.high",
                            },
                            {
                                categoryNumber: 9,
                                range: [9, 9],
                                color: "#A91537",
                                categoryName: "Very High",
                                recommendation:
                                    "People with existing heart or respiratory illnesses, Children and the elderly are advised to reduce to the minimum outdoor physical exertion, and to reduce to the minimum the time of their stay outdoors, especially in areas with heavy traffic. Employers of outdoor workers performing heavy manual work are advised to assess the risk of outdoor work, and take appropriate preventive measures to protect the health of their employees. The general public is advised to reduce outdoor physical exertion, and to reduce the time of their stay outdoors, especially in areas with heavy traffic.",
                                glyph: "aqi.high",
                            },
                            {
                                categoryNumber: 10,
                                range: [10, 10],
                                color: "#80172B",
                                categoryName: "Very High",
                                recommendation:
                                    "People with existing heart or respiratory illnesses, Children and the elderly are advised to reduce to the minimum outdoor physical exertion, and to reduce to the minimum the time of their stay outdoors, especially in areas with heavy traffic. Employers of outdoor workers performing heavy manual work are advised to assess the risk of outdoor work, and take appropriate preventive measures to protect the health of their employees. The general public is advised to reduce outdoor physical exertion, and to reduce the time of their stay outdoors, especially in areas with heavy traffic.",
                                glyph: "aqi.high",
                            },
                            {
                                categoryNumber: 11,
                                range: [11, 11],
                                color: "#80172B",
                                categoryName: "Serious",
                                recommendation:
                                    "People with existing heart or respiratory illnesses, Children and the elderly are advised to avoid outdoor physical exertion, and to avoid staying outdoors, especially in areas with heavy traffic. Employers of outdoor workers performing heavy manual work are advised to assess the risk of outdoor work, and take appropriate preventive measures to protect the health of their employees. The general public is advised to reduce to the minimum outdoor physical exertion, and to reduce to the minimum the time of their stay outdoors, especially in areas with heavy traffic.",
                                glyph: "aqi.high",
                            },
                        ],
                        gradient: {
                            stops: [
                                {
                                    location: 1,
                                    color: "#04DE71",
                                },
                                {
                                    location: 2.5,
                                    color: "#04DE71",
                                },
                                {
                                    location: 4,
                                    color: "#FFE620",
                                },
                                {
                                    location: 6,
                                    color: "#FF9500",
                                },
                                {
                                    location: 7,
                                    color: "#FA114F",
                                },
                                {
                                    location: 8,
                                    color: "#D11343",
                                },
                                {
                                    location: 9.5,
                                    color: "#80172B",
                                },
                            ],
                        },
                    },
                },
            },
            "CN.AQHI": {
                "zh-Hans-CN": {
                    name: "CN.AQHI",
                    displayName: "AQHI (CN)",
                    shortDisplayName: "AQHI",
                    longDisplayName: "中国 (AQHI)",
                    displayLabel: "空气质量",
                    language: "zh-CN",
                    version: 1,
                    aqi: {
                        numerical: true,
                        ascending: true,
                        range: [1, 11],
                        categories: [
                            {
                                categoryNumber: 1,
                                range: [1, 1],
                                color: "#2094FA",
                                categoryName: "极低",
                                recommendation: "适宜进行户外活动。",
                                glyph: "aqi.low",
                            },
                            {
                                categoryNumber: 2,
                                range: [2, 2],
                                color: "#04DE71",
                                categoryName: "低",
                                recommendation: "正常进行户外活动。心肺疾病患者可遵照医嘱进行身体锻炼。",
                                glyph: "aqi.low",
                            },
                            {
                                categoryNumber: 3,
                                range: [3, 3],
                                color: "#CCFF66",
                                categoryName: "低",
                                recommendation: "正常进行户外活动。心肺疾病患者可遵照医嘱进行身体锻炼。",
                                glyph: "aqi.low",
                            },
                            {
                                categoryNumber: 4,
                                range: [4, 4],
                                color: "#FFE620",
                                categoryName: "中",
                                recommendation: "心肺疾病患者应减少长时间、高强度的户外活动，并遵照医嘱进行身体锻炼。",
                                glyph: "aqi.medium",
                            },
                            {
                                categoryNumber: 5,
                                range: [5, 5],
                                color: "#FF9500",
                                categoryName: "中",
                                recommendation: "心肺疾病患者应减少长时间、高强度的户外活动，并遵照医嘱进行身体锻炼。",
                                glyph: "aqi.medium",
                            },
                            {
                                categoryNumber: 6,
                                range: [6, 6],
                                color: "#FA114F",
                                categoryName: "高",
                                recommendation: "心肺疾病患者、老人、儿童及孕妇应尽量减少户外活动，特别是在交通繁忙的地方。一般人群应减少长时间、高强度的户外活动。",
                                glyph: "aqi.high",
                            },
                            {
                                categoryNumber: 7,
                                range: [7, 7],
                                color: "#DC1346",
                                categoryName: "高",
                                recommendation: "心肺疾病患者、老人、儿童及孕妇应尽量减少户外活动，特别是在交通繁忙的地方。一般人群应减少长时间、高强度的户外活动。",
                                glyph: "aqi.high",
                            },
                            {
                                categoryNumber: 8,
                                range: [8, 8],
                                color: "#BD143D",
                                categoryName: "高",
                                recommendation: "心肺疾病患者、老人、儿童及孕妇应尽量减少户外活动，特别是在交通繁忙的地方。一般人群应减少长时间、高强度的户外活动。",
                                glyph: "aqi.high",
                            },
                            {
                                categoryNumber: 9,
                                range: [9, 9],
                                color: "#9F1634",
                                categoryName: "高",
                                recommendation: "心肺疾病患者、老人、儿童及孕妇应尽量减少户外活动，特别是在交通繁忙的地方。一般人群应减少长时间、高强度的户外活动。",
                                glyph: "aqi.high",
                            },
                            {
                                categoryNumber: 10,
                                range: [10, 10],
                                color: "#80172B",
                                categoryName: "高",
                                recommendation: "心肺疾病患者、老人、儿童及孕妇应尽量减少户外活动，特别是在交通繁忙的地方。一般人群应减少长时间、高强度的户外活动。",
                                glyph: "aqi.high",
                            },
                            {
                                categoryNumber: 11,
                                range: [11, 11],
                                color: "#80172B",
                                categoryName: "极高",
                                recommendation: "心肺疾病患者、老人、儿童及孕妇应避免户外活动，避免体力消耗。一般人群应尽量减少户外活动，特别是在交通繁忙的地方。",
                                glyph: "aqi.high",
                            },
                        ],
                        gradient: {
                            stops: [
                                {
                                    location: 1,
                                    color: "#2094FA",
                                },
                                {
                                    location: 2,
                                    color: "#04DE71",
                                },
                                {
                                    location: 3.5,
                                    color: "#CCFF66",
                                },
                                {
                                    location: 4,
                                    color: "#FFE620",
                                },
                                {
                                    location: 6,
                                    color: "#FA114F",
                                },
                                {
                                    location: 8,
                                    color: "#BD143D",
                                },
                                {
                                    location: 10,
                                    color: "#80172B",
                                },
                            ],
                        },
                    },
                },
                "zh-Hant-HK": {
                    name: "CN.AQHI",
                    displayName: "AQHI (CN)",
                    shortDisplayName: "AQHI",
                    longDisplayName: "中国 (AQHI)",
                    displayLabel: "空气质量",
                    language: "zh-HK",
                    version: 1,
                    aqi: {
                        numerical: true,
                        ascending: true,
                        range: [1, 11],
                        categories: [
                            {
                                categoryNumber: 1,
                                range: [1, 1],
                                color: "#2094FA",
                                categoryName: "极低",
                                recommendation: "适宜进行户外活动。",
                                glyph: "aqi.low",
                            },
                            {
                                categoryNumber: 2,
                                range: [2, 2],
                                color: "#04DE71",
                                categoryName: "低",
                                recommendation: "正常进行户外活动。心肺疾病患者可遵照医嘱进行身体锻炼。",
                                glyph: "aqi.low",
                            },
                            {
                                categoryNumber: 3,
                                range: [3, 3],
                                color: "#CCFF66",
                                categoryName: "低",
                                recommendation: "正常进行户外活动。心肺疾病患者可遵照医嘱进行身体锻炼。",
                                glyph: "aqi.low",
                            },
                            {
                                categoryNumber: 4,
                                range: [4, 4],
                                color: "#FFE620",
                                categoryName: "中",
                                recommendation: "心肺疾病患者应减少长时间、高强度的户外活动，并遵照医嘱进行身体锻炼。",
                                glyph: "aqi.medium",
                            },
                            {
                                categoryNumber: 5,
                                range: [5, 5],
                                color: "#FF9500",
                                categoryName: "中",
                                recommendation: "心肺疾病患者应减少长时间、高强度的户外活动，并遵照医嘱进行身体锻炼。",
                                glyph: "aqi.medium",
                            },
                            {
                                categoryNumber: 6,
                                range: [6, 6],
                                color: "#FA114F",
                                categoryName: "高",
                                recommendation: "心肺疾病患者、老人、儿童及孕妇应尽量减少户外活动，特别是在交通繁忙的地方。一般人群应减少长时间、高强度的户外活动。",
                                glyph: "aqi.high",
                            },
                            {
                                categoryNumber: 7,
                                range: [7, 7],
                                color: "#DC1346",
                                categoryName: "高",
                                recommendation: "心肺疾病患者、老人、儿童及孕妇应尽量减少户外活动，特别是在交通繁忙的地方。一般人群应减少长时间、高强度的户外活动。",
                                glyph: "aqi.high",
                            },
                            {
                                categoryNumber: 8,
                                range: [8, 8],
                                color: "#BD143D",
                                categoryName: "高",
                                recommendation: "心肺疾病患者、老人、儿童及孕妇应尽量减少户外活动，特别是在交通繁忙的地方。一般人群应减少长时间、高强度的户外活动。",
                                glyph: "aqi.high",
                            },
                            {
                                categoryNumber: 9,
                                range: [9, 9],
                                color: "#9F1634",
                                categoryName: "高",
                                recommendation: "心肺疾病患者、老人、儿童及孕妇应尽量减少户外活动，特别是在交通繁忙的地方。一般人群应减少长时间、高强度的户外活动。",
                                glyph: "aqi.high",
                            },
                            {
                                categoryNumber: 10,
                                range: [10, 10],
                                color: "#80172B",
                                categoryName: "高",
                                recommendation: "心肺疾病患者、老人、儿童及孕妇应尽量减少户外活动，特别是在交通繁忙的地方。一般人群应减少长时间、高强度的户外活动。",
                                glyph: "aqi.high",
                            },
                            {
                                categoryNumber: 11,
                                range: [11, 11],
                                color: "#80172B",
                                categoryName: "极高",
                                recommendation: "心肺疾病患者、老人、儿童及孕妇应避免户外活动，避免体力消耗。一般人群应尽量减少户外活动，特别是在交通繁忙的地方。",
                                glyph: "aqi.high",
                            },
                        ],
                        gradient: {
                            stops: [
                                {
                                    location: 1,
                                    color: "#2094FA",
                                },
                                {
                                    location: 2,
                                    color: "#04DE71",
                                },
                                {
                                    location: 3.5,
                                    color: "#CCFF66",
                                },
                                {
                                    location: 4,
                                    color: "#FFE620",
                                },
                                {
                                    location: 6,
                                    color: "#FA114F",
                                },
                                {
                                    location: 8,
                                    color: "#BD143D",
                                },
                                {
                                    location: 10,
                                    color: "#80172B",
                                },
                            ],
                        },
                    },
                },
                "zh-Hant-TW": {
                    name: "CN.AQHI",
                    displayName: "AQHI (CN)",
                    shortDisplayName: "AQHI",
                    longDisplayName: "中国 (AQHI)",
                    displayLabel: "空气质量",
                    language: "zh-TW",
                    version: 1,
                    aqi: {
                        numerical: true,
                        ascending: true,
                        range: [1, 11],
                        categories: [
                            {
                                categoryNumber: 1,
                                range: [1, 1],
                                color: "#2094FA",
                                categoryName: "极低",
                                recommendation: "适宜进行户外活动。",
                                glyph: "aqi.low",
                            },
                            {
                                categoryNumber: 2,
                                range: [2, 2],
                                color: "#04DE71",
                                categoryName: "低",
                                recommendation: "正常进行户外活动。心肺疾病患者可遵照医嘱进行身体锻炼。",
                                glyph: "aqi.low",
                            },
                            {
                                categoryNumber: 3,
                                range: [3, 3],
                                color: "#CCFF66",
                                categoryName: "低",
                                recommendation: "正常进行户外活动。心肺疾病患者可遵照医嘱进行身体锻炼。",
                                glyph: "aqi.low",
                            },
                            {
                                categoryNumber: 4,
                                range: [4, 4],
                                color: "#FFE620",
                                categoryName: "中",
                                recommendation: "心肺疾病患者应减少长时间、高强度的户外活动，并遵照医嘱进行身体锻炼。",
                                glyph: "aqi.medium",
                            },
                            {
                                categoryNumber: 5,
                                range: [5, 5],
                                color: "#FF9500",
                                categoryName: "中",
                                recommendation: "心肺疾病患者应减少长时间、高强度的户外活动，并遵照医嘱进行身体锻炼。",
                                glyph: "aqi.medium",
                            },
                            {
                                categoryNumber: 6,
                                range: [6, 6],
                                color: "#FA114F",
                                categoryName: "高",
                                recommendation: "心肺疾病患者、老人、儿童及孕妇应尽量减少户外活动，特别是在交通繁忙的地方。一般人群应减少长时间、高强度的户外活动。",
                                glyph: "aqi.high",
                            },
                            {
                                categoryNumber: 7,
                                range: [7, 7],
                                color: "#DC1346",
                                categoryName: "高",
                                recommendation: "心肺疾病患者、老人、儿童及孕妇应尽量减少户外活动，特别是在交通繁忙的地方。一般人群应减少长时间、高强度的户外活动。",
                                glyph: "aqi.high",
                            },
                            {
                                categoryNumber: 8,
                                range: [8, 8],
                                color: "#BD143D",
                                categoryName: "高",
                                recommendation: "心肺疾病患者、老人、儿童及孕妇应尽量减少户外活动，特别是在交通繁忙的地方。一般人群应减少长时间、高强度的户外活动。",
                                glyph: "aqi.high",
                            },
                            {
                                categoryNumber: 9,
                                range: [9, 9],
                                color: "#9F1634",
                                categoryName: "高",
                                recommendation: "心肺疾病患者、老人、儿童及孕妇应尽量减少户外活动，特别是在交通繁忙的地方。一般人群应减少长时间、高强度的户外活动。",
                                glyph: "aqi.high",
                            },
                            {
                                categoryNumber: 10,
                                range: [10, 10],
                                color: "#80172B",
                                categoryName: "高",
                                recommendation: "心肺疾病患者、老人、儿童及孕妇应尽量减少户外活动，特别是在交通繁忙的地方。一般人群应减少长时间、高强度的户外活动。",
                                glyph: "aqi.high",
                            },
                            {
                                categoryNumber: 11,
                                range: [11, 11],
                                color: "#80172B",
                                categoryName: "极高",
                                recommendation: "心肺疾病患者、老人、儿童及孕妇应避免户外活动，避免体力消耗。一般人群应尽量减少户外活动，特别是在交通繁忙的地方。",
                                glyph: "aqi.high",
                            },
                        ],
                        gradient: {
                            stops: [
                                {
                                    location: 1,
                                    color: "#2094FA",
                                },
                                {
                                    location: 2,
                                    color: "#04DE71",
                                },
                                {
                                    location: 3.5,
                                    color: "#CCFF66",
                                },
                                {
                                    location: 4,
                                    color: "#FFE620",
                                },
                                {
                                    location: 6,
                                    color: "#FA114F",
                                },
                                {
                                    location: 8,
                                    color: "#BD143D",
                                },
                                {
                                    location: 10,
                                    color: "#80172B",
                                },
                            ],
                        },
                    },
                },
                "en-US": {
                    name: "CN.AQHI",
                    displayName: "AQHI (CN)",
                    shortDisplayName: "AQHI",
                    longDisplayName: "中国 (AQHI)",
                    displayLabel: "空气质量",
                    language: "en",
                    version: 1,
                    aqi: {
                        numerical: true,
                        ascending: true,
                        range: [1, 11],
                        categories: [
                            {
                                categoryNumber: 1,
                                range: [1, 1],
                                color: "#2094FA",
                                categoryName: "极低",
                                recommendation: "适宜进行户外活动。",
                                glyph: "aqi.low",
                            },
                            {
                                categoryNumber: 2,
                                range: [2, 2],
                                color: "#04DE71",
                                categoryName: "低",
                                recommendation: "正常进行户外活动。心肺疾病患者可遵照医嘱进行身体锻炼。",
                                glyph: "aqi.low",
                            },
                            {
                                categoryNumber: 3,
                                range: [3, 3],
                                color: "#CCFF66",
                                categoryName: "低",
                                recommendation: "正常进行户外活动。心肺疾病患者可遵照医嘱进行身体锻炼。",
                                glyph: "aqi.low",
                            },
                            {
                                categoryNumber: 4,
                                range: [4, 4],
                                color: "#FFE620",
                                categoryName: "中",
                                recommendation: "心肺疾病患者应减少长时间、高强度的户外活动，并遵照医嘱进行身体锻炼。",
                                glyph: "aqi.medium",
                            },
                            {
                                categoryNumber: 5,
                                range: [5, 5],
                                color: "#FF9500",
                                categoryName: "中",
                                recommendation: "心肺疾病患者应减少长时间、高强度的户外活动，并遵照医嘱进行身体锻炼。",
                                glyph: "aqi.medium",
                            },
                            {
                                categoryNumber: 6,
                                range: [6, 6],
                                color: "#FA114F",
                                categoryName: "高",
                                recommendation: "心肺疾病患者、老人、儿童及孕妇应尽量减少户外活动，特别是在交通繁忙的地方。一般人群应减少长时间、高强度的户外活动。",
                                glyph: "aqi.high",
                            },
                            {
                                categoryNumber: 7,
                                range: [7, 7],
                                color: "#DC1346",
                                categoryName: "高",
                                recommendation: "心肺疾病患者、老人、儿童及孕妇应尽量减少户外活动，特别是在交通繁忙的地方。一般人群应减少长时间、高强度的户外活动。",
                                glyph: "aqi.high",
                            },
                            {
                                categoryNumber: 8,
                                range: [8, 8],
                                color: "#BD143D",
                                categoryName: "高",
                                recommendation: "心肺疾病患者、老人、儿童及孕妇应尽量减少户外活动，特别是在交通繁忙的地方。一般人群应减少长时间、高强度的户外活动。",
                                glyph: "aqi.high",
                            },
                            {
                                categoryNumber: 9,
                                range: [9, 9],
                                color: "#9F1634",
                                categoryName: "高",
                                recommendation: "心肺疾病患者、老人、儿童及孕妇应尽量减少户外活动，特别是在交通繁忙的地方。一般人群应减少长时间、高强度的户外活动。",
                                glyph: "aqi.high",
                            },
                            {
                                categoryNumber: 10,
                                range: [10, 10],
                                color: "#80172B",
                                categoryName: "高",
                                recommendation: "心肺疾病患者、老人、儿童及孕妇应尽量减少户外活动，特别是在交通繁忙的地方。一般人群应减少长时间、高强度的户外活动。",
                                glyph: "aqi.high",
                            },
                            {
                                categoryNumber: 11,
                                range: [11, 11],
                                color: "#80172B",
                                categoryName: "极高",
                                recommendation: "心肺疾病患者、老人、儿童及孕妇应避免户外活动，避免体力消耗。一般人群应尽量减少户外活动，特别是在交通繁忙的地方。",
                                glyph: "aqi.high",
                            },
                        ],
                        gradient: {
                            stops: [
                                {
                                    location: 1,
                                    color: "#2094FA",
                                },
                                {
                                    location: 2,
                                    color: "#04DE71",
                                },
                                {
                                    location: 3.5,
                                    color: "#CCFF66",
                                },
                                {
                                    location: 4,
                                    color: "#FFE620",
                                },
                                {
                                    location: 6,
                                    color: "#FA114F",
                                },
                                {
                                    location: 8,
                                    color: "#BD143D",
                                },
                                {
                                    location: 10,
                                    color: "#80172B",
                                },
                            ],
                        },
                    },
                },
            },
        },
    };

    /**
     * 从完整配置中读取并序列化指定标尺。
     * Reads and serializes the requested scale from the complete configuration.
     * @param {string} language
     * @param {string} scaleName
     * @returns {{ status: number, headers: Record<string, string>, body: string }|undefined}
     */
    Build(language, scaleName) {
        const configLanguage = this.#GetConfigLanguage(language);
        const scale = this.#Config.AirQualityScale[scaleName]?.[configLanguage];
        if (!scale) return undefined;
        return {
            status: 200,
            headers: { ...this.#Config.Headers },
            body: JSON.stringify(scale),
        };
    }

    /**
     * 按显式 BCP 47 映射表查找数据库语言键。
     * Resolves the database language key through the explicit BCP 47 map.
     * @param {string} language
     * @returns {string|undefined}
     */
    #GetConfigLanguage(language) {
        return this.#Config.Language[language?.toLowerCase()];
    }
}
