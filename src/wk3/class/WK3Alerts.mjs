import { Builder, ByteBuffer } from "flatbuffers";
import WeatherAlerts from "./WeatherAlerts.mjs";
import { buildNativeAlertDetailsURL, sameAlertTitle, isGenericAlertTitle } from "./NativeAlertDetails.mjs";

/** Verified against paired Apple v3 JSON / WK3 b66 responses (2026-11-04):
 * Shanghai wind alert and Miami Coastal Flood Statement. NOT a WK2 codec.
 * Root slot 9; collection: metadata=0, detailsUrl=1, alerts=2.
 * Area-name slot 2 and slots >=22 of summaries remain UNVERIFIED.
 * Severity EXTREME/SEVERE follows upstream @nsringo/weatherkit 2.0.5,
 * dev b4a75db / published dev bundle 2026-11-07 19:05:32.
 * Other enums remain observed-only. Unknown raw integers round-trip.
 */
export const WK3_ALERTS_ROOT_SLOT = 9;
export const WK3_ALERT_ENUMS = {
    severity: { UNKNOWN: 0, EXTREME: 1, SEVERE: 2, MODERATE: 3, MINOR: 4 },
    significance: { UNKNOWN: 0, STATEMENT: 10 },
    urgency: { UNKNOWN: 0, EXPECTED: 2 },
    certainty: { UNKNOWN: 0, LIKELY: 2 },
    importance: { LOW: 2 },
    responses: { MONITOR: 7 },
};
const TEXT = { attributionUrl: 3, countryCode: 4, description: 5, token: 6, detailsUrl: 12, phenomenon: 13, source: 16, eventSource: 17 };
const TIMES = { effectiveTime: 7, expireTime: 8, issuedTime: 9, eventOnsetTime: 10, eventEndTime: 11 };
const ENUMS = { severity: 14, significance: 15, urgency: 18, certainty: 19, importance: 20 };
const SOURCE = Symbol("WK3Alerts.originalArena");
const uint = (v, max = 0xffffffff) => {
    if (!Number.isInteger(v) || v < 0 || v > max) throw new RangeError("Expected unsigned wire integer");
    return v;
};
function input(bytes) {
    if (bytes instanceof ByteBuffer) return bytes.bytes().subarray(bytes.position());
    if (!(bytes instanceof Uint8Array)) throw new TypeError("Expected Uint8Array or ByteBuffer");
    return bytes;
}
function reader(bytes) {
    const b = input(bytes), v = new DataView(b.buffer, b.byteOffset, b.byteLength);
    const check = (p, n) => { if (!Number.isInteger(p) || p < 0 || p + n > b.length) throw new RangeError("Invalid WK3 offset"); };
    const u16 = p => { check(p, 2); return v.getUint16(p, true); };
    const u32 = p => { check(p, 4); return v.getUint32(p, true); };
    const indirect = p => { const q = p + u32(p); check(q, 4); return q; };
    const field = (t, i) => {
        check(t, 4); const vt = t - v.getInt32(t, true), n = u16(vt), size = u16(vt + 2);
        check(vt, n); check(t, size);
        if (n < 4 || n % 2 || size < 4) throw new RangeError("Invalid WK3 table");
        const o = 4 + i * 2 < n ? u16(vt + 4 + i * 2) : 0;
        if (o && (o < 4 || o >= size)) throw new RangeError("Invalid WK3 field");
        return o ? t + o : 0;
    };
    const string = p => {
        if (!p) return null; const q = indirect(p), n = u32(q); check(q + 4, n + 1);
        if (b[q + 4 + n]) throw new RangeError("Invalid WK3 string");
        return new TextDecoder("utf-8", { fatal: true }).decode(b.subarray(q + 4, q + 4 + n));
    };
    const vector = (p, width) => { if (!p) return { start: 0, length: 0 }; const q = indirect(p), length = u32(q); check(q + 4, length * width); return { start: q + 4, length }; };
    return { b, v, check, u16, u32, indirect, field, string, vector };
}
function collection(r) { const root = r.indirect(0), f = r.field(root, WK3_ALERTS_ROOT_SLOT); return f ? r.indirect(f) : 0; }
function summary(r, t) {
    const data = {};
    const id = r.field(t, 0);
    if (id) {
        const f = r.field(r.indirect(id), 0), vector = r.vector(f, 1);
        if (vector.length !== 16) throw new RangeError("Expected 16 UUID bytes");
        data.id = { bytes: Array.from(r.b.subarray(vector.start, vector.start + 16)) };
    } else data.id = null;
    const area = r.field(t, 1); data.areaId = r.string(area);
    for (const [k, i] of Object.entries(TEXT)) data[k] = r.string(r.field(t, i));
    for (const [k, i] of Object.entries(TIMES)) { const p = r.field(t, i); data[k] = p ? r.u32(p) : 0; }
    for (const [k, i] of Object.entries(ENUMS)) { const p = r.field(t, i); data[k] = p ? r.b[p] : 0; }
    const responses = r.vector(r.field(t, 21), 1);
    data.responses = Array.from(r.b.subarray(responses.start, responses.start + responses.length));
    return data;
}
/** Read raw numeric enums, never WK2 symbolic mappings. Opaque source is kept
 * for codec encoding. The input must not be mutated after decoding. */
