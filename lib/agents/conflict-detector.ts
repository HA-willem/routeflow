import type { ConflictCheckResult, RawCandidate } from './types.ts';

/**
 * Conflict Detector (ADR-012 §2) — gedeelde, domeinneutrale validatiestap:
 * elke kandidaat, ongeacht welke agent hem produceerde, wordt hier getoetst
 * vóórdat hij verder mag. Puur (geen I/O): de aanroeper haalt de benodigde
 * tenant-scoping-data (welke jobs/employees echt bij dit bedrijf horen, welke
 * jobs vergrendeld zijn) vooraf op — dit bestand kent geen database.
 */
export interface ConflictDetectorContext {
  /** Job-ids die BR-200-vergrendeld zijn binnen dit bedrijf. */
  lockedJobIds: ReadonlySet<string>;
  /** Job-ids die daadwerkelijk tot dit bedrijf behoren (tenant-defense-in-depth). */
  companyJobIds: ReadonlySet<string>;
  /** Employee-ids die daadwerkelijk tot dit bedrijf behoren. */
  companyEmployeeIds: ReadonlySet<string>;
}

export function detectConflicts(
  candidate: RawCandidate,
  context: ConflictDetectorContext,
): ConflictCheckResult {
  if (candidate.confidence < 0 || candidate.confidence > 1) {
    return { valid: false, reason: 'Confidence moet tussen 0 en 1 liggen (ADR-012 §3).' };
  }

  for (const jobId of candidate.impactedJobIds) {
    if (!context.companyJobIds.has(jobId)) {
      return { valid: false, reason: `Beurt ${jobId} behoort niet tot dit bedrijf.` };
    }
  }
  for (const employeeId of candidate.impactedEmployeeIds) {
    if (!context.companyEmployeeIds.has(employeeId)) {
      return { valid: false, reason: `Medewerker ${employeeId} behoort niet tot dit bedrijf.` };
    }
  }

  // BR-200: een uitvoerbaar voorstel (payload aanwezig) mag geen vergrendelde
  // beurt raken — een informatief voorstel (Capacity/Weather-signalering,
  // ADR-011 §12) wijzigt sowieso niets, dus die toetsing is daar niet aan de
  // orde (nooit een voorstel om een vergrendelde beurt te verplaatsen, wél
  // een waarschuwing die een vergrendelde beurt ook mag noemen).
  if (candidate.payload) {
    const violated = candidate.impactedJobIds.filter((id) => context.lockedJobIds.has(id));
    if (violated.length > 0) {
      return {
        valid: false,
        violatedRule: { code: 'BR-200', label: 'Vergrendelde beurten blijven fixed' },
        reason: `${violated.length} ${violated.length === 1 ? 'beurt is' : 'beurten zijn'} vergrendeld en kan/kunnen niet automatisch gewijzigd worden.`,
      };
    }
  }

  return { valid: true };
}
