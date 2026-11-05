// Synthetic protocol fixtures; never commit captured phone responses or credentials.
import assert from "node:assert/strict";
import test from "node:test";

globalThis.$loon = "simulated Loon";
globalThis.$persistentStore = { read: () => null, write: () => true };
globalThis.$argument = { Storage: "Argument", LogLevel: "OFF" };
const [{ Response }, { Response: ResponseDev }, { default: QWeather }, { default: ColorfulClouds }, { default: ResponseJSONV3, adaptV3ProviderProduct, validateWeatherJSONV3, adaptV3ClientProduct }] = await Promise.all([
    import("../src/process/Response.mjs"), import("../src/process/Response.dev.mjs"), import("../src/class/QWeather.mjs"), import("../src/class/ColorfulClouds.mjs"), import("../src/process/ResponseJSONV3.mjs"),
]);
const { qs } = await import("@nsnanocat/util/polyfill/qs.mjs");
const metadata = () => ({ latitude: 31.2, longitude: 121.5, temporarilyUnavailable: false, sourceType: "MODELED", futureMetadata: true });
const current = () => ({ metadata: metadata(), temperature: 18, conditionCode: "CLOUDY", futureCurrent: { retain: true } });
const request = (products = "currentWeather") => globalThis.$request = { url: `https://weatherkit.apple.com/api/v3/weather/zh-Hans-CN/31.2/121.5?country=CN&dataSets=${products}`, method: "GET" };
const response = body => ({ status: 200, headers: { "Content-Type": "application/json; charset=utf-8", ETag: "apple", "cOnTeNt-LeNgTh": "1", "cache-control": "max-age=60", "X-Apple": "retain" }, body: typeof body === "string" ? body : JSON.stringify(body) });
const settings = overrides => globalThis.$argument = qs.parse({ Storage: "Argument", LogLevel: "OFF", DataSets: "currentWeather,forecastHourly,forecastDaily,forecastNextHour,weatherAlerts", "Weather.Provider": "QWeather", "WeatherAlerts.Provider": "WeatherKit", ...overrides });
const airQualitySettings = overrides => settings({ "AirQuality.Current.Index.Replace": "EPA_NowCast", ...overrides });
const allPollutants = () => [["PM2_5", 35], ["PM10", 60], ["OZONE", 90], ["NO2", 35], ["SO2", 15], ["CO", 700]].map(([pollutantType, amount]) => ({ pollutantType, amount, units: "MICROGRAMS_PER_CUBIC_METER" }));
const airQualityProduct = pollutants => ({ metadata: { ...metadata(), providerName: "Apple fixture" }, scale: "EPA_NowCast", index: 42, categoryIndex: 1, primaryPollutant: "PM2_5", previousDayComparison: "SIMILAR", pollutants });

test("native Weather JSON uses string conditions and scalar amounts, including unselected periodic forecasts", async () => {
    settings({ DataSets: "currentWeather", "Weather.Provider": "WeatherKit" });
    const body = {
        currentWeather: { ...current(), conditionCode: ["CLOUDY", "BREEZY"], snowfallAmountPrevious1h: { expected: 2, minimum: 1, maximum: 3 } },
        forecastDaily: { metadata: metadata(), days: [{ conditionCode: ["RAIN"], precipitationType: ["RAIN"], precipitationAmountByType: [{ expected: 3, minimum: 1, maximum: 4, precipitationType: ["RAIN"] }, { expected: 1, minimum: 0, maximum: 2, precipitationType: ["SNOW"] }] }] },
        forecastPeriodic: { metadata: metadata(), forecasts: [{ periods: [{ conditionCode: ["RAIN"], precipitationAmountByType: [] }] }] },
        futureProduct: { conditionCode: ["DO_NOT_CHANGE"], opaque: true },
    };
    const original = structuredClone(body);
    const result = await ResponseJSONV3(request("currentWeather"), response(body), {});
    const actual = JSON.parse(result.body);
    assert.equal(actual.currentWeather.conditionCode, "CLOUDY");
    assert.equal(actual.currentWeather.snowfallAmountPrevious1h, 2);
    assert.equal(actual.forecastDaily.days[0].precipitationAmount, 4);
    assert.equal(actual.forecastDaily.days[0].precipitationType, "RAIN");
    assert.equal(actual.forecastDaily.days[0].precipitationAmountByType[0].minimum, 1);
    assert.equal(actual.forecastPeriodic.forecasts[0].periods[0].conditionCode, "RAIN");
    assert.equal(actual.forecastPeriodic.forecasts[0].periods[0].precipitationAmount, 0);
    assert.deepEqual(actual.futureProduct, body.futureProduct);
    assert.deepEqual(body, original);
    assert.equal(result.headers["Cache-Control"], "no-store");
});

