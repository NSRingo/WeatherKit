import { FlatBufferRootProcessor } from "@nsnanocat/flatbuffer-root";
import { WK3 } from "@nsringo/weatherkit";

// Product boundaries preserve opaque/future roots. Table layout and enum handling live
// in the protocol package and are shared by every registered WK3 product.
const roots = WK3.Schema.tables.Weather;
const WeatherKit3 = new FlatBufferRootProcessor({
    name: "WeatherKit3",
    rootClass: WK3.Weather,
    configurableRootNames: roots.map(field => field.name),
    codecs: Object.fromEntries(roots.map(({ name, type }) => [name, {
        tableClass: WK3[type],
        decode: table => WK3.Codec.decode(type, table, { uuidStrings: true }),
        encode: (builder, data) => WK3.Codec.encode(type, builder, data),
    }])),
});
export default WeatherKit3;

/** Translate existing provider products into native WK3 value shapes before encoding. */
export function prepareWeatherKit3Product(name, product) {
    const type = roots.find(root => root.name === name)?.type;
    if (!type) throw new RangeError(`Unknown WK3 product ${name}`);
    function visit(table, data) {
        if (table === "PrecipitationRange" && typeof data === "number") return { expected: data, minimum: data, maximum: data };
        if (table === "UUID" && typeof data === "string") return data;
        if (!data || typeof data !== "object" || Array.isArray(data)) throw new TypeError(`WK3 ${table} object expected`);
        const result = {};
        if (table === "NextHourForecastData" && Array.isArray(data.condition)) {
            data = { ...data, condition: data.condition.filter(item =>
                Object.hasOwn(WK3.Schema.enums.ForecastToken.values, item.forecastToken) &&
                [item.beginCondition, item.endCondition].every(value => Object.hasOwn(WK3.Schema.enums.ConditionType.values, value))) };
        }
        for (const field of WK3.Schema.tables[table]) {
            let value = data[field.name];
            if (value == null || (field.optional && value === 0)) continue;
            const tableType = WK3.Schema.tables[field.type];
            if (field.vector) {
                if (WK3.Schema.enums[field.type] && typeof value === "string") value = [value];
                if (!Array.isArray(value)) throw new TypeError(`WK3 ${field.name} vector expected`);
                result[field.name] = tableType ? value.map(item => visit(field.type, item)) : value;
            } else if (tableType) result[field.name] = visit(field.type, value);
            else {
                if (table === "Metadata" && ["latitude", "longitude"].includes(field.name) && typeof value === "string") value = Number(value);
                if (["byte", "ubyte", "short", "ushort", "int", "uint"].includes(field.type) && typeof value === "number") value = field.type === "uint" ? Math.trunc(value) : Math.round(value);
                result[field.name] = value;
            }
        }
        return result;
    }
    return visit(type, product);
}
