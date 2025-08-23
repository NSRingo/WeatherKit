export interface Settings {
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
    DataSets?: ('airQuality' | 'currentWeather' | 'forecastDaily' | 'forecastHourly' | 'forecastNextHour' | 'locationInfo' | 'news' | 'historicalComparisons' | 'weatherAlerts' | 'weatherChanges')[];
    Weather?: {
    /**
         * [天气] 数据源
         *
         * 始终会使用选定的数据源，替换天气数据。
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
         * [未来一小时降水强度] 数据源
         *
         * 始终会使用选定的数据源，填补无降水监测地区的数据。
         *
         * @remarks
         *
         * Possible values:
         * - `'WeatherKit'` - WeatherKit (不进行替换)
         * - `'ColorfulClouds'` - 彩云天气
         * - `'QWeather'` - 和风天气
         *
         * @defaultValue "ColorfulClouds"
         */
        Provider?: 'WeatherKit' | 'ColorfulClouds' | 'QWeather';
};
    AQI?: {
    /**
         * [空气质量] 数据源
         *
         * 始终会使用选定的数据源，填补无空气质量监测地区的数据。
         *
         * @remarks
         *
         * Possible values:
         * - `'WeatherKit'` - WeatherKit (不进行替换)
         * - `'ColorfulClouds'` - 彩云天气
         * - `'QWeather'` - 和风天气
         * - `'WAQI'` - The World Air Quality Project
         *
         * @defaultValue "ColorfulClouds"
         */
        Provider?: 'WeatherKit' | 'ColorfulClouds' | 'QWeather' | 'WAQI';
    /**
         * [空气质量] 需要替换的供应商
         *
         * 选中的空气质量数据源会被替换。
         *
         * @remarks
         *
         * Possible values:
         * - `'QWeather'` - 和风天气
         * - `'BreezoMeter'` - BreezoMeter
         * - `'TWC'` - The Weather Channel
         *
         * @defaultValue ["QWeather"]
         */
        ReplaceProviders?: ('QWeather' | 'BreezoMeter' | 'TWC')[];
    /**
         * [空气质量] 对比昨日数据源
         *
         * 始终会使用选定的数据源，填补无对比昨日地区的数据。
         *
         * @remarks
         *
         * Possible values:
         * - `'WeatherKit'` - WeatherKit (不进行替换)
         * - `'QWeather'` - 和风天气
         *
         * @defaultValue "QWeather"
         */
        ComparisonProvider?: 'WeatherKit' | 'QWeather';
    Local?: {
        /**
         * [空气质量] 需要修改的标准
         *
         * 选中的空气质量标准会被替换。请注意各国监测的污染物种类可能有所不同，转换算法或API未必适合当地。
         *
         * @remarks
         *
         * Possible values:
         * - `'HJ6332012'` - 中国 (HJ 633—2012)
         * - `'EPA_NowCast'` - 美国 (EPA NowCast)
         *
         * @defaultValue ["HJ6332012"]
         */
        ReplaceScales?: ('HJ6332012' | 'EPA_NowCast')[];
        /**
         * [空气质量] 本地替换算法
         *
         * 本地替换时使用的算法
         *
         * @remarks
         *
         * Possible values:
         * - `'NONE'` - None (不进行替换)
         * - `'WAQI_InstantCast'` - WAQI InstantCast
         *
         * @defaultValue "WAQI_InstantCast"
         */
        Scale?: 'NONE' | 'WAQI_InstantCast';
        /**
         * [空气质量] 转换污染物计量单位
         *
         * 将污染物数据替换为转换单位后的数据，方便对照转换后的标准。（不推荐。不同单位互转可能会损失精度，导致数值偏大）
         *
         * @defaultValue false
         */
        ConvertUnits?: boolean;
};
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
         * @remarks
         *
         * Possible values:
         * - `'devapi.qweather.com'` - 免费订阅 (devapi.qweather.com)
         * - `'api.qweather.com'` - 付费订阅 (api.qweather.com)
         *
         * @defaultValue "devapi.qweather.com"
         */
        Host?: 'devapi.qweather.com' | 'api.qweather.com';
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
