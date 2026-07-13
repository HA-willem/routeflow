import { ArrowRight, Sparkles, Users, Wrench } from 'lucide-react';
import Link from 'next/link';

import { PageHeader } from '@/components/composed/PageHeader';
import { requireOnboardedUser } from '@/lib/auth/session';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Instellingen — RouteFlow',
};

export default async function InstellingenPage() {
  await requireOnboardedUser();

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Instellingen"
        description="Beheer je diensten, team en (binnenkort) de AI-assistent."
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <Link
          href="/instellingen/diensten"
          className="group border-border bg-bg hover:border-primary/40 flex items-start gap-4 rounded-lg border p-5 transition-colors duration-150"
        >
          <span className="bg-surface text-text-muted group-hover:text-primary flex size-10 shrink-0 items-center justify-center rounded-lg transition-colors duration-150">
            <Wrench aria-hidden className="size-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="text-text flex items-center gap-1 text-sm font-semibold">
              Diensten
              <ArrowRight
                aria-hidden
                className="size-3.5 opacity-0 transition-opacity duration-150 group-hover:opacity-100"
              />
            </span>
            <span className="text-text-muted mt-1 block text-sm">
              Beheer het aanbod diensten van je bedrijf (naam, duur, prijs, BTW).
            </span>
          </span>
        </Link>

        <Link
          href="/instellingen/medewerkers"
          className="group border-border bg-bg hover:border-primary/40 flex items-start gap-4 rounded-lg border p-5 transition-colors duration-150"
        >
          <span className="bg-surface text-text-muted group-hover:text-primary flex size-10 shrink-0 items-center justify-center rounded-lg transition-colors duration-150">
            <Users aria-hidden className="size-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="text-text flex items-center gap-1 text-sm font-semibold">
              Medewerkers
              <ArrowRight
                aria-hidden
                className="size-3.5 opacity-0 transition-opacity duration-150 group-hover:opacity-100"
              />
            </span>
            <span className="text-text-muted mt-1 block text-sm">
              Beheer je medewerkers, nodig om routes aan toe te wijzen.
            </span>
          </span>
        </Link>

        {/* AI-automatiseringsniveaus (44 § 2.2, 15_AIPlanner.md § 8) — Sprint 7-scope;
            hier alvast als niet-klikbare preview zodat de plek in het mentale model vastligt. */}
        <div className="border-border flex items-start gap-4 rounded-lg border border-dashed p-5">
          <span className="bg-surface text-text-muted flex size-10 shrink-0 items-center justify-center rounded-lg">
            <Sparkles aria-hidden className="size-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="text-text flex flex-wrap items-center gap-2 text-sm font-semibold">
              AI-assistent
              <span className="border-border text-text-muted rounded-full border border-dashed px-2 py-0.5 text-[11px] font-medium">
                Binnenkort
              </span>
            </span>
            <span className="text-text-muted mt-1 block text-sm">
              Automatiseringsniveau en confidence-drempel per agent — beschikbaar zodra de AI
              Planner live is.
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}
