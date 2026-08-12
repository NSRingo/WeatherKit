import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import test from "node:test";
import { onRequest } from "../functions/[[route]].js";
import ColorfulClouds from "../src/class/ColorfulClouds.mjs";
import QWeather from "../src/class/QWeather.mjs";
import WeatherAlerts from "../src/class/WeatherAlerts.mjs";
import { Request as processRequest } from "../src/process/Request.mjs";
import { Request as processRequestDev } from "../src/process/Request.dev.mjs";

globalThis.require = createRequire(import.meta.url);

const pagesDirectory = new URL("../pages/", import.meta.url);
const sourceHtml = `<!doctype html>
<html>
    <head><title>建邺天气预警</title></head>
    <body>
        <h1 class="c-submenu__location">建邺</h1>
        <span class="c-submenu__location-adm">江苏 南京</span>
        <div class="c-city-warning-events warning--orange">
            <h3>建邺区气象台发布雷暴橙色预警信号。</h3>
            <p>发布日期：2026-07-31T11:00:00+08:00</p>
            <p class="warning-events__txt">预计午后将出现雷暴天气。</p>
            <div class="warning-explain"><h4>Description</h4><p>可能伴有短时强降水。</p></div>
            <div class="warning-defense__txt"><p>1. 注意防范雷电。</p><p>2. 远离高大树木。</p></div>
        </div>
        <div class="c-city-warning-around"></div>
        <div class="c-data-source">
            <a href="http://www.12379.cn" class="data-source__txt">预警数据来源：国家预警信息发布中心</a>
        </div>
    </body>
</html>`;
const qWeatherAlertAPI = {
    metadata: {
        attributions: ["国家预警信息发布中心", "当前预警数据可能存在延迟或信息过时，以官方数据发布为准。"],
    },
    alerts: [
        {
            id: "202608021748225061499885",
            areaId: "320100",
            areaName: "南京市",
            senderName: "南京市气象台",
            issuedTime: "2026-08-02T09:48Z",
            effectiveTime: "2026-08-02T09:48Z",
            onsetTime: "2026-08-02T09:48Z",
            expiresTime: "2026-08-03T09:48Z",
            eventType: { name: "高温", code: "1009" },
            severity: "severe",
            headline: "南京市气象台发布高温橙色预警信号。",
            description: "南京市气象台2026年08月02日17时44分继续发布高温橙色预警信号：预计明天全市大部分地区的日最高气温可达37℃以上，请注意防暑降温。",
            criteria: "日最高气温升至37℃以上",
            responseTypes: ["monitor"],
            instruction: "1. 有关部门和单位按照职责落实防暑降温保障措施；\n2. 尽量避免在高温时段进行户外活动；\n3. 对老、弱、病、幼人群提供防暑降温指导；\n4. 高温条件下作业人员应当缩短连续工作时间。",
        },
    ],
};
const colorfulCloudsAlertAPI = {
    alerts: [
        {
            id: "urn:oid:2.49.0.1.840.0.test",
            region_code: "US",
            source: 1,
            msg_type: 1,
            event_name: "Flash Flood Warning.",
            categories: [2],
            urgency: 1,
            severity: 2,
            certainty: 2,
            sent_time: 1735689600,
            effective_time: 1735689660,
            onset_time: 1735689720,
            expires_time: 1735776000,
            references: [],
            areas: [
                {
                    area_desc: "Los Angeles",
                    geocodes: [{ value_name: "UGC", value: "CAC037", namespace: "NWS_UGC" }],
                    polygons: [],
                    circles: [],
                },
            ],
            language_code: "en-US",
            sender_name: "NWS Los Angeles/Oxnard CA",
            headline: "Flash Flood Warning issued for Los Angeles",
            description: "Flash flooding caused by excessive rainfall is expected.",
            instruction: "1. Move to higher ground immediately.\n2. Avoid flooded roads.",
        },
    ],
};

test("Pages Functions only receive WeatherKit API routes", async () => {
    const routes = JSON.parse(await readFile(new URL("_routes.json", pagesDirectory), "utf8"));
    assert.deepEqual(routes, {
        version: 1,
        include: ["/api/*", "/weatherkit.apple.com/api/*"],
        exclude: [],
    });
});

