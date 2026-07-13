/**
 * Morning Briefing — datacontract (44_MorningBriefing_UX.md, ADR-011 § 1, ADR-012 § 6).
 *
 * Het voorstel-schema volgt het Explanation Generator-outputschema (ADR-012 § 6):
 * reasoning / gegevensbronnen / business rules / confidence / impact / winst /
 * alternatieven. De Sprint 7-agents leveren straks exact deze shape; tot die tijd
 * vult `lib/briefing/demo.ts` de AI-onderdelen met voorbeeldcontent (`aiPreview`).
 */

export type MorningMode = 'green' | 'yellow' | 'red';

export type AgentName =
  | 'planning'
  | 'replanning'
  | 'weather'
  | 'optimization'
  | 'capacity'
  | 'communication'
  | 'revenue'
  | 'invoice';

export type WarningSeverity = 'info' | 'attention' | 'urgent';

export interface BusinessRuleRef {
  /** Stabiel requirement-nummer, bv. "BR-202" — nooit hernummeren. */
  code: string;
  /** Leesbare naam, bv. "Werkdaglimiet (max. 8,5 uur)" (44 § 8.3). */
  label: string;
}

export interface AgentProposal {
  id: string;
  agent: AgentName;
  title: string;
  /** Wat er concreet verandert, één zin (44 § 5 "Samenvatting"). */
  summary: string;
  /** Mens-leesbare reden, geen jargon (ADR-012 § 6 `reasoning`). */
  reasoning: string;
  /** Gebruikte bronnen incl. geleerde voorkeuren (44 § 8.2, 45_AgentMemory.md § 5). */
  dataSources: string[];
  businessRules: BusinessRuleRef[];
  /** 0..1 — getoond als geheel getal (0,88 → 88, ADR-012 § 3). */
  confidence: number;
  /** Bv. "3 beurten, 1 medewerker (Jan)". */
  impact: string;
  expectedGain: string;
  /** Overwogen alternatieven + waarom afgewezen (44 § 8.4). */
  alternatives: string;
  severity: WarningSeverity;
}

export interface BriefingWarning {
  id: string;
  severity: WarningSeverity;
  text: string;
  /** Waar het opgelost wordt — nooit in de briefing zelf (44 § 3.7). */
  href: string;
  hrefLabel: string;
}

export interface WeatherHour {
  /** 24-uursklok, binnen het werkvenster (08:00–17:00). */
  hour: number;
  /** Neerslagkans 0..100. */
  precipitationChance: number;
  temperature: number;
  windBft: number;
}

export interface WeatherDay {
  /** De kernregel, bv. "Regen vanaf 15:00 — 4 beurten geraakt." (44 § 3.3). */
  summaryLine: string;
  minTemp: number;
  maxTemp: number;
  maxWindBft: number;
  hours: WeatherHour[];
  /** Aantal beurten geraakt door een drempeloverschrijding (15_AIPlanner.md § 6.3). */
  affectedJobs: number;
}

export interface DayOverview {
  jobsToday: number;
  routesToday: number;
  employeesAvailable: number;
  employeesTotal: number;
  queueSize: number;
}

export interface BriefingConfidence {
  level: 'high' | 'medium' | 'low';
  /** Nooit een kaal percentage zonder context (44 § 3.4). */
  label: string;
  /** 0..1, geaggregeerd (gemiddelde van dag-kritieke voorstellen). */
  score: number;
}

export interface BriefingKpis {
  revenueThisMonthCents: number;
  openInvoices: number;
  jobsThisWeek: number;
  completedToday: number;
}

export interface MorningBriefing {
  firstName: string;
  companyName: string;
  /** Bv. "zondag 13 juli". */
  dateLabel: string;
  mode: MorningMode;
  overview: DayOverview;
  weather: WeatherDay | null;
  confidence: BriefingConfidence;
  /** De AI Samenvatting — één alinea, direct/persoonlijk (44 § 4). */
  summary: string;
  proposals: AgentProposal[];
  warnings: BriefingWarning[];
  /** Alleen voor rollen met rapportage-toegang (44 § 2/3.8), anders null. */
  kpis: BriefingKpis | null;
  /**
   * True zolang de AI-onderdelen (samenvatting/voorstellen/weer/confidence)
   * voorbeeldcontent zijn i.p.v. echte agent-output (Sprint 7) — de UI toont
   * dan een expliciete "Voorbeeldweergave"-indicatie (geen verzonnen AI
   * presenteren als echt, ADR-011 vertrouwensmodel).
   */
  aiPreview: boolean;
}
