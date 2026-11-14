// Copyright 2026 hhhoratioxu. SPDX-License-Identifier: Apache-2.0
// Apple identifies an unknown expiry by its local calendar year. UTC midnight
// stays in 9999 across UTC-12 through UTC+14; 23:59:59 crosses into year 10000.
export const UNKNOWN_WEATHER_ALERT_EXPIRY = "9999-12-31T00:00:00Z";
const legacyUnknownExpiry = "9999-12-31T23:59:59Z";

// Keep genuine values verbatim, including offsets and fractional seconds.
// Both reserved strings represent absence, never a real event end.
export function knownWeatherAlertExpiry(value) {
    return value == null || value === legacyUnknownExpiry || value === UNKNOWN_WEATHER_ALERT_EXPIRY ? undefined : value;
}