test("QWeather HTML extraction is separated from WeatherAlert construction", async () => {
    const attributionUrl = new URL("https://www.qweather.com//severe-weather/jianye-101190110.html");
    const extracted = WeatherAlerts.ExtractQWeather(sourceHtml);
    const alerts = WeatherAlerts.Build(extracted, {
        attributionUrl,
        identifier: "jianye-101190110",
        language: "zh-CN",
        countryCode: "CN",
    });

    assert.equal(extracted.areaName, "建邺");
    assert.equal(extracted.source, "建邺区气象台");
    assert.equal(extracted.alerts[0].description, "建邺区气象台发布雷暴橙色预警信号。");
    assert.equal(extracted.alerts[0].eventName, "雷暴橙色预警信号。");
    assert.deepEqual(extracted.alerts[0].guidelines, ["注意防范雷电。", "远离高大树木。"]);
    assert.equal("issuedBy" in extracted.alerts[0], false);
    assert.equal(extracted.alerts[0].reportedAt, "2026-07-31T03:00:00.000Z");
    assert.equal("id" in extracted.alerts[0], false);
    assert.equal(alerts.length, 1);
    assert.match(alerts[0].id, /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    assert.equal(alerts[0].areaId, "101190110");
    assert.equal(alerts[0].areaName, "建邺");
    assert.equal(alerts[0].attributionURL, "https://www.qweather.com//severe-weather/jianye-101190110.html");
    assert.equal(alerts[0].countryCode, "CN");
    assert.equal(alerts[0].description, "雷暴橙色预警");
    assert.equal(alerts[0].effectiveTime, "2026-07-31T03:00:00.000Z");
    assert.equal(alerts[0].eventOnsetTime, "2026-07-31T03:00:00.000Z");
    assert.equal(alerts[0].expireTime, "9999-12-31T23:59:59Z");
    assert.equal(alerts[0].eventSource, "CN");
    assert.equal(alerts[0].importance, "high");
    assert.equal(alerts[0].reportedAt, "2026-07-31T03:00:00.000Z");
    assert.equal(alerts[0].severity, "severe");
    assert.equal(alerts[0].source, "建邺区气象台");
    assert.deepEqual(alerts[0].responses, ["prepare", "avoid"]);
    assert.deepEqual(alerts[0].messages, [
        {
            language: "zh-CN",
            text: "预计午后将出现雷暴天气。",
        },
        {
            language: "zh-CN",
            text: "可能伴有短时强降水。",
        },
        {
            language: "zh-CN",
            text: "注意防范雷电。\n远离高大树木。",
        },
    ]);
    assert.equal(
        WeatherAlerts.Build(extracted, {
            attributionUrl,
            identifier: "jianye-101190110",
            language: "zh-CN",
            countryCode: "CN",
            eventSource: "EUMETNET",
        })[0].eventSource,
        "EUMETNET",
    );
});

test("QWeather Alert API is standardized by QWeather class", async () => {
    const originalFetch = globalThis.fetch;
    let sourceRequest;
    globalThis.fetch = async (input, init) => {
        const requestUrl = typeof input === "string" ? input : input?.url ?? input;
        sourceRequest = { url: new URL(requestUrl), headers: new Headers(init?.headers ?? input?.headers ?? {}) };
        return new Response(JSON.stringify(qWeatherAlertAPI), { headers: { "Content-Type": "application/json" } });
    };

    try {
        let extracted;
        for (const [language, qWeatherLanguage] of [
            ["zh-CN", "zh-hans"],
            ["zh-TW", "zh-hant"],
            ["zh-hant", "zh-hant"],
            ["en-US", "en"],
            ["de", "de"],
        ]) {
            const qWeather = new QWeather({ country: "CN", language, latitude: "32.115", longitude: "118.814" }, "test-token");
            extracted = await qWeather.WeatherAlert();

            assert.equal(sourceRequest.url.toString(), `https://devapi.qweather.com/weatheralert/v1/current/32.115/118.814?lang=${qWeatherLanguage}`);
            assert.equal(sourceRequest.headers.get("X-QW-Api-Key"), "test-token");
            assert.equal(sourceRequest.headers.get("Accept"), "application/json");
        }
        assert.equal(extracted.source, "南京市气象台");
        assert.equal(extracted.areaName, "南京市");
        assert.equal(extracted.alerts.length, 1);
        assert.equal(extracted.alerts[0].areaId, "320100");
        assert.equal(extracted.alerts[0].areaName, "南京市");
        assert.equal(extracted.alerts[0].description, "南京市气象台发布高温橙色预警信号。");
        assert.equal(extracted.alerts[0].eventName, "高温");
        assert.deepEqual(extracted.alerts[0].responses, ["monitor"]);
        assert.equal(extracted.alerts[0].effectiveTime, "2026-08-02T09:48:00.000Z");
        assert.equal(extracted.alerts[0].eventOnsetTime, "2026-08-02T09:48:00.000Z");
        assert.equal(extracted.alerts[0].eventEndTime, "2026-08-03T09:48:00.000Z");
        assert.equal(extracted.alerts[0].expireTime, "2026-08-03T09:48:00.000Z");
        assert.equal(extracted.alerts[0].phenomenon, "Met");
        assert.equal(extracted.alerts[0].source, "南京市气象台");
        assert.equal(extracted.alerts[0].token, "1009");
        assert.equal(extracted.alerts[0].reportedAt, "2026-08-02T09:48:00.000Z");
        assert.equal(extracted.alerts[0].message, "南京市气象台2026年08月02日17时44分继续发布高温橙色预警信号：预计明天全市大部分地区的日最高气温可达37℃以上，请注意防暑降温。");
        assert.equal(extracted.alerts[0].standard, "");
        assert.deepEqual(extracted.alerts[0].guidelines, [
            "有关部门和单位按照职责落实防暑降温保障措施；",
            "尽量避免在高温时段进行户外活动；",
            "对老、弱、病、幼人群提供防暑降温指导；",
            "高温条件下作业人员应当缩短连续工作时间。",
        ]);
    } finally {
        globalThis.fetch = originalFetch;
    }
});

test("QWeather alert messages capitalize the first character without lowercasing acronyms", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => {
        const body = structuredClone(qWeatherAlertAPI);
        body.alerts[0].description = "blue warning for strong winds. These conditions are expected to last until 9:00 PM (GMT+8).";
        return new Response(JSON.stringify(body), { headers: { "Content-Type": "application/json" } });
    };

    try {
        const extracted = await new QWeather({ country: "CN", language: "en-US", latitude: "31.23", longitude: "121.47" }, "test-token").WeatherAlert();
        assert.equal(extracted.alerts[0].message, "Blue warning for strong winds. These conditions are expected to last until 9:00 PM (GMT+8).");
    } finally {
        globalThis.fetch = originalFetch;
    }
});

