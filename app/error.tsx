'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

import { Button } from '@/components/primitives/button';
import { logger } from '@/lib/logging/logger';

/**
 * Route-segment error boundary (41_CodingStandards.md § 10). Menselijke melding +
 * retry-knop; technische details komen alleen in de log, nooit ongefilterd naar
 * de gebruiker (24_UI_UX.md § 5).
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error('Onbehandelde fout opgevangen door route-error-boundary', {
      message: error.message,
      digest: error.digest,
    });
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-text text-lg font-medium">Er ging iets mis.</p>
      <p className="text-text-muted max-w-sm text-sm">
        Probeer de pagina opnieuw te laden. Blijft dit gebeuren? Neem contact op met support.
      </p>
      <Button onClick={reset}>Opnieuw proberen</Button>
    </div>
  );
}
