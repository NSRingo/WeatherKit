import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import test from "node:test";
import { onRequest } from "../functions/[[route]].js";
import WeatherAlerts from "../src/class/WeatherAlerts.mjs";
import { Response as processResponse } from "../src/process/Response.mjs";

globalThis.require = createRequire(import.meta.url);

const pagesDirectory = new URL("../pages/", import.meta.url);
const sourceHtml = `<!doctype html>
<html>
    <head><title>建邺天气预警</title></head>
    <body>
        <h1 class="c-submenu__location">建邺</h1>
        <span class="c-submenu__location-adm">江苏 南京</span>
        <div class="c-city-warning-events warning--orange">
            <h3>建邺区气象台发布雷暴橙色预警</h3>
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
    assert.equal(extracted.source, "国家预警信息发布中心");
    assert.equal(extracted.alerts[0].description, "建邺区气象台发布雷暴橙色预警");
    assert.deepEqual(extracted.alerts[0].guidelines, ["注意防范雷电。", "远离高大树木。"]);
    assert.equal("id" in extracted.alerts[0], false);
    assert.equal(alerts.length, 1);
    assert.match(alerts[0].id, /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    assert.equal(alerts[0].areaId, "101190110");
    assert.equal(alerts[0].areaName, "建邺");
    assert.equal(alerts[0].attributionURL, "https://www.qweather.com//severe-weather/jianye-101190110.html");
    assert.equal(alerts[0].countryCode, "CN");
    assert.equal(alerts[0].description, "建邺区气象台发布雷暴橙色预警");
    assert.equal(alerts[0].effectiveTime, "2026-07-31T03:00:00.000Z");
    assert.equal(alerts[0].expireTime, "9999-12-31T23:59:59Z");
    assert.equal(alerts[0].eventSource, "CN");
    assert.equal(alerts[0].severity, "severe");
    assert.equal(alerts[0].source, "国家预警信息发布中心");
    assert.deepEqual(alerts[0].responses, []);
    assert.deepEqual(alerts[0].messages, [
        {
            language: "zh-CN",
            text: "预计午后将出现雷暴天气。\n\n可能伴有短时强降水。\n\n注意防范雷电。\n\n远离高大树木。",
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

test("QWeather source extraction supports the English attribution label", () => {
    const englishHtml = sourceHtml.replace("预警数据来源：国家预警信息发布中心", "Warning data source: National Early Warning Center");
    assert.equal(WeatherAlerts.ExtractQWeather(englishHtml).source, "National Early Warning Center");
});

test("WeatherAlert endpoint fetches the QWeather source path and returns an array", async () => {
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
            });
            const body = await response.json();

            assert.equal(response.status, 200, pathname);
            assert.equal(response.headers.get("Access-Control-Allow-Origin"), "*", pathname);
            assert.equal(response.headers.get("Cache-Control"), "max-age=0", pathname);
            assert.equal(sourceRequest.url.toString(), "https://www.qweather.com//severe-weather/jianye-101190110.html?from=AppleWeatherService", pathname);
            assert.equal(body.length, 1, pathname);
            assert.equal(body[0].attributionURL, "https://www.qweather.com//severe-weather/jianye-101190110.html", pathname);
            assert.equal(body[0].description, "建邺区气象台发布雷暴橙色预警", pathname);
            assert.equal(body[0].eventSource, "CN", pathname);
            assert.equal(body[0].source, "国家预警信息发布中心", pathname);
        }
    } finally {
        globalThis.fetch = originalFetch;
    }
});

test("WeatherAlert endpoint rejects an invalid routing identifier", async () => {
    const response = await onRequest({
        request: new Request("https://weatherkit.pages.dev/api/v1/weatherAlerts?lang=zh-CN&ids=https%3A%2F%2Fevil.example"),
    });
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), []);
});

test("only QWeather location tokens are eligible for takeover", () => {
    assert.equal(WeatherAlerts.IsQWeatherIdentifier("jianye-101190110"), true);
    assert.equal(WeatherAlerts.IsQWeatherIdentifier("35889ee6-fa82-5f9f-8e49-fad78c4f383a"), false);
    assert.equal(WeatherAlerts.IsQWeatherIdentifier("https://evil.example"), false);
});

test("the response script replaces Apple weatherAlerts JSON with QWeather data", async () => {
    const originalFetch = globalThis.fetch;
    let sourceUrl;
    globalThis.fetch = async input => {
        sourceUrl = new URL(input);
        return new Response(sourceHtml, { headers: { "Content-Type": "text/html; charset=utf-8" } });
    };

    try {
        const response = await processResponse(
            {
                method: "GET",
                url: "https://weatherkit.apple.com/api/v1/weatherAlerts?lang=en-US&ids=jianye-101190110",
                headers: { "Accept-Language": "en-US" },
            },
            {
                status: 404,
                headers: {
                    "Content-Encoding": "gzip",
                    "Content-Length": "12",
                    "Content-Type": "application/json",
                    Location: "https://developer.apple.com/weatherkit/",
                },
                body: "[]",
            },
        );
        const body = JSON.parse(response.body);

        assert.equal(sourceUrl.toString(), "https://www.qweather.com/en/severe-weather/jianye-101190110.html?from=AppleWeatherService");
        assert.equal(response.status, 200);
        assert.equal(response.statusCode, 200);
        assert.equal(response.headers["Content-Type"], "application/json");
        assert.equal(response.headers["Content-Encoding"], undefined);
        assert.equal(response.headers["Content-Length"], undefined);
        assert.equal(response.headers.Location, undefined);
        assert.equal(body[0].attributionURL, "https://www.qweather.com/en/severe-weather/jianye-101190110.html");
        assert.equal(body[0].eventSource, "CN");
        assert.equal(body[0].source, "国家预警信息发布中心");
        assert.equal(body[0].messages[0].language, "en-US");
    } finally {
        globalThis.fetch = originalFetch;
    }
});

test("the response script returns an empty Apple-compatible array when the QWeather fetch fails", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => {
        throw new Error("QWeather unavailable");
    };

    try {
        const response = await processResponse(
            {
                method: "GET",
                url: "https://weatherkit.apple.com/api/v1/weatherAlerts?lang=zh-CN&ids=jianye-101190110",
                headers: { "Accept-Language": "zh-CN" },
            },
            {
                status: 302,
                statusCode: 302,
                headers: {
                    "Content-Length": "0",
                    "Content-Type": "application/json",
                    Location: "https://developer.apple.com/weatherkit/",
                },
                body: "[]",
            },
        );

        assert.equal(response.status, 200);
        assert.equal(response.statusCode, 200);
        assert.equal(response.headers.Location, undefined);
        assert.deepEqual(JSON.parse(response.body), []);
    } finally {
        globalThis.fetch = originalFetch;
    }
});