test("QWeather event codes map to CAP phenomena", async () => {
    const originalFetch = globalThis.fetch;
    const fixtures = [
        ["1009", "Met"],
        ["1013", "Geo"],
        ["1044", "Safety"],
        ["1025", "Fire"],
        ["1024", "Health"],
        ["1029", "Env"],
        ["1046", "Transport"],
        ["1203", "Infra"],
        ["9999", "Other"],
        ["9998", "高温"],
    ];

    try {
        for (const [code, expected] of fixtures) {
            globalThis.fetch = async () => {
                const body = structuredClone(qWeatherAlertAPI);
                body.alerts[0].eventType.code = code;
                return new Response(JSON.stringify(body), { headers: { "Content-Type": "application/json" } });
            };
            const alerts = await new QWeather({ country: "CN", language: "zh-CN", latitude: "32.115", longitude: "118.814" }, "test-token").WeatherAlert();
            assert.equal(alerts.alerts[0].phenomenon, expected, code);
        }
    } finally {
        globalThis.fetch = originalFetch;
    }
});

test("all documented QWeather event codes map to CAP categories", async () => {
    const originalFetch = globalThis.fetch;
    const documentedCodeRanges = [
        [1001, 1069], [1071, 1082], [1084, 1089], [1201, 1219], [1221, 1221], [1241, 1251], [1271, 1274], [1601, 1610], [1701, 1710], [1801, 1805],
        [2001, 2007], [2029, 2033], [2050, 2054], [2070, 2085], [2100, 2109], [2111, 2111], [2120, 2135], [2150, 2150], [2152, 2168], [2190, 2193],
        [2200, 2205], [2207, 2221], [2300, 2309], [2311, 2328], [2330, 2333], [2341, 2341], [2343, 2343], [2345, 2346], [2348, 2400], [2409, 2409],
        [2411, 2426], [2501, 2502], [2521, 2532], [2550, 2554], [2581, 2581], [2601, 2620], [2641, 2641], [2713, 2713], [2722, 2723], [2743, 2743],
        [2749, 2749], [2751, 2753], [2755, 2756], [2791, 2797], [2801, 2804], [2839, 2853], [2873, 2874], [3101, 3107], [3131, 3148], [9999, 9999],
    ];
    const documentedCodes = documentedCodeRanges.flatMap(([start, end]) => Array.from({ length: end - start + 1 }, (_, index) => String(start + index)));
    const categories = new Set(["Geo", "Met", "Safety", "Security", "Rescue", "Fire", "Health", "Env", "Transport", "Infra", "CBRNE", "Other"]);

    globalThis.fetch = async () => {
        const body = structuredClone(qWeatherAlertAPI);
        body.alerts = documentedCodes.map((code, index) => ({
            ...body.alerts[0],
            id: `documented-event-${index}`,
            eventType: { code, name: `Event ${code}` },
        }));
        return new Response(JSON.stringify(body), { headers: { "Content-Type": "application/json" } });
    };

    try {
        const alerts = await new QWeather({ country: "CN", language: "en-US", latitude: "32.115", longitude: "118.814" }, "test-token").WeatherAlert();
        assert.equal(alerts.alerts.length, documentedCodes.length);
        for (const [index, alert] of alerts.alerts.entries()) {
            assert.ok(categories.has(alert.phenomenon), `${documentedCodes[index]}: ${alert.phenomenon}`);
            assert.notEqual(alert.phenomenon, `Event ${documentedCodes[index]}`, documentedCodes[index]);
        }
    } finally {
        globalThis.fetch = originalFetch;
    }
});

