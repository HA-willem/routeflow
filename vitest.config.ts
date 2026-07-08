import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@/components': fileURLToPath(new URL('./components', import.meta.url)),
      '@/lib': fileURLToPath(new URL('./lib', import.meta.url)),
      '@/types': fileURLToPath(new URL('./types', import.meta.url)),
      '@/hooks': fileURLToPath(new URL('./hooks', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    globals: false,
    setupFiles: ['./tests/setup.ts'],
    exclude: ['**/node_modules/**', '**/.next/**', 'tests/e2e/**', 'tests/integration/**'],
  },
});
