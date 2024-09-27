export default {
	"WeatherKit": {
		"Settings": {
			"Switch": true,
			"NextHour": {
				"Provider": "ColorfulClouds"
			},
			"AQI": {
				"Provider": "ColorfulClouds",
				"ReplaceProviders": [],
				"Local": {
					"Scale": "WAQI_InstantCast",
					"ReplaceScales": ["HJ6332012"],
					"ConvertUnits": false
				}
			},
			"API": {
				"WAQI": {
					"Token": null,
					"Header": { "Content-Type": "application/json" }
				},
				"QWeather": {
					"Token": null,
					"Header": { "Content-Type": "application/json" },
					"Host": "devapi.qweather.com"
				},
				"ColorfulClouds": {
					"Token": null,
					"Header": { "Content-Type": "application/json" }
				}
			}
		},
		"Configs": {
			"Availability": {
				"v1": [
					"currentWeather",
					"dailyForecast",
					"hourlyForecast",
					"minuteForecast",
					"weatherAlerts"
				],
				"v2": [
					"airQuality",
					"currentWeather",
					"forecastDaily",
					"forecastHourly",
					"forecastPeriodic",
					"historicalComparisons",
					"weatherChanges",
					"forecastNextHour",
					"weatherAlerts",
					"weatherAlertNotifications",
					"news"
				]
			}
		}
	}
}
