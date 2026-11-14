import "../function/ensureTextEncoder.mjs";
import { FlatBufferRootProcessor } from "@nsnanocat/flatbuffer-root";
import * as WK2 from "@nsringo/weatherkit";
import database from "../function/database.mjs";
import { decodedVectorLength, newDecodeBudget } from "../function/weatherMemoryLimits.mjs";

/**
 * 使用 Weather 根模型和产品 codec 配置通用根表处理器。
 * Configure the generic root-table processor with the Weather model and product codecs.
 */
const WeatherKit2 = new FlatBufferRootProcessor({
    codecs: {
        airQuality: { decode: decodeAirQuality, encode: encodeAirQuality, tableClass: WK2.AirQuality },
        currentWeather: { decode: decodeCurrentWeather, encode: encodeCurrentWeather, tableClass: WK2.CurrentWeatherData },
        forecastDaily: { decode: decodeForecastDaily, encode: encodeForecastDaily, tableClass: WK2.DailyForecastData },
        forecastHourly: { decode: decodeForecastHourly, encode: encodeForecastHourly, tableClass: WK2.HourlyForecastData },
        forecastNextHour: { decode: decodeForecastNextHour, encode: encodeForecastNextHour, tableClass: WK2.NextHourForecastData },
        historicalComparisons: { decode: decodeHistoricalComparisons, encode: encodeHistoricalComparisons, tableClass: WK2.HistoricalComparison },
        locationInfo: { decode: decodeLocationInfo, encode: encodeLocationInfo, tableClass: WK2.LocationInfo },
        news: { decode: decodeNews, encode: encodeNews, tableClass: WK2.News },
        weatherAlerts: { decode: decodeWeatherAlerts, encode: encodeWeatherAlerts, tableClass: WK2.WeatherAlertCollectionData },
        weatherChanges: { decode: decodeWeatherChanges, encode: encodeWeatherChanges, tableClass: WK2.WeatherChanges },
    },
    configurableRootNames: database.WeatherKit.Settings.DataSets,
    name: "WeatherKit2",
    rootClass: WK2.Weather,
});

// O(1) table presence probe; no minute vector decoding or copying.
export function hasForecastNextHour(byteBuffer) {
    try {
        return Boolean(WK2.Weather.getRootAsWeather(byteBuffer).forecastNextHour());
    } catch {
        return false;
    }
}

export default WeatherKit2;

function encodeAirQuality(builder, data) {
    const metadataOffset = encodeMetadata(builder, data.metadata);
    const pollutantsOffset = WK2.AirQuality.createPollutantsVector(
        builder,
        data.pollutants.map(p => WK2.Pollutant.createPollutant(builder, WK2.PollutantType[p.pollutantType], p.amount, WK2.UnitType[p.units])),
    );
    const scaleOffset = builder.createString(data.scale);
    return WK2.AirQuality.createAirQuality(builder, metadataOffset, data.categoryIndex, data.index, data.isSignificant, pollutantsOffset, WK2.ComparisonTrend[data.previousDayComparison], WK2.PollutantType[data.primaryPollutant], scaleOffset);
}

function encodeCurrentWeather(builder, data) {
    const metadataOffset = encodeMetadata(builder, data.metadata);
    const precipitationAmountNext1hByTypeOffset = WK2.CurrentWeatherData.createPrecipitationAmountNext1hByTypeVector(
        builder,
        (data.precipitationAmountNext1hByType ?? []).map(p => WK2.PrecipitationAmountByType.createPrecipitationAmountByType(builder, WK2.PrecipitationType[p.precipitationType], p.expected, p.minimumSnow, p.maximumSnow, p.expectedSnow)),
    );
    const precipitationAmountNext24hByTypeOffset = WK2.CurrentWeatherData.createPrecipitationAmountNext24hByTypeVector(
        builder,
        (data.precipitationAmountNext24hByType ?? []).map(p => WK2.PrecipitationAmountByType.createPrecipitationAmountByType(builder, WK2.PrecipitationType[p.precipitationType], p.expected, p.minimumSnow, p.maximumSnow, p.expectedSnow)),
    );
    const precipitationAmountNext6hByTypeOffset = WK2.CurrentWeatherData.createPrecipitationAmountNext6hByTypeVector(
        builder,
        (data.precipitationAmountNext6hByType ?? []).map(p => WK2.PrecipitationAmountByType.createPrecipitationAmountByType(builder, WK2.PrecipitationType[p.precipitationType], p.expected, p.minimumSnow, p.maximumSnow, p.expectedSnow)),
    );
    const precipitationAmountPrevious1hByTypeOffset = WK2.CurrentWeatherData.createPrecipitationAmountPrevious1hByTypeVector(
        builder,
        (data.precipitationAmountPrevious1hByType ?? []).map(p => WK2.PrecipitationAmountByType.createPrecipitationAmountByType(builder, WK2.PrecipitationType[p.precipitationType], p.expected, p.minimumSnow, p.maximumSnow, p.expectedSnow)),
    );
    const precipitationAmountPrevious24hByTypeOffset = WK2.CurrentWeatherData.createPrecipitationAmountPrevious24hByTypeVector(
        builder,
        (data.precipitationAmountPrevious24hByType ?? []).map(p => WK2.PrecipitationAmountByType.createPrecipitationAmountByType(builder, WK2.PrecipitationType[p.precipitationType], p.expected, p.minimumSnow, p.maximumSnow, p.expectedSnow)),
    );
    const precipitationAmountPrevious6hByTypeOffset = WK2.CurrentWeatherData.createPrecipitationAmountPrevious6hByTypeVector(
        builder,
        (data.precipitationAmountPrevious6hByType ?? []).map(p => WK2.PrecipitationAmountByType.createPrecipitationAmountByType(builder, WK2.PrecipitationType[p.precipitationType], p.expected, p.minimumSnow, p.maximumSnow, p.expectedSnow)),
    );
    return WK2.CurrentWeatherData.createCurrentWeatherData(
        builder,
        metadataOffset,
        data.asOf,
        data.cloudCover,
        data.cloudCoverLowAltPct,
        data.cloudCoverMidAltPct,
        data.cloudCoverHighAltPct,
        WK2.WeatherCondition[data.conditionCode],
        data.daylight,
        data.humidity,
        data.perceivedPrecipitationIntensity,
        data.precipitationAmount1h,
        data.precipitationAmount6h,
        data.precipitationAmount24h,
        data.precipitationAmountNext1h,
        data.precipitationAmountNext6h,
        data.precipitationAmountNext24h,
        precipitationAmountNext1hByTypeOffset,
        precipitationAmountNext6hByTypeOffset,
        precipitationAmountNext24hByTypeOffset,
        precipitationAmountPrevious1hByTypeOffset,
        precipitationAmountPrevious6hByTypeOffset,
        precipitationAmountPrevious24hByTypeOffset,
        data.precipitationIntensity,
        data.pressure,
        WK2.PressureTrend[data.pressureTrend],
        data.snowfallAmount1h,
        data.snowfallAmount6h,
        data.snowfallAmount24h,
        data.snowfallAmountNext1h,
        data.snowfallAmountNext6h,
        data.snowfallAmountNext24h,
        data.temperature,
        data.temperatureApparent,
        data.unknown34,
        data.temperatureDewPoint,
        data.uvIndex,
        data.visibility,
        data.windDirection,
        data.windGust,
        data.windSpeed,
    );
}