test("native JSON adaptation preserves existing totals and condition-record vectors and is idempotent", () => {
    const product = { precipitationAmount: 9, precipitationAmountByType: [{ expected: 4 }], condition: [{ beginCondition: "CLEAR", endCondition: "RAIN" }], summary: [{ condition: ["RAIN"] }] };
    assert.equal(adaptV3ClientProduct(product), true);
    assert.equal(product.precipitationAmount, 9);
    assert.deepEqual(product.condition, [{ beginCondition: "CLEAR", endCondition: "RAIN" }]);
    assert.equal(product.summary[0].condition, "RAIN");
    assert.equal(adaptV3ClientProduct(product), false);
    validateWeatherJSONV3(product);
    const emptyConditions = { condition: [], summary: [] };
    assert.equal(adaptV3ClientProduct(emptyConditions), false);
    assert.deepEqual(emptyConditions.condition, []);
});

test("native JSON adaptation never invents a total from missing or invalid precipitation measurements", () => {
    for (const amounts of [[{}], [{ expected: NaN }], [{ expected: -1 }]]) {
        const product = { precipitationAmountByType: amounts };
        adaptV3ClientProduct(product);
        assert.equal(product.precipitationAmount, undefined);
    }
});

for (const [name, processResponse] of [["release", Response], ["development", ResponseDev]]) {
    test(`${name}: native Apple QWeather CO is correctly displayed in ug after ingress normalization`, async t => {
        airQualitySettings({ DataSets: "airQuality", "AirQuality.Calculate.Algorithm": "WAQI_InstantCast_US" });
        t.mock.method(ColorfulClouds.prototype, "CurrentAirQuality", () => { throw new Error("Complete Apple concentrations require no extra query"); });
        const product = airQualityProduct(allPollutants());
        product.metadata.providerName = "QWeather";
        product.pollutants.find(p => p.pollutantType === "CO").amount = 0.7;
        const actual = JSON.parse((await processResponse(request("airQuality"), response({ airQuality: product }))).body).airQuality;
        assert.equal(actual.pollutants.find(p => p.pollutantType === "CO").amount, 700);
        assert.equal(actual.pollutants.find(p => p.pollutantType === "CO").units, "MICROGRAMS_PER_CUBIC_METER");
        assert.equal(product.pollutants.find(p => p.pollutantType === "CO").amount, 0.7);
        assert.equal(actual.index, 99);
    });
    for (const algorithm of ["UBA", "EU_EAQI", "WAQI_InstantCast_US", "WAQI_InstantCast_CN", "WAQI_InstantCast_CN_25_DRAFT", "CA_AQHI", "HK_AQHI", "AQHI_Multi_CN", "AQHI_Multi_CN_HK", "CN_DEATH_AQHI", "CN_DEATH_HK_AQHI", "None"]) {
        test(`${name}: v3 ${algorithm} selects the requested algorithm on an explicitly targeted Apple standard`, async t => {
            airQualitySettings({ DataSets: "airQuality", "AirQuality.Calculate.Algorithm": algorithm });
            t.mock.method(ColorfulClouds.prototype, "CurrentAirQuality", () => { throw new Error("Complete concentrations must not start provider requests"); });
            t.mock.method(QWeather.prototype, "CurrentAirQuality", () => { throw new Error("Complete concentrations must not start provider requests"); });
            const body = { airQuality: airQualityProduct(allPollutants()), futureProduct: { retained: true } };
            const result = await processResponse(request("airQuality"), response(body));
            const actual = JSON.parse(result.body).airQuality;
            assert.equal(actual.pollutants.length, 6);
            assert.ok(Number.isInteger(actual.index) && actual.index >= 0);
            assert.ok(Number.isInteger(actual.categoryIndex) && actual.categoryIndex >= 1);
            if (algorithm === "None") {
                assert.equal(actual.index, 42);
                assert.equal(actual.previousDayComparison, "SIMILAR");
            } else {
                assert.match(actual.metadata.providerName, /iRingo/);
                assert.equal(actual.previousDayComparison, "SIMILAR", "Keep the original comparison when ReplaceWhenCurrentChange is off");
                assert.equal(result.headers["Cache-Control"], "no-store");
            }
            assert.deepEqual(JSON.parse(result.body).futureProduct, body.futureProduct);
        });
    }
    test(`${name}: a partial pollutant array is supplemented without replacing valid Apple concentrations`, async t => {
        airQualitySettings({ DataSets: "airQuality", "AirQuality.Calculate.Algorithm": "CA_AQHI" });
        let calls = 0;
        t.mock.method(ColorfulClouds.prototype, "CurrentAirQuality", async () => { calls++; return { metadata: { providerName: "fixture", temporarilyUnavailable: false }, pollutants: allPollutants() }; });
        const body = { airQuality: airQualityProduct([{ ...allPollutants()[0], amount: 0 }, { ...allPollutants()[3], amount: null }]) };
        const result = JSON.parse((await processResponse(request("airQuality"), response(body))).body).airQuality;
        assert.equal(calls, 1);
        assert.equal(result.pollutants.length, 6);
        assert.equal(result.pollutants.find(p => p.pollutantType === "PM2_5").amount, 0);
        assert.equal(result.pollutants.find(p => p.pollutantType === "NO2").amount, 35);
        assert.equal(result.scale, "CA.AQHI");
    });
    test(`${name}: a failed supplement and incomplete risk inputs retain the available Apple index`, async t => {
        airQualitySettings({ DataSets: "airQuality", "AirQuality.Calculate.Algorithm": "HK_AQHI" });
        t.mock.method(ColorfulClouds.prototype, "CurrentAirQuality", async () => { throw new Error("fixture provider unavailable"); });
        const body = { airQuality: airQualityProduct([allPollutants()[0]]) };
        const result = JSON.parse((await processResponse(request("airQuality"), response(body))).body).airQuality;
        assert.equal(result.index, 42);
        assert.equal(result.categoryIndex, 1);
        assert.equal(result.scale, "EPA_NowCast");
        assert.equal(result.previousDayComparison, "SIMILAR");
        assert.equal(result.pollutants.length, 1);
    });
    test(`${name}: v3 changes provider fields while retaining unknown Apple data and native JSON types`, async t => {
        settings();
        t.mock.method(QWeather.prototype, "WeatherNow", async () => ({ metadata: { providerName: "Fixture", latitude: "31.2", longitude: "121.5" }, temperature: 23, conditionCode: "CLEAR", windGust: NaN }));
        t.mock.method(QWeather.prototype, "Hourly", async () => ({ metadata: { providerName: "Fixture" }, hours: [{ forecastStart: 100, temperature: 24, conditionCode: "RAIN", precipitationType: "RAIN", precipitationAmount: 0.4, snowfallAmount: 0 }] }));
        const body = { currentWeather: current(), forecastHourly: { metadata: metadata(), hours: [100, 200].map(forecastStart => ({ forecastStart, temperature: 17, conditionCode: ["CLOUDY"], precipitationAmount: { expected: 0.1, minimum: 0, maximum: 0.2 }, newHourField: true })) }, futureProduct: { untouched: [1, 2] } };
        const original = JSON.stringify(body);
        const result = await processResponse(request("currentWeather,forecastHourly"), response(body));
        const updated = JSON.parse(result.body);
        assert.equal(updated.currentWeather.temperature, 23);
        assert.equal(updated.currentWeather.conditionCode, "CLEAR");
        assert.equal(updated.currentWeather.metadata.latitude, 31.2);
        assert.equal(updated.currentWeather.windGust, undefined);
        assert.deepEqual(updated.currentWeather.futureCurrent, { retain: true });
        assert.equal(updated.currentWeather.metadata.futureMetadata, true);
        assert.equal(updated.forecastHourly.hours[0].precipitationAmount, 0.4);
        assert.equal(updated.forecastHourly.hours[0].conditionCode, "RAIN");
        assert.deepEqual(updated.forecastHourly.hours[1], { ...body.forecastHourly.hours[1], conditionCode: "CLOUDY", precipitationAmount: 0.1 });
        assert.deepEqual(updated.futureProduct, body.futureProduct);
        assert.equal(JSON.stringify(body), original);
        assert.deepEqual(result.headers, { "Content-Type": "application/json; charset=utf-8", "X-Apple": "retain", "Cache-Control": "no-store" });
    });
    test(`${name}: missing provider data and Apple-only settings retain exact original response`, async t => {
        settings();
        t.mock.method(QWeather.prototype, "WeatherNow", async () => undefined);
        const original = response(`  ${JSON.stringify({ currentWeather: current() })}\n`);
        assert.strictEqual(await processResponse(request(), original), original);
        settings({ "Weather.Provider": "WeatherKit" });
        t.mock.method(ColorfulClouds.prototype, "CurrentWeather", () => { throw new Error("must not start"); });
        assert.strictEqual(await processResponse(request(), original), original);
    });
    test(`${name}: v3 binary stays opaque rather than using a WK2 decoder`, async () => {
        settings();
        const original = { ...response("opaque WK3"), headers: { "Content-Type": "application/vnd.apple.flatbuffer;messageType=WK3.Weather" } };
        assert.strictEqual(await processResponse(request(), original), original);
    });
}

