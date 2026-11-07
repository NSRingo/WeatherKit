import test from 'node:test';
import assert from 'node:assert/strict';
import ForecastNextHour from '../../src/wk3/class/ForecastNextHour.mjs';
import { providerToWK3NextHour } from '../../src/wk3/class/WK3NextHour.mjs';
const start = 2000000040;
const units = { intensityUnit: 'mm/h', chanceUnit: 'percent' };
function source(intensities) {
    const minutes = ForecastNextHour.Minute(intensities.map((precipitationIntensity, i) => ({ startTime: start + i * 60, precipitationIntensity, precipitationChance: 70 })), '小雨');
    const summary = ForecastNextHour.Summary(minutes);
    const condition = ForecastNextHour.Condition(summary);
    return { metadata: { providerName: 'Synthetic', sourceType: 'MODELED' }, forecastStart: start, forecastEnd: start + minutes.length * 60, minutes, summary, condition };
}
test('actual source ordinary rain, start and stop convert using only verified WK3 enums', () => {
    for (const values of [Array(85).fill(1.5), Array(10).fill(0).concat(Array(75).fill(1.5)), Array(10).fill(1.5).concat(Array(75).fill(0))]) {
        const data = source(values), next = providerToWK3NextHour(data, units);
        assert.equal(next.minutes.length, 85);
        assert.ok(next.minutes.some(m => m.precipitationIntensity > 0));
        assert.equal(next.summary.at(-1).endTime, 0);
    }
});
test('source heavy rain, possible rain and intermittent STOP_START use explicit upstream WK3 definitions', () => {
    const heavy = providerToWK3NextHour(source(Array(85).fill(15)), units);
    assert.equal(heavy.condition[0].beginCondition, 6);
    const possible = providerToWK3NextHour(source(Array(85).fill(0.1)), units);
    assert.equal(possible.condition[0].beginCondition, 9);
    const intermittent = providerToWK3NextHour(source(Array.from({ length: 85 }, (_, i) => i < 10 || i >= 20 ? 1.5 : 0)), units);
    assert.ok(intermittent.condition.some(c => c.forecastToken === 5));
});
test('four-segment condition limit does not mutate the longer source summary timeline', () => {
    const minutes = ForecastNextHour.Minute(Array.from({ length: 85 }, (_, i) => ({ startTime: start + i * 60, precipitationIntensity: i < 60 && Math.floor(i / 10) % 2 === 0 ? 1.5 : 0, precipitationChance: 70 })), '小雨');
    const summary = ForecastNextHour.Summary(minutes), before = structuredClone(summary);
    const condition = ForecastNextHour.Condition(summary);
    assert.equal(summary.length, 6);
    assert.equal(condition.length, 4);
    assert.equal(condition.at(-1).endTime, 0);
    assert.deepEqual(summary, before, 'condition truncation must not introduce endTime=0 inside the summary');
    assert.equal(summary[3].endTime, summary[4].startTime);
});
