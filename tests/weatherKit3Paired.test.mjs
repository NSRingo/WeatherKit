import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import test from "node:test";
import { comparePair } from "../scripts/compare-wk3-pair.mjs";

for (const city of ["hangzhou", "tianjin", "seattle", "seattle-repeat"]) {
    test(`27.3 paired ${city}: current schema agrees with the raw Apple fields apart from recorded gaps`, () => {
        const dir = new URL(`./fixtures/wk3-paired/${city}/`, import.meta.url);
        const result = comparePair(dir.pathname);
        assert.deepEqual(result.failures, []);
        assert.equal(
            result.rows.some(row => row.reason.startsWith("值不一致") || row.reason === "缺字段：当前 codec 未输出此字段"),
            false,
        );
        const metadata = JSON.parse(fs.readFileSync(new URL("manifest.json", dir)));
        assert.ok(Math.abs(metadata.responses[0].started - metadata.responses[1].started) < 0.002);
        for (const [file, expected] of Object.entries(metadata.sha256))
            assert.equal(
                createHash("sha256")
                    .update(fs.readFileSync(new URL(file, dir)))
                    .digest("hex"),
                expected,
            );
        const apple = JSON.parse(fs.readFileSync(new URL("apple.json", dir)));
        for (const product of Object.values(apple))
            if (product.metadata) {
                assert.equal(product.metadata.latitude, 0);
                assert.equal(product.metadata.longitude, 0);
            }
        assert.equal(result.decoded.airQuality.metadata.expireTime, result.raw.aqExpiry);
        assert.equal(result.rows.filter(row => !row.equal && row.reason.includes("deprecated")).length, city.startsWith("seattle") ? 1 : 0);
        if (city === "seattle") {
            assert.equal(result.raw.minuteCount, 81);
            assert.equal(result.decoded.forecastNextHour.forecastEnd, apple.forecastNextHour.forecastEnd);
            assert.equal(result.decoded.weatherAlerts.alerts.length, 1);
            assert.equal(result.decoded.weatherAlerts.alerts[0].severity, "MINOR");
            assert.equal(result.decoded.weatherAlerts.alerts[0].importance, "LOW");
            assert.deepEqual(result.decoded.weatherAlerts.alerts[0].responses, ["MONITOR"]);
        }
        if (city === "seattle-repeat") {
            assert.equal(apple.forecastNextHour.minutes.length, 82);
            assert.equal(result.raw.minuteCount, 84);
            assert.equal(result.raw.reportedTime - apple.forecastNextHour.metadata.reportedTime, 120);
            assert.equal(result.raw.forecastEnd - apple.forecastNextHour.forecastEnd, 120);
        }
    });
}
