export function requireEnv(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const siteUrl = requireEnv('NEXT_PUBLIC_SITE_URL', process.env.NEXT_PUBLIC_SITE_URL);
