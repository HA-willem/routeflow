import { describe, expect, it } from 'vitest';

import { analyzeReplanning } from './replanning';

import type { ReplanningInput } from './replanning';

function input(overrides: Partial<ReplanningInput> = {}): ReplanningInput {
  return {
    sickEmployeeId: 'emp-sick',
    sickEmployeeFirstName: 'Piet',
    date: '2026-07-15',
    affectedJobs: [
      {
        jobId: 'job-1',
        customerName: 'Bakkerij Jansen',
        serviceDurationMinutes: 30,
        locked: false,
      },
      { jobId: 'job-2', customerName: 'VvE Kerkstraat', serviceDurationMinutes: 45, locked: false },
    ],
    colleagues: [
      { employeeId: 'emp-1', firstName: 'Jan', routeId: 'route-1', remainingMinutes: 120 },
      { employeeId: 'emp-2', firstName: 'Maria', routeId: 'route-2', remainingMinutes: 60 },
    ],
    ...overrides,
  };
}

describe('analyzeReplanning (43_AI_Agents.md §5, Replanning Agent, BR-802)', () => {
  it('genereert niets zonder beurten die dag', () => {
    expect(analyzeReplanning(input({ affectedJobs: [] }))).toBeNull();
  });

  it('genereert niets als alle beurten vergrendeld zijn (BR-200)', () => {
    const result = analyzeReplanning(
      input({
        affectedJobs: [
          {
            jobId: 'job-1',
            customerName: 'Bakkerij Jansen',
            serviceDurationMinutes: 30,
            locked: true,
          },
        ],
      }),
    );
    expect(result).toBeNull();
  });

  it('herverdeelt alle beurten wanneer er genoeg capaciteit is', () => {
    const candidate = analyzeReplanning(input())!;
    expect(candidate.payload).toEqual({
      type: 'replan_jobs',
      sickEmployeeFirstName: 'Piet',
      moves: [
        {
          jobId: 'job-2',
          targetRouteId: 'route-1',
          position: 0,
          customerName: 'VvE Kerkstraat',
          targetEmployeeFirstName: 'Jan',
        },
        {
          jobId: 'job-1',
          targetRouteId: 'route-1',
          position: 1,
          customerName: 'Bakkerij Jansen',
          targetEmployeeFirstName: 'Jan',
        },
      ],
      unplaceableJobIds: [],
    });
    expect(candidate.severity).toBe('info');
    expect(candidate.title).toBe('Ziekmelding Piet: 2 beurten herverdelen');
  });

  it('plaatst de grootste beurt eerst bij de collega met de meeste ruimte (stabiliteit, 15_AIPlanner.md §7.3)', () => {
    const candidate = analyzeReplanning(input())!;
    const payload = candidate.payload as { moves: Array<{ jobId: string; targetRouteId: string }> };
    // job-2 (45 min) gaat als eerste naar emp-1 (meeste ruimte, 120 min)
    expect(payload.moves[0]).toMatchObject({ jobId: 'job-2', targetRouteId: 'route-1' });
  });

  it('zet onplaatsbare beurten apart en verlaagt severity/confidence', () => {
    const candidate = analyzeReplanning(
      input({
        affectedJobs: [
          { jobId: 'job-1', customerName: 'A', serviceDurationMinutes: 30, locked: false },
          { jobId: 'job-2', customerName: 'B', serviceDurationMinutes: 200, locked: false },
        ],
        colleagues: [
          { employeeId: 'emp-1', firstName: 'Jan', routeId: 'route-1', remainingMinutes: 60 },
        ],
      }),
    )!;
    const payload = candidate.payload as { unplaceableJobIds: string[] };
    expect(payload.unplaceableJobIds).toEqual(['job-2']);
    expect(candidate.severity).toBe('attention');
    expect(candidate.confidence).toBeLessThan(0.9);
  });

  it('markeert urgent wanneer de meerderheid onplaatsbaar is', () => {
    const candidate = analyzeReplanning(
      input({
        affectedJobs: [
          { jobId: 'job-1', customerName: 'A', serviceDurationMinutes: 200, locked: false },
          { jobId: 'job-2', customerName: 'B', serviceDurationMinutes: 200, locked: false },
        ],
        colleagues: [
          { employeeId: 'emp-1', firstName: 'Jan', routeId: 'route-1', remainingMinutes: 10 },
        ],
      }),
    )!;
    expect(candidate.severity).toBe('urgent');
    expect(candidate.confidence).toBe(0.3);
  });

  it('negeert vergrendelde beurten (BR-200) maar herverdeelt de rest, en vermeldt BR-200 in de regels', () => {
    const candidate = analyzeReplanning(
      input({
        affectedJobs: [
          ...input().affectedJobs,
          {
            jobId: 'job-locked',
            customerName: 'Locked BV',
            serviceDurationMinutes: 30,
            locked: true,
          },
        ],
      }),
    )!;
    const payload = candidate.payload as { moves: Array<{ jobId: string }> };
    expect(payload.moves.map((m) => m.jobId)).not.toContain('job-locked');
    expect(candidate.impactedJobIds).toContain('job-locked');
    expect(candidate.businessRules.map((r) => r.code)).toEqual(['BR-201', 'BR-202', 'BR-200']);
    expect(candidate.summary).toContain('vergrendelde beurt blijft');
  });

  it('vult BR-201/BR-202 als toegepaste business rules zonder vergrendelde beurten', () => {
    const candidate = analyzeReplanning(input())!;
    expect(candidate.businessRules.map((r) => r.code)).toEqual(['BR-201', 'BR-202']);
  });

  it("impactedEmployeeIds bevat de zieke medewerker plus alle betrokken collega's", () => {
    const candidate = analyzeReplanning(input())!;
    expect(candidate.impactedEmployeeIds).toEqual(['emp-sick', 'emp-1']);
  });
});
