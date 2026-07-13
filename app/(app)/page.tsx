import Link from 'next/link';

import { AiSummary } from '@/components/domain/briefing/AiSummary';
import { DayOverview } from '@/components/domain/briefing/DayOverview';
import { MorningModeIndicator } from '@/components/domain/briefing/MorningModeIndicator';
import { ProposalList } from '@/components/domain/briefing/ProposalList';
import { QuickActions } from '@/components/domain/briefing/QuickActions';
import { WarningsList } from '@/components/domain/briefing/WarningsList';
import { WeatherTimeline } from '@/components/domain/briefing/WeatherTimeline';
import { KPICard } from '@/components/domain/KPICard';
import { requireOnboardedUser } from '@/lib/auth/session';
import { getMorningBriefing } from '@/lib/briefing/get-briefing';
import { formatCents } from '@/lib/invoicing/money';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Vandaag — RouteFlow',
};

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Goedemorgen';
  if (hour < 18) return 'Goedemiddag';
  return 'Goedenavond';
}

/**
 * Morning Briefing — het primaire startscherm (ADR-011 § 1,
 * 44_MorningBriefing_UX.md). Scan-pad: eerst het menselijke (welkom), dan het
 * samengevatte (AI-samenvatting), dan het beslisbare (voorstellen), dan het
 * ondersteunende (waarschuwingen, KPI's, snelle acties).
 */
export default async function MorningBriefingPage() {
  const { profile } = await requireOnboardedUser();
  const briefing = await getMorningBriefing(profile);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      {/* § 3.1 Welkomstblok — puur informatief, geen knoppen */}
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-text text-2xl font-semibold">
            {greeting()}, {briefing.firstName}.
          </h1>
          <p className="text-text-muted mt-1 text-sm">
            {briefing.dateLabel.charAt(0).toUpperCase() + briefing.dateLabel.slice(1)}
            {briefing.companyName ? ` · ${briefing.companyName}` : ''}
          </p>
        </div>
        <MorningModeIndicator mode={briefing.mode} />
      </header>

      {/* § 3.2 Dagoverzicht */}
      <DayOverview overview={briefing.overview} />

      {/* § 3.3 Weer — samengevouwen kernregel, uitklapbare tijdlijn */}
      {briefing.weather ? (
        <WeatherTimeline weather={briefing.weather} aiPreview={briefing.aiPreview} />
      ) : null}

      {/* § 3.4/3.5 AI Confidence + Samenvatting */}
      <AiSummary
        summary={briefing.summary}
        confidence={briefing.confidence}
        aiPreview={briefing.aiPreview}
      />

      {/* § 3.6 Voorstellen */}
      <ProposalList proposals={briefing.proposals} aiPreview={briefing.aiPreview} />

      {/* § 3.7 Waarschuwingen */}
      <WarningsList warnings={briefing.warnings} />

      {/* § 3.8 KPI's — alleen voor rollen met rapportage-toegang */}
      {briefing.kpis ? (
        <section aria-label="Kerncijfers" className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between">
            <h2 className="text-text text-sm font-semibold">Kerncijfers</h2>
            <Link
              href="/dashboard"
              className="text-text-muted hover:text-primary text-xs font-medium transition-colors duration-150"
            >
              Naar dashboard
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <KPICard
              label="Omzet deze maand"
              value={formatCents(briefing.kpis.revenueThisMonthCents)}
            />
            <KPICard label="Openstaande facturen" value={String(briefing.kpis.openInvoices)} />
            <KPICard label="Beurten deze week" value={String(briefing.kpis.jobsThisWeek)} />
            <KPICard label="Uitgevoerd vandaag" value={String(briefing.kpis.completedToday)} />
          </div>
        </section>
      ) : null}

      {/* § 3.9 Snelle acties — de expliciete uitgang van de briefing */}
      <QuickActions />
    </div>
  );
}
