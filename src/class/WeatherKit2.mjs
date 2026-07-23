import { FlatBufferRootProcessor } from "@nsringo/flatbuffer-root";
import * as WK2 from "@nsringo/weatherkit";
import database from "../function/database.mjs";

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
        data.precipitationAmountNext1hByType.map(p => WK2.PrecipitationAmountByType.createPrecipitationAmountByType(builder, WK2.PrecipitationType[p.precipitationType], p.expected, p.minimumSnow, p.maximumSnow, p.expectedSnow)),
    );
    const precipitationAmountNext24hByTypeOffset = WK2.CurrentWeatherData.createPrecipitationAmountNext24hByTypeVector(
        builder,
        data.precipitationAmountNext24hByType.map(p => WK2.PrecipitationAmountByType.createPrecipitationAmountByType(builder, WK2.PrecipitationType[p.precipitationType], p.expected, p.minimumSnow, p.maximumSnow, p.expectedSnow)),
    );
    const precipitationAmountNext6hByTypeOffset = WK2.CurrentWeatherData.createPrecipitationAmountNext6hByTypeVector(
        builder,
        data.precipitationAmountNext6hByType.map(p => WK2.PrecipitationAmountByType.createPrecipitationAmountByType(builder, WK2.PrecipitationType[p.precipitationType], p.expected, p.minimumSnow, p.maximumSnow, p.expectedSnow)),
    );
    const precipitationAmountPrevious1hByTypeOffset = WK2.CurrentWeatherData.createPrecipitationAmountPrevious1hByTypeVector(
        builder,
        data.precipitationAmountPrevious1hByType.map(p => WK2.PrecipitationAmountByType.createPrecipitationAmountByType(builder, WK2.PrecipitationType[p.precipitationType], p.expected, p.minimumSnow, p.maximumSnow, p.expectedSnow)),
    );
    const precipitationAmountPrevious24hByTypeOffset = WK2.CurrentWeatherData.createPrecipitationAmountPrevious24hByTypeVector(
        builder,
        data.precipitationAmountPrevious24hByType.map(p => WK2.PrecipitationAmountByType.createPrecipitationAmountByType(builder, WK2.PrecipitationType[p.precipitationType], p.expected, p.minimumSnow, p.maximumSnow, p.expectedSnow)),
    );
    const precipitationAmountPrevious6hByTypeOffset = WK2.CurrentWeatherData.createPrecipitationAmountPrevious6hByTypeVector(
        builder,
        data.precipitationAmountPrevious6hByType.map(p => WK2.PrecipitationAmountByType.createPrecipitationAmountByType(builder, WK2.PrecipitationType[p.precipitationType], p.expected, p.minimumSnow, p.maximumSnow, p.expectedSnow)),
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
    for (let i = 0; i < AirQualityData.pollutantsLength(); i++)
        data.pollutants.push({
            amount: AirQualityData.pollutants(i).amount(),
            pollutantType: WK2.PollutantType[AirQualityData.pollutants(i).pollutantType()],
            units: WK2.UnitType[AirQualityData.pollutants(i).units()],
        });
    return data;
}

