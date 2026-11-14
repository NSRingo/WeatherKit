// Focused, synthetic regressions for the independently reviewable alert-state fix.
import assert from "node:assert/strict";
import test from "node:test";
import mergeWeatherAlertsProduct from "../src/function/mergeWeatherAlertsProduct.mjs";
import { Console } from "@nsnanocat/util";
Console.logLevel = "OFF";

const original = (alerts = []) => ({ metadata: { providerName: "Apple", temporarilyUnavailable: true }, detailsUrl: "https://weatherkit.apple.com/original", alerts, future: { retain: true } });
const nativeAlert = () => ({ id: "00112233-4455-6677-8899-aabbccddeeff", description: "暴雨橙色预警", phenomenon: "Rain", severity: "severe", message: "" });
const supplements = [
    undefined,
    { metadata: { temporarilyUnavailable: false, providerName: "provider" } },
    { metadata: { temporarilyUnavailable: false }, alerts: [] },
    { metadata: { temporarilyUnavailable: true }, alerts: [{ description: "unavailable source" }] },
    { metadata: { temporarilyUnavailable: false }, alerts: [{ expireTime: "2000-01-01T00:00:00Z", description: "expired" }] },
];
for (const [index, source] of supplements.entries()) for (const filled of [false, true]) test(`no usable alert enrichment preserves the original product (${index}, existing=${filled})`, () => {
    const apple = original(filled ? [nativeAlert()] : []);
    const before = structuredClone(apple);
    assert.strictEqual(mergeWeatherAlertsProduct(apple, source), apple);
    assert.deepEqual(apple, before);
});

test("a provider warning cannot manufacture an Apple native event when its destination is empty", () => {
    const apple = original();
    const source = { metadata: { temporarilyUnavailable: false }, alerts: [{ ...nativeAlert(), message: "source" }] };
    assert.strictEqual(mergeWeatherAlertsProduct(apple, source), apple);
    assert.equal(apple.metadata.temporarilyUnavailable, true);
});

test("an installed warning field permits metadata enrichment while preserving both inputs and the native ID", () => {
    const apple = original([nativeAlert()]);
    const source = { metadata: { providerName: "provider", temporarilyUnavailable: false, providerLogo: "https://fixture.example/logo" }, alerts: [{ description: "暴雨橙色预警", phenomenon: "Rain", severity: "severe", expireTime: "2099-01-01T00:00:00Z" }] };
    const beforeApple = structuredClone(apple), beforeSource = structuredClone(source);
    const result = mergeWeatherAlertsProduct(apple, source);
    assert.equal(result.metadata.temporarilyUnavailable, false);
    assert.equal(result.alerts[0].expireTime, Date.parse("2099-01-01T00:00:00Z") / 1000);
    assert.equal(result.alerts[0].id, beforeApple.alerts[0].id);
    assert.deepEqual(result.future, beforeApple.future);
    assert.deepEqual(apple, beforeApple);
    assert.deepEqual(source, beforeSource);
});
