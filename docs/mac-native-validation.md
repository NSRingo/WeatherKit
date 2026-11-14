# Mac native observations

Observed on 2026-11-06 and 07, macOS 27.3 (26C5035r), Loon for Mac 0.5.0 (1011). The installed candidate was fetched from a fixed GitHub commit; exactly one WeatherKit installation was enabled. Values below describe public test-city previews at the time of observation.

| City | Algorithm | Displayed index/category | CO (ug/m3) | Concentrations |
| --- | --- | --- | --- | --- |
| Binhai | EU_EAQI | 不佳 | 400 | Six present |
| Wuxi | UBA | 普通 | 400 | Six present |
| Ningbo | WAQI_InstantCast_US | 107 | 1100 | Six present |
| Guiyang | WAQI_InstantCast_CN | 39 | 200 | Six present |
| Xianyang | WAQI_InstantCast_CN_25_DRAFT | 107 | 1200 | Six present |
| Mianyang | CA_AQHI | 5 | 700 | Six present |
| Foshan | HK_AQHI | 4 | 1000 | Six present |
| Zhuzhou | AQHI_Multi_CN | 2 | 500 | Six present |
| Huanggang | AQHI_Multi_CN_HK | 3 | 400 | Six present |
| Luoyang | CN_DEATH_AQHI | 3 | 400 | Six present |
| Wuhu | CN_DEATH_HK_AQHI | 3 | 800 | Six present |
| Yantai | None | 17 | 400 | Six present |

Binhai showed warning banners. Native Safari displayed four full warning descriptions, issuers and source links. Manchester retained UK DAQI 3, BreezoMeter and the original comparison while CA_AQHI was selected, with no provider requests. With all replacement datasets disabled, Laoshan retained Apple current weather, hourly and ten-day forecasts, AQI 22 and two original warnings (marine strong wind and cold wave).

The 129411-line system-log snapshot contained zero WeatherAlert/other decoding errors, invalidWeather records or CloudKit fallback. The last script snapshot recorded 72 executions, 72 finished and zero exceptions. These are snapshots at different times, not a long-running stability guarantee.

[Source CI 4d1f127](https://github.com/hhhoratioxu/WeatherKit/actions/runs/42234270265) performed a locked Node v22.23.4 install and passed 335 regressions, 40 compiled scenarios, 15 expression checks and twelve original defaults. The downloaded five-file ZIP SHA-256 was 2c564605fd9ee25762a2bb9effefa17ed77d82d40c018c8bec0990ddfb51cd67. Its three runtime files were byte-identical to the actual Mac candidate:

- request: d8e75cb50be818668e26fa7c08b66c471d5fac2b8d63db73a1e5eb6eed333bfd
- response: 1408002e7fa6cdded1e5aef824c1e6daeb88367e19b9651e2ef0d1b89db544a0
- scale: 5896bada8857312ebf5a70b7519452d21c8fbd6131e0df882d8d5f83b813016f

## Limits

Valid dedicated QWeather credentials were not configured, so authentication-failure fallback is not reported as successful authorized API acceptance. The final combination with every source set to WeatherKit was not independently repeated on this candidate. Widgets, watch/background custom replacement, long-running VPN operation and device battery/memory percentages were not comprehensively accepted. No original device bodies, authentication headers, precise coordinates or personal configuration are included.