function decodeCurrentWeather(data) {
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
    for (let i = 0; i < CurrentWeatherData.precipitationAmountNext1hByTypeLength(); i++)
        data.precipitationAmountNext1hByType.push({
            expected: CurrentWeatherData.precipitationAmountNext1hByType(i).expected(),
            expectedSnow: CurrentWeatherData.precipitationAmountNext1hByType(i).expectedSnow(),
            maximumSnow: CurrentWeatherData.precipitationAmountNext1hByType(i).maximumSnow(),
            minimumSnow: CurrentWeatherData.precipitationAmountNext1hByType(i).minimumSnow(),
            precipitationType: WK2.PrecipitationType[CurrentWeatherData.precipitationAmountNext1hByType(i).precipitationType()],
        });
    for (let i = 0; i < CurrentWeatherData.precipitationAmountNext24hByTypeLength(); i++)
        data.precipitationAmountNext24hByType.push({
            expected: CurrentWeatherData.precipitationAmountNext24hByType(i).expected(),
            expectedSnow: CurrentWeatherData.precipitationAmountNext24hByType(i).expectedSnow(),
            maximumSnow: CurrentWeatherData.precipitationAmountNext24hByType(i).maximumSnow(),
            minimumSnow: CurrentWeatherData.precipitationAmountNext24hByType(i).minimumSnow(),
            precipitationType: WK2.PrecipitationType[CurrentWeatherData.precipitationAmountNext24hByType(i).precipitationType()],
        });
    for (let i = 0; i < CurrentWeatherData.precipitationAmountNext6hByTypeLength(); i++)
        data.precipitationAmountNext6hByType.push({
            expected: CurrentWeatherData.precipitationAmountNext6hByType(i).expected(),
            expectedSnow: CurrentWeatherData.precipitationAmountNext6hByType(i).expectedSnow(),
            maximumSnow: CurrentWeatherData.precipitationAmountNext6hByType(i).maximumSnow(),
            minimumSnow: CurrentWeatherData.precipitationAmountNext6hByType(i).minimumSnow(),
            precipitationType: WK2.PrecipitationType[CurrentWeatherData.precipitationAmountNext6hByType(i).precipitationType()],
        });
    for (let i = 0; i < CurrentWeatherData.precipitationAmountPrevious1hByTypeLength(); i++)
        data.precipitationAmountPrevious1hByType.push({
            expected: CurrentWeatherData.precipitationAmountPrevious1hByType(i).expected(),
            expectedSnow: CurrentWeatherData.precipitationAmountPrevious1hByType(i).expectedSnow(),
            maximumSnow: CurrentWeatherData.precipitationAmountPrevious1hByType(i).maximumSnow(),
            minimumSnow: CurrentWeatherData.precipitationAmountPrevious1hByType(i).minimumSnow(),
            precipitationType: WK2.PrecipitationType[CurrentWeatherData.precipitationAmountPrevious1hByType(i).precipitationType()],
        });
    for (let i = 0; i < CurrentWeatherData.precipitationAmountPrevious24hByTypeLength(); i++)
        data.precipitationAmountPrevious24hByType.push({
            expected: CurrentWeatherData.precipitationAmountPrevious24hByType(i).expected(),
            expectedSnow: CurrentWeatherData.precipitationAmountPrevious24hByType(i).expectedSnow(),
            maximumSnow: CurrentWeatherData.precipitationAmountPrevious24hByType(i).maximumSnow(),
            minimumSnow: CurrentWeatherData.precipitationAmountPrevious24hByType(i).minimumSnow(),
            precipitationType: WK2.PrecipitationType[CurrentWeatherData.precipitationAmountPrevious24hByType(i).precipitationType()],
        });
    for (let i = 0; i < CurrentWeatherData.precipitationAmountPrevious6hByTypeLength(); i++)
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
    const DailyForecastData = data;
    data = {
        metadata: decodeMetadata(DailyForecastData.metadata()),
        days: [],
    };
    for (let i = 0; i < DailyForecastData.daysLength(); i++) {
        const day = {
            conditionCode: WK2.WeatherCondition[DailyForecastData.days(i).conditionCode()],
            forecastEnd: DailyForecastData.days(i).forecastEnd(),
            forecastStart: DailyForecastData.days(i).forecastStart(),
            humidityMax: DailyForecastData.days(i).humidityMax(),
            humidityMin: DailyForecastData.days(i).humidityMin(),
            maxUvIndex: DailyForecastData.days(i).maxUvIndex(),
            moonPhase: WK2.MoonPhase[DailyForecastData.days(i).moonPhase()],
            moonrise: DailyForecastData.days(i).moonrise(),
            moonset: DailyForecastData.days(i).moonset(),
            precipitationAmount: DailyForecastData.days(i).precipitationAmount(),
            precipitationAmountByType: [],
            precipitationChance: DailyForecastData.days(i).precipitationChance(),
            precipitationType: WK2.PrecipitationType[DailyForecastData.days(i).precipitationType()],
            snowfallAmount: DailyForecastData.days(i).snowfallAmount(),
            solarMidnight: DailyForecastData.days(i).solarMidnight(),
            solarNoon: DailyForecastData.days(i).solarNoon(),
            sunrise: DailyForecastData.days(i).sunrise(),
            sunriseCivil: DailyForecastData.days(i).sunriseCivil(),
            sunriseNautical: DailyForecastData.days(i).sunriseNautical(),
            sunriseAstronomical: DailyForecastData.days(i).sunriseAstronomical(),
            sunset: DailyForecastData.days(i).sunset(),
            sunsetCivil: DailyForecastData.days(i).sunsetCivil(),
            sunsetNautical: DailyForecastData.days(i).sunsetNautical(),
            sunsetAstronomical: DailyForecastData.days(i).sunsetAstronomical(),
            temperatureMax: DailyForecastData.days(i).temperatureMax(),
            temperatureMaxTime: DailyForecastData.days(i).temperatureMaxTime(),
            temperatureMin: DailyForecastData.days(i).temperatureMin(),
            temperatureMinTime: DailyForecastData.days(i).temperatureMinTime(),
            visibilityMax: DailyForecastData.days(i).visibilityMax(),
            visibilityMin: DailyForecastData.days(i).visibilityMin(),
            windGustSpeedMax: DailyForecastData.days(i).windGustSpeedMax(),
            windSpeedAvg: DailyForecastData.days(i).windSpeedAvg(),
            windSpeedMax: DailyForecastData.days(i).windSpeedMax(),
        };
        for (let j = 0; j < DailyForecastData.days(i).precipitationAmountByTypeLength(); j++)
            day.precipitationAmountByType.push({
                expected: DailyForecastData.days(i).precipitationAmountByType(j).expected(),
                expectedSnow: DailyForecastData.days(i).precipitationAmountByType(j).expectedSnow(),
                maximumSnow: DailyForecastData.days(i).precipitationAmountByType(j).maximumSnow(),
                minimumSnow: DailyForecastData.days(i).precipitationAmountByType(j).minimumSnow(),
                precipitationType: WK2.PrecipitationType[DailyForecastData.days(i).precipitationAmountByType(j).precipitationType()],
            });
        if (DailyForecastData.days(i).daytimeForecast()) {
            day.daytimeForecast = {
                cloudCover: DailyForecastData.days(i).daytimeForecast().cloudCover(),
                cloudCoverHighAltPct: DailyForecastData.days(i).daytimeForecast().cloudCoverHighAltPct(),
                cloudCoverLowAltPct: DailyForecastData.days(i).daytimeForecast().cloudCoverLowAltPct(),
                cloudCoverMidAltPct: DailyForecastData.days(i).daytimeForecast().cloudCoverMidAltPct(),
                conditionCode: WK2.WeatherCondition[DailyForecastData.days(i).daytimeForecast().conditionCode()],
                forecastEnd: DailyForecastData.days(i).daytimeForecast().forecastEnd(),
                forecastStart: DailyForecastData.days(i).daytimeForecast().forecastStart(),
                humidity: DailyForecastData.days(i).daytimeForecast().humidity(),
                humidityMax: DailyForecastData.days(i).daytimeForecast().humidityMax(),
                humidityMin: DailyForecastData.days(i).daytimeForecast().humidityMin(),
                precipitationAmount: DailyForecastData.days(i).daytimeForecast().precipitationAmount(),
                precipitationAmountByType: [],
                precipitationChance: DailyForecastData.days(i).daytimeForecast().precipitationChance(),
                precipitationType: WK2.PrecipitationType[DailyForecastData.days(i).daytimeForecast().precipitationType()],
                snowfallAmount: DailyForecastData.days(i).daytimeForecast().snowfallAmount(),
                temperatureMax: DailyForecastData.days(i).daytimeForecast().temperatureMax(),
                temperatureMin: DailyForecastData.days(i).daytimeForecast().temperatureMin(),
                visibilityMax: DailyForecastData.days(i).daytimeForecast().visibilityMax(),
                visibilityMin: DailyForecastData.days(i).daytimeForecast().visibilityMin(),
                windDirection: DailyForecastData.days(i).daytimeForecast().windDirection(),
                windGustSpeedMax: DailyForecastData.days(i).daytimeForecast().windGustSpeedMax(),
                windSpeed: DailyForecastData.days(i).daytimeForecast().windSpeed(),
                windSpeedMax: DailyForecastData.days(i).daytimeForecast().windSpeedMax(),
                precipitationIntensityMax: DailyForecastData.days(i).daytimeForecast().precipitationIntensityMax(),
                perceivedPrecipitationIntensityMax: DailyForecastData.days(i).daytimeForecast().perceivedPrecipitationIntensityMax(),
                uvIndexMin: DailyForecastData.days(i).daytimeForecast().uvIndexMin(),
                uvIndexMax: DailyForecastData.days(i).daytimeForecast().uvIndexMax(),
                temperatureApparentMin: DailyForecastData.days(i).daytimeForecast().temperatureApparentMin(),
                temperatureApparentMax: DailyForecastData.days(i).daytimeForecast().temperatureApparentMax(),
                daylight: DailyForecastData.days(i).daytimeForecast().daylight(),
            };
            for (let j = 0; j < DailyForecastData.days(i).daytimeForecast().precipitationAmountByTypeLength(); j++)
                day.daytimeForecast.precipitationAmountByType.push({
                    expected: DailyForecastData.days(i).daytimeForecast().precipitationAmountByType(j).expected(),
                    expectedSnow: DailyForecastData.days(i).daytimeForecast().precipitationAmountByType(j).expectedSnow(),
                    maximumSnow: DailyForecastData.days(i).daytimeForecast().precipitationAmountByType(j).maximumSnow(),
                    minimumSnow: DailyForecastData.days(i).daytimeForecast().precipitationAmountByType(j).minimumSnow(),
                    precipitationType: WK2.PrecipitationType[DailyForecastData.days(i).daytimeForecast().precipitationAmountByType(j).precipitationType()],
                });
        }
        if (DailyForecastData.days(i).overnightForecast()) {
            day.overnightForecast = {
                cloudCover: DailyForecastData.days(i).overnightForecast().cloudCover(),
                cloudCoverHighAltPct: DailyForecastData.days(i).overnightForecast().cloudCoverHighAltPct(),
                cloudCoverLowAltPct: DailyForecastData.days(i).overnightForecast().cloudCoverLowAltPct(),
                cloudCoverMidAltPct: DailyForecastData.days(i).overnightForecast().cloudCoverMidAltPct(),
                conditionCode: WK2.WeatherCondition[DailyForecastData.days(i).overnightForecast().conditionCode()],
                forecastEnd: DailyForecastData.days(i).overnightForecast().forecastEnd(),
                forecastStart: DailyForecastData.days(i).overnightForecast().forecastStart(),
                humidity: DailyForecastData.days(i).overnightForecast().humidity(),
                humidityMax: DailyForecastData.days(i).overnightForecast().humidityMax(),
                humidityMin: DailyForecastData.days(i).overnightForecast().humidityMin(),
                precipitationAmount: DailyForecastData.days(i).overnightForecast().precipitationAmount(),
                precipitationAmountByType: [],
                precipitationChance: DailyForecastData.days(i).overnightForecast().precipitationChance(),
                precipitationType: WK2.PrecipitationType[DailyForecastData.days(i).overnightForecast().precipitationType()],
                snowfallAmount: DailyForecastData.days(i).overnightForecast().snowfallAmount(),
                temperatureMax: DailyForecastData.days(i).overnightForecast().temperatureMax(),
                temperatureMin: DailyForecastData.days(i).overnightForecast().temperatureMin(),
                visibilityMax: DailyForecastData.days(i).overnightForecast().visibilityMax(),
                visibilityMin: DailyForecastData.days(i).overnightForecast().visibilityMin(),
                windDirection: DailyForecastData.days(i).overnightForecast().windDirection(),
                windGustSpeedMax: DailyForecastData.days(i).overnightForecast().windGustSpeedMax(),
                windSpeed: DailyForecastData.days(i).overnightForecast().windSpeed(),
                windSpeedMax: DailyForecastData.days(i).overnightForecast().windSpeedMax(),
                precipitationIntensityMax: DailyForecastData.days(i).overnightForecast().precipitationIntensityMax(),
                perceivedPrecipitationIntensityMax: DailyForecastData.days(i).overnightForecast().perceivedPrecipitationIntensityMax(),
                uvIndexMin: DailyForecastData.days(i).overnightForecast().uvIndexMin(),
                uvIndexMax: DailyForecastData.days(i).overnightForecast().uvIndexMax(),
                temperatureApparentMin: DailyForecastData.days(i).overnightForecast().temperatureApparentMin(),
                temperatureApparentMax: DailyForecastData.days(i).overnightForecast().temperatureApparentMax(),
                daylight: DailyForecastData.days(i).overnightForecast().daylight(),
            };
            for (let j = 0; j < DailyForecastData.days(i).overnightForecast().precipitationAmountByTypeLength(); j++)
                day.overnightForecast.precipitationAmountByType.push({
                    expected: DailyForecastData.days(i).overnightForecast().precipitationAmountByType(j).expected(),
                    expectedSnow: DailyForecastData.days(i).overnightForecast().precipitationAmountByType(j).expectedSnow(),
                    maximumSnow: DailyForecastData.days(i).overnightForecast().precipitationAmountByType(j).maximumSnow(),
                    minimumSnow: DailyForecastData.days(i).overnightForecast().precipitationAmountByType(j).minimumSnow(),
                    precipitationType: WK2.PrecipitationType[DailyForecastData.days(i).overnightForecast().precipitationAmountByType(j).precipitationType()],
                });
        }
        if (DailyForecastData.days(i).restOfDayForecast()) {
            day.restOfDayForecast = {
                cloudCover: DailyForecastData.days(i).restOfDayForecast().cloudCover(),
                cloudCoverHighAltPct: DailyForecastData.days(i).restOfDayForecast().cloudCoverHighAltPct(),
                cloudCoverLowAltPct: DailyForecastData.days(i).restOfDayForecast().cloudCoverLowAltPct(),
                cloudCoverMidAltPct: DailyForecastData.days(i).restOfDayForecast().cloudCoverMidAltPct(),
                conditionCode: WK2.WeatherCondition[DailyForecastData.days(i).restOfDayForecast().conditionCode()],
                forecastEnd: DailyForecastData.days(i).restOfDayForecast().forecastEnd(),
                forecastStart: DailyForecastData.days(i).restOfDayForecast().forecastStart(),
                humidity: DailyForecastData.days(i).restOfDayForecast().humidity(),
                humidityMax: DailyForecastData.days(i).restOfDayForecast().humidityMax(),
                humidityMin: DailyForecastData.days(i).restOfDayForecast().humidityMin(),
                precipitationAmount: DailyForecastData.days(i).restOfDayForecast().precipitationAmount(),
                precipitationAmountByType: [],
                precipitationChance: DailyForecastData.days(i).restOfDayForecast().precipitationChance(),
                precipitationType: WK2.PrecipitationType[DailyForecastData.days(i).restOfDayForecast().precipitationType()],
                snowfallAmount: DailyForecastData.days(i).restOfDayForecast().snowfallAmount(),
                temperatureMax: DailyForecastData.days(i).restOfDayForecast().temperatureMax(),
                temperatureMin: DailyForecastData.days(i).restOfDayForecast().temperatureMin(),
                visibilityMax: DailyForecastData.days(i).restOfDayForecast().visibilityMax(),
                visibilityMin: DailyForecastData.days(i).restOfDayForecast().visibilityMin(),
                windDirection: DailyForecastData.days(i).restOfDayForecast().windDirection(),
                windGustSpeedMax: DailyForecastData.days(i).restOfDayForecast().windGustSpeedMax(),
                windSpeed: DailyForecastData.days(i).restOfDayForecast().windSpeed(),
                windSpeedMax: DailyForecastData.days(i).restOfDayForecast().windSpeedMax(),
                precipitationIntensityMax: DailyForecastData.days(i).restOfDayForecast().precipitationIntensityMax(),
                perceivedPrecipitationIntensityMax: DailyForecastData.days(i).restOfDayForecast().perceivedPrecipitationIntensityMax(),
                uvIndexMin: DailyForecastData.days(i).restOfDayForecast().uvIndexMin(),
                uvIndexMax: DailyForecastData.days(i).restOfDayForecast().uvIndexMax(),
                temperatureApparentMin: DailyForecastData.days(i).restOfDayForecast().temperatureApparentMin(),
                temperatureApparentMax: DailyForecastData.days(i).restOfDayForecast().temperatureApparentMax(),
                daylight: DailyForecastData.days(i).restOfDayForecast().daylight(),
            };
            for (let j = 0; j < DailyForecastData.days(i).restOfDayForecast().precipitationAmountByTypeLength(); j++)
                day.restOfDayForecast.precipitationAmountByType.push({
                    expected: DailyForecastData.days(i).restOfDayForecast().precipitationAmountByType(j).expected(),
                    expectedSnow: DailyForecastData.days(i).restOfDayForecast().precipitationAmountByType(j).expectedSnow(),
                    maximumSnow: DailyForecastData.days(i).restOfDayForecast().precipitationAmountByType(j).maximumSnow(),
                    minimumSnow: DailyForecastData.days(i).restOfDayForecast().precipitationAmountByType(j).minimumSnow(),
                    precipitationType: WK2.PrecipitationType[DailyForecastData.days(i).restOfDayForecast().precipitationAmountByType(j).precipitationType()],
                });
        }
        data.days.push(day);
    }
    return data;
}

