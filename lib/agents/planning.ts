import type { BusinessRuleRef, RawCandidate } from './types.ts';

/**
 * Planning Agent — domeinlogica (43_AI_Agents.md § 4, Sprint 7-vervolg).
 * Formaliseert de al-bestaande horizon-laag (lib/planning/horizon.ts,
 * planning-generate-Edge-Function, Sprint 3) tot pipeline-conforme agent —
 * geen nieuwe datumlogica (die blijft `generateHorizonDates`). Het aanmaken
 * van `voorgesteld`-beurten is zelf al de door ADR-011 § 4 toegestane
 * autonome actie ("Voorstellen maken" mag zonder per-actie-goedkeuring); deze
 * module bouwt uitsluitend de informatieve samenvatting daarvan voor de
 * Morning Briefing (zelfde rol als Capacity/Weather Agent, § 9/§ 6: geen
 * `payload`, dus geen aparte goedkeuringsstap nodig — de beurten bestaan al
 * ten tijde van deze kandidaat).
 *
 * Zuiver (geen I/O, 41_CodingStandards.md § 12): de aanroeper
 * (agent-planning Edge Function) heeft `planning-generate` al aangeroepen en
 * geeft hier alleen het resultaat door.
 */

export interface PlanningAgreementResult {
  serviceAgreementId: string;
  datesGenerated: number;
  /** FR-025/BR-204: of deze afspraak richting een nabije bestaande beurt genudged is. */
  clustered: boolean;
}

export interface PlanningRunSummary {
  fromDate: string;
  weeks: number;
  agreementResults: PlanningAgreementResult[];
  skippedCount: number;
}

const BUSINESS_RULES: BusinessRuleRef[] = [
  { code: 'BR-001', label: 'Ideale datum = laatste uitvoering + interval' },
  { code: 'BR-101', label: 'Flexvenster (soft)' },
  { code: 'BR-102', label: 'Geen gaten in de reeks' },
  { code: 'BR-103', label: 'Maandpatronen kalendergebaseerd' },
  { code: 'BR-204', label: 'Geografische clustering (soft)' },
];

/**
 * `null` wanneer er niets nieuws te melden is (alle dienstafspraken hadden al
 * een voorgestelde beurt binnen de horizon, of er zijn geen actieve
 * dienstafspraken) — geen kale "niets gebeurd"-kandidaat op de Briefing.
 */
export function summarizePlanningRun(summary: PlanningRunSummary): RawCandidate | null {
  const { fromDate, weeks, agreementResults, skippedCount } = summary;
  const totalDates = agreementResults.reduce((sum, r) => sum + r.datesGenerated, 0);

  if (totalDates === 0) {
    return null;
  }

  const agreementCount = agreementResults.length;
  const clusteredCount = agreementResults.filter((r) => r.clustered).length;
  const clusteringNote =
    clusteredCount > 0
      ? ` Daarvan ${clusteredCount === 1 ? 'is 1 dienstafspraak' : `zijn ${clusteredCount} dienstafspraken`} dichter bij bestaande buurtgenoten gepland (binnen het flexibiliteitsvenster) voor efficiëntere routes.`
      : '';

  return {
    title: `${totalDates} nieuwe ${totalDates === 1 ? 'beurt' : 'beurten'} voorgesteld`,
    summary: `Voor ${agreementCount} ${agreementCount === 1 ? 'dienstafspraak' : 'dienstafspraken'} ${agreementCount === 1 ? 'is' : 'zijn'} ${totalDates} voorgestelde ${totalDates === 1 ? 'beurt' : 'beurten'} aangemaakt voor de komende ${weeks} ${weeks === 1 ? 'week' : 'weken'}.${clusteringNote}`,
    reasoning:
      'Elke actieve dienstafspraak is doorgerekend op basis van de laatst uitgevoerde beurt (of, bij een eerste beurt, de voorkeursdag) en de ingestelde frequentie — deterministische datumberekening, geen afweging. Beurten binnen 1km van een al-bestaande beurt van een andere dienstafspraak schuiven, indien het flexibiliteitsvenster het toelaat, naar diezelfde datum (BR-204).',
    dataSources: [
      `Actieve dienstafspraken (${fromDate})`,
      'Frequentie/voorkeursdag per afspraak',
      'Objectlocaties van nabije beurten (buurt-clustering, BR-204)',
    ],
    businessRules: BUSINESS_RULES,
    confidence: 0.95,
    impact: `${totalDates} ${totalDates === 1 ? 'beurt' : 'beurten'}, ${agreementCount} ${agreementCount === 1 ? 'dienstafspraak' : 'dienstafspraken'}${skippedCount > 0 ? `, ${skippedCount} overgeslagen` : ''}`,
    expectedGain:
      'Klanten en planner zien beurten ruim vooraf ontstaan, geen handmatig aanmaken per dienstafspraak nodig.',
    alternatives:
      'Geen alternatief overwogen — dit is deterministische datumberekening (BR-001/BR-103), geen keuzemoment tussen opties.',
    severity: 'info',
    impactedJobIds: [],
    impactedEmployeeIds: [],
    payload: null,
  };
}
