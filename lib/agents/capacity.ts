import type { BusinessRuleRef, RawCandidate } from './types.ts';

/**
 * Capacity Agent — domeinlogica (43_AI_Agents.md §9): voorspelt
 * capaciteitsknelpunten en signaleert — geen uitvoerende bevoegdheid, alleen
 * kandidaat-waarschuwingen die de gedeelde pipeline in doorstuurt. Zuiver
 * (geen I/O, 41_CodingStandards.md §12): de aanroeper (agent-capacity
 * Edge Function) haalt beurt-aantallen/beschikbaarheid vooraf op.
 */

export interface CapacityDayInput {
  /** ISO-datum. */
  date: string;
  jobCount: number;
  /** Actieve medewerkers, exclusief ziek/verlof die dag (availability-tabel). */
  availableEmployees: number;
}

export interface CapacityAnalysisParams {
  days: CapacityDayInput[];
  /** Gemiddeld aantal beurten dat één medewerker op één dag aankan (BR-202-afgeleide vuistregel). */
  averageJobsPerEmployeePerDay: number;
}

const BUSINESS_RULES: BusinessRuleRef[] = [
  { code: 'BR-201', label: 'Beschikbaarheid medewerker is absoluut' },
  { code: 'BR-202', label: 'Werkdaglimiet (max. 8,5 uur)' },
];

/** Vanaf welke bezettingsgraad een "attention"-signaal "urgent" wordt. */
const URGENT_RATIO_THRESHOLD = 1.2;

export interface DatedCandidate {
  /**
   * De dag waar de kandidaat over gaat — niet per se "vandaag"
   * (analyzeCapacity kijkt tot 7 dagen vooruit). De aanroeper (agent-capacity/
   * agent-orchestrator) moet dit datumveld gebruiken voor `scheduled_date`,
   * nooit de run-datum van de agent zelf — anders verschijnt een waarschuwing
   * over woensdag ten onrechte in de briefing van vandaag, en weer niet meer
   * op woensdag zelf.
   */
  date: string;
  candidate: RawCandidate;
}

export function analyzeCapacity(params: CapacityAnalysisParams): DatedCandidate[] {
  const { days, averageJobsPerEmployeePerDay } = params;
  const candidates: DatedCandidate[] = [];

  for (const day of days) {
    if (day.jobCount === 0) continue;

    if (day.availableEmployees === 0) {
      candidates.push({
        date: day.date,
        candidate: {
          title: `Geen beschikbare medewerker op ${day.date}`,
          summary: `${day.jobCount} ${day.jobCount === 1 ? 'beurt staat' : 'beurten staan'} gepland, maar er is geen enkele medewerker beschikbaar.`,
          reasoning:
            'Alle medewerkers zijn afwezig (ziek/verlof) of er is geen actieve medewerker toegewezen op deze dag.',
          dataSources: [
            `Beschikbaarheid per medewerker (${day.date})`,
            `Geplande beurten (${day.date})`,
          ],
          businessRules: BUSINESS_RULES,
          confidence: 0.95,
          impact: `${day.jobCount} beurten, 0 medewerkers`,
          expectedGain: 'Voorkomt dat beurten onbemand blijven staan tot de dag zelf',
          alternatives:
            'Geen alternatief automatisch te berekenen — vereist een menselijke beslissing (medewerker vrijmaken of beurten verplaatsen).',
          severity: 'urgent',
          impactedJobIds: [],
          impactedEmployeeIds: [],
          payload: null,
        },
      });
      continue;
    }

    const capacity = day.availableEmployees * averageJobsPerEmployeePerDay;
    const ratio = day.jobCount / capacity;
    if (ratio < 1) continue;

    const severity = ratio >= URGENT_RATIO_THRESHOLD ? 'urgent' : 'attention';
    const confidence = Math.min(0.9, 0.6 + (ratio - 1) * 0.5);

    candidates.push({
      date: day.date,
      candidate: {
        title: `Capaciteitstekort op ${day.date}`,
        summary: `${day.jobCount} beurten voor ${day.availableEmployees} ${day.availableEmployees === 1 ? 'medewerker' : 'medewerkers'} — dat is krap.`,
        reasoning: `Op basis van gemiddeld ${averageJobsPerEmployeePerDay} beurten per medewerker per dag past er ongeveer ${Math.floor(capacity)}; er staan er ${day.jobCount} gepland.`,
        dataSources: [
          `Geplande beurten (${day.date})`,
          `Beschikbaarheid per medewerker (${day.date})`,
        ],
        businessRules: BUSINESS_RULES,
        confidence,
        impact: `${day.jobCount} beurten, ${day.availableEmployees} ${day.availableEmployees === 1 ? 'medewerker' : 'medewerkers'}`,
        expectedGain:
          'Vroegtijdig zicht op een mogelijk te herverdelen dag, vóór het een crisis wordt',
        alternatives:
          'Overwogen: wachten tot de dag zelf — afgewezen, dat laat de planner te weinig tijd om te herverdelen.',
        severity,
        impactedJobIds: [],
        impactedEmployeeIds: [],
        payload: null,
      },
    });
  }

  return candidates;
}
