import test from 'node:test';
import assert from 'node:assert/strict';
import { Builder, ByteBuffer } from 'flatbuffers';
import WeatherKit2 from '../../src/wk3/class/WeatherKit2.mjs';
import QWeather from '../../src/wk3/class/QWeather.mjs';
import buildSettings from '../../src/wk3/function/buildSettings.mjs';
import database from '../../src/wk3/function/database.mjs';
import { Response as processResponse } from '../../src/wk3/process/Response.mjs';
import { handleResponse } from '../../src/wk3/entry/response.mjs';
import { decodeWK3DataSet, encodeAirQuality } from '../../src/wk3/class/WeatherKit3.mjs';
import ColorfulClouds from '../../src/wk3/class/ColorfulClouds.mjs';

const apple = { metadata: { providerName: 'Apple', sourceType: 3 }, scale: 'HJ6332012.2604', index: 60, categoryIndex: 2, previousDayComparison: 3 };
const provider = { metadata: { providerName: 'Synthetic', sourceType: 'MODELED' }, scale: 'EPA_NowCast.2414', index: 75, categoryIndex: 2, isSignificant: false, primaryPollutant: 'PM2_5', pollutants: [{ pollutantType: 'PM2_5', amount: 12, units: 'MICROGRAMS_PER_CUBIC_METER' }] };
const url = 'https://weatherkit.apple.com/api/v3/weather/en/31/121?country=CN&dataSets=airQuality';
function bytes(source = apple) {
    const b = new Builder();
    const a = encodeAirQuality(b, source);
    b.startObject(1);
    b.addFieldOffset(0, a, 0);
    b.finish(b.endObject());
    return b.asUint8Array();
}
function settings(overrides = {}) {
    return buildSettings(database, { AirQuality: overrides }).Settings;
}
async function patch(Settings, preFetched = {}, source = apple, sources = {}) {
    const input = bytes(source);
    const result = await processResponse({ url, headers: {} }, { status: 200, headers: { 'content-type': 'application/vnd.apple.flatbuffer;messageType=WK3.Weather' }, body: input }, { Settings, Configs: {}, enviroments: { parameters: { country: 'CN', latitude: 31, longitude: 121 }, country: 'CN', ...sources }, preFetched });
    return { input, output: result.body, aq: decodeWK3DataSet(result.body) };
}

test('explicit index targets and yesterday choice survive configuration normalization', () => {
    const s = settings({ Current: { Index: { Provider: 'ColorfulCloudsUS', Replace: '[]' } }, Comparison: { Yesterday: { IndexProvider: 'ColorfulCloudsCN' } } });
    assert.deepEqual(s.AirQuality.Current.Index.Replace, []);
    assert.equal(s.AirQuality.Comparison.Yesterday.IndexProvider, 'ColorfulCloudsCN');
    const c = settings({ Current: { Index: { Provider: 'Calculate' } }, Comparison: { Yesterday: { IndexProvider: 'ColorfulCloudsCN' } } });
    assert.equal(c.AirQuality.Comparison.Yesterday.IndexProvider, 'ColorfulCloudsCN');
});

test('WK3 explicit empty targets leave Apple AQ and comparison byte-exact', async () => {
    const s = settings({ Current: { Index: { Provider: 'ColorfulCloudsUS', Replace: '[]' } } });
    const result = await patch(s, { index: Promise.resolve(provider) });
    assert.deepEqual(result.output, result.input);
    assert.equal(result.aq.previousDayComparison, 3);
});

test('WK3 Calculate plus no pollutant source does not overwrite Apple AQ', async () => {
    const s = settings({ Current: { Index: { Provider: 'Calculate', Replace: ['HJ6332012'] }, Pollutants: { Provider: 'None' } } });
    const result = await patch(s);
    assert.deepEqual(result.output, result.input);
});

test('WK3 replacement keeps Apple comparison when current-change comparison is disabled', async () => {
    const s = settings({ Current: { Index: { Provider: 'ColorfulCloudsUS' } }, Comparison: { ReplaceWhenCurrentChange: false } });
    const result = await patch(s, { index: Promise.resolve(provider) });
    assert.equal(result.aq.index, 75);
    assert.equal(result.aq.previousDayComparison, 3);
});

test('WK3 replacement respects selected yesterday provider and same-source guard', async () => {
    const s = settings({ Current: { Index: { Provider: 'ColorfulCloudsUS' } }, Comparison: { Yesterday: { IndexProvider: 'ColorfulCloudsCN' } } });
    const result = await patch(s, { index: Promise.resolve(provider), yesterdayAirQuality: Promise.resolve({ ...provider, index: 125, categoryIndex: 3 }) });
    assert.equal(result.aq.index, 75);
    assert.equal(result.aq.previousDayComparison, 0);
});

