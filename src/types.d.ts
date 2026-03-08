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
         * [天气] 替换范围
         *
         * 正则表达式，只替换指定地区的天气。
         *
         * @defaultValue ["CN"]
         */
        Replace?: any[];
    /**
         * [天气] 数据源
         *
         * 使用选定的数据源替换天气数据。
         *
         * @remarks
         *
         * Possible values:
         * - `'WeatherKit'` - WeatherKit（不替换）
         * - `'ColorfulClouds'` - 彩云天气
         * - `'QWeather'` - 和风天气
         *
         * @defaultValue "ColorfulClouds"
         */
        Provider?: 'WeatherKit' | 'ColorfulClouds' | 'QWeather';
};
    NextHour?: {
    /**
         * [未来一小时降水强度] 数据源
         *
         * 使用选定的数据源填充未来一小时降水强度的数据。
         *
         * @remarks
         *
         * Possible values:
         * - `'WeatherKit'` - WeatherKit（不添加）
         * - `'ColorfulClouds'` - 彩云天气
         * - `'QWeather'` - 和风天气
         *
         * @defaultValue "ColorfulClouds"
         */
        Provider?: 'WeatherKit' | 'ColorfulClouds' | 'QWeather';
};
    AirQuality?: {
    Current?: {
            Pollutants?: {
            /**
                 * [今日污染物] 数据源
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
            Units?: {
                /**
                 * [今日污染物 - 单位转换] 替换目标
                 *
                 * 转换污染物的单位，方便与空气质量标准比对。单位转换会产生小数，有略微精度损失，且小数部分可能会被省略。
                 *
                 * @remarks
                 *
                 * Possible values:
                 * - `'EPA_NowCast'` - 美国AQI（EPA_NowCast）
                 * - `'EU.EAQI'` - 欧盟EAQI（EU.EAQI）
                 * - `'HJ6332012'` - 中国AQI（HJ6332012）
                 * - `'UBA'` - 德国LQI（UBA）
                 *
                 * @defaultValue []
                 */
                Replace?: ('EPA_NowCast' | 'EU.EAQI' | 'HJ6332012' | 'UBA')[];
                /**
                 * [今日污染物 - 单位转换] 模式
                 *
                 * 污染物单位的转换目标。
                 *
                 * @remarks
                 *
                 * Possible values:
                 * - `'Scale'` - 与空气质量标准的要求相同
                 * - `'ugm3'` - 除非标准要求，都转为µg/m³
                 * - `'EU_ppb'` - 除非标准要求，都转为欧盟ppb
                 * - `'US_ppb'` - 除非标准要求，都转为美标ppb
                 * - `'Force_ugm3'` - µg/m³
                 * - `'Force_EU_ppb'` - 欧盟ppb
                 * - `'Force_US_ppb'` - 美标ppb
                 *
                 * @defaultValue "Scale"
                 */
                Mode?: 'Scale' | 'ugm3' | 'EU_ppb' | 'US_ppb' | 'Force_ugm3' | 'Force_EU_ppb' | 'Force_US_ppb';
};
};
            Index?: {
                /**
                 * [今日空气指数] 替换目标
                 *
                 * 替换指定标准的空气质量指数。
                 *
                 * @remarks
                 *
                 * Possible values:
                 * - `'HJ6332012'` - 中国AQI（HJ6332012）
                 * - `'IE.AQIH'` - 爱尔兰AQIH（IE.AQIH）
                 * - `'AT.AQI'` - 奥地利AQI（AT.AQI）
                 * - `'BE.BelAQI'` - 比利时BelAQI（BE.BelAQI）
                 * - `'UBA'` - 德国LQI（UBA）
                 * - `'FR.ATMO'` - 法国IQA（FR.ATMO）
                 * - `'KR.CAI'` - 韩国CAI（KR.CAI）
                 * - `'CA.AQHI'` - 加拿大AQHI（CA.AQHI）
                 * - `'CZ.AQI'` - 捷克AQI（CZ.AQI）
                 * - `'NL.LKI'` - 荷兰LKI（NL.LKI）
                 * - `'EPA_NowCast'` - 美国AQI（EPA_NowCast）
                 * - `'ICARS'` - 墨西哥ICARS（ICARS）
                 * - `'EU.EAQI'` - 欧盟EAQI（EU.EAQI）
                 * - `'CH.KBI'` - 瑞士KBI（CH.KBI）
                 * - `'ES.MITECO'` - 西班牙ICA（ES.MITECO）
                 * - `'SG.NEA'` - 新加坡PSI（SG.NEA）
                 * - `'NAQI'` - 印度NAQI（NAQI）
                 * - `'DAQI'` - 英国DAQI（DAQI）
                 *
                 * @defaultValue ["HJ6332012"]
                 */
                Replace?: ('HJ6332012' | 'IE.AQIH' | 'AT.AQI' | 'BE.BelAQI' | 'UBA' | 'FR.ATMO' | 'KR.CAI' | 'CA.AQHI' | 'CZ.AQI' | 'NL.LKI' | 'EPA_NowCast' | 'ICARS' | 'EU.EAQI' | 'CH.KBI' | 'ES.MITECO' | 'SG.NEA' | 'NAQI' | 'DAQI')[];
                /**
                 * [今日空气指数] 数据源
                 *
                 * 使用选定的数据源填补和替换空气质量指数。
                 *
                 * @remarks
                 *
                 * Possible values:
                 * - `'Calculate'` - iRingo内置算法
                 * - `'ColorfulCloudsUS'` - 彩云天气（美标，18年9月版）
                 * - `'ColorfulCloudsCN'` - 彩云天气（国标，12年2月版）
                 * - `'QWeather'` - 和风天气（国标，12年2月版）
                 *
                 * @defaultValue "Calculate"
                 */
                Provider?: 'Calculate' | 'ColorfulCloudsUS' | 'ColorfulCloudsCN' | 'QWeather';
                /**
                 * [今日空气指数] 强制主要污染物
                 *
                 * 忽略国标（HJ 633—2012）的AQI > 50规定，始终将IAQI最大的空气污染物作为主要污染物。
                 *
                 * @defaultValue true
                 */
                ForceCNPrimaryPollutants?: boolean;
};
};
    Comparison?: {
        /**
         * [空气质量 - 对比昨日] 变化时替换
         *
         * 即使已有对比昨日数据，当今日空气质量指数发生变化时，替换对比昨日数据。
         *
         * @defaultValue false
         */
        ReplaceWhenCurrentChange?: boolean;
        Yesterday?: {
            /**
             * [昨日污染物] 数据源
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
             * [昨日空气指数] 数据源
             *
             * 用来和今日空气质量指数对比的数据。
             *
             * @remarks
             *
             * Possible values:
             * - `'Calculate'` - iRingo内置算法
             * - `'ColorfulCloudsUS'` - 彩云天气（美标，18年9月版）
             * - `'ColorfulCloudsCN'` - 彩云天气（国标，12年2月版）
             * - `'QWeather'` - 和风天气（国标，12年2月版）
             *
             * @defaultValue "ColorfulCloudsUS"
             */
            IndexProvider?: 'Calculate' | 'ColorfulCloudsUS' | 'ColorfulCloudsCN' | 'QWeather';
};
};
    Calculate?: {
        /**
         * [iRingo内置算法] 算法
         *
         * 使用内置算法，通过污染物数据本地计算空气指数。InstantCast源自于WAQI，美标版本使用了WAQI的臭氧标准。
         *
         * @remarks
         *
         * Possible values:
         * - `'None'` - 不转换
         * - `'UBA'` - 德国LQI（FB001846）
         * - `'EU_EAQI'` - 欧盟EAQI（ETC HE Report 2024/17）
         * - `'WAQI_InstantCast_US'` - 美标InstantCast（EPA-454/B-24-002）
         * - `'WAQI_InstantCast_CN'` - 国标InstantCast（HJ 633—2012）
         * - `'WAQI_InstantCast_CN_25_DRAFT'` - 国标InstantCast（HJ 633 2025年草案）
         * - `'CA_AQHI'` - 加拿大AQHI（10.17269/s41997-019-00237-w）
         * - `'HK_AQHI'` - 香港AQHI
         * - `'CN_DEATH_AQHI'` - 中国（致死风险）AQHI
         * - `'CN_DEATH_HK_AQHI'` - 中国（致死风险）+香港AQHI
         *
         * @defaultValue "EU_EAQI"
         */
        Algorithm?: 'None' | 'UBA' | 'EU_EAQI' | 'WAQI_InstantCast_US' | 'WAQI_InstantCast_CN' | 'WAQI_InstantCast_CN_25_DRAFT' | 'CA_AQHI' | 'HK_AQHI' | 'CN_DEATH_AQHI' | 'CN_DEATH_HK_AQHI';
        /**
         * [iRingo内置算法] 允许指数超标
         *
         * 允许美标和国标的指数超过500。超过500时，指示颜色的小圆点会消失。
         *
         * @defaultValue true
         */
        AllowOverRange?: boolean;
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
     * [储存] 配置类型
     *
     * 选择要使用的配置类型。未设置此选项或不通过此选项的旧版本的配置顺序依旧是 $persistentStore (BoxJs) > $argument > database。
     *
     * @remarks
     *
     * Possible values:
     * - `'Argument'` - 优先使用插件选项与模块参数等，由 $argument 传入的配置，$argument 不包含的设置项由 PersistentStore (BoxJs) 提供
     * - `'PersistentStore'` - 只使用来自 BoxJs 等，由 $persistentStore 提供的配置
     * - `'database'` - 只使用由作者的 database.mjs 文件提供的默认配置，其他任何自定义配置不再起作用
     *
     * @defaultValue "Argument"
     */
    Storage?: 'Argument' | 'PersistentStore' | 'database';
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
