import assert from "node:assert/strict";
import test from "node:test";
import ForecastNextHour from "../src/class/ForecastNextHour.mjs";

const BASE_TIME = 1_700_000_000;
const INTERVAL = 10 * 60;
const RAIN_CONDITIONS = ["DRIZZLE", "RAIN", "HEAVY_RAIN"];

test("Condition preserves every existing one-to-four segment output", () => {
    const cases = [
        ["C", [["CLEAR", 0, 0]]],
        ["R", [["CONSTANT", 0, 0]]],
        [
            "CR",
            [
                ["START", 1, 1, [["FIRST_AT", 1, "startTime"]]],
                ["CONSTANT", 1, 1],
            ],
        ],
        [
            "RC",
            [
                ["STOP", 0, 0, [["FIRST_AT", 0, "endTime"]]],
                ["CLEAR", 1, 1],
            ],
        ],
        [
            "RCR",
            [
                [
                    "STOP_START",
                    0,
                    2,
                    [
                        ["FIRST_AT", 0, "endTime"],
                        ["SECOND_AT", 2, "startTime"],
                    ],
                ],
                ["START", 2, 2, [["FIRST_AT", 2, "startTime"]]],
                ["CONSTANT", 2, 2],
            ],
        ],
        [
            "CRC",
            [
                [
                    "START_STOP",
                    1,
                    1,
                    [
                        ["FIRST_AT", 1, "startTime"],
                        ["SECOND_AT", 1, "endTime"],
                    ],
                ],
                ["STOP", 1, 1, [["FIRST_AT", 1, "endTime"]]],
                ["CLEAR", 2, 2],
            ],
        ],
        [
            "RCRC",
            [
                [
                    "STOP_START",
                    0,
                    2,
                    [
                        ["FIRST_AT", 0, "endTime"],
                        ["SECOND_AT", 2, "startTime"],
                    ],
                ],
                [
                    "START_STOP",
                    2,
                    2,
                    [
                        ["FIRST_AT", 2, "startTime"],
                        ["SECOND_AT", 2, "endTime"],
                    ],
                ],
                ["STOP", 2, 2, [["FIRST_AT", 2, "endTime"]]],
                ["CLEAR", 3, 3],
            ],
        ],
        [
            "CRCR",
            [
                [
                    "START_STOP",
                    1,
                    1,
                    [
                        ["FIRST_AT", 1, "startTime"],
                        ["SECOND_AT", 1, "endTime"],
                    ],
                ],
                [
                    "STOP_START",
                    1,
                    3,
                    [
                        ["FIRST_AT", 1, "endTime"],
                        ["SECOND_AT", 3, "startTime"],
                    ],
                ],
                ["START", 3, 3, [["FIRST_AT", 3, "startTime"]]],
                ["CONSTANT", 3, 3],
            ],
        ],
        [
            "RCRCRC",
            [
                [
                    "STOP_START",
                    0,
                    2,
                    [
                        ["FIRST_AT", 0, "endTime"],
                        ["SECOND_AT", 2, "startTime"],
                    ],
                ],
                [
                    "START_STOP",
                    2,
                    2,
                    [
                        ["FIRST_AT", 2, "startTime"],
                        ["SECOND_AT", 2, "endTime"],
                    ],
                ],
                [
                    "STOP_START",
                    2,
                    4,
                    [
                        ["FIRST_AT", 2, "endTime"],
                        ["SECOND_AT", 4, "startTime"],
                    ],
                ],
                [
                    "START_STOP",
                    4,
                    4,
                    [
                        ["FIRST_AT", 4, "startTime"],
                        ["SECOND_AT", 4, "endTime"],
                    ],
                ],
                ["STOP", 4, 4, [["FIRST_AT", 4, "endTime"]]],
                ["CLEAR", 5, 5],
            ],
        ],
        [
            "CRCRCR",
            [
                [
                    "START_STOP",
                    1,
                    1,
                    [
                        ["FIRST_AT", 1, "startTime"],
                        ["SECOND_AT", 1, "endTime"],
                    ],
                ],
                [
                    "STOP_START",
                    1,
                    3,
                    [
                        ["FIRST_AT", 1, "endTime"],
                        ["SECOND_AT", 3, "startTime"],
                    ],
                ],
                [
                    "START_STOP",
                    3,
                    3,
                    [
                        ["FIRST_AT", 3, "startTime"],
                        ["SECOND_AT", 3, "endTime"],
                    ],
                ],
                [
                    "STOP_START",
                    3,
                    5,
                    [
                        ["FIRST_AT", 3, "endTime"],
                        ["SECOND_AT", 5, "startTime"],
                    ],
                ],
                ["START", 5, 5, [["FIRST_AT", 5, "startTime"]]],
                ["CONSTANT", 5, 5],
            ],
        ],
    ];

    for (const [pattern, specs] of cases) {
        const summaries = makeSummaries(pattern);
        assert.deepEqual(ForecastNextHour.Condition(summaries), materializeConditions(summaries, specs), pattern);
    }
});