test('entry does not prefetch for empty targets or a disabled index provider', async () => {
    const original = ColorfulClouds.prototype.CurrentAirQuality;
    const oldYesterday = ColorfulClouds.prototype.prefetchYesterdayHourly;
    let calls = 0;
    ColorfulClouds.prototype.CurrentAirQuality = async () => { calls++; return provider; };
    ColorfulClouds.prototype.prefetchYesterdayHourly = async () => { calls++; };
    try {
        for (const [country, overrides] of [
            ['CN', { Current: { Index: { Provider: 'ColorfulCloudsUS', Replace: [] } }, Comparison: { Yesterday: { IndexProvider: 'ColorfulCloudsUS' } } }],
            ['CN', { Current: { Index: { Provider: 'None', Replace: ['HJ6332012'] } }, Comparison: { Yesterday: { IndexProvider: 'ColorfulCloudsUS' } } }],
        ]) {
            const requestUrl = url.replace('country=CN', `country=${country}`);
            const output = await handleResponse({ env: { SETTINGS: JSON.stringify({ AirQuality: overrides }) }, request: { url: requestUrl, method: 'GET', headers: {} }, response: new globalThis.Response(bytes(), { headers: { 'content-type': 'application/vnd.apple.flatbuffer;messageType=WK3.Weather' } }) });
            assert.equal(output.status, 200);
            assert.equal(calls, 0, `unexpected provider call for ${country}/${overrides.Current.Index.Provider}`);
        }
    } finally {
        ColorfulClouds.prototype.CurrentAirQuality = original;
        ColorfulClouds.prototype.prefetchYesterdayHourly = oldYesterday;
    }
});

const wk2Apple = { ...apple, metadata: { providerName: 'Apple', sourceType: 'MODELED' }, previousDayComparison: 'SAME', primaryPollutant: 'PM2_5', pollutants: provider.pollutants };
async function patchWK2(overrides, { source = wk2Apple, candidate = provider, ios27 = false } = {}) {
    const calls = { current: 0, yesterday: 0 };
    const sources = { colorfulClouds: {
        CurrentAirQuality: async () => { calls.current++; return candidate; },
        YesterdayAirQuality: async () => { calls.yesterday++; return { ...provider, index: 125, categoryIndex: 3 }; },
    } };
    const input = WeatherKit2.encode(undefined, { airQuality: source });
    const result = await processResponse({ url: url.replace('/v3/', '/v2/'), headers: ios27 ? { 'user-agent': 'WeatherKit_Weather_iOS_Version 27' } : {} }, { status: 200, headers: { 'content-type': 'application/vnd.apple.flatbuffer;messageType=WK2.Weather' }, body: input }, { Settings: settings({ Current: { Pollutants: { Provider: 'WeatherKit' } }, ...overrides }), Configs: {}, enviroments: { parameters: { country: 'CN', latitude: 31, longitude: 121 }, country: 'CN', ...sources } });
    return { calls, aq: WeatherKit2.decode(new ByteBuffer(result.body), ['airQuality']).airQuality };
}

test('explicit nonempty index targets are not expanded with HJ', () => {
    assert.deepEqual(settings({ Current: { Index: { Provider: 'ColorfulCloudsUS', Replace: ['UBA'] } } }).AirQuality.Current.Index.Replace, ['UBA']);
});

for (const indexProvider of ['WeatherKit', 'UnknownProvider', 'Calculate']) {
    test(`real WK3 ${indexProvider}/algorithm None never uses the index candidate or queries AQ`, async () => {
        let calls = 0;
        const result = await patch(settings({ Current: { Index: { Provider: indexProvider }, Pollutants: { Provider: 'ColorfulClouds' } }, Calculate: { Algorithm: 'None' } }), {}, apple, { colorfulClouds: { CurrentAirQuality: async () => { calls++; return provider; }, YesterdayAirQuality: async () => { calls++; return provider; } } });
        assert.deepEqual(result.output, result.input);
        assert.equal(calls, 0);
    });
    test(`real WK2 ${indexProvider}/algorithm None keeps Apple index and known comparison`, async () => {
        const result = await patchWK2({ Current: { Index: { Provider: indexProvider }, Pollutants: { Provider: 'WeatherKit' } }, Calculate: { Algorithm: 'None' } });
        assert.equal(result.aq.index, wk2Apple.index);
        assert.equal(result.aq.scale, wk2Apple.scale);
        assert.equal(result.aq.previousDayComparison, 'SAME');
        assert.deepEqual(result.calls, { current: 0, yesterday: 0 });
        assert.equal(result.aq.metadata.providerName, 'Apple');
    });
}