function encodeForecastDaily(builder, data) {
    const metadataOffset = encodeMetadata(builder, data.metadata);
    const daysOffsets = data.days.map(day => {
        const Offsets = {};
        Offsets.precipitationAmountByTypeOffest = WK2.DayWeatherConditions.createPrecipitationAmountByTypeVector(
            builder,
            day.precipitationAmountByType.map(p => WK2.PrecipitationAmountByType.createPrecipitationAmountByType(builder, WK2.PrecipitationType[p.precipitationType], p.expected, p.minimumSnow, p.maximumSnow, p.expectedSnow)),
        );
        if (day.daytimeForecast) {
            Offsets.daytimeForecastPrecipitationAmountByTypeOffest = WK2.DayPartForecast.createPrecipitationAmountByTypeVector(
                builder,
                day.daytimeForecast.precipitationAmountByType.map(p => WK2.PrecipitationAmountByType.createPrecipitationAmountByType(builder, WK2.PrecipitationType[p.precipitationType], p.expected, p.minimumSnow, p.maximumSnow, p.expectedSnow)),
            );
            Offsets.daytimeForecastOffset = WK2.DayPartForecast.createDayPartForecast(
                builder,
                day.daytimeForecast.forecastStart,
                day.daytimeForecast.forecastEnd,
                day.daytimeForecast.cloudCover,
                day.daytimeForecast.cloudCoverLowAltPct,
                day.daytimeForecast.cloudCoverMidAltPct,
                day.daytimeForecast.cloudCoverHighAltPct,
                WK2.WeatherCondition[day.daytimeForecast.conditionCode],
                day.daytimeForecast.humidity,
                day.daytimeForecast.humidityMax,
                day.daytimeForecast.humidityMin,
                day.daytimeForecast.precipitationAmount,
                Offsets.daytimeForecastPrecipitationAmountByTypeOffest,
                day.daytimeForecast.precipitationChance,
                WK2.PrecipitationType[day.daytimeForecast.precipitationType],
                day.daytimeForecast.snowfallAmount,
                day.daytimeForecast.temperatureMax,
                day.daytimeForecast.temperatureMin,
                day.daytimeForecast.visibilityMax,
                day.daytimeForecast.visibilityMin,
                day.daytimeForecast.windDirection,
                day.daytimeForecast.windGustSpeedMax,
                day.daytimeForecast.windSpeed,
                day.daytimeForecast.windSpeedMax,
                day.daytimeForecast.precipitationIntensityMax,
                day.daytimeForecast.perceivedPrecipitationIntensityMax,
                day.daytimeForecast.uvIndexMin,
                day.daytimeForecast.uvIndexMax,
                day.daytimeForecast.temperatureApparentMin,
                day.daytimeForecast.temperatureApparentMax,
                day.daytimeForecast.daylight,
            );
        }
        if (day.overnightForecast) {
            Offsets.overnightForecastPrecipitationAmountByTypeOffest = WK2.DayPartForecast.createPrecipitationAmountByTypeVector(
                builder,
                day.overnightForecast.precipitationAmountByType.map(p => WK2.PrecipitationAmountByType.createPrecipitationAmountByType(builder, WK2.PrecipitationType[p.precipitationType], p.expected, p.minimumSnow, p.maximumSnow, p.expectedSnow)),
            );
            Offsets.overnightForecastOffset = WK2.DayPartForecast.createDayPartForecast(
                builder,
                day.overnightForecast.forecastStart,
                day.overnightForecast.forecastEnd,
                day.overnightForecast.cloudCover,
                day.overnightForecast.cloudCoverLowAltPct,
                day.overnightForecast.cloudCoverMidAltPct,
                day.overnightForecast.cloudCoverHighAltPct,
                WK2.WeatherCondition[day.overnightForecast.conditionCode],
                day.overnightForecast.humidity,
                day.overnightForecast.humidityMax,
                day.overnightForecast.humidityMin,
                day.overnightForecast.precipitationAmount,
                Offsets.overnightForecastPrecipitationAmountByTypeOffest,
                day.overnightForecast.precipitationChance,
                WK2.PrecipitationType[day.overnightForecast.precipitationType],
                day.overnightForecast.snowfallAmount,
                day.overnightForecast.temperatureMax,
                day.overnightForecast.temperatureMin,
                day.overnightForecast.visibilityMax,
                day.overnightForecast.visibilityMin,
                day.overnightForecast.windDirection,
                day.overnightForecast.windGustSpeedMax,
                day.overnightForecast.windSpeed,
                day.overnightForecast.windSpeedMax,
                day.overnightForecast.precipitationIntensityMax,
                day.overnightForecast.perceivedPrecipitationIntensityMax,
                day.overnightForecast.uvIndexMin,
                day.overnightForecast.uvIndexMax,
                day.overnightForecast.temperatureApparentMin,
                day.overnightForecast.temperatureApparentMax,
                day.overnightForecast.daylight,
            );
        }
        if (day.restOfDayForecast) {
            Offsets.restOfDayForecastPrecipitationAmountByTypeOffest = WK2.DayPartForecast.createPrecipitationAmountByTypeVector(
                builder,
                day.restOfDayForecast.precipitationAmountByType.map(p => WK2.PrecipitationAmountByType.createPrecipitationAmountByType(builder, WK2.PrecipitationType[p.precipitationType], p.expected, p.minimumSnow, p.maximumSnow, p.expectedSnow)),
            );
            Offsets.restOfDayForecastOffset = WK2.DayPartForecast.createDayPartForecast(
                builder,
                day.restOfDayForecast.forecastStart,
                day.restOfDayForecast.forecastEnd,
                day.restOfDayForecast.cloudCover,
                day.restOfDayForecast.cloudCoverLowAltPct,
                day.restOfDayForecast.cloudCoverMidAltPct,
                day.restOfDayForecast.cloudCoverHighAltPct,
                WK2.WeatherCondition[day.restOfDayForecast.conditionCode],
                day.restOfDayForecast.humidity,
                day.restOfDayForecast.humidityMax,
                day.restOfDayForecast.humidityMin,
                day.restOfDayForecast.precipitationAmount,
                Offsets.restOfDayForecastPrecipitationAmountByTypeOffest,
                day.restOfDayForecast.precipitationChance,
                WK2.PrecipitationType[day.restOfDayForecast.precipitationType],
                day.restOfDayForecast.snowfallAmount,
                day.restOfDayForecast.temperatureMax,
                day.restOfDayForecast.temperatureMin,
                day.restOfDayForecast.visibilityMax,
                day.restOfDayForecast.visibilityMin,
                day.restOfDayForecast.windDirection,
                day.restOfDayForecast.windGustSpeedMax,
                day.restOfDayForecast.windSpeed,
                day.restOfDayForecast.windSpeedMax,
                day.restOfDayForecast.precipitationIntensityMax,
                day.restOfDayForecast.perceivedPrecipitationIntensityMax,
                day.restOfDayForecast.uvIndexMin,
                day.restOfDayForecast.uvIndexMax,
                day.restOfDayForecast.temperatureApparentMin,
                day.restOfDayForecast.temperatureApparentMax,
                day.restOfDayForecast.daylight,
            );
        }
        WK2.DayWeatherConditions.startDayWeatherConditions(builder);
        WK2.DayWeatherConditions.addForecastStart(builder, day.forecastStart);
        WK2.DayWeatherConditions.addForecastEnd(builder, day.forecastEnd);
        WK2.DayWeatherConditions.addConditionCode(builder, WK2.WeatherCondition[day.conditionCode]);
        WK2.DayWeatherConditions.addHumidityMax(builder, day.humidityMax);
        WK2.DayWeatherConditions.addHumidityMin(builder, day.humidityMin);
        WK2.DayWeatherConditions.addMaxUvIndex(builder, day.maxUvIndex);
        WK2.DayWeatherConditions.addMoonPhase(builder, WK2.MoonPhase[day.moonPhase]);
        WK2.DayWeatherConditions.addMoonrise(builder, day.moonrise);
        WK2.DayWeatherConditions.addMoonset(builder, day.moonset);
        WK2.DayWeatherConditions.addPrecipitationAmount(builder, day.precipitationAmount);
        WK2.DayWeatherConditions.addPrecipitationAmountByType(builder, Offsets.precipitationAmountByTypeOffest);
        WK2.DayWeatherConditions.addPrecipitationChance(builder, day.precipitationChance);
        WK2.DayWeatherConditions.addPrecipitationType(builder, WK2.PrecipitationType[day.precipitationType]);
        WK2.DayWeatherConditions.addSnowfallAmount(builder, day.snowfallAmount);
        WK2.DayWeatherConditions.addSolarMidnight(builder, day.solarMidnight);
        WK2.DayWeatherConditions.addSolarNoon(builder, day.solarNoon);
        WK2.DayWeatherConditions.addSunrise(builder, day.sunrise);
        WK2.DayWeatherConditions.addSunriseCivil(builder, day.sunriseCivil);
        WK2.DayWeatherConditions.addSunriseNautical(builder, day.sunriseNautical);
        WK2.DayWeatherConditions.addSunriseAstronomical(builder, day.sunriseAstronomical);
        WK2.DayWeatherConditions.addSunset(builder, day.sunset);
        WK2.DayWeatherConditions.addSunsetCivil(builder, day.sunsetCivil);
        WK2.DayWeatherConditions.addSunsetNautical(builder, day.sunsetNautical);
        WK2.DayWeatherConditions.addSunsetAstronomical(builder, day.sunsetAstronomical);
        WK2.DayWeatherConditions.addTemperatureMax(builder, day.temperatureMax);
        WK2.DayWeatherConditions.addTemperatureMaxTime(builder, day.temperatureMaxTime);
        WK2.DayWeatherConditions.addTemperatureMin(builder, day.temperatureMin);
        WK2.DayWeatherConditions.addTemperatureMinTime(builder, day.temperatureMinTime);
        WK2.DayWeatherConditions.addVisibilityMax(builder, day.visibilityMax);
        WK2.DayWeatherConditions.addVisibilityMin(builder, day.visibilityMin);
        WK2.DayWeatherConditions.addWindGustSpeedMax(builder, day.windGustSpeedMax);
        WK2.DayWeatherConditions.addWindSpeedAvg(builder, day.windSpeedAvg);
        WK2.DayWeatherConditions.addWindSpeedMax(builder, day.windSpeedMax);
        if (day.daytimeForecast) WK2.DayWeatherConditions.addDaytimeForecast(builder, Offsets.daytimeForecastOffset);
        if (day.overnightForecast) WK2.DayWeatherConditions.addOvernightForecast(builder, Offsets.overnightForecastOffset);
        if (day.restOfDayForecast) WK2.DayWeatherConditions.addRestOfDayForecast(builder, Offsets.restOfDayForecastOffset);
        return WK2.DayWeatherConditions.endDayWeatherConditions(builder);
    });
    const daysOffset = WK2.DailyForecastData.createDaysVector(builder, daysOffsets);
    return WK2.DailyForecastData.createDailyForecastData(builder, metadataOffset, daysOffset);
}

