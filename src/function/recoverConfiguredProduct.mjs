// Copyright 2026 hhhoratioxu. SPDX-License-Identifier: Apache-2.0
import database from "./database.mjs";
import { providerProductAvailable } from "./providerRecovery.mjs";
const sharedTokens = Object.freeze({ QWeather: database.WeatherKit.Settings.API.QWeather.Token, ColorfulClouds: database.WeatherKit.Settings.API.ColorfulClouds.Token });
export default async function recoverConfiguredProduct(_product, primary, original, selected, loaders, settings, runtime) {
    const enabled = settings?.ProviderFallback?.Enabled;
    if (enabled !== true && enabled !== "true") return primary;
    if (providerProductAvailable(primary) || providerProductAvailable(original) || !["ColorfulClouds", "QWeather", "QWeatherWeb"].includes(selected)) return primary;
    const backup = selected === "ColorfulClouds" ? "QWeather" : "ColorfulClouds";
    const token = settings?.API?.[backup]?.Token;
    // Both explicit opt-in and a dedicated credential are required. A token used
    // for a different product is not consent to replace the selected provider.
    if (typeof token !== "string" || !token.trim() || token === sharedTokens[backup] || typeof loaders[backup] !== "function") return primary;
    try {
        const value = await loaders[backup]();
        const available = providerProductAvailable(value);
        runtime?.noteBackup(available);
        return available ? value : primary;
    } catch {
        runtime?.noteBackup(false);
        return primary;
    }
}
