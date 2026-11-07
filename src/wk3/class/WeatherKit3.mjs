import { ByteBuffer } from "flatbuffers";
import { AirQuality, Metadata, Pollutant } from "../proto/apple/wk2.js";

/** WK3.Weather, lib-rc-3.0.0-b66: observed root positions, not WK2 order.
 * 4: metadata + series[1] + periods[120], each period spans 7200 seconds.
 * 5: six-slot nextHour; the sole available sample has 83 timestamp-only minutes.
 * 14: article placements (titles/language/IDs), not minute precipitation.
 * No whole-root or nextHour encoder is provided here.
 */
export const WK3_ROOT_SLOTS = { airQuality: 0, forecastPeriodic: 4, forecastNextHour: 5, news: 14 };

// Only the AQ/metadata/pollutant physical layouts were verified against WK2.
// Reuse those generated accessors/builders WITHOUT its symbolic enum mappings.
// This does not imply that current/daily/hourly or the WK2 root is compatible.
export class WK3AirQualityTable extends AirQuality {}

/** Raw wire enum integer. In particular "UNKNOWN13" must not become WK2's 13. */
function rawEnum(value = 0) {
    if (!Number.isInteger(value) || value < 0 || value > 255) throw new TypeError("WK3 enum must be a raw integer from 0 to 255; symbolic WK2 names are unsupported");
    return value;
}
function unsigned(value = 0, max = 4294967295) {
    if (!Number.isInteger(value) || value < 0 || value > max) throw new RangeError("WK3 unsigned integer out of range");
    return value;
}
function finite(value = 0) {
    if (typeof value !== "number" || !Number.isFinite(Math.fround(value))) throw new TypeError("WK3 finite float32 required");
    return value;
}
function decodeMetadata(table) {
    if (!table) return null;
    return {
        attributionUrl: table.attributionUrl(), expireTime: table.expireTime(), language: table.language(),
        latitude: table.latitude(), longitude: table.longitude(), providerLogo: table.providerLogo(),
        providerName: table.providerName(), readTime: table.readTime(), reportedTime: table.reportedTime(),
        temporarilyUnavailable: table.temporarilyUnavailable(), sourceType: table.sourceType() & 255,
    };
}
function encodeMetadata(builder, data) {
    if (!data) return 0;
    return Metadata.createMetadata(
        builder, builder.createString(data.attributionUrl), unsigned(data.expireTime), builder.createString(data.language),
        finite(data.latitude), finite(data.longitude), builder.createString(data.providerLogo), builder.createString(data.providerName),
        unsigned(data.readTime), unsigned(data.reportedTime), data.temporarilyUnavailable ?? false, rawEnum(data.sourceType),
    );
}
/** Decode the eight-slot AQ table, preserving enums as numbers. No pollutant
 * names or unit meanings are inferred. Use on the verified b66 AQ layout only. */
export function decodeAirQuality(table) {
    return {
        metadata: decodeMetadata(table.metadata()),
        categoryIndex: table.categoryIndex() & 255,
        index: table.index() & 65535,
        isSignificant: table.isSignificant(),
        pollutants: Array.from({ length: table.pollutantsLength() }, (_, i) => {
            const p = table.pollutants(i);
            return { pollutantType: p.pollutantType() & 255, amount: p.amount(), units: p.units() & 255 };
        }),
        previousDayComparison: table.previousDayComparison() & 255,
        primaryPollutant: table.primaryPollutant() & 255,
        scale: table.scale(),
    };
}
/** Build an AQ child only, returning its builder offset (do not finish a
 * WK2 Weather root). Pass through decoded primaryPollutant/pollutants when
 * editing index/categoryIndex/scale/comparison. No WK3 pollutant mapping has
 * been verified, so provider/WK2 symbolic enum strings are rejected.
 */
export function encodeAirQuality(builder, data) {
    const metadataOffset = encodeMetadata(builder, data.metadata);
    const pollutants = data.pollutants == null ? 0 : AirQuality.createPollutantsVector(builder,
        data.pollutants.map(p => Pollutant.createPollutant(builder, rawEnum(p.pollutantType), finite(p.amount), rawEnum(p.units))));
    const scale = builder.createString(data.scale);
    return AirQuality.createAirQuality(builder, metadataOffset, rawEnum(data.categoryIndex), unsigned(data.index, 65535),
        data.isSignificant ?? false, pollutants, rawEnum(data.previousDayComparison), rawEnum(data.primaryPollutant), scale);
}
// Verified by paired Apple v3 JSON / WK3 b66 responses, not WK2 enum arithmetic.
// Only observed names are mapped; unsupported provider names fail closed.
export const WK3_AQ_POLLUTANTS = {
    NOT_AVAILABLE: 1, C6H6: 2, NH3: 3, NMHC: 4, NO: 5, NO2: 6, NOX: 7,
    OZONE: 8, PM2_5: 9, SO2: 10, PM10: 11, CO: 12,
};
export const WK3_AQ_UNITS = { PARTS_PER_BILLION: 1, MICROGRAMS_PER_CUBIC_METER: 2 };
export const WK3_AQ_SOURCES = { APPLE_INTERNAL: 1, MODELED: 2, STATION: 3 };
export const WK3_AQ_COMPARISONS = { UNKNOWN: 0, WORSE: 2, SAME: 3, BETTER: 4 };

