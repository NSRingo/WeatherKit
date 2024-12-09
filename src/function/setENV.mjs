import { Console, getStorage, Lodash as _ } from "@nsnanocat/util";

/**
 * Set Environment Variables
 * @author VirgilClyne
 * @param {String} name - Persistent Store Key
 * @param {Array} platforms - Platform Names
 * @param {Object} database - Default DataBase
 * @return {Object} { Settings, Caches, Configs }
 */
export default function setENV(name, platforms, database) {
	Console.log("☑️ Set Environment Variables");
	const { Settings, Caches, Configs } = getStorage(name, platforms, database);
	/***************** Settings *****************/
	if (!Array.isArray(Settings?.AQI?.ReplaceProviders)) _.set(Settings, "AQI.ReplaceProviders", Settings?.AQI?.ReplaceProviders ? [Settings.AQI.ReplaceProviders.toString()] : []);
	if (Settings.AQI.ReplaceProviders.includes("TWC")) Settings.AQI.ReplaceProviders.push("The Weather Channel");
	if (Settings.AQI.ReplaceProviders.includes("QWeather")) Settings.AQI.ReplaceProviders.push("和风天气");
	Settings.AQI.ReplaceProviders.push(undefined);
	if (!Array.isArray(Settings?.AQI?.Local?.ReplaceScales)) _.set(Settings, "AQI.Local.ReplaceScales", Settings?.AQI?.Local?.ReplaceScales ? [Settings.AQI.Local.ReplaceScales.toString()] : []);
	Console.info(`typeof Settings: ${typeof Settings}`, `Settings: ${JSON.stringify(Settings, null, 2)}`);
	/***************** Caches *****************/
	//Console.debug(`typeof Caches: ${typeof Caches}`, `Caches: ${JSON.stringify(Caches)}`);
	/***************** Configs *****************/
	//Configs.Storefront = new Map(Configs.Storefront);
	if (Configs.Locale) Configs.Locale = new Map(Configs.Locale);
	if (Configs.i18n) for (const type in Configs.i18n) Configs.i18n[type] = new Map(Configs.i18n[type]);
	Console.log("✅ Set Environment Variables");
	return { Settings, Caches, Configs };
}
