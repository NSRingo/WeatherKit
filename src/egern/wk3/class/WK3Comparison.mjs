/** WK3 b66 comparison enums verified with paired Apple v3 JSON/FlatBuffer.
 * 2026-11-04: US San Francisco + Chicago BETTER=4; Denver WORSE=2;
 * Toronto BETTER=4 independently. AQ index/category/scale/provider/reportedTime
 * matched in each pair. Earlier paired samples verified UNKNOWN=0, SAME=3.
 * These are NOT WK2 ComparisonTrend values. Private responses are not fixtures.
 */
export const WK3_COMPARISON = { UNKNOWN: 0, WORSE: 2, SAME: 3, BETTER: 4 };

function standard(scale) {
    // Both observed versions have the same six category boundaries. This is
    // category compatibility, NOT equivalence of concentration/AQI algorithms.
    if (/^EPA_NowCast\.(2414|2604)$/.test(scale)) return "US";
    if (/^HJ6332012\.(2414|2604)$/.test(scale)) return "CN";
    return null;
}
function category(index) {
    return index <= 50 ? 1 : index <= 100 ? 2 : index <= 150 ? 3 : index <= 200 ? 4 : index <= 300 ? 5 : 6;
}
function validAQ(data) {
    if (!data?.metadata || data.metadata.temporarilyUnavailable || !standard(data.scale)) return false;
    if (!Number.isInteger(data.categoryIndex) || data.categoryIndex < 1 || data.categoryIndex > 6) return false;
    // A category alone is sufficient; if AQI is supplied it must agree.
    return data.index === undefined || (Number.isInteger(data.index) && data.index >= 0 && data.index <= 500 && category(data.index) === data.categoryIndex);
}
function matchingSource(currentProvider, yesterdayProvider, scale) {
    if (typeof currentProvider !== "string" || !currentProvider.trim() || currentProvider !== yesterdayProvider) return false;
    // A bare Calculate does not identify either its source or its algorithm.
    // For precomputed data use e.g. Calculate:QWeather:WAQI_InstantCast_US.
    if (currentProvider === "Calculate") return false;
    const expected = { ColorfulCloudsUS: "US", ColorfulCloudsCN: "CN", QWeather: "CN" }[currentProvider];
    return !expected || expected === standard(scale);
}

/** Compare categories (not numeric AQIs) only within one explicitly identified
 * provider AND standard. Equal categories mean SAME even if AQI numbers differ.
 * Unknown/mismatched/unavailable data returns the verified WK3 UNKNOWN value.
 * Provider identity must describe the actual index source, not a display label.
 * Calculated pairs must already use the same source AND algorithm on both days.
 */
export function computeWK3Comparison(current, yesterday, { currentProvider, yesterdayProvider } = {}) {
    if (!validAQ(current) || !validAQ(yesterday) || standard(current.scale) !== standard(yesterday.scale)
        || !matchingSource(currentProvider, yesterdayProvider, current.scale)) return WK3_COMPARISON.UNKNOWN;
    if (current.categoryIndex < yesterday.categoryIndex) return WK3_COMPARISON.BETTER;
    if (current.categoryIndex > yesterday.categoryIndex) return WK3_COMPARISON.WORSE;
    return WK3_COMPARISON.SAME;
}

/** Return a new AQ object with a raw WK3 previousDayComparison, leaving index,
 * pollutants, metadata, and input untouched. Never compare today's provider A
 * with yesterday's provider B, nor fetch B's current AQ as a substitute for A.
 *
 * sources is the existing environments object ({ colorfulClouds, qWeather });
 * yesterday optionally supplies already fetched/converted data or its Promise.
 * QWeather locationInfo must be supplied by the caller (reuse locationsGrid).
 * No logging of exceptions: provider errors may contain private URLs/locations.
 * Any failure clears a potentially stale/CN comparison to UNKNOWN, not the AQ.
 */
export async function injectWK3Comparison(current, {
    currentProvider, yesterdayProvider = currentProvider, sources = {}, yesterday, locationInfo,
} = {}) {
    const result = { ...current, previousDayComparison: WK3_COMPARISON.UNKNOWN };
    try {
        // Attach a rejection handler even when mismatched inputs skip fetching.
        const prefetched = yesterday === undefined ? undefined : Promise.resolve(yesterday);
        prefetched?.catch(() => {});
        if (!validAQ(current) || !matchingSource(currentProvider, yesterdayProvider, current.scale)) return result;
        let previous = prefetched;
        if (previous === undefined) {
            switch (yesterdayProvider) {
                case "ColorfulCloudsUS":
                case "ColorfulCloudsCN":
                    previous = sources.colorfulClouds?.YesterdayAirQuality(yesterdayProvider === "ColorfulCloudsUS");
                    break;
                case "QWeather":
                    if (locationInfo) previous = sources.qWeather?.YesterdayAirQuality(locationInfo);
                    break;
                // WeatherKit or calculated data requires explicitly supplied yesterday.
            }
        }
        result.previousDayComparison = computeWK3Comparison(current, await previous, { currentProvider, yesterdayProvider });
    } catch {
        // Do not affect otherwise usable current AQ if provider acquisition fails.
    }
    return result;
}
