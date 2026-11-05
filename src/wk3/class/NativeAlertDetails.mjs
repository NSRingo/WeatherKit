import WeatherAlerts from "./WeatherAlerts.mjs";

const PREFIX = "wk3_";
const MAX_IDS = 16384, MAX_JSON_BYTES = 12000, MAX_ALERTS = 32;
const REGION = /^[a-zA-Z0-9][a-zA-Z0-9_-]*-\d{9}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** Recognizes the reserved namespace, including malformed payloads, so callers
 * can reject them locally instead of forwarding them to Apple. */
export function isNativeAlertDetailsID(ids) {
    return typeof ids === "string" && ids.startsWith(PREFIX);
}

function languageTag(value) {
    if (typeof value !== "string" || value.length > 64 || !/^[a-zA-Z]{2,8}(?:-[a-zA-Z0-9]{1,8})*$/.test(value)) throw new TypeError("Invalid alert language");
    return value;
}
function exactKeys(value, keys) {
    if (!value || typeof value !== "object" || Array.isArray(value) || Object.keys(value).length !== keys.length || keys.some(key => !Object.hasOwn(value, key))) throw new TypeError("Invalid native alert payload shape");
}
function validatePayload(payload) {
    exactKeys(payload, ["region", "alerts"]);
    if (typeof payload.region !== "string" || payload.region.length > 128 || !REGION.test(payload.region)) throw new TypeError("Invalid QWeather region");
    if (!Array.isArray(payload.alerts) || !payload.alerts.length || payload.alerts.length > MAX_ALERTS) throw new RangeError("Invalid native alert count");
    const ids = new Set();
    for (const alert of payload.alerts) {
        exactKeys(alert, ["id", "description", "issuedTime", "severity"]);
        if (typeof alert.id !== "string" || !UUID.test(alert.id) || ids.has(alert.id)) throw new TypeError("Invalid or duplicate Apple UUID");
        ids.add(alert.id);
        if (typeof alert.description !== "string" || !alert.description.trim() || alert.description.length > 512) throw new TypeError("Invalid alert description");
        if (!Number.isInteger(alert.issuedTime) || alert.issuedTime <= 0 || alert.issuedTime > 0xffffffff) throw new TypeError("Invalid alert issuedTime");
        if (!Number.isInteger(alert.severity) || alert.severity < 0 || alert.severity > 255) throw new TypeError("Invalid WK3 severity");
    }
    return payload;
}
function uuidFromBytes(bytes) {
    if (!(Array.isArray(bytes) || bytes instanceof Uint8Array) || bytes.length !== 16 || !Array.from(bytes).every(byte => Number.isInteger(byte) && byte >= 0 && byte <= 255)) throw new TypeError("Expected 16 Apple UUID bytes");
    const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
function base64url(bytes) {
    return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Build once from the original/enriched WK3 summaries; assign this SAME URL to
 * the collection and every summary. The payload contains no location/auth data
 * beyond the public region identifier and the minimum event matching fields. */
export function buildNativeAlertDetailsURL({ identifier, language = "zh-CN", alerts, timezone }) {
    languageTag(language);
    if (timezone !== undefined && (typeof timezone !== "string" || !/^[A-Za-z0-9_+/-]{1,128}$/.test(timezone))) throw new TypeError("Invalid alert timezone");
    if (!Array.isArray(alerts) || !alerts.length || alerts.length > MAX_ALERTS) throw new RangeError("Invalid native alert count");
    const payload = validatePayload({ region: identifier, alerts: alerts.map(alert => ({
        id: uuidFromBytes(alert?.id?.bytes),
        description: alert.description,
        issuedTime: alert.issuedTime,
        severity: alert.severity,
    })) });
    const bytes = new TextEncoder().encode(JSON.stringify(payload));
    if (bytes.length > MAX_JSON_BYTES) throw new RangeError("Native alert payload too long");
    const ids = PREFIX + base64url(bytes);
    if (ids.length > MAX_IDS) throw new RangeError("Native alert ids too long");
    const url = new URL("https://weatherkit.apple.com/alertDetails/index.html");
    url.searchParams.set("lang", language);
    url.searchParams.set("ids", ids);
    url.searchParams.set("party", "qweather");
    if (timezone !== undefined) url.searchParams.set("timezone", timezone);
    return url.toString();
}
function parseIDs(ids) {
    if (!isNativeAlertDetailsID(ids) || ids.length > MAX_IDS) throw new TypeError("Invalid native alert ids");
    const encoded = ids.slice(PREFIX.length);
    if (!/^[A-Za-z0-9_-]+$/.test(encoded) || encoded.length % 4 === 1) throw new TypeError("Invalid native alert base64url");
    const binary = atob(encoded.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - encoded.length % 4) % 4));
    const bytes = Uint8Array.from(binary, character => character.charCodeAt(0));
    if (bytes.length > MAX_JSON_BYTES || base64url(bytes) !== encoded) throw new TypeError("Invalid native alert encoding");
    return validatePayload(JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)));
}
function titleParts(value) {
    if (typeof value !== "string") return null;
    const text = value.normalize("NFKC").trim().toLowerCase().replace(/\s+/g, "").replace(/[。.]+$/, "");
    const match = text.match(/^(.+?)(?:(蓝|黄|橙|红)色)?预警(?:信号)?$/);
    return match ? { text: match[1], color: match[2] } : { text, color: undefined };
}
function sameTitle(original, source) {
    const a = titleParts(original), b = titleParts(source);
    return a && b && a.text === b.text && (!a.color || !b.color || a.color === b.color);
}

/** Returns only the requested original events, in their original order. Source
 * order never establishes identity. Missing/ambiguous/unverified matches throw
 * atomically; the route should return an empty/error result, never fake details.
 * fetchImpl receives only WeatherAlerts' public HTML request (no Apple headers).
 * This is a bounded, public locator, not a signed token or authorization grant. */
export async function resolveNativeAlertDetails(ids, language = "zh-CN", fetchImpl = globalThis.fetch) {
    const payload = parseIDs(ids);
    languageTag(language);
    // Paired Apple JSON / WK3: Shanghai MINOR=4; Benxi/Shenyang MODERATE=3.
    // Other integers still have no verified mapping and are not guessed.
    const severities = { 3: "moderate", 4: "minor" };
    if (payload.alerts.some(alert => !Object.hasOwn(severities, alert.severity))) throw new TypeError("Unverified WK3 severity");
    const sources = await WeatherAlerts.DetailsForQWeather(payload.region, language, fetchImpl);
    if (!Array.isArray(sources)) throw new TypeError("Invalid QWeather details");
    const matches = payload.alerts.map(alert => {
        const candidates = sources.filter(source => source && source.severity === severities[alert.severity]
            && sameTitle(alert.description, source.description)
            && typeof source.issuedTime === "string" && Date.parse(source.issuedTime) === alert.issuedTime * 1000);
        if (candidates.length !== 1) throw new Error("Missing or ambiguous native alert match");
        return candidates[0];
    });
    if (new Set(matches).size !== matches.length) throw new Error("Ambiguous shared native alert match");
    return matches.map((source, index) => ({ ...source, id: payload.alerts[index].id, detailsUrl: `#${payload.alerts[index].id}` }));
}
