import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { localParameters } from '../src/wk3/parameters.mjs';
import { buildWK3Modules, groups, platforms, release, renderWK3Module } from '../scripts/build-wk3-modules.mjs';
import { localScriptGroups } from '../scripts/build-egern-module.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const base = release('3.3.2');
const rows = (platform, text) => {
    if (platform === 'surge') return text.split('\n').filter(line => /^WeatherKit\.api\./.test(line));
    if (platform === 'loon') return text.split('\n').filter(line => /^http-(?:request|response) /.test(line));
    if (platform === 'stash') return text.split('\n').filter(line => /^    - match: /.test(line));
    return text.split('\n').filter(line => /^\^https/.test(line));
};

const examples = [
    ['https://weatherkit.apple.com/api/v1/availability/en_US', 0],
    ['https://weatherkit.apple.com/api/v2/availability/en_US', 0],
    ['https://weatherkit.apple.com/api/v1/airQualityScale/en_US', 1],
    ['https://weatherkit.apple.com/api/v2/airQualityScale/en_US', 1],
    ['https://weatherkit.apple.com/api/v1/weatherAlerts?ids=CN-123456789', 2],
    ['https://weatherkit.apple.com/api/v2/weatherAlerts?language=zh&ids=CN-123456789', 2],
    ['https://weatherkit.apple.com/api/v1/weatherAlerts?ids=31.2,121.5', 3],
    ['https://weatherkit.apple.com/api/v2/weatherAlerts?ids=wk3_123', 3],
    ['https://weatherkit.apple.com/api/v2/weatherAlerts?ids=wk3_foo-123456789', 3],
    ['https://weatherkit.apple.com/api/v2/weather/en_US/31/121', 4],
    ['https://weatherkit.apple.com/api/v3/weather/en_US/31/121', 4],
];

test('five disjoint WK3 routing groups cover the supported API versions', () => {
    assert.equal(groups.length, 5);
    for (const [url, expected] of examples) {
        assert.deepEqual(groups.flatMap(({ pattern }, i) => new RegExp(pattern).test(url) ? [i] : []), [expected], url);
    }
    for (const url of ['https://weatherkit.apple.com/api/v1/weather/en_US/', 'https://weatherkit.apple.com/api/v3/availability/', 'https://example.com/api/v3/weather/', 'https://weatherkit.apple.com/api/v1/weatherAlerts?ids=garbage']) {
        assert.equal(groups.some(({ pattern }) => new RegExp(pattern).test(url)), false, url);
    }
});

test('Egern shares all five route groups without overlapping native alert IDs', () => {
    assert.equal(localScriptGroups.length, groups.length);
    for (const [url, expected] of examples) {
        assert.deepEqual(localScriptGroups.flatMap(({ match }, i) => new RegExp(match).test(url) ? [i] : []), [expected], url);
    }
    for (const [i, group] of groups.entries()) {
        assert.equal(localScriptGroups[i].file, group.stage);
        assert.equal(localScriptGroups[i].body, Boolean(group.body));
        assert.equal(localScriptGroups[i].binary, Boolean(group.binary));
    }
});