function encodeForecastHourly(builder, data) {
    const metadataOffset = encodeMetadata(builder, data.metadata);
    const hoursOffsets = data.hours.map(hour =>
        WK2.HourWeatherConditions.createHourWeatherConditions(
            builder,
            hour.forecastStart,
            hour.cloudCover,
            hour.cloudCoverLowAltPct,
            hour.cloudCoverMidAltPct,
            hour.cloudCoverHighAltPct,
            WK2.WeatherCondition[hour.conditionCode],
            hour.daylight,
            hour.humidity,
            hour.perceivedPrecipitationIntensity,
            hour.precipitationAmount,
            hour.precipitationIntensity,
            hour.precipitationChance,
            WK2.PrecipitationType[hour.precipitationType],
            hour.pressure,
            WK2.PressureTrend[hour.pressureTrend],
            hour.snowfallAmount,
            hour.snowfallIntensity,
            hour.temperature,
            hour.temperatureApparent,
            hour.unknown20,
            hour.temperatureDewPoint,
            hour.uvIndex,
            hour.visibility,
            hour.windDirection,
            hour.windGust,
            hour.windSpeed,
        ),
    );
    const hoursOffset = WK2.HourlyForecastData.createHoursVector(builder, hoursOffsets);
    return WK2.HourlyForecastData.createHourlyForecastData(builder, metadataOffset, hoursOffset);
}

function encodeForecastNextHour(builder, data) {
    const metadataOffset = encodeMetadata(builder, data.metadata);
    // 防御第三方数据：未知枚举传给 FlatBuffer 会静默编码为 CLEAR。
    // Defend against third-party data: unknown enums would otherwise be silently encoded as CLEAR.
    const conditionOffsets = data.condition
        .filter(condition => [condition.beginCondition, condition.endCondition].every(value => typeof WK2.ConditionType[value] === "number"))
        .map(condition => {
            const parametersOffsets = condition.parameters.map(parameter => WK2.Parameter.createParameter(builder, WK2.ParameterType[parameter.type], parameter.date));
            const parametersOffset = WK2.Condition.createParametersVector(builder, parametersOffsets);
            return WK2.Condition.createCondition(builder, condition.startTime, condition.endTime, WK2.ForecastToken[condition.forecastToken], WK2.ConditionType[condition.beginCondition], WK2.ConditionType[condition.endCondition], parametersOffset);
        });
    const conditionOffset = WK2.NextHourForecastData.createConditionVector(builder, conditionOffsets);
    const summaryOffsets = data.summary.map(summary => WK2.ForecastPeriodSummary.createForecastPeriodSummary(builder, summary.startTime, summary.endTime, WK2.PrecipitationType[summary.condition], summary.precipitationChance, summary.precipitationIntensity));
    const summaryOffset = WK2.NextHourForecastData.createSummaryVector(builder, summaryOffsets);
    const minutesOffsets = data.minutes.map(minute => WK2.ForecastMinute.createForecastMinute(builder, minute.startTime, minute.precipitationChance, minute.precipitationIntensity, minute.perceivedPrecipitationIntensity));
    const minutesOffset = WK2.NextHourForecastData.createMinutesVector(builder, minutesOffsets);
    return WK2.NextHourForecastData.createNextHourForecastData(builder, metadataOffset, conditionOffset, summaryOffset, data.forecastStart, data.forecastEnd, minutesOffset);
}

function encodeNews(builder, data) {
    const metadataOffset = encodeMetadata(builder, data.metadata);
    const placementsOffsets = data.placements.map(placement => {
        const articlesOffsets = placement.articles.map(article => {
            const alertIdsOffsets = article.alertIds.map(alertId => createUuidOffset(builder, alertId)).filter(Boolean);
            const alertIdsOffset = WK2.Articles.createAlertIdsVector(builder, alertIdsOffsets);
            const headlineOverrideOffset = builder.createString(article.headlineOverride);
            const idOffset = builder.createString(article.id);
            const localeOffset = builder.createString(article.locale);
            const phenomenaOffset = WK2.Articles.createPhenomenaVector(
                builder,
                article.phenomena.map(phenomena => builder.createString(phenomena)),
            );
            const supportedStorefrontsOffset = WK2.Articles.createSupportedStorefrontsVector(
                builder,
                article.supportedStorefronts.map(supportedStorefront => builder.createString(supportedStorefront)),
            );
            return WK2.Articles.createArticles(builder, idOffset, supportedStorefrontsOffset, alertIdsOffset, phenomenaOffset, headlineOverrideOffset, localeOffset);
        });
        const articlesOffset = WK2.Placement.createArticlesVector(builder, articlesOffsets);
        return WK2.Placement.createPlacement(builder, placement.priority, articlesOffset, WK2.PlacementType[placement.placement]);
    });
    const placementsOffset = WK2.News.createPlacementsVector(builder, placementsOffsets);
    return WK2.News.createNews(builder, metadataOffset, placementsOffset);
}

