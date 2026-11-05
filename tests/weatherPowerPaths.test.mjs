import assert from "node:assert/strict";
import test from "node:test";
import ProviderRequestCache from "../src/class/ProviderRequestCache.mjs";
import createProviderEnvironment from "../src/function/createProviderEnvironment.mjs";
import resolveWeatherRegion, { countryFromCoordinates } from "../src/function/resolveWeatherRegion.mjs";

test("explicit and locale-only regions do not materialize the offline polygon table", () => {
    const parse = JSON.parse;
    let geometryParses = 0;
    JSON.parse = (text, ...rest) => {
        if (typeof text === "string" && text.length > 100000 && text.startsWith('{"CN"')) geometryParses++;
        return parse(text, ...rest);
    };
    try {
        assert.equal(resolveWeatherRegion({ latitude: 32.39, longitude: 119.499, explicitCountry: "CN" }), "CN");
        assert.equal(resolveWeatherRegion({ latitude: 32.39, longitude: 119.499, localeCountry: "US", fallback: "Locale" }), "US");
        assert.equal(geometryParses, 0);
        assert.equal(countryFromCoordinates(32.39, 119.499), "CN");
        assert.equal(countryFromCoordinates(32.4, 119.5), "CN");
        assert.equal(geometryParses, 1);
    } finally {
        JSON.parse = parse;
    }
});

test("stable coordinate hints write at most hourly but country changes and expiry refresh immediately", () => {
    let now = 100000,
        stored,
        writes = 0;
    const store = {
        read: () => stored,
        write: value => {
            stored = value;
            writes++;
            return true;
        },
    };
    const resolve = country => resolveWeatherRegion({ latitude: 32.39, longitude: 119.499, explicitCountry: country, now: () => now, store });
    for (let i = 0; i < 6; i++, now += 10000) assert.equal(resolve("CN"), "CN");
    assert.equal(writes, 1);
    assert.equal(resolve("HK"), "HK");
    assert.equal(writes, 2);
    now += 3600000;
    assert.equal(resolve("HK"), "HK");
    assert.equal(writes, 3);
    now += 7 * 86400000;
    assert.equal(resolve("HK"), "HK");
    assert.equal(writes, 4);
    assert.doesNotMatch(stored, /32\.39|119\.499/);
});

test("provider constructors and credentials are accessed only on first use of that provider", () => {
    let apiReads = 0;
    const settings = {
        get API() {
            apiReads++;
            return {};
        },
    };
    const runtime = new ProviderRequestCache({ store: undefined });
    const env = createProviderEnvironment({ country: "CN", language: "zh-CN", latitude: 32.39, longitude: 119.499 }, settings, runtime);
    assert.equal(apiReads, 0);
    const first = env.qWeather;
    assert.equal(apiReads, 2);
    assert.strictEqual(env.qWeather, first);
    assert.equal(apiReads, 2);
    assert.equal(env.country, "CN");
    assert.strictEqual(env.requestCache, runtime);
});
