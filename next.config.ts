import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
  // Lokale ontwikkeling/E2E-tests draaien tegen 127.0.0.1 (moet exact overeenkomen
  // met NEXT_PUBLIC_SITE_URL en de Supabase-redirect-allowlist, zie .env.example).
  allowedDevOrigins: ['127.0.0.1'],
};

export default nextConfig;
