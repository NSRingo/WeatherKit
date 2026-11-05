import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import SimplePrecisionMath from "../src/class/SimplePrecisionMath.mjs";

// Execute the actual legacy functions and AQ algorithms without the unavailable
// private @nsnanocat/util package. Only logging and provider I/O are substituted.
const Console = Object.fromEntries(["info", "debug", "error"].map(name => [name, () => {}]));
const aqSource = await readFile(new URL("../src/class/AirQuality.mjs", import.meta.url), "utf8");
const AirQuality = new Function("Console", "SimplePrecisionMath", aqSource.replace(/^import .*;\n/gm, "").replace("export default class AirQuality", "return class AirQuality"))(Console, SimplePrecisionMath);
const logoSource = await readFile(new URL("../src/function/providerNameToLogo.mjs", import.meta.url), "utf8");
const providerNameToLogo = new Function("Console", logoSource.replace(/^import .*;\n/gm, "").replace("export default function", "return function"))(Console);

async function loadInjection(path) {
    const source = await readFile(new URL(path, import.meta.url), "utf8");
    return new Function("AirQuality", "Console", "providerNameToLogo", `${source.slice(source.indexOf("async function InjectAirQuality("))}\nreturn InjectAirQuality;`)(AirQuality, Console, providerNameToLogo);
}
const [Response, ResponseDev] = await Promise.all([loadInjection("../src/process/Response.mjs"), loadInjection("../src/process/Response.dev.mjs")]);

const pollutants = [{ pollutantType: "PM2_5", amount: 25, units: "MICROGRAMS_PER_CUBIC_METER" }];
const apple = {
    metadata: { providerName: "Apple", temporarilyUnavailable: false },
    index: 42,
    categoryIndex: 1,
    scale: "HJ6332012.2414",
    isSignificant: true,
    primaryPollutant: "PM2_5",
    pollutants,
    previousDayComparison: "BETTER",
};
const supplement = {
    ...apple,
    metadata: { providerName: "QWeather", temporarilyUnavailable: false },
    index: 180,
    categoryIndex: 4,
    scale: "HJ6332012",
};

async function run(t, handler, { source = apple, replace = ["HJ6332012"], provider = "Calculate", algorithm = "EU_EAQI", replaceComparison = false, yesterday = "ColorfulCloudsUS", candidate = supplement } = {}) {
    const calls = { current: 0, yesterday: 0 };
    const enviroments = {
        qWeather: { CurrentAirQuality: async () => { calls.current++; return structuredClone(candidate); } },
        colorfulClouds: {
            YesterdayAirQuality: async () => { calls.yesterday++; return structuredClone({ ...supplement, categoryIndex: 2 }); },
            CurrentAirQuality: async () => { calls.current++; return structuredClone({ ...supplement, categoryIndex: 1 }); },
        },
    };
    const settings = {
        DataSets: ["airQuality"], LogLevel: "OFF", Storage: "Argument",
        AirQuality: {
            Current: { Pollutants: { Provider: "QWeather", Units: { Replace: [], Mode: "Scale" } }, Index: { Replace: replace, Provider: provider } },
            Calculate: { Algorithm: algorithm },
            Comparison: { ReplaceWhenCurrentChange: replaceComparison, Yesterday: { IndexProvider: yesterday, PollutantsProvider: "QWeather" } },
        },
    };
    return { output: await handler(structuredClone(source), settings, {}, enviroments), calls };
}

function assertAppleIndex(output) {
    for (const key of ["index", "categoryIndex", "scale", "isSignificant", "primaryPollutant"]) assert.equal(output[key], apple[key], key);
    assert.doesNotMatch(output.metadata.providerName, /指数：/);
}