function decodeForecastHourly(data) {
    const HourlyForecastData = data;
    data = {
        metadata: decodeMetadata(HourlyForecastData.metadata()),
        hours: [],
    };
    for (let i = 0; i < HourlyForecastData.hoursLength(); i++)
        data.hours.push({
            cloudCover: HourlyForecastData.hours(i).cloudCover(),
            cloudCoverHighAltPct: HourlyForecastData.hours(i).cloudCoverHighAltPct(),
            cloudCoverLowAltPct: HourlyForecastData.hours(i).cloudCoverLowAltPct(),
            cloudCoverMidAltPct: HourlyForecastData.hours(i).cloudCoverMidAltPct(),
            conditionCode: WK2.WeatherCondition[HourlyForecastData.hours(i).conditionCode()],
            daylight: HourlyForecastData.hours(i).daylight(),
            forecastStart: HourlyForecastData.hours(i).forecastStart(),
            humidity: HourlyForecastData.hours(i).humidity(),
            perceivedPrecipitationIntensity: HourlyForecastData.hours(i).perceivedPrecipitationIntensity(),
            precipitationAmount: HourlyForecastData.hours(i).precipitationAmount(),
            precipitationChance: HourlyForecastData.hours(i).precipitationChance(),
            precipitationIntensity: HourlyForecastData.hours(i).precipitationIntensity(),
            precipitationType: WK2.PrecipitationType[HourlyForecastData.hours(i).precipitationType()],
            pressure: HourlyForecastData.hours(i).pressure(),
            pressureTrend: WK2.PressureTrend[HourlyForecastData.hours(i).pressureTrend()],
            snowfallAmount: HourlyForecastData.hours(i).snowfallAmount(),
            snowfallIntensity: HourlyForecastData.hours(i).snowfallIntensity(),
            temperature: HourlyForecastData.hours(i).temperature(),
            temperatureApparent: HourlyForecastData.hours(i).temperatureApparent(),
            unknown20: HourlyForecastData.hours(i).unknown20(),
            temperatureDewPoint: HourlyForecastData.hours(i).temperatureDewPoint(),
            uvIndex: HourlyForecastData.hours(i).uvIndex(),
            visibility: HourlyForecastData.hours(i).visibility(),
            windDirection: HourlyForecastData.hours(i).windDirection(),
            windGust: HourlyForecastData.hours(i).windGust(),
            windSpeed: HourlyForecastData.hours(i).windSpeed(),
        });
    return data;
}

