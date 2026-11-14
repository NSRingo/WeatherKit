import assert from "node:assert/strict";
import test from "node:test";
import mergeForecastCopy from "../src/function/mergeForecastCopy.mjs";

const freeze = value => {
    if (value && typeof value === "object") {
        for (const item of Object.values(value)) freeze(item);
        Object.freeze(value);
    }
    return value;
};

test("forecast replacement copies matching rows and preserves both nested input graphs", () => {
    const vector = [{ precipitationType: "RAIN", expected: 1 }];
    const original = freeze([
        { forecastStart: 10, temperature: 20, precipitationAmountByType: vector, daytimeForecast: { temperatureMax: 24, cloudCover: 0.2 } },
        { forecastStart: 20, temperature: 21 },
    ]);
    const provider = freeze([
        { forecastStart: 5, temperature: 8 },
        { forecastStart: 10, temperature: 22, daytimeForecast: { temperatureMax: 26 } },
    ]);
    const merged = mergeForecastCopy(original, provider);
    assert.notStrictEqual(merged, original);
    assert.deepEqual(merged[0].daytimeForecast, { temperatureMax: 26, cloudCover: 0.2 });
    assert.strictEqual(merged[0].precipitationAmountByType, vector);
    assert.strictEqual(merged[1], original[1]);
    assert.equal(original[0].temperature, 20);
    assert.deepEqual(provider[1].daytimeForecast, { temperatureMax: 26 });
});

test("forecasts without overlapping timestamps keep the original array", () => {
    const original = freeze([{ forecastStart: 10 }, { forecastStart: 20 }]);
    assert.strictEqual(mergeForecastCopy(original, [{ forecastStart: 1 }, { forecastStart: 30 }]), original);
    assert.strictEqual(mergeForecastCopy(original, []), original);
});

test("a forecast source that fails after one match cannot partially mutate Apple rows", () => {
    const original = freeze([
        { forecastStart: 10, temperature: 20 },
        { forecastStart: 20, temperature: 21 },
    ]);
    const bad = {
        forecastStart: 20,
        get temperature() {
            throw new Error("fixture conversion failure");
        },
    };
    assert.throws(() => mergeForecastCopy(original, [{ forecastStart: 10, temperature: 99 }, bad]), /conversion failure/);
    assert.deepEqual(
        original.map(row => row.temperature),
        [20, 21],
    );
});