test("Condition supports one-to-ten alternating segments without dropping the product", () => {
    for (const first of ["C", "R"]) {
        for (let length = 1; length <= 10; length++) {
            const pattern = Array.from({ length }, (_, index) => (index % 2 === 0 ? first : first === "C" ? "R" : "C")).join("");
            const summaries = makeSummaries(pattern);
            const conditions = ForecastNextHour.Condition(summaries);

            assert.equal(conditions.length, summaries.length, pattern);
            assert.deepEqual(
                conditions.map(condition => condition.forecastToken),
                expectedTokens(pattern),
                pattern,
            );
            conditions.forEach((condition, index) => {
                assert.equal(condition.startTime, summaries[index].startTime, `${pattern}[${index}] startTime`);
                assert.equal(condition.endTime, summaries[index].endTime, `${pattern}[${index}] endTime`);
                assert.equal(condition.parameters.length, parameterCount(condition.forecastToken), `${pattern}[${index}] parameters`);
                if (condition.parameters.length === 2) {
                    assert.ok(condition.parameters[0].date < condition.parameters[1].date, `${pattern}[${index}] parameter order`);
                }
            });
        }
    }
});

test("Minute to Summary to Condition retains six intermittent rain segments", () => {
    const minutes = Array.from({ length: 71 }, (_, index) => {
        const raining = index < 10 || (index >= 20 && index < 30) || (index >= 40 && index < 50);
        return {
            precipitationChance: 100,
            precipitationIntensity: raining ? 1 : 0,
            startTime: BASE_TIME + index * 60,
        };
    });

    const normalized = ForecastNextHour.Minute(minutes, "未来两小时有间歇性小雨");
    const summaries = ForecastNextHour.Summary(normalized);
    const conditions = ForecastNextHour.Condition(summaries);

    assert.deepEqual(
        summaries.map(summary => summary.clear),
        [false, true, false, true, false, true],
    );
    assert.deepEqual(
        conditions.map(condition => condition.forecastToken),
        ["STOP_START", "START_STOP", "STOP_START", "START_STOP", "STOP", "CLEAR"],
    );
    assert.equal(conditions.length, summaries.length);
});

test("Condition preserves empty output for missing or unsupported non-alternating summaries", () => {
    assert.deepEqual(ForecastNextHour.Condition([]), []);
    assert.deepEqual(ForecastNextHour.Condition(makeSummaries("RRC")), []);
});

function makeSummaries(pattern) {
    return [...pattern].map((symbol, index) => ({
        clear: symbol === "C",
        endTime: index === pattern.length - 1 ? 0 : BASE_TIME + (index + 1) * INTERVAL,
        maxCondition: symbol === "C" ? "CLEAR" : RAIN_CONDITIONS[index % RAIN_CONDITIONS.length],
        startTime: BASE_TIME + index * INTERVAL,
    }));
}

function materializeConditions(summaries, specs) {
    return specs.map(([forecastToken, beginIndex, endIndex, parameters = []], index) => ({
        beginCondition: summaries[beginIndex].maxCondition,
        endCondition: summaries[endIndex].maxCondition,
        forecastToken,
        parameters: parameters.map(([type, summaryIndex, field]) => ({ date: summaries[summaryIndex][field], type })),
        startTime: summaries[index].startTime,
        endTime: summaries[index].endTime,
    }));
}

function expectedTokens(pattern) {
    return [...pattern].map((symbol, index) => {
        if (index === pattern.length - 1) return symbol === "C" ? "CLEAR" : "CONSTANT";
        if (symbol === "C") return index + 2 < pattern.length ? "START_STOP" : "START";
        return index + 2 < pattern.length ? "STOP_START" : "STOP";
    });
}

function parameterCount(token) {
    if (token === "START_STOP" || token === "STOP_START") return 2;
    if (token === "START" || token === "STOP") return 1;
    return 0;
}
