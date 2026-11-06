import { FlatBufferRootProcessor, inspectTable } from "@nsnanocat/flatbuffer-root";
import { WK3 } from "@nsringo/weatherkit";

/**
 * 在通用处理器之外补充 WK3 AQ 失败边界：请求的 AQ 产品读取或解码失败时返回 null，
 * 由主脚本保留原包；AQ 物理缺失不算失败，返回不含 AQ 的对象，允许补齐。
 * Decode boundary for WK3 AQ: return null when a requested AQ product fails to read
 * or decode so the caller keeps the original package; a physically missing AQ is not
 * a failure and yields an object without airQuality so the caller may backfill it.
 */
class WeatherKit3Processor extends FlatBufferRootProcessor {
    decode(byteBuffer, rootNames = []) {
        const { json, failures } = this.decodeWithReport(byteBuffer, rootNames);
        if (failures.some(failure => failure.name === "airQuality")) return null;
        return json;
    }
}

/**
 * 使用 Weather 根模型和产品 codec 配置通用根表处理器。
 * 首轮只注册根槽 0；其余 WK3 产品保持原始 arena，不按访问器顺序推断稀疏槽位。
 * Configure the generic root-table processor with the Weather model and product codecs.
 * Register root slot 0 only; preserve other products without inferring sparse slot IDs from accessor order.
 */
const WeatherKit3 = new WeatherKit3Processor({
    codecs: {
        airQuality: { decode: decodeAirQuality, encode: encodeAirQuality, tableClass: WK3.AirQuality },
    },
    configurableRootNames: ["airQuality"],
    name: "WeatherKit3",
    rootClass: WK3.Weather,
});

export default WeatherKit3;

/**
 * 编码空气质量产品表。标量超宽或非有限浓度抛 RangeError，由处理器隔离为单 slot 失败。
 * Encode the air quality product table. Out-of-range scalars or non-finite amounts throw.
 * @param {import("flatbuffers").Builder} builder - FlatBuffer 构建器 / FlatBuffer builder.
 * @param {object} data - 业务空气质量对象 / Air quality payload.
 * @returns {number} 产品表偏移 / Table offset.
 */
function encodeAirQuality(builder, data) {
    if (!Number.isInteger(data.index) || data.index < 0 || data.index > 32767 || !Number.isInteger(data.categoryIndex) || data.categoryIndex < 0 || data.categoryIndex > 127) {
        throw new RangeError("WK3 AQ scalar out of range");
    }
    const metadataOffset = encodeMetadata(builder, data.metadata);
    const pollutantsOffset = WK3.AirQuality.createPollutantsVector(
        builder,
        data.pollutants.map(pollutant => {
            if (!Number.isFinite(Math.fround(pollutant.amount))) throw new RangeError("WK3 pollutant amount must be finite");
            return WK3.Pollutant.createPollutant(builder, enumValue(WK3.PollutantType, pollutant.pollutantType), pollutant.amount, enumValue(WK3.UnitType, pollutant.units));
        }),
    );
    const scaleOffset = builder.createString(data.scale);
    return WK3.AirQuality.createAirQuality(builder, metadataOffset, data.categoryIndex, data.index, data.isSignificant, pollutantsOffset, enumValue(WK3.ComparisonTrend, data.previousDayComparison), enumValue(WK3.PollutantType, data.primaryPollutant), scaleOffset);
}

/**
 * 解码空气质量产品表；未验证字段或未知枚举值抛 RangeError。
 * Decode the air quality product table; unverified fields or unknown enums throw.
 * @param {WK3.AirQuality} data - 生成的 AQ 表实例 / Generated AQ table instance.
 * @returns {object} 业务空气质量对象 / Air quality payload.
 */
