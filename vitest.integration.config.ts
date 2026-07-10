import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

/**
 * Integratietests (31_Testplan.md § 1) — draaien tegen een lokale Supabase-instantie
 * (`supabase start`), o.a. de verplichte negatieve RLS-tests (NFR-301, 31 § 4).
 * Los van vitest.config.ts (unit) zodat `npm test` snel en zonder externe
 * afhankelijkheden blijft.
 */
export default defineConfig({
  resolve: {
    alias: {
      '@/lib': fileURLToPath(new URL('./lib', import.meta.url)),
      '@/types': fileURLToPath(new URL('./types', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    globals: false,
    include: ['tests/integration/**/*.test.ts'],
    testTimeout: 20000,
    hookTimeout: 20000,
    // Alle testbestanden delen één lokale Supabase-instantie (auth/GoTrue,
    // Postgres); met meerdere bestanden draait Vitest ze standaard parallel over
    // workers, wat tientallen gelijktijdige signUp()-calls naar dezelfde
    // container stuurt. Sprint 2 voegde het vierde/vijfde testbestand toe
    // waarbij dit lokaal daadwerkelijk AuthRetryableFetchError opleverde
    // (auth-container overbelast) — sequentieel is voor gedeelde externe state
    // sowieso robuuster dan parallel, ongeacht de omgeving.
    fileParallelism: false,
  },
});
