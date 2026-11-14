// Copyright 2026 hhhoratioxu. SPDX-License-Identifier: Apache-2.0
import WeatherAlerts from "../class/WeatherAlerts.mjs";
import providerNameToLogo from "./providerNameToLogo.mjs";
import { activeProviderAlerts, cloneWeatherProduct, providerProductAvailable, weatherProductsEqual } from "./providerRecovery.mjs";

// Provider warnings enrich existing Apple events; they cannot manufacture native IDs.
// Keep the original availability and entity when no warning fields were installed.
export default function mergeWeatherAlertsProduct(original, supplement) {
    if (!providerProductAvailable(supplement) || !Array.isArray(original?.alerts) || !original.alerts.length) return original;
    const active = activeProviderAlerts(supplement.alerts);
    if (!active.length) return original;
    const result = cloneWeatherProduct(original);
    result.alerts = WeatherAlerts.mergeAlerts(result.alerts, active);
    if (weatherProductsEqual(result.alerts, original.alerts)) return original;
    result.metadata = { ...original.metadata, ...supplement.metadata };
    result.detailsUrl = supplement.detailsUrl ?? original.detailsUrl;
    result.metadata.providerLogo ||= providerNameToLogo(result.metadata.providerName);
    return result;
}
