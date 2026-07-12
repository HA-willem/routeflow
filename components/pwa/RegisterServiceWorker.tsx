'use client';

import { useEffect } from 'react';

/** Registreert de medewerker-service-worker (20_PWA.md § 2) — alleen in /m. */
export function RegisterServiceWorker() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // Stil falen: PWA-installatie is een progressive enhancement, geen
        // vereiste voor de kernfunctionaliteit (20_PWA.md § 8).
      });
    }
  }, []);

  return null;
}
