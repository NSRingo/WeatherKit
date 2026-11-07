import assert from 'node:assert/strict';
import test from 'node:test';
import AirQuality from '../../src/wk3/class/AirQuality.mjs';
import buildSettings from '../../src/wk3/function/buildSettings.mjs';
import database from '../../src/wk3/function/database.mjs';
import { setLogEnv } from '../../src/wk3/utils/Console.mjs';

setLogEnv({ LogLevel: 'OFF' });
const ug = 'MICROGRAMS_PER_CUBIC_METER', ppb = 'PARTS_PER_BILLION';
const sample = () => ({ metadata: { providerName: 'Synthetic' }, pollutants: [
    ['PM2_5', 25], ['PM10', 50], ['OZONE', 100], ['NO2', 25], ['SO2', 40], ['CO', 600],
].map(([pollutantType, amount]) => ({ pollutantType, amount, units: ug })) });
// Measured against upstream b4a75db and the actual response.dev.bundle.js.
// CA retains the existing corrected ppb conversion and rounded AQHI formula.
const cases = [
    ['UBA', 'UBA.2414', 3, 3, 'PM10', [2.636428571429, 2.837692307692, 2.376478873239, 1.729473684211, 2.30724137931, -1]],
    ['EU_EAQI', 'EU.EAQI', 22, 3, 'PM2_5', [22.382352941176, 20.486486486486, 19, 19, 19, -1]],
    ['WAQI_InstantCast_US', 'EPA_NowCast.2414', 81, 2, 'PM2_5', [80.623574144487, 46.296296296296, 40.72, 12.264150943396, 21.428571428571, 5.681818181818]],
    ['WAQI_InstantCast_CN', 'HJ6332012.2604', 50, 1, 'NOT_AVAILABLE', [35.714285714286, 50, 31.25, 12.5, 13.333333333333, 6]],
    ['WAQI_InstantCast_CN_25_DRAFT', 'HJ6332012.2604', 50, 1, 'NOT_AVAILABLE', [41.666666666667, 50, 31.25, 12.5, 13.333333333333, 6]],
    ['CA_AQHI', 'CA.AQHI', 5, 5, 'OZONE', [1.224941701489, 0, 2.774951470588, 1.164683764963, 0, -1]],
    ['HK_AQHI', 'HK.AQHI', 5, 5, 'OZONE', [0.546630351405, 1.420875321381, 5.009468889136, 1.121886218007, 0.558849771744, -1]],
    ['AQHI_Multi_CN', 'CA.AQHI', 4, 4, 'OZONE', [3.0162, 0, 27.1273, 9.769525, 8.68896, -1]],
    ['AQHI_Multi_CN_HK', 'CA.AQHI', 4, 4, 'OZONE', [3.0162, 7.80615, 27.1273, 9.769525, 8.68896, -1]],
    ['CN_DEATH_AQHI', 'CN.AQHI', 4, 4, 'OZONE', [0.551515276734, 0, 2.429031789062, 2.275503416445, 2.388068369577, -1]],
    ['CN_DEATH_HK_AQHI', 'CN.AQHI', 5, 5, 'OZONE', [0.546630351405, 1.420875321381, 2.429031789062, 2.275503416445, 2.388068369577, -1]],
];
const close = (actual, expected, message) => assert.ok(Math.abs(actual - expected) < 1e-8, `${message}: ${actual} != ${expected}`);
function settings(algorithm, mode = 'Scale', replace = []) {
    return buildSettings(database, { AirQuality: { Calculate: { Algorithm: algorithm, AllowOverRange: true }, Current: { Index: { Provider: 'Calculate', ForceCNPrimaryPollutants: false }, Pollutants: { Units: { Mode: mode, Replace: replace } } } } }).Settings;
}
for (const [algorithm, scale, index, categoryIndex, primaryPollutant, indexes] of cases) {
    const name = AirQuality.GetNameFromScale(scale);
    test(`${algorithm}: configured calculation, six pollutant values and schema`, () => {
        const input = sample();
        const saved = structuredClone(input);
        Object.freeze(input.metadata);
        input.pollutants.forEach(Object.freeze);
        Object.freeze(input.pollutants);
        Object.freeze(input);
        const result = AirQuality.Pollutants2AQI(input, settings(algorithm));
        assert.equal(result.scale, scale);
        assert.equal(result.index, index);
        assert.equal(result.categoryIndex, categoryIndex);
        assert.equal(result.primaryPollutant, primaryPollutant);
        assert.equal(result.metadata.temporarilyUnavailable, false);
        assert.equal(typeof result.isSignificant, 'boolean');
        assert.equal(result.pollutants.length, 6);
        assert.deepEqual(Object.keys(result).sort(), ['index', 'categoryIndex', 'primaryPollutant', 'scale', 'isSignificant', 'metadata', 'pollutants'].sort());
        for (let i = 0; i < 6; i++) {
            const p = result.pollutants[i], original = saved.pollutants[i];
            assert.equal(p.pollutantType, original.pollutantType);
            const factor = AirQuality.Config.Scales[algorithm].pollutants[p.pollutantType]?.stpConversionFactor;
            const amount = p.units === ug ? p.amount : AirQuality.ConvertUnit(p.amount, p.units, ug, factor);
            close(amount, original.amount, `${algorithm}/${p.pollutantType} concentration`);
            close(p.index, indexes[i], `${algorithm}/${p.pollutantType} index`);
        }
        assert.deepEqual(input, saved);
    });
    test(`${algorithm}: six actual zeros are usable and preserved`, () => {
        const input = sample();
        input.pollutants.forEach(p => { p.amount = 0; });
        const result = AirQuality.Pollutants2AQI(input, settings(algorithm));
        assert.equal(result.metadata.temporarilyUnavailable, false);
        assert.equal(result.categoryIndex, 1);
        assert.equal(result.index, algorithm === 'UBA' || algorithm.includes('AQHI') ? 1 : 0);
        assert.equal(result.pollutants.length, 6);
        assert.ok(result.pollutants.every(p => p.amount === 0));
    });
    test(`${algorithm}: AllowOverRange follows upstream per-algorithm policy`, () => {
        const input = sample();
        input.pollutants.forEach(p => { p.amount = 100000; });
        const capped = AirQuality.Pollutants2AQI(input, settings(algorithm), { allowOverRange: false });
        const extended = AirQuality.Pollutants2AQI(input, settings(algorithm), { allowOverRange: true });
        assert.equal(capped.metadata.temporarilyUnavailable, false);
        assert.equal(extended.metadata.temporarilyUnavailable, false);
        const max = algorithm === 'UBA' ? 5 : algorithm === 'EU_EAQI' ? 60 : algorithm.includes('AQHI') ? 11 : 500;
        assert.equal(capped.index, max);
        assert.equal(extended.index, algorithm === 'WAQI_InstantCast_US' ? 199051 : algorithm.startsWith('WAQI_InstantCast_CN') ? 99900 : max);
        assert.equal(capped.categoryIndex, extended.categoryIndex);
    });
    for (const mode of ['None', 'Scale', 'ugm3', 'EU_ppb', 'US_ppb', 'Force_ugm3', 'Force_EU_ppb', 'Force_US_ppb']) {
        test(`${algorithm}: unit conversion ${mode} preserves six physical pollutants`, () => {
            const input = sample();
            const calculated = AirQuality.Pollutants2AQI(input, settings(algorithm));
            const configured = settings(algorithm, mode, [name]);
            const result = AirQuality.ConvertPollutants(input, undefined, true, calculated, configured);
            assert.equal(result.length, 6);
            for (let i = 0; i < 6; i++) {
                const p = result[i], original = input.pollutants[i];
                assert.equal(p.pollutantType, original.pollutantType);
                // Display conversion follows the public scale, which is shared by Multi variants.
                const displayAlgorithm = name === 'CA.AQHI' ? 'CA_AQHI' : name === 'CN.AQHI' ? 'CN_DEATH_AQHI' : algorithm;
                const scaleAlgorithm = mode === 'Scale' ? algorithm : displayAlgorithm;
                const standard = AirQuality.Config.Scales[scaleAlgorithm].pollutants[p.pollutantType];
                let expectedUnit = mode.includes('ppb') && !['PM2_5', 'PM10'].includes(p.pollutantType) ? ppb : ug;
                if (!mode.startsWith('Force_') && standard) expectedUnit = standard.units;
                if (mode === 'None') expectedUnit = ug;
                assert.equal(p.units, expectedUnit, p.pollutantType);
                if (mode === 'None') assert.deepEqual(p, original);
                if (p.units === ug) close(p.amount, original.amount, p.pollutantType);
                else {
                    const fallbackFactors = mode.includes('EU_ppb') ? AirQuality.Config.STP_ConversionFactors.EU : AirQuality.Config.STP_ConversionFactors.US;
                    const factor = !mode.startsWith('Force_') && standard?.units === ppb ? standard.stpConversionFactor : fallbackFactors[p.pollutantType];
                    close(p.amount * factor, original.amount, p.pollutantType);
                }
            }
        });
    }
}

