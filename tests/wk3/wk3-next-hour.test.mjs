import test from 'node:test';
import assert from 'node:assert/strict';
import { Builder, ByteBuffer } from 'flatbuffers';
import { WK3NextHourTable, WK3_NEXT_HOUR_ENUMS, decodeNextHour, decodeWK3NextHour, encodeNextHour, providerToWK3NextHour, nextHourCodec } from '../../src/wk3/class/WK3NextHour.mjs';

const units = { intensityUnit: 'mm/h', chanceUnit: 'percent' };
// Fixed public London coordinate; synthetic values, not a captured user request.
function provider() {
    const start = 2000000040;
    return { metadata: { providerName: 'Synthetic London', latitude: 51.5072, longitude: -0.1276, sourceType: 'MODELED', reportedTime: start, temporarilyUnavailable: false }, forecastStart: start, forecastEnd: start + 180,
        minutes: [0, 1, 2].map((i) => ({ startTime: start + i * 60, precipitationChance: [0, 50, 80][i], precipitationIntensity: [0, 0.25, 1.5][i], perceivedPrecipitationIntensity: [0, 0.5, 1.2][i] })),
        summary: [{ startTime: start, endTime: start + 60, condition: 'CLEAR', precipitationChance: 0, precipitationIntensity: 0 }, { startTime: start + 60, endTime: 0, condition: 'RAIN', precipitationChance: 80, precipitationIntensity: 1.5 }],
        condition: [{ startTime: start, endTime: start + 60, forecastToken: 'START', beginCondition: 'DRIZZLE', endCondition: 'DRIZZLE', parameters: [{ type: 'FIRST_AT', date: start + 60 }] }, { startTime: start + 60, endTime: 0, forecastToken: 'CONSTANT', beginCondition: 'RAIN', endCondition: 'RAIN', parameters: [] }] };
}
function root(data) {
    const b = new Builder(), child = encodeNextHour(b, data);
    b.startObject(15); b.addFieldOffset(5, child, 0); b.finish(b.endObject());
    return b.asUint8Array();
}
function numericClose(a, b, path = '') {
    if (a && typeof a === 'object') { for (const key of Object.keys(a)) numericClose(a[key], b[key], `${path}.${key}`); }
    else if (typeof a === 'number') assert.ok(Math.abs(a - b) <= Math.max(1e-5, Math.abs(a) * 1e-6), `${path}: ${a} != ${b}`);
    else assert.equal(a, b, path);
}