for (const platform of Object.keys(platforms)) test(`${platform}: structure, five groups, versioned scripts and MITM`, () => {
    const text = renderWK3Module(platform, '3.3.2');
    const rules = rows(platform, text);
    assert.equal(rules.length, 5);
    assert.match(text, /weatherkit\.apple\.com/);
    assert.match(text, /weather-analytics-events\.apple\.com/);
    assert.match(text, /tthr\.apple\.com/);
    assert.match(text, /tether\.edge\.apple/);
    assert.match(text, /当前\/逐日\/逐小时天气保持苹果原始数据/);
    assert.doesNotMatch(text, /__WK3_|releases\/latest|shadowrocket|NSRingo\/WeatherKit\/releases|gist\.githubusercontent/);
    for (const [index, group] of groups.entries()) {
        assert.ok(rules[index].includes(group.pattern), `${platform} ${group.name} regex`);
        const url = `${base}/wk3-${platform}-${group.stage}.bundle.js`;
        if (platform === 'stash') {
            const provider = text.split(`  WeatherKit.api.${group.name}:\n`)[1]?.split('    interval: 86400')[0];
            assert.ok(provider?.includes(`url: ${url}`), `${platform} ${group.name} provider URL`);
        } else assert.ok(rules[index].includes(url), `${platform} ${group.name} URL`);
    }
    assert.equal(text.split(`wk3-${platform}-request.bundle.js`).length - 1, 3);
    assert.equal(text.split(`wk3-${platform}-response.bundle.js`).length - 1, 2);
    assert.equal((text.match(/v3\.3\.2\//g) ?? []).length, 5);
    if (platform === 'surge') {
        assert.match(text, /^#!arguments = .*AirQuality\.Calculate\.Algorithm:"WAQI_InstantCast_US"/m);
        assert.match(rules[4], /requires-body=1, binary-body-mode=1/);
        assert.match(rules[0], /requires-body=1/);
        assert.ok(rules.slice(1, 4).every(line => !line.includes('binary-body-mode=1')));
        assert.match(rules[0], /argument=DataSets="\{\{\{DataSets\}\}\}"&/);
        assert.match(text, /hostname = %APPEND% weatherkit\.apple\.com/);
    }
    if (platform === 'loon') {
        const args = text.split('[Argument]\n')[1].split('\n[Rule]')[0].trim().split('\n');
        assert.equal(args.length, 23);
        for (const { key } of localParameters) assert.ok(args.some(line => line.startsWith(`${key} = `)), key);
        for (const key of ['Weather.ReplaceDaily', 'Weather.ReplaceHourly']) assert.match(args.find(line => line.startsWith(`${key} =`)), /switch,false/);
        assert.match(args.find(line => line.startsWith('Weather.Provider =')), /select,"ColorfulClouds","WeatherKit","QWeather"/);
        const algorithms = args.find(line => line.startsWith('AirQuality.Calculate.Algorithm ='));
        const officialOrder = ['None', 'UBA', 'EU_EAQI', 'WAQI_InstantCast_US', 'WAQI_InstantCast_CN', 'WAQI_InstantCast_CN_25_DRAFT', 'CA_AQHI', 'HK_AQHI', 'AQHI_Multi_CN', 'AQHI_Multi_CN_HK', 'CN_DEATH_AQHI', 'CN_DEATH_HK_AQHI'];
        assert.match(algorithms, /^AirQuality\.Calculate\.Algorithm = select,"WAQI_InstantCast_US",/);
        assert.deepEqual(algorithms.split(',tag=')[0].match(/"[^"]+"/g).map(value => JSON.parse(value)),
            ['WAQI_InstantCast_US', ...officialOrder.filter(value => value !== 'WAQI_InstantCast_US')]);
        assert.match(rules[4], /requires-body=1, binary-body-mode=1/);
        assert.match(rules[0], /requires-body=1/);
        assert.match(rules[0], /argument=\[\{DataSets\},/);
    }
    if (platform === 'stash') {
        const scripts = text.split('  script:\n')[1].split('script-providers:')[0];
        const providers = text.split('script-providers:\n')[1];
        assert.equal((scripts.match(/^      name:/gm) ?? []).length, 5);
        assert.equal((scripts.match(/^      type: request$/gm) ?? []).length, 3);
        assert.equal((scripts.match(/^      type: response$/gm) ?? []).length, 2);
        assert.equal((scripts.match(/^      require-body: true$/gm) ?? []).length, 2);
        assert.equal((scripts.match(/^      binary-mode: true$/gm) ?? []).length, 1);
        const argumentsJSON = [...scripts.matchAll(/^      argument: '([^']+)'$/gm)].map(([, value]) => JSON.parse(value));
        assert.equal(argumentsJSON.length, 5);
        for (const values of argumentsJSON) {
            assert.equal(Object.keys(values).length, 23);
            assert.equal(values['AirQuality.Calculate.Algorithm'], 'WAQI_InstantCast_US');
            assert.equal(values['AirQuality.Current.Index.Provider'], 'ColorfulCloudsUS');
        }
        for (const group of groups) assert.match(providers, new RegExp(`^  WeatherKit\\.api\\.${group.name.replaceAll('.', '\\.')}:[\\s\\S]*?    interval: 86400`, 'm'));
    }
    if (platform === 'quantumultx') {
        assert.match(text, /#\[filter_local\]/);
        assert.match(text, /#\[rewrite_local\]/);
        assert.match(text, /#\[mitm\]/);
        assert.equal((rules.join('\n').match(/script-response-body/g) ?? []).length, 2);
        assert.equal((rules.join('\n').match(/script-request-header/g) ?? []).length, 1);
        assert.equal((rules.join('\n').match(/script-echo-response/g) ?? []).length, 2);
        assert.doesNotMatch(text, /binary-body-mode=1|binary-mode: true/);
    }
});

test('explicit CLI release and output location; no implicit latest or shadowrocket', () => {
    assert.throws(() => renderWK3Module('shadowrocket', '3.3.2'), /Unsupported platform/);
    assert.throws(() => renderWK3Module('surge', 'latest'), /explicit release version/);
    assert.throws(() => buildWK3Modules({ version: '3.3.2' }), /--outdir/);
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wk3-modules-'));
    try {
        const cli = spawnSync(process.execPath, [path.join(root, 'scripts/build-wk3-modules.mjs'), '--version', '3.3.2', '--outdir', dir], { encoding: 'utf8' });
        assert.equal(cli.status, 0, cli.stderr);
        assert.deepEqual(fs.readdirSync(dir).sort(), Object.values(platforms).map(ext => `iRingo.WeatherKit.WK3.${ext}`).sort());
        for (const [platform, ext] of Object.entries(platforms)) {
            assert.equal(fs.readFileSync(path.join(dir, `iRingo.WeatherKit.WK3.${ext}`), 'utf8'), renderWK3Module(platform, '3.3.2'));
        }
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