export function decodeWK3Alerts(bytes) {
    const r = reader(bytes), c = collection(r); if (!c) return null;
    const vector = r.vector(r.field(c, 2), 4);
    const data = { detailsUrl: r.string(r.field(c, 1)), alerts: Array.from({ length: vector.length }, (_, i) => summary(r, r.indirect(vector.start + i * 4))) };
    Object.defineProperty(data, SOURCE, { value: r.b, enumerable: true });
    return data;
}
function hasUnverifiedFields(r, t) {
    const vt = t - r.v.getInt32(t, true), count = (r.u16(vt) - 4) / 2;
    const idField = r.field(t, 0);
    if (idField) {
        const id = r.indirect(idField), idVtable = id - r.v.getInt32(id, true), idCount = (r.u16(idVtable) - 4) / 2;
        if (Array.from({ length: Math.max(0, idCount - 1) }, (_, i) => r.field(id, i + 1)).some(Boolean)) return true;
    }
    return Boolean(r.field(t, 2)) || Array.from({ length: Math.max(0, count - 22) }, (_, i) => r.field(t, i + 22)).some(Boolean);
}
function encodeSummary(data) {
    const b = new Builder(), strings = {};
    for (const [k, i] of Object.entries({ areaId: 1, ...TEXT })) {
        if (data[k] != null) { if (typeof data[k] !== "string") throw new TypeError(`Expected string ${k}`); strings[i] = b.createString(data[k]); }
    }
    let id = 0;
    if (data.id) {
        if (!Array.isArray(data.id.bytes) || data.id.bytes.length !== 16) throw new TypeError("Expected UUID byte array");
        b.startVector(1, 16, 1); for (const byte of [...data.id.bytes].reverse()) b.addInt8(uint(byte, 255));
        const vector = b.endVector(); b.startObject(1); b.addFieldOffset(0, vector, 0); id = b.endObject();
    }
    if (!Array.isArray(data.responses)) throw new TypeError("Expected raw responses array");
    b.startVector(1, data.responses.length, 1);
    for (const response of [...data.responses].reverse()) b.addInt8(uint(response, 255));
    const responses = b.endVector();
    b.startObject(22); b.addFieldOffset(0, id, 0);
    for (const [i, offset] of Object.entries(strings)) b.addFieldOffset(Number(i), offset, 0);
    for (const [k, i] of Object.entries(TIMES)) b.addFieldInt32(i, uint(data[k]), 0);
    for (const [k, i] of Object.entries(ENUMS)) b.addFieldInt8(i, uint(data[k], 255), 0);
    b.addFieldOffset(21, responses, 0); b.finish(b.endObject()); return b.asUint8Array();
}
/** Replace existing summaries only. Never invent IDs, remove/add/reorder alerts,
 * rebuild the weather root, touch AQ, or discard unverified summary fields.
 * Unchanged data returns the identical input view; failures throw atomically.
 * Use in a try/catch and retain rawBody on failure. */
