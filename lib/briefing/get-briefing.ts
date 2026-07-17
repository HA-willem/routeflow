import { formatDayHeading, todayIso, weekDates } from '@/lib/planning/dates';
import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/types/database.types';

import { buildDemoProposals, buildDemoSummary, buildDemoWeather } from './demo';
import { deriveConfidence, deriveMorningMode } from './mode';
import { toAgentProposal } from './proposals';

import type { DemoDayFacts } from './demo';
import type { BriefingConfidence, BriefingWarning, MorningBriefing } from './types';

type UserProfile = Database['public']['Tables']['users']['Row'];

/** Rollen met rapportage-toegang zien de KPI-sectie (44 § 2/3.8, 23-rechtenmatrix). */
const KPI_ROLES: Array<UserProfile['role']> = ['owner', 'admin'];

const CONFIDENCE_LABELS: Record<BriefingConfidence['level'], string> = {
  high: 'Hoog vertrouwen — de planning van vandaag is stabiel.',
  medium: 'Gemiddeld vertrouwen — een paar voorstellen verdienen een blik.',
  low: 'Laag vertrouwen — meerdere voorstellen vragen je beoordeling.',
};

function startOfMonthIso(): string {
  return `${todayIso().slice(0, 8)}01`;
}

/**
 * Morning Briefing-assemblage (ADR-011 § 1, 44_MorningBriefing_UX.md § 3).
 * Dagfeiten, waarschuwingen en KPI's komen live uit de database; de
 * AI-onderdelen (samenvatting/voorstellen/weer) zijn voorbeeldweergave tot de
 * Sprint 7-agents bestaan (`aiPreview`, zie lib/briefing/demo.ts).
 */