test('WK2 unchanged index/scale/category does not query yesterday or claim an index replacement', async () => {
    const result = await patchWK2({ Current: { Index: { Provider: 'ColorfulCloudsCN' }, Pollutants: { Provider: 'WeatherKit' } }, Comparison: { ReplaceWhenCurrentChange: true, Yesterday: { IndexProvider: 'ColorfulCloudsCN' } } }, { candidate: { ...provider, index: 60, categoryIndex: 2, scale: wk2Apple.scale } });
    assert.equal(result.aq.previousDayComparison, 'SAME');
    assert.equal(result.calls.yesterday, 0);
    assert.equal(result.aq.metadata.providerName, 'Apple');
});

for (const candidate of [null, { ...provider, metadata: { providerName: 'Failed', temporarilyUnavailable: true } }, { ...provider, index: NaN }, { ...provider, categoryIndex: 0 }, { ...provider, scale: '' }]) {
    test(`WK2 invalid candidate ${candidate?.index}/${candidate?.categoryIndex}/${candidate?.scale} preserves Apple and skips yesterday`, async () => {
        const result = await patchWK2({ Current: { Index: { Provider: 'ColorfulCloudsUS' }, Pollutants: { Provider: 'WeatherKit' } }, Comparison: { ReplaceWhenCurrentChange: true, Yesterday: { IndexProvider: 'ColorfulCloudsUS' } } }, { candidate });
        assert.equal(result.aq.index, 60);
        assert.equal(result.aq.previousDayComparison, 'SAME');
        assert.equal(result.aq.metadata.providerName, 'Apple');
        assert.equal(result.calls.yesterday, 0);
    });
}

test('WK2 real changed index recomputes known comparison only when flag is true', async () => {
    for (const flag of [false, true]) {
        const result = await patchWK2({ Current: { Index: { Provider: 'ColorfulCloudsUS' }, Pollutants: { Provider: 'WeatherKit' } }, Comparison: { ReplaceWhenCurrentChange: flag, Yesterday: { IndexProvider: 'ColorfulCloudsUS' } } });
        assert.equal(result.aq.index, 75);
        assert.equal(result.aq.previousDayComparison, flag ? 'BETTER' : 'SAME');
        assert.equal(result.calls.yesterday, flag ? 1 : 0);
    }
});

test('WK2 UNKNOWN comparison can be filled from explicit source without replacing index', async () => {
    const result = await patchWK2({ Current: { Index: { Provider: 'WeatherKit' }, Pollutants: { Provider: 'WeatherKit' } }, Comparison: { ReplaceWhenCurrentChange: false, Yesterday: { IndexProvider: 'ColorfulCloudsUS' } } }, { source: { ...wk2Apple, previousDayComparison: 'UNKNOWN' } });
    assert.equal(result.aq.index, 60);
    assert.equal(result.aq.previousDayComparison, 'BETTER');
    assert.deepEqual(result.calls, { current: 1, yesterday: 1 });
});

test('WK2 WeatherKit and unknown yesterday sources never fall back to ColorfulClouds', async () => {
    for (const yesterday of ['WeatherKit', 'MissingProvider']) {
        const result = await patchWK2({ Current: { Index: { Provider: 'WeatherKit' }, Pollutants: { Provider: 'WeatherKit' } }, Comparison: { Yesterday: { IndexProvider: yesterday } } }, { source: { ...wk2Apple, previousDayComparison: 'UNKNOWN' } });
        assert.equal(result.aq.previousDayComparison, 'UNKNOWN');
        assert.deepEqual(result.calls, { current: 0, yesterday: 0 });
    }
});

test('WK3 flag false can fill UNKNOWN on a real replacement but preserves valid comparison', async () => {
    let yesterdayCalls = 0;
    const sources = { colorfulClouds: { YesterdayAirQuality: async () => { yesterdayCalls++; return { ...provider, index: 125, categoryIndex: 3 }; } } };
    const result = await patch(settings({ Current: { Index: { Provider: 'ColorfulCloudsUS' } }, Comparison: { ReplaceWhenCurrentChange: false, Yesterday: { IndexProvider: 'ColorfulCloudsUS' } } }), { index: Promise.resolve(provider) }, { ...apple, previousDayComparison: 0 }, sources);
    assert.equal(result.aq.index, 75);
    assert.equal(result.aq.previousDayComparison, 4);
    assert.equal(yesterdayCalls, 1);
});

