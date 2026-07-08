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
  },
});
