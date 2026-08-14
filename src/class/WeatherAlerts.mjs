import { Console } from "@nsnanocat/util";

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
    /**
     * 将新的来源预警数组合并到原始 Apple 预警数组。
     * Merge new source alerts into the original Apple alert array.
     * 来源完整标题优先；其他字段只补空值 / unknown，不改 url，也不新增 alert。
     * Prefer the complete provider title; only fill empty / unknown values for other fields without changing URLs or adding alerts.
     * @param {array} to - 原始 Apple 预警数组
     * @param {array} from - 新的来源预警数组
     * @returns {array} 原始 Apple 预警数组
     */
    static mergeAlerts(to = [], from = []) {
        if (!Array.isArray(to) || !Array.isArray(from)) return to;
        if (!to.length || !from.length) return to;
        WeatherAlerts.#LogMergeAlertsStart(to, from);
        const usedSourceAlertIndexes = new Set();
        for (let appleAlertIndex = 0; appleAlertIndex < to.length; appleAlertIndex++) {
            const appleAlert = to[appleAlertIndex];
            const sourceAlertIndex = WeatherAlerts.#FindSourceAlert(appleAlert, from, usedSourceAlertIndexes, appleAlertIndex);
            WeatherAlerts.#LogMergeAlertMatch(appleAlert, from, usedSourceAlertIndexes, appleAlertIndex, sourceAlertIndex);
            if (!appleAlert || sourceAlertIndex < 0 || !from[sourceAlertIndex]) {
                WeatherAlerts.#LogMergeAlertSkip(appleAlertIndex);
                continue;
            }
            usedSourceAlertIndexes.add(sourceAlertIndex);
            WeatherAlerts.#FillAlert(appleAlert, from[sourceAlertIndex], appleAlertIndex, sourceAlertIndex);
        }

        return to;
    }

    static #FillAlert(appleAlert, sourceAlert, appleAlertIndex, sourceAlertIndex) {
        let before;
        if (WeatherAlerts.#IsDebug()) before = WeatherAlerts.#WeatherAlertDebugSnapshot(appleAlert, appleAlertIndex);
        const sourceExpireTime = sourceAlert.expireTime === "9999-12-31T23:59:59Z" ? undefined : sourceAlert.expireTime;
        WeatherAlerts.#FillText(appleAlert, "areaId", sourceAlert.areaId);
        WeatherAlerts.#FillText(appleAlert, "areaName", sourceAlert.areaName);
        WeatherAlerts.#FillTime(appleAlert, "effectiveTime", sourceAlert.effectiveTime ?? sourceAlert.issuedTime);
        WeatherAlerts.#FillTime(appleAlert, "eventOnsetTime", sourceAlert.eventOnsetTime ?? sourceAlert.effectiveTime ?? sourceAlert.issuedTime ?? appleAlert.effectiveTime ?? appleAlert.issuedTime);
        WeatherAlerts.#FillTime(appleAlert, "eventEndTime", sourceAlert.eventEndTime ?? sourceExpireTime ?? appleAlert.expireTime);
        WeatherAlerts.#FillTime(appleAlert, "expireTime", sourceExpireTime ?? sourceAlert.eventEndTime);
        WeatherAlerts.#FillTime(appleAlert, "issuedTime", sourceAlert.issuedTime ?? sourceAlert.effectiveTime);
        WeatherAlerts.#FillDescription(appleAlert, sourceAlert);
        WeatherAlerts.#FillText(appleAlert, "source", sourceAlert.source);
        WeatherAlerts.#FillEnum(appleAlert, "phenomenon", sourceAlert.phenomenon);
        WeatherAlerts.#FillText(appleAlert, "token", sourceAlert.token);
        WeatherAlerts.#FillResponses(appleAlert, sourceAlert);
        WeatherAlerts.#FillFlatBufferEnum(appleAlert, "severity", sourceAlert.severity, ["UNKNOWN"]);
        WeatherAlerts.#FillFlatBufferEnum(appleAlert, "certainty", sourceAlert.certainty);
        WeatherAlerts.#FillFlatBufferEnum(appleAlert, "importance", sourceAlert.importance || WeatherAlerts.#ImportanceFromSeverity(sourceAlert.severity));
        WeatherAlerts.#FillFlatBufferEnum(appleAlert, "significance", sourceAlert.significance);
        WeatherAlerts.#FillFlatBufferEnum(appleAlert, "urgency", sourceAlert.urgency);
        if (before) WeatherAlerts.#LogMergeAlertPatch(before, appleAlert, appleAlertIndex, sourceAlertIndex);
    }

    static #ToUnixSeconds(value) {
        if (value == null || value === "") return undefined;
        if (typeof value === "number") return value;
        const time = new Date(value).getTime();
        return Number.isNaN(time) ? undefined : Math.trunc(time / 1000);
    }

    static #FillText(appleAlert, key, sourceValue) {
        if (String(appleAlert?.[key] ?? "").trim()) return;
        const value = String(sourceValue ?? "").trim();
        if (value) appleAlert[key] = value;
    }

    static #FillDescription(appleAlert, sourceAlert) {
        const sourceTitle = String(sourceAlert?.description ?? "").trim();
        const value = WeatherAlerts.#NormalizeWeatherAlertTitle(sourceAlert?.description, sourceAlert?.eventName);
        if (!value) return;
        const current = String(appleAlert?.description ?? "").trim();
        if (sourceTitle || !current || current.toLowerCase() === "other" || current.toLowerCase() === "unknown") appleAlert.description = value;
    }

    static #FillEnum(appleAlert, key, sourceValue, fallbackValues = ["unknown", "Other"]) {
        const current = String(appleAlert?.[key] ?? "").trim();
        const currentFallback = fallbackValues.some(value => current.toLowerCase() === String(value).toLowerCase());
        if (current && !currentFallback) return;
        const value = String(sourceValue ?? "").trim();
        if (value) appleAlert[key] = value;
    }

    static #FillFlatBufferEnum(appleAlert, key, sourceValue, fallbackValues = ["UNKNOWN"]) {
        const value = WeatherAlerts.#FlatBufferWeatherAlertEnum(key, sourceValue);
        if (value) WeatherAlerts.#FillEnum(appleAlert, key, value, fallbackValues);
    }

    static #FillTime(appleAlert, key, sourceValue) {
        if (appleAlert?.[key]) return;
        const value = WeatherAlerts.#ToUnixSeconds(sourceValue);
        if (value !== undefined) appleAlert[key] = value;
    }

    static #FillResponses(appleAlert, sourceAlert) {
        if (Array.isArray(appleAlert?.responses) && appleAlert.responses.length) return;
        const responses = WeatherAlerts.#BuildFlatBufferResponses(sourceAlert.guidelines, sourceAlert.responses);
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

    static #FindSourceAlert(appleAlert, sourceAlerts, usedSourceAlertIndexes, appleAlertIndex) {
        let bestIndex = -1;
        let bestScore = 0;
        for (let index = 0; index < sourceAlerts.length; index++) {
            if (usedSourceAlertIndexes.has(index)) continue;
            const score = WeatherAlerts.#ScoreSourceAlert(appleAlert, sourceAlerts[index]);
            if (score > bestScore) {
                bestScore = score;
                bestIndex = index;
            }
        }
        if (bestScore >= 30) return bestIndex;
        if (appleAlertIndex < sourceAlerts.length && !usedSourceAlertIndexes.has(appleAlertIndex)) return appleAlertIndex;
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
            `sourceAlertCount: ${from.length}`,
            `appleAlerts: ${JSON.stringify(to.map((alert, index) => WeatherAlerts.#WeatherAlertDebugSnapshot(alert, index)), null, 2)}`,
            `sourceAlerts: ${JSON.stringify(from.map((alert, index) => WeatherAlerts.#WeatherAlertDebugSnapshot(alert, index)), null, 2)}`,
        );
    }

    static #LogMergeAlertMatch(appleAlert, sourceAlerts, usedSourceAlertIndexes, appleAlertIndex, sourceAlertIndex) {
        if (!WeatherAlerts.#IsDebug()) return;
        const candidates = WeatherAlerts.#SourceAlertCandidates(appleAlert, sourceAlerts, usedSourceAlertIndexes);
        Console.debug(
            "mergeAlerts",
            `appleAlertIndex: ${appleAlertIndex}`,
            `selectedSourceAlertIndex: ${sourceAlertIndex}`,
            `selectedScore: ${candidates[0]?.score ?? 0}`,
            `usedSameIndexFallback: ${sourceAlertIndex === appleAlertIndex && (candidates[0]?.score ?? 0) < 30}`,
            `candidates: ${JSON.stringify(candidates, null, 2)}`,
            `appleAlert: ${JSON.stringify(WeatherAlerts.#WeatherAlertDebugSnapshot(appleAlert, appleAlertIndex), null, 2)}`,
            `sourceAlert: ${JSON.stringify(sourceAlertIndex >= 0 ? WeatherAlerts.#WeatherAlertDebugSnapshot(sourceAlerts[sourceAlertIndex], sourceAlertIndex) : undefined, null, 2)}`,
        );
    }

    static #LogMergeAlertSkip(appleAlertIndex) {
        if (!WeatherAlerts.#IsDebug()) return;
        Console.debug("mergeAlerts", `appleAlertIndex: ${appleAlertIndex}`, "skip: no matched source alert");
    }

    static #LogMergeAlertPatch(before, appleAlert, appleAlertIndex, sourceAlertIndex) {
        if (!WeatherAlerts.#IsDebug()) return;
        const after = WeatherAlerts.#WeatherAlertDebugSnapshot(appleAlert, appleAlertIndex);
        Console.debug(
            "mergeAlerts",
            `appleAlertIndex: ${appleAlertIndex}`,
            `sourceAlertIndex: ${sourceAlertIndex}`,
            `changed: ${JSON.stringify(WeatherAlerts.#WeatherAlertDebugChanges(before, after), null, 2)}`,
            `after: ${JSON.stringify(after, null, 2)}`,
        );
    }

    static #SourceAlertCandidates(appleAlert, sourceAlerts, usedSourceAlertIndexes) {
        const candidates = [];
        for (let index = 0; index < sourceAlerts.length; index++) {
            if (usedSourceAlertIndexes.has(index)) continue;
            candidates.push({
                index,
                score: WeatherAlerts.#ScoreSourceAlert(appleAlert, sourceAlerts[index]),
                sourceAlert: WeatherAlerts.#WeatherAlertDebugSnapshot(sourceAlerts[index], index),
            });
        }
        return candidates.sort((a, b) => b.score - a.score);
    }

    static #ScoreSourceAlert(appleAlert, sourceAlert) {
        let score = 0;
        const appleAreaId = WeatherAlerts.#NormalizeAlertMatchText(appleAlert?.areaId);
        const sourceAreaId = WeatherAlerts.#NormalizeAlertMatchText(sourceAlert?.areaId);
        const appleAreaName = WeatherAlerts.#NormalizeAlertMatchText(appleAlert?.areaName);
        const sourceAreaName = WeatherAlerts.#NormalizeAlertMatchText(sourceAlert?.areaName);
        const appleToken = WeatherAlerts.#NormalizeAlertMatchText(appleAlert?.token);
        const sourceToken = WeatherAlerts.#NormalizeAlertMatchText(sourceAlert?.token);
        const appleDescription = WeatherAlerts.#NormalizeAlertMatchText(appleAlert?.description);
        const sourceDescription = WeatherAlerts.#NormalizeAlertMatchText(sourceAlert?.description);
        const sourceEventName = WeatherAlerts.#NormalizeAlertMatchText(sourceAlert?.eventName);
        const sourceMessage = WeatherAlerts.#NormalizeAlertMatchText(sourceAlert?.message);
        const applePhenomenon = WeatherAlerts.#NormalizeAlertMatchText(appleAlert?.phenomenon);
        const sourcePhenomenon = WeatherAlerts.#NormalizeAlertMatchText(sourceAlert?.phenomenon);
        const appleSeverity = WeatherAlerts.#NormalizeAlertMatchText(appleAlert?.severity);
        const sourceSeverity = WeatherAlerts.#NormalizeAlertMatchText(sourceAlert?.severity);

        if (appleAreaId && sourceAreaId && appleAreaId === sourceAreaId) score += 60;
        if (appleAreaName && sourceAreaName && appleAreaName === sourceAreaName) score += 40;
        if (appleToken && sourceToken && appleToken === sourceToken) score += 50;
        if (appleDescription && sourceEventName && appleDescription === sourceEventName) score += 50;
        if (appleDescription && sourcePhenomenon && appleDescription === sourcePhenomenon) score += 50;
        if (appleDescription && sourceDescription && sourceDescription.includes(appleDescription)) score += 40;
        if (appleDescription && sourceMessage && sourceMessage.includes(appleDescription)) score += 30;
        if (applePhenomenon && sourcePhenomenon && (applePhenomenon === sourcePhenomenon || sourcePhenomenon.includes(applePhenomenon))) score += 30;
        if (appleSeverity && sourceSeverity && appleSeverity === sourceSeverity && appleSeverity !== "unknown") score += 10;
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

    /**
     * 根据 Apple 官方样例中的 importance 分层，从来源严重度推导重要性。
     * Derive WeatherKit importance from source severity when upstream does not provide it.
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
     * 将来源防御指南压缩为 Apple 前端能识别的动作 token。
     * Convert source defense guidance into Apple-recognized action tokens.
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

    static #FormatTranslatedEnglishAlertTitle(title) {
        return WeatherAlerts.#TrimWeatherAlertTitle(title)
            .replace(/^(?:a|an|the)\s+/i, "")
            .replace(/\b\p{L}/gu, character => character.toUpperCase());
    }

    static #TrimWeatherAlertTitle(title) {
        return String(title ?? "")
            .trim()
            .replace(/\s*[\[【][^\]】]+[\]】]\s*$/u, "")
            .replace(/\s*[。．.]+\s*$/gu, "")
            .replace(/预警信号$/u, "预警")
            .replace(/預警信號$/u, "預警");
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
