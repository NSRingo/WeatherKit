const LEVELS = { OFF: 0, ERROR: 1, WARN: 2, INFO: 3, DEBUG: 4, ALL: 5 };
let level = LEVELS.INFO;

export function setLogEnv(env = {}) {
    let settings = {};
    try { settings = typeof env.SETTINGS === "string" ? JSON.parse(env.SETTINGS) : env.SETTINGS; } catch {}
    const name = String(env.LogLevel ?? settings?.LogLevel ?? "INFO").toUpperCase();
    level = Object.hasOwn(LEVELS, name) ? LEVELS[name] : LEVELS.INFO;
}

const sensitive = key => /token|api[_-]?key|authorization|password/i.test(key) || /^key$/i.test(key);
const redactText = text => text
    .replace(/("[^"]*(?:token|api[_-]?key|authorization|password)[^"]*"\s*:\s*)("(?:\\.|[^"\\])*"|[^,}\]\s]+)/gi, '$1"[REDACTED]"')
    .replace(/([?&](?:token|key|api[_-]?key|authorization|password)=)[^&#\s"']*/gi, "$1[REDACTED]");

function redact(value, seen = new WeakSet()) {
    if (typeof value === "string") {
        if (/^\s*[\[{]/.test(value)) {
            try { return JSON.stringify(redact(JSON.parse(value), seen), null, 2); } catch {}
        }
        return redactText(value);
    }
    if (!value || typeof value !== "object") return value;
    if (value instanceof Error || Object.prototype.toString.call(value) === "[object Error]") return redactText(value.stack || value.message);
    if (seen.has(value)) return "[Circular]";
    seen.add(value);
    const result = Array.isArray(value) ? value.map(item => redact(item, seen))
        : Object.fromEntries(Object.entries(value).map(([key, item]) => [key, sensitive(key) ? "[REDACTED]" : redact(item, seen)]));
    seen.delete(value);
    return result;
}

function format(messages) {
    // Settings includes private provider configuration; keep it out of process logs.
    if (messages[0] === "[buildSettings] Settings:") return [messages[0], "[REDACTED]"];
    return messages.map(message => {
        const value = redact(message);
        return value && typeof value === "object" ? JSON.stringify(value, null, 2) : value;
    });
}

export const Console = Object.fromEntries(
    [["debug", 4], ["info", 3], ["warn", 2], ["error", 1], ["log", 1], ["exception", 1]].map(([method, threshold]) => [method, (...messages) => {
        if (level < threshold) return;
        const output = console[method === "exception" ? "error" : method] ?? console.log;
        if (typeof output === "function") output.apply(console, format(messages));
    }]),
);

export async function logExecution(handler, ctx, stage) {
    Console.info(`☑️ ${stage}`);
    try {
        return await handler(ctx);
    } catch (error) {
        Console.error(`${stage}:`, error);
        throw error;
    } finally {
        Console.info(`✅ ${stage}`);
    }
}