function encodeWeatherAlerts(builder, data) {
    const metadataOffset = encodeMetadata(builder, data.metadata);
    const alertsOffsets = data.alerts.map(alert => {
        const responsesOffsets = alert.responses.map(response => WK2.ResponseType[response]);
        const responsesOffset = WK2.WeatherAlertSummary.createResponsesVector(builder, responsesOffsets);
        const idOffset = createUuidOffset(builder, alert.id);
        const areaIdOffset = builder.createString(alert.areaId);
        const areaNameOffset = builder.createString(alert.areaName);
        const attributionUrlOffset = builder.createString(alert.attributionUrl);
        const countryCodeOffset = builder.createString(alert.countryCode);
        const descriptionOffset = builder.createString(alert.description);
        const tokenOffset = builder.createString(alert.token);
        const detailsUrlOffset = builder.createString(alert.detailsUrl);
        const phenomenonOffset = builder.createString(alert.phenomenon);
        const sourceOffset = builder.createString(alert.source);
        const eventSourceOffset = builder.createString(alert.eventSource);
        return WK2.WeatherAlertSummary.createWeatherAlertSummary(
            builder,
            idOffset,
            areaIdOffset,
            areaNameOffset,
            attributionUrlOffset,
            countryCodeOffset,
            descriptionOffset,
            tokenOffset,
            alert.effectiveTime,
            alert.expireTime,
            alert.issuedTime,
            alert.eventOnsetTime,
            alert.eventEndTime,
            detailsUrlOffset,
            phenomenonOffset,
            WK2.Severity[alert.severity],
            WK2.SignificanceType[alert.significance],
            sourceOffset,
            eventSourceOffset,
            WK2.Urgency[alert.urgency],
            WK2.Certainty[alert.certainty],
            WK2.ImportanceType[alert.importance],
            responsesOffset,
            alert.unknown23,
            alert.unknown24,
            alert.unknown25,
            alert.unknown26,
        );
    });
    const alertsOffset = WK2.WeatherAlertCollectionData.createAlertsVector(builder, alertsOffsets);
    const detailsUrlOffset = builder.createString(data.detailsUrl);
    return WK2.WeatherAlertCollectionData.createWeatherAlertCollectionData(builder, metadataOffset, detailsUrlOffset, alertsOffset);
}

function encodeWeatherChanges(builder, data) {
    const metadataOffset = encodeMetadata(builder, data.metadata);
    const changesOffsets = data.changes.map(change => WK2.Change.createChange(builder, change.forecastStart, change.forecastEnd, WK2.Direction[change.maxTemperatureChange], WK2.Direction[change.minTemperatureChange], WK2.Direction[change.dayPrecipitationChange], WK2.Direction[change.nightPrecipitationChange]));
    const changesOffset = WK2.WeatherChanges.createChangesVector(builder, changesOffsets);
    return WK2.WeatherChanges.createWeatherChanges(builder, metadataOffset, data.forecastStart, data.forecastEnd, changesOffset);
}

function encodeHistoricalComparisons(builder, data) {
    const metadataOffset = encodeMetadata(builder, data.metadata);
    const comparisonsOffsets = data.comparisons.map(comparison => WK2.Comparison.createComparison(builder, WK2.ComparisonType[comparison.condition], comparison.currentValue, comparison.baselineValue, WK2.Deviation[comparison.deviation], comparison.baselineType, comparison.baselineStartDate));
    const comparisonsOffset = WK2.HistoricalComparison.createComparisonsVector(builder, comparisonsOffsets);
    return WK2.HistoricalComparison.createHistoricalComparison(builder, metadataOffset, comparisonsOffset);
}

function encodeLocationInfo(builder, data) {
    const metadataOffset = encodeMetadata(builder, data.metadata);
    return WK2.LocationInfo.createLocationInfo(builder, metadataOffset, builder.createString(data.preciseName), builder.createString(data.countryCode), builder.createString(data.timeZone), builder.createString(data.primaryName));
}

function decodeAirQuality(data) {
    const budget = newDecodeBudget();
    const AirQualityData = data;
    data = {
        metadata: decodeMetadata(AirQualityData.metadata()),
        categoryIndex: AirQualityData.categoryIndex(),
        index: AirQualityData.index(),
        isSignificant: AirQualityData.isSignificant(),
        pollutants: [],
        previousDayComparison: WK2.ComparisonTrend[AirQualityData.previousDayComparison()],
        primaryPollutant: WK2.PollutantType[AirQualityData.primaryPollutant()],
        scale: AirQualityData.scale(),
    };
    for (let i = 0, count = decodedVectorLength(AirQualityData.pollutantsLength(), budget); i < count; i++)
        data.pollutants.push({
            amount: AirQualityData.pollutants(i).amount(),
            pollutantType: WK2.PollutantType[AirQualityData.pollutants(i).pollutantType()],
            units: WK2.UnitType[AirQualityData.pollutants(i).units()],
        });
    return data;
}

