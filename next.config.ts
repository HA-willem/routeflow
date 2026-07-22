import { withSentryConfig } from '@sentry/nextjs';

import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
  // Lokale ontwikkeling/E2E-tests draaien tegen 127.0.0.1 (moet exact overeenkomen
  // met NEXT_PUBLIC_SITE_URL en de Supabase-redirect-allowlist, zie .env.example).
  allowedDevOrigins: ['127.0.0.1'],
};

// Sprint 10 — observability-basis. Zonder SENTRY_AUTH_TOKEN slaat de
// upload-plugin source-map-upload over (waarschuwing, geen build-fout) —
// geverifieerd via een lokale `npm run build` (Turbopack). Geen
// webpack-specifieke opties (disableLogger/automaticVercelMonitors) — dit
// project bouwt met Turbopack, waar die opties toch genegeerd worden.
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: true,
  widenClientFileUpload: true,
});