test('None algorithm is identity; explicit algorithm options override configuration', () => {
    const input = sample();
    assert.equal(AirQuality.Pollutants2AQI(input, settings('None')), input);
    assert.equal(AirQuality.Pollutants2AQI(input, settings('UBA'), { algorithm: 'None' }), input);
    assert.equal(AirQuality.Pollutants2AQI(input, settings('UBA'), { algorithm: 'WAQI_InstantCast_US' }).index, 81);
});

test('None units retain the selected pollutant provider even when calculated index is injected', () => {
    const input = sample();
    const injected = { metadata: { providerName: 'Selected' }, pollutants: input.pollutants.map(p => ({ ...p, amount: p.amount * 2 })) };
    const calculated = AirQuality.Pollutants2AQI(input, settings('WAQI_InstantCast_US'));
    const configured = settings('WAQI_InstantCast_US', 'None', ['EPA_NowCast']);
    assert.equal(AirQuality.ConvertPollutants(input, injected, true, calculated, configured), injected.pollutants);
    injected.metadata.temporarilyUnavailable = true;
    assert.equal(AirQuality.ConvertPollutants(input, injected, true, calculated, configured), input.pollutants);
});

test('explicit conversion targets gate every unit mode', () => {
    const input = sample();
    const calculated = AirQuality.Pollutants2AQI(input, settings('WAQI_InstantCast_US'));
    for (const mode of ['None', 'Scale', 'ugm3', 'EU_ppb', 'US_ppb', 'Force_ugm3', 'Force_EU_ppb', 'Force_US_ppb']) {
        for (const replace of [[], ['UBA']]) assert.equal(AirQuality.ConvertPollutants(input, undefined, true, calculated, settings('WAQI_InstantCast_US', mode, replace)), input.pollutants);
    }
});

