/**
 * Minimal structured JSON logger with secret redaction.
 * No dependency; safe to import in any server context.
 */
type Level = "debug" | "info" | "warn" | "error";

const LEVEL_ORDER: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };

const SENSITIVE_KEY = /(pass|secret|token|api[_-]?key|authorization|cookie|credential)/i;

function currentThreshold(): number {
  const raw = (process.env.LOG_LEVEL ?? "info").toLowerCase();
  return LEVEL_ORDER[(raw as Level)] ?? LEVEL_ORDER.info;
}

export function redact(value: unknown, depth = 0): unknown {
  if (depth > 6) return "[truncated]";
  if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1));
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = SENSITIVE_KEY.test(k) ? "[redacted]" : redact(v, depth + 1);
    }
    return out;
  }
  if (typeof value === "string" && value.length > 2000) return `${value.slice(0, 2000)}…`;
  return value;
}

function emit(level: Level, msg: string, meta?: Record<string, unknown>) {
  if (LEVEL_ORDER[level] < currentThreshold()) return;
  const record = {
    ts: new Date().toISOString(),
    level,
    msg,
    ...(meta ? (redact(meta) as Record<string, unknown>) : {}),
  };
  const line = JSON.stringify(record);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export interface Logger {
  debug(msg: string, meta?: Record<string, unknown>): void;
  info(msg: string, meta?: Record<string, unknown>): void;
  warn(msg: string, meta?: Record<string, unknown>): void;
  error(msg: string, meta?: Record<string, unknown>): void;
  child(bindings: Record<string, unknown>): Logger;
}

function make(bindings: Record<string, unknown>): Logger {
  const merge = (meta?: Record<string, unknown>) => ({ ...bindings, ...meta });
  return {
    debug: (m, meta) => emit("debug", m, merge(meta)),
    info: (m, meta) => emit("info", m, merge(meta)),
    warn: (m, meta) => emit("warn", m, merge(meta)),
    error: (m, meta) => emit("error", m, merge(meta)),
    child: (extra) => make({ ...bindings, ...extra }),
  };
}

export const logger: Logger = make({ app: "ifa" });
