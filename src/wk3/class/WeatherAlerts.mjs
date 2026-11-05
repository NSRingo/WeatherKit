/** Pure subset adapted from NSRingo/WeatherKit v3.3.2 (Apache-2.0).
 * REST details JSON only: do not pass its lowercase enum tokens to WK3 wire.
 * Existing provider classes intentionally remain unchanged. */
export default class WeatherAlerts {
    /** No Apple authorization/cookies are forwarded to QWeather. fetchImpl may
     * be the fork's fetch wrapper; both standard Response and body responses work.
     * Routing must intercept region identifiers before proxying to Apple. */
    static async FetchWeatherAlertPage(identifier, language = "zh-CN", fetchImpl = globalThis.fetch) {
        const url = WeatherAlerts.BuildWeatherAlertPageURL(identifier, language);
        const response = await fetchImpl(url.toString(), { redirect: "error", headers: { Accept: "text/html" } });
        const status = response.status ?? response.statusCode;
        if (status !== 200) throw new Error("QWeather alert page unavailable");
        const headers = response.headers;
        const contentType = typeof headers?.get === "function" ? headers.get("content-type") : headers?.["content-type"];
        if (!/text\/html/i.test(contentType ?? "")) throw new TypeError("Expected QWeather HTML");
        const html = typeof response.text === "function" ? await response.text() : response.body;
        if (typeof html !== "string" || new TextEncoder().encode(html).length > 2 * 1024 * 1024) throw new RangeError("Invalid QWeather page size");
        return WeatherAlerts.ExtractWeatherAlertPage(html);
    }

    static async DetailsForQWeather(identifier, language = "zh-CN", fetchImpl = globalThis.fetch) {
        const extracted = await WeatherAlerts.FetchWeatherAlertPage(identifier, language, fetchImpl);
        return WeatherAlerts.Build(extracted, { identifier, language, attributionUrl: WeatherAlerts.BuildWeatherAlertPageURL(identifier, language), countryCode: "CN", eventSource: "CN" });
    }

    static Build(extracted, context) {
        const contextAreaId = context.identifier.match(/-(\d+)$/)?.[1];
        return extracted.alerts.map((alert, precedence) => {
            const uid = WeatherAlerts.#StableUUID(`${context.identifier}:${alert.identifier ?? precedence}`);
            const messages = [];
            for (const text of [alert.message, alert.standard, alert.guidelines?.filter(Boolean).join("\n")]) {
                if (text) messages.push({ language: context.language, text });
            }
            if (!messages.length && alert.description) messages.push({ language: context.language, text: alert.description });
            const responses = WeatherAlerts.#BuildResponses(alert.guidelines, alert.responses);
            const areaId = alert.areaId || contextAreaId;
            const areaName = alert.areaName || extracted.areaName;
            const effectiveTime = alert.effectiveTime ?? alert.issuedTime;
            const expireTime = alert.expireTime ?? "9999-12-31T23:59:59Z";
            const eventOnsetTime = alert.eventOnsetTime ?? effectiveTime;
            const eventEndTime = alert.eventEndTime ?? (alert.expireTime ? expireTime : undefined);
            const source = alert.source || extracted.source || "";
            const importance = alert.importance || WeatherAlerts.#ImportanceFromSeverity(alert.severity);
            const phenomenon = alert.phenomenon;
            const description = WeatherAlerts.#NormalizeWeatherAlertTitle(alert.description, alert.eventName);
            return {
                id: uid,
                ...(areaId ? { areaId } : {}),
                ...(areaName ? { areaName } : {}),
                attributionURL: context.attributionUrl.toString(),
                certainty: alert.certainty || "unknown",
                countryCode: context.countryCode ?? "",
                description,
                detailsUrl: `#${uid}`,
                effectiveTime,
                ...(eventEndTime ? { eventEndTime } : {}),
                ...(eventOnsetTime ? { eventOnsetTime } : {}),
                eventSource: context.eventSource ?? context.countryCode ?? "",
                expireTime,
                issuedTime: alert.issuedTime,
                ...(importance ? { importance } : {}),
                messages,
                name: "WeatherAlert",
                ...(phenomenon ? { phenomenon } : {}),
                precedence,
                responses,
                ...(alert.significance ? { significance: alert.significance } : {}),
                reportedAt: alert.reportedAt,
                severity: alert.severity,
                source,
                ...(alert.token ? { token: alert.token } : {}),
                urgency: alert.urgency || "unknown",
            };
        });
    }