for (const [name, handler] of [["release", Response], ["dev", ResponseDev]]) {
    test(`${name}: empty targets preserve Apple index while supplementing pollutants`, async t => {
        const { output, calls } = await run(t, handler, { source: { ...apple, pollutants: [] }, replace: [] });
        assertAppleIndex(output);
        assert.deepEqual(output.pollutants, pollutants);
        assert.match(output.metadata.providerName, /污染物：QWeather/);
        assert.equal(output.previousDayComparison, "BETTER");
        assert.deepEqual(calls, { current: 1, yesterday: 0 });
    });

    test(`${name}: nonmatching target cannot replace a valid Apple index after supplementation`, async t => {
        const { output } = await run(t, handler, { source: { ...apple, pollutants: [] }, replace: ["UBA"] });
        assertAppleIndex(output);
        assert.deepEqual(output.pollutants, pollutants);
    });

    test(`${name}: Calculate None preserves Apple fields and independent supplementation`, async t => {
        const { output, calls } = await run(t, handler, { source: { ...apple, pollutants: [] }, algorithm: "None", replaceComparison: true });
        assertAppleIndex(output);
        assert.deepEqual(output.pollutants, pollutants);
        assert.equal(output.previousDayComparison, "BETTER");
        assert.deepEqual(calls, { current: 1, yesterday: 0 });
    });

    test(`${name}: nonempty targets allow recovery of a missing Apple index`, async t => {
        const { output, calls } = await run(t, handler, { source: { ...apple, metadata: { ...apple.metadata, temporarilyUnavailable: true }, index: 0, categoryIndex: 0, scale: "", pollutants: [] }, replace: ["UBA"] });
        assert.equal(output.scale, "EU.EAQI");
        assert.ok(Number.isFinite(output.index));
        assert.equal(output.metadata.temporarilyUnavailable, false);
        assert.deepEqual(calls, { current: 1, yesterday: 0 });
    });

    test(`${name}: empty targets also disable recovery of a missing Apple index`, async t => {
        const { output, calls } = await run(t, handler, { source: { ...apple, index: 0, categoryIndex: 0, scale: "", pollutants: [] }, replace: [] });
        assert.equal(output.index, 0);
        assert.equal(output.scale, "");
        assert.deepEqual(output.pollutants, pollutants);
        assert.deepEqual(calls, { current: 1, yesterday: 0 });
    });

    test(`${name}: category-only change with switch true recalculates comparison`, async t => {
        const { output, calls } = await run(t, handler, { provider: "QWeather", candidate: { ...supplement, index: apple.index, scale: apple.scale }, replaceComparison: true });
        assert.equal(output.index, apple.index);
        assert.equal(output.categoryIndex, supplement.categoryIndex);
        assert.equal(calls.yesterday, 1);
    });

    test(`${name}: None disables calculation without suppressing external index providers`, async t => {
        const { output, calls } = await run(t, handler, { provider: "QWeather", algorithm: "None" });
        assert.equal(output.index, supplement.index);
        assert.deepEqual(calls, { current: 1, yesterday: 0 });
    });

    test(`${name}: replacement keeps Apple comparison when switch is false`, async t => {
        const { output, calls } = await run(t, handler);
        assert.equal(output.scale, "EU.EAQI");
        assert.equal(output.previousDayComparison, "BETTER");
        assert.equal(calls.yesterday, 0);
    });

    test(`${name}: identical injected index does not force comparison`, async t => {
        const { output, calls } = await run(t, handler, { provider: "QWeather", candidate: { ...supplement, index: apple.index, categoryIndex: apple.categoryIndex, scale: apple.scale }, replaceComparison: true });
        assert.equal(output.previousDayComparison, "BETTER");
        assert.deepEqual(calls, { current: 1, yesterday: 0 });
    });

    test(`${name}: failed injected index does not force comparison or claim its source`, async t => {
        const { output, calls } = await run(t, handler, { provider: "QWeather", candidate: { ...supplement, metadata: { providerName: "QWeather", temporarilyUnavailable: true } }, replaceComparison: true });
        assertAppleIndex(output);
        assert.equal(output.previousDayComparison, "BETTER");
        assert.equal(calls.yesterday, 0);
    });

    test(`${name}: invalid numeric injected index retains Apple data`, async t => {
        const { output, calls } = await run(t, handler, { provider: "QWeather", candidate: { ...supplement, index: NaN }, replaceComparison: true });
        assertAppleIndex(output);
        assert.equal(output.previousDayComparison, "BETTER");
        assert.equal(calls.yesterday, 0);
    });

    test(`${name}: a changed index with switch true recalculates comparison`, async t => {
        const { output, calls } = await run(t, handler, { provider: "QWeather", replaceComparison: true });
        assert.equal(output.index, supplement.index);
        assert.equal(calls.yesterday, 1);
        assert.match(output.metadata.providerName, /对比昨日：/);
    });

    test(`${name}: unknown comparison is supplemented even without index replacement`, async t => {
        const { output, calls } = await run(t, handler, { source: { ...apple, previousDayComparison: "UNKNOWN" }, replace: [] });
        assert.equal(calls.yesterday, 1);
        assert.equal(output.previousDayComparison, "BETTER");
        assert.match(output.metadata.providerName, /对比昨日：/);
    });

    for (const yesterday of ["WeatherKit", "UnknownProvider"]) {
        test(`${name}: unknown comparison with ${yesterday} does not use ColorfulCloudsUS`, async t => {
            const { output, calls } = await run(t, handler, { source: { ...apple, previousDayComparison: "UNKNOWN" }, replace: [], yesterday });
            assertAppleIndex(output);
            assert.equal(output.previousDayComparison, "UNKNOWN");
            assert.equal(output.metadata.providerName, "Apple");
            assert.deepEqual(calls, { current: 0, yesterday: 0 });
        });
    }

    test(`${name}: unavailable supplement cannot erase existing index or add source attribution`, async t => {
        const { output, calls } = await run(t, handler, { source: { ...apple, pollutants: [] }, replace: [], candidate: { metadata: { providerName: "QWeather", temporarilyUnavailable: true }, pollutants: [] } });
        assertAppleIndex(output);
        assert.deepEqual(output.pollutants, []);
        assert.equal(output.metadata.providerName, "Apple");
        assert.deepEqual(calls, { current: 1, yesterday: 0 });
    });
}
