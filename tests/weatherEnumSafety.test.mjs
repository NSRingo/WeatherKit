import assert from "node:assert/strict";
import test from "node:test";
import { Builder, ByteBuffer } from "flatbuffers";
import ForecastNextHour from "../src/class/ForecastNextHour.mjs";
import Weather from "../src/class/Weather.mjs";
import WeatherKit2 from "../src/class/WeatherKit2.mjs";
import * as WK2 from "../src/proto/apple/wk2.js";

const BASE_TIME = 1_700_000_000;

test("雨夹雪优先匹配完整短语而不是后续的雪", () => {
    assert.equal(ForecastNextHour.PrecipitationType("未来一小时有雨夹雪"), "SLEET");

    const { conditions, summaries } = makeNextHour("未来一小时有雨夹雪");
    assert.equal(summaries[0].condition, "SLEET");
    assert.equal(conditions[0].beginCondition, "SLEET");
    assert.equal(conditions[0].endCondition, "SLEET");
});

test("下一小时条件不会输出 pinned schema 不支持的枚举", () => {
    for (const description of ["未来一小时有小雪", "未来一小时有冰雹"]) {
        const { conditions } = makeNextHour(description);
        for (const condition of conditions) {
            assert.equal(typeof WK2.ConditionType[condition.beginCondition], "number", `${description}: ${condition.beginCondition}`);
            assert.equal(typeof WK2.ConditionType[condition.endCondition], "number", `${description}: ${condition.endCondition}`);
        }
    }
});

test("WeatherKit2 编码时跳过未知 ConditionType，避免被 FlatBuffer 默认成 CLEAR", () => {
    const data = {
        condition: [makeCondition("HAIL", BASE_TIME), makeCondition("RAIN", BASE_TIME + 60)],
        forecastStart: BASE_TIME,
        forecastEnd: BASE_TIME + 120,
        minutes: [],
        summary: [],
    };

    const builder = new Builder();
    const root = WeatherKit2.encode(builder, "all", { forecastNextHour: data });
    builder.finish(root);
    const decoded = WeatherKit2.decode(new ByteBuffer(builder.asUint8Array()));

    assert.deepEqual(
        decoded.forecastNextHour.condition.map(condition => condition.beginCondition),
        ["RAIN"],
    );
});

test("未知 provider 天气代码不生成覆盖字段，已知降雨映射保持不变", () => {
    assert.deepEqual(Weather.ConvertWeatherCodeField("PROVIDER_FUTURE_VALUE"), {});
    assert.deepEqual(Weather.ConvertWeatherCodeField("中雨"), { conditionCode: "RAIN" });

    const apple = [{ forecastStart: BASE_TIME, conditionCode: "CLOUDY" }];
    const provider = [{ forecastStart: BASE_TIME, ...Weather.ConvertWeatherCodeField("PROVIDER_FUTURE_VALUE") }];
    Weather.mergeForecast(apple, provider);
    assert.equal(apple[0].conditionCode, "CLOUDY");
});

function makeNextHour(description) {
    const minutes = Array.from({ length: 3 }, (_, index) => ({
        precipitationChance: 100,
        precipitationIntensity: 1,
        startTime: BASE_TIME + index * 60,
    }));
    const normalized = ForecastNextHour.Minute(minutes, description);
    const summaries = ForecastNextHour.Summary(normalized);
    return { conditions: ForecastNextHour.Condition(summaries), summaries };
}

function makeCondition(condition, startTime) {
    return {
        beginCondition: condition,
        endCondition: condition,
        endTime: 0,
        forecastToken: "CONSTANT",
        parameters: [],
        startTime,
    };
}