test("QWeather title normalization supports translated and CAP headline grammars", () => {
    const issuedTime = "2026-08-10T00:00:00.000Z";
    const headlines = [
        ["浦东新区气象台发布暴雨橙色预警信号。", "暴雨", "暴雨橙色预警"],
        ["Nanjing Meteorological Observatory issues a blue typhoon warning", "Typhoon", "Blue Typhoon Warning"],
        ["Pudong New Area Meteorological Observatory issued an orange rainstorm warning", "Rainstorm", "Orange Rainstorm Warning"],
        ["Severe Thunderstorm Warning issued August 10 at 2:26AM EDT until August 10 at 3:30AM EDT by NWS Grand Rapids MI", "Severe Thunderstorm Warning", "Severe Thunderstorm Warning"],
        ["Flood Watch issued August 9 at 8:34PM EDT until August 10 at 11:00AM EDT by NWS Grand Rapids MI", "Flood Watch", "Flood Watch"],
        ["Flash Flood Warning issued for Los Angeles", "Flash Flood Warning.", "Flash Flood Warning"],
        ["", "大雨警報", "大雨警報"],
        ["火山灰に関する情報", "火山灰", "火山灰に関する情報"],
    ];

    const alerts = WeatherAlerts.Build(
        {
            alerts: headlines.map(([description, eventName], index) => ({
                description,
                eventName,
                guidelines: [],
                issuedTime,
                message: description,
                phenomenon: "Met",
                reportedAt: issuedTime,
                severity: index === 0 ? "severe" : "minor",
                standard: "",
            })),
            areaName: "",
            source: "QWeather",
        },
        {
            attributionUrl: "https://www.qweather.com/",
            identifier: "title-grammar-fixtures",
            language: "en-US",
        },
    );

    assert.deepEqual(
        alerts.map(alert => alert.description),
        headlines.map(([, , expected]) => expected),
    );
});

test("localized event names select the matching provider alert", () => {
    const appleAlerts = [{ description: "Coastal Flood Advisory", phenomenon: "Other", token: "" }];
    const providerAlerts = [
        { description: "", eventName: "Flood Watch", guidelines: [], phenomenon: "Met", severity: "minor", token: "watch" },
        { description: "", eventName: "Coastal Flood Advisory", guidelines: [], phenomenon: "Met", severity: "minor", token: "advisory" },
    ];

    WeatherAlerts.mergeAlerts(appleAlerts, providerAlerts);

    assert.equal(appleAlerts[0].description, "Coastal Flood Advisory");
    assert.equal(appleAlerts[0].token, "advisory");
});

test("localized event names allow complete provider headlines to replace generic titles", () => {
    const appleAlerts = [{ description: "暴雨", phenomenon: "Other" }];
    const providerAlerts = [{ description: "南京市气象台发布暴雨蓝色预警信号。", eventName: "暴雨", guidelines: [], phenomenon: "Met", severity: "minor" }];

    WeatherAlerts.mergeAlerts(appleAlerts, providerAlerts);

    assert.equal(appleAlerts[0].description, "暴雨蓝色预警");
    assert.equal(appleAlerts[0].phenomenon, "Met");
});

