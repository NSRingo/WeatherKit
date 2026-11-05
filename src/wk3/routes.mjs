// Shared route definitions; each module generator renders its native syntax.
export const groups = [
    { name: 'availability.response', pattern: String.raw`^https?:\/\/weatherkit\.apple\.com\/api\/v[12]\/availability\/`, stage: 'response', body: true },
    { name: 'airQualityScale.request', pattern: String.raw`^https?:\/\/weatherkit\.apple\.com\/api\/v[12]\/airQualityScale\/`, stage: 'request' },
    { name: 'weatherAlerts.html.request', pattern: String.raw`^https?:\/\/weatherkit\.apple\.com\/api\/v[12]\/weatherAlerts\?(?:[^#]*&)?ids=(?!wk3_)[a-zA-Z0-9][a-zA-Z0-9_-]*-[0-9]{9}(?:&|$)`, stage: 'request', echo: true },
    { name: 'weatherAlerts.api.request', pattern: String.raw`^https?:\/\/weatherkit\.apple\.com\/api\/v[12]\/weatherAlerts\?(?:[^#]*&)?ids=(?:wk3_[^&#]*|-?[0-9]+(?:\.[0-9]+)?,-?[0-9]+(?:\.[0-9]+)?)(?:&|$)`, stage: 'request', echo: true },
    { name: 'weather.response', pattern: String.raw`^https?:\/\/weatherkit\.apple\.com\/api\/v[23]\/weather\/`, stage: 'response', body: true, binary: true },
];