test('provider conversion is independent from WK2 and maps only original-paired enums', () => {
    const data = provider(), out = providerToWK3NextHour(data, units);
    assert.deepEqual(out.summary.map(s => s.condition), [[1], [2]]);
    assert.deepEqual(out.condition.map(c => c.forecastToken), [2, 6]);
    assert.deepEqual(out.condition.map(c => c.beginCondition), [8, 7]);
    assert.deepEqual(out.condition[0].parameters, [{ type: 1, date: data.forecastStart + 60 }]);
    assert.equal(out.metadata.sourceType, 2);
    assert.equal(out.minutes[2].precipitationIntensity, 1.5);
    assert.equal(data.summary[0].condition, 'CLEAR');
    assert.deepEqual(WK3_NEXT_HOUR_ENUMS.forecastToken, { CLEAR: 1, START: 2, STOP: 3, START_STOP: 4, CONSTANT: 6 });
});
test('root 5 codec round-trips nonzero chance/intensity/perceived and summary enum vectors', () => {
    const data = providerToWK3NextHour(provider(), units), bytes = root(data), copy = bytes.slice();
    const out = decodeWK3NextHour(bytes);
    numericClose(data, out); assert.deepEqual(bytes, copy);
    assert.equal(out.minutes[2].precipitationChance, 80);
    assert.equal(out.summary[1].precipitationIntensity, 1.5);
    assert.deepEqual(out.summary[1].condition, [2]);
    assert.equal(nextHourCodec.tableClass, WK3NextHourTable);
    assert.equal(nextHourCodec.encode, encodeNextHour);
});
test('raw codec round-trips unknown enum integers without guessing meanings', () => {
    const data = providerToWK3NextHour(provider(), units);
    data.summary[1].condition = [231];
    data.condition[0].forecastToken = 212; data.condition[0].beginCondition = 254;
    data.condition[0].parameters[0].type = 223;
    const out = decodeWK3NextHour(root(data));
    assert.deepEqual(out.summary[1].condition, [231]);
    assert.equal(out.condition[0].forecastToken, 212);
    assert.equal(out.condition[0].beginCondition, 254);
    assert.equal(out.condition[0].parameters[0].type, 223);
});
test('singleton summary encoding has zero padding compatible with u8/u16 readers', () => {
    const bytes = root(providerToWK3NextHour(provider(), units)), bb = new ByteBuffer(bytes);
    const r = bb.readUint32(0), t = bb.__indirect(r + bb.__offset(r, 14));
    const vector = bb.__vector(t + bb.__offset(t, 8));
    for (let i = 0; i < 2; i++) {
        const summary = bb.__indirect(vector + 4 * i), f = summary + bb.__offset(summary, 8);
        const p = bb.__vector(f);
        assert.equal(bb.__vector_len(f), 1);
        assert.equal(bb.readUint16(p), i + 1);
        assert.equal(bb.readUint8(p + 1), 0);
    }
});
test('unverified multi-condition summary vectors fail closed in both directions', () => {
    const data = providerToWK3NextHour(provider(), units);
    data.summary[0].condition = [1, 2];
    assert.throws(() => root(data), /Unverified/);
    const p = provider(); p.summary[0].condition = ['CLEAR', 'RAIN'];
    assert.throws(() => providerToWK3NextHour(p, units), /Unverified/);
    const bytes = root(providerToWK3NextHour(provider(), units)), bb = new ByteBuffer(bytes);
    const r = bb.readUint32(0), t = bb.__indirect(r + bb.__offset(r, 14));
    const vector = bb.__vector(t + bb.__offset(t, 8)), summary = bb.__indirect(vector);
    const conditions = bb.__vector(summary + bb.__offset(summary, 8));
    bb.writeUint32(conditions - 4, 2);
    assert.throws(() => decodeWK3NextHour(bytes), /Unverified/);
});
test('child codec plugs into isolated arena reader and missing root 5 returns null', () => {
    const b = new Builder(), offset = nextHourCodec.encode(b, providerToWK3NextHour(provider(), units)); b.finish(offset);
    const bb = new ByteBuffer(b.asUint8Array());
    const out = nextHourCodec.decode(new nextHourCodec.tableClass().__init(bb.readUint32(0), bb));
    assert.equal(out.minutes.length, 3);
    const empty = new Builder(); empty.startObject(1); empty.finish(empty.endObject());
    assert.equal(decodeWK3NextHour(empty.asUint8Array()), null);
});
test('raw codec rejects WK2 summary scalar, invalid floats/probabilities and symbolic enum arithmetic', () => {
    for (const change of [d => d.summary[0].condition = 1, d => d.minutes[0].precipitationIntensity = -1, d => d.minutes[0].precipitationIntensity = NaN, d => d.minutes[0].perceivedPrecipitationIntensity = Infinity, d => d.minutes[0].precipitationChance = 101, d => d.condition[0].forecastToken = 'START', d => d.summary[0].condition = [256]]) {
        const data = providerToWK3NextHour(provider(), units); change(data);
        assert.throws(() => encodeNextHour(new Builder(), data));
    }
});
test('provider conversion fails closed for unknown enums, absent units, missing or inconsistent data', () => {
    assert.throws(() => providerToWK3NextHour(provider()));
    assert.throws(() => providerToWK3NextHour(provider(), { ...units, chanceUnit: 'fraction' }));
    assert.throws(() => providerToWK3NextHour(provider(), { ...units, intensityUnit: 'mm/5min' }));
    for (const change of [d => d.minutes[0].precipitationChance = 0.5, d => d.minutes[0].precipitationIntensity = undefined, d => d.minutes[0].perceivedPrecipitationIntensity = undefined, d => d.minutes[1].startTime++, d => d.forecastEnd++, d => d.condition[0].forecastToken = 'START_STOP_START', d => d.condition[0].beginCondition = 'HEAVY_RAIN', d => d.condition[0].parameters[0].type = 'THIRD_AT', d => d.condition[0].parameters[0].type = 'NO_RAIN', d => d.condition[0].parameters[0].type = 'BOTH', d => d.summary[1].condition = 'SNOW', d => d.summary[0].condition = [], d => d.summary[0].endTime++, d => d.metadata.sourceType = 'UNKNOWN', d => d.metadata.temporarilyUnavailable = true, d => d.minutes = [], d => d.summary = []]) {
        const data = provider(); change(data);
        assert.throws(() => providerToWK3NextHour(data, units));
    }
});
test('unsupported future child layout and truncation reject instead of emitting guessed data', () => {
    const b = new Builder(); b.startObject(7); b.addFieldInt32(6, 42, 0); b.finish(b.endObject());
    const bb = new ByteBuffer(b.asUint8Array());
    assert.throws(() => decodeNextHour(new WK3NextHourTable().__init(bb.readUint32(0), bb)), /Unsupported/);
    assert.throws(() => decodeWK3NextHour(new Uint8Array(3)), /Truncated/);
    assert.throws(() => decodeWK3NextHour(root(providerToWK3NextHour(provider(), units)).subarray(0, 24)));
});
