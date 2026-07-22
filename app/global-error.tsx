'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

import { logger } from '@/lib/logging/logger';

/**
 * Vangt fouten in de root layout zelf op (zeldzaam) — moet een eigen <html>/<body>
 * bevatten omdat hij de root layout vervangt (Next.js App Router-conventie).
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error('Onbehandelde fout opgevangen door global-error-boundary', {
      message: error.message,
      digest: error.digest,
    });
    // Sprint 10 (observability-basis): no-opt zolang SENTRY_DSN niet gezet is
    // (Sentry.init() met een lege dsn is bewust inert, geen crash/spam) —
    // activeren vereist een eigen Sentry-project/DSN van de gebruiker.
    Sentry.captureException(error);
  }, [error]);

  // Bewuste uitzondering op "alleen design tokens" (41_CodingStandards.md § 4):
  // dit bestand vervangt de root layout zelf, dus globals.css/Tailwind kan niet
  // betrouwbaar geladen zijn. Inline styles zijn hier de enige garantie dat de
  // fallback ook rendert als de rest van de styling-pijplijn faalt.
  return (
    <html lang="nl">
      <body
        style={{
          display: 'flex',
          minHeight: '100vh',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px',
          padding: '0 16px',
          textAlign: 'center',
          fontFamily: '-apple-system, "Segoe UI", Roboto, sans-serif',
        }}
      >
        <p style={{ fontSize: '18px', fontWeight: 500 }}>Er ging iets mis.</p>
        <p style={{ maxWidth: '384px', fontSize: '14px', color: '#5f6368' }}>
          Probeer de pagina opnieuw te laden. Blijft dit gebeuren? Neem contact op met support.
        </p>
        <button
          type="button"
          onClick={reset}
          style={{
            borderRadius: '8px',
            backgroundColor: '#1a73e8',
            padding: '8px 16px',
            fontSize: '14px',
            fontWeight: 500,
            color: '#ffffff',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          Opnieuw proberen
        </button>
      </body>
    </html>
  );
}
