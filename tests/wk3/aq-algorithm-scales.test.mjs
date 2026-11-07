import assert from "node:assert/strict";
import test from "node:test";
import AirQuality from "../../src/wk3/class/AirQuality.mjs";
import AirQualityScale from "../../src/wk3/class/AirQualityScale.mjs";
import { Response as processResponse } from "../../src/wk3/process/Response.mjs";

const algorithms = [
    "UBA", "EU_EAQI", "WAQI_InstantCast_US", "WAQI_InstantCast_CN", "WAQI_InstantCast_CN_25_DRAFT",
    "CA_AQHI", "HK_AQHI", "AQHI_Multi_CN", "AQHI_Multi_CN_HK", "CN_DEATH_AQHI", "CN_DEATH_HK_AQHI",
];
function calculate(algorithm, amount = 25) {
    return AirQuality.Pollutants2AQI({
        metadata: { providerName: "Synthetic", temporarilyUnavailable: false },
        pollutants: ["PM2_5", "PM10", "OZONE", "NO2", "SO2"].map(pollutantType => ({
            pollutantType, amount, units: "MICROGRAMS_PER_CUBIC_METER",
        })),
    }, {}, { algorithm });
}
function local(scaleName, language = "en-US") {
    const result = AirQualityScale.buildScale(language, scaleName);
    assert.ok(result, `missing local fallback for ${scaleName}`);
    assert.equal(result.status, 200);
    return JSON.parse(result.body);
}
for (const algorithm of algorithms) {
    test(`${algorithm}: emitted scale has matching identity, category count and display ranges`, () => {
        const definition = AirQuality.Config.Scales[algorithm];
        const current = calculate(algorithm);
        const scale = local(current.scale);
        assert.equal(scale.name, definition.weatherKitScale.name);
        assert.equal(scale.version, Number(definition.weatherKitScale.version ?? 1));
        assert.equal(scale.aqi.categories.length, definition.categories.ranges.length);
        assert.equal(scale.aqi.numerical, algorithm !== "EU_EAQI");
        assert.equal(scale.aqi.ascending, true);
        for (const amount of [0, 1, 25, 100, 300]) {
            const aq = calculate(algorithm, amount);
            assert.equal(aq.metadata.temporarilyUnavailable, false);
            const category = scale.aqi.categories.find(item => item.categoryNumber === aq.categoryIndex);
            assert.ok(category, `${algorithm}: missing category ${aq.categoryIndex}`);
            assert.ok(aq.index >= category.range[0] && aq.index <= category.range[1],
                `${algorithm}: index ${aq.index}, category ${aq.categoryIndex}, range ${category.range}`);
            assert.ok(aq.index >= scale.aqi.range[0] && aq.index <= scale.aqi.range[1],
                `${algorithm}: index ${aq.index} outside scale range ${scale.aqi.range}`);
        }
    });
}

test("AQHI names retain their dotted identity with or without a numeric version suffix", () => {
    for (const name of ["HK.AQHI", "CN.AQHI", "CA.AQHI"]) {
        assert.equal(local(name).name, name);
        assert.equal(local(name).version, 1);
        for (const version of [2414, 2604]) {
            assert.equal(local(`${name}.${version}`).name, name);
            assert.equal(local(`${name}.${version}`).version, version);
        }
    }
});