test("JSON provider adapter covers daily periods and minute summary without changing supported condition records", () => {
    const value = adaptV3ProviderProduct({ metadata: { latitude: "31.2", longitude: "invalid" }, days: [{ conditionCode: "RAIN", precipitationType: "RAIN", snowfallAmount: 2, daytimeForecast: { conditionCode: "CLOUDY" } }], summary: [{ condition: "CLEAR" }], condition: [{ beginCondition: "CLEAR", endCondition: "RAIN", parameters: [] }] });
    assert.equal(value.days[0].daytimeForecast.conditionCode, "CLOUDY");
    assert.equal(value.days[0].snowfallAmount, 2);
    assert.equal(value.summary[0].condition, "CLEAR");
    assert.equal(value.condition[0].beginCondition, "CLEAR");
    assert.equal(value.metadata.longitude, undefined);
});

test("v3 limits, invalid JSON, HTTP failures and unrelated URLs never start injectors", async () => {
    settings();
    const good = { currentWeather: current() };
    const deep = current(); let tail = deep;
    for (let i = 0; i < 66; i++) tail = tail.nested = {};
    const candidates = [response("{"), response(" ".repeat(1024 * 1024 + 1)), response({ currentWeather: { ...current(), huge: Array(8193).fill(0) } }), response({ currentWeather: deep }), response({ error: "not weather" }), { ...response(good), status: 503 }];
    let calls = 0;
    const injectors = { currentWeather: () => { calls++; throw new Error("unexpected work"); } };
    for (const original of candidates) assert.strictEqual(await ResponseJSONV3(request(), original, injectors), original);
    for (const url of [request().url.replace("weatherkit.apple.com", "example.com"), request().url.replace("/31.2/", "/91.2/")]) {
        const original = response(good);
        assert.strictEqual(await ResponseJSONV3({ url, method: "GET" }, original, injectors), original);
    }
    assert.equal(calls, 0);
});

