/** WK3 b66 comparison enums verified with paired Apple v3 JSON/FlatBuffer.
 * 2026-11-04: US San Francisco + Chicago BETTER=4; Denver WORSE=2;
 * Toronto BETTER=4 independently. AQ index/category/scale/provider/reportedTime
 * matched in each pair. Earlier paired samples verified UNKNOWN=0, SAME=3.
 * These are NOT WK2 ComparisonTrend values. Private responses are not fixtures.
 */
export const WK3_COMPARISON = { UNKNOWN: 0, WORSE: 2, SAME: 3, BETTER: 4 };

// Menu standards with ascending category numbers. Versions are deliberately
// allowlisted: a future version may change category meanings. Only the observed
// CN/US pair is compatible across versions; other standards require exact scale.
const MENU_STANDARDS = new Set([
    "HJ6332012", "IE.AQIH", "AT.AQI", "BE.BelAQI", "UBA", "FR.ATMO", "KR.CAI",
    "CA.AQHI", "CZ.AQI", "NL.LKI", "EPA_NowCast", "ICARS", "EU.EAQI", "CH.KBI",
    "ES.MITECO", "SG.NEA", "NAQI", "DAQI", "HK.AQHI", "CN.AQHI",
]);
const ALGORITHM_STANDARDS = new Map([
    ["UBA", "UBA"], ["EU_EAQI", "EU.EAQI"],
    ["WAQI_InstantCast_US", "EPA_NowCast"], ["WAQI_InstantCast_CN", "HJ6332012"],
    ["WAQI_InstantCast_CN_25_DRAFT", "HJ6332012"],
    ["CA_AQHI", "CA.AQHI"], ["HK_AQHI", "HK.AQHI"],
    ["CN_DEATH_AQHI", "CN.AQHI"], ["CN_DEATH_HK_AQHI", "CN.AQHI"],
    ["AQHI_Multi_CN", "CA.AQHI"], ["AQHI_Multi_CN_HK", "CA.AQHI"],
]);
function standard(scale) {
    if (typeof scale !== "string") return null;
    // These algorithms intentionally emit versionless names upstream.
    if (["EU.EAQI", "HK.AQHI", "CA.AQHI", "CN.AQHI"].includes(scale)) return scale;
    const match = /^(.*)\.(2414|2604)$/.exec(scale);
    return match && MENU_STANDARDS.has(match[1]) ? match[1] : null;
}
function compatibleScales(current, yesterday) {
    const name = standard(current);
    return name && name === standard(yesterday)
        && (current === yesterday || ["HJ6332012", "EPA_NowCast"].includes(name));
}
function validAQ(data, calculated = false) {
    const name = standard(data?.scale);
    if (!data?.metadata || data.metadata.temporarilyUnavailable || !name) return false;
    const six = ["HJ6332012", "EPA_NowCast"].includes(name);
    // For menu standards without local category tables, trust the source's
    // category number (as upstream does), bounded by WK3's signed int8 field.
    const maxCategory = six || name === "EU.EAQI" ? 6 : name === "UBA" ? 5 : name.endsWith(".AQHI") ? 11 : 127;
    if (!Number.isInteger(data.categoryIndex) || data.categoryIndex < 1 || data.categoryIndex > maxCategory) return false;
    if (data.index === undefined) return true;
    if (!Number.isInteger(data.index) || data.index < 0 || data.index > 32767) return false;
    if (six) {
        // Calculations may explicitly allow an AQI above 500; its category is 6.
        if (!calculated && data.index > 500) return false;
        const category = data.index <= 50 ? 1 : data.index <= 100 ? 2 : data.index <= 150 ? 3 : data.index <= 200 ? 4 : data.index <= 300 ? 5 : 6;
        return category === data.categoryIndex;
    }
    // UBA and AQHI conversions expose categoryIndex as index. EAQI exposes its
    // 0..60 display index, not the pollutant concentration or an AQHI risk sum.
    if (calculated && (name === "UBA" || name.endsWith(".AQHI"))) return data.index === data.categoryIndex;
    if (calculated && name === "EU.EAQI") return Math.min(6, Math.floor(data.index / 10) + 1) === data.categoryIndex;
    return true;
}
function matchingSource(currentProvider, yesterdayProvider, scale) {
    if (typeof currentProvider !== "string" || !currentProvider.trim() || currentProvider !== yesterdayProvider) return false;
    // A bare Calculate does not identify either its source or its algorithm.
    // Response must supply already computed pairs and explicit identities, e.g.
    // Calculate:QWeather:UBA. Never turn a category-only history into pollutants.
    if (currentProvider.startsWith("Calculate")) {
        const parts = currentProvider.split(":");
        return parts.length === 3 && parts[0] === "Calculate" && parts[1].trim().length > 0
            && ALGORITHM_STANDARDS.get(parts[2]) === standard(scale);
    }
    const expected = { ColorfulCloudsUS: "EPA_NowCast", ColorfulCloudsCN: "HJ6332012", QWeather: "HJ6332012" }[currentProvider];
    return !expected || expected === standard(scale);
}

/** Compare categories (not numeric AQIs) only within one explicitly identified
 * provider AND standard. Equal categories mean SAME even if AQI numbers differ.
 * Unknown/mismatched/unavailable data returns the verified WK3 UNKNOWN value.
 * Provider identity must describe the actual index source, not a display label.
 * Calculated pairs must already use the same source AND algorithm on both days.
 */
export function computeWK3Comparison(current, yesterday, { currentProvider, yesterdayProvider } = {}) {
    const calculated = typeof currentProvider === "string" && currentProvider.startsWith("Calculate:");
    if (!validAQ(current, calculated) || !validAQ(yesterday, calculated) || !compatibleScales(current.scale, yesterday.scale)
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
        const calculated = typeof currentProvider === "string" && currentProvider.startsWith("Calculate:");
        if (!validAQ(current, calculated) || !matchingSource(currentProvider, yesterdayProvider, current.scale)) return result;
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
