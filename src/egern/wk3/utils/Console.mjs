const LEVELS = { OFF: 0, ERROR: 1, WARN: 2, INFO: 3, DEBUG: 4, ALL: 5 };

// 日志级别在部署时固定，不支持运行时修改（避免跨请求污染）
// 如需调整，修改此处或在 database.mjs 中同步调整 LogLevel 默认值
const LEVEL = LEVELS.INFO;

const fmt = msg =>
    msg.map(m => (typeof m === "object" && m !== null ? JSON.stringify(m, null, 2) : m));

export const Console = {
    debug:     (...msg) => { if (LEVEL >= LEVELS.DEBUG) console.debug(...fmt(msg)); },
    info:      (...msg) => { if (LEVEL >= LEVELS.INFO)  console.info(...fmt(msg));  },
    warn:      (...msg) => { if (LEVEL >= LEVELS.WARN)  console.warn(...fmt(msg));  },
    error:     (...msg) => { if (LEVEL >= LEVELS.ERROR) console.error(...fmt(msg)); },
    log:       (...msg) => { if (LEVEL >  LEVELS.OFF)   console.log(...fmt(msg));   },
    exception: (...msg) => { if (LEVEL >= LEVELS.ERROR) console.error(...fmt(msg)); },
};