export function patchWK3Alerts(bytes, alerts, options = {}) {
    const r = reader(bytes), c = collection(r);
    if (!c) { if (alerts?.length) throw new RangeError("Apple response has no alerts collection"); return r.b; }
    const vector = r.vector(r.field(c, 2), 4);
    if (!Array.isArray(alerts) || alerts.length !== vector.length) throw new RangeError("Cannot add/remove WK3 alerts");
    const replacements = [];
    for (let i = 0; i < alerts.length; i++) {
        const p = vector.start + i * 4, t = r.indirect(p), before = summary(r, t), after = alerts[i];
        if (!after || JSON.stringify(after.id) !== JSON.stringify(before.id)) throw new TypeError("Cannot change WK3 alert identity/order");
        const known = new Set(["id", "areaId", ...Object.keys(TEXT), ...Object.keys(TIMES), ...Object.keys(ENUMS), "responses"]);
        if (Object.keys(after).some(k => !known.has(k))) throw new TypeError("Unverified WK3 alert field");
        if (JSON.stringify(after) === JSON.stringify(before)) continue;
        if (hasUnverifiedFields(r, t)) throw new RangeError("Unverified WK3 summary fields; preserve original");
        replacements.push({ p, bytes: encodeSummary(after) });
    }
    let out = r.b;
    for (const replacement of replacements) {
        const start = Math.ceil(out.length / 8) * 8, next = new Uint8Array(start + replacement.bytes.length);
        next.set(out); next.set(replacement.bytes, start);
        new DataView(next.buffer).setUint32(replacement.p, start + new DataView(replacement.bytes.buffer, replacement.bytes.byteOffset).getUint32(0, true) - replacement.p, true);
        out = next;
    }
    if (options.detailsUrl !== undefined) {
        const p = r.field(c, 1);
        if (!p || typeof options.detailsUrl !== "string") throw new TypeError("Expected existing collection URL field");
        if (options.detailsUrl !== r.string(p)) {
            const value = new TextEncoder().encode(options.detailsUrl), start = Math.ceil(out.length / 4) * 4;
            const next = new Uint8Array(start + value.length + 5); next.set(out); next.set(value, start + 4);
            const v = new DataView(next.buffer); v.setUint32(start, value.length, true); v.setUint32(p, start - p, true); out = next;
        }
    }
    return out;
}
/** Conservative provider enrichment: keeps Apple identity, URLs and all
 * non-empty fields; unsupported symbolic enums are not guessed or written.
 * Caller supplies unambiguously matched source records in Apple array order. */
export function enrichWK3Alerts(original, matchedSources) {
    if (!Array.isArray(matchedSources) || original.alerts.length !== matchedSources.length) throw new RangeError("Expected one matched source per Apple alert");
    return original.alerts.map((alert, i) => {
        const source = matchedSources[i]; if (!source) return alert;
        const out = { ...alert };
        if (source.description) out.description = source.description;
        for (const key of ["source", "areaId", "phenomenon", "token"]) if (!out[key] && source[key]) out[key] = source[key];
        for (const key of Object.keys(TIMES)) {
            if (out[key] || source[key] == null) continue;
            const time = typeof source[key] === "number" ? source[key] : Date.parse(source[key]) / 1000;
            if (Number.isInteger(time) && time > 0 && time <= 0xffffffff) out[key] = time;
        }
        if (!out.eventEndTime && out.expireTime) out.eventEndTime = out.expireTime;
        if (!out.eventOnsetTime && out.effectiveTime) out.eventOnsetTime = out.effectiveTime;
        for (const key of Object.keys(ENUMS)) {
            if (out[key]) continue;
            const token = String(source[key] ?? "").toUpperCase(), value = WK3_ALERT_ENUMS[key][token];
            if (value !== undefined) out[key] = value;
        }
        return out;
    });
}
/** FlatBufferRootProcessor-compatible codec. Requires a decoded source arena;
 * not a from-scratch weather/schema encoder. Root accessor must be slot 9. */
export class WK3AlertsTable { __init(position, bb) { this.bb_pos = position; this.bb = bb; return this; } }
export const wk3AlertsCodec = {
    tableClass: WK3AlertsTable,
    decode(table) {
        // The processor passes an arena with an arbitrary child table position.
        const source = table.bb.bytes(), wrapper = new Uint8Array(40 + source.length); wrapper.set(source, 40);
        const v = new DataView(wrapper.buffer);
        v.setUint32(0, 28, true); v.setUint16(4, 24, true); v.setUint16(6, 8, true); v.setUint16(26, 4, true);
        v.setInt32(28, 24, true); v.setUint32(32, 40 + table.bb_pos - 32, true);
        return decodeWK3Alerts(wrapper);
    },
    encode(builder, data) {
        if (!data?.[SOURCE]) throw new TypeError("WK3 alerts codec requires decoded source arena");
        const bytes = patchWK3Alerts(data[SOURCE], data.alerts, { detailsUrl: data.detailsUrl }), r = reader(bytes), c = collection(r);
        builder.prep(8, bytes.length); builder.pad(bytes.length);
        builder.dataBuffer().bytes().set(bytes, builder.space);
        return builder.offset() - c;
    },
};

/** No API credential required. Complements Apple's existing CN alerts only;
 * returns the original view on missing collection/page, ambiguity or failure.
 * Details link is opt-in: enable ONLY after routing /api/v1/weatherAlerts region
 * identifiers to WeatherAlerts.DetailsForQWeather(). Otherwise keep QWeather URL.
 */