test("a failed hourly product preserves its exact fields while a healthy current product changes", async t => {
    settings();
    t.mock.method(QWeather.prototype, "WeatherNow", async () => ({ metadata: { providerName: "Fixture" }, temperature: 23 }));
    t.mock.method(QWeather.prototype, "Hourly", async () => { throw new Error("provider failed"); });
    const body = { currentWeather: current(), forecastHourly: { metadata: metadata(), hours: [{ forecastStart: 100, futureValue: [1, 2] }] } };
    const result = JSON.parse((await Response(request("currentWeather,forecastHourly"), response(body))).body);
    assert.equal(result.currentWeather.temperature, 23);
    assert.deepEqual(result.forecastHourly, body.forecastHourly);
});

test("v3 air-quality calculation uses symbolic enums and leaves unrelated Apple products intact", async () => {
    airQualitySettings({ DataSets: "airQuality", "AirQuality.Calculate.Algorithm": "UBA", "AirQuality.Current.Index.Replace": "HJ6332012" });
    const body = { airQuality: { metadata: metadata(), scale: "HJ6332012", index: 50, categoryIndex: 1, primaryPollutant: "PM2_5", previousDayComparison: "SIMILAR", pollutants: [{ pollutantType: "PM2_5", amount: 30, units: "MICROGRAMS_PER_CUBIC_METER" }, { pollutantType: "PM10", amount: 40, units: "MICROGRAMS_PER_CUBIC_METER" }] }, currentWeather: current(), futureProduct: { version: 3 } };
    const updated = JSON.parse((await Response(request("airQuality"), response(body))).body);
    assert.notEqual(updated.airQuality.scale, "HJ6332012");
    assert.ok(Number.isFinite(updated.airQuality.index));
    assert.equal(typeof updated.airQuality.primaryPollutant, "string");
    assert.equal(updated.airQuality.pollutants[0].units, "MICROGRAMS_PER_CUBIC_METER");
    assert.deepEqual(updated.currentWeather, body.currentWeather);
    assert.deepEqual(updated.futureProduct, body.futureProduct);
});

