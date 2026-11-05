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
export const WK3_AQ_POLLUTANTS = { NOT_AVAILABLE: 1, NO: 5, NO2: 6, NOX: 7, OZONE: 8, PM2_5: 9, SO2: 10, PM10: 11, CO: 12 };
export const WK3_AQ_UNITS = { PARTS_PER_BILLION: 1, MICROGRAMS_PER_CUBIC_METER: 2 };
export const WK3_AQ_SOURCES = { MODELED: 2, STATION: 3 };

/** Build a self-consistent US AQ child from one provider. Do not carry China's
 * primary pollutant / yesterday comparison into a new scale. UNKNOWN=0 was
 * verified against Apple JSON; yesterday injection remains unsupported.
 */
export function providerToWK3USAirQuality(data) {
    const map = (dictionary, name) => {
        if (!Object.hasOwn(dictionary, name)) throw new TypeError(`Unsupported WK3 AQ enum: ${name}`);
        return dictionary[name];
    };
    if (!["EPA_NowCast.2414", "EPA_NowCast.2604"].includes(data?.scale)) throw new TypeError("Unsupported EPA_NowCast scale version");
    if (!Number.isInteger(data.index)) throw new TypeError("Missing integer AQI");
    const index = unsigned(data.index, 500);
    const category = index <= 50 ? 1 : index <= 100 ? 2 : index <= 150 ? 3 : index <= 200 ? 4 : index <= 300 ? 5 : 6;
    if (data.categoryIndex !== category || data.isSignificant !== (category >= 3)) throw new TypeError("Inconsistent EPA AQI category/significance");
    if (!data.metadata || data.metadata.temporarilyUnavailable || !data.metadata.providerName) throw new TypeError("Missing AQ provider metadata");
    if (!Array.isArray(data.pollutants) || !data.pollutants.length) throw new TypeError("Missing provider pollutants");
    const seen = new Set();
    const pollutants = data.pollutants.map(p => {
        const pollutantType = map(WK3_AQ_POLLUTANTS, p.pollutantType);
        if (pollutantType === 1 || seen.has(pollutantType)) throw new TypeError("Invalid or duplicate pollutant");
        seen.add(pollutantType);
        if (typeof p.amount !== "number") throw new TypeError("Missing pollutant concentration");
        const amount = finite(p.amount);
        if (amount < 0) throw new RangeError("Negative pollutant concentration");
        return { pollutantType, amount, units: map(WK3_AQ_UNITS, p.units) };
    });
    const primaryPollutant = map(WK3_AQ_POLLUTANTS, data.primaryPollutant);
    if (primaryPollutant !== 1 && !seen.has(primaryPollutant)) throw new TypeError("Primary pollutant missing from provider data");
    return {
        metadata: { ...data.metadata, sourceType: map(WK3_AQ_SOURCES, data.metadata.sourceType) },
        index, categoryIndex: category, isSignificant: category >= 3, pollutants,
        // Upstream providers still emit .2414 (Apple now returns 404). Both use
        // the same six AQI bands; .2604 is the observed live display scale, not
        // a claim that the provider implements Apple's concentration algorithm.
        primaryPollutant, previousDayComparison: 0, scale: "EPA_NowCast.2604",
    };
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