export async function patchWK3QWeatherAlerts(bytes, { language = "zh-CN", timezone, fetchImpl = globalThis.fetch, rewriteDetails = false, report = {} } = {}) {
    const raw = input(bytes);
    Object.assign(report, { total: 0, matched: 0, summariesUpdated: 0, detailsConverted: false, reason: "no-alerts", unmatched: {}, titleMismatches: [] });
    let stage = "decode-failed";
    try {
        const original = decodeWK3Alerts(raw);
        if (!original?.alerts.length) return raw;
        report.total = original.alerts.length;
        report.reason = "unsupported-page-url";
        const identifier = WeatherAlerts.ParseWeatherAlertPageURL(original.detailsUrl);
        if (!identifier) return raw;
        stage = "page-fetch-failed";
        const extracted = await WeatherAlerts.FetchWeatherAlertPage(identifier, language, fetchImpl);
        report.reason = "empty-page";
        if (!extracted.alerts.length) return raw;
        stage = "page-build-failed";
        const context = { identifier, language, countryCode: "CN", eventSource: "CN", attributionUrl: original.detailsUrl };
        const sources = WeatherAlerts.Build(extracted, context), used = new Set();
        const unmatched = reason => { report.unmatched[reason] = (report.unmatched[reason] || 0) + 1; return null; };
        const matched = original.alerts.map(alert => {
            // An observed generic Apple title carries no event name. It may
            // resolve only to a named, unique source with exact severity/time;
            // never use array order or discard used candidates to force a match.
            const generic = isGenericAlertTitle(alert.description);
            if (generic && !alert.issuedTime) return unmatched("missing-issued-time");
            let candidates = sources.map((source, index) => ({ source, index }))
                .filter(({ source }) => generic
                    ? typeof source.description === "string" && source.description.trim() && !isGenericAlertTitle(source.description)
                    : sameAlertTitle(alert.description, source.description));
            if (!candidates.length) {
                // Public warning titles only: no URL, UUID, coordinates or credentials.
                const title = value => typeof value === "string" ? value.replace(/[\u0000-\u001f\u007f]/g, " ").slice(0, 320) : null;
                if (report.titleMismatches.length < 4) report.titleMismatches.push({
                    appleTitle: title(alert.description),
                    pageTitles: extracted.alerts.slice(0, 8).map(source => title(source.description)),
                    parsedTitles: sources.slice(0, 8).map(source => title(source.description)),
                });
                return unmatched("title-mismatch");
            }
            if (![WK3_ALERT_ENUMS.severity.EXTREME, WK3_ALERT_ENUMS.severity.SEVERE, WK3_ALERT_ENUMS.severity.MODERATE, WK3_ALERT_ENUMS.severity.MINOR].includes(alert.severity)) return unmatched("unverified-severity");
            candidates = candidates.filter(({ source }) => WK3_ALERT_ENUMS.severity[String(source.severity).toUpperCase()] === alert.severity);
            if (!candidates.length) return unmatched("severity-mismatch");
            candidates = candidates.filter(({ source }) => !alert.issuedTime || Date.parse(source.issuedTime) / 1000 === alert.issuedTime);
            if (!candidates.length) return unmatched("issued-time-mismatch");
            if (candidates.length !== 1 || used.has(candidates[0].index)) return unmatched("ambiguous-match");
            used.add(candidates[0].index); return candidates[0].source;
        });
        report.matched = matched.filter(Boolean).length;
        report.reason = "unmatched-alerts";
        if (!report.matched) return raw;
        let alerts = enrichWK3Alerts(original, matched);
        // Source publication platform is not the issuer. With an exact match,
        // prefer the observed page's actual issuing meteorological office.
        alerts = alerts.map((alert, i) => matched[i] && /^(国家预警信息发布中心|QWeather|和风天气)$/.test(alert.source ?? "") ? { ...alert, source: matched[i].source } : alert);
        const summariesUpdated = alerts.filter((alert, i) => JSON.stringify(alert) !== JSON.stringify(original.alerts[i])).length;
        const options = {};
        let detailsConverted = false;
        if (rewriteDetails && report.matched === report.total) {
            // All events must match before replacing the shared URL.
            stage = "details-build-failed";
            const url = buildNativeAlertDetailsURL({ identifier, language, timezone, alerts });
            alerts = alerts.map(alert => ({ ...alert, detailsUrl: url })); options.detailsUrl = url;
            detailsConverted = true;
        }
        stage = "summary-patch-failed";
        const patched = patchWK3Alerts(raw, alerts, options);
        // Publish successful counts only after the atomic patch completes.
        Object.assign(report, { summariesUpdated, detailsConverted,
            reason: detailsConverted ? "converted" : rewriteDetails ? "unmatched-alerts" : "details-disabled" });
        return patched;
    } catch { report.reason = stage; return raw; }
}
