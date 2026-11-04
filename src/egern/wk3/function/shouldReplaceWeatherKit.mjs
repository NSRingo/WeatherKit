const HONG_KONG_BOUNDS = {
    minLatitude: 22.10,
    maxLatitude: 22.45,
    minLongitude: 113.80,
    maxLongitude: 114.45,
};

const MACAU_BOUNDS = {
    minLatitude: 22.05,
    maxLatitude: 22.25,
    minLongitude: 113.45,
    maxLongitude: 113.65,
};

const TAIWAN_BOUNDS = {
    minLatitude: 21.75,
    maxLatitude: 25.50,
    minLongitude: 119.20,
    maxLongitude: 122.10,
};

function inBounds(latitude, longitude, bounds) {
    return latitude >= bounds.minLatitude
        && latitude <= bounds.maxLatitude
        && longitude >= bounds.minLongitude
        && longitude <= bounds.maxLongitude;
}

export function isChinaMainland(parameters = {}) {
    if (parameters.country !== "CN") return false;

    const latitude = Number(parameters.latitude);
    const longitude = Number(parameters.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return false;

    if (latitude < 18 || latitude > 54 || longitude < 73 || longitude > 135) return false;
    if (inBounds(latitude, longitude, HONG_KONG_BOUNDS)) return false;
    if (inBounds(latitude, longitude, MACAU_BOUNDS)) return false;
    if (inBounds(latitude, longitude, TAIWAN_BOUNDS)) return false;

    return true;
}

export function isHongKong(parameters = {}) {
    if (!["HK", "CN"].includes(parameters.country)) return false;
    const latitude = Number(parameters.latitude), longitude = Number(parameters.longitude);
    return Number.isFinite(latitude) && Number.isFinite(longitude) && inBounds(latitude, longitude, HONG_KONG_BOUNDS);
}

export default function shouldReplaceWeatherKit(parameters = {}, Settings = {}) {
    if (!Settings?.Weather?.Replace?.includes(parameters.country)) return false;
    return isChinaMainland(parameters);
}
