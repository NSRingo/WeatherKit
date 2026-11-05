// Copyright 2026 hhhoratioxu. SPDX-License-Identifier: Apache-2.0
// Preserve both inputs and share untouched rows/fields. A failed replacement can retain Apple data.
export default function mergeForecastCopy(to = [], from = []) {
    let result,
        j = 0;
    for (let i = 0; i < to.length; i++) {
        while (j < from.length && from[j].forecastStart < to[i].forecastStart) j++;
        if (j >= from.length || from[j].forecastStart !== to[i].forecastStart) continue;
        const source = from[j++],
            row = { ...to[i], ...source };
        for (const key of ["daytimeForecast", "overnightForecast", "restOfDayForecast"]) if (Object.hasOwn(source, key)) row[key] = { ...to[i][key], ...source[key] };
        result ??= to.slice();
        result[i] = row;
    }
    return result ?? to;
}
