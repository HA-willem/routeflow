import * as Sentry from '@sentry/nextjs';

/**
 * Sprint 10 — observability-basis, client-zijde. Zelfde inert-zonder-DSN-
 * gedrag als instrumentation.ts. Geen Session Replay (privacy — klant-/
 * planningdata staat op het scherm) en geen PII-verzameling.
 */
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  sendDefaultPii: false,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
