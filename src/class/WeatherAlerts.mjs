import { Console, Lodash as _, fetch } from "@nsnanocat/util";

/**
 * 从来源页面提取的预警记录。
 * Alert record extracted from a source page.
 * @typedef {{
 *     description: string,
 *     guidelines: string[],
 *     issuedTime: string,
 *     message: string,
 *     severity: "unknown" | "extreme" | "severe" | "moderate" | "minor",
 *     standard: string,
 * }} ExtractedWeatherAlert
 */

/**
 * 从来源页面提取的预警集合。
 * Alert collection extracted from a source page.
 * @typedef {{
 *     alerts: ExtractedWeatherAlert[],
 *     areaName: string,
 *     source: string,
 * }} ExtractedWeatherAlerts
 */

/**
 * WeatherAlert 构造上下文。
 * WeatherAlert construction context.
 * @typedef {{
 *     attributionUrl: URL | string,
 *     countryCode?: string,
 *     eventSource?: string,
 *     identifier: string,
 *     language: string,
 * }} WeatherAlertContext
 */

/**
 * WeatherKit REST WeatherAlert。
 * WeatherKit REST WeatherAlert.
 * @typedef {{
 *     area: Record<string, unknown>,
 *     areaId?: string,
 *     areaName?: string,
 *     attributionURL: string,
 *     certainty: string,
 *     countryCode: string,
 *     description: string,
 *     detailsUrl: string,
 *     effectiveTime: string,
 *     eventSource: string,
 *     expireTime: string,
 *     id: string,
 *     issuedTime: string,
 *     messages: Array<{language: string, text: string}>,
 *     name: "WeatherAlert",
 *     precedence: number,
 *     responses: string[],
 *     severity: string,
 *     source: string,
 *     urgency: string,
 * }} WeatherAlert
 */

/**
 * WeatherKit REST WeatherAlert 集合转换器。
 * WeatherKit REST WeatherAlert collection converter.
 */
export default class WeatherAlerts {
    static #MaximumSourceSize = 2 * 1024 * 1024;

    /**
     * 判断 ids 是否为 QWeather 页面路由标识，避免接管 Apple 原生 UUID 预警。
     * Determine whether ids is a QWeather page token so native Apple UUID alerts pass through.
     * @param {string | null | undefined} ids Apple alertDetails 标识 / Apple alertDetails identifier.
     * @returns {boolean} 是否为 QWeather 标识 / Whether this is a QWeather identifier.
     */
    static IsQWeatherIdentifier(ids) {
        return /^[\p{L}\p{N}._-]+-[0-9]{6}[0-9]*$/u.test(ids?.trim() ?? "");
    }

    /**
     * 从 QWeather HTML 提取与 WeatherKit 输出结构无关的预警记录。
     * Extract alert records from QWeather HTML without constructing WeatherKit output.
     * @param {string} html QWeather 页面 HTML / QWeather page HTML.
     * @returns {ExtractedWeatherAlerts} 提取后的预警集合 / Extracted alert collection.
     */
    static ExtractQWeather(html) {
        const sourceHtml = String(html ?? "");
        let city = WeatherAlerts.#FirstMatch(sourceHtml, /<h1[^>]*class=["'][^"']*c-submenu__location[^"']*["'][^>]*>([\s\S]*?)<\/h1>/i);
        if (!city) {
            const titleText = WeatherAlerts.#FirstMatch(sourceHtml, /<title>([\s\S]*?)<\/title>/i);
            city = titleText.replace(/\s*(?:severe weather warning|灾害预警|天气预警).*$/i, "").trim();
        }
        const administration = WeatherAlerts.#FirstMatch(sourceHtml, /<span[^>]*class=["'][^"']*c-submenu__location-adm[^"']*["'][^>]*>([\s\S]*?)<\/span>/i);
        const source = WeatherAlerts.#FirstMatch(sourceHtml, /<a[^>]*class=["'][^"']*data-source__txt[^"']*["'][^>]*>([\s\S]*?)<\/a>/i)
            .replace(/^(?:预警数据来源|Warning data source)\s*[:：]\s*/i, "")
            .trim();
        const starts = Array.from(sourceHtml.matchAll(/<div[^>]*class=["']([^"']*\bc-city-warning-events\b[^"']*)["'][^>]*>/gi), match => ({
            index: match.index,
            contentStart: match.index + match[0].length,
            className: match[1],
        }));
        /** @type {ExtractedWeatherAlert[]} */
        const alerts = [];