test("ColorfulClouds CAP Alert API is standardized by ColorfulClouds class", async () => {
    const originalFetch = globalThis.fetch;
    let sourceRequest;
    globalThis.fetch = async (input, init) => {
        const requestUrl = typeof input === "string" ? input : input?.url ?? input;
        sourceRequest = { url: new URL(requestUrl), headers: new Headers(init?.headers ?? input?.headers ?? {}) };
        return new Response(JSON.stringify(colorfulCloudsAlertAPI), { headers: { "Content-Type": "application/json" } });
    };

    try {
        let extracted;
        for (const [language, colorfulCloudsLanguage] of [
            ["zh-CN", "zh_CN"],
            ["zh-TW", "zh_TW"],
            ["zh-Hant", "zh_TW"],
            ["en-US", "en_US"],
            ["en-GB", "en_GB"],
            ["ja", "ja"],
            ["de", "zh_CN"],
        ]) {
            const colorfulClouds = new ColorfulClouds({ country: "US", language, latitude: "34.05", longitude: "-118.25" }, "test-token");
            extracted = await colorfulClouds.WeatherAlert();

            assert.equal(sourceRequest.url.toString(), `https://singer.caiyunhub.com/v3/cap_alert/location?token=test-token&longitude=-118.25&latitude=34.05&language=${colorfulCloudsLanguage}`);
            assert.equal(sourceRequest.headers.get("Referer"), "https://caiyunapp.com/");
        }

        assert.equal(extracted.source, "NWS Los Angeles/Oxnard CA");
        assert.equal(extracted.areaName, "Los Angeles");
        assert.equal(extracted.alerts.length, 1);
        assert.equal(extracted.alerts[0].areaId, "CAC037");
        assert.equal(extracted.alerts[0].areaName, "Los Angeles");
        assert.equal(extracted.alerts[0].certainty, "likely");
        assert.equal(extracted.alerts[0].description, "Flash Flood Warning issued for Los Angeles");
        assert.equal(extracted.alerts[0].effectiveTime, "2025-01-01T00:01:00.000Z");
        assert.equal(extracted.alerts[0].eventOnsetTime, "2025-01-01T00:02:00.000Z");
        assert.equal(extracted.alerts[0].eventEndTime, "2025-01-02T00:00:00.000Z");
        assert.equal(extracted.alerts[0].expireTime, "2025-01-02T00:00:00.000Z");
        assert.equal(extracted.alerts[0].issuedTime, "2025-01-01T00:00:00.000Z");
        assert.equal(extracted.alerts[0].message, "Flash flooding caused by excessive rainfall is expected.");
        assert.equal(extracted.alerts[0].eventName, "Flash Flood Warning.");
        assert.equal(extracted.alerts[0].phenomenon, "Met");
        assert.equal(extracted.alerts[0].reportedAt, "2025-01-01T00:00:00.000Z");
        assert.equal(extracted.alerts[0].severity, "severe");
        assert.equal(extracted.alerts[0].source, "NWS Los Angeles/Oxnard CA");
        assert.equal(extracted.alerts[0].standard, "");
        assert.equal(extracted.alerts[0].urgency, "immediate");
        assert.deepEqual(extracted.alerts[0].guidelines, ["Move to higher ground immediately.", "Avoid flooded roads."]);
    } finally {
        globalThis.fetch = originalFetch;
    }
});

test("ColorfulClouds CAP categories map to phenomena", async () => {
    const originalFetch = globalThis.fetch;
    const fixtures = [
        [[1], "Geo"],
        [[2], "Met"],
        [[3], "Safety"],
        [[4], "Security"],
        [[5], "Rescue"],
        [[6], "Fire"],
        [[7], "Health"],
        [[8], "Env"],
        [[9], "Transport"],
        [[10], "Infra"],
        [[11], "CBRNE"],
        [[12], "Other"],
        [[999], "Flash Flood Warning."],
    ];

    try {
        for (const [categories, expected] of fixtures) {
            globalThis.fetch = async () => {
                const body = structuredClone(colorfulCloudsAlertAPI);
                body.alerts[0].categories = categories;
                return new Response(JSON.stringify(body), { headers: { "Content-Type": "application/json" } });
            };
            const alerts = await new ColorfulClouds({ country: "US", language: "en-US", latitude: "34.05", longitude: "-118.25" }, "test-token").WeatherAlert();
            assert.equal(alerts.alerts[0].phenomenon, expected, categories.join(","));
        }
    } finally {
        globalThis.fetch = originalFetch;
    }
});

test("QWeather source extraction falls back to the English attribution label", () => {
    const englishHtml = sourceHtml
        .replace("建邺区气象台发布雷暴橙色预警信号。", "Thunderstorm orange warning.")
        .replace("预警数据来源：国家预警信息发布中心", "Warning data source: National Early Warning Center");
    assert.equal(WeatherAlerts.ExtractQWeather(englishHtml).source, "National Early Warning Center");
});

