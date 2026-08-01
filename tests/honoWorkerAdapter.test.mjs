import assert from "node:assert/strict";
import test from "node:test";
import HonoWorkerAdapter from "../src/class/HonoWorkerAdapter.mjs";

test("WeatherKit endpoints route requests to Apple", () => {
    const cases = [
        ["https://weatherkit.pages.dev/api/v1/weatherAlerts?ids=jianye-101190110", "api/v1/weatherAlerts"],
        ["https://weatherkit.pages.dev/weatherkit.apple.com/api/v1/weatherAlerts?ids=jianye-101190110", "weatherkit.apple.com/api/v1/weatherAlerts"],
    ];
    for (const [input, restPath] of cases) {
        const url = HonoWorkerAdapter.routeRewrite(new URL(input), restPath);
        assert.equal(url.toString(), "https://weatherkit.apple.com/api/v1/weatherAlerts?ids=jianye-101190110", input);
    }
});
