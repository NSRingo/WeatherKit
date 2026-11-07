import { ByteBuffer } from "flatbuffers";
import { Metadata } from "../proto/apple/wk2.js";

/** Apple WK3 b66, paired original JSON/FlatBuffer responses (2026-11-04).
 * Root 5; nextHour[0..5] = metadata, condition[], summary[], start, end, minutes[].
 * Unlike WK2, summary.condition is an enum vector. Only singleton vectors are
 * verified: u8 vs u16 element width cannot be distinguished from those samples;
 * both have identical singleton bytes. Multi-element vectors fail closed.
 * Miami / Manchester / Atlanta confirmed nonzero minutes and summaries, tokens
 * START/STOP/START_STOP/CONSTANT, FIRST_AT/SECOND_AT parameters. No WK2 enum reuse.
 * Raw codec preserves numeric enums; symbolic provider conversion fails closed.
 * Unknown fields require arena preservation by the caller, NOT decode/reencode.
 */
export const WK3_NEXT_HOUR_ROOT_SLOT = 5;
export const WK3_NEXT_HOUR_ENUMS = {
    condition: { CLEAR: 1, RAIN: 7, DRIZZLE: 8 },
    precipitation: { CLEAR: 1, RAIN: 2 },
    forecastToken: { CLEAR: 1, START: 2, STOP: 3, START_STOP: 4, CONSTANT: 6 },
    parameterType: { FIRST_AT: 1, SECOND_AT: 2 },
    sourceType: { MODELED: 2, STATION: 3 },
};
const uint = (n = 0, max = 0xffffffff) => {
    if (!Number.isInteger(n) || n < 0 || n > max) throw new RangeError("WK3 unsigned integer out of range");
    return n;
};
const byte = n => uint(n, 255);
const float = (n = 0) => {
    if (typeof n !== "number" || !Number.isFinite(Math.fround(n)) || n < 0) throw new TypeError("WK3 nonnegative finite float32 required");
    return n;
};
const chance = n => uint(n, 100);
function range(bb, p, length) {
    if (!Number.isSafeInteger(p) || p < 0 || !Number.isSafeInteger(length) || length < 0 || p + length > bb.capacity()) throw new RangeError("Truncated WK3 nextHour");
}
class Table {
    __init(p, bb) { this.bb_pos = p; this.bb = bb; return this; }
    check(slots) {
        range(this.bb, this.bb_pos, 4);
        const v = this.bb_pos - this.bb.readInt32(this.bb_pos);
        range(this.bb, v, 4);
        const length = this.bb.readUint16(v), size = this.bb.readUint16(v + 2);
        if (length < 4 || length % 2 || (length - 4) / 2 > slots || size < 4) throw new TypeError("Unsupported WK3 nextHour table layout");
        range(this.bb, v, length); range(this.bb, this.bb_pos, size);
        for (let i = 4; i < length; i += 2) {
            const o = this.bb.readUint16(v + i);
            if (o && (o < 4 || o >= size)) throw new RangeError("Invalid WK3 field offset");
        }
        return this;
    }
    field(i, width = 4) {
        const o = this.bb.__offset(this.bb_pos, 4 + 2 * i);
        if (!o) return 0;
        const v = this.bb_pos - this.bb.readInt32(this.bb_pos);
        if (o + width > this.bb.readUint16(v + 2)) throw new RangeError("Invalid WK3 scalar width");
        range(this.bb, this.bb_pos + o, width); return this.bb_pos + o;
    }
    scalar(i, kind = "readUint32") {
        const p = this.field(i, kind === "readUint8" ? 1 : 4);
        return p ? this.bb[kind](p) : 0;
    }
    child(i) {
        const p = this.field(i); if (!p) return null;
        const target = p + this.bb.readUint32(p); range(this.bb, target, 4);
        return new Table().__init(target, this.bb);
    }
    vector(i, bytes = false) {
        const f = this.field(i); if (!f) return [];
        const p = f + this.bb.readUint32(f); range(this.bb, p, 4);
        const n = this.bb.readUint32(p);
        if (bytes && n !== 1) throw new TypeError("Unverified WK3 multi-condition summary vector");
        range(this.bb, p + 4, n * (bytes ? 1 : 4));
        return Array.from({ length: n }, (_, k) => {
            if (bytes) return this.bb.readUint8(p + 4 + k);
            const f = p + 4 + k * 4, target = f + this.bb.readUint32(f); range(this.bb, target, 4);
            return new Table().__init(target, this.bb);
        });
    }
}
export class WK3NextHourTable extends Table {}
function metadataDecode(t) {
    if (!t) return null;
    t.check(11);
    const m = new Metadata().__init(t.bb_pos, t.bb);
    return { attributionUrl: m.attributionUrl(), expireTime: m.expireTime(), language: m.language(), latitude: m.latitude(), longitude: m.longitude(), providerLogo: m.providerLogo(), providerName: m.providerName(), readTime: m.readTime(), reportedTime: m.reportedTime(), temporarilyUnavailable: m.temporarilyUnavailable(), sourceType: m.sourceType() & 255 };
}
function parameterDecode(t) { t.check(2); return { type: t.scalar(0, "readUint8"), date: t.scalar(1) }; }
function conditionDecode(t) {
    t.check(6);
    return { startTime: t.scalar(0), endTime: t.scalar(1), forecastToken: t.scalar(2, "readUint8"), beginCondition: t.scalar(3, "readUint8"), endCondition: t.scalar(4, "readUint8"), parameters: t.vector(5).map(parameterDecode) };
}
function summaryDecode(t) {
    t.check(5);
    return { startTime: t.scalar(0), endTime: t.scalar(1), condition: t.vector(2, true), precipitationChance: t.scalar(3, "readUint8"), precipitationIntensity: t.scalar(4, "readFloat32") };
}
function minuteDecode(t) {
    t.check(4);
    return { startTime: t.scalar(0), precipitationChance: t.scalar(1, "readUint8"), precipitationIntensity: t.scalar(2, "readFloat32"), perceivedPrecipitationIntensity: t.scalar(3, "readFloat32") };
}
export function decodeNextHour(table) {
    const t = new WK3NextHourTable().__init(table.bb_pos, table.bb).check(6);
    return { metadata: metadataDecode(t.child(0)), condition: t.vector(1).map(conditionDecode), summary: t.vector(2).map(summaryDecode), forecastStart: t.scalar(3), forecastEnd: t.scalar(4), minutes: t.vector(5).map(minuteDecode) };
}
export function decodeWK3NextHour(bytes) {
    const bb = bytes instanceof ByteBuffer ? bytes : new ByteBuffer(bytes), start = bb.position();
    range(bb, start, 4);
    const root = new Table().__init(start + bb.readUint32(start), bb);
    // Root may have arbitrary future slots; only inspect root 5.
    root.check(32765);
    const t = root.child(WK3_NEXT_HOUR_ROOT_SLOT);
    return t ? decodeNextHour(t) : null;
}
function vector(b, entries, bytes = false) {
    if (bytes && entries.length !== 1) throw new TypeError("Unverified WK3 multi-condition summary vector");
    b.startVector(bytes ? 1 : 4, entries.length, bytes ? 1 : 4);
    for (let i = entries.length - 1; i >= 0; i--) bytes ? b.addInt8(byte(entries[i])) : b.addOffset(entries[i]);
    return b.endVector();
}
function string(b, value) {
    if (value == null) return 0;
    if (typeof value !== "string") throw new TypeError("WK3 metadata string required");
    return b.createString(value);
}
function metadataEncode(b, m) {
    if (!m) return 0;
    const signedFloat = n => { if (typeof n !== "number" || !Number.isFinite(Math.fround(n))) throw new TypeError("WK3 metadata finite float required"); return n; };
    return Metadata.createMetadata(b, string(b, m.attributionUrl), uint(m.expireTime), string(b, m.language), signedFloat(m.latitude ?? 0), signedFloat(m.longitude ?? 0), string(b, m.providerLogo), string(b, m.providerName), uint(m.readTime), uint(m.reportedTime), m.temporarilyUnavailable ?? false, byte(m.sourceType));
}
function parameterEncode(b, p) {
    const type = byte(p.type), date = uint(p.date);
    b.startObject(2); b.addFieldInt8(0, type, 0); b.addFieldInt32(1, date, 0); return b.endObject();
}
function conditionEncode(b, c) {
    const start = uint(c.startTime), end = uint(c.endTime), token = byte(c.forecastToken), begin = byte(c.beginCondition), finish = byte(c.endCondition);
    const parameters = vector(b, (c.parameters ?? []).map(p => parameterEncode(b, p)));
    b.startObject(6); b.addFieldInt32(0, start, 0); b.addFieldInt32(1, end, 0); b.addFieldInt8(2, token, 0); b.addFieldInt8(3, begin, 0); b.addFieldInt8(4, finish, 0); b.addFieldOffset(5, parameters, 0); return b.endObject();
}
function summaryEncode(b, s) {
    if (!Array.isArray(s.condition)) throw new TypeError("WK3 summary.condition must be an enum array, not a WK2 scalar");
    const start = uint(s.startTime), end = uint(s.endTime), probability = chance(s.precipitationChance), intensity = float(s.precipitationIntensity), conditions = vector(b, s.condition, true);
    b.startObject(5); b.addFieldInt32(0, start, 0); b.addFieldInt32(1, end, 0); b.addFieldOffset(2, conditions, 0); b.addFieldInt8(3, probability, 0); b.addFieldFloat32(4, intensity, 0); return b.endObject();
}
function minuteEncode(b, m) {
    const start = uint(m.startTime), probability = chance(m.precipitationChance), intensity = float(m.precipitationIntensity), perceived = float(m.perceivedPrecipitationIntensity);
    b.startObject(4); b.addFieldInt32(0, start, 0); b.addFieldInt8(1, probability, 0); b.addFieldFloat32(2, intensity, 0); b.addFieldFloat32(3, perceived, 0); return b.endObject();
}
/** Return a CHILD offset. Caller finishes/appends/merges root 5 atomically. */
export function encodeNextHour(b, data) {
    const start = uint(data.forecastStart), end = uint(data.forecastEnd), metadata = metadataEncode(b, data.metadata);
    const conditions = vector(b, (data.condition ?? []).map(c => conditionEncode(b, c)));
    const summaries = vector(b, (data.summary ?? []).map(s => summaryEncode(b, s)));
    const minutes = vector(b, (data.minutes ?? []).map(m => minuteEncode(b, m)));
    b.startObject(6); b.addFieldOffset(0, metadata, 0); b.addFieldOffset(1, conditions, 0); b.addFieldOffset(2, summaries, 0); b.addFieldInt32(3, start, 0); b.addFieldInt32(4, end, 0); b.addFieldOffset(5, minutes, 0); return b.endObject();
}
export const nextHourCodec = { tableClass: WK3NextHourTable, decode: decodeNextHour, encode: encodeNextHour };

