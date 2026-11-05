import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { localParameters, parameterDescription } from '../src/wk3/parameters.mjs';
import { renderLocalModule } from '../scripts/build-egern-module.mjs';
import { renderWK3Module } from '../scripts/build-wk3-modules.mjs';
import { configuration } from '../src/wk3/entry/index.mjs';
import { runPlatform } from '../src/platform/wk3-adapter.mjs';

const parameters = new Map(localParameters.map(p => [p.key, p]));
const jsonLine = (text, prefix) => JSON.parse(text.split('\n').find(line => line.startsWith(prefix)).slice(prefix.length));
const get = (object, path) => path.split('.').reduce((value, key) => value?.[key], object);
const version = '3.3.4';

test('upstream names and types, preserved local defaults and supported options', () => {
    const upstream = fs.readFileSync(new URL('../arguments-builder.full.config.ts', import.meta.url), 'utf8');
    assert.equal(parameters.size, 23);
    for (const parameter of localParameters) {
        const block = upstream.slice(upstream.indexOf(`key: "${parameter.key}"`));
        if (!upstream.includes(`key: "${parameter.key}"`)) continue;
        assert.equal(parameter.name, block.match(/name: "([^"]+)"/)[1], parameter.key);
        assert.equal(parameter.type, block.match(/type: "([^"]+)"/)[1], parameter.key);
    }
    for (const key of ['AirQuality.Current.Index.Provider', 'AirQuality.Comparison.Yesterday.IndexProvider']) assert.equal(parameters.get(key).value, 'ColorfulCloudsUS');
    assert.equal(parameters.get('AirQuality.Calculate.Algorithm').value, 'WAQI_InstantCast_US');
    assert.equal(parameters.get('LogLevel').value, 'INFO');
    assert.deepEqual(parameters.get('WeatherAlerts.Provider').options, ['WeatherKit', 'QWeatherWeb']);
    assert.ok(parameters.get('AirQuality.Comparison.Yesterday.IndexProvider').options.includes('WeatherKit'));
    assert.equal(parameters.get('AirQuality.Calculate.Algorithm').options.length, 12);
    assert.equal(parameters.get('AirQuality.Calculate.Algorithm').options[0], 'None');
    assert.ok(!parameters.has('Storage') && !parameters.has('API.WAQI.Token'));
});

test('Egern actual env schema and compatibility help show all supported choices', () => {
    const text = renderLocalModule({ version });
    const schema = jsonLine(text, 'env_schema: ');
    const help = jsonLine(text, 'compat_arguments_desc: ');
    assert.equal(Object.keys(schema).length, 23);
    for (const parameter of localParameters) {
        assert.equal(schema[parameter.key].name, parameter.name);
        assert.equal(schema[parameter.key].default_value, parameter.value);
        assert.equal(schema[parameter.key].description, parameterDescription(parameter));
        assert.ok(help.includes(parameter.name));
        if (parameter.options) assert.deepEqual(schema[parameter.key].options, parameter.options);
        if (parameter.type === 'array') assert.equal(schema[parameter.key].options, undefined, 'lists must remain editable, not single selects');
    }
});

for (const platform of ['surge', 'loon', 'stash']) test(`${platform}: actual module displays names, choices and limitations`, () => {
    const text = renderWK3Module(platform, version);
    for (const parameter of localParameters) {
        assert.ok(text.includes(parameter.name), parameter.key);
        for (const option of parameter.options ?? parameter.choices ?? []) assert.ok(text.includes(option), `${parameter.key}: ${option}`);
    }
    for (const expected of ['不会自动添加国内目标', 'false 保留', '12 个选项', 'API 预警尚未移植', 'WK3 当前/逐日/逐小时天气']) assert.ok(text.includes(expected), expected);
    assert.doesNotMatch(text, /确保包含国内原标准|十二种算法|始终仅做同源/);
});