export async function getMorningBriefing(profile: UserProfile): Promise<MorningBriefing> {
  const supabase = await createClient();
  const today = todayIso();
  const week = weekDates(today);

  const [
    { count: jobsToday },
    { data: routesToday },
    { count: employeesTotal },
    { count: queueSize },
    { count: completedToday },
    { count: jobsThisWeek },
    { count: draftInvoices },
    { count: openInvoices },
    { count: overdueInvoices },
    { data: monthInvoices },
    { data: company },
    { data: successfulRunsToday },
    { data: realProposalRows },
  ] = await Promise.all([
    supabase
      .from('jobs')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', profile.company_id)
      .eq('scheduled_date', today)
      .neq('status', 'cancelled'),
    supabase
      .from('routes')
      .select('id, employees!routes_employee_id_fkey(first_name)')
      .eq('company_id', profile.company_id)
      .eq('route_date', today),
    supabase
      .from('employees')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', profile.company_id)
      .eq('is_active', true)
      .is('archived_at', null),
    supabase
      .from('jobs')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', profile.company_id)
      .is('route_id', null)
      .gte('scheduled_date', today)
      .in('status', ['proposed', 'planned', 'not_home', 'rescheduling']),
    supabase
      .from('jobs')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', profile.company_id)
      .eq('status', 'completed')
      .gte('completed_at', `${today}T00:00:00`),
    supabase
      .from('jobs')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', profile.company_id)
      .gte('scheduled_date', week[0]!)
      .lte('scheduled_date', week[6]!)
      .neq('status', 'cancelled'),
    supabase
      .from('invoices')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', profile.company_id)
      .eq('status', 'draft'),
    supabase
      .from('invoices')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', profile.company_id)
      .eq('status', 'sent'),
    supabase
      .from('invoices')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', profile.company_id)
      .eq('status', 'sent')
      .lt('due_date', today),
    supabase
      .from('invoices')
      .select('total_amount_cents')
      .eq('company_id', profile.company_id)
      .gte('created_at', `${startOfMonthIso()}T00:00:00`),
    supabase.from('companies').select('name').eq('id', profile.company_id).single(),
    // Sprint 7 (ADR-012): een agent_runs-rij voor vandaag betekent dat de
    // nachtcyclus (of een handmatige trigger) al gedraaid heeft voor dit
    // bedrijf — de AI-samenvatting/voorstellen zijn dan echt, geen
    // voorbeeldweergave meer. Zonder run (bv. nog geen enkele cyclus
    // gedraaid) blijft de bestaande demo-voorbeeldweergave het vangnet
    // (ADR-012 §4, "de applicatie blijft altijd bruikbaar").
    supabase
      .from('agent_runs')
      .select('id')
      .eq('company_id', profile.company_id)
      .gte('started_at', `${today}T00:00:00`)
      .eq('result', 'success')
      .limit(1),
    // `gte` i.p.v. `eq` op scheduled_date: Capacity Agent kijkt tot 7 dagen
    // vooruit (44 § 4 scenario 4, "woensdag wordt het lastiger") en de
    // Replanning Agent genereert bij een ziekmelding meteen een voorstel voor
    // de getroffen datum (vaak morgen, niet vandaag) — een strikte
    // vandaag-filter zou beide categorieën onzichtbaar maken totdat de
    // betrokken dag zelf aanbreekt, wat het "meteen beschikbaar"-doel van
    // beide agents ondermijnt (ADR-011 §6).
    supabase
      .from('agent_proposals')
      .select('*')
      .eq('company_id', profile.company_id)
      .gte('scheduled_date', today)
      .eq('approval_status', 'proposed')
      .order('scheduled_date', { ascending: true })
      .order('created_at', { ascending: true }),
  ]);

  // Nog te koppelen jobs per route zijn hier niet nodig — alleen aantallen per route.
  const routeIds = (routesToday ?? []).map((r) => r.id);
  let jobCountByRoute = new Map<string, number>();
  if (routeIds.length > 0) {
    const { data: routeJobs } = await supabase
      .from('jobs')
      .select('route_id')
      .eq('company_id', profile.company_id)
      .in('route_id', routeIds)
      .neq('status', 'cancelled');
    jobCountByRoute = (routeJobs ?? []).reduce((map, row) => {
      if (row.route_id) map.set(row.route_id, (map.get(row.route_id) ?? 0) + 1);
      return map;
    }, new Map<string, number>());
  }

  const facts: DemoDayFacts = {
    dateIso: today,
    jobsToday: jobsToday ?? 0,
    queueSize: queueSize ?? 0,
    employeesAvailable: employeesTotal ?? 0,
    routes: (routesToday ?? []).map((route) => ({
      routeId: route.id,
      employeeFirstName: route.employees?.first_name ?? 'Onbekend',
      jobCount: jobCountByRoute.get(route.id) ?? 0,
    })),
  };

  // Waarschuwingen zijn échte feiten uit de database — geen voorbeeldcontent (44 § 3.7).
  const warnings: BriefingWarning[] = [];
  if ((overdueInvoices ?? 0) > 0) {
    warnings.push({
      id: 'overdue-invoices',
      severity: 'attention',
      text: `${overdueInvoices} verzonden ${overdueInvoices === 1 ? 'factuur is' : 'facturen zijn'} over de vervaldatum.`,
      href: '/facturen',
      hrefLabel: 'Naar facturen',
    });
  }
  if ((draftInvoices ?? 0) > 0) {
    warnings.push({
      id: 'draft-invoices',
      severity: 'info',
      text: `${draftInvoices} ${draftInvoices === 1 ? 'conceptfactuur staat' : 'conceptfacturen staan'} klaar voor controle.`,
      href: '/facturen',
      hrefLabel: 'Naar facturen',
    });
  }
  if ((employeesTotal ?? 0) === 0 && (jobsToday ?? 0) > 0) {
    warnings.push({
      id: 'no-employees',
      severity: 'urgent',
      text: 'Er staan beurten gepland maar er is geen actieve medewerker.',
      href: '/instellingen/medewerkers',
      hrefLabel: 'Naar medewerkers',
    });
  }

  const firstName = profile.full_name.split(' ')[0]!;
  const hour = new Date().getHours();
  const greetingWord = hour < 12 ? 'Goedemorgen' : hour < 18 ? 'Goedemiddag' : 'Goedenavond';

  // Sprint 7: zodra de agent-pipeline vandaag al gedraaid heeft, zijn de
  // samenvatting en voorstellen echt (agent_proposals, ADR-012 §6) i.p.v.
  // voorbeeldweergave. De weer-tíjdlijn (uur-voor-uur-grafiek) blijft nog wel
  // gevuld met buildDemoWeather: agent-weather cachet uitsluitend het
  // dagaggregaat (11_DatabaseConcept.md §3.9-schema, geen eigen, rijkere
  // urencache — ADR-012 §3), dus er is geen echte urenreeks om te tonen. De
  // weer-gerelateerde AI-voorstellen zelf zijn wél echt (via agent_proposals).
  const hasRealAiToday = (successfulRunsToday ?? []).length > 0;
  const weather = buildDemoWeather(facts);
  const proposals = hasRealAiToday
    ? (realProposalRows ?? []).map(toAgentProposal)
    : buildDemoProposals(facts, weather);
  // buildDemoSummary is generieke tekstopbouw op basis van AgentProposal[] +
  // dagfeiten — werkt identiek op echte en voorbeeld-voorstellen, geen aparte
  // "echte samenvatting"-functie nodig.
  const summary = buildDemoSummary(`${greetingWord} ${firstName}.`, facts, weather, proposals);
  const { level, score } = deriveConfidence(proposals);

  const revenueThisMonthCents = (monthInvoices ?? []).reduce(
    (sum, row) => sum + row.total_amount_cents,
    0,
  );

  return {
    firstName,
    companyName: company?.name ?? '',
    dateLabel: formatDayHeading(today),
    mode: deriveMorningMode(proposals, warnings),
    overview: {
      jobsToday: jobsToday ?? 0,
      routesToday: (routesToday ?? []).length,
      employeesAvailable: employeesTotal ?? 0,
      employeesTotal: employeesTotal ?? 0,
      queueSize: queueSize ?? 0,
    },
    weather,
    confidence: { level, score, label: CONFIDENCE_LABELS[level] },
    summary,
    proposals,
    warnings,
    kpis: KPI_ROLES.includes(profile.role)
      ? {
          revenueThisMonthCents,
          openInvoices: openInvoices ?? 0,
          jobsThisWeek: jobsThisWeek ?? 0,
          completedToday: completedToday ?? 0,
        }
      : null,
    aiPreview: !hasRealAiToday,
  };
}