function decodeCurrentWeather(data) {
    const budget = newDecodeBudget();
    const CurrentWeatherData = data;
    data = {
        metadata: decodeMetadata(CurrentWeatherData.metadata()),
        asOf: CurrentWeatherData.asOf(),
        cloudCover: CurrentWeatherData.cloudCover(),
        cloudCoverHighAltPct: CurrentWeatherData.cloudCoverHighAltPct(),
        cloudCoverLowAltPct: CurrentWeatherData.cloudCoverLowAltPct(),
        cloudCoverMidAltPct: CurrentWeatherData.cloudCoverMidAltPct(),
        conditionCode: WK2.WeatherCondition[CurrentWeatherData.conditionCode()],
        daylight: CurrentWeatherData.daylight(),
        humidity: CurrentWeatherData.humidity(),
        perceivedPrecipitationIntensity: CurrentWeatherData.perceivedPrecipitationIntensity(),
        precipitationAmount1h: CurrentWeatherData.precipitationAmount1h(),
        precipitationAmount24h: CurrentWeatherData.precipitationAmount24h(),
        precipitationAmount6h: CurrentWeatherData.precipitationAmount6h(),
        precipitationAmountNext1h: CurrentWeatherData.precipitationAmountNext1h(),
        precipitationAmountNext1hByType: [],
        precipitationAmountNext24h: CurrentWeatherData.precipitationAmountNext24h(),
        precipitationAmountNext24hByType: [],
        precipitationAmountNext6h: CurrentWeatherData.precipitationAmountNext6h(),
        precipitationAmountNext6hByType: [],
        precipitationAmountPrevious1hByType: [],
        precipitationAmountPrevious24hByType: [],
        precipitationAmountPrevious6hByType: [],
        precipitationIntensity: CurrentWeatherData.precipitationIntensity(),
        pressure: CurrentWeatherData.pressure(),
        pressureTrend: WK2.PressureTrend[CurrentWeatherData.pressureTrend()],
        snowfallAmount1h: CurrentWeatherData.snowfallAmount1h(),
        snowfallAmount24h: CurrentWeatherData.snowfallAmount24h(),
        snowfallAmount6h: CurrentWeatherData.snowfallAmount6h(),
        snowfallAmountNext1h: CurrentWeatherData.snowfallAmountNext1h(),
        snowfallAmountNext24h: CurrentWeatherData.snowfallAmountNext24h(),
        snowfallAmountNext6h: CurrentWeatherData.snowfallAmountNext6h(),
        temperature: CurrentWeatherData.temperature(),
        temperatureApparent: CurrentWeatherData.temperatureApparent(),
        unknown34: CurrentWeatherData.unknown34(),
        temperatureDewPoint: CurrentWeatherData.temperatureDewPoint(),
        uvIndex: CurrentWeatherData.uvIndex(),
        visibility: CurrentWeatherData.visibility(),
        windDirection: CurrentWeatherData.windDirection(),
        windGust: CurrentWeatherData.windGust(),
        windSpeed: CurrentWeatherData.windSpeed(),
    };
    for (let i = 0, count = decodedVectorLength(CurrentWeatherData.precipitationAmountNext1hByTypeLength(), budget); i < count; i++)
        data.precipitationAmountNext1hByType.push({
            expected: CurrentWeatherData.precipitationAmountNext1hByType(i).expected(),
            expectedSnow: CurrentWeatherData.precipitationAmountNext1hByType(i).expectedSnow(),
            maximumSnow: CurrentWeatherData.precipitationAmountNext1hByType(i).maximumSnow(),
            minimumSnow: CurrentWeatherData.precipitationAmountNext1hByType(i).minimumSnow(),
            precipitationType: WK2.PrecipitationType[CurrentWeatherData.precipitationAmountNext1hByType(i).precipitationType()],
        });
    for (let i = 0, count = decodedVectorLength(CurrentWeatherData.precipitationAmountNext24hByTypeLength(), budget); i < count; i++)
        data.precipitationAmountNext24hByType.push({
            expected: CurrentWeatherData.precipitationAmountNext24hByType(i).expected(),
            expectedSnow: CurrentWeatherData.precipitationAmountNext24hByType(i).expectedSnow(),
            maximumSnow: CurrentWeatherData.precipitationAmountNext24hByType(i).maximumSnow(),
            minimumSnow: CurrentWeatherData.precipitationAmountNext24hByType(i).minimumSnow(),
            precipitationType: WK2.PrecipitationType[CurrentWeatherData.precipitationAmountNext24hByType(i).precipitationType()],
        });
    for (let i = 0, count = decodedVectorLength(CurrentWeatherData.precipitationAmountNext6hByTypeLength(), budget); i < count; i++)
        data.precipitationAmountNext6hByType.push({
            expected: CurrentWeatherData.precipitationAmountNext6hByType(i).expected(),
            expectedSnow: CurrentWeatherData.precipitationAmountNext6hByType(i).expectedSnow(),
            maximumSnow: CurrentWeatherData.precipitationAmountNext6hByType(i).maximumSnow(),
            minimumSnow: CurrentWeatherData.precipitationAmountNext6hByType(i).minimumSnow(),
            precipitationType: WK2.PrecipitationType[CurrentWeatherData.precipitationAmountNext6hByType(i).precipitationType()],
        });
    for (let i = 0, count = decodedVectorLength(CurrentWeatherData.precipitationAmountPrevious1hByTypeLength(), budget); i < count; i++)
        data.precipitationAmountPrevious1hByType.push({
            expected: CurrentWeatherData.precipitationAmountPrevious1hByType(i).expected(),
            expectedSnow: CurrentWeatherData.precipitationAmountPrevious1hByType(i).expectedSnow(),
            maximumSnow: CurrentWeatherData.precipitationAmountPrevious1hByType(i).maximumSnow(),
            minimumSnow: CurrentWeatherData.precipitationAmountPrevious1hByType(i).minimumSnow(),
            precipitationType: WK2.PrecipitationType[CurrentWeatherData.precipitationAmountPrevious1hByType(i).precipitationType()],
        });
    for (let i = 0, count = decodedVectorLength(CurrentWeatherData.precipitationAmountPrevious24hByTypeLength(), budget); i < count; i++)
        data.precipitationAmountPrevious24hByType.push({
            expected: CurrentWeatherData.precipitationAmountPrevious24hByType(i).expected(),
            expectedSnow: CurrentWeatherData.precipitationAmountPrevious24hByType(i).expectedSnow(),
            maximumSnow: CurrentWeatherData.precipitationAmountPrevious24hByType(i).maximumSnow(),
            minimumSnow: CurrentWeatherData.precipitationAmountPrevious24hByType(i).minimumSnow(),
            precipitationType: WK2.PrecipitationType[CurrentWeatherData.precipitationAmountPrevious24hByType(i).precipitationType()],
        });
    for (let i = 0, count = decodedVectorLength(CurrentWeatherData.precipitationAmountPrevious6hByTypeLength(), budget); i < count; i++)
        data.precipitationAmountPrevious6hByType.push({
            expected: CurrentWeatherData.precipitationAmountPrevious6hByType(i).expected(),
            expectedSnow: CurrentWeatherData.precipitationAmountPrevious6hByType(i).expectedSnow(),
            maximumSnow: CurrentWeatherData.precipitationAmountPrevious6hByType(i).maximumSnow(),
            minimumSnow: CurrentWeatherData.precipitationAmountPrevious6hByType(i).minimumSnow(),
            precipitationType: WK2.PrecipitationType[CurrentWeatherData.precipitationAmountPrevious6hByType(i).precipitationType()],
        });
    return data;
}