function moduleArguments(platform, changes = {}) {
    const text = platform === 'egern' ? renderLocalModule({ version }) : renderWK3Module(platform, version);
    if (platform === 'egern') return { ...jsonLine(text, 'compat_arguments: '), ...changes };
    if (platform === 'stash') {
        const original = JSON.parse(text.match(/argument: &wk3-arguments '([^']+)'/)[1]);
        return JSON.stringify({ ...original, ...changes });
    }
    if (platform === 'surge') {
        const header = text.match(/^#!arguments = (.*)$/m)[1];
        const original = Object.fromEntries([...header.matchAll(/(?:^|,)([^:,]+):("(?:[^"\\]|\\.)*")/g)].map(([, key, value]) => [key, JSON.parse(value)]));
        const values = { ...original, ...changes };
        return text.match(/, argument=(.*)$/m)[1].replace(/\{\{\{([^}]+)\}\}\}/g, (_, key) => values[key]);
    }
    const values = text.split('[Argument]\n')[1].split('\n[Rule]')[0].trim().split('\n').map(line => {
        const [, key, kind, first] = line.match(/^([^ ]+) = (input|select|switch),("(?:[^"\\]|\\.)*"|[^,]+)/);
        return changes[key] ?? (kind === 'switch' ? first === 'true' : JSON.parse(first));
    });
    return JSON.stringify(values);
}

async function consume(platform, changes) {
    const argument = moduleArguments(platform, changes);
    if (platform === 'egern') return { settings: configuration({ env: argument }).Settings, env: argument };
    let result, configurationError;
    await runPlatform(ctx => {
        try { result = { settings: configuration(ctx).Settings, env: ctx.env }; }
        catch (error) { configurationError = error; }
    }, 'request', { $argument: argument }, platform);
    if (configurationError) throw configurationError;
    assert.ok(result, 'generated module arguments must parse into Settings');
    return result;
}

for (const platform of ['egern', 'surge', 'loon', 'stash']) {
    test(`${platform}: generated module edits retain types and all scalar choices reach Settings`, async () => {
        for (const parameter of localParameters) {
            const edits = parameter.boolean ? ['true', 'false'] : parameter.options;
            if (!edits) continue;
            for (const edit of edits) {
                const { settings } = await consume(platform, { [parameter.key]: edit });
                assert.equal(get(settings, parameter.key), parameter.boolean ? edit === 'true' : edit, `${parameter.key}=${edit}`);
            }
        }
        const { settings, env } = await consume(platform, {
            DataSets: 'airQuality,forecastNextHour', 'AirQuality.Current.Index.Replace': 'EPA_NowCast',
            'AirQuality.Current.Pollutants.Units.Replace': 'EPA_NowCast,UBA',
            'API.ColorfulClouds.Token': '001234', 'API.QWeather.Token': 'synthetic,token',
            'API.QWeather.Host': 'example.invalid', HTTP_TIMEOUT_MS: '1234',
        });
        assert.deepEqual(settings.DataSets, ['airQuality', 'forecastNextHour']);
        assert.deepEqual(settings.AirQuality.Current.Index.Replace, ['EPA_NowCast']);
        assert.deepEqual(settings.AirQuality.Current.Pollutants.Units.Replace, ['EPA_NowCast', 'UBA']);
        assert.equal(settings.API.ColorfulClouds.Token, '001234');
        assert.equal(settings.API.QWeather.Token, 'synthetic,token');
        assert.equal(settings.API.QWeather.Host, 'example.invalid');
        assert.equal(env.HTTP_TIMEOUT_MS, '1234');
    });
    test(`${platform}: generated module [] disables datasets and index replacement`, async () => {
        const { settings } = await consume(platform, { DataSets: '[]', 'AirQuality.Current.Index.Replace': '[]', 'Weather.Replace': '[]' });
        assert.deepEqual(settings.DataSets, []);
        assert.deepEqual(settings.AirQuality.Current.Index.Replace, []);
        assert.deepEqual(settings.Weather.Replace, []);
    });
}
