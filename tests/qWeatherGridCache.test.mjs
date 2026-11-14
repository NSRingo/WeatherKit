// Synthetic location grids and native callbacks; no live provider requests.
import assert from "node:assert/strict";
import test from "node:test";

globalThis.$loon = "simulated Loon";
globalThis.$persistentStore = { read: () => null, write: () => true };
const [{ default: QWeather }, { default: ProviderTransport }, { Console }] = await Promise.all([import("../src/class/QWeather.mjs"), import("../src/class/ProviderTransport.mjs"), import("@nsnanocat/util")]);
Console.logLevel = "OFF";
const NOW = 1_800_000_000_000;
const MONTH = 30 * 86400000;
const grid = () => ({ gridSize: 1, grid: { "121,31": [{ id: "101020100", latitude: 31.2, longitude: 121.5 }] } });
const runtime = () => new ProviderTransport();

test("a recent valid grid is reused without a network request or a write", async t => {
    t.mock.method(Date, "now", () => NOW);
    globalThis.$httpClient = {
        get() {
            assert.fail("Fresh grid must not fetch");
        },
    };
    const data = grid();
    assert.strictEqual(await QWeather.GetLocationsGrid({ locationsGrid: { data, lastUpdated: NOW - 1 } }, () => assert.fail("Fresh grid must not write"), runtime()), data);
});

for (const name of ["ETag", "etag", "eTaG"]) {
    test(`a grid 200 stores the case-insensitive ${name} validator and revalidates with 304`, async t => {
        let now = NOW,
            requests = 0,
            saved;
        t.mock.method(Date, "now", () => now);
        globalThis.$httpClient = {
            get(request, callback) {
                requests++;
                if (requests === 1) callback(null, { status: 200, headers: { [name]: 'W/"grid-v1"' } }, JSON.stringify(grid()));
                else {
                    assert.equal(request.headers["If-None-Match"], 'W/"grid-v1"');
                    callback(null, { status: 304, headers: {} });
                }
            },
        };
        await QWeather.GetLocationsGrid({ retained: true }, value => (saved = value), runtime());
        assert.equal(saved.locationsGrid.etag, 'W/"grid-v1"');
        const data = saved.locationsGrid.data;
        now += MONTH;
        const cache = runtime();
        assert.strictEqual(await QWeather.GetLocationsGrid(saved, value => (saved = value), cache), data);
        assert.equal(saved.locationsGrid.lastUpdated, now);
        assert.equal(saved.retained, true);
        assert.equal(requests, 2);
    });
}

for (const data of [undefined, null, {}, { gridSize: 0, grid: {} }, { gridSize: 1, grid: { bad: null } }]) {
    test(`an orphan validator cannot turn a 304 into usable grid data: ${JSON.stringify(data)}`, async t => {
        t.mock.method(Date, "now", () => NOW);
        let writes = 0;
        globalThis.$httpClient = {
            get(request, callback) {
                assert.equal(request.headers?.["If-None-Match"], undefined);
                callback(null, { status: 304, headers: {} });
            },
        };
        await assert.rejects(QWeather.GetLocationsGrid({ locationsGrid: { data, etag: '"orphan"', lastUpdated: NOW - MONTH } }, () => writes++, runtime()));
        assert.equal(writes, 0);
    });
}

for (const data of [undefined, {}, { gridSize: 1, grid: { "121,31": [null] } }]) {
    test(`a fresh timestamp does not hide a missing or corrupt grid: ${JSON.stringify(data)}`, async t => {
        t.mock.method(Date, "now", () => NOW);
        let calls = 0,
            saved;
        globalThis.$httpClient = {
            get(request, callback) {
                calls++;
                assert.equal(request.headers?.["If-None-Match"], undefined);
                callback(null, { status: 200, headers: {} }, JSON.stringify(grid()));
            },
        };
        assert.deepEqual(await QWeather.GetLocationsGrid({ locationsGrid: { data, lastUpdated: NOW - 1, etag: '"bad"' } }, value => (saved = value), runtime()), grid());
        assert.equal(calls, 1);
        assert.deepEqual(saved.locationsGrid.data, grid());
    });
}

test("clock rollback forces revalidation rather than extending a grid indefinitely", async t => {
    t.mock.method(Date, "now", () => NOW);
    let calls = 0;
    globalThis.$httpClient = {
        get(_request, callback) {
            calls++;
            callback(null, { status: 200, headers: {} }, JSON.stringify(grid()));
        },
    };
    await QWeather.GetLocationsGrid({ locationsGrid: { data: grid(), lastUpdated: NOW + 86400000 } }, () => {}, runtime());
    assert.equal(calls, 1);
});

for (const body of ["", "{}", "{broken", '{"gridSize":1,"grid":[]}', '{"gridSize":1,"grid":{"121,31":[null]}}']) {
    test(`malformed downloaded grids never replace existing cache state: ${body}`, async t => {
        t.mock.method(Date, "now", () => NOW);
        let writes = 0;
        globalThis.$httpClient = {
            get(_request, callback) {
                callback(null, { status: 200, headers: {} }, body);
            },
        };
        await assert.rejects(QWeather.GetLocationsGrid({ locationsGrid: { data: grid(), lastUpdated: NOW - MONTH, etag: '"old"' } }, () => writes++, runtime()));
        assert.equal(writes, 0);
    });
}

test("a failed optional storage write does not discard a validated live grid", async t => {
    t.mock.method(Date, "now", () => NOW);
    globalThis.$httpClient = {
        get(_request, callback) {
            callback(null, { status: 200, headers: {} }, JSON.stringify(grid()));
        },
    };
    assert.deepEqual(
        await QWeather.GetLocationsGrid(
            undefined,
            () => {
                throw new Error("Storage unavailable");
            },
            runtime(),
        ),
        grid(),
    );
});

test("304 has no JSON representation to validate and remains opt-in", async () => {
    const cache = runtime();
    let validations = 0;
    const options = {
        cacheable: false,
        fetcher: async () => ({ status: 304, body: "", headers: {} }),
        validate: () => {
            validations++;
            return false;
        },
    };
    assert.equal((await cache.fetch({ url: "https://fixture.example/grid" }, { ...options, allowNotModified: true })).status, 304);
    assert.equal(validations, 0);
    await assert.rejects(cache.fetch({ url: "https://fixture.example/grid" }, options), error => error.code === "http");
});