test('CN.AQHI public scale supports force units even without an injected calculated index', () => {
    const input = { ...sample(), scale: 'CN.AQHI' };
    const result = AirQuality.ConvertPollutants(input, undefined, false, undefined, settings('CN_DEATH_AQHI', 'Force_US_ppb', ['CN.AQHI']));
    assert.equal(result.length, 6);
    assert.equal(result.find(p => p.pollutantType === 'OZONE').units, ppb);
    assert.equal(input.pollutants.find(p => p.pollutantType === 'OZONE').units, ug);
});

test('WeatherKit EU standard maps to runnable EU_EAQI algorithm, not EU.EAQI scale text', () => {
    for (const [scale, expected] of [['EU.EAQI', 'EU_EAQI'], ['EU.EAQI.2414', 'EU_EAQI'], ['UBA.2414', 'UBA'], ['EPA_NowCast.2414', 'WAQI_InstantCast_US'], ['HJ6332012.2604', 'WAQI_InstantCast_CN']]) {
        const configured = { AirQuality: { Comparison: { Yesterday: { IndexProvider: 'WeatherKit' } } } };
        const algorithm = AirQuality.chooseAlogrithm({ scale }, configured);
        assert.equal(algorithm, expected);
        assert.equal(AirQuality.Pollutants2AQI(sample(), configured, { algorithm }).metadata.temporarilyUnavailable, false);
    }
});