function decodeForecastNextHour(data) {
    const NextHourForecastData = data;
    data = {
        metadata: decodeMetadata(NextHourForecastData.metadata()),
        condition: [],
        forecastEnd: NextHourForecastData.forecastEnd(),
        forecastStart: NextHourForecastData.forecastStart(),
        minutes: [],
        summary: [],
    };
    for (let i = 0; i < NextHourForecastData.conditionLength(); i++) {
        const condition = {
            beginCondition: WK2.ConditionType[NextHourForecastData.condition(i).beginCondition()],
            endCondition: WK2.ConditionType[NextHourForecastData.condition(i).endCondition()],
            endTime: NextHourForecastData.condition(i).endTime(),
            forecastToken: WK2.ForecastToken[NextHourForecastData.condition(i).forecastToken()],
            parameters: [],
            startTime: NextHourForecastData.condition(i).startTime(),
        };
        for (let j = 0; j < NextHourForecastData.condition(i).parametersLength(); j++)
            condition.parameters.push({
                date: NextHourForecastData.condition(i).parameters(j).date(),
                type: WK2.ParameterType[NextHourForecastData.condition(i).parameters(j).type()],
            });
        data.condition.push(condition);
    }
    for (let i = 0; i < NextHourForecastData.minutesLength(); i++)
        data.minutes.push({
            perceivedPrecipitationIntensity: NextHourForecastData.minutes(i).perceivedPrecipitationIntensity(),
            precipitationChance: NextHourForecastData.minutes(i).precipitationChance(),
            precipitationIntensity: NextHourForecastData.minutes(i).precipitationIntensity(),
            startTime: NextHourForecastData.minutes(i).startTime(),
        });
    for (let i = 0; i < NextHourForecastData.summaryLength(); i++)
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
    const NewsData = data;
    data = {
        metadata: decodeMetadata(NewsData.metadata()),
        placements: [],
    };
    for (let i = 0; i < NewsData.placementsLength(); i++) {
        const placement = {
            articles: [],
            placement: WK2.PlacementType[NewsData.placements(i).placement()],
            priority: NewsData.placements(i).priority(),
        };
        for (let j = 0; j < NewsData.placements(i).articlesLength(); j++) {
            const article = {
                alertIds: [],
                headlineOverride: NewsData.placements(i).articles(j).headlineOverride(),
                id: NewsData.placements(i).articles(j).id(),
                locale: NewsData.placements(i).articles(j).locale(),
                phenomena: [],
                supportedStorefronts: [],
            };
            for (let k = 0; k < NewsData.placements(i).articles(j).alertIdsLength(); k++) article.alertIds.push(decodeUuid(NewsData.placements(i).articles(j).alertIds(k)));
            for (let k = 0; k < NewsData.placements(i).articles(j).phenomenaLength(); k++) article.phenomena.push(NewsData.placements(i).articles(j).phenomena(k));
            for (let k = 0; k < NewsData.placements(i).articles(j).supportedStorefrontsLength(); k++) article.supportedStorefronts.push(NewsData.placements(i).articles(j).supportedStorefronts(k));
            placement.articles.push(article);
        }
        data.placements.push(placement);
    }
    return data;
}

