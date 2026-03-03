// ─── Centralized Logger ────────────────────────────────────────────────────────
// Lightweight, zero-dependency logger with timestamp + namespaced levels.

const isDev = process.env.NODE_ENV !== "production";

function timestamp() {
    return new Date().toISOString();
}

function fmt(level, namespace, ...args) {
    return [`[${timestamp()}] [${level}] [${namespace}]`, ...args];
}

export function createLogger(namespace = "app") {
    return {
        info: (...args) => console.log(...fmt("INFO", namespace, ...args)),
        warn: (...args) => console.warn(...fmt("WARN", namespace, ...args)),
        error: (...args) => console.error(...fmt("ERROR", namespace, ...args)),
        debug: (...args) => isDev && console.log(...fmt("DEBUG", namespace, ...args)),
    };
}

// Default app-level logger
export default createLogger("server");