function decodeAirQuality(data) {
    checkFields(data, 8);
    const pollutants = [];
    for (let i = 0; i < data.pollutantsLength(); i++) {
        const pollutant = data.pollutants(i);
        checkFields(pollutant, 3);
        pollutants.push({
            pollutantType: enumName(WK3.PollutantType, pollutant.pollutantType()),
            amount: pollutant.amount(),
            units: enumName(WK3.UnitType, pollutant.units()),
        });
    }
    return {
        metadata: decodeMetadata(data.metadata()),
        categoryIndex: data.categoryIndex(),
        index: data.index(),
        isSignificant: data.isSignificant(),
        pollutants,
        previousDayComparison: enumName(WK3.ComparisonTrend, data.previousDayComparison()),
        primaryPollutant: enumName(WK3.PollutantType, data.primaryPollutant()),
        scale: data.scale(),
    };
}

/**
 * 编码产品元数据子表；缺失时返回 0（不写入）。
 * Encode the metadata child table; returns 0 when absent.
 * @param {import("flatbuffers").Builder} builder - FlatBuffer 构建器 / FlatBuffer builder.
 * @param {object} [data] - 元数据对象 / Metadata payload.
 * @returns {number} 子表偏移 / Table offset.
 */
function encodeMetadata(builder, data) {
    if (!data) return 0;
    return WK3.Metadata.createMetadata(
        builder,
        builder.createString(data.attributionUrl),
        data.expireTime,
        builder.createString(data.language),
        data.latitude,
        data.longitude,
        builder.createString(data.providerLogo),
        builder.createString(data.providerName),
        data.readTime,
        data.reportedTime,
        data.temporarilyUnavailable,
        enumValue(WK3.SourceType, data.sourceType),
    );
}

/**
 * 解码产品元数据子表；缺失时返回 undefined。
 * Decode the metadata child table; returns undefined when absent.
 * @param {WK3.Metadata} [data] - 生成的元数据表实例 / Generated metadata table instance.
 * @returns {object|undefined} 元数据对象 / Metadata payload.
 */
function decodeMetadata(data) {
    if (!data) return undefined;
    checkFields(data, 11);
    return {
        attributionUrl: data.attributionUrl(),
        expireTime: data.expireTime(),
        language: data.language(),
        latitude: data.latitude(),
        longitude: data.longitude(),
        providerLogo: data.providerLogo(),
        providerName: data.providerName(),
        readTime: data.readTime(),
        reportedTime: data.reportedTime(),
        temporarilyUnavailable: data.temporarilyUnavailable(),
        sourceType: enumName(WK3.SourceType, data.sourceType()),
    };
}

/**
 * 校验表的字段数不超过已验证范围；超出时抛 RangeError，由处理器隔离为单 slot 失败。
 * Validate that a table declares no more than the verified field count; excess throws.
 * @param {WK3.AirQuality|WK3.Metadata|WK3.Pollutant} table - 生成的表实例 / Generated table instance.
 * @param {number} count - 已验证的字段数 / Verified field count.
 * @returns {void}
 */
function checkFields(table, count) {
    // 超出已验证字段数的表结构抛 RangeError，由处理器隔离为单 slot 失败。
    // Tables declaring more than the verified field count throw, isolated as per-slot failures.
    inspectTable(table.bb, table.bb_pos, count);
}

/**
 * 将 wire 枚举值映射为名称；未知或占位值抛 RangeError。
 * Map a wire enum value to its name; unknown or placeholder values throw.
 * @param {object} values - 版本枚举表 / Versioned enum table.
 * @param {number} value - wire 枚举值 / Wire enum value.
 * @returns {string} 枚举名称 / Enum name.
 */
function enumName(values, value) {
    const name = values[value];
    if (typeof name !== "string" || /^UNKNOWN\d+$/.test(name)) throw new RangeError(`Unverified WK3 AQ enum: ${value}`);
    return name;
}

/**
 * 将枚举名称映射为 wire 枚举值；未知或占位名抛 RangeError。
 * Map an enum name to its wire value; unknown or placeholder names throw.
 * @param {object} values - 版本枚举表 / Versioned enum table.
 * @param {string} name - 枚举名称 / Enum name.
 * @returns {number} wire 枚举值 / Wire enum value.
 */
function enumValue(values, name) {
    const value = values[name];
    if (typeof value !== "number" || /^UNKNOWN\d+$/.test(name)) throw new RangeError(`Unverified WK3 AQ enum: ${name}`);
    return value;
}