function decodeWeatherAlerts(data) {
    const WeatherAlertCollectionData = data;
    data = {
        metadata: decodeMetadata(WeatherAlertCollectionData.metadata()),
        alerts: [],
        detailsUrl: WeatherAlertCollectionData.detailsUrl(),
    };
    for (let i = 0; i < WeatherAlertCollectionData.alertsLength(); i++) {
        const alert = {
            areaId: WeatherAlertCollectionData.alerts(i).areaId(),
            areaName: WeatherAlertCollectionData.alerts(i).areaName(),
            attributionUrl: WeatherAlertCollectionData.alerts(i).attributionUrl(),
            certainty: WK2.Certainty[WeatherAlertCollectionData.alerts(i).certainty()],
            countryCode: WeatherAlertCollectionData.alerts(i).countryCode(),
            description: WeatherAlertCollectionData.alerts(i).description(),
            detailsUrl: WeatherAlertCollectionData.alerts(i).detailsUrl(),
            effectiveTime: WeatherAlertCollectionData.alerts(i).effectiveTime(),
            eventEndTime: WeatherAlertCollectionData.alerts(i).eventEndTime(),
            eventOnsetTime: WeatherAlertCollectionData.alerts(i).eventOnsetTime(),
            eventSource: WeatherAlertCollectionData.alerts(i).eventSource(),
            expireTime: WeatherAlertCollectionData.alerts(i).expireTime(),
            id: decodeUuid(WeatherAlertCollectionData.alerts(i).id()),
            importance: WK2.ImportanceType[WeatherAlertCollectionData.alerts(i).importance()],
            issuedTime: WeatherAlertCollectionData.alerts(i).issuedTime(),
            phenomenon: WeatherAlertCollectionData.alerts(i).phenomenon(),
            responses: [],
            severity: WK2.Severity[WeatherAlertCollectionData.alerts(i).severity()],
            significance: WK2.SignificanceType[WeatherAlertCollectionData.alerts(i).significance()],
            source: WeatherAlertCollectionData.alerts(i).source(),
            token: WeatherAlertCollectionData.alerts(i).token(),
            urgency: WK2.Urgency[WeatherAlertCollectionData.alerts(i).urgency()],
            unknown23: WeatherAlertCollectionData.alerts(i).unknown23(),
            unknown24: WeatherAlertCollectionData.alerts(i).unknown24(),
            unknown25: WeatherAlertCollectionData.alerts(i).unknown25(),
            unknown26: WeatherAlertCollectionData.alerts(i).unknown26(),
        };
        //for (let j = 0; j < WeatherAlertCollectionData.alerts(i).idLength(); j++) alert.id.push(WeatherAlertCollectionData.alerts(i).id(j));
        //for (let j = 0; j < WeatherAlertCollectionData.alerts(i).idLength(); j++) alert.id.push({ "lowBytes": WeatherAlertCollectionData.alerts(i).id(j).lowBytes(), "highBytes": WeatherAlertCollectionData.alerts(i).id(j).highBytes() });
        for (let j = 0; j < WeatherAlertCollectionData.alerts(i).responsesLength(); j++) alert.responses.push(WK2.ResponseType[WeatherAlertCollectionData.alerts(i).responses(j)]);
        data.alerts.push(alert);
    }
    return data;
}

function decodeWeatherChanges(data) {
    const WeatherChangesData = data;
    data = {
        metadata: decodeMetadata(WeatherChangesData.metadata()),
        changes: [],
        forecastEnd: WeatherChangesData.forecastEnd(),
        forecastStart: WeatherChangesData.forecastStart(),
    };
    for (let i = 0; i < WeatherChangesData.changesLength(); i++) {
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
    const HistoricalComparisonsData = data;
    data = {
        metadata: decodeMetadata(HistoricalComparisonsData.metadata()),
        comparisons: [],
    };
    for (let i = 0; i < HistoricalComparisonsData.comparisonsLength(); i++) {
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