const WK3_AQ_SCALES = new Set([
    "UBA", "EU.EAQI", "HJ6332012", "HJ6332025_DRAFT", "EPA_NowCast",
    "HK.AQHI", "CA.AQHI", "CN.AQHI",
]);
function mapAQComparison(value = "UNKNOWN") {
    if (!Object.hasOwn(WK3_AQ_COMPARISONS, value)) throw new TypeError(`Unknown WK3 AQ comparison: ${value}`);
    return WK3_AQ_COMPARISONS[value];
}
function aqCategory(scale, index) {
    if (["EPA_NowCast", "HJ6332012", "HJ6332025_DRAFT"].includes(scale)) return index <= 50 ? 1 : index <= 100 ? 2 : index <= 150 ? 3 : index <= 200 ? 4 : index <= 300 ? 5 : 6;
    return null;
}


/** Convert supported algorithm/provider AQ payloads into WK3 wire enums.
 * Required metadata: providerName and sourceType. Missing optional metadata
 * fields (coordinates and timestamps included) retain codec defaults of zero.
 */
export function providerToWK3AirQuality(data) {
    if (!data || typeof data !== "object") throw new TypeError("Missing provider AQ data");
    if (!Number.isInteger(data.index) || data.index < 0 || data.index > 32767) throw new RangeError("WK3 AQ index must be 0..32767");
    if (!Number.isInteger(data.categoryIndex) || data.categoryIndex < 1 || data.categoryIndex > 127) throw new RangeError("WK3 AQ category must be 1..127");
    const scaleBase = typeof data.scale === "string" ? data.scale.replace(/\.\d+(?:\.\d+)*$/, "") : "";
    if (!WK3_AQ_SCALES.has(scaleBase)) throw new TypeError(`Unsupported WK3 AQ scale: ${data.scale}`);
    const expectedCategory = aqCategory(scaleBase, data.index);
    if (expectedCategory !== null && data.categoryIndex !== expectedCategory) throw new TypeError(`Inconsistent ${scaleBase} categoryIndex`);
    if (expectedCategory !== null && data.isSignificant !== (data.categoryIndex >= 3)) throw new TypeError(`Inconsistent ${scaleBase} significance`);
    if (!data.metadata || data.metadata.temporarilyUnavailable || typeof data.metadata.providerName !== "string" || !data.metadata.providerName || !Object.hasOwn(WK3_AQ_SOURCES, data.metadata.sourceType)) throw new TypeError("Missing or invalid AQ provider metadata");
    if (!Array.isArray(data.pollutants) || data.pollutants.length === 0) throw new TypeError("Missing provider pollutants");
    const seen = new Set();
    const pollutants = data.pollutants.map(p => {
        if (!p || typeof p !== "object" || !Object.hasOwn(WK3_AQ_POLLUTANTS, p.pollutantType) || !Object.hasOwn(WK3_AQ_UNITS, p.units)) throw new TypeError("Unknown WK3 AQ pollutant/unit");
        const pollutantType = WK3_AQ_POLLUTANTS[p.pollutantType];
        if (pollutantType === WK3_AQ_POLLUTANTS.NOT_AVAILABLE || seen.has(pollutantType)) throw new TypeError("Invalid or duplicate pollutant");
        seen.add(pollutantType);
        const amount = finite(p.amount);
        if (amount < 0) throw new RangeError("Negative pollutant concentration");
        return { ...p, pollutantType, amount, units: WK3_AQ_UNITS[p.units] };
    });
    if (!Object.hasOwn(WK3_AQ_POLLUTANTS, data.primaryPollutant)) throw new TypeError("Unknown WK3 AQ primary pollutant");
    const primaryPollutant = WK3_AQ_POLLUTANTS[data.primaryPollutant];
    if (primaryPollutant !== WK3_AQ_POLLUTANTS.NOT_AVAILABLE && !seen.has(primaryPollutant)) throw new TypeError("Primary pollutant missing from provider data");
    const metadata = {
        ...data.metadata, attributionUrl: data.metadata.attributionUrl ?? null, expireTime: data.metadata.expireTime ?? 0,
        language: data.metadata.language ?? null, latitude: finite(data.metadata.latitude ?? 0), longitude: finite(data.metadata.longitude ?? 0),
        providerLogo: data.metadata.providerLogo ?? null, readTime: data.metadata.readTime ?? 0, reportedTime: data.metadata.reportedTime ?? 0,
        temporarilyUnavailable: false, sourceType: WK3_AQ_SOURCES[data.metadata.sourceType],
    };
    const normalizedScale = data.scale === "EPA_NowCast.2414" ? "EPA_NowCast.2604" : data.scale;
    return { ...data, metadata, index: data.index, categoryIndex: data.categoryIndex, isSignificant: data.isSignificant === true,
        pollutants, primaryPollutant, previousDayComparison: mapAQComparison(data.previousDayComparison), scale: normalizedScale };
}

