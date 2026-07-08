import { NextResponse, type NextRequest } from 'next/server';

import { updateSession } from '@/lib/supabase/proxy';

const PUBLIC_PATHS = ['/login', '/registreren', '/wachtwoord-vergeten'];

/**
 * 30_Navigatie.md § 5: een deep link naar een beschermde pagina zonder geldige
 * sessie stuurt naar /login; een ingelogde-maar-niet-onboarded gebruiker (FR-101)
 * wordt altijd naar /onboarding gestuurd totdat public.onboard_company() is
 * doorlopen. RLS (ADR-003/004) blijft de eigenlijke beveiligingsgrens — deze
 * proxy is de UX-laag die vroeg redirect (41_CodingStandards.md § 16).
 *
 * Next.js 16 hernoemde het bestandsconventie "middleware" naar "proxy" (zelfde
 * functie, alleen de bestandsnaam en exportnaam wijzigden).
 */
export async function proxy(request: NextRequest) {
  const { response, isAuthenticated, isOnboarded } = await updateSession(request);
  const { pathname } = request.nextUrl;

  // /auth/confirm verwerkt zelf de PKCE-uitwisseling en redirect vervolgens
  // (app/auth/confirm/route.ts) — nooit onderwerpen aan de auth/onboarding-gate.
  if (pathname.startsWith('/auth/')) {
    return response;
  }

  const isPublicPath = PUBLIC_PATHS.includes(pathname);
  const isOnboardingPath = pathname === '/onboarding';

  if (!isAuthenticated) {
    if (isPublicPath) {
      return response;
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (isPublicPath) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  if (isOnboardingPath) {
    return isOnboarded ? NextResponse.redirect(new URL('/', request.url)) : response;
  }

  if (!isOnboarded) {
    return NextResponse.redirect(new URL('/onboarding', request.url));
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
