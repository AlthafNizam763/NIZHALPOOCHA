type Level = 'debug' | 'info' | 'warn' | 'error';
const ORDER: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };

const threshold = ORDER[(process.env.LOG_LEVEL as Level) ?? 'info'] ?? ORDER.info;

function log(level: Level, scope: string, msg: string, extra?: unknown): void {
  if (ORDER[level] < threshold) return;
  const line = `${new Date().toISOString()} ${level.toUpperCase().padEnd(5)} [${scope}] ${msg}`;
  const out = level === 'error' || level === 'warn' ? console.error : console.log;
  if (extra !== undefined) out(line, extra);
  else out(line);
}

export function createLogger(scope: string) {
  return {
    debug: (m: string, e?: unknown) => log('debug', scope, m, e),
    info: (m: string, e?: unknown) => log('info', scope, m, e),
    warn: (m: string, e?: unknown) => log('warn', scope, m, e),
    error: (m: string, e?: unknown) => log('error', scope, m, e),
  };
}
export type Logger = ReturnType<typeof createLogger>;
