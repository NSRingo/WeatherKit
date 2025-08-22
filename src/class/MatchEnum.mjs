import { Console, fetch } from "@nsnanocat/util";
import * as WK2 from "../proto/apple/wk2.js";

export default class MatchEnum {
	constructor(proto) {
		this.Name = "MatchEnum";
		this.Version = "0.0.1";
		Console.log(`🟧 ${this.Name} v${this.Version}`);
		this.request = $request;
		this.json = {};
		this.proto = proto;
	}

	async init() {
		if (this.request.headers.Accept) this.request.headers.Accept = "application/json";
		if (this.request.headers.accept) this.request.headers.accept = "application/json";

		try {
			this.json = await fetch(this.request).then(res => JSON.parse(res?.body ?? "{}"));
		} catch (error) {
			Console.error("初始化过程中发生错误:", error);
		}
	}

	airQuality() {
		const jsonTime = this.json?.airQuality?.metadata?.reportedTime;
		const protoTime = this.proto?.airQuality?.metadata?.reportedTime;
		const jsonCode = this.json?.airQuality?.previousDayComparison;
		const protoCode = this.proto?.airQuality?.previousDayComparison;
		const protoID = WK2.ComparisonTrend[protoCode];
		//if (jsonCode !== protoCode) {
		$notification.post("ComparisonTrend", "", `reportedTime: ${jsonTime}-${protoTime}\njson: ${jsonCode}\nproto: ${protoID}-${protoCode}`);
		//}
		this.json?.airQuality?.pollutants?.forEach(pollutant => {
			const jsonCode = pollutant?.pollutantType;
			const protoID = WK2.PollutantType[pollutant?.pollutantType];
			const protoCode = WK2.PollutantType[protoID];
			//if (jsonCode !== protoCode) {
			$notification.post("PollutantType", "", `json: ${jsonCode}\nproto: ${protoID}-${protoCode}`);
			//}
		});
		this.json?.airQuality?.pollutants?.forEach(pollutant => {
			const jsonCode = pollutant?.units;
			const protoID = WK2.UnitType[pollutant?.units];
			const protoCode = WK2.UnitType[protoID];
			//if (jsonCode !== protoCode) {
			$notification.post("UnitType", "", `json: ${jsonCode}\nproto: ${protoID}-${protoCode}`);
			//}
		});
	}

	weatherCondition() {
		const jsonTime = this.json?.currentWeather?.metadata?.reportedTime;
		const protoTime = this.proto?.currentWeather?.metadata?.reportedTime;
		const jsonCode = this.json?.currentWeather?.conditionCode;
		const protoCode = this.proto?.currentWeather?.conditionCode;
		const protoID = WK2.WeatherCondition[protoCode];
		//if (jsonCode !== protoCode) {
		$notification.post("WeatherCondition", "", `reportedTime: ${jsonTime}-${protoTime}\njson: ${jsonCode}\nproto: ${protoID}-${protoCode}`);
		//}
	}

	pressureTrend() {
		const jsonTime = this.json?.currentWeather?.metadata?.reportedTime;
		const protoTime = this.proto?.currentWeather?.metadata?.reportedTime;
		const jsonCode = this.json?.currentWeather?.pressureTrend;
		const protoCode = this.proto?.currentWeather?.pressureTrend;
		const protoID = WK2.PressureTrend[protoCode];
		//if (jsonCode !== protoCode) {
		$notification.post("PressureTrend", "", `reportedTime: ${jsonTime}-${protoTime}\njson: ${jsonCode}\nproto: ${protoID}-${protoCode}`);
		//}
	}

	severity() {
		this.json?.weatherAlerts?.alerts?.forEach(alert => {
			const jsonCode = alert?.severity;
			const protoID = WK2.Severity[alert?.severity];
			const protoCode = WK2.Severity[protoID];
			//if (jsonCode !== protoCode) {
			$notification.post("Severity", "", `json: ${jsonCode}\nproto: ${protoID}-${protoCode}`);
			//}
		});
	}

	significanceType() {
		this.json?.weatherAlerts?.alerts?.forEach(alert => {
			const jsonCode = alert?.significance;
			const protoID = WK2.SignificanceType[alert?.significance];
			const protoCode = WK2.SignificanceType[protoID];
			//if (jsonCode !== protoCode) {
			$notification.post("SignificanceType", "", `json: ${jsonCode}\nproto: ${protoID}-${protoCode}`);
			//}
		});
	}

	urgency() {
		this.json?.weatherAlerts?.alerts?.forEach(alert => {
			const jsonCode = alert?.urgency;
			const protoID = WK2.Urgency[alert?.urgency];
			const protoCode = WK2.Urgency[protoID];
			//if (jsonCode !== protoCode) {
			$notification.post("Urgency", "", `json: ${jsonCode}\nproto: ${protoID}-${protoCode}`);
			//}
		});
	}

	certainty() {
		this.json?.weatherAlerts?.alerts?.forEach(alert => {
			const jsonCode = alert?.certainty;
			const protoID = WK2.Certainty[alert?.certainty];
			const protoCode = WK2.Certainty[protoID];
			//if (jsonCode !== protoCode) {
			$notification.post("Certainty", "", `json: ${jsonCode}\nproto: ${protoID}-${protoCode}`);
			//}
		});
	}

	importanceType() {
		this.json?.weatherAlerts?.alerts?.forEach(alert => {
			const jsonCode = alert?.importance;
			const protoID = WK2.ImportanceType[alert?.importance];
			const protoCode = WK2.ImportanceType[protoID];
			//if (jsonCode !== protoCode) {
			$notification.post("ImportanceType", "", `json: ${jsonCode}\nproto: ${protoID}-${protoCode}`);
			//}
		});
	}

	responseType() {
		this.json?.weatherAlerts?.alerts?.forEach(alert => {
			alert?.responses?.forEach(response => {
				const jsonCode = response;
				const protoID = WK2.ResponseType[response];
				const protoCode = WK2.ResponseType[protoID];
				//if (jsonCode !== protoCode) {
				$notification.post("ResponseType", "", `json: ${jsonCode}\nproto: ${protoID}-${protoCode}`);
				//}
			});
		});
	}
}
