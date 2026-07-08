import { redirect } from 'next/navigation';

import { logger } from '@/lib/logging/logger';
import { createClient } from '@/lib/supabase/server';

import type { NextRequest } from 'next/server';

/**
 * Server-side PKCE-bevestigingsroute (@supabase/ssr default flowType op zowel
 * createServerClient als createBrowserClient). Zowel de registratie-
 * bevestigingsmail (FR-101, 22_Authenticatie.md § 1) als de wachtwoord-
 * herstellink wijzen hierheen met een `code`-querystring-parameter — NOOIT via
 * een URL-fragment, want dat is server-side onzichtbaar en zou de sessie nooit
 * vóór een proxy-redirect (proxy.ts) kunnen zetten. `exchangeCodeForSession()`
 * zet de sessie-cookie hier op de server, zodat de daaropvolgende request naar
 * `next` al is ingelogd.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      redirect(next);
    }
    logger.warn('E-mailbevestiging/wachtwoordherstel mislukt', { code: error.code });
  }

  redirect('/login?error=confirmation_failed');
}