test("WK3 integer scalars are normalized without rounding continuous measurements", () => {
    const product = adaptV3ProviderProduct({ metadata: { readTime: 100.9 }, hours: [{ cloudCover: 38.2, humidity: 80.7, precipitationChance: 32.5, windDirection: 183.8, uvIndex: 2.4, temperature: 17.38, pressure: 1013.42, windSpeed: 2.75 }] });
    validateWeatherJSONV3(product);
    assert.deepEqual(product.hours[0], { cloudCover: 38, humidity: 81, precipitationChance: 33, windDirection: 184, uvIndex: 2, temperature: 17.38, pressure: 1013.42, windSpeed: 2.75 });
    assert.equal(product.metadata.readTime, 100);
});

test("bad provider integer fields keep Apple's values and obsolete bodyBytes are removed", async t => {
    settings();
    t.mock.method(QWeather.prototype, "WeatherNow", async () => ({ metadata: { providerName: "Fixture" }, temperature: 23.4, windDirection: -1, cloudCover: Infinity, humidity: 101, uvIndex: 2.7 }));
    const original = { ...response({ currentWeather: { ...current(), windDirection: 90, cloudCover: 40, humidity: 80 } }), bodyBytes: new Uint8Array([1, 2]) };
    const result = await Response(request(), original);
    const updated = JSON.parse(result.body).currentWeather;
    assert.equal(updated.windDirection, 90);
    assert.equal(updated.cloudCover, 40);
    assert.equal(updated.humidity, 80);
    assert.equal(updated.uvIndex, 3);
    assert.equal(updated.temperature, 23.4);
    assert.equal(result.bodyBytes, undefined);
    assert.ok(original.bodyBytes);
});

