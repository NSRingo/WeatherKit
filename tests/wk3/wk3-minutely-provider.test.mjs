import test from 'node:test';
import assert from 'node:assert/strict';
import { Builder } from 'flatbuffers';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { buildEgern } from '../../scripts/build-egern.mjs';
import { decodeWK3NextHour } from '../../src/wk3/class/WK3NextHour.mjs';

const responseCode = process.env.WK3_TEST_BUNDLE_DIR
    ? await readFile(path.join(process.env.WK3_TEST_BUNDLE_DIR, 'egern', 'wk3-egern-response.bundle.js'), 'utf8')
    : (await buildEgern({ minify: false })).response.code;
const response = (await import(`data:text/javascript;base64,${Buffer.from(responseCode).toString('base64')}`)).default;
const start = Date.parse('2030-01-01T08:00:00+08:00') / 1000;
function source() {
    const b = new Builder();
    b.startObject(15); b.finish(b.endObject());
    return b.asUint8Array();
}
function qweather(updateTime = '2030-01-01T08:00:00+08:00') {
    return { code: '200', updateTime, fxLink: 'https://synthetic.invalid', summary: '小雨',
        minutely: Array.from({ length: 12 }, (_, i) => ({ fxTime: new Date((start + i * 300) * 1000).toISOString(), precip: '0.1' })) };
}
async function patch(body, { provider = 'QWeather', original = source(), handler = response } = {}) {
    const calls = [];
    const out = await handler({
        env: { SETTINGS: JSON.stringify({ DataSets: ['forecastNextHour'], NextHour: { Provider: provider }, API: { QWeather: { Token: 'synthetic', Host: 'synthetic.invalid' } } }) },
        request: { method: 'GET', url: 'https://weatherkit.apple.com/api/v3/weather/zh-Hans/31/121?country=CN&dataSets=forecastNextHour', headers: new Headers() },
        response: new Response(original, { headers: { 'content-type': 'application/vnd.apple.flatbuffer;messageType=WK3.Weather' } }),
        http: { async get(url) { calls.push(url); return new Response(JSON.stringify(body), { headers: { 'content-type': 'application/json' } }); } },
    });
    return { out: out.body, calls, original };
}
test('QWeather rain reaches WK3 through Egern URL string coordinates', async () => {
    const { out, calls } = await patch(qweather());
    const next = decodeWK3NextHour(out);
    assert.ok(next, 'available minutely rain must not disappear during metadata encoding');
    assert.equal(next.metadata.latitude, 31);
    assert.equal(next.metadata.longitude, 121);
    assert.equal(next.minutes.length, 60);
    assert.ok(Math.abs(next.minutes[0].precipitationIntensity - 1.2) < 1e-6);
    assert.equal(calls.length, 1, 'prefetched minutes must not be fetched twice');
});
test('QWeather minutely uses first fxTime when updateTime precedes the forecast grid', async () => {
    const { out } = await patch(qweather('2030-01-01T07:58:00+08:00'));
    const next = decodeWK3NextHour(out);
    assert.ok(next, 'updateTime is publication time, not the minute grid origin');
    assert.equal(next.forecastStart, start);
    assert.equal(next.forecastEnd, start + 3600);
    assert.equal(next.minutes[0].startTime, start);
});
test('missing QWeather minutes and a discontinuous grid preserve original bytes', async () => {
    const gap = qweather(); gap.minutely[1].fxTime = new Date((start + 360) * 1000).toISOString();
    for (const body of [{ code: '204' }, { ...qweather(), minutely: [] }, gap]) {
        const { out, original } = await patch(body);
        assert.deepEqual(out, original);
    }
});
test('QWeather light snow retains minutes and SNOW summary without guessed text enums', async () => {
    const snow = qweather(); snow.summary = '小雪';
    const { out } = await patch(snow);
    const next = decodeWK3NextHour(out);
    assert.equal(next.minutes.length, 60);
    assert.ok(next.minutes[0].precipitationIntensity > 0);
    assert.deepEqual(next.summary[0].condition, [3]);
    assert.deepEqual(next.condition, []);
});
function colorful(intensity) {
    return { status: 'ok', server_time: start, location: [31, 121], result: { minutely: {
        status: 'ok', description: intensity ? '小雨' : '未来两小时无降水', probability: [0.7, 0.7, 0.7, 0.7], precipitation_2h: Array(60).fill(intensity),
    } } };
}
test('ColorfulClouds actual rain and clear minutely both reach WK3 without deriving rain from current weather', async () => {
    for (const intensity of [0, 1.5]) {
        const { out, calls } = await patch(colorful(intensity), { provider: 'ColorfulClouds' });
        const next = decodeWK3NextHour(out);
        assert.ok(next);
        assert.equal(next.minutes[0].precipitationIntensity, intensity);
        assert.equal(next.condition[0].forecastToken, intensity ? 6 : 1);
        assert.equal(calls.length, 1);
    }
});
test('upstream heavy and possible-rain enums replace an existing nonzero minute arena', async () => {
    const { out: original } = await patch(colorful(1.5), { provider: 'ColorfulClouds' });
    for (const [intensity, condition] of [[0.1, 9], [15, 6]]) {
        const { out } = await patch(colorful(intensity), { provider: 'ColorfulClouds', original });
        const next = decodeWK3NextHour(out);
        assert.notDeepEqual(out, original);
        assert.ok(Math.abs(next.minutes[0].precipitationIntensity - intensity) < 1e-6);
        assert.equal(next.condition[0].beginCondition, condition);
    }
});
// Explicit NSRingo dev b4a75db / actual 2026-11-07 bundle enums, not new device evidence.
function precipitationBody(provider, values, description) {
    if (provider === 'QWeather') {
        const body = qweather(); body.summary = description;
        body.minutely.forEach((m, i) => { m.precip = String(values[i * 5] / 12); });
        return body;
    }
    const body = colorful(0); body.result.minutely.description = description;
    body.result.minutely.precipitation_2h = values;
    return body;
}
test('Egern light-snow fallback preserves original bytes for invalid normalized conditions', async () => {
    // Faults enter AFTER real provider normalization, because HTTP bodies do not
    // expose internal forecast tokens/parameters. The generated handler remains
    // unchanged except for this test-only injection at its codec call boundary.
    const code = process.env.WK3_TEST_BUNDLE_DIR ? (await buildEgern({ minify: false })).response.code : responseCode;
    const marker = 'const nextHour = providerToWK3NextHour(data,';
    assert.equal(code.split(marker).length, 2, 'one real conversion boundary');
    const { out: original } = await patch(colorful(1.5), { provider: 'ColorfulClouds' });
    for (const fault of [
        'data.condition[0].forecastToken = "UNKNOWN_TOKEN";',
        'data.condition[0].startTime++;',
        'data.condition[0].parameters = [{type:"THIRD_AT",date:data.forecastStart}];',
        'data.condition[0].endCondition = "UNKNOWN_WEATHER";'
    ]) {
        const instrumented = code.replace(marker, `${fault}\n${marker}`);
        const handler = (await import(`data:text/javascript;base64,${Buffer.from(instrumented).toString('base64')}`)).default;
        for (const provider of ['QWeather', 'ColorfulClouds']) {
            const body = precipitationBody(provider, Array(60).fill(1.5), '下雪');
            const { out } = await patch(body, { provider, original, handler });
            assert.deepEqual(out, original, `${provider}: ${fault}`);
        }
    }
});
for (const provider of ['QWeather', 'ColorfulClouds']) {
    test(`${provider} SNOW and HEAVY_SNOW retain minute intensities through Egern`, async () => {
        for (const [intensity, numericCondition] of [[5, 11], [15, 10]]) {
            // First minute/block is 1.5; later SNOW/HEAVY_SNOW determines the run condition.
            const values = Array.from({ length: 60 }, (_, i) => i < 5 ? 1.5 : intensity);
            const { out, calls } = await patch(precipitationBody(provider, values, '下雪'), { provider });
            const next = decodeWK3NextHour(out);
            assert.ok(next);
            assert.equal(next.minutes.length, 60);
            assert.ok(Math.abs(next.minutes[0].precipitationIntensity - 1.5) < 1e-6);
            assert.ok(Math.abs(next.minutes[20].precipitationIntensity - intensity) < 1e-6);
            assert.deepEqual(next.summary[0].condition, [3]);
            assert.equal(next.condition[0].beginCondition, numericCondition);
            assert.equal(next.condition[0].forecastToken, 6);
            assert.equal(calls.length, 1);
        }
    });
    test(`${provider} unnamed snow descriptions omit text but retain light and mixed snow minutes`, async () => {
        const { out: original } = await patch(colorful(1.5), { provider: 'ColorfulClouds' });
        for (const values of [Array(60).fill(0.1), Array(60).fill(1.5), Array.from({ length: 60 }, (_, i) => i < 20 ? 0.1 : i < 40 ? 1.5 : 0)]) {
            const { out } = await patch(precipitationBody(provider, values, '下雪'), { provider, original });
            const next = decodeWK3NextHour(out);
            assert.notDeepEqual(out, original);
            assert.equal(next.minutes.length, 60);
            assert.ok(next.minutes.some(m => m.precipitationIntensity > 0));
            assert.ok(next.summary.some(s => s.condition[0] === 3));
            assert.deepEqual(next.condition, []);
            for (const i of [0, 20, 40]) assert.ok(Math.abs(next.minutes[i].precipitationIntensity - values[i]) < 2e-6);
        }
    });
    test(`${provider} rain and snow start, stop and intermittent runs reach Egern`, async () => {
        for (const [description, intensity, kind] of [['下雨', 1.5, 2], ['下雪', 5, 3]]) {
            for (const [pattern, requiredToken] of [['start', 2], ['stop', 3], ['intermittent', 5]]) {
                const values = Array.from({ length: 60 }, (_, i) => {
                    const wet = pattern === 'start' ? i >= 10 : pattern === 'stop' ? i < 20 : i < 10 || i >= 20;
                    return wet ? intensity : 0;
                });
                const { out } = await patch(precipitationBody(provider, values, description), { provider });
                const next = decodeWK3NextHour(out);
                assert.ok(next, `${description} ${pattern}`);
                assert.equal(next.minutes.length, 60);
                assert.ok(next.condition.some(c => c.forecastToken === requiredToken), `${description} ${pattern} token`);
                assert.ok(next.summary.some(s => s.condition[0] === kind));
                assert.equal(next.condition.at(-1).endTime, 0);
            }
        }
    });
}
