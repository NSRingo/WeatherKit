import { Console, Lodash as _, fetch } from "@nsnanocat/util";

/**
 * 从来源页面提取的预警记录。
 * Alert record extracted from a source page.
 * @typedef {{
 *     description: string,
 *     effectiveTime?: string,
 *     expireTime?: string,
 *     guidelines: string[],
 *     identifier?: string,
 *     issuedTime: string,
 *     message: string,
 *     reportedAt: string,
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
 *     reportedAt: string,
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
     * 判断 ids 是否为 QWeather 灾害预警页面标识，避免接管 Apple 原生 UUID 预警。
     * Determine whether ids is a QWeather severe-weather page token so native Apple UUID alerts pass through.
     * @param {string | null | undefined} ids QWeather 页面标识 / QWeather page identifier.
     * @returns {boolean} 是否为 QWeather 页面标识 / Whether this is a QWeather page identifier.
     */
    static IsQWeatherPageIdentifier(ids) {
        return /^[\p{L}\p{N}._-]+-[0-9]{9}$/u.test(ids?.trim() ?? "");
    }

    /**
     * 判断 ids 是否为新 QWeather Alert API 坐标标识。
     * Determine whether ids is a QWeather Alert API coordinate identifier.
     * @param {string | null | undefined} ids Apple alertDetails 标识 / Apple alertDetails identifier.
     * @returns {boolean} 是否为坐标标识 / Whether this is a coordinate identifier.
     */
    static IsQWeatherCoordinateIdentifier(ids) {
        return WeatherAlerts.#ParseCoordinateIdentifier(ids) !== null;
    }

    /**
     * 生成 Apple 官方预警详情页 URL。
     * Build an Apple alertDetails page URL.
     * @param {{latitude: string | number, longitude: string | number, language?: string, timezone?: string, party?: string}} parameters URL 参数 / URL parameters.
     * @returns {string | undefined} Apple 预警详情页 URL / Apple alertDetails URL.
     */
    static BuildAppleAlertDetailsURL(parameters) {
        const coordinates = WeatherAlerts.#ParseCoordinateIdentifier(`${parameters?.latitude},${parameters?.longitude}`);
        if (!coordinates) return undefined;
        const language = encodeURIComponent(parameters?.language || "zh-CN");
        const timezone = encodeURIComponent(parameters?.timezone || "UTC");
        const party = encodeURIComponent(parameters?.party || "apple");
        return `https://weatherkit.apple.com/alertDetails/index.html?ids=${coordinates.latitude},${coordinates.longitude}&lang=${language}&timezone=${timezone}&party=${party}`;
    }

    /**
     * 将 v2 weatherAlerts flatbuffer 中的来源页 URL 改成 Apple alertDetails 页 URL。
     * Rewrite v2 weatherAlerts flatbuffer URLs to the Apple alertDetails page URL.
     * @param {any} weatherAlerts v2 weatherAlerts 数据 / v2 weatherAlerts data.
     * @param {any} parameters WeatherKit URL 参数 / WeatherKit URL parameters.
     * @param {URL} requestUrl WeatherKit 请求 URL / WeatherKit request URL.
     * @returns {any} 改写后的 weatherAlerts 数据 / Rewritten weatherAlerts data.
     */
    static RewriteFlatBufferDetailsURL(weatherAlerts, parameters, requestUrl) {
        if (!weatherAlerts) return weatherAlerts;
        const detailsUrl = WeatherAlerts.BuildAppleAlertDetailsURL({
            latitude: parameters?.latitude,
            longitude: parameters?.longitude,
            language: weatherAlerts?.metadata?.language || WeatherAlerts.#NormalizeLanguage(parameters?.language, parameters?.country),
            timezone: requestUrl?.searchParams?.get("timezone") || "UTC",
            party: "apple",
        });
        if (!detailsUrl) return weatherAlerts;

        weatherAlerts.detailsUrl = detailsUrl;
        if (weatherAlerts.metadata) weatherAlerts.metadata.attributionUrl = detailsUrl;
        for (const alert of weatherAlerts.alerts ?? []) {
            alert.detailsUrl = detailsUrl;
            alert.attributionUrl = detailsUrl;
        }
        return weatherAlerts;
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
            const title = WeatherAlerts.#NormalizeQWeatherTitle(description || message);

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
                description: title,
                guidelines,
                issuedTime: issueDate.toISOString(),
                message,
                reportedAt: issueDate.toISOString(),
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
            const uid = WeatherAlerts.#StableUUID(`${context.identifier}:${alert.identifier ?? precedence}`);
            const text = [alert.message, alert.standard, ...alert.guidelines].filter(Boolean).join("\n\n") || alert.description;
            const responses = WeatherAlerts.#BuildResponses(alert.guidelines);
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
                effectiveTime: alert.effectiveTime ?? alert.issuedTime,
                eventSource: context.eventSource ?? "CN",
                expireTime: alert.expireTime ?? "9999-12-31T23:59:59Z",
                issuedTime: alert.issuedTime,
                messages: [{ language: context.language, text }],
                name: "WeatherAlert",
                precedence,
                responses,
                reportedAt: alert.reportedAt,
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
    static async GetQWeatherFromPage(requestUrl, requestHeaders = {}) {
        const url = requestUrl instanceof URL ? requestUrl : new URL(requestUrl);
        const identifier = url.searchParams.get("ids")?.trim();
        const language = url.searchParams.get("lang")?.trim() || "zh-CN";
        if (!WeatherAlerts.IsQWeatherPageIdentifier(identifier)) return [];

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
     * 根据 Apple alertDetails 坐标 ids 调用 QWeather Alert API。
     * Fetch QWeather Alert API by Apple alertDetails coordinate ids.
     * @param {URL | string} requestUrl Apple weatherAlerts 请求 URL / Apple weatherAlerts request URL.
     * @param {Record<string, string | string[] | undefined>} requestHeaders 原请求头 / Original request headers.
     * @param {{host?: string, token?: string, country?: string, countryCode?: string}} options QWeather 设置 / QWeather settings.
     * @returns {Promise<WeatherAlert[]>} WeatherAlert 数组 / WeatherAlert array.
     */
    static async GetQWeatherFromAPI(requestUrl, requestHeaders = {}, options = {}) {
        const url = requestUrl instanceof URL ? requestUrl : new URL(requestUrl);
        const identifier = url.searchParams.get("ids")?.trim();
        const language = url.searchParams.get("lang")?.trim() || "zh-CN";
        const coordinates = WeatherAlerts.#ParseCoordinateIdentifier(identifier);
        if (!coordinates) return [];

        const apiUrl = new URL(`https://${options.host || "devapi.qweather.com"}/weatheralert/v1/current/${coordinates.latitude}/${coordinates.longitude}`);
        apiUrl.searchParams.set("lang", WeatherAlerts.#QWeatherLanguageCode(language));
        const normalizedHeaders = Object.fromEntries(Object.entries(requestHeaders).map(([key, value]) => [key.toLowerCase(), value]));
        const headers = {
            Accept: "application/json",
            "X-QW-Api-Key": options.token || "bdd98ec1d87747f3a2e8b1741a5af796",
        };
        if (normalizedHeaders["user-agent"]) headers["User-Agent"] = normalizedHeaders["user-agent"];

        Console.info("☑️ WeatherAlerts.FetchQWeatherAPI", `url: ${apiUrl}`, `language: ${language}`);
        const response = await fetch({
            url: apiUrl.toString(),
            headers,
            "auto-cookie": false,
        });
        const body = JSON.parse(response?.body ?? "{}");
        if (!response.ok) {
            Console.warn("WeatherAlerts.FetchQWeatherAPI", `upstreamStatus: ${response.statusCode ?? response.status}`);
            return [];
        }
        if (!body?.metadata || !Array.isArray(body?.alerts)) {
            Console.warn("WeatherAlerts.FetchQWeatherAPI", `unexpectedBody: ${JSON.stringify(body?.error ?? body?.code ?? body)}`);
            return [];
        }

        const extracted = WeatherAlerts.#ExtractQWeatherAPI(body);
        Console.info("✅ WeatherAlerts.FetchQWeatherAPI", `alerts: ${extracted.alerts.length}`, `source: ${extracted.source}`);
        return WeatherAlerts.Build(extracted, {
            attributionUrl: "https://www.12379.cn/",
            identifier,
            language,
            countryCode: options.countryCode ?? options.country ?? "CN",
        });
    }

    /**
     * 将 QWeather Alert API 返回转换成与 HTML 提取相同的中间结构。
     * Convert QWeather Alert API output to the same intermediate shape used by HTML extraction.
     * @param {any} body QWeather Alert API 返回 / QWeather Alert API body.
     * @returns {ExtractedWeatherAlerts} 提取后的预警集合 / Extracted alert collection.
     */
    static #ExtractQWeatherAPI(body) {
        const alerts = Array.isArray(body?.alerts) ? body.alerts : [];
        const attributions = Array.isArray(body?.metadata?.attributions) ? body.metadata.attributions : [];
        const source = attributions.find(item => item && !/延迟|过时|disclaimer|delayed|outdated/i.test(item)) || "国家预警信息发布中心";
        return {
            alerts: alerts
                .map(alert => {
                    const issuedTime = WeatherAlerts.#DateISOString(alert?.issuedTime || alert?.effectiveTime);
                    if (!issuedTime) return undefined;
                    const effectiveTime = WeatherAlerts.#DateISOString(alert?.effectiveTime) || issuedTime;
                    const expireTime = WeatherAlerts.#DateISOString(alert?.expiresTime || alert?.expireTime);
                    const guidelines = WeatherAlerts.#SplitGuidelines(alert?.instruction ?? alert?.instructions);
                    const description = WeatherAlerts.#NormalizeQWeatherTitle(alert?.headline || alert?.eventType?.name || alert?.description);
                    return {
                        description,
                        effectiveTime,
                        ...(expireTime ? { expireTime } : {}),
                        guidelines,
                        identifier: alert?.id,
                        issuedTime,
                        message: alert?.description || alert?.headline || description,
                        reportedAt: issuedTime,
                        severity: WeatherAlerts.#NormalizeSeverity(alert?.severity),
                        standard: alert?.criteria ?? "",
                    };
                })
                .filter(Boolean),
            areaName: alerts.find(alert => alert?.areaName)?.areaName ?? "",
            source,
        };
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

    static #DateISOString(value) {
        if (!value) return "";
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? "" : date.toISOString();
    }

    static #NormalizeLanguage(language, country) {
        const normalized = String(language ?? "").trim();
        if (!normalized) return "zh-CN";
        if (normalized.toLowerCase().startsWith("zh")) return country ? `zh-${country}` : "zh-CN";
        if (country && !normalized.toLowerCase().endsWith(`-${country.toLowerCase()}`)) return `${normalized}-${country}`;
        return normalized;
    }

    static #QWeatherLanguageCode(language) {
        const normalized = String(language ?? "").trim().toLowerCase();
        if (normalized.startsWith("zh")) return "zh";
        if (normalized.startsWith("en")) return "en";
        return normalized.split("-")[0] || "zh";
    }

    static #NormalizeSeverity(severity) {
        const normalized = String(severity ?? "").trim().toLowerCase();
        switch (normalized) {
            case "extreme":
            case "severe":
            case "moderate":
            case "minor":
                return normalized;
            default:
                return "unknown";
        }
    }

    static #ParseCoordinateIdentifier(ids) {
        const match = String(ids ?? "")
            .trim()
            .match(/^(?<latitude>-?(?:\d+(?:\.\d+)?|\.\d+)),(?<longitude>-?(?:\d+(?:\.\d+)?|\.\d+))$/);
        if (!match?.groups) return null;
        const latitude = Number(match.groups.latitude);
        const longitude = Number(match.groups.longitude);
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
        if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;
        return {
            latitude: match.groups.latitude,
            longitude: match.groups.longitude,
        };
    }

    static #SplitGuidelines(instruction) {
        return String(instruction ?? "")
            .split(/\r?\n/)
            .map(line => line.replace(/^\s*\d+[.、]\s*/, "").trim())
            .filter(Boolean);
    }

    /**
     * 将 QWeather 的防御指南压缩为 Apple 前端能识别的动作 token。
     * Convert QWeather defense guidance into Apple-recognized action tokens.
     * @param {string[]} guidelines 防御指南 / Defense guidance.
     * @returns {string[]} 动作 token / Action tokens.
     */
    static #BuildResponses(guidelines) {
        const responses = [];
        for (const guideline of guidelines ?? []) {
            const response = WeatherAlerts.#ResponseFromGuideline(guideline);
            if (response && !responses.includes(response)) responses.push(response);
        }
        return responses.length ? responses : (guidelines?.length ? ["monitor"] : []);
    }

    /**
     * 根据单条防御指南推断 Apple 的动作 token。
     * Infer an Apple action token from one defense-guidance line.
     * @param {string} guideline 防御指南 / Defense guidance.
     * @returns {string | null} 动作 token / Action token.
     */
    static #ResponseFromGuideline(guideline) {
        const text = String(guideline ?? "").trim().toLowerCase();
        if (!text) return null;
        const compact = text.replace(/\s+/g, "");

        if (/撤离|疏散|转移|离开/.test(text) || compact.includes("evacuat")) return "evacuate";
        if (/就地|躲避|避难|避险|避风|室内|躲到|进入室内|待在室内/.test(text) || compact.includes("takeshelter") || compact.includes("seekshelter")) return "shelter";
        if (/执行|实施|预案|计划/.test(text) || compact.includes("execute") || compact.includes("carryout") || compact.includes("implement")) return "execute";
        if (/准备|防范|防护|备好|做好.*准备/.test(text) || compact.includes("prepare") || compact.includes("preparations")) return "prepare";
        if (/远离|避免|不要|切勿|勿|别/.test(text) || compact.includes("avoid") || compact.includes("stayaway") || compact.includes("keepaway") || compact.includes("donot") || compact.includes("dont")) return "avoid";
        if (/密切关注|持续关注|关注|留意|监测|观察|跟踪/.test(text) || compact.includes("monitor") || compact.includes("watch") || compact.includes("followup")) return "monitor";
        if (/评估|检查/.test(text) || compact.includes("assess") || compact.includes("inspect")) return "assess";
        if (/解除|恢复正常/.test(text) || compact.includes("allclear")) return "allClear";
        if (/无需|不需|无须/.test(text) || compact.includes("none")) return "none";
        return null;
    }

    /**
     * 去掉 QWeather 标题中与预警级别重复的发布机构前缀。
     * Remove the issuing organization prefix from a QWeather alert title.
     * @param {string} description 预警标题 / Alert title.
     * @returns {string} 规范化标题 / Normalized title.
     */
    static #NormalizeQWeatherTitle(description) {
        const title = String(description ?? "").trim();
        const chinese = title.match(/^.+?发布\s*[:：]?\s*(.+)$/);
        if (chinese?.[1]) return chinese[1].trim();
        const english = title.match(/^.+?\s+(?:issues?|issued)\s*[:：]?\s*(.+)$/i);
        return english?.[1]?.trim() || title;
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