    static ParseWeatherAlertPageURL(value) {
        try {
            const url = new URL(value);
            if (url.protocol !== "https:" || url.hostname !== "www.qweather.com") return undefined;
            if (url.search !== "?from=AppleWeatherService" || url.hash) return undefined;
            return decodeURIComponent(url.pathname).match(/^\/{1,2}(?:en\/)?severe-weather\/([^/]+)\.html$/)?.[1];
        } catch {
            return undefined;
        }
    }

    static BuildWeatherAlertPageURL(identifier, language = "zh-CN", includeAppleSource = true) {
        identifier = identifier?.trim();
        if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]*-\d+$/.test(identifier ?? "")) throw new TypeError("Invalid QWeather location identifier");
        const url = new URL("https://www.qweather.com");
        url.pathname = language.toLowerCase().startsWith("en") ? `/en/severe-weather/${identifier}.html` : `/severe-weather/${identifier}.html`;
        if (includeAppleSource) url.searchParams.set("from", "AppleWeatherService");
        return url;
    }

    static BuildAppleAlertDetailsURL(identifier, language = "zh-CN") {
        return `https://weatherkit.apple.com/alertDetails/index.html?lang=${encodeURIComponent(language)}&ids=${encodeURIComponent(identifier)}&party=qweather`;
    }

    static ExtractWeatherAlertPage(html) {
        const sourceHtml = String(html ?? "");
        let city = WeatherAlerts.#FirstWeatherAlertPageMatch(sourceHtml, /<h1[^>]*class=["'][^"']*c-submenu__location[^"']*["'][^>]*>([\s\S]*?)<\/h1>/i);
        if (!city) {
            const titleText = WeatherAlerts.#FirstWeatherAlertPageMatch(sourceHtml, /<title>([\s\S]*?)<\/title>/i);
            city = titleText.replace(/\s*(?:severe weather warning|灾害预警|天气预警).*$/i, "").trim();
        }
        const administration = WeatherAlerts.#FirstWeatherAlertPageMatch(sourceHtml, /<span[^>]*class=["'][^"']*c-submenu__location-adm[^"']*["'][^>]*>([\s\S]*?)<\/span>/i);
        const dataSource = WeatherAlerts.#FirstWeatherAlertPageMatch(sourceHtml, /<a[^>]*class=["'][^"']*data-source__txt[^"']*["'][^>]*>([\s\S]*?)<\/a>/i)
            .replace(/^(?:预警数据来源|Warning data source)\s*[:：]\s*/i, "")
            .trim();
        const starts = Array.from(sourceHtml.matchAll(/<div[^>]*class=["']([^"']*\bc-city-warning-events\b[^"']*)["'][^>]*>/gi), match => ({
            index: match.index,
            contentStart: match.index + match[0].length,
            className: match[1],
        }));
        const alerts = [];

        for (const [index, start] of starts.entries()) {
            let end = index + 1 < starts.length ? starts[index + 1].index : sourceHtml.length;
            const nearby = sourceHtml.indexOf('<div class="c-city-warning-around">', start.contentStart);
            if (nearby !== -1 && nearby < end) end = nearby;
            const block = sourceHtml.slice(start.contentStart, end);
            const description = WeatherAlerts.#FirstWeatherAlertPageMatch(block, /<h3[^>]*>([\s\S]*?)<\/h3>/i);
            const issueText = WeatherAlerts.#FirstWeatherAlertPageMatch(block, /<p[^>]*>\s*((?:Issue\s+date|发布\s*日期)\s*[:：][\s\S]*?)<\/p>/i)
                .replace(/^(?:Issue\s+date|发布\s*日期)\s*[:：]\s*/i, "")
                .trim();
            const message = WeatherAlerts.#FirstWeatherAlertPageMatch(block, /<p[^>]*class=["'][^"']*warning-events__txt[^"']*["'][^>]*>([\s\S]*?)<\/p>/i);
            const standardBlock = block.match(/<div[^>]*class=["'][^"']*warning-explain[^"']*["'][^>]*>([\s\S]*?)<\/div>/i)?.[1] ?? "";
            const standard = WeatherAlerts.#FirstWeatherAlertPageMatch(standardBlock, /<h4[^>]*>[\s\S]*?<\/h4>\s*<p[^>]*>([\s\S]*?)<\/p>/i);
            const guideBlock = block.match(/<div[^>]*class=["'][^"']*warning-defense__txt[^"']*["'][^>]*>([\s\S]*?)<\/div>/i)?.[1] ?? "";
            const guidelines = Array.from(guideBlock.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi), match =>
                WeatherAlerts.#DecodeWeatherAlertPageHTML(match[1])
                    .replace(/^\s*\d+[.、]\s*/, "")
                    .trim(),
            ).filter(Boolean);
            const normalizedIssueText = issueText && !/(?:Z|[+-]\d{2}:?\d{2})$/i.test(issueText) ? `${issueText.replace(" ", "T")}+08:00` : issueText;
            const issueDate = new Date(normalizedIssueText);
            if ((!description && !message) || Number.isNaN(issueDate.getTime())) continue;
            const headline = description || message;
            const parsedHeadline = WeatherAlerts.#ParseWeatherAlertPageHeadline(headline);
            const source = parsedHeadline.source || dataSource || "QWeather";

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
                description: headline,
                ...(parsedHeadline.eventName ? { eventName: parsedHeadline.eventName } : {}),
                guidelines,
                issuedTime: issueDate.toISOString(),
                message,
                reportedAt: issueDate.toISOString(),
                severity,
                source,
                standard,
            });
        }

        return {
            alerts,
            areaName: city || administration,
            source: alerts.find(alert => alert?.source)?.source || dataSource || "QWeather",
        };
    }

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

    static #BuildResponses(guidelines, preferredResponses = []) {
        const responses = WeatherAlerts.#NormalizeResponses(preferredResponses);
        if (responses.length) return responses;

        const inferredResponses = [];
        for (const guideline of guidelines ?? []) {
            const response = WeatherAlerts.#ResponseFromGuideline(guideline);
            if (response && !inferredResponses.includes(response)) inferredResponses.push(response);
        }
        return inferredResponses.length ? inferredResponses : (guidelines?.length ? ["monitor"] : []);
    }

    static #ImportanceFromSeverity(severity) {
        switch (String(severity ?? "").trim().toLowerCase()) {
            case "extreme":
            case "severe":
                return "high";
            case "minor":
                return "low";
            case "moderate":
            default:
                return "normal";
        }
    }

    static #NormalizeWeatherAlertTitle(description, eventName = "") {
        const title = String(description ?? "").trim();
        const fallback = WeatherAlerts.#TrimWeatherAlertTitle(eventName);
        if (!title) return fallback;

        const chinese = title.match(/^.+?(?:发布|更新|变更)\s*[:：]?\s*(.+)$/);
        if (chinese?.[1]) return WeatherAlerts.#TrimWeatherAlertTitle(chinese[1]);

        const issued = title.match(/^(.+?)\s+issued\b\s*[:：]?\s*(.+)$/i);
        if (issued?.[1] && issued?.[2]) {
            const titleBeforeIssued = WeatherAlerts.#TrimWeatherAlertTitle(issued[1]);
            const fallbackMatchesPrefix = Boolean(fallback) && WeatherAlerts.#NormalizeAlertMatchText(fallback) === WeatherAlerts.#NormalizeAlertMatchText(titleBeforeIssued);
            return fallbackMatchesPrefix ? fallback : WeatherAlerts.#FormatTranslatedEnglishAlertTitle(issued[2]) || fallback;
        }

        const issues = title.match(/^.+?\s+issues?\b\s*[:：]?\s*(.+)$/i);
        return issues?.[1] ? WeatherAlerts.#FormatTranslatedEnglishAlertTitle(issues[1]) || fallback : WeatherAlerts.#TrimWeatherAlertTitle(title) || fallback;
    }

    static #FirstWeatherAlertPageMatch(source, pattern, fallback = "") {
        const match = source.match(pattern);
        return match ? WeatherAlerts.#DecodeWeatherAlertPageHTML(match[1]) : fallback;
    }

    static #DecodeWeatherAlertPageHTML(value) {
        const normalized = String(value ?? "")
            .replace(/<br\s*\/?\s*>/gi, "\n")
            .replace(/<[^>]*>/g, "")
            .replace(/&nbsp;|&#160;/gi, " ")
            .replace(/&apos;/gi, "&#39;")
            .replace(/&#(\d+);/g, (_, number) => String.fromCodePoint(Number(number)))
            .replace(/&#x([0-9a-f]+);/gi, (_, number) => String.fromCodePoint(Number.parseInt(number, 16)));
        return normalized.replace(/&quot;/gi, '"').replace(/&#39;/gi, "'").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">").replace(/&amp;/gi, "&")
            .replace(/\r/g, "")
            .replace(/[ \t]+\n/g, "\n")
            .replace(/\n[ \t]+/g, "\n")
            .replace(/[ \t]{2,}/g, " ")
            .replace(/\n{3,}/g, "\n\n")
            .trim();
    }

    static #ParseWeatherAlertPageHeadline(description) {
        const title = String(description ?? "").trim();
        const chinese = title.match(/^(.+?)发布\s*[:：]?\s*(.+)$/);
        if (chinese?.[1] && chinese?.[2]) return { eventName: chinese[2].trim(), source: chinese[1].trim() };

        const cap = title.match(/^(.+?)\s+issued\b[\s\S]*\s+by\s+(.+)$/i);
        if (cap?.[1] && cap?.[2]) return { eventName: cap[1].trim(), source: cap[2].trim() };

        const issued = title.match(/^(.+?)\s+issued\b\s*[:：]?\s*(.+)$/i);
        if (issued?.[1] && issued?.[2]) {
            const context = issued[2].trim();
            const capContext = /^(?:for\b|\d{1,2}[/:.-]|\p{L}+\s+(?:\d{1,2}\b|at\b|until\b))/iu.test(context);
            return capContext ? { eventName: issued[1].trim(), source: "" } : { eventName: context, source: issued[1].trim() };
        }

        const issues = title.match(/^(.+?)\s+issues?\b\s*[:：]?\s*(.+)$/i);
        if (issues?.[1] && issues?.[2]) return { eventName: issues[2].trim(), source: issues[1].trim() };
        return { eventName: title, source: "" };
    }

    static #NormalizeResponses(responses) {
        const normalized = [];
        for (const response of responses ?? []) {
            const token = String(response ?? "").trim();
            if (token && !normalized.includes(token)) normalized.push(token);
        }
        return normalized;
    }

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

    static #TrimWeatherAlertTitle(title) {
        return String(title ?? "")
            .trim()
            .replace(/\s*[\[【][^\]】]+[\]】]\s*$/u, "")
            .replace(/\s*[。．.]+\s*$/gu, "")
            .replace(/预警信号$/u, "预警")
            .replace(/預警信號$/u, "預警");
    }

    static #NormalizeAlertMatchText(value) {
        return String(value ?? "")
            .trim()
            .toLowerCase()
            .replace(/\s+/g, "")
            .replace(/预警信号|预警|警报|报告/g, "");
    }

    static #FormatTranslatedEnglishAlertTitle(title) {
        return WeatherAlerts.#TrimWeatherAlertTitle(title)
            .replace(/^(?:a|an|the)\s+/i, "")
            .replace(/\b\p{L}/gu, character => character.toUpperCase());
    }

}
