import * as Sentry from '@sentry/nextjs';

/**
 * Sprint 10 — observability-basis. Server/edge-init; `SENTRY_DSN` ontbreekt
 * lokaal en in dit project vandaag — Sentry.init() met een lege dsn is
 * bewust inert (geen events verstuurd, geen crash/warning-spam). Activeren
 * vereist dat de gebruiker zelf een Sentry-project aanmaakt en de DSN als
 * env-var instelt; dat kan niet vanuit code gedaan worden.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs' || process.env.NEXT_RUNTIME === 'edge') {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      tracesSampleRate: 0.1,
      // NFR-701/41_CodingStandards.md § 11: geen PII naar een externe dienst.
      sendDefaultPii: false,
    });
  }
}

export const onRequestError = Sentry.captureRequestError;