test("QWeather HTML extraction distinguishes CAP issuers from translated agency prefixes", () => {
    const capHtml = sourceHtml.replace("建邺区气象台发布雷暴橙色预警信号。", "Coastal Flood Advisory issued August 9 at 9:43PM PDT until August 13 at 2:00AM PDT by NWS San Francisco CA");
    const capForHtml = sourceHtml.replace("建邺区气象台发布雷暴橙色预警信号。", "Flash Flood Warning issued for Los Angeles");
    const translatedHtml = sourceHtml.replace("建邺区气象台发布雷暴橙色预警信号。", "Nanjing Meteorological Observatory issues a blue typhoon warning");
    const translatedIssuedHtml = sourceHtml.replace("建邺区气象台发布雷暴橙色预警信号。", "Pudong New Area Meteorological Observatory issued an orange rainstorm warning");

    const capAlert = WeatherAlerts.ExtractQWeather(capHtml);
    const capForAlert = WeatherAlerts.ExtractQWeather(capForHtml);
    const translatedAlert = WeatherAlerts.ExtractQWeather(translatedHtml);
    const translatedIssuedAlert = WeatherAlerts.ExtractQWeather(translatedIssuedHtml);
    const context = {
        attributionUrl: new URL("https://www.qweather.com/severe-weather/test.html"),
        countryCode: "US",
        identifier: "headline-parser-fixtures",
        language: "en-US",
    };

    assert.equal(capAlert.alerts[0].description, "Coastal Flood Advisory issued August 9 at 9:43PM PDT until August 13 at 2:00AM PDT by NWS San Francisco CA");
    assert.equal(capAlert.alerts[0].eventName, "Coastal Flood Advisory");
    assert.equal(capAlert.alerts[0].source, "NWS San Francisco CA");
    assert.equal(capForAlert.alerts[0].eventName, "Flash Flood Warning");
    assert.equal(translatedAlert.alerts[0].description, "Nanjing Meteorological Observatory issues a blue typhoon warning");
    assert.equal(translatedAlert.alerts[0].eventName, "Blue Typhoon Warning");
    assert.equal(translatedAlert.alerts[0].source, "Nanjing Meteorological Observatory");
    assert.equal(translatedIssuedAlert.alerts[0].eventName, "Orange Rainstorm Warning");
    assert.equal(translatedIssuedAlert.alerts[0].source, "Pudong New Area Meteorological Observatory");
    assert.equal(WeatherAlerts.Build(capAlert, context)[0].description, "Coastal Flood Advisory");
    assert.equal(WeatherAlerts.Build(capForAlert, context)[0].description, "Flash Flood Warning");
    assert.equal(WeatherAlerts.Build(translatedAlert, context)[0].description, "Blue Typhoon Warning");
    assert.equal(WeatherAlerts.Build(translatedIssuedAlert, context)[0].description, "Orange Rainstorm Warning");
});

test("Pages routes WeatherAlert requests through Hono before fetching QWeather", async () => {
    const originalFetch = globalThis.fetch;
    let sourceRequest;
    globalThis.fetch = async (input, init) => {
        sourceRequest = { url: new URL(input), init };
        return new Response(sourceHtml, { headers: { "Content-Type": "text/html; charset=utf-8" } });
    };

    try {
        for (const pathname of ["/api/v1/weatherAlerts", "/weatherkit.apple.com/api/v1/weatherAlerts"]) {
            const response = await onRequest({
                request: new Request(`https://weatherkit.pages.dev${pathname}?lang=zh-CN&ids=jianye-101190110`, {
                    headers: {
                        "Accept-Language": "zh-CN",
                        Cookie: "geo=CN",
                        "User-Agent": "WeatherKitTest/1.0",
                    },
                }),
                env: {},
            });
            const body = await response.json();

            assert.equal(response.status, 200, pathname);
            assert.equal(response.headers.get("Access-Control-Allow-Origin"), "*", pathname);
            assert.equal(response.headers.get("Cache-Control"), "max-age=0", pathname);
            assert.equal(sourceRequest.url.toString(), "https://www.qweather.com//severe-weather/jianye-101190110.html?from=AppleWeatherService", pathname);
            assert.equal(body.length, 1, pathname);
            assert.equal(body[0].attributionURL, "https://www.qweather.com//severe-weather/jianye-101190110.html", pathname);
            assert.equal(body[0].description, "雷暴橙色预警", pathname);
            assert.equal(body[0].eventSource, "CN", pathname);
            assert.equal(body[0].reportedAt, "2026-07-31T03:00:00.000Z", pathname);
            assert.equal(body[0].source, "建邺区气象台", pathname);
        }
    } finally {
        globalThis.fetch = originalFetch;
    }
});

