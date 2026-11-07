import { FlatBufferRootProcessor, inspectTable } from "@nsnanocat/flatbuffer-root";
import { WK3 } from "@nsringo/weatherkit";
import { createUuidOffset, decodeUuid } from "./WeatherKit2.mjs";

/**
 * 使用 Weather 根模型和产品 codec 配置通用根表处理器。
 * WK3 根槽位稀疏（0/5/9），各 codec 以显式 slot 对齐线槽位；其余产品保持原始 arena。
 * Configure the generic root-table processor with the Weather model and product codecs.
 * WK3 root slots are sparse (0/5/9); each codec aligns to its wire slot explicitly, other products keep their original arenas.
 */
const WeatherKit3 = new FlatBufferRootProcessor({
    codecs: {
        airQuality: { decode: decodeAirQuality, encode: encodeAirQuality, tableClass: WK3.AirQuality },
        forecastNextHour: { decode: decodeForecastNextHour, encode: encodeForecastNextHour, tableClass: WK3.NextHourForecastData },
        weatherAlerts: { decode: decodeWeatherAlerts, encode: encodeWeatherAlerts, tableClass: WK3.WeatherAlertCollectionData },
    },
    configurableRootNames: ["airQuality", "forecastNextHour", "weatherAlerts"],
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
 * 编码下一小时降水产品表；仅供注入缺失产品使用，不重编码 Apple 原始数据。
 * Encode the next-hour precipitation product table; only used to inject a missing product, never to re-encode Apple's own data.
 * @param {import("flatbuffers").Builder} builder - FlatBuffer 构建器 / FlatBuffer builder.
 * @param {object} data - 业务下一小时降水对象 / Next-hour precipitation payload.
 * @returns {number} 产品表偏移 / Table offset.
 */
function encodeForecastNextHour(builder, data) {
    const metadataOffset = encodeMetadata(builder, data.metadata);
    // 防御第三方数据：未知枚举传给 FlatBuffer 会静默编码为 UNKNOWN0。
    // Defend against third-party data: unknown enums would otherwise be silently encoded as UNKNOWN0.
    const conditionOffsets = data.condition
        .filter(condition => typeof WK3.ForecastToken[condition.forecastToken] === "number" && [condition.beginCondition, condition.endCondition].every(value => typeof WK3.ConditionType[value] === "number"))
        .map(condition => {
            const parametersOffset = WK3.Condition.createParametersVector(
                builder,
                condition.parameters.map(parameter => WK3.Parameter.createParameter(builder, enumValue(WK3.ParameterType, parameter.type), parameter.date)),
            );
            return WK3.Condition.createCondition(builder, condition.startTime, condition.endTime, enumValue(WK3.ForecastToken, condition.forecastToken), enumValue(WK3.ConditionType, condition.beginCondition), enumValue(WK3.ConditionType, condition.endCondition), parametersOffset);
        });
    const conditionOffset = WK3.NextHourForecastData.createConditionVector(builder, conditionOffsets);
    // 摘要槽位 2 的 condition 枚举向量元素宽度未验证，不写入。
    // Slot 2 of summaries (condition enum vector) is unverified and not written.
    const summaryOffset = WK3.NextHourForecastData.createSummaryVector(
        builder,
        data.summary.map(summary => WK3.ForecastPeriodSummary.createForecastPeriodSummary(builder, summary.startTime, summary.endTime, summary.precipitationChance, summary.precipitationIntensity)),
    );
    const minutesOffset = WK3.NextHourForecastData.createMinutesVector(
        builder,
        data.minutes.map(minute => WK3.Common.ForecastMinute.createForecastMinute(builder, minute.startTime, minute.precipitationChance, minute.precipitationIntensity, minute.perceivedPrecipitationIntensity)),
    );
    return WK3.NextHourForecastData.createNextHourForecastData(builder, metadataOffset, conditionOffset, summaryOffset, data.forecastStart, data.forecastEnd, minutesOffset);
}

/**
 * 解码下一小时降水产品表；未验证字段或未知枚举值抛 RangeError。
 * Decode the next-hour precipitation product table; unverified fields or unknown enums throw.
 * @param {WK3.NextHourForecastData} data - 生成的下一小时降水表实例 / Generated next-hour table instance.
 * @returns {object} 业务下一小时降水对象 / Next-hour precipitation payload.
 */
function decodeForecastNextHour(data) {
    checkFields(data, 6);
    const NextHourForecastData = data;
    const condition = [];
    for (let i = 0; i < NextHourForecastData.conditionLength(); i++) {
        const conditionData = NextHourForecastData.condition(i);
        checkFields(conditionData, 6);
        const entry = {
            beginCondition: enumName(WK3.ConditionType, conditionData.beginCondition()),
            endCondition: enumName(WK3.ConditionType, conditionData.endCondition()),
            endTime: conditionData.endTime(),
            forecastToken: enumName(WK3.ForecastToken, conditionData.forecastToken()),
            parameters: [],
            startTime: conditionData.startTime(),
        };
        for (let j = 0; j < conditionData.parametersLength(); j++) {
            const parameter = conditionData.parameters(j);
            checkFields(parameter, 2);
            entry.parameters.push({ date: parameter.date(), type: enumName(WK3.ParameterType, parameter.type()) });
        }
        condition.push(entry);
    }
    const minutes = [];
    for (let i = 0; i < NextHourForecastData.minutesLength(); i++) {
        const minute = NextHourForecastData.minutes(i);
        checkFields(minute, 4);
        minutes.push({
            perceivedPrecipitationIntensity: minute.perceivedPrecipitationIntensity(),
            precipitationChance: minute.precipitationChance(),
            precipitationIntensity: minute.precipitationIntensity(),
            startTime: minute.startTime(),
        });
    }
    const summary = [];
    for (let i = 0; i < NextHourForecastData.summaryLength(); i++) {
        const summaryData = NextHourForecastData.summary(i);
        checkFields(summaryData, 5);
        // 摘要槽位 2 的 condition 枚举向量元素宽度未验证，不解码。
        // Slot 2 of summaries (condition enum vector) is unverified and not decoded.
        summary.push({
            endTime: summaryData.endTime(),
            precipitationChance: summaryData.precipitationChance(),
            precipitationIntensity: summaryData.precipitationIntensity(),
            startTime: summaryData.startTime(),
        });
    }
    return {
        metadata: decodeMetadata(NextHourForecastData.metadata()),
        condition,
        forecastEnd: NextHourForecastData.forecastEnd(),
        forecastStart: NextHourForecastData.forecastStart(),
        minutes,
        summary,
    };
}

/**
 * 编码气象预警集合产品表。
 * Encode the weather alert collection product table.
 * @param {import("flatbuffers").Builder} builder - FlatBuffer 构建器 / FlatBuffer builder.
 * @param {object} data - 业务气象预警集合对象 / Weather alert collection payload.
 * @returns {number} 产品表偏移 / Table offset.
 */
function encodeWeatherAlerts(builder, data) {
    // 缺省字符串不写入（0 偏移），保留 Apple 原始字段缺席状态。
    // Absent strings are not written (0 offset), preserving Apple's original field absence.
    const stringOffset = value => (value ? builder.createString(value) : 0);
    const metadataOffset = encodeMetadata(builder, data.metadata);
    const alertsOffsets = data.alerts.map(alert => {
        const responsesOffset = WK3.WeatherAlertSummary.createResponsesVector(
            builder,
            alert.responses.map(response => enumValue(WK3.ResponseType, response)),
        );
        return WK3.WeatherAlertSummary.createWeatherAlertSummary(
            builder,
            createUuidOffset(builder, alert.id),
            stringOffset(alert.areaId),
            stringOffset(alert.attributionUrl),
            stringOffset(alert.countryCode),
            stringOffset(alert.description),
            stringOffset(alert.token),
            alert.effectiveTime,
            alert.expireTime,
            alert.issuedTime,
            alert.eventOnsetTime,
            alert.eventEndTime,
            stringOffset(alert.detailsUrl),
            stringOffset(alert.phenomenon),
            enumValue(WK3.Severity, alert.severity),
            enumValue(WK3.SignificanceType, alert.significance),
            stringOffset(alert.source),
            stringOffset(alert.eventSource),
            enumValue(WK3.Urgency, alert.urgency),
            enumValue(WK3.Certainty, alert.certainty),
            enumValue(WK3.ImportanceType, alert.importance),
            responsesOffset,
        );
    });
    const alertsOffset = WK3.WeatherAlertCollectionData.createAlertsVector(builder, alertsOffsets);
    return WK3.WeatherAlertCollectionData.createWeatherAlertCollectionData(builder, metadataOffset, stringOffset(data.detailsUrl), alertsOffset);
}

/**
 * 解码气象预警集合产品表；未验证字段或未知枚举值抛 RangeError。
 * Decode the weather alert collection product table; unverified fields or unknown enums throw.
 * @param {WK3.WeatherAlertCollectionData} data - 生成的预警集合表实例 / Generated alert collection table instance.
 * @returns {object} 业务气象预警集合对象 / Weather alert collection payload.
 */
function decodeWeatherAlerts(data) {
    checkFields(data, 3);
    const WeatherAlertCollectionData = data;
    const alerts = [];
    for (let i = 0; i < WeatherAlertCollectionData.alertsLength(); i++) {
        const alert = WeatherAlertCollectionData.alerts(i);
        checkFields(alert, 22);
        const summary = {
            areaId: alert.areaId(),
            attributionUrl: alert.attributionUrl(),
            certainty: enumName(WK3.Certainty, alert.certainty()),
            countryCode: alert.countryCode(),
            description: alert.description(),
            detailsUrl: alert.detailsUrl(),
            effectiveTime: alert.effectiveTime(),
            eventEndTime: alert.eventEndTime(),
            eventOnsetTime: alert.eventOnsetTime(),
            eventSource: alert.eventSource(),
            expireTime: alert.expireTime(),
            id: decodeUuid(alert.id()),
            importance: enumName(WK3.ImportanceType, alert.importance()),
            issuedTime: alert.issuedTime(),
            phenomenon: alert.phenomenon(),
            responses: [],
            severity: enumName(WK3.Severity, alert.severity()),
            significance: enumName(WK3.SignificanceType, alert.significance()),
            source: alert.source(),
            token: alert.token(),
            urgency: enumName(WK3.Urgency, alert.urgency()),
        };
        for (let j = 0; j < alert.responsesLength(); j++) summary.responses.push(enumName(WK3.ResponseType, alert.responses(j)));
        alerts.push(summary);
    }
    return {
        metadata: decodeMetadata(WeatherAlertCollectionData.metadata()),
        alerts,
        detailsUrl: WeatherAlertCollectionData.detailsUrl(),
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
    // 缺省字符串不写入（0 偏移），保留 Apple 原始字段缺席状态。
    // Absent strings are not written (0 offset), preserving Apple's original field absence.
    const stringOffset = value => (value ? builder.createString(value) : 0);
    return WK3.Metadata.createMetadata(
        builder,
        stringOffset(data.attributionUrl),
        data.expireTime,
        stringOffset(data.language),
        data.latitude,
        data.longitude,
        stringOffset(data.providerLogo),
        stringOffset(data.providerName),
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
 * @param {object} table - 生成的表实例 / Generated table instance.
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
    if (typeof name !== "string" || /^UNKNOWN\d+$/.test(name)) throw new RangeError(`Unverified WK3 enum: ${value}`);
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
    if (typeof value !== "number" || /^UNKNOWN\d+$/.test(name)) throw new RangeError(`Unverified WK3 enum: ${name}`);
    return value;
}