function decodeForecastDaily(data) {
    const budget = newDecodeBudget();
    const DailyForecastData = data;
    data = {
        metadata: decodeMetadata(DailyForecastData.metadata()),
        days: [],
    };
    for (let i = 0, count = decodedVectorLength(DailyForecastData.daysLength(), budget); i < count; i++) {
        const sourceDay = DailyForecastData.days(i);
        const day = {
            conditionCode: WK2.WeatherCondition[sourceDay.conditionCode()],
            forecastEnd: sourceDay.forecastEnd(),
            forecastStart: sourceDay.forecastStart(),
            humidityMax: sourceDay.humidityMax(),
            humidityMin: sourceDay.humidityMin(),
            maxUvIndex: sourceDay.maxUvIndex(),
            moonPhase: WK2.MoonPhase[sourceDay.moonPhase()],
            moonrise: sourceDay.moonrise(),
            moonset: sourceDay.moonset(),
            precipitationAmount: sourceDay.precipitationAmount(),
            precipitationAmountByType: [],
            precipitationChance: sourceDay.precipitationChance(),
            precipitationType: WK2.PrecipitationType[sourceDay.precipitationType()],
            snowfallAmount: sourceDay.snowfallAmount(),
            solarMidnight: sourceDay.solarMidnight(),
            solarNoon: sourceDay.solarNoon(),
            sunrise: sourceDay.sunrise(),
            sunriseCivil: sourceDay.sunriseCivil(),
            sunriseNautical: sourceDay.sunriseNautical(),
            sunriseAstronomical: sourceDay.sunriseAstronomical(),
            sunset: sourceDay.sunset(),
            sunsetCivil: sourceDay.sunsetCivil(),
            sunsetNautical: sourceDay.sunsetNautical(),
            sunsetAstronomical: sourceDay.sunsetAstronomical(),
            temperatureMax: sourceDay.temperatureMax(),
            temperatureMaxTime: sourceDay.temperatureMaxTime(),
            temperatureMin: sourceDay.temperatureMin(),
            temperatureMinTime: sourceDay.temperatureMinTime(),
            visibilityMax: sourceDay.visibilityMax(),
            visibilityMin: sourceDay.visibilityMin(),
            windGustSpeedMax: sourceDay.windGustSpeedMax(),
            windSpeedAvg: sourceDay.windSpeedAvg(),
            windSpeedMax: sourceDay.windSpeedMax(),
        };
        for (let j = 0, count = decodedVectorLength(sourceDay.precipitationAmountByTypeLength(), budget); j < count; j++)
            day.precipitationAmountByType.push({
                expected: sourceDay.precipitationAmountByType(j).expected(),
                expectedSnow: sourceDay.precipitationAmountByType(j).expectedSnow(),
                maximumSnow: sourceDay.precipitationAmountByType(j).maximumSnow(),
                minimumSnow: sourceDay.precipitationAmountByType(j).minimumSnow(),
                precipitationType: WK2.PrecipitationType[sourceDay.precipitationAmountByType(j).precipitationType()],
            });
        const daytimeForecast = sourceDay.daytimeForecast();
        if (daytimeForecast) {
            day.daytimeForecast = {
                cloudCover: daytimeForecast.cloudCover(),
                cloudCoverHighAltPct: daytimeForecast.cloudCoverHighAltPct(),
                cloudCoverLowAltPct: daytimeForecast.cloudCoverLowAltPct(),
                cloudCoverMidAltPct: daytimeForecast.cloudCoverMidAltPct(),
                conditionCode: WK2.WeatherCondition[daytimeForecast.conditionCode()],
                forecastEnd: daytimeForecast.forecastEnd(),
                forecastStart: daytimeForecast.forecastStart(),
                humidity: daytimeForecast.humidity(),
                humidityMax: daytimeForecast.humidityMax(),
                humidityMin: daytimeForecast.humidityMin(),
                precipitationAmount: daytimeForecast.precipitationAmount(),
                precipitationAmountByType: [],
                precipitationChance: daytimeForecast.precipitationChance(),
                precipitationType: WK2.PrecipitationType[daytimeForecast.precipitationType()],
                snowfallAmount: daytimeForecast.snowfallAmount(),
                temperatureMax: daytimeForecast.temperatureMax(),
                temperatureMin: daytimeForecast.temperatureMin(),
                visibilityMax: daytimeForecast.visibilityMax(),
                visibilityMin: daytimeForecast.visibilityMin(),
                windDirection: daytimeForecast.windDirection(),
                windGustSpeedMax: daytimeForecast.windGustSpeedMax(),
                windSpeed: daytimeForecast.windSpeed(),
                windSpeedMax: daytimeForecast.windSpeedMax(),
                precipitationIntensityMax: daytimeForecast.precipitationIntensityMax(),
                perceivedPrecipitationIntensityMax: daytimeForecast.perceivedPrecipitationIntensityMax(),
                uvIndexMin: daytimeForecast.uvIndexMin(),
                uvIndexMax: daytimeForecast.uvIndexMax(),
                temperatureApparentMin: daytimeForecast.temperatureApparentMin(),
                temperatureApparentMax: daytimeForecast.temperatureApparentMax(),
                daylight: daytimeForecast.daylight(),
            };
            for (let j = 0, count = decodedVectorLength(daytimeForecast.precipitationAmountByTypeLength(), budget); j < count; j++)
                day.daytimeForecast.precipitationAmountByType.push({
                    expected: daytimeForecast.precipitationAmountByType(j).expected(),
                    expectedSnow: daytimeForecast.precipitationAmountByType(j).expectedSnow(),
                    maximumSnow: daytimeForecast.precipitationAmountByType(j).maximumSnow(),
                    minimumSnow: daytimeForecast.precipitationAmountByType(j).minimumSnow(),
                    precipitationType: WK2.PrecipitationType[daytimeForecast.precipitationAmountByType(j).precipitationType()],
                });
        }
        const overnightForecast = sourceDay.overnightForecast();
        if (overnightForecast) {
            day.overnightForecast = {
                cloudCover: overnightForecast.cloudCover(),
                cloudCoverHighAltPct: overnightForecast.cloudCoverHighAltPct(),
                cloudCoverLowAltPct: overnightForecast.cloudCoverLowAltPct(),
                cloudCoverMidAltPct: overnightForecast.cloudCoverMidAltPct(),
                conditionCode: WK2.WeatherCondition[overnightForecast.conditionCode()],
                forecastEnd: overnightForecast.forecastEnd(),
                forecastStart: overnightForecast.forecastStart(),
                humidity: overnightForecast.humidity(),
                humidityMax: overnightForecast.humidityMax(),
                humidityMin: overnightForecast.humidityMin(),
                precipitationAmount: overnightForecast.precipitationAmount(),
                precipitationAmountByType: [],
                precipitationChance: overnightForecast.precipitationChance(),
                precipitationType: WK2.PrecipitationType[overnightForecast.precipitationType()],
                snowfallAmount: overnightForecast.snowfallAmount(),
                temperatureMax: overnightForecast.temperatureMax(),
                temperatureMin: overnightForecast.temperatureMin(),
                visibilityMax: overnightForecast.visibilityMax(),
                visibilityMin: overnightForecast.visibilityMin(),
                windDirection: overnightForecast.windDirection(),
                windGustSpeedMax: overnightForecast.windGustSpeedMax(),
                windSpeed: overnightForecast.windSpeed(),
                windSpeedMax: overnightForecast.windSpeedMax(),
                precipitationIntensityMax: overnightForecast.precipitationIntensityMax(),
                perceivedPrecipitationIntensityMax: overnightForecast.perceivedPrecipitationIntensityMax(),
                uvIndexMin: overnightForecast.uvIndexMin(),
                uvIndexMax: overnightForecast.uvIndexMax(),
                temperatureApparentMin: overnightForecast.temperatureApparentMin(),
                temperatureApparentMax: overnightForecast.temperatureApparentMax(),
                daylight: overnightForecast.daylight(),
            };
            for (let j = 0, count = decodedVectorLength(overnightForecast.precipitationAmountByTypeLength(), budget); j < count; j++)
                day.overnightForecast.precipitationAmountByType.push({
                    expected: overnightForecast.precipitationAmountByType(j).expected(),
                    expectedSnow: overnightForecast.precipitationAmountByType(j).expectedSnow(),
                    maximumSnow: overnightForecast.precipitationAmountByType(j).maximumSnow(),
                    minimumSnow: overnightForecast.precipitationAmountByType(j).minimumSnow(),
                    precipitationType: WK2.PrecipitationType[overnightForecast.precipitationAmountByType(j).precipitationType()],
                });
        }
        const restOfDayForecast = sourceDay.restOfDayForecast();
        if (restOfDayForecast) {
            day.restOfDayForecast = {
                cloudCover: restOfDayForecast.cloudCover(),
                cloudCoverHighAltPct: restOfDayForecast.cloudCoverHighAltPct(),
                cloudCoverLowAltPct: restOfDayForecast.cloudCoverLowAltPct(),
                cloudCoverMidAltPct: restOfDayForecast.cloudCoverMidAltPct(),
                conditionCode: WK2.WeatherCondition[restOfDayForecast.conditionCode()],
                forecastEnd: restOfDayForecast.forecastEnd(),
                forecastStart: restOfDayForecast.forecastStart(),
                humidity: restOfDayForecast.humidity(),
                humidityMax: restOfDayForecast.humidityMax(),
                humidityMin: restOfDayForecast.humidityMin(),
                precipitationAmount: restOfDayForecast.precipitationAmount(),
                precipitationAmountByType: [],
                precipitationChance: restOfDayForecast.precipitationChance(),
                precipitationType: WK2.PrecipitationType[restOfDayForecast.precipitationType()],
                snowfallAmount: restOfDayForecast.snowfallAmount(),
                temperatureMax: restOfDayForecast.temperatureMax(),
                temperatureMin: restOfDayForecast.temperatureMin(),
                visibilityMax: restOfDayForecast.visibilityMax(),
                visibilityMin: restOfDayForecast.visibilityMin(),
                windDirection: restOfDayForecast.windDirection(),
                windGustSpeedMax: restOfDayForecast.windGustSpeedMax(),
                windSpeed: restOfDayForecast.windSpeed(),
                windSpeedMax: restOfDayForecast.windSpeedMax(),
                precipitationIntensityMax: restOfDayForecast.precipitationIntensityMax(),
                perceivedPrecipitationIntensityMax: restOfDayForecast.perceivedPrecipitationIntensityMax(),
                uvIndexMin: restOfDayForecast.uvIndexMin(),
                uvIndexMax: restOfDayForecast.uvIndexMax(),
                temperatureApparentMin: restOfDayForecast.temperatureApparentMin(),
                temperatureApparentMax: restOfDayForecast.temperatureApparentMax(),
                daylight: restOfDayForecast.daylight(),
            };
            for (let j = 0, count = decodedVectorLength(restOfDayForecast.precipitationAmountByTypeLength(), budget); j < count; j++)
                day.restOfDayForecast.precipitationAmountByType.push({
                    expected: restOfDayForecast.precipitationAmountByType(j).expected(),
                    expectedSnow: restOfDayForecast.precipitationAmountByType(j).expectedSnow(),
                    maximumSnow: restOfDayForecast.precipitationAmountByType(j).maximumSnow(),
                    minimumSnow: restOfDayForecast.precipitationAmountByType(j).minimumSnow(),
                    precipitationType: WK2.PrecipitationType[restOfDayForecast.precipitationAmountByType(j).precipitationType()],
                });
        }
        data.days.push(day);
    }
    return data;
}