test("Pages routes coordinate WeatherAlert identifiers through QWeather Alert API", async () => {
    const originalFetch = globalThis.fetch;
    let sourceRequest;
    globalThis.fetch = async (input, init) => {
        sourceRequest = { url: new URL(input), init };
        return new Response(JSON.stringify(qWeatherAlertAPI), { headers: { "Content-Type": "application/json" } });
    };

    try {
        for (const pathname of ["/api/v1/weatherAlerts", "/weatherkit.apple.com/api/v1/weatherAlerts"]) {
            const response = await onRequest({
                request: new Request(`https://weatherkit.pages.dev${pathname}?lang=zh-CN&ids=32.115,118.814`, {
                    headers: {
                        "Accept-Language": "zh-CN",
                        "User-Agent": "WeatherKitTest/1.0",
                    },
                }),
                env: {},
            });
            const body = await response.json();
            const headers = new Headers(sourceRequest.init?.headers ?? {});

            assert.equal(response.status, 200, pathname);
            assert.equal(sourceRequest.url.toString(), "https://devapi.qweather.com/weatheralert/v1/current/32.115/118.814?lang=zh-hans", pathname);
            assert.equal(headers.get("X-QW-Api-Key"), "bdd98ec1d87747f3a2e8b1741a5af796", pathname);
            assert.equal(body.length, 1, pathname);
            assert.equal(body[0].attributionURL, "https://www.12379.cn/", pathname);
            assert.equal(body[0].areaId, "320100", pathname);
            assert.equal(body[0].areaName, "南京市", pathname);
            assert.equal(body[0].countryCode, "CN", pathname);
            assert.equal(body[0].description, "高温橙色预警", pathname);
            assert.equal(body[0].effectiveTime, "2026-08-02T09:48:00.000Z", pathname);
            assert.equal(body[0].eventOnsetTime, "2026-08-02T09:48:00.000Z", pathname);
            assert.equal(body[0].eventEndTime, "2026-08-03T09:48:00.000Z", pathname);
            assert.equal(body[0].expireTime, "2026-08-03T09:48:00.000Z", pathname);
            assert.equal(body[0].issuedTime, "2026-08-02T09:48:00.000Z", pathname);
            assert.equal(body[0].importance, "high", pathname);
            assert.equal(body[0].phenomenon, "Met", pathname);
            assert.equal(body[0].reportedAt, "2026-08-02T09:48:00.000Z", pathname);
            assert.equal(body[0].source, "南京市气象台", pathname);
            assert.equal(body[0].token, "1009", pathname);
            assert.deepEqual(body[0].responses, ["monitor"]);
            assert.equal("area" in body[0], false, pathname);
            assert.deepEqual(body[0].messages, [
                {
                    language: "zh-CN",
                    text: "南京市气象台2026年08月02日17时44分继续发布高温橙色预警信号：预计明天全市大部分地区的日最高气温可达37℃以上，请注意防暑降温。",
                },
                {
                    language: "zh-CN",
                    text: "有关部门和单位按照职责落实防暑降温保障措施；\n尽量避免在高温时段进行户外活动；\n对老、弱、病、幼人群提供防暑降温指导；\n高温条件下作业人员应当缩短连续工作时间。",
                },
            ], pathname);
        }
    } finally {
        globalThis.fetch = originalFetch;
    }
});

test("Pages routes native WeatherAlert identifiers through Hono", async () => {
    const originalFetch = globalThis.fetch;
    let upstreamUrl;
    globalThis.fetch = async input => {
        upstreamUrl = new URL(input);
        return new Response("[]", { headers: { "Content-Type": "application/json" } });
    };

    try {
        const response = await onRequest({
            request: new Request("https://weatherkit.pages.dev/api/v1/weatherAlerts?lang=zh-CN&ids=35889ee6-fa82-5f9f-8e49-fad78c4f383a"),
            env: {},
        });
        assert.equal(upstreamUrl.toString(), "https://weatherkit.apple.com/api/v1/weatherAlerts?lang=zh-CN&ids=35889ee6-fa82-5f9f-8e49-fad78c4f383a");
        assert.equal(response.status, 200);
        assert.deepEqual(await response.json(), []);
    } finally {
        globalThis.fetch = originalFetch;
    }
});

