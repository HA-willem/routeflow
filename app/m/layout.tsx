import { redirect } from 'next/navigation';

import { RegisterServiceWorker } from '@/components/pwa/RegisterServiceWorker';
import { requireOnboardedUser } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';

import { SyncIndicator } from './SyncIndicator';

import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'RouteFlow — Medewerker',
  manifest: '/manifest.webmanifest',
};

export const viewport: Viewport = {
  themeColor: '#2563eb',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

/**
 * Medewerker-PWA-shell (29_MobieleApp.md). Toegang vereist een `employees`-rij
 * gekoppeld aan de ingelogde gebruiker (23_Gebruikersrollen.md § 2) — niet elke
 * ingelogde gebruiker is per se medewerker; wie geen eigen route kan hebben
 * (bv. een Eigenaar zonder employees-rij) hoort in de desktop-app, niet hier.
 */
export default async function MobileLayout({ children }: { children: ReactNode }) {
  const { user, profile } = await requireOnboardedUser();
  const supabase = await createClient();

  const { data: employee } = await supabase
    .from('employees')
    .select('id, first_name')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!employee) {
    // Een employee-rol zonder employees-rij is een datainconsistentie; terugsturen
    // naar / zou een redirect-loop geven (/ stuurt employees naar /m). Toon dan
    // een neutrale melding i.p.v. te bouncen.
    if (profile.role === 'employee') {
      return (
        <div className="bg-bg text-text mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-4 text-center">
          <p className="text-base font-medium">Geen medewerker-profiel gevonden.</p>
          <p className="text-text-muted mt-1 text-sm">
            Vraag je beheerder om je account aan een medewerker te koppelen.
          </p>
        </div>
      );
    }
    redirect('/');
  }

  return (
    <div className="bg-bg text-text mx-auto flex min-h-dvh max-w-md flex-col md:max-w-2xl">
      <RegisterServiceWorker />
      <header className="border-border flex items-center justify-between border-b px-4 py-3">
        <span className="text-sm font-semibold">RouteFlow</span>
        <SyncIndicator />
      </header>
      <main className="flex-1 pb-24">{children}</main>
    </div>
  );
}