test('AQHI provider descriptions match upstream and preserve multiline attribution', () => {
    const suffixes = {
        CA_AQHI: ' (InstantCast with CA AQHI)', HK_AQHI: ' (InstantCast with HK AQHI)',
        CN_DEATH_AQHI: ' (China CDC Death Risk AQHI)', CN_DEATH_HK_AQHI: ' (China CDC Death Risk + HK AQHI)',
        AQHI_Multi_CN: ' (AQHI-Multi for CN)', AQHI_Multi_CN_HK: ' (AQHI-Multi for CN+HK)',
    };
    for (const [algorithm, suffix] of Object.entries(suffixes)) {
        assert.equal(AirQuality.appendScaleToProviderName({ metadata: { providerName: 'iRingo\nProvider attribution' } }, settings(algorithm)), `iRingo${suffix}\nProvider attribution`);
    }
    assert.equal(AirQuality.Author, 'Virgil Clyne & Wordless Echo');
});

test('CN 2012 and 2025 draft execute different PM2.5 thresholds', () => {
    const input = { metadata: { providerName: 'Synthetic' }, pollutants: [{ pollutantType: 'PM2_5', amount: 40, units: ug }] };
    assert.equal(AirQuality.Pollutants2AQI(input, settings('WAQI_InstantCast_CN')).index, 56);
    assert.equal(AirQuality.Pollutants2AQI(input, settings('WAQI_InstantCast_CN_25_DRAFT')).index, 66);
});

for (const [algorithm] of cases) {
    test(`${algorithm}: empty, invalid and unsupported pollutant inputs fail closed`, () => {
        for (const pollutants of [[], sample().pollutants.map(p => ({ ...p, amount: -1 })), sample().pollutants.map(p => ({ ...p, amount: NaN })), sample().pollutants.map(p => ({ ...p, units: 'UNKNOWN' })), [{ pollutantType: 'NOX', amount: 10, units: ug }]]) {
            const result = AirQuality.Pollutants2AQI({ metadata: { providerName: 'Synthetic' }, pollutants }, settings(algorithm));
            assert.equal(result.metadata.temporarilyUnavailable, true);
        }
    });
}

test('menu contains exactly the eleven supported algorithms plus None, all runnable through settings', async () => {
    const { localParameters } = await import('../../src/wk3/parameters.mjs');
    const parameter = localParameters.find(p => p.key === 'AirQuality.Calculate.Algorithm');
    assert.deepEqual([...parameter.options].sort(), ['None', ...cases.map(([algorithm]) => algorithm)].sort());
    for (const algorithm of parameter.options) {
        const input = sample();
        const result = AirQuality.Pollutants2AQI(input, settings(algorithm));
        if (algorithm === 'None') assert.equal(result, input);
        else {
            assert.ok(Object.hasOwn(AirQuality.Config.Scales, algorithm));
            assert.equal(result.metadata.temporarilyUnavailable, false);
        }
    }
});

test('AllowOverRange false survives buildSettings string normalization and actually caps InstantCast', () => {
    for (const algorithm of ['WAQI_InstantCast_US', 'WAQI_InstantCast_CN', 'WAQI_InstantCast_CN_25_DRAFT']) {
        const input = sample();
        input.pollutants.forEach(p => { p.amount = 100000; });
        const configured = buildSettings(database, { AirQuality: { Calculate: { Algorithm: algorithm, AllowOverRange: 'false' } } }).Settings;
        assert.equal(configured.AirQuality.Calculate.AllowOverRange, false);
        assert.equal(AirQuality.Pollutants2AQI(input, configured).index, 500);
        configured.AirQuality.Calculate.AllowOverRange = true;
        assert.ok(AirQuality.Pollutants2AQI(input, configured).index > 500);
    }
});

for (const [algorithm, scale] of cases) {
    test(`${algorithm}: zero remains zero in all eight unit modes`, () => {
        const input = sample();
        input.pollutants.forEach(p => { p.amount = 0; });
        const calculated = AirQuality.Pollutants2AQI(input, settings(algorithm));
        for (const mode of ['None', 'Scale', 'ugm3', 'EU_ppb', 'US_ppb', 'Force_ugm3', 'Force_EU_ppb', 'Force_US_ppb']) {
            const result = AirQuality.ConvertPollutants(input, undefined, true, calculated, settings(algorithm, mode, [AirQuality.GetNameFromScale(scale)]));
            assert.equal(result.length, 6);
            assert.ok(result.every(p => p.amount === 0), mode);
        }
    });
}