function decodeForecastHourly(data) {
    const budget = newDecodeBudget();
    const HourlyForecastData = data;
    data = {
        metadata: decodeMetadata(HourlyForecastData.metadata()),
        hours: [],
    };
    for (let i = 0, count = decodedVectorLength(HourlyForecastData.hoursLength(), budget); i < count; i++) {
        const hour = HourlyForecastData.hours(i);
        data.hours.push({
            cloudCover: hour.cloudCover(),
            cloudCoverHighAltPct: hour.cloudCoverHighAltPct(),
            cloudCoverLowAltPct: hour.cloudCoverLowAltPct(),
            cloudCoverMidAltPct: hour.cloudCoverMidAltPct(),
            conditionCode: WK2.WeatherCondition[hour.conditionCode()],
            daylight: hour.daylight(),
            forecastStart: hour.forecastStart(),
            humidity: hour.humidity(),
            perceivedPrecipitationIntensity: hour.perceivedPrecipitationIntensity(),
            precipitationAmount: hour.precipitationAmount(),
            precipitationChance: hour.precipitationChance(),
            precipitationIntensity: hour.precipitationIntensity(),
            precipitationType: WK2.PrecipitationType[hour.precipitationType()],
            pressure: hour.pressure(),
            pressureTrend: WK2.PressureTrend[hour.pressureTrend()],
            snowfallAmount: hour.snowfallAmount(),
            snowfallIntensity: hour.snowfallIntensity(),
            temperature: hour.temperature(),
            temperatureApparent: hour.temperatureApparent(),
            unknown20: hour.unknown20(),
            temperatureDewPoint: hour.temperatureDewPoint(),
            uvIndex: hour.uvIndex(),
            visibility: hour.visibility(),
            windDirection: hour.windDirection(),
            windGust: hour.windGust(),
            windSpeed: hour.windSpeed(),
        });
    }
    return data;
}

function decodeForecastNextHour(data) {
    const budget = newDecodeBudget();
    const NextHourForecastData = data;
    data = {
        metadata: decodeMetadata(NextHourForecastData.metadata()),
        condition: [],
        forecastEnd: NextHourForecastData.forecastEnd(),
        forecastStart: NextHourForecastData.forecastStart(),
        minutes: [],
        summary: [],
    };
    for (let i = 0, count = decodedVectorLength(NextHourForecastData.conditionLength(), budget); i < count; i++) {
        const condition = {
            beginCondition: WK2.ConditionType[NextHourForecastData.condition(i).beginCondition()],
            endCondition: WK2.ConditionType[NextHourForecastData.condition(i).endCondition()],
            endTime: NextHourForecastData.condition(i).endTime(),
            forecastToken: WK2.ForecastToken[NextHourForecastData.condition(i).forecastToken()],
            parameters: [],
            startTime: NextHourForecastData.condition(i).startTime(),
        };
        for (let j = 0, count = decodedVectorLength(NextHourForecastData.condition(i).parametersLength(), budget); j < count; j++)
            condition.parameters.push({
                date: NextHourForecastData.condition(i).parameters(j).date(),
                type: WK2.ParameterType[NextHourForecastData.condition(i).parameters(j).type()],
            });
        data.condition.push(condition);
    }
    for (let i = 0, count = decodedVectorLength(NextHourForecastData.minutesLength(), budget); i < count; i++)
        data.minutes.push({
            perceivedPrecipitationIntensity: NextHourForecastData.minutes(i).perceivedPrecipitationIntensity(),
            precipitationChance: NextHourForecastData.minutes(i).precipitationChance(),
            precipitationIntensity: NextHourForecastData.minutes(i).precipitationIntensity(),
            startTime: NextHourForecastData.minutes(i).startTime(),
        });
    for (let i = 0, count = decodedVectorLength(NextHourForecastData.summaryLength(), budget); i < count; i++)
        data.summary.push({
            condition: WK2.PrecipitationType[NextHourForecastData.summary(i).condition()],
            endTime: NextHourForecastData.summary(i).endTime(),
            precipitationChance: NextHourForecastData.summary(i).precipitationChance(),
            precipitationIntensity: NextHourForecastData.summary(i).precipitationIntensity(),
            startTime: NextHourForecastData.summary(i).startTime(),
        });
    return data;
}

function decodeNews(data) {
    const budget = newDecodeBudget();
    const NewsData = data;
    data = {
        metadata: decodeMetadata(NewsData.metadata()),
        placements: [],
    };
    for (let i = 0, count = decodedVectorLength(NewsData.placementsLength(), budget); i < count; i++) {
        const placement = {
            articles: [],
            placement: WK2.PlacementType[NewsData.placements(i).placement()],
            priority: NewsData.placements(i).priority(),
        };
        for (let j = 0, count = decodedVectorLength(NewsData.placements(i).articlesLength(), budget); j < count; j++) {
            const article = {
                alertIds: [],
                headlineOverride: NewsData.placements(i).articles(j).headlineOverride(),
                id: NewsData.placements(i).articles(j).id(),
                locale: NewsData.placements(i).articles(j).locale(),
                phenomena: [],
                supportedStorefronts: [],
            };
            for (let k = 0, count = decodedVectorLength(NewsData.placements(i).articles(j).alertIdsLength(), budget); k < count; k++) article.alertIds.push(decodeUuid(NewsData.placements(i).articles(j).alertIds(k)));
            for (let k = 0, count = decodedVectorLength(NewsData.placements(i).articles(j).phenomenaLength(), budget); k < count; k++) article.phenomena.push(NewsData.placements(i).articles(j).phenomena(k));
            for (let k = 0, count = decodedVectorLength(NewsData.placements(i).articles(j).supportedStorefrontsLength(), budget); k < count; k++) article.supportedStorefronts.push(NewsData.placements(i).articles(j).supportedStorefronts(k));
            placement.articles.push(article);
        }
        data.placements.push(placement);
    }
    return data;
}

