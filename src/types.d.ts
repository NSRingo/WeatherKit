export interface Settings {
    DataSets: {
        /**
         * [数据集] 修改地区
         *
         * 正则表达式，只修改指定地区的数据集。
         *
         * @defaultValue "CN|HK|MO|TW"
         */
        Targets: string;
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
        Targets: string;
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
        Targets: string;
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
        /**
         * [空气质量 - 污染物] 修复和风天气的一氧化碳数据
         *
         * 和风天气错误地将mg/m3单位的CO数据当作µg/m3单位，导致CO数据偏小。
         *
         * @defaultValue true
         */
        FixQWeatherCO: boolean;
        /**
         * [空气质量 - 污染物和对比昨日] 填补地区
         *
         * 正则表达式，只填补指定地区的数据。
         *
         * @defaultValue "CN|HK|MO|TW"
         */
        PollutantsAndComparisonTargets: string;
        /**
         * [空气质量 - 污染物] 数据源
         *
         * 使用选定的数据源填充污染物数据。
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
        PollutantProvider?: 'WeatherKit' | 'ColorfulClouds' | 'QWeather';
        /**
         * [空气质量 - 对比昨日] 数据源
         *
         * 使用选定的数据源填补对比昨日的数据。
         *
         * @remarks
         *
         * Possible values:
         * - `'WeatherKit'` - WeatherKit (不进行填补)
         * - `'QWeatherPollutants'` - 和风天气（污染物模式）
         * - `'QWeatherCNIndex'` - 和风天气（空气指数模式）
         * - `'ColorfulCloudsUSIndex'` - 彩云天气（空气指数模式，美标，2018年9月版，EPA-454/B-18-007）
         * - `'ColorfulCloudsCNIndex'` - 彩云天气（空气指数模式，国标，2012年2月版，HJ 633—2012）
         *
         * @defaultValue "QWeatherPollutants"
         */
        ComparisonProvider?: 'WeatherKit' | 'QWeatherPollutants' | 'QWeatherCNIndex' | 'ColorfulCloudsUSIndex' | 'ColorfulCloudsCNIndex';
        Index: {
            /**
             * [空气质量 - 空气指数] 替换目标
             *
             * 只替换指定标准的空气指数。
             *
             * @remarks
             *
             * Possible values:
             * - `'HJ6332012'` - 中国 (HJ 633—2012)
             * - `'EPA_NowCast'` - 美国 (EPA NowCast)
             *
             * @defaultValue ["HJ6332012"]
             */
            Targets?: ('HJ6332012' | 'EPA_NowCast')[];
            /**
             * [空气质量 - 空气指数] 数据源
             *
             * 使用选定的数据源填补污染物数据。
             *
             * @remarks
             *
             * Possible values:
             * - `'WeatherKit'` - WeatherKit (不进行填补)
             * - `'iRingo'` - iRingo内置算法
             * - `'ColorfulCloudsUs'` - 彩云天气（美标，2018年9月版，EPA-454/B-18-007）
             * - `'ColorfulCloudsCn'` - 彩云天气（国标，2012年2月版，HJ 633—2012）
             * - `'QWeather'` - 和风天气
             * - `'WAQI'` - The World Air Quality Project
             *
             * @defaultValue "iRingo"
             */
            Provider?: 'WeatherKit' | 'iRingo' | 'ColorfulCloudsUS' | 'ColorfulCloudsCN' | 'QWeather' | 'WAQI';
            /**
             * [空气质量 - 空气指数 - iRingo内置算法]
             *
             * 使用内置算法，通过污染物数据本地计算空气指数。
             *
             * @remarks
             *
             * Possible values:
             * - `'UBA'` - 德国LQI（2025年8月）
             * - `'EU_EAQI'` - 欧盟EAQI（ETC HE Report 2024/17）
             * - `'WAQI_InstantCast_US'` - WAQI InstantCast US（EPA-454/B-24-002）
             * - `'WAQI_InstantCast_CN'` - WAQI InstantCast CN（HJ 633—2012）
             *
             * @defaultValue "UBA"
             */
            iRingoCalculatingMethod?: 'UBA' | 'EU_EAQI' | 'WAQI_InstantCast_US' | 'WAQI_InstantCast_CN';
        },
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
