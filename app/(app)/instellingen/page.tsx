import {
  ArrowRight,
  Building2,
  Lightbulb,
  ShieldCheck,
  Sparkles,
  Users,
  Wrench,
} from 'lucide-react';
import Link from 'next/link';

import { PageHeader } from '@/components/composed/PageHeader';
import { requireOnboardedUser } from '@/lib/auth/session';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Instellingen — ServOps',
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
          href="/instellingen/bedrijf"
          className="group border-border bg-bg hover:border-primary/40 flex items-start gap-4 rounded-lg border p-5 transition-colors duration-150"
        >
          <span className="bg-surface text-text-muted group-hover:text-primary flex size-10 shrink-0 items-center justify-center rounded-lg transition-colors duration-150">
            <Building2 aria-hidden className="size-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="text-text flex items-center gap-1 text-sm font-semibold">
              Bedrijf
              <ArrowRight
                aria-hidden
                className="size-3.5 opacity-0 transition-opacity duration-150 group-hover:opacity-100"
              />
            </span>
            <span className="text-text-muted mt-1 block text-sm">
              Bedrijfsgegevens, facturatie en je bedrijfstype/branche.
            </span>
          </span>
        </Link>

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

        <Link
          href="/instellingen/feature-requests"
          className="group border-border bg-bg hover:border-primary/40 flex items-start gap-4 rounded-lg border p-5 transition-colors duration-150"
        >
          <span className="bg-surface text-text-muted group-hover:text-primary flex size-10 shrink-0 items-center justify-center rounded-lg transition-colors duration-150">
            <Lightbulb aria-hidden className="size-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="text-text flex items-center gap-1 text-sm font-semibold">
              Feature requests
              <ArrowRight
                aria-hidden
                className="size-3.5 opacity-0 transition-opacity duration-150 group-hover:opacity-100"
              />
            </span>
            <span className="text-text-muted mt-1 block text-sm">
              Dien een verzoek in voor iets wat ServOps voor jou beter zou maken.
            </span>
          </span>
        </Link>

        <Link
          href="/instellingen/over-ai"
          className="group border-border bg-bg hover:border-primary/40 flex items-start gap-4 rounded-lg border p-5 transition-colors duration-150"
        >
          <span className="bg-surface text-text-muted group-hover:text-primary flex size-10 shrink-0 items-center justify-center rounded-lg transition-colors duration-150">
            <ShieldCheck aria-hidden className="size-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="text-text flex items-center gap-1 text-sm font-semibold">
              Hoe ServOps AI gebruikt
              <ArrowRight
                aria-hidden
                className="size-3.5 opacity-0 transition-opacity duration-150 group-hover:opacity-100"
              />
            </span>
            <span className="text-text-muted mt-1 block text-sm">
              Wat is er echt AI, wat noemen we AI maar is het niet, en wie beslist er.
            </span>
          </span>
        </Link>

        <Link
          href="/instellingen/ai-assistent"
          className="group border-border bg-bg hover:border-primary/40 flex items-start gap-4 rounded-lg border p-5 transition-colors duration-150"
        >
          <span className="bg-surface text-text-muted group-hover:text-primary flex size-10 shrink-0 items-center justify-center rounded-lg transition-colors duration-150">
            <Sparkles aria-hidden className="size-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="text-text flex items-center gap-1 text-sm font-semibold">
              AI-assistent
              <ArrowRight
                aria-hidden
                className="size-3.5 opacity-0 transition-opacity duration-150 group-hover:opacity-100"
              />
            </span>
            <span className="text-text-muted mt-1 block text-sm">
              Automatiseringsniveau en confidence-drempel per agent.
            </span>
          </span>
        </Link>
      </div>
    </div>
  );
}
