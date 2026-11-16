import { FlatBufferRootProcessor } from "@nsnanocat/flatbuffer-root";
import { WK3 } from "@nsringo/weatherkit";

// 产品边界保留未知/未来根产品的原始 arena；表布局与枚举处理由协议包统一提供，所有已注册 WK3 产品共享。
// Product boundaries preserve opaque/future roots. Table layout and enum handling live
// in the protocol package and are shared by every registered WK3 product.
const roots = WK3.Schema.tables.Weather;

/**
 * 使用 Weather 根模型和协议包 Codec 配置通用根表处理器。
 * Configure the generic root-table processor with the Weather model and the protocol package codec.
 */
const WeatherKit3 = new FlatBufferRootProcessor({
    name: "WeatherKit3",
    rootClass: WK3.Weather,
    configurableRootNames: roots.map(field => field.name),
    codecs: Object.fromEntries(
        roots.map(({ name, type }) => [
            name,
            {
                tableClass: WK3[type],
                decode: table => WK3.Codec.decode(type, table, { uuidStrings: true }),
                encode: (builder, data) => WK3.Codec.encode(type, builder, data),
            },
        ]),
    ),
});
export default WeatherKit3;
