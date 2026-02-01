export interface Settings {
    DataSets: {
        /**
         * [数据集] 替换地区
         *
         * 正则表达式，只替换指定地区的数据集。
         *
         * @defaultValue "CN|HK|MO|TW"
         */
        Replace?: string;
        /**
         * [数据集]
         *
         * 选中的数据集会被包含在请求中。
         *
         * @remarks
         *
         * Possible values:
         * - `'airQuality'` - 空气质量
         * - `'currentWeather'` - 当前天气
         * - `'forecastDaily'` - 每日预报
         * - `'forecastHourly'` - 每小时预报
         * - `'forecastNextHour'` - 未来一小时降水强度
         * - `'locationInfo'` - 位置信息
         * - `'news'` - 新闻
         * - `'historicalComparisons'` - 历史对比
         * - `'weatherAlerts'` - 天气预警
         * - `'weatherChanges'` - 天气变化
         *
         * @defaultValue ["airQuality","currentWeather","forecastDaily","forecastHourly","forecastNextHour","locationInfo","news","historicalComparisons","weatherAlerts","weatherChanges"]
         */
        Value?: ('airQuality' | 'currentWeather' | 'forecastDaily' | 'forecastHourly' | 'forecastNextHour' | 'locationInfo' | 'news' | 'historicalComparisons' | 'weatherAlerts' | 'weatherChanges')[];
    },
    Weather?: {
        /**
         * [天气] 替换地区
         *
         * 正则表达式，只替换指定地区的天气。
         *
         * @defaultValue "CN"
         */
        Replace?: string;
        /**
         * [天气] 数据源
         *
         * 使用选定的数据源替换天气数据。
         *
         * @remarks
         *
         * Possible values:
         * - `'WeatherKit'` - WeatherKit (不进行替换)
         * - `'ColorfulClouds'` - 彩云天气
         * - `'QWeather'` - 和风天气
         *
         * @defaultValue "WeatherKit"
         */
        Provider?: 'WeatherKit' | 'ColorfulClouds' | 'QWeather';
    };
    NextHour?: {
        /**
         * [未来一小时降水强度] 填补地区
         *
         * 正则表达式，只填补指定地区的未来一小时降水强度。
         *
         * @defaultValue "*"
         */
        Fill?: string;
        /**
         * [未来一小时降水强度] 数据源
         *
         * 使用选定的数据源填充未来一小时降水强度的数据。
         *
         * @remarks
         *
         * Possible values:
         * - `'WeatherKit'` - WeatherKit (不进行填补)
         * - `'ColorfulClouds'` - 彩云天气
         * - `'QWeather'` - 和风天气
         *
         * @defaultValue "ColorfulClouds"
         */
        Provider?: 'WeatherKit' | 'ColorfulClouds' | 'QWeather';
    };
    AirQuality?: {
        Current?: {
            /**
             * [空气质量 - 今日] 填补地区
             *
             * 正则表达式，只填补指定地区的今日空气质量数据。
             *
             * @defaultValue "CN|HK|MO|TW"
             */
            Fill?: string;
            Pollutants?: {
                /**
                 * [空气质量 - 今日 - 污染物] 数据源
                 *
                 * 使用选定的数据源填补污染物数据。
                 *
                 * @remarks
                 *
                 * Possible values:
                 * - `'ColorfulClouds'` - 彩云天气
                 * - `'QWeather'` - 和风天气
                 *
                 * @defaultValue "ColorfulClouds"
                 */
                Provider?: 'ColorfulClouds' | 'QWeather';
                // Units?: {
                //     Ugm3ToUSPpb?: string;
                //     Ugm3ToEUPpb?: string;
                //     EUppbToUgm3?: string;
                //     USppbToUgm3?: string;
                // },
            },
            Index?: {
                /**
                 * [空气质量 - 今日 - 空气质量指数] 替换目标
                 *
                 * 替换指定标准的空气质量指数。
                 *
                 * @remarks
                 *
                 * Possible values:
                 * - `'HJ6332012'` - 中国 (HJ 633—2012)
                 * - `'EPA_NowCast'` - 美国 (EPA NowCast)
                 *
                 * @defaultValue ["HJ6332012"]
                 */
                Replace?: string;
                /**
                 * [空气质量 - 今日 - 空气质量指数] 数据源
                 *
                 * 使用选定的数据源填补和替换空气质量指数。
                 * 彩云天气（美标）为2018年9月版（EPA-454/B-18-007），
                 * WAQI是基于2018年9月版美标（EPA-454/B-18-007）的InstantCast。
                 *
                 * @remarks
                 *
                 * Possible values:
                 * - `'iRingo'` - iRingo内置算法
                 * - `'ColorfulCloudsUS'` - 彩云天气（美标）
                 * - `'ColorfulCloudsCN'` - 彩云天气（国标）
                 * - `'QWeather'` - 和风天气
                 * - `'WAQI'` - The World Air Quality Project（InstantCast）
                 *
                 * @defaultValue "iRingo"
                 */
                Provider?: 'iRingo' | 'ColorfulCloudsUS' | 'ColorfulCloudsCN' | 'QWeather' | 'WAQI';
            }
        },
        Comparison?: {
            /**
             * [空气质量 - 对比昨日] 填补地区
             *
             * 正则表达式，只填补指定地区的对比昨日数据。
             *
             * @defaultValue "CN|HK|MO|TW"
             */
            Fill?: string;
            /**
             * [空气质量 - 对比昨日] 数据变化时替换
             *
             * 即使已有对比昨日数据，当今日空气质量指数发生变化时，替换对比昨日数据。
             *
             * @defaultValue false
             */
            ReplaceWhenCurrentChange?: boolean;
            Yesterday?: {
                /**
                 * [空气质量 - 对比昨日 - 昨日 - 污染物] 数据源
                 *
                 * 为iRingo内置算法提供污染物数据，计算出昨日的空气质量指数。
                 *
                 * @remarks
                 *
                 * Possible values:
                 * - `'QWeather'` - 和风天气
                 *
                 * @defaultValue "QWeather"
                 */
                PollutantsProvider?: 'QWeather';
                /**
                 * [空气质量 - 对比昨日 - 昨日 - 空气质量指数] 数据源
                 *
                 * 用来和今日空气质量指数对比的数据。
                 * iRingo内置算法需要昨日污染物数据，
                 * 彩云天气（美标）为2018年9月版（EPA-454/B-18-007）。
                 *
                 * @remarks
                 *
                 * Possible values:
                 * - `'iRingo'` - iRingo内置算法
                 * - `'ColorfulCloudsUS'` - 彩云天气（美标）
                 * - `'ColorfulCloudsCN'` - 彩云天气（国标）
                 * - `'QWeather'` - 和风天气
                 *
                 * @defaultValue "ColorfulCloudsUS"
                 */
                IndexProvider?: 'iRingo' | 'ColorfulCloudsUS' | 'ColorfulCloudsCN' | 'QWeather';
            },
        },
        /**
         * [空气质量 - iRingo内置算法] 算法
         *
         * 使用内置算法，通过污染物数据本地计算空气指数。
         *
         * @remarks
         *
         * Possible values:
         * - `'UBA'` - 德国LQI（2025年8月）
         * - `'EU_EAQI'` - 欧盟EAQI（ETC HE Report 2024/17）
         * - `'WAQI_InstantCast_US'` - 美标WAQI InstantCast（EPA-454/B-24-002）
         * - `'WAQI_InstantCast_CN'` - 国标WAQI InstantCast（HJ 633—2012）
         *
         * @defaultValue "UBA"
         */
        iRingoAlgorithm?: 'UBA' | 'EU_EAQI' | 'WAQI_InstantCast_US' | 'WAQI_InstantCast_CN';
    };
    API?: {
        ColorfulClouds?: {
            /**
             * [API] 彩云天气令牌
             *
             * 彩云天气 API 令牌
             *
             * @defaultValue ""
             */
            Token?: string;
        };
        QWeather?: {
            /**
             * [API] 和风天气主机
             *
             * 和风天气 API 使用的主机名
             *
             * @defaultValue "devapi.qweather.com"
             */
            Host?: string;
            /**
             * [API] 和风天气令牌
             *
             * 和风天气 API 令牌
             *
             * @defaultValue ""
             */
            Token?: string;
        };
        WAQI?: {
            /**
             * [API] WAQI 令牌
             *
             * WAQI API 令牌，填写此字段将自动使用WAQI高级API
             *
             * @defaultValue ""
             */
            Token?: string;
        };
    };
    /**
     * [调试] 日志等级
     *
     * 选择脚本日志的输出等级，低于所选等级的日志将全部输出。
     *
     * @remarks
     *
     * Possible values:
     * - `'OFF'` - 关闭
     * - `'ERROR'` - ❌ 错误
     * - `'WARN'` - ⚠️ 警告
     * - `'INFO'` - ℹ️ 信息
     * - `'DEBUG'` - 🅱️ 调试
     * - `'ALL'` - 全部
     *
     * @defaultValue "WARN"
     */
    LogLevel?: 'OFF' | 'ERROR' | 'WARN' | 'INFO' | 'DEBUG' | 'ALL';
}
