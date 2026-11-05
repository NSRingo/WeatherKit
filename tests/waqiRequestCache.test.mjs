// Copyright 2026 hhhoratioxu. SPDX-License-Identifier: Apache-2.0
import assert from "node:assert/strict";
import test from "node:test";

globalThis.$loon = "Mac test runtime";
const stored = new Map();
globalThis.$persistentStore = {
    read: key => stored.get(key),
    write: (value, key) => {
        stored.set(key, value);
        return true;
    },
};
const callbacks = [];
let calls = 0;
globalThis.$httpClient = {
    get(request, callback) {
        assert.equal(request.timeout, 5000);
        calls++;
        callbacks.push(() => callback(null, { status: 200, headers: {} }, JSON.stringify({ status: "ok", data: { city: { name: "Fixture city", geo: [31.2, 121.5], url: "https://example.test/fixture" }, aqi: "42", dominentpol: "pm25", time: { v: 1_790_000_000 }, idx: 123 } })));
    },
};

const [{ default: WAQI }, { default: ProviderRequestCache }, { Console }] = await Promise.all([import("../src/class/WAQI.mjs"), import("../src/class/ProviderRequestCache.mjs"), import("@nsnanocat/util")]);
Console.logLevel = "OFF";
const parameters = { latitude: 31.2, longitude: 121.5, language: "zh-CN", country: "CN", version: "v2" };

test("real WAQI adapter coalesces native callbacks and reuses persisted data in a new execution", async () => {
    const first = new WAQI(parameters, "fixture-token", new ProviderRequestCache());
    const pending = Array.from({ length: 6 }, () => first.AQI2());
    assert.equal(calls, 1);
    callbacks.shift()();
    const products = await Promise.all(pending);
    assert.equal(
        products.every(product => product.index === 42),
        true,
    );
    products[0].metadata.providerName = "changed";
    assert.notEqual(products[1].metadata.providerName, "changed");
    const next = new WAQI(parameters, "fixture-token", new ProviderRequestCache());
    assert.equal((await next.AQI2()).index, 42);
    assert.equal(calls, 1);
    assert.equal([...stored.values()].join("").includes("fixture-token"), false);
});

test("WAQI token errors cool down across executions and token bodies remain uncached", async () => {
    stored.clear();
    const originalHTTP = globalThis.$httpClient;
    let authCalls = 0;
    globalThis.$httpClient = {
        get(_request, callback) {
            authCalls++;
            callback(null, { status: 200, headers: {} }, JSON.stringify({ rxs: { status: "error", obs: [] } }));
        },
    };
    try {
        for (let index = 0; index < 3; index++) {
            const provider = new WAQI(parameters, "fixture-private-token", ProviderRequestCache.fromSettings({}));
            assert.equal(await provider.Token(123), undefined);
        }
        assert.equal(authCalls, 2);
        assert.equal(stored.has("WeatherKit.ProviderResponses.v1"), false);
        assert.doesNotMatch([...stored.values()].join(""), /fixture-private-token|api\.waqi\.info|obs|rxs/);
    } finally {
        globalThis.$httpClient = originalHTTP;
    }
});