function enumName(dictionary, value, kind) {
    const name = Object.keys(dictionary).find(key => dictionary[key] === value);
    if (name === undefined) throw new TypeError(`Unknown WK3 AQ ${kind}: ${value}`);
    return name;
}
function assertKnownVtableFields(table, count, label) {
    if (!table) throw new TypeError(`Missing WK3 AQ ${label}`);
    const bb = table.bb, position = table.bb_pos;
    const vtable = position - bb.readInt32(position);
    if (bb.readInt16(vtable) > 4 + count * 2) throw new TypeError(`Unknown WK3 AQ ${label} fields`);
}
export function wk3AirQualityToProvider(data) {
    if (data && typeof data.index === "function") {
        assertKnownVtableFields(data, 8, "table");
        const metadataTable = data.metadata();
        assertKnownVtableFields(metadataTable, 11, "metadata");
        const pollutants = Array.from({ length: data.pollutantsLength() }, (_, i) => {
            const p = data.pollutants(i); assertKnownVtableFields(p, 3, "pollutant");
            return { pollutantType: p.pollutantType(), amount: p.amount(), units: p.units() };
        });
        return wk3AirQualityToProvider({ metadata: decodeMetadata(metadataTable), categoryIndex: data.categoryIndex(), index: data.index(),
            isSignificant: data.isSignificant(), pollutants, previousDayComparison: data.previousDayComparison(),
            primaryPollutant: data.primaryPollutant(), scale: data.scale() });
    }
    if (!data || !data.metadata || !Array.isArray(data.pollutants)) throw new TypeError("Missing raw WK3 AQ object");
    const metadata = { ...data.metadata, sourceType: enumName(WK3_AQ_SOURCES, data.metadata.sourceType, "source") };
    const pollutants = data.pollutants.map(p => ({
        ...p, pollutantType: enumName(WK3_AQ_POLLUTANTS, p.pollutantType, "pollutant"),
        units: enumName(WK3_AQ_UNITS, p.units, "unit"),
    }));
    return { ...data, metadata, pollutants,
        previousDayComparison: enumName(WK3_AQ_COMPARISONS, data.previousDayComparison, "comparison"),
        primaryPollutant: enumName(WK3_AQ_POLLUTANTS, data.primaryPollutant, "primary pollutant") };
}

/** US-specific compatibility wrapper retains its original 0..500 bands. */
export function providerToWK3USAirQuality(data) {
    if (!data || !["EPA_NowCast.2414", "EPA_NowCast.2604"].includes(data.scale)) throw new TypeError("Unsupported EPA_NowCast scale version");
    if (!Number.isInteger(data.index)) throw new TypeError("Missing integer AQI");
    const index = unsigned(data.index, 500);
    const category = index <= 50 ? 1 : index <= 100 ? 2 : index <= 150 ? 3 : index <= 200 ? 4 : index <= 300 ? 5 : 6;
    if (data.categoryIndex !== category || data.isSignificant !== (category >= 3)) throw new TypeError("Inconsistent EPA AQI category/significance");
    const result = providerToWK3AirQuality(data);
    return { ...result, index, categoryIndex: category, isSignificant: category >= 3, previousDayComparison: 0, scale: "EPA_NowCast.2604" };
}

/** Unknown AQ/metadata/pollutant fields make complete-child replacement unsafe. */
export function assertWK3AirQualityReplaceable(bytes) {
    const bb = bytes instanceof ByteBuffer ? bytes : new ByteBuffer(bytes);
    const start = bb.position(), root = start + bb.readUint32(start);
    const offset = bb.__offset(root, 4 + 2 * WK3_ROOT_SLOTS.airQuality);
    if (!offset) return true;
    const aq = new WK3AirQualityTable().__init(bb.__indirect(root + offset), bb);
    assertKnownVtableFields(aq, 8, "table");
    const metadata = aq.metadata();
    if (metadata) assertKnownVtableFields(metadata, 11, "metadata");
    for (let i = 0; i < aq.pollutantsLength(); i++) assertKnownVtableFields(aq.pollutants(i), 3, "pollutant");
    return true;
}

export const airQualityCodec = { tableClass: WK3AirQualityTable, decode: decodeAirQuality, encode: encodeAirQuality };
export const WK3_CODECS = { airQuality: airQualityCodec };

/** Convenience reader for a complete WK3 root. Missing AQ returns null.
 * Valid FlatBuffers are expected, like the generated table accessors.
 * The processor can instead initialize WK3AirQualityTable directly from a
 * preserved child arena using __init(position, ByteBuffer).
 */
export function decodeWK3DataSet(bytes, name = "airQuality") {
    if (name !== "airQuality") throw new RangeError(`Unsupported WK3 data set ${name}`);
    const bb = bytes instanceof ByteBuffer ? bytes : new ByteBuffer(bytes);
    const start = bb.position(), root = start + bb.readUint32(start);
    const offset = bb.__offset(root, 4 + 2 * WK3_ROOT_SLOTS.airQuality);
    return offset ? decodeAirQuality(new WK3AirQualityTable().__init(bb.__indirect(root + offset), bb)) : null;
}
