import assert from "node:assert/strict";
import test from "node:test";
import ProviderRequestCache, { readProviderJSON } from "../src/class/ProviderRequestCache.mjs";
import mergeForecastCopy from "../src/function/mergeForecastCopy.mjs";

const freeze = value => {
    if (value && typeof value === "object") {
        for (const item of Object.values(value)) freeze(item);
        Object.freeze(value);
    }
    return value;
};

test("forecast replacement copies matching rows and preserves both nested input graphs", () => {
    const vector = [{ precipitationType: "RAIN", expected: 1 }];
    const original = freeze([
        { forecastStart: 10, temperature: 20, precipitationAmountByType: vector, daytimeForecast: { temperatureMax: 24, cloudCover: 0.2 } },
        { forecastStart: 20, temperature: 21 },
    ]);
    const provider = freeze([
        { forecastStart: 5, temperature: 8 },
        { forecastStart: 10, temperature: 22, daytimeForecast: { temperatureMax: 26 } },
    ]);
    const merged = mergeForecastCopy(original, provider);
    assert.notStrictEqual(merged, original);
    assert.deepEqual(merged[0].daytimeForecast, { temperatureMax: 26, cloudCover: 0.2 });
    assert.strictEqual(merged[0].precipitationAmountByType, vector);
    assert.strictEqual(merged[1], original[1]);
    assert.equal(original[0].temperature, 20);
    assert.deepEqual(provider[1].daytimeForecast, { temperatureMax: 26 });
});

test("forecasts without overlapping timestamps keep the original array", () => {
    const original = freeze([{ forecastStart: 10 }, { forecastStart: 20 }]);
    assert.strictEqual(mergeForecastCopy(original, [{ forecastStart: 1 }, { forecastStart: 30 }]), original);
    assert.strictEqual(mergeForecastCopy(original, []), original);
});

test("a forecast source that fails after one match cannot partially mutate Apple rows", () => {
    const original = freeze([
        { forecastStart: 10, temperature: 20 },
        { forecastStart: 20, temperature: 21 },
    ]);
    const bad = {
        forecastStart: 20,
        get temperature() {
            throw new Error("fixture conversion failure");
        },
    };
    assert.throws(() => mergeForecastCopy(original, [{ forecastStart: 10, temperature: 99 }, bad]), /conversion failure/);
    assert.deepEqual(
        original.map(row => row.temperature),
        [20, 21],
    );
});

function storage() {
    let value;
    return {
        read: () => value,
        write: next => {
            value = next;
            return true;
        },
    };
}
const request = { url: "https://memory.invalid/fixture" };
const body = '{"status":"ok","memoryFixture":{"values":[1,2,3]}}';
const validate = value => value.status === "ok";

test("six parsed JSON consumers validate once each, own independent graphs and persist only raw JSON", async () => {
    const store = storage(),
        cache = new ProviderRequestCache({ store });
    const parse = JSON.parse;
    let parses = 0,
        requests = 0;
    JSON.parse = (value, ...args) => {
        if (value === body) parses++;
        return parse(value, ...args);
    };
    try {
        const results = await Promise.all(
            Array.from({ length: 6 }, () =>
                cache.fetch(request, {
                    includeJSON: true,
                    validate,
                    fetcher: async () => {
                        requests++;
                        return { status: 200, headers: {}, body };
                    },
                }),
            ),
        );
        const decoded = results.map(readProviderJSON);
        assert.equal(requests, 1);
        assert.equal(parses, 6, "Persistence and conversion do not parse validated JSON again");
        decoded[0].memoryFixture.values[0] = 99;
        assert.equal(decoded[1].memoryFixture.values[0], 1);
        assert.ok(results.every(value => value.body === body));
        assert.ok(Object.keys(results[0]).every(key => typeof key === "string"));
        const persisted = parse(store.read());
        assert.equal(persisted.entries[0].body, body);
        assert.equal(Object.getOwnPropertySymbols(persisted.entries[0]).length, 0);
        const next = new ProviderRequestCache({ store });
        const hit = await next.fetch(request, {
            includeJSON: true,
            validate,
            fetcher: () => {
                throw new Error("unexpected request");
            },
        });
        assert.equal(readProviderJSON(hit).memoryFixture.values[0], 1);
        assert.equal(parses, 7);
    } finally {
        JSON.parse = parse;
    }
});

test("shared transport validation mutations cannot contaminate another JSON consumer", async () => {
    const cache = new ProviderRequestCache({ ttlSeconds: 0, store: storage() });
    const fetcher = async () => ({ status: 200, headers: {}, body });
    const [mutated, original] = await Promise.all([
        cache.fetch(request, {
            includeJSON: true,
            validate: value => {
                value.memoryFixture.values[0] = 99;
                return true;
            },
            fetcher,
        }),
        cache.fetch(request, { includeJSON: true, validate, fetcher }),
    ]);
    assert.equal(readProviderJSON(mutated).memoryFixture.values[0], 99);
    assert.equal(readProviderJSON(original).memoryFixture.values[0], 1);
});

test("parsed response results still expire and cannot bypass a different product validator", async () => {
    let now = 100000,
        requests = 0;
    const cache = new ProviderRequestCache({ store: storage(), now: () => now });
    const fetcher = async () => {
        requests++;
        return { status: 200, headers: {}, body };
    };
    const first = await cache.fetch(request, { includeJSON: true, validate, fetcher });
    readProviderJSON(first).memoryFixture.values.push(99);
    const hit = await cache.fetch(request, { includeJSON: true, validate, fetcher });
    assert.deepEqual(readProviderJSON(hit).memoryFixture.values, [1, 2, 3]);
    now += 60000;
    await cache.fetch(request, { includeJSON: true, validate, fetcher });
    assert.equal(requests, 2);
    await assert.rejects(cache.fetch(request, { includeJSON: true, validate: () => false, fetcher }), error => error.code === "invalid");
});

test("the JSON helper keeps raw response compatibility and accepts a validated null", async () => {
    assert.deepEqual(readProviderJSON({ body }), JSON.parse(body));
    assert.deepEqual(readProviderJSON(undefined), {});
    const cache = new ProviderRequestCache({ store: storage() });
    const result = await cache.fetch(request, { includeJSON: true, validate: value => value === null, fetcher: async () => ({ status: 200, headers: {}, body: "null" }) });
    assert.equal(readProviderJSON(result), null);
    assert.equal(result.body, "null");
});