        for (const [index, start] of starts.entries()) {
            let end = index + 1 < starts.length ? starts[index + 1].index : sourceHtml.length;
            const nearby = sourceHtml.indexOf('<div class="c-city-warning-around">', start.contentStart);
            if (nearby !== -1 && nearby < end) end = nearby;
            const block = sourceHtml.slice(start.contentStart, end);
            const description = WeatherAlerts.#FirstMatch(block, /<h3[^>]*>([\s\S]*?)<\/h3>/i);
            const issueText = WeatherAlerts.#FirstMatch(block, /<p[^>]*>\s*((?:Issue\s+date|发布\s*日期)\s*[:：][\s\S]*?)<\/p>/i)
                .replace(/^(?:Issue\s+date|发布\s*日期)\s*[:：]\s*/i, "")
                .trim();
            const message = WeatherAlerts.#FirstMatch(block, /<p[^>]*class=["'][^"']*warning-events__txt[^"']*["'][^>]*>([\s\S]*?)<\/p>/i);
            const standardBlock = block.match(/<div[^>]*class=["'][^"']*warning-explain[^"']*["'][^>]*>([\s\S]*?)<\/div>/i)?.[1] ?? "";
            const standard = WeatherAlerts.#FirstMatch(standardBlock, /<h4[^>]*>[\s\S]*?<\/h4>\s*<p[^>]*>([\s\S]*?)<\/p>/i);
            const guideBlock = block.match(/<div[^>]*class=["'][^"']*warning-defense__txt[^"']*["'][^>]*>([\s\S]*?)<\/div>/i)?.[1] ?? "";
            const guidelines = Array.from(guideBlock.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi), match =>
                WeatherAlerts.#DecodeHTML(match[1])
                    .replace(/^\s*\d+[.、]\s*/, "")
                    .trim(),
            ).filter(Boolean);
            const normalizedIssueText = issueText && !/(?:Z|[+-]\d{2}:?\d{2})$/i.test(issueText) ? `${issueText.replace(" ", "T")}+08:00` : issueText;
            const issueDate = new Date(normalizedIssueText);
            if ((!description && !message) || Number.isNaN(issueDate.getTime())) continue;

            const severitySource = `${start.className} ${description}`.toLowerCase();
            let severity = "unknown";
            switch (true) {
                case /warning--red|红色|\bred\b/.test(severitySource):
                    severity = "extreme";
                    break;
                case /warning--orange|橙色|\borange\b/.test(severitySource):
                    severity = "severe";
                    break;
                case /warning--yellow|黄色|\byellow\b/.test(severitySource):
                    severity = "moderate";
                    break;
                case /warning--blue|蓝色|\bblue\b/.test(severitySource):
                    severity = "minor";
                    break;
            }

            alerts.push({
                description: description || message,
                guidelines,
                issuedTime: issueDate.toISOString(),
                message,
                severity,
                standard,
            });
        }

        return {
            alerts,
            areaName: city || administration,
            source: source || "QWeather",
        };
    }

    /**
     * 将提取后的来源记录构造成 WeatherKit REST WeatherAlert 数组。
     * Build a WeatherKit REST WeatherAlert array from extracted source records.
     * @param {ExtractedWeatherAlerts} extracted 提取后的预警集合 / Extracted alert collection.
     * @param {WeatherAlertContext} context WeatherAlert 构造上下文 / WeatherAlert construction context.
     * @returns {WeatherAlert[]} WeatherAlert 数组 / WeatherAlert array.
     */
    static Build(extracted, context) {
        const areaId = context.identifier.match(/-(\d+)$/)?.[1];
        return extracted.alerts.map((alert, precedence) => {
            const uid = WeatherAlerts.#StableUUID(`${context.identifier}:${precedence}`);
            const text = [alert.message, alert.standard, ...alert.guidelines].filter(Boolean).join("\n\n") || alert.description;
            return {
                id: uid,
                ...(areaId ? { areaId } : {}),
                ...(extracted.areaName ? { areaName: extracted.areaName } : {}),
                area: {},
                attributionURL: context.attributionUrl.toString(),
                certainty: "unknown",
                countryCode: context.countryCode ?? "",
                description: alert.description,
                detailsUrl: `#${uid}`,
                effectiveTime: alert.issuedTime,
                eventSource: context.eventSource ?? "CN",
                expireTime: "9999-12-31T23:59:59Z",
                issuedTime: alert.issuedTime,
                messages: [{ language: context.language, text }],
                name: "WeatherAlert",
                precedence,
                responses: [],
                severity: alert.severity,
                source: extracted.source,
                urgency: "unknown",
            };
        });
    }

    /**
     * 根据 Apple weatherAlerts 请求抓取并转换 QWeather 页面。
     * Fetch and convert the QWeather page for an Apple weatherAlerts request.
     * @param {URL | string} requestUrl Apple weatherAlerts 请求 URL / Apple weatherAlerts request URL.
     * @param {Record<string, string | string[] | undefined>} requestHeaders 原请求头 / Original request headers.
     * @returns {Promise<WeatherAlert[]>} WeatherAlert 数组 / WeatherAlert array.
     */
    static async GetQWeather(requestUrl, requestHeaders = {}) {
        const url = requestUrl instanceof URL ? requestUrl : new URL(requestUrl);
        const identifier = url.searchParams.get("ids")?.trim();
        const language = url.searchParams.get("lang")?.trim() || "zh-CN";
        if (!WeatherAlerts.IsQWeatherIdentifier(identifier)) return [];

        const sourceUrl = new URL("https://www.qweather.com");
        sourceUrl.pathname = language.toLowerCase().startsWith("en") ? `/en/severe-weather/${identifier}.html` : `//severe-weather/${identifier}.html`;
        sourceUrl.searchParams.set("from", "AppleWeatherService");
        const normalizedHeaders = Object.fromEntries(Object.entries(requestHeaders).map(([key, value]) => [key.toLowerCase(), value]));
        const sourceHeaders = {
            Accept: "text/html,application/xhtml+xml",
            "Accept-Language": normalizedHeaders["accept-language"] ?? language,
            Referer: "https://www.qweather.com/",
        };
        if (normalizedHeaders["user-agent"]) sourceHeaders["User-Agent"] = normalizedHeaders["user-agent"];

        Console.info("☑️ WeatherAlerts.FetchQWeather", `url: ${sourceUrl}`, `language: ${language}`);
        const sourceResponse = await fetch({
            url: sourceUrl.toString(),
            headers: sourceHeaders,
            "auto-cookie": false,
        });
        const contentType = sourceResponse.headers?.["Content-Type"] ?? sourceResponse.headers?.["content-type"] ?? "";
        Console.info("WeatherAlerts.FetchQWeather", `status: ${sourceResponse.statusCode ?? sourceResponse.status}`, `contentType: ${contentType || "undefined"}`);
        if (!sourceResponse.ok) {
            Console.warn("WeatherAlerts.FetchQWeather", `upstreamStatus: ${sourceResponse.statusCode ?? sourceResponse.status}`);
            return [];
        }
        if (!contentType.toLowerCase().includes("text/html")) {
            Console.warn("WeatherAlerts.FetchQWeather", `unexpectedContentType: ${contentType || "undefined"}`);
            return [];
        }
        const html = String(sourceResponse.body ?? "");
        const sourceSize = new TextEncoder().encode(html).byteLength;
        Console.debug("WeatherAlerts.FetchQWeather", `bodyBytes: ${sourceSize}`);
        if (sourceSize > WeatherAlerts.#MaximumSourceSize) throw new RangeError("QWeather alert page is too large");

        const extracted = WeatherAlerts.ExtractQWeather(html);
        Console.info("✅ WeatherAlerts.FetchQWeather", `alerts: ${extracted.alerts.length}`, `source: ${extracted.source}`);
        const areaId = identifier.match(/-(\d+)$/)?.[1];
        const attributionUrl = new URL(sourceUrl);
        attributionUrl.search = "";
        return WeatherAlerts.Build(extracted, {
            attributionUrl,
            identifier,
            language,
            countryCode: areaId?.startsWith("101") ? "CN" : "",
        });
    }

    /**
     * 解码 HTML 文本。
     * Decode HTML text.
     * @param {string} value HTML 文本 / HTML text.
     * @returns {string} 纯文本 / Plain text.
     */
    static #DecodeHTML(value) {
        const normalized = String(value ?? "")
            .replace(/<br\s*\/?\s*>/gi, "\n")
            .replace(/<[^>]*>/g, "")
            .replace(/&nbsp;|&#160;/gi, " ")
            .replace(/&apos;/gi, "&#39;")
            .replace(/&#(\d+);/g, (_, number) => String.fromCodePoint(Number(number)))
            .replace(/&#x([0-9a-f]+);/gi, (_, number) => String.fromCodePoint(Number.parseInt(number, 16)));
        return _.unescape(normalized)
            .replace(/\r/g, "")
            .replace(/[ \t]+\n/g, "\n")
            .replace(/\n[ \t]+/g, "\n")
            .replace(/[ \t]{2,}/g, " ")
            .replace(/\n{3,}/g, "\n\n")
            .trim();
    }

    /**
     * 提取并解码第一个正则捕获组。
     * Extract and decode the first regular-expression capture group.
     * @param {string} source 原始 HTML / Source HTML.
     * @param {RegExp} pattern 提取表达式 / Extraction pattern.
     * @param {string} fallback 未匹配时的值 / Value used when unmatched.
     * @returns {string} 解码后的值 / Decoded value.
     */
    static #FirstMatch(source, pattern, fallback = "") {
        const match = source.match(pattern);
        return match ? WeatherAlerts.#DecodeHTML(match[1]) : fallback;
    }

    /**
     * 为同一预警生成跨运行环境稳定的 UUID。
     * Generate a stable UUID for the same alert across supported runtimes.
     * @param {string} value UUID 输入 / UUID input.
     * @returns {string} UUID 字符串 / UUID string.
     */
    static #StableUUID(value) {
        const words = [0x811c9dc5, 0x9e3779b9, 0x85ebca6b, 0xc2b2ae35];
        for (let index = 0; index < words.length; index++) {
            for (let offset = 0; offset < value.length; offset++) {
                words[index] ^= value.charCodeAt(offset) + index;
                words[index] = Math.imul(words[index], 0x01000193);
            }
        }
        const bytes = new Uint8Array(16);
        const view = new DataView(bytes.buffer);
        for (let index = 0; index < words.length; index++) view.setUint32(index * 4, words[index]);
        bytes[6] = (bytes[6] & 0x0f) | 0x50;
        bytes[8] = (bytes[8] & 0x3f) | 0x80;
        const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("");
        return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
    }
}
