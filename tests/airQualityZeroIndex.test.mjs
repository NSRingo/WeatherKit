import assert from "node:assert/strict";
import test from "node:test";

globalThis.$environment = { "surge-version": "test" };
globalThis.$argument = { LogLevel: "OFF" };

const [{ default: AirQuality }, { Console }] = await Promise.all([import("../src/class/AirQuality.mjs"), import("@nsnanocat/util")]);
Console.logLevel = "OFF";

const algorithm = "WAQI_InstantCast_CN_25_DRAFT";

test("draft CN InstantCast assigns its first category to a computed zero AQI", () => {
    const result = AirQuality.Pollutants2AQI(
        {
            metadata: { providerName: "test" },
            pollutants: [{ pollutantType: "PM2_5", amount: 0, units: "MICROGRAMS_PER_CUBIC_METER" }],
        },
        {},
        { algorithm },
    );

    assert.equal(result.index, 0);
    assert.equal(result.metadata.temporarilyUnavailable, false);
    assert.equal(result.categoryIndex, 1);
});

test("draft CN InstantCast retains negative rejection and existing positive category boundaries", () => {
    const categories = AirQuality.Config.Scales[algorithm].categories;
    for (const [index, expected] of [[-1, -1], [1, 1], [50, 1], [51, 2], [100, 2], [101, 3], [150, 3], [151, 4], [200, 4], [201, 5], [300, 5], [301, 6], [500, 6], [501, 6]]) {
        assert.equal(AirQuality.CategoryIndex(index, categories), expected, String(index));
    }
});