test("a nonnumeric integer or malformed vector rejects only its replacement product", async t => {
    settings();
    t.mock.method(QWeather.prototype, "WeatherNow", async () => ({ metadata: { providerName: "Fixture" }, temperature: 23, windDirection: "bad" }));
    t.mock.method(QWeather.prototype, "Hourly", async () => ({ metadata: { providerName: "Fixture" }, hours: [{ forecastStart: 100, temperature: 24, conditionCode: "RAIN", precipitationChance: 32.5 }] }));
    const body = { currentWeather: current(), forecastHourly: { metadata: metadata(), hours: [{ forecastStart: 100, temperature: 17 }] } };
    const result = JSON.parse((await Response(request("currentWeather,forecastHourly"), response(body))).body);
    assert.deepEqual(result.currentWeather, body.currentWeather);
    assert.equal(result.forecastHourly.hours[0].temperature, 24);
    assert.equal(result.forecastHourly.hours[0].precipitationChance, 33);
});

test("invalid unsigned air-quality results cannot replace a healthy Apple product", async () => {
    settings({ DataSets: "airQuality,currentWeather" });
    const body = { airQuality: { metadata: metadata(), index: 30, categoryIndex: 1 }, currentWeather: current() };
    const injectors = { airQuality: async input => ({ ...input, index: -1, categoryIndex: -1 }), currentWeather: async input => ({ ...input, temperature: 23 }) };
    const updated = JSON.parse((await ResponseJSONV3(request("airQuality,currentWeather"), response(body), injectors)).body);
    assert.deepEqual(updated.airQuality, body.airQuality);
    assert.equal(updated.currentWeather.temperature, 23);
});

test("WK3 open-ended minute forecasts omit WK2 zero timestamp sentinels", () => {
    const product = adaptV3ProviderProduct({ metadata: { reportedTime: 0, readTime: 100 }, forecastStart: 0, forecastEnd: 300, condition: [{ startTime: 100, endTime: 0, beginCondition: "CLEAR", endCondition: "CLEAR", parameters: [] }], summary: [{ startTime: 100, endTime: 0, condition: "CLEAR", precipitationChance: 0, precipitationIntensity: 0 }] });
    validateWeatherJSONV3(product);
    assert.equal(product.metadata.reportedTime, undefined);
    assert.equal(product.condition[0].endTime, undefined);
    assert.equal(product.summary[0].endTime, undefined);
    assert.equal(product.forecastStart, 0);
    assert.equal(product.summary[0].precipitationIntensity, 0);
});

test("undefined provider values do not erase available Apple fields", async t => {
    settings();
    t.mock.method(QWeather.prototype, "WeatherNow", async () => ({ metadata: { providerName: "Fixture" }, temperature: 23, windDirection: undefined, humidity: null }));
    const original = { currentWeather: { ...current(), humidity: 80, windDirection: 90 } };
    const updated = JSON.parse((await Response(request(), response(original))).body).currentWeather;
    assert.equal(updated.temperature, 23);
    assert.equal(updated.humidity, 80);
    assert.equal(updated.windDirection, 90);
});

test("unserializable values and malformed Unicode reject one product without discarding healthy replacements", async () => {
    settings({ DataSets: "weatherAlerts,currentWeather" });
    const body = { weatherAlerts: { metadata: metadata(), alerts: [{ description: "Apple warning" }] }, currentWeather: current() };
    for (const invalid of ["bad\ud800", 1n, [undefined], [null], [1e100]]) {
        const injectors = { weatherAlerts: async input => ({ ...input, futureProviderField: invalid }), currentWeather: async input => ({ ...input, temperature: 23 }) };
        const updated = JSON.parse((await ResponseJSONV3(request("weatherAlerts,currentWeather"), response(body), injectors)).body);
        assert.deepEqual(updated.weatherAlerts, body.weatherAlerts);
        assert.equal(updated.currentWeather.temperature, 23);
    }
    assert.doesNotThrow(() => validateWeatherJSONV3({ description: "雨 🌧️" }));
});

test("a null replacement product keeps the complete original response", async () => {
    settings({ DataSets: "currentWeather" });
    const original = response({ currentWeather: current() });
    assert.strictEqual(await ResponseJSONV3(request(), original, { currentWeather: async () => null }), original);
});
