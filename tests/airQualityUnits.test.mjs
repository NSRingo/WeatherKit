import assert from "node:assert/strict";
import test from "node:test";

globalThis.$environment = { "surge-version": "test" };
globalThis.$argument = { LogLevel: "OFF" };

const { default: AirQuality } = await import("../src/class/AirQuality.mjs");

const { mgm3, ugm3, ppb } = AirQuality.Config.Units.WeatherKit;
const qWeatherCO = amount => ({
    metadata: { providerName: "QWeather" },
    pollutants: [{ pollutantType: "CO", amount, units: ugm3 }],
});

test("QWeather Apple product CO labeled µg/m3 is converted once from mg/m3", () => {
    const fixed = AirQuality.FixPollutantsUnits(qWeatherCO(0.5), { appleProduct: true });
    assert.equal(fixed.pollutants[0].units, ugm3);
    assert.equal(fixed.pollutants[0].amount, 500);
    const again = AirQuality.FixPollutantsUnits(fixed);
    assert.deepEqual(again, fixed, "normalized data must not be converted again without appleProduct");
});

test("explicitly labeled mg/m3 CO is converted and relabeled without appleProduct", () => {
    const input = { metadata: { providerName: "和风天气" }, pollutants: [{ pollutantType: "CO", amount: 1.2, units: mgm3 }] };
    const fixed = AirQuality.FixPollutantsUnits(input);
    assert.equal(fixed.pollutants[0].units, ugm3);
    assert.equal(fixed.pollutants[0].amount, 1200);
    assert.equal(input.pollutants[0].units, mgm3, "input object must not be mutated");
});

test("already normalized µg/m3 CO is not converted again without appleProduct", () => {
    const input = qWeatherCO(500);
    const fixed = AirQuality.FixPollutantsUnits(input);
    assert.equal(fixed.pollutants[0].amount, 500);
});

test("non-CO pollutants and other unit labels are left untouched", () => {
    const input = {
        metadata: { providerName: "QWeather" },
        pollutants: [
            { pollutantType: "PM2_5", amount: 35, units: ugm3 },
            { pollutantType: "CO", amount: 0.5, units: ppb },
        ],
    };
    const fixed = AirQuality.FixPollutantsUnits(input, { appleProduct: true });
    assert.deepEqual(fixed.pollutants, input.pollutants);
});

test("non-QWeather providers are passed through", () => {
    const input = { metadata: { providerName: "BreezoMeter" }, pollutants: [{ pollutantType: "CO", amount: 0.5, units: ugm3 }] };
    assert.deepEqual(AirQuality.FixPollutantsUnits(input, { appleProduct: true }), input);
});