test("Canada AQHI uses Canadian health risk bands, 1..10 plus 10+, without HK labels", () => {
    for (const language of ["en-US", "zh-Hans-CN", "zh-Hant-HK", "zh-Hant-TW"]) {
        const scale = local("CA.AQHI", language);
        assert.deepEqual(scale.aqi.range, [1, 11]);
        assert.equal(scale.name, "CA.AQHI");
        assert.match(scale.longDisplayName, /Canada|加拿大/);
        assert.doesNotMatch(scale.longDisplayName, /Hong Kong|香港/);
        assert.equal(scale.aqi.categories.length, 11);
        for (const [i, category] of scale.aqi.categories.entries()) {
            assert.equal(category.categoryNumber, i + 1);
            assert.deepEqual(category.range, [i + 1, i + 1]);
            assert.ok(category.categoryName);
            assert.ok(category.recommendation);
            assert.match(category.color, /^#[0-9A-F]{6}$/i);
        }
    }
    const categories = local("CA.AQHI").aqi.categories;
    assert.deepEqual(categories.map(item => item.categoryName), [
        "Low Health Risk", "Low Health Risk", "Low Health Risk",
        "Moderate Health Risk", "Moderate Health Risk", "Moderate Health Risk",
        "High Health Risk", "High Health Risk", "High Health Risk", "High Health Risk", "Very High Health Risk",
    ]);
    assert.notDeepEqual(categories, local("HK.AQHI").aqi.categories);
});

for (const algorithm of algorithms) {
    test(`${algorithm}: Apple 404 falls back through the real response route`, async () => {
        const current = calculate(algorithm);
        const original = { status: 404, headers: { "content-type": "application/json" }, body: '{"error":"not found"}' };
        const result = await processResponse({
            url: `https://weatherkit.apple.com/api/v2/airQualityScale/en-US/${current.scale}`,
            headers: {},
        }, original, { Settings: {} });
        assert.equal(result.status, 200);
        const scale = JSON.parse(result.body);
        assert.equal(scale.name, AirQuality.Config.Scales[algorithm].weatherKitScale.name);
        assert.ok(scale.aqi.categories.some(item => item.categoryNumber === current.categoryIndex));
    });
}

test("Apple 200 remains unchanged and unknown local standards stay unsupported", async () => {
    const response = { status: 200, headers: { "content-type": "application/json" }, body: '{"name":"Apple original"}' };
    const result = await processResponse({
        url: "https://weatherkit.apple.com/api/v2/airQualityScale/en-US/CA.AQHI", headers: {},
    }, response, { Settings: {} });
    assert.equal(result, response);
    assert.equal(result.body, '{"name":"Apple original"}');
    for (const name of ["Other.AQHI", "CABogus.AQHI", "HK.Other", "EU.Other", "CA.AQHI.extra"]) {
        assert.equal(AirQualityScale.buildScale("en-US", name), null, name);
    }
});

test("all algorithm display indices map to exactly their numbered category", () => {
    const expected = {
        "UBA.2414": [[1, 1], [2, 2], [3, 3], [4, 4], [5, 5]],
        "EU.EAQI.2414": [[0, 9], [10, 19], [20, 29], [30, 39], [40, 49], [50, 60]],
        "HJ6332012.2604": [[0, 50], [51, 100], [101, 150], [151, 200], [201, 300], [301, 500]],
        "EPA_NowCast.2414": [[0, 50], [51, 100], [101, 150], [151, 200], [201, 300], [301, 500]],
        "HK.AQHI": Array.from({ length: 11 }, (_, i) => [i + 1, i + 1]),
        "CA.AQHI": Array.from({ length: 11 }, (_, i) => [i + 1, i + 1]),
        "CN.AQHI": Array.from({ length: 11 }, (_, i) => [i + 1, i + 1]),
    };
    for (const [name, ranges] of Object.entries(expected)) {
        const scale = local(name);
        assert.deepEqual(scale.aqi.categories.map(item => item.range), ranges, name);
        for (let value = scale.aqi.range[0]; value <= scale.aqi.range[1]; value++) {
            assert.equal(scale.aqi.categories.filter(item => value >= item.range[0] && value <= item.range[1]).length, 1,
                `${name}: index ${value} must map to one category`);
        }
    }
});

test("existing HK/CN AQHI bands, colors and ranges remain intact", () => {
    const expected = {
        "HK.AQHI": {
            colors: ["#04DE71", "#04DE71", "#58E156", "#FFE620", "#FFBE10", "#FF9500", "#FA114F", "#D11343", "#A91537", "#80172B", "#80172B"],
            names: ["低", "低", "低", "中", "中", "中", "高", "甚高", "甚高", "甚高", "严重"],
        },
        "CN.AQHI": {
            colors: ["#2094FA", "#04DE71", "#CCFF66", "#FFE620", "#FF9500", "#FA114F", "#DC1346", "#BD143D", "#9F1634", "#80172B", "#80172B"],
            names: ["极低", "低", "低", "中", "中", "高", "高", "高", "高", "高", "极高"],
        },
    };
    for (const [name, { colors, names }] of Object.entries(expected)) {
        const scale = local(name, "zh-Hans-CN");
        assert.deepEqual(scale.aqi.range, [1, 11]);
        assert.deepEqual(scale.aqi.categories.map(item => item.color), colors, name);
        assert.deepEqual(scale.aqi.categories.map(item => item.categoryName), names, name);
    }
    assert.deepEqual(local("UBA.2414").aqi.categories.map(item => item.color), ["#00C853", "#64DD17", "#FFEB3B", "#FF9800", "#F44336"]);
    assert.deepEqual(local("EPA_NowCast.2414").aqi.categories.map(item => item.color), ["#00E400", "#FFFF00", "#FF7E00", "#FF0000", "#99004C", "#7E0023"]);
});
