import { describe, expect, it } from 'vitest';

import { buildOptimizationCandidate } from './optimization';

import type { OptimizationDryRunResult } from './optimization';

function result(overrides: Partial<OptimizationDryRunResult> = {}): OptimizationDryRunResult {
  return {
    employeeId: 'emp-1',
    employeeFirstName: 'Rick',
    date: '2026-07-14',
    stopCount: 6,
    totalDriveTimeMinutes: 40,
    previousTotalDriveTimeMinutes: 55,
    jobIds: ['job-1', 'job-2'],
    ...overrides,
  };
}

describe('buildOptimizationCandidate (43_AI_Agents.md §11)', () => {
  it('genereert een kandidaat bij een betekenisvolle besparing', () => {
    const candidate = buildOptimizationCandidate(result());
    expect(candidate).not.toBeNull();
    expect(candidate!.expectedGain).toContain('15 minuten');
    expect(candidate!.payload).toEqual({
      type: 'route_optimize',
      employeeId: 'emp-1',
      date: '2026-07-14',
    });
  });

  it('genereert niets zonder bestaande route om mee te vergelijken (eerste keer plannen)', () => {
    expect(buildOptimizationCandidate(result({ previousTotalDriveTimeMinutes: null }))).toBeNull();
  });

  it('genereert niets bij minder dan 1 stop-verschil om te herschikken', () => {
    expect(buildOptimizationCandidate(result({ stopCount: 1 }))).toBeNull();
  });

  it('genereert niets bij een verwaarloosbare besparing', () => {
    expect(
      buildOptimizationCandidate(
        result({ totalDriveTimeMinutes: 54, previousTotalDriveTimeMinutes: 55 }),
      ),
    ).toBeNull();
  });

  it('genereert niets als de "besparing" negatief is (nieuwe volgorde is trager)', () => {
    expect(
      buildOptimizationCandidate(
        result({ totalDriveTimeMinutes: 60, previousTotalDriveTimeMinutes: 55 }),
      ),
    ).toBeNull();
  });

  it('vult BR-200/BR-202 als toegepaste business rules', () => {
    const candidate = buildOptimizationCandidate(result())!;
    expect(candidate.businessRules.map((r) => r.code)).toEqual(['BR-200', 'BR-202']);
  });
});
