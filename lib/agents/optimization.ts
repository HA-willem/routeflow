import type { RawCandidate } from './types.ts';

/**
 * Optimization Agent — kandidaatgeneratie (43_AI_Agents.md §11). Sprint 7
 * formaliseert de al-bestaande, productiebewezen `route-optimize`-Edge-Function
 * (Sprint 4) tot agent: dit bestand vertaalt uitsluitend het `dry_run`-resultaat
 * (geen schrijfactie, zie route-optimize/index.ts) naar een kandidaat — er is
 * geen nieuwe optimalisatielogica (ADR-011 §7, 43 §11: "voegt geen nieuwe
 * optimalisatielogica toe"). Zuiver, geen I/O.
 */

export interface OptimizationDryRunResult {
  employeeId: string;
  employeeFirstName: string;
  date: string;
  stopCount: number;
  totalDriveTimeMinutes: number;
  /** null = geen bestaande route om mee te vergelijken (eerste keer plannen, geen "besparing"-voorstel). */
  previousTotalDriveTimeMinutes: number | null;
  jobIds: string[];
}

/** Onder deze besparing is een voorstel niet de moeite waard om te tonen. */
const MIN_SAVED_MINUTES_TO_PROPOSE = 3;

export function buildOptimizationCandidate(result: OptimizationDryRunResult): RawCandidate | null {
  if (result.stopCount < 2) return null;
  if (result.previousTotalDriveTimeMinutes === null) return null;

  const savedMinutes = result.previousTotalDriveTimeMinutes - result.totalDriveTimeMinutes;
  if (savedMinutes < MIN_SAVED_MINUTES_TO_PROPOSE) return null;

  return {
    title: `Route van ${result.employeeFirstName} herschikken`,
    summary: `${result.stopCount} beurten in een andere volgorde rijden — dezelfde beurten, minder reistijd.`,
    reasoning: `De huidige volgorde kost meer reistijd dan nodig. Een herschikking bespaart ${savedMinutes} minuten rijden zonder dat er iets verschuift voor je klanten.`,
    dataSources: ['Reistijd-cache (distance_cache)', `Route van ${result.date}`],
    businessRules: [
      { code: 'BR-200', label: 'Vergrendelde beurten blijven fixed' },
      { code: 'BR-202', label: 'Werkdaglimiet (max. 8,5 uur)' },
    ],
    confidence: Math.min(0.95, 0.7 + savedMinutes / 100),
    impact: `${result.stopCount} beurten, 1 medewerker (${result.employeeFirstName})`,
    expectedGain: `${savedMinutes} minuten minder reistijd, 0 klantwijzigingen`,
    alternatives:
      'Overwogen: de huidige volgorde ongewijzigd laten — afgewezen, de nieuwe volgorde is aantoonbaar korter binnen dezelfde harde regels.',
    severity: 'info',
    impactedJobIds: result.jobIds,
    impactedEmployeeIds: [result.employeeId],
    payload: { type: 'route_optimize', employeeId: result.employeeId, date: result.date },
  };
}