function decodeWeatherAlerts(data) {
    const budget = newDecodeBudget();
    const WeatherAlertCollectionData = data;
    data = {
        metadata: decodeMetadata(WeatherAlertCollectionData.metadata()),
        alerts: [],
        detailsUrl: WeatherAlertCollectionData.detailsUrl(),
    };
    for (let i = 0, count = decodedVectorLength(WeatherAlertCollectionData.alertsLength(), budget); i < count; i++) {
        const alertView = WeatherAlertCollectionData.alerts(i);
        const alert = {
            areaId: alertView.areaId(),
            areaName: alertView.areaName(),
            attributionUrl: alertView.attributionUrl(),
            certainty: WK2.Certainty[alertView.certainty()],
            countryCode: alertView.countryCode(),
            description: alertView.description(),
            detailsUrl: alertView.detailsUrl(),
            effectiveTime: alertView.effectiveTime(),
            eventEndTime: alertView.eventEndTime(),
            eventOnsetTime: alertView.eventOnsetTime(),
            eventSource: alertView.eventSource(),
            expireTime: alertView.expireTime(),
            id: decodeUuid(alertView.id()),
            importance: WK2.ImportanceType[alertView.importance()],
            issuedTime: alertView.issuedTime(),
            phenomenon: alertView.phenomenon(),
            responses: [],
            severity: WK2.Severity[alertView.severity()],
            significance: WK2.SignificanceType[alertView.significance()],
            source: alertView.source(),
            token: alertView.token(),
            urgency: WK2.Urgency[alertView.urgency()],
            unknown23: alertView.unknown23(),
            unknown24: alertView.unknown24(),
            unknown25: alertView.unknown25(),
            unknown26: alertView.unknown26(),
        };
        //for (let j = 0, count = decodedVectorLength(alertView.idLength(), budget); j < count; j++) alert.id.push(alertView.id(j));
        //for (let j = 0, count = decodedVectorLength(alertView.idLength(), budget); j < count; j++) alert.id.push({ "lowBytes": alertView.id(j).lowBytes(), "highBytes": alertView.id(j).highBytes() });
        for (let j = 0, count = decodedVectorLength(alertView.responsesLength(), budget); j < count; j++) alert.responses.push(WK2.ResponseType[alertView.responses(j)]);
        data.alerts.push(alert);
    }
    return data;
}

function decodeWeatherChanges(data) {
    const budget = newDecodeBudget();
    const WeatherChangesData = data;
    data = {
        metadata: decodeMetadata(WeatherChangesData.metadata()),
        changes: [],
        forecastEnd: WeatherChangesData.forecastEnd(),
        forecastStart: WeatherChangesData.forecastStart(),
    };
    for (let i = 0, count = decodedVectorLength(WeatherChangesData.changesLength(), budget); i < count; i++) {
        const change = {
            dayPrecipitationChange: WK2.Direction[WeatherChangesData.changes(i).dayPrecipitationChange()],
            forecastEnd: WeatherChangesData.changes(i).forecastEnd(),
            forecastStart: WeatherChangesData.changes(i).forecastStart(),
            maxTemperatureChange: WK2.Direction[WeatherChangesData.changes(i).maxTemperatureChange()],
            minTemperatureChange: WK2.Direction[WeatherChangesData.changes(i).minTemperatureChange()],
            nightPrecipitationChange: WK2.Direction[WeatherChangesData.changes(i).nightPrecipitationChange()],
        };
        data.changes.push(change);
    }
    return data;
}

function decodeHistoricalComparisons(data) {
    const budget = newDecodeBudget();
    const HistoricalComparisonsData = data;
    data = {
        metadata: decodeMetadata(HistoricalComparisonsData.metadata()),
        comparisons: [],
    };
    for (let i = 0, count = decodedVectorLength(HistoricalComparisonsData.comparisonsLength(), budget); i < count; i++) {
        const comparison = {
            baselineStartDate: HistoricalComparisonsData.comparisons(i).baselineStartDate(),
            baselineType: HistoricalComparisonsData.comparisons(i).baselineType(),
            baselineValue: HistoricalComparisonsData.comparisons(i).baselineValue(),
            condition: WK2.ComparisonType[HistoricalComparisonsData.comparisons(i).condition()],
            currentValue: HistoricalComparisonsData.comparisons(i).currentValue(),
            deviation: WK2.Deviation[HistoricalComparisonsData.comparisons(i).deviation()],
        };
        data.comparisons.push(comparison);
    }
    return data;
}

function decodeLocationInfo(data) {
    const LocationInfoData = data;
    data = {
        metadata: decodeMetadata(LocationInfoData.metadata()),
        countryCode: LocationInfoData.countryCode(),
        preciseName: LocationInfoData.preciseName(),
        primaryName: LocationInfoData.primaryName(),
        timeZone: LocationInfoData.timeZone(),
    };
    return data;
}

function encodeMetadata(builder, metadata) {
    if (!metadata) return 0;
    return WK2.Metadata.createMetadata(
        builder,
        builder.createString(metadata.attributionUrl),
        metadata.expireTime,
        builder.createString(metadata.language),
        metadata.latitude,
        metadata.longitude,
        builder.createString(metadata.providerLogo),
        builder.createString(metadata.providerName),
        metadata.readTime,
        metadata.reportedTime,
        metadata.temporarilyUnavailable,
        WK2.SourceType[metadata.sourceType],
        metadata.unknown11,
        metadata.unknown12,
        metadata.unknown13,
        metadata.unknown14,
        metadata.unknown15,
    );
}

function decodeMetadata(data) {
    if (!data) return undefined;
    data = {
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
        sourceType: WK2.SourceType[data.sourceType()],
    };
    return data;
}

function toUuidBytes(uuid) {
    if (uuid === null || uuid === undefined) return null;
    if (uuid instanceof Uint8Array || Array.isArray(uuid)) return uuid;
    if (typeof uuid === "string") {
        const bytesObject = uuidStringToBytesObject(uuid);
        return bytesObject ? bytesObject.bytes : null;
    }
    if (typeof uuid === "object") {
        if (uuid.bytes instanceof Uint8Array || Array.isArray(uuid.bytes)) return uuid.bytes;
        if (typeof uuid.bytesArray === "function") return uuid.bytesArray();
    }
    return null;
}

function uuidStringToBytesObject(uuidString) {
    if (typeof uuidString !== "string") return null;
    const hex = uuidString.replace(/-/g, "").toLowerCase();
    if (!/^[0-9a-f]{32}$/.test(hex)) return null;
    const bytes = [];
    for (let index = 0; index < hex.length; index += 2) bytes.push(Number.parseInt(hex.slice(index, index + 2), 16));
    return { bytes };
}

function uuidBytesObjectToString(uuid) {
    const bytes = toUuidBytes(uuid);
    if (!bytes || bytes.length !== 16) return null;
    const hex = Array.from(bytes)
        .map(byte => byte.toString(16).padStart(2, "0"))
        .join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

function createUuidOffset(builder, uuid) {
    const bytes = toUuidBytes(uuid);
    if (!bytes || bytes.length === 0) return 0;
    const idBytesOffset = WK2.UUID.createBytesVector(builder, bytes);
    return WK2.UUID.createUUID(builder, idBytesOffset);
}

function decodeUuid(uuid) {
    return uuidBytesObjectToString(uuid);
}
