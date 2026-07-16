import type { BusinessRuleRef, RawCandidate } from './types.ts';

/**
 * Replanning Agent — domeinlogica (43_AI_Agents.md §5, Sprint 7-vervolg,
 * BR-802). Scope: ziekmelding/verlof van één medewerker op één dag —
 * spoedopdracht/niet-thuis/weersgedreven herplanning volgen dezelfde vorm in
 * een latere sprint (40_Implementatieplan.md "Sprint 7-vervolg"). Zuiver
 * (geen I/O, 41_CodingStandards.md §12): de aanroeper (agent-replanning
 * Edge Function) haalt beurten/collega-capaciteit vooraf op.
 *
 * Bouwt geen eigen verplaatsingslogica of reistijd-herberekening — dat doet
 * route-move-job/Optimization Agent al, ná acceptatie (§ payload.moves).
 * Stabiliteit boven optimaliteit (15_AIPlanner.md §7.3): eenvoudige
 * bin-packing (grootste beurt eerst naar de collega met de meeste resterende
 * ruimte), geen route-volgorde-optimalisatie binnen dit voorstel zelf.
 */

export interface ReplanningAffectedJob {
  jobId: string;
  customerName: string;
  serviceDurationMinutes: number;
  /** BR-200: vergrendelde beurten worden nooit meegenomen. */
  locked: boolean;
}

export interface ReplanningColleague {
  employeeId: string;
  firstName: string;
  routeId: string;
  /** BR-202-afgeleide resterende ruimte (8,5u - reeds geplande tijd) in minuten. */
  remainingMinutes: number;
}

export interface ReplanningInput {
  sickEmployeeId: string;
  sickEmployeeFirstName: string;
  date: string;
  affectedJobs: ReplanningAffectedJob[];
  colleagues: ReplanningColleague[];
}

const BUSINESS_RULES_BASE: BusinessRuleRef[] = [
  { code: 'BR-201', label: 'Beschikbaarheid medewerker is absoluut' },
  { code: 'BR-202', label: 'Werkdaglimiet (max. 8,5 uur)' },
];
const LOCKED_RULE: BusinessRuleRef = {
  code: 'BR-200',
  label: 'Vergrendelde beurten blijven fixed',
};

export function analyzeReplanning(input: ReplanningInput): RawCandidate | null {
  const { affectedJobs, colleagues, sickEmployeeId, sickEmployeeFirstName, date } = input;

  const lockedJobs = affectedJobs.filter((j) => j.locked);
  const movableJobs = affectedJobs.filter((j) => !j.locked);

  if (movableJobs.length === 0) {
    // Niets te herverdelen: geen beurten die dag, of alles vergrendeld
    // (BR-200) — de planner moet vergrendelde beurten altijd zelf behandelen.
    return null;
  }

  const sortedJobs = [...movableJobs].sort(
    (a, b) => b.serviceDurationMinutes - a.serviceDurationMinutes,
  );
  const remaining = new Map(colleagues.map((c) => [c.employeeId, c.remainingMinutes]));
  const positionByEmployee = new Map<string, number>();

  const moves: Array<{
    jobId: string;
    customerName: string;
    targetEmployeeId: string;
    targetEmployeeFirstName: string;
    targetRouteId: string;
    position: number;
  }> = [];
  const unplaceableJobIds: string[] = [];

  for (const job of sortedJobs) {
    const candidates = colleagues
      .filter((c) => (remaining.get(c.employeeId) ?? 0) >= job.serviceDurationMinutes)
      .sort((a, b) => (remaining.get(b.employeeId) ?? 0) - (remaining.get(a.employeeId) ?? 0));
    const best = candidates[0];

    if (!best) {
      unplaceableJobIds.push(job.jobId);
      continue;
    }

    remaining.set(
      best.employeeId,
      (remaining.get(best.employeeId) ?? 0) - job.serviceDurationMinutes,
    );
    const position = positionByEmployee.get(best.employeeId) ?? 0;
    positionByEmployee.set(best.employeeId, position + 1);

    moves.push({
      jobId: job.jobId,
      customerName: job.customerName,
      targetEmployeeId: best.employeeId,
      targetEmployeeFirstName: best.firstName,
      targetRouteId: best.routeId,
      position,
    });
  }

  const totalCount = movableJobs.length;
  const placedCount = moves.length;
  const ratio = placedCount / totalCount;
  const confidence = Math.max(0.3, Math.min(0.9, ratio));
  const severity: RawCandidate['severity'] =
    unplaceableJobIds.length === 0
      ? 'info'
      : unplaceableJobIds.length > totalCount / 2
        ? 'urgent'
        : 'attention';

  const businessRules =
    lockedJobs.length > 0 ? [...BUSINESS_RULES_BASE, LOCKED_RULE] : BUSINESS_RULES_BASE;

  const summaryParts = [`${placedCount} van ${totalCount} beurten herverdeeld over collega's.`];
  if (unplaceableJobIds.length > 0) {
    summaryParts.push(
      `${unplaceableJobIds.length} ${unplaceableJobIds.length === 1 ? 'kon' : 'konden'} niet geplaatst worden — naar de herplan-wachtrij.`,
    );
  }
  if (lockedJobs.length > 0) {
    summaryParts.push(
      `${lockedJobs.length} vergrendelde ${lockedJobs.length === 1 ? 'beurt blijft' : 'beurten blijven'} ongewijzigd staan.`,
    );
  }

  const involvedColleagueCount = new Set(moves.map((m) => m.targetEmployeeId)).size;

  return {
    title: `Ziekmelding ${sickEmployeeFirstName}: ${totalCount} ${totalCount === 1 ? 'beurt' : 'beurten'} herverdelen`,
    summary: summaryParts.join(' '),
    reasoning: `${sickEmployeeFirstName} is niet beschikbaar op ${date}. De niet-vergrendelde beurten zijn verdeeld over collega's met voldoende resterende capaciteit, met zo min mogelijk verstoring van hun bestaande planning (15_AIPlanner.md § 7.3).`,
    dataSources: [
      `Beschikbaarheid (${date})`,
      `Geplande beurten van ${sickEmployeeFirstName} (${date})`,
      `Resterende capaciteit collega's (${date})`,
    ],
    businessRules,
    confidence,
    impact: `${totalCount} beurten, ${involvedColleagueCount} ${involvedColleagueCount === 1 ? 'collega' : "collega's"}${unplaceableJobIds.length > 0 ? `, ${unplaceableJobIds.length} naar wachtrij` : ''}`,
    expectedGain: 'Voorkomt onbemande beurten; klanten kunnen tijdig geïnformeerd worden.',
    alternatives:
      "Overwogen: alle beurten naar de wachtrij laten staan — afgewezen, dat laat onnodig veel klanten onbediend terwijl er nog ruimte bij collega's is.",
    severity,
    impactedJobIds: affectedJobs.map((j) => j.jobId),
    impactedEmployeeIds: [sickEmployeeId, ...new Set(moves.map((m) => m.targetEmployeeId))],
    payload: {
      type: 'replan_jobs',
      sickEmployeeFirstName,
      moves: moves.map(
        ({ jobId, targetRouteId, position, customerName, targetEmployeeFirstName }) => ({
          jobId,
          targetRouteId,
          position,
          customerName,
          targetEmployeeFirstName,
        }),
      ),
      unplaceableJobIds,
    },
  };
}
