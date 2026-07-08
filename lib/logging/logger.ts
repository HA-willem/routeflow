type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  correlationId?: string;
  companyId?: string;
  [key: string]: unknown;
}

/**
 * Gestructureerde JSON-logging (NFR-701, 41_CodingStandards.md § 11). Log nooit
 * PII (e-mailadres, telefoonnummer, adres, bedragen) — verwijs naar het record-ID,
 * niet naar de inhoud.
 */
function log(level: LogLevel, message: string, context: LogContext = {}): void {
  if (level === 'debug' && process.env.NODE_ENV === 'production') {
    return;
  }

  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...context,
  };
  const line = JSON.stringify(entry);

  if (level === 'error') {
    console.error(line);
  } else if (level === 'warn') {
    console.warn(line);
  } else {
    console.log(line);
  }
}

export const logger = {
  debug: (message: string, context?: LogContext) => log('debug', message, context),
  info: (message: string, context?: LogContext) => log('info', message, context),
  warn: (message: string, context?: LogContext) => log('warn', message, context),
  error: (message: string, context?: LogContext) => log('error', message, context),
};

export function createCorrelationId(): string {
  return crypto.randomUUID();
}
