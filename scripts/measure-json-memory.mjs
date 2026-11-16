// Copyright 2026 hhhoratioxu. SPDX-License-Identifier: Apache-2.0
// Offline measurements of actual Loon bundles; all HTTP callbacks are fixtures.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { Session } from "node:inspector";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import { weatherNow } from "../tests/fixtures/processingMemoryFixture.mjs";

const root = path.resolve(import.meta.dirname, "..");
const hash = value => createHash("sha256").update(value).digest("hex");
const cases = ["normalized-failure", "normalized-failure-large", "normalized-success", "compatible-failure"];

function fixture(scenario) {
    const compatible = scenario === "compatible-failure";
    return JSON.stringify({
        currentWeather: { metadata: { providerName: "Apple", temporarilyUnavailable: false }, temperature: 18, conditionCode: compatible ? "CLOUDY" : ["CLOUDY"] },
        forecastHourly: {
            metadata: { providerName: "Apple", temporarilyUnavailable: false },
            hours: Array.from({ length: 273 }, (_, index) => ({
                forecastStart: 1794787200 + index * 3600,
                temperature: 18 + index % 5,
                conditionCode: compatible ? "RAIN" : ["RAIN"],
                precipitationAmountByType: [{ expected: 0.2, precipitationType: compatible ? "RAIN" : ["RAIN"] }],
                ...(compatible ? { precipitationAmount: 0.2 } : {}),
            })),
        },
        forecastPeriodic: { metadata: {}, forecasts: [{ periods: [{ conditionCode: compatible ? "RAIN" : ["RAIN"], precipitationAmount: 0.2 }] }] },
        futureProduct: { unchanged: true, padding: scenario === "normalized-failure-large" ? "x".repeat(512 * 1024) : "fixture-future-field" },
    });
}

async function sample(file, scenario, mode) {
    assert.ok(cases.includes(scenario));
    assert.ok(mode === "memory" || mode === "cpu");
    assert.equal(typeof global.gc, "function", "Use --expose-gc");
    const raw = fixture(scenario), providerBody = JSON.stringify(weatherNow), callbacks = [];
    let calls = 0, doneCalls = 0, responseSerializations = 0, serializedCharacters = 0, finish;
    const finished = new Promise(resolve => { finish = resolve; });
    const measuredJSON = {
        parse: JSON.parse,
        stringify(value, ...args) {
            const result = JSON.stringify(value, ...args);
            if (value?.currentWeather && value?.forecastHourly && value?.futureProduct) {
                responseSerializations++;
                serializedCharacters += result.length;
            }
            return result;
        },
    };
    const fixedTime = Date.UTC(2026, 10, 16);
    class FixtureDate extends Date {
        constructor(...args) { super(...(args.length ? args : [fixedTime])); }
        static now() { return fixedTime; }
    }
    const script = new vm.Script(await readFile(file, "utf8"), { filename: path.basename(file) });
    const context = vm.createContext({
        URL, URLSearchParams, TextDecoder, Uint8Array, Date: FixtureDate, JSON: measuredJSON,
        $loon: "offline WK3 memory measurement",
        $script: { startTime: new FixtureDate() },
        $argument: { Storage: "Argument", LogLevel: "OFF", DataSets: "currentWeather", "Weather.Provider": "QWeather" },
        $request: { url: "https://weatherkit.apple.com/api/v3/weather/en-US/31.2/121.5?country=CN&dataSets=currentWeather", method: "GET", headers: {} },
        $response: { status: 200, headers: { "Content-Type": "application/json", ETag: "fixture-apple", "Content-Encoding": "gzip" }, body: raw },
        $persistentStore: { read: () => null, write() { assert.fail("No fixture store write expected"); } },
        $httpClient: { get(request, callback) { calls++; callbacks.push({ request, callback }); } },
        console: { log() {}, info() {}, warn() {}, error() {} },
        $done(value) { doneCalls++; finish(value); },
    });
    const inspector = mode === "memory" ? new Session() : undefined;
    inspector?.connect();
    const post = (method, params = {}) => new Promise((resolve, reject) => inspector.post(method, params, (error, value) => error ? reject(error) : resolve(value)));
    global.gc();
    const before = process.memoryUsage();
    if (inspector) await post("HeapProfiler.startSampling", { samplingInterval: 4096, includeObjectsCollectedByMajorGC: true, includeObjectsCollectedByMinorGC: true });
    const started = performance.now(), cpuStart = process.cpuUsage();
    script.runInContext(context, { timeout: 2000 });
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(callbacks.length, 1);
    assert.equal(doneCalls, 0);
    let waitingHeapBytes;
    if (inspector) { global.gc(); waitingHeapBytes = process.memoryUsage().heapUsed - before.heapUsed; }
    for (const { request, callback } of callbacks.splice(0)) {
        assert.ok(request.url.includes("/weather/now"));
        callback(null, { status: scenario === "normalized-success" ? 200 : 503, headers: {} }, scenario === "normalized-success" ? providerBody : "{}");
    }
    const result = await finished;
    const cpu = process.cpuUsage(cpuStart), elapsedMs = performance.now() - started;
    let retainedHeapBytes, sampledAllocationBytes;
    if (inspector) {
        global.gc(); retainedHeapBytes = process.memoryUsage().heapUsed - before.heapUsed;
        const { profile } = await post("HeapProfiler.stopSampling");
        const allocated = node => node.selfSize + node.children.reduce((total, child) => total + allocated(child), 0);
        sampledAllocationBytes = allocated(profile.head);
        inspector.disconnect();
    }
    assert.equal(doneCalls, 1); assert.equal(calls, 1); assert.equal(callbacks.length, 0);
    const output = JSON.parse(result.body);
    assert.equal(output.currentWeather.temperature, scenario === "normalized-success" ? 23 : 18);
    assert.equal(output.forecastHourly.hours.length, 273);
    assert.equal(output.forecastHourly.hours[0].conditionCode, "RAIN");
    assert.equal(output.forecastPeriodic.forecasts[0].periods[0].conditionCode, "RAIN");
    assert.deepEqual(output.futureProduct, JSON.parse(raw).futureProduct);
    if (scenario === "compatible-failure") {
        assert.equal(result.body, raw); assert.equal(result.headers.ETag, "fixture-apple");
    } else {
        assert.equal(result.headers.ETag, undefined); assert.equal(result.headers["Content-Encoding"], undefined); assert.equal(result.headers["Cache-Control"], "no-store");
    }
    return { scenario, mode, inputCharacters: raw.length, outputCharacters: result.body.length, outputSHA256: hash(result.body), requests: calls, doneCalls, responseSerializations, serializedCharacters, waitingHeapBytes, retainedHeapBytes, sampledAllocationBytes, cpuMicros: cpu.user + cpu.system, elapsedMs };
}

