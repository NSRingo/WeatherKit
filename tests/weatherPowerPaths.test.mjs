import assert from "node:assert/strict";
import test from "node:test";
import ProviderTransport from "../src/class/ProviderTransport.mjs";
import createProviderEnvironment from "../src/function/createProviderEnvironment.mjs";
test("provider constructors and credentials are accessed only on first use of that provider", () => {
    let apiReads = 0;
    const settings = {
        get API() {
            apiReads++;
            return {};
        },
    };
    const runtime = new ProviderTransport();
    const env = createProviderEnvironment({ country: "CN", language: "zh-CN", latitude: 32.39, longitude: 119.499 }, settings, runtime);
    assert.equal(apiReads, 0);
    const first = env.qWeather;
    assert.equal(apiReads, 2);
    assert.strictEqual(env.qWeather, first);
    assert.equal(apiReads, 2);
    assert.equal(env.country, "CN");
    assert.strictEqual(env.transport, runtime);
});
