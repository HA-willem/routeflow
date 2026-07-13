import type { WeatherRiskHour, WeatherRiskType } from './thresholds.ts';
import type { BusinessRuleRef, RawCandidate } from '../agents/types.ts';

/**
 * Weather Agent — kandidaatgeneratie (43_AI_Agents.md §6). Sprint 7-scope:
 * uitsluitend een **waarschuwing** (informatief, `payload: null`) — het
 * daadwerkelijk verplaatsen van geraakte beurten naar een andere dag is de
 * taak van de Replanning Agent (43 §5), die in dit sprint bewust nog niet
 * gebouwd wordt (te grote, event-driven scope, zie de strategische review).
 * Zuiver, geen I/O.
 */

export interface WeatherSensitiveJob {
  jobId: string;
  employeeId: string;
  employeeFirstName: string;
  sensitivityType: WeatherRiskType;
  /** Uur waarop de dienst gepland staat (0-23). */
  serviceStartHour: number;
}

const RISK_LABEL: Record<WeatherRiskType, string> = {
  rain: 'regen',
  frost: 'vorst',
  wind: 'harde wind',
};

const RISK_BUSINESS_RULE: Record<WeatherRiskType, BusinessRuleRef> = {
  rain: { code: '15§6.3', label: 'Regendrempel (≥70% of ≥2 mm/u)' },
  frost: { code: '15§6.3', label: 'Vorstdrempel (<0°C)' },
  wind: { code: '15§6.3', label: 'Winddrempel (≥8 Bft)' },
};

export function buildWeatherCandidates(params: {
  date: string;
  riskHours: WeatherRiskHour[];
  jobs: WeatherSensitiveJob[];
}): RawCandidate[] {
  const { date, riskHours, jobs } = params;
  if (riskHours.length === 0 || jobs.length === 0) return [];

  const affectedJobs = jobs.filter((job) =>
    riskHours.some(
      (risk) => risk.hour >= job.serviceStartHour && risk.risks.includes(job.sensitivityType),
    ),
  );
  if (affectedJobs.length === 0) return [];

  // Dominant risicotype voor de tekst — een dag met gemengde risicotypen
  // (bv. zowel regen als wind) is zeldzaam genoeg om te vereenvoudigen tot
  // het type van de eerst-geraakte beurt; elk geraakt type staat wel in
  // businessRules (hieronder), dus er gaat geen informatie verloren.
  const dominantType = affectedJobs[0]!.sensitivityType;
  const firstAffectedRisk = riskHours.find(
    (risk) => risk.hour >= affectedJobs[0]!.serviceStartHour && risk.risks.includes(dominantType),
  )!;
  const employeeNames = Array.from(new Set(affectedJobs.map((job) => job.employeeFirstName)));
  const riskTypes = Array.from(new Set(affectedJobs.map((job) => job.sensitivityType)));

  return [
    {
      title: `Weersgevoelige beurten geraakt op ${date}`,
      summary: `${affectedJobs.length} ${affectedJobs.length === 1 ? 'beurt is' : 'beurten zijn'} gevoelig voor ${RISK_LABEL[dominantType]} vanaf ${firstAffectedRisk.hour}:00.`,
      reasoning: `${RISK_LABEL[dominantType].charAt(0).toUpperCase()}${RISK_LABEL[dominantType].slice(1)} overschrijdt de drempel vanaf ${firstAffectedRisk.hour}:00 tijdens het werkvenster; de geraakte diensten zijn hiervoor als gevoelig gemarkeerd.`,
      dataSources: [
        `Weersverwachting (Open-Meteo), opgehaald voor ${date}`,
        'Weersgevoeligheid per dienst',
      ],
      businessRules: riskTypes.map((type) => RISK_BUSINESS_RULE[type]),
      confidence: 0.8,
      impact: `${affectedJobs.length} beurten, ${employeeNames.length} ${employeeNames.length === 1 ? 'medewerker' : 'medewerkers'} (${employeeNames.join(', ')})`,
      expectedGain: 'Voorkomt uitstel of een klacht bij weersgevoelige diensten',
      alternatives:
        'Een beurt daadwerkelijk verplaatsen is een herplan-beslissing (flexvenster, doeldag-capaciteit) — dit voorstel signaleert het risico, de herplanning zelf vereist een menselijke beoordeling.',
      severity: 'attention',
      impactedJobIds: affectedJobs.map((job) => job.jobId),
      impactedEmployeeIds: Array.from(new Set(affectedJobs.map((job) => job.employeeId))),
      payload: null,
    },
  ];
}