function mapEnum(group, name) {
    const dictionary = WK3_NEXT_HOUR_ENUMS[group];
    if (typeof name !== "string" || !Object.hasOwn(dictionary, name)) throw new TypeError(`Unsupported WK3 nextHour ${group}: ${name}`);
    return dictionary[name];
}
function requiredNumber(n, validate) {
    if (typeof n !== "number") throw new TypeError("Missing provider nextHour number");
    return validate(n);
}
/** Convert ColorfulClouds.Minutely()/QWeather.Minutely() normalized output.
 * Their precipitationIntensity is mm/h and precipitationChance is percent.
 * Caller MUST explicitly attest units; no conversion of raw five-minute totals,
 * probability fractions, radar dBZ, or guessing conditions from text here.
 * Existing provider perceived intensity/condition/summary logic is not rederived.
 * Unsupported symbolic enums, missing data, or inconsistent timelines throw;
 * caller catches and keeps the ORIGINAL child arena (including unknown fields).
 */
export function providerToWK3NextHour(data, { intensityUnit, chanceUnit } = {}) {
    if (intensityUnit !== "mm/h" || chanceUnit !== "percent") throw new TypeError("Explicit mm/h and percent units required");
    if (!data?.metadata?.providerName || data.metadata.temporarilyUnavailable) throw new TypeError("Missing available nextHour provider metadata");
    if (!Array.isArray(data.minutes) || !data.minutes.length || !Array.isArray(data.condition) || !data.condition.length || !Array.isArray(data.summary) || !data.summary.length) throw new TypeError("Missing nextHour minutes/condition/summary");
    const forecastStart = requiredNumber(data.forecastStart, uint), forecastEnd = requiredNumber(data.forecastEnd, uint);
    const minutes = data.minutes.map((m, i) => {
        const startTime = requiredNumber(m.startTime, uint);
        if (startTime !== forecastStart + i * 60) throw new TypeError("Noncontiguous nextHour minutes");
        return { startTime, precipitationChance: requiredNumber(m.precipitationChance, chance), precipitationIntensity: requiredNumber(m.precipitationIntensity, float), perceivedPrecipitationIntensity: requiredNumber(m.perceivedPrecipitationIntensity, float) };
    });
    if (forecastEnd !== forecastStart + minutes.length * 60) throw new TypeError("Inconsistent nextHour forecastEnd");
    const segment = s => ({ startTime: requiredNumber(s.startTime, uint), endTime: s.endTime == null ? 0 : requiredNumber(s.endTime, uint) });
    const summary = data.summary.map(s => ({ ...segment(s), condition: (Array.isArray(s.condition) ? s.condition : [s.condition]).map(c => mapEnum("precipitation", c)), precipitationChance: requiredNumber(s.precipitationChance, chance), precipitationIntensity: requiredNumber(s.precipitationIntensity, float) }));
    if (summary.some(s => s.condition.length !== 1)) throw new TypeError("Unverified WK3 multi-condition summary vector");
    const condition = data.condition.map(c => {
        if (!Array.isArray(c.parameters)) throw new TypeError("Missing condition parameters");
        return { ...segment(c), forecastToken: mapEnum("forecastToken", c.forecastToken), beginCondition: mapEnum("condition", c.beginCondition), endCondition: mapEnum("condition", c.endCondition), parameters: c.parameters.map(p => ({ type: mapEnum("parameterType", p.type), date: requiredNumber(p.date, uint) })) };
    });
    for (const segments of [summary, condition]) {
        for (let i = 0; i < segments.length; i++) {
            const s = segments[i], next = segments[i + 1];
            if (s.startTime !== (i === 0 ? forecastStart : segments[i - 1].endTime) || (next ? s.endTime !== next.startTime || s.endTime <= s.startTime || s.endTime >= forecastEnd : s.endTime !== 0)) throw new TypeError("Inconsistent nextHour segment timeline");
        }
    }
    return { metadata: { ...data.metadata, sourceType: mapEnum("sourceType", data.metadata.sourceType) }, forecastStart, forecastEnd, minutes, summary, condition };
}