test("only QWeather location tokens are eligible for takeover", () => {
    assert.equal(WeatherAlerts.IsQWeatherPageIdentifier("jianye-101190110"), true);
    assert.equal(WeatherAlerts.IsQWeatherPageIdentifier("jianye-10119011"), false);
    assert.equal(WeatherAlerts.IsQWeatherPageIdentifier("jianye-1011901100"), false);
    assert.equal(WeatherAlerts.IsQWeatherPageIdentifier("32.115,118.814"), false);
    assert.equal(WeatherAlerts.IsQWeatherCoordinateIdentifier("32.115,118.814"), true);
    assert.deepEqual(WeatherAlerts.ParseQWeatherCoordinateIdentifier("32.115,118.814"), { latitude: "32.115", longitude: "118.814" });
    assert.equal(WeatherAlerts.IsQWeatherCoordinateIdentifier("118.814,32.115"), false);
    assert.equal(WeatherAlerts.IsQWeatherPageIdentifier("35889ee6-fa82-5f9f-8e49-fad78c4f383a"), false);
    assert.equal(WeatherAlerts.IsQWeatherPageIdentifier("https://evil.example"), false);
});

test("the request scripts return QWeather data before Apple weatherAlerts is requested", async () => {
    const originalFetch = globalThis.fetch;
    let sourceUrl;
    globalThis.fetch = async input => {
        sourceUrl = new URL(input);
        return new Response(sourceHtml, { headers: { "Content-Type": "text/html; charset=utf-8" } });
    };

    try {
        for (const handler of [processRequest, processRequestDev]) {
            const { $response } = await handler({
                method: "GET",
                url: "https://weatherkit.apple.com/api/v1/weatherAlerts?lang=en-US&ids=jianye-101190110",
                headers: { "Accept-Language": "en-US" },
            });
            const body = JSON.parse($response.body);

            assert.equal(sourceUrl.toString(), "https://www.qweather.com/en/severe-weather/jianye-101190110.html?from=AppleWeatherService");
            assert.equal($response.status, 200);
            assert.equal($response.statusCode, 200);
            assert.equal($response.headers["Content-Type"], "application/json");
            assert.equal(body[0].attributionURL, "https://www.qweather.com/en/severe-weather/jianye-101190110.html");
            assert.equal(body[0].eventSource, "CN");
            assert.equal(body[0].reportedAt, "2026-07-31T03:00:00.000Z");
            assert.equal(body[0].source, "建邺区气象台");
            assert.equal(body[0].messages[0].language, "en-US");
        }
    } finally {
        globalThis.fetch = originalFetch;
    }
});

test("the request scripts return an empty Apple-compatible array when the QWeather fetch fails", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => {
        throw new Error("QWeather unavailable");
    };

    try {
        for (const handler of [processRequest, processRequestDev]) {
            const { $response } = await handler({
                method: "GET",
                url: "https://weatherkit.apple.com/api/v1/weatherAlerts?lang=zh-CN&ids=jianye-101190110",
                headers: { "Accept-Language": "zh-CN" },
            });

            assert.equal($response.status, 200);
            assert.equal($response.statusCode, 200);
            assert.equal($response.headers["Content-Type"], "application/json");
            assert.deepEqual(JSON.parse($response.body), []);
        }
    } finally {
        globalThis.fetch = originalFetch;
    }
});

test("the request scripts route coordinate identifiers through QWeather Alert API", async () => {
    const originalFetch = globalThis.fetch;
    let sourceUrl;
    globalThis.fetch = async input => {
        sourceUrl = new URL(input);
        return new Response(JSON.stringify(qWeatherAlertAPI), { headers: { "Content-Type": "application/json" } });
    };

    try {
        for (const handler of [processRequest, processRequestDev]) {
            const { $response } = await handler({
                method: "GET",
                url: "https://weatherkit.apple.com/api/v1/weatherAlerts?lang=zh-CN&ids=32.115,118.814",
                headers: { "Accept-Language": "zh-CN" },
            });
            const body = JSON.parse($response.body);

            assert.equal(sourceUrl.toString(), "https://devapi.qweather.com/weatheralert/v1/current/32.115/118.814?lang=zh-hans");
            assert.equal($response.status, 200);
            assert.equal($response.statusCode, 200);
            assert.equal($response.headers["Content-Type"], "application/json");
            assert.equal(body[0].description, "高温橙色预警");
            assert.equal(body[0].source, "南京市气象台");
        }
    } finally {
        globalThis.fetch = originalFetch;
    }
});

test("the request scripts leave non-QWeather identifiers alone", async () => {
    for (const handler of [processRequest, processRequestDev]) {
        const { $response } = await handler({
            method: "GET",
            url: "https://weatherkit.apple.com/api/v1/weatherAlerts?lang=zh-CN&ids=35889ee6-fa82-5f9f-8e49-fad78c4f383a",
            headers: {},
        });
        assert.equal($response, undefined);
    }
});