test('handleResponse never prefetches yesterday for unchanged, failed or disabled index', async () => {
    const restore = [ColorfulClouds.prototype.CurrentAirQuality, ColorfulClouds.prototype.YesterdayAirQuality, ColorfulClouds.prototype.prefetchYesterdayHourly, QWeather.GetLocationsGrid];
    let current = 0, yesterday = 0, grid = 0;
    let candidate = provider;
    ColorfulClouds.prototype.CurrentAirQuality = async () => { current++; return candidate; };
    ColorfulClouds.prototype.YesterdayAirQuality = async () => { yesterday++; return provider; };
    ColorfulClouds.prototype.prefetchYesterdayHourly = async () => { yesterday++; };
    QWeather.GetLocationsGrid = async () => { grid++; return {}; };
    try {
        for (const indexProvider of ['WeatherKit', 'UnknownProvider', 'Calculate', 'ColorfulCloudsUS']) {
            current = 0; yesterday = 0; grid = 0;
            candidate = { ...provider, metadata: { providerName: 'Unavailable', temporarilyUnavailable: true } };
            const output = await handleResponse({ env: { SETTINGS: JSON.stringify({ AirQuality: { Current: { Index: { Provider: indexProvider }, Pollutants: { Provider: 'ColorfulClouds' } }, Calculate: { Algorithm: 'None' }, Comparison: { Yesterday: { IndexProvider: 'ColorfulCloudsUS' } } } }) }, request: { url, method: 'GET', headers: {} }, response: new globalThis.Response(bytes(), { headers: { 'content-type': 'application/vnd.apple.flatbuffer' } }) });
            assert.equal(decodeWK3DataSet(output.body).index, 60);
            assert.deepEqual(output.body, bytes(), `${indexProvider} must preserve original bytes`);
            assert.equal(current, indexProvider === 'ColorfulCloudsUS' ? 1 : 0, indexProvider);
            assert.equal(yesterday, 0, indexProvider);
            assert.equal(grid, 0, indexProvider);
        }
    } finally {
        [ColorfulClouds.prototype.CurrentAirQuality, ColorfulClouds.prototype.YesterdayAirQuality, ColorfulClouds.prototype.prefetchYesterdayHourly, QWeather.GetLocationsGrid] = restore;
    }
});

test('handleResponse positive control replaces AQ and obtains yesterday only after success', async () => {
    const restore = [ColorfulClouds.prototype.CurrentAirQuality, ColorfulClouds.prototype.YesterdayAirQuality];
    let current = 0, yesterday = 0;
    ColorfulClouds.prototype.CurrentAirQuality = async () => { current++; return provider; };
    ColorfulClouds.prototype.YesterdayAirQuality = async () => { yesterday++; return { ...provider, index: 125, categoryIndex: 3 }; };
    try {
        const output = await handleResponse({ env: { SETTINGS: JSON.stringify({ AirQuality: { Current: { Index: { Provider: 'ColorfulCloudsUS' } }, Comparison: { Yesterday: { IndexProvider: 'ColorfulCloudsUS' } } } }) }, request: { url, method: 'GET', headers: {} }, response: new globalThis.Response(bytes(), { headers: { 'content-type': 'application/vnd.apple.flatbuffer' } }) });
        assert.equal(decodeWK3DataSet(output.body).index, 75);
        assert.equal(decodeWK3DataSet(output.body).previousDayComparison, 4);
        assert.equal(current, 1);
        assert.equal(yesterday, 1);
    } finally {
        [ColorfulClouds.prototype.CurrentAirQuality, ColorfulClouds.prototype.YesterdayAirQuality] = restore;
    }
});

test('WK3 same-scale unchanged AQ has byte-exact output and no yesterday query', async () => {
    let yesterday = 0;
    const result = await patch(settings({ Current: { Index: { Provider: 'ColorfulCloudsCN' } }, Comparison: { Yesterday: { IndexProvider: 'ColorfulCloudsCN' } } }), { index: Promise.resolve({ ...provider, scale: apple.scale, index: apple.index, categoryIndex: apple.categoryIndex }) }, apple, { colorfulClouds: { YesterdayAirQuality: async () => { yesterday++; return provider; } } });
    assert.deepEqual(result.output, result.input);
    assert.equal(yesterday, 0);
});

test('WK3 bare Calculate does not identify a comparable source/algorithm pair', async () => {
    let calls = 0;
    const result = await patch(settings({ Current: { Index: { Provider: 'Calculate' }, Pollutants: { Provider: 'ColorfulClouds' } }, Comparison: { Yesterday: { IndexProvider: 'Calculate' } } }), { index: Promise.resolve(provider), yesterdayAirQuality: Promise.resolve({ ...provider, index: 125, categoryIndex: 3 }) }, apple, { colorfulClouds: { YesterdayAirQuality: async () => { calls++; return provider; } } });
    assert.equal(result.aq.index, 75);
    assert.equal(result.aq.previousDayComparison, 0);
    assert.equal(calls, 0);
});
