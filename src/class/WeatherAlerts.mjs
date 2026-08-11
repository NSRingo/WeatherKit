import { Console, Lodash as _, fetch } from "@nsnanocat/util";

/**
 * 从来源页面提取的预警记录。
 * Alert record extracted from a source page.
 * @typedef {{
 *     areaId?: string,
 *     areaName?: string,
 *     certainty?: string,
 *     description: string,
 *     effectiveTime?: string,
 *     eventEndTime?: string,
 *     eventOnsetTime?: string,
 *     expireTime?: string,
 *     guidelines: string[],
 *     identifier?: string,
 *     importance?: string,
 *     issuedTime: string,
 *     message: string,
 *     eventName?: string,
 *     phenomenon?: string,
 *     responses?: string[],
 *     reportedAt: string,
 *     significance?: string,
 *     source?: string,
 *     severity: "unknown" | "extreme" | "severe" | "moderate" | "minor",
 *     standard: string,
 *     token?: string,
 *     urgency?: string,
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
 *     areaId?: string,
 *     areaName?: string,
 *     attributionURL: string,
 *     certainty: string,
 *     countryCode: string,
 *     description: string,
 *     detailsUrl: string,
 *     effectiveTime: string,
 *     eventEndTime?: string,
 *     eventOnsetTime?: string,
 *     eventSource: string,
 *     expireTime: string,
 *     id: string,
 *     importance?: string,
 *     issuedTime: string,
 *     reportedAt: string,
 *     messages: Array<{language: string, text: string}>,
 *     name: "WeatherAlert",
 *     precedence: number,
 *     phenomenon?: string,
 *     responses: string[],
 *     significance?: string,
 *     severity: string,
 *     source: string,
 *     token?: string,
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
     * 解析 QWeather Alert API 坐标标识。
     * Parse a QWeather Alert API coordinate identifier.
     * @param {string | null | undefined} ids Apple alertDetails 标识 / Apple alertDetails identifier.
     * @returns {{latitude: string, longitude: string} | null} 坐标对象 / Coordinates.
     */
    static ParseQWeatherCoordinateIdentifier(ids) {
        return WeatherAlerts.#ParseCoordinateIdentifier(ids);
    }

    /**
     * 将新的 QWeather 预警数组合并到原始 Apple 预警数组。
     * 只补空值 / unknown，不改 url，也不新增 alert。
     * @param {array} to - 原始 Apple 预警数组
     * @param {array} from - 新的 QWeather 预警数组
     * @returns {array} 原始 Apple 预警数组
     */
    static mergeAlerts(to = [], from = []) {
        if (!Array.isArray(to) || !Array.isArray(from)) return to;
        if (!to.length || !from.length) return to;
        WeatherAlerts.#LogMergeAlertsStart(to, from);
        const usedQWeatherAlertIndexes = new Set();
        for (let appleAlertIndex = 0; appleAlertIndex < to.length; appleAlertIndex++) {
            const appleAlert = to[appleAlertIndex];
            const qWeatherAlertIndex = WeatherAlerts.#FindQWeatherAlert(appleAlert, from, usedQWeatherAlertIndexes, appleAlertIndex);
            WeatherAlerts.#LogMergeAlertMatch(appleAlert, from, usedQWeatherAlertIndexes, appleAlertIndex, qWeatherAlertIndex);
            if (!appleAlert || qWeatherAlertIndex < 0 || !from[qWeatherAlertIndex]) {
                WeatherAlerts.#LogMergeAlertSkip(appleAlertIndex);
                continue;
            }
            usedQWeatherAlertIndexes.add(qWeatherAlertIndex);
            WeatherAlerts.#FillAlert(appleAlert, from[qWeatherAlertIndex], appleAlertIndex, qWeatherAlertIndex);
        }

        return to;
    }

    static #FillAlert(appleAlert, qWeatherAlert, appleAlertIndex, qWeatherAlertIndex) {
        let before;
        if (WeatherAlerts.#IsDebug()) before = WeatherAlerts.#WeatherAlertDebugSnapshot(appleAlert, appleAlertIndex);
        WeatherAlerts.#FillText(appleAlert, "areaId", qWeatherAlert.areaId);
        WeatherAlerts.#FillText(appleAlert, "areaName", qWeatherAlert.areaName);
        WeatherAlerts.#FillTime(appleAlert, "effectiveTime", qWeatherAlert.effectiveTime ?? qWeatherAlert.issuedTime);
        WeatherAlerts.#FillTime(appleAlert, "eventOnsetTime", qWeatherAlert.eventOnsetTime ?? qWeatherAlert.effectiveTime ?? qWeatherAlert.issuedTime ?? appleAlert.effectiveTime ?? appleAlert.issuedTime);
        WeatherAlerts.#FillTime(appleAlert, "eventEndTime", qWeatherAlert.eventEndTime ?? qWeatherAlert.expireTime ?? appleAlert.expireTime);
        WeatherAlerts.#FillTime(appleAlert, "expireTime", qWeatherAlert.expireTime ?? qWeatherAlert.eventEndTime);
        WeatherAlerts.#FillTime(appleAlert, "issuedTime", qWeatherAlert.issuedTime ?? qWeatherAlert.effectiveTime);
        WeatherAlerts.#FillDescription(appleAlert, qWeatherAlert);
        WeatherAlerts.#FillText(appleAlert, "source", qWeatherAlert.source);
        WeatherAlerts.#FillEnum(appleAlert, "phenomenon", qWeatherAlert.phenomenon);
        WeatherAlerts.#FillText(appleAlert, "token", qWeatherAlert.token);
        WeatherAlerts.#FillResponses(appleAlert, qWeatherAlert);
        WeatherAlerts.#FillFlatBufferEnum(appleAlert, "severity", qWeatherAlert.severity, ["UNKNOWN"]);
        WeatherAlerts.#FillFlatBufferEnum(appleAlert, "certainty", qWeatherAlert.certainty);
        WeatherAlerts.#FillFlatBufferEnum(appleAlert, "importance", qWeatherAlert.importance || WeatherAlerts.#ImportanceFromSeverity(qWeatherAlert.severity));
        WeatherAlerts.#FillFlatBufferEnum(appleAlert, "significance", qWeatherAlert.significance);
        WeatherAlerts.#FillFlatBufferEnum(appleAlert, "urgency", qWeatherAlert.urgency);
        if (before) WeatherAlerts.#LogMergeAlertPatch(before, appleAlert, appleAlertIndex, qWeatherAlertIndex);
    }

    static #ToUnixSeconds(value) {
        if (value == null || value === "") return undefined;
        if (typeof value === "number") return value;
        const time = new Date(value).getTime();
        return Number.isNaN(time) ? undefined : Math.trunc(time / 1000);
    }

    static #FillText(appleAlert, key, qWeatherValue) {
        if (String(appleAlert?.[key] ?? "").trim()) return;
        const value = String(qWeatherValue ?? "").trim();
        if (value) appleAlert[key] = value;
    }

    static #FillDescription(appleAlert, qWeatherAlert) {
        const current = String(appleAlert?.description ?? "").trim();
        const value = WeatherAlerts.#NormalizeWeatherAlertTitle(qWeatherAlert?.description, qWeatherAlert?.eventName);
        if (!value) return;
        const currentKey = WeatherAlerts.#NormalizeAlertMatchText(current);
        const eventNameKey = WeatherAlerts.#NormalizeAlertMatchText(qWeatherAlert?.eventName);
        if (!currentKey || currentKey === eventNameKey || currentKey === "other" || currentKey === "unknown") appleAlert.description = value;
    }

    static #FillEnum(appleAlert, key, qWeatherValue, fallbackValues = ["unknown", "Other"]) {
        const current = String(appleAlert?.[key] ?? "").trim();
        const currentFallback = fallbackValues.some(value => current.toLowerCase() === String(value).toLowerCase());
        if (current && !currentFallback) return;
        const value = String(qWeatherValue ?? "").trim();
        if (value) appleAlert[key] = value;
    }

    static #FillFlatBufferEnum(appleAlert, key, qWeatherValue, fallbackValues = ["UNKNOWN"]) {
        const value = WeatherAlerts.#FlatBufferWeatherAlertEnum(key, qWeatherValue);
        if (value) WeatherAlerts.#FillEnum(appleAlert, key, value, fallbackValues);
    }

    static #FillTime(appleAlert, key, qWeatherValue) {
        if (appleAlert?.[key]) return;
        const value = WeatherAlerts.#ToUnixSeconds(qWeatherValue);
        if (value !== undefined) appleAlert[key] = value;
    }

    static #FillResponses(appleAlert, qWeatherAlert) {
        if (Array.isArray(appleAlert?.responses) && appleAlert.responses.length) return;
        const responses = WeatherAlerts.#BuildFlatBufferResponses(qWeatherAlert.guidelines, qWeatherAlert.responses);
        if (responses.length) appleAlert.responses = responses;
    }

    static #BuildFlatBufferResponses(guidelines, preferredResponses = []) {
        const responses = [];
        for (const response of WeatherAlerts.#BuildResponses(guidelines, preferredResponses)) {
            const value = WeatherAlerts.#FlatBufferWeatherAlertEnum("responses", response);
            if (value && !responses.includes(value)) responses.push(value);
        }
        return responses;
    }

    static #FindQWeatherAlert(appleAlert, qWeatherAlerts, usedQWeatherAlertIndexes, appleAlertIndex) {
        let bestIndex = -1;
        let bestScore = 0;
        for (let index = 0; index < qWeatherAlerts.length; index++) {
            if (usedQWeatherAlertIndexes.has(index)) continue;
            const score = WeatherAlerts.#ScoreQWeatherAlert(appleAlert, qWeatherAlerts[index]);
            if (score > bestScore) {
                bestScore = score;
                bestIndex = index;
            }
        }
        if (bestScore >= 30) return bestIndex;
        if (appleAlertIndex < qWeatherAlerts.length && !usedQWeatherAlertIndexes.has(appleAlertIndex)) return appleAlertIndex;
        return -1;
    }

    static #IsDebug() {
        return Console.logLevel === "DEBUG" || Console.logLevel === "ALL";
    }

    static #LogMergeAlertsStart(to, from) {
        if (!WeatherAlerts.#IsDebug()) return;
        Console.debug(
            "mergeAlerts",
            `appleAlertCount: ${to.length}`,
            `qWeatherAlertCount: ${from.length}`,
            `appleAlerts: ${JSON.stringify(to.map((alert, index) => WeatherAlerts.#WeatherAlertDebugSnapshot(alert, index)), null, 2)}`,
            `qWeatherAlerts: ${JSON.stringify(from.map((alert, index) => WeatherAlerts.#WeatherAlertDebugSnapshot(alert, index)), null, 2)}`,
        );
    }

    static #LogMergeAlertMatch(appleAlert, qWeatherAlerts, usedQWeatherAlertIndexes, appleAlertIndex, qWeatherAlertIndex) {
        if (!WeatherAlerts.#IsDebug()) return;
        const candidates = WeatherAlerts.#QWeatherAlertCandidates(appleAlert, qWeatherAlerts, usedQWeatherAlertIndexes);
        Console.debug(
            "mergeAlerts",
            `appleAlertIndex: ${appleAlertIndex}`,
            `selectedQWeatherAlertIndex: ${qWeatherAlertIndex}`,
            `selectedScore: ${candidates[0]?.score ?? 0}`,
            `usedSameIndexFallback: ${qWeatherAlertIndex === appleAlertIndex && (candidates[0]?.score ?? 0) < 30}`,
            `candidates: ${JSON.stringify(candidates, null, 2)}`,
            `appleAlert: ${JSON.stringify(WeatherAlerts.#WeatherAlertDebugSnapshot(appleAlert, appleAlertIndex), null, 2)}`,
            `qWeatherAlert: ${JSON.stringify(qWeatherAlertIndex >= 0 ? WeatherAlerts.#WeatherAlertDebugSnapshot(qWeatherAlerts[qWeatherAlertIndex], qWeatherAlertIndex) : undefined, null, 2)}`,
        );
    }

    static #LogMergeAlertSkip(appleAlertIndex) {
        if (!WeatherAlerts.#IsDebug()) return;
        Console.debug("mergeAlerts", `appleAlertIndex: ${appleAlertIndex}`, "skip: no matched QWeather alert");
    }

    static #LogMergeAlertPatch(before, appleAlert, appleAlertIndex, qWeatherAlertIndex) {
        if (!WeatherAlerts.#IsDebug()) return;
        const after = WeatherAlerts.#WeatherAlertDebugSnapshot(appleAlert, appleAlertIndex);
        Console.debug(
            "mergeAlerts",
            `appleAlertIndex: ${appleAlertIndex}`,
            `qWeatherAlertIndex: ${qWeatherAlertIndex}`,
            `changed: ${JSON.stringify(WeatherAlerts.#WeatherAlertDebugChanges(before, after), null, 2)}`,
            `after: ${JSON.stringify(after, null, 2)}`,
        );
    }

    static #QWeatherAlertCandidates(appleAlert, qWeatherAlerts, usedQWeatherAlertIndexes) {
        const candidates = [];
        for (let index = 0; index < qWeatherAlerts.length; index++) {
            if (usedQWeatherAlertIndexes.has(index)) continue;
            candidates.push({
                index,
                score: WeatherAlerts.#ScoreQWeatherAlert(appleAlert, qWeatherAlerts[index]),
                qWeatherAlert: WeatherAlerts.#WeatherAlertDebugSnapshot(qWeatherAlerts[index], index),
            });
        }
        return candidates.sort((a, b) => b.score - a.score);
    }

    static #ScoreQWeatherAlert(appleAlert, qWeatherAlert) {
        let score = 0;
        const appleAreaId = WeatherAlerts.#NormalizeAlertMatchText(appleAlert?.areaId);
        const qWeatherAreaId = WeatherAlerts.#NormalizeAlertMatchText(qWeatherAlert?.areaId);
        const appleAreaName = WeatherAlerts.#NormalizeAlertMatchText(appleAlert?.areaName);
        const qWeatherAreaName = WeatherAlerts.#NormalizeAlertMatchText(qWeatherAlert?.areaName);
        const appleToken = WeatherAlerts.#NormalizeAlertMatchText(appleAlert?.token);
        const qWeatherToken = WeatherAlerts.#NormalizeAlertMatchText(qWeatherAlert?.token);
        const appleDescription = WeatherAlerts.#NormalizeAlertMatchText(appleAlert?.description);
        const qWeatherDescription = WeatherAlerts.#NormalizeAlertMatchText(qWeatherAlert?.description);
        const qWeatherEventName = WeatherAlerts.#NormalizeAlertMatchText(qWeatherAlert?.eventName);
        const qWeatherMessage = WeatherAlerts.#NormalizeAlertMatchText(qWeatherAlert?.message);
        const applePhenomenon = WeatherAlerts.#NormalizeAlertMatchText(appleAlert?.phenomenon);
        const qWeatherPhenomenon = WeatherAlerts.#NormalizeAlertMatchText(qWeatherAlert?.phenomenon);
        const appleSeverity = WeatherAlerts.#NormalizeAlertMatchText(appleAlert?.severity);
        const qWeatherSeverity = WeatherAlerts.#NormalizeAlertMatchText(qWeatherAlert?.severity);

        if (appleAreaId && qWeatherAreaId && appleAreaId === qWeatherAreaId) score += 60;
        if (appleAreaName && qWeatherAreaName && appleAreaName === qWeatherAreaName) score += 40;
        if (appleToken && qWeatherToken && appleToken === qWeatherToken) score += 50;
        if (appleDescription && qWeatherEventName && appleDescription === qWeatherEventName) score += 50;
        if (appleDescription && qWeatherPhenomenon && appleDescription === qWeatherPhenomenon) score += 50;
        if (appleDescription && qWeatherDescription && qWeatherDescription.includes(appleDescription)) score += 40;
        if (appleDescription && qWeatherMessage && qWeatherMessage.includes(appleDescription)) score += 30;
        if (applePhenomenon && qWeatherPhenomenon && (applePhenomenon === qWeatherPhenomenon || qWeatherPhenomenon.includes(applePhenomenon))) score += 30;
        if (appleSeverity && qWeatherSeverity && appleSeverity === qWeatherSeverity && appleSeverity !== "unknown") score += 10;
        return score;
    }

    static #NormalizeAlertMatchText(value) {
        return String(value ?? "")
            .trim()
            .toLowerCase()
            .replace(/\s+/g, "")
            .replace(/预警信号|预警|警报|报告/g, "");
    }

    static #WeatherAlertDebugSnapshot(alert, index) {
        return {
            index,
            id: alert?.id ?? alert?.identifier,
            areaId: alert?.areaId,
            areaName: alert?.areaName,
            description: alert?.description,
            eventName: alert?.eventName,
            message: alert?.message,
            token: alert?.token,
            phenomenon: alert?.phenomenon,
            severity: alert?.severity,
            significance: alert?.significance,
            urgency: alert?.urgency,
            certainty: alert?.certainty,
            importance: alert?.importance,
            source: alert?.source,
            effectiveTime: alert?.effectiveTime,
            eventOnsetTime: alert?.eventOnsetTime,
            eventEndTime: alert?.eventEndTime,
            expireTime: alert?.expireTime,
            issuedTime: alert?.issuedTime,
            responses: alert?.responses,
            guidelines: alert?.guidelines,
        };
    }

    static #WeatherAlertDebugChanges(before, after) {
        const changed = {};
        for (const key of Object.keys(after)) {
            if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) changed[key] = { before: before[key], after: after[key] };
        }
        return changed;
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
        const dataSource = WeatherAlerts.#FirstMatch(sourceHtml, /<a[^>]*class=["'][^"']*data-source__txt[^"']*["'][^>]*>([\s\S]*?)<\/a>/i)
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
            const headline = description || message;
            const parsedHeadline = WeatherAlerts.#ParseQWeatherHeadline(headline);
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

    /**
     * 将提取后的来源记录构造成 WeatherKit REST WeatherAlert 数组。
     * Build the /api/v1/weatherAlerts JSON array consumed by Apple alertDetails.
     * @param {ExtractedWeatherAlerts} extracted 标准化后的来源数据；alert.source 映射官方页面“签发者”，areaName 映射“受影响区域”。
     * @param {WeatherAlertContext} context 构造上下文；identifier 用于稳定 UUID/areaId，attributionUrl 用于“查看警报来源”链接。
     * @returns {WeatherAlert[]} WeatherAlert 数组 / WeatherAlert array.
     */
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
            const source = alert.source || extracted.source || "QWeather";
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
                eventSource: context.eventSource ?? "CN",
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

    /**
     * 根据 Apple weatherAlerts 请求抓取并转换 QWeather 页面。
     * Fetch and convert the QWeather page for an Apple weatherAlerts request.
     * @param {string} identifier QWeather 页面标识 / QWeather page identifier.
     * @param {string} language Apple alertDetails 语言 / Apple alertDetails language.
     * @param {Record<string, string | string[] | undefined>} requestHeaders 原请求头 / Original request headers.
     * @returns {Promise<WeatherAlert[]>} WeatherAlert 数组 / WeatherAlert array.
     */
    static async GetQWeatherFromPage(identifier, language = "zh-CN", requestHeaders = {}) {
        identifier = identifier?.trim();
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

    /**
     * 根据 Apple 官方样例中的 importance 分层，从 QWeather 严重度推导重要性。
     * Derive WeatherKit importance from QWeather severity when upstream does not provide it.
     * @param {string} severity 预警严重度 / Alert severity.
     * @returns {"high" | "normal" | "low"} Apple WeatherAlert importance.
     */
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

    /**
     * 将 QWeather 的防御指南压缩为 Apple 前端能识别的动作 token。
     * Convert QWeather defense guidance into Apple-recognized action tokens.
     * @param {string[]} guidelines 防御指南 / Defense guidance.
     * @returns {string[]} 动作 token / Action tokens.
     */
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

    /**
     * 标准化动作 token 列表。
     * Normalize action token list.
     * @param {string[]} responses 动作 token / Action tokens.
     * @returns {string[]} 规范化后的动作 token / Normalized action tokens.
     */
    static #NormalizeResponses(responses) {
        const normalized = [];
        for (const response of responses ?? []) {
            const token = String(response ?? "").trim();
            if (token && !normalized.includes(token)) normalized.push(token);
        }
        return normalized;
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

    static #FlatBufferWeatherAlertEnum(key, value) {
        const normalized = String(value ?? "").trim();
        if (!normalized) return "";
        switch (key) {
            case "certainty":
                return WeatherAlerts.#FlatBufferWeatherAlertCertainty(normalized);
            case "importance":
                return WeatherAlerts.#FlatBufferWeatherAlertImportance(normalized);
            case "responses":
                return WeatherAlerts.#FlatBufferWeatherAlertResponse(normalized);
            case "severity":
                return WeatherAlerts.#FlatBufferWeatherAlertSeverity(normalized);
            case "significance":
                return WeatherAlerts.#FlatBufferWeatherAlertSignificance(normalized);
            case "urgency":
                return WeatherAlerts.#FlatBufferWeatherAlertUrgency(normalized);
            default:
                return "";
        }
    }

    static #NormalizeFlatBufferWeatherAlertEnum(value) {
        return String(value ?? "").trim().replace(/[_\s-]+/g, "").toLowerCase();
    }

    static #FlatBufferWeatherAlertCertainty(value) {
        switch (WeatherAlerts.#NormalizeFlatBufferWeatherAlertEnum(value)) {
            case "observed":
                return "OBSERVED";
            case "likely":
                return "LIKELY";
            case "possible":
                return "POSSIBLE";
            case "unlikely":
                return "UNLIKELY";
            case "unknown":
                return "UNKNOWN";
            default:
                return "";
        }
    }

    static #FlatBufferWeatherAlertImportance(value) {
        switch (WeatherAlerts.#NormalizeFlatBufferWeatherAlertEnum(value)) {
            case "high":
                return "HIGH";
            case "normal":
                return "NORMAL";
            case "low":
                return "LOW";
            default:
                return "";
        }
    }

    static #FlatBufferWeatherAlertResponse(value) {
        switch (WeatherAlerts.#NormalizeFlatBufferWeatherAlertEnum(value)) {
            case "evacuate":
                return "EVACUATE";
            case "shelter":
                return "SHELTER";
            case "execute":
                return "EXECUTE";
            case "prepare":
                return "PREPARE";
            case "avoid":
                return "AVOID";
            case "monitor":
                return "MONITOR";
            case "assess":
                return "ASSESS";
            case "allclear":
                return "ALL_CLEAR";
            case "none":
                return "NONE";
            default:
                return "";
        }
    }

    static #FlatBufferWeatherAlertSeverity(value) {
        switch (WeatherAlerts.#NormalizeFlatBufferWeatherAlertEnum(value)) {
            case "unknown":
                return "UNKNOWN";
            case "extreme":
                return "EXTREME";
            case "severe":
                return "SEVERE";
            case "moderate":
                return "MODERATE";
            case "minor":
                return "MINOR";
            default:
                return "";
        }
    }

    static #FlatBufferWeatherAlertSignificance(value) {
        switch (WeatherAlerts.#NormalizeFlatBufferWeatherAlertEnum(value)) {
            case "advisory":
                return "ADVISORY";
            case "watch":
                return "WATCH";
            case "warning":
                return "WARNING";
            case "statement":
                return "STATEMENT";
            case "emergency":
                return "EMERGENCY";
            case "unknown":
                return "UNKNOWN";
            default:
                return "";
        }
    }

    static #FlatBufferWeatherAlertUrgency(value) {
        switch (WeatherAlerts.#NormalizeFlatBufferWeatherAlertEnum(value)) {
            case "immediate":
                return "IMMEDIATE";
            case "expected":
                return "EXPECTED";
            case "future":
                return "FUTURE";
            case "past":
                return "PAST";
            case "unknown":
                return "UNKNOWN";
            default:
                return "";
        }
    }

    /**
     * 将来源标题规范化为 WeatherAlert 最终标题。
     * Normalize a provider headline into the final WeatherAlert title.
     * @param {string} description 预警标题 / Alert title.
     * @param {string} eventName 本地化事件名称 / Localized event name.
     * @returns {string} 规范化标题 / Normalized title.
     */
    static #NormalizeWeatherAlertTitle(description, eventName = "") {
        const title = String(description ?? "").trim();
        const fallback = WeatherAlerts.#TrimWeatherAlertTitle(eventName);
        if (!title) return fallback;

        const chinese = title.match(/^.+?发布\s*[:：]?\s*(.+)$/);
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

    static #FormatTranslatedEnglishAlertTitle(title) {
        return WeatherAlerts.#TrimWeatherAlertTitle(title)
            .replace(/^(?:a|an|the)\s+/i, "")
            .replace(/\b\p{L}/gu, character => character.toUpperCase());
    }

    static #TrimWeatherAlertTitle(title) {
        return String(title ?? "")
            .trim()
            .replace(/\s*[。．.]+\s*$/gu, "")
            .replace(/预警信号$/u, "预警")
            .replace(/預警信號$/u, "預警");
    }

    /**
     * 从 QWeather HTML 标题中解析事件名称和签发机构。
     * Parse the event name and issuer from a QWeather HTML headline.
     * @param {string} description QWeather 标题 / QWeather alert headline.
     * @returns {{eventName: string, source: string}} 标题结构 / Parsed headline fields.
     */
    static #ParseQWeatherHeadline(description) {
        const title = String(description ?? "").trim();
        const chinese = title.match(/^(.+?)发布\s*[:：]?\s*(.+)$/);
        if (chinese?.[1] && chinese?.[2]) return { eventName: chinese[2].trim(), source: chinese[1].trim() };

        const cap = title.match(/^(.+?)\s+issued\b[\s\S]*\s+by\s+(.+)$/i);
        if (cap?.[1] && cap?.[2]) return { eventName: cap[1].trim(), source: WeatherAlerts.#TrimWeatherAlertTitle(cap[2]) };

        const issued = title.match(/^(.+?)\s+issued\b\s*[:：]?\s*(.+)$/i);
        if (issued?.[1] && issued?.[2]) {
            const context = issued[2].trim();
            const capContext = /^(?:for\b|\d{1,2}[/:.-]|\p{L}+\s+(?:\d{1,2}\b|at\b|until\b))/iu.test(context);
            return capContext
                ? { eventName: issued[1].trim(), source: "" }
                : { eventName: WeatherAlerts.#FormatTranslatedEnglishAlertTitle(context), source: issued[1].trim() };
        }

        const issues = title.match(/^(.+?)\s+issues?\b\s*[:：]?\s*(.+)$/i);
        if (issues?.[1] && issues?.[2]) return { eventName: WeatherAlerts.#FormatTranslatedEnglishAlertTitle(issues[2]), source: issues[1].trim() };
        return { eventName: title, source: "" };
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
