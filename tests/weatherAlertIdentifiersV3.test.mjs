// Synthetic UUID protocol fixtures; no captured alert payloads or device data.
import assert from "node:assert/strict";
import test from "node:test";

globalThis.$loon = "simulated Loon";
globalThis.$persistentStore = { read: () => null, write: () => true };
globalThis.$httpClient = { get: () => { throw new Error("Unexpected provider request"); } };
const [{ default: ResponseJSONV3, adaptV3ClientProduct, adaptV3ProviderProduct, validateWeatherJSONV3 }, { Response }, { Response: ResponseDev }, { qs }] = await Promise.all([
    import("../src/process/ResponseJSONV3.mjs"), import("../src/process/Response.mjs"), import("../src/process/Response.dev.mjs"), import("@nsnanocat/util/polyfill/qs.mjs"),
]);
const bytes = () => [0, 17, 34, 51, 68, 85, 102, 119, 136, 153, 170, 187, 204, 221, 238, 255];
const uuid = "00112233-4455-6677-8899-aabbccddeeff";
const alerts = () => ({ metadata: { temporarilyUnavailable: false, providerName: "Apple fixture" }, alerts: [{ id: { bytes: bytes() }, description: "Fixture warning", detailsUrl: "https://weatherkit.apple.com/alertDetails/index.html?ids=fixture", token: "fixture-warning", futureField: { retained: true } }], futureCollection: true });
const request = { url: "https://weatherkit.apple.com/api/v3/weather/en-US/31.2/121.5?country=CN&dataSets=currentWeather,weatherAlerts", method: "GET" };
const response = body => ({ status: 200, headers: { "Content-Type": "application/json", ETag: "apple-original", "Content-Length": "1", "X-Apple": "retain" }, body: JSON.stringify(body) });
const settings = overrides => globalThis.$argument = qs.parse({ Storage: "Argument", LogLevel: "OFF", DataSets: "currentWeather", "Weather.Provider": "WeatherKit", ...overrides });

test("WK3 alert UUID bytes become the same identifier in native string form", () => {
    const product = alerts(), original = structuredClone(product);
    product.alerts.push({ id: "existing-provider-id", description: "Existing string" });
    assert.equal(adaptV3ClientProduct(product, "weatherAlerts"), true);
    assert.equal(product.alerts[0].id, uuid);
    assert.equal(product.alerts[1].id, "existing-provider-id");
    assert.equal(product.alerts[0].description, original.alerts[0].description);
    assert.equal(product.alerts[0].detailsUrl, original.alerts[0].detailsUrl);
    assert.equal(product.alerts[0].token, original.alerts[0].token);
    assert.deepEqual(product.alerts[0].futureField, original.alerts[0].futureField);
    assert.equal(adaptV3ClientProduct(product, "weatherAlerts"), false);
    validateWeatherJSONV3(product, "weatherAlerts");
});

test("UUID conversion is limited to known alert IDs and accepts all sixteen octets", () => {
    const other = alerts();
    assert.equal(adaptV3ClientProduct(other, "currentWeather"), false);
    assert.deepEqual(other.alerts[0].id, { bytes: bytes() });
    const product = alerts();product.alerts[0].id = { bytes: Array(16).fill(0) };
    assert.equal(adaptV3ProviderProduct(product, "weatherAlerts").alerts[0].id, "00000000-0000-0000-0000-000000000000");
});

test("malformed or unknown identifier objects are not coerced into fake strings", () => {
    for (const id of [{ bytes: bytes().slice(0, 15) }, { bytes: [...bytes().slice(0, 15), 256] }, { bytes: [...bytes().slice(0, 15), -1] }, { bytes: [...bytes().slice(0, 15), 1.5] }, { bytes: bytes().map(String) }, { unknown: "future-id" }, 123]) {
        const product = alerts();product.alerts[0].id = id;
        assert.equal(adaptV3ClientProduct(product, "weatherAlerts"), false);
        assert.deepEqual(product.alerts[0].id, id);
        assert.throws(() => validateWeatherJSONV3(product, "weatherAlerts"), /alert identifier/);
    }
});

for (const [name, processResponse] of [["release", Response], ["development", ResponseDev]]) {
    for (const overrides of [{ DataSets: "" }, { DataSets: "weatherAlerts", "WeatherAlerts.Provider": "WeatherKit" }]) {
        test(`${name}: retained Apple alerts are readable even when source replacement is disabled: ${JSON.stringify(overrides)}`, async () => {
            settings(overrides);
            const body = { weatherAlerts: alerts(), currentWeather: { metadata: {}, conditionCode: "CLEAR", temperature: 18 }, futureProduct: { alerts: [{ id: { bytes: bytes() } }] } };
            const original = structuredClone(body);
            const result = await processResponse(request, response(body));
            const actual = JSON.parse(result.body);
            assert.equal(actual.weatherAlerts.alerts[0].id, uuid);
            assert.equal(actual.weatherAlerts.alerts[0].description, "Fixture warning");
            assert.deepEqual(actual.futureProduct, original.futureProduct);
            assert.deepEqual(actual.currentWeather, original.currentWeather);
            assert.deepEqual(body, original);
            assert.equal(result.headers.ETag, undefined);
            assert.equal(result.headers["Cache-Control"], "no-store");
        });
    }
}

test("failed warning replacement keeps normalized Apple IDs and the healthy product", async () => {
    settings({ DataSets: "weatherAlerts,currentWeather", "Weather.Provider": "QWeather", "WeatherAlerts.Provider": "QWeatherWeb" });
    const body = { weatherAlerts: alerts(), currentWeather: { metadata: {}, conditionCode: "CLEAR", temperature: 18 } };
    const result = await ResponseJSONV3(request, response(body), { weatherAlerts: async () => { throw new Error("fixture source failure"); }, currentWeather: async input => ({ ...input, temperature: 20 }) });
    const actual = JSON.parse(result.body);
    assert.equal(actual.weatherAlerts.alerts[0].id, uuid);
    assert.equal(actual.weatherAlerts.alerts[0].description, "Fixture warning");
    assert.equal(actual.currentWeather.temperature, 20);
});

test("an invalid new provider ID cannot replace readable Apple warning data", async () => {
    settings({ DataSets: "weatherAlerts", "WeatherAlerts.Provider": "QWeatherWeb" });
    const result = await ResponseJSONV3(request, response({ weatherAlerts: alerts() }), { weatherAlerts: async input => ({ ...input, alerts: [{ ...input.alerts[0], id: { unknown: "provider-id" } }] }) });
    assert.equal(JSON.parse(result.body).weatherAlerts.alerts[0].id, uuid);
});

test("already native alert strings retain the original body and cache validators", async () => {
    settings({ DataSets: "" });
    const product = alerts();product.alerts[0].id = uuid;
    const original = response({ weatherAlerts: product });original.body = "  " + original.body + "\n";
    const result = await ResponseJSONV3(request, original, {});
    assert.strictEqual(result, original);
    assert.equal(result.headers.ETag, "apple-original");
});