if (process.argv[2] === "--sample") {
    console.log(JSON.stringify(await sample(process.argv[3], process.argv[4], process.argv[5])));
} else {
    const [baseline, candidate, output] = process.argv.slice(2);
    assert.ok(baseline && candidate && output, "Usage: node --expose-gc scripts/measure-json-memory.mjs BASELINE_BUNDLE CANDIDATE_BUNDLE OUTPUT_JSON");
    const measurements = [];
    for (const scenario of cases) for (const mode of ["cpu", "memory"]) {
        const samples = { baseline: [], candidate: [] };
        for (let repetition = 0; repetition < 7; repetition++) for (const version of repetition % 2 ? ["candidate", "baseline"] : ["baseline", "candidate"]) {
            const line = execFileSync(process.execPath, ["--expose-gc", import.meta.filename, "--sample", version === "baseline" ? baseline : candidate, scenario, mode], { cwd: root, encoding: "utf8", timeout: 15000 });
            samples[version].push(JSON.parse(line));
        }
        assert.equal(new Set([...samples.baseline, ...samples.candidate].map(value => value.outputSHA256)).size, 1, "Both versions must emit byte-identical fixture responses");
        for (const version of ["baseline", "candidate"]) {
            const row = { scenario, mode, version, samples: samples[version] };
            for (const key of ["inputCharacters", "outputCharacters", "requests", "doneCalls", "responseSerializations", "serializedCharacters", ...(mode === "memory" ? ["waitingHeapBytes", "retainedHeapBytes", "sampledAllocationBytes"] : ["cpuMicros", "elapsedMs"])]) row[key] = samples[version].map(value => value[key]).sort((a, b) => a - b)[3];
            measurements.push(row);
        }
    }
    const report = { date: "2026-11-16", baselineSHA256: hash(await readFile(baseline)), candidateSHA256: hash(await readFile(candidate)), environment: { node: process.version, platform: process.platform, arch: process.arch }, method: "Seven independent subprocesses per version/scenario/mode, alternating order; CPU mode has no sampling or mid-run GC. Memory sampling interval 4096 bytes includes collected objects and harness overhead; retained heap is sampled with full GC at callback wait and completion. Input and VM compilation precede the initial GC.", measurements, realNetworkRequests: 0, nativeClientMemoryMeasured: false, batteryMeasured: false };
    await mkdir(path.dirname(path.resolve(output)), { recursive: true });
    await writeFile(output, JSON.stringify(report, null, 2) + "\n");
    console.log(JSON.stringify(measurements.map(({ samples, ...row }) => row), null, 2));
}
