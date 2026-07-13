import { describe, expect, it } from 'vitest';

import { detectConflicts } from './conflict-detector';

import type { RawCandidate } from './types';

function candidate(overrides: Partial<RawCandidate> = {}): RawCandidate {
  return {
    title: 'Test',
    summary: '',
    reasoning: '',
    dataSources: [],
    businessRules: [],
    confidence: 0.8,
    impact: '',
    expectedGain: '',
    alternatives: '',
    severity: 'info',
    impactedJobIds: [],
    impactedEmployeeIds: [],
    payload: null,
    ...overrides,
  };
}

const CONTEXT = {
  lockedJobIds: new Set(['job-locked']),
  companyJobIds: new Set(['job-a', 'job-b', 'job-locked']),
  companyEmployeeIds: new Set(['emp-1']),
};

describe('detectConflicts (ADR-012 §2, Conflict Detector)', () => {
  it('accepteert een geldige, niet-uitvoerbare kandidaat', () => {
    expect(detectConflicts(candidate({ impactedJobIds: ['job-a'] }), CONTEXT)).toEqual({
      valid: true,
    });
  });

  it('verwerpt confidence buiten [0,1] (ADR-012 §3)', () => {
    expect(detectConflicts(candidate({ confidence: 1.5 }), CONTEXT).valid).toBe(false);
    expect(detectConflicts(candidate({ confidence: -0.1 }), CONTEXT).valid).toBe(false);
  });

  it('verwerpt een job die niet tot het bedrijf behoort (tenant-defense)', () => {
    const result = detectConflicts(candidate({ impactedJobIds: ['job-vreemd'] }), CONTEXT);
    expect(result.valid).toBe(false);
  });

  it('verwerpt een medewerker die niet tot het bedrijf behoort', () => {
    const result = detectConflicts(candidate({ impactedEmployeeIds: ['emp-vreemd'] }), CONTEXT);
    expect(result.valid).toBe(false);
  });

  it('verwerpt BR-200: een uitvoerbaar voorstel dat een vergrendelde beurt raakt', () => {
    const result = detectConflicts(
      candidate({
        impactedJobIds: ['job-locked'],
        payload: { type: 'route_optimize', employeeId: 'emp-1', date: '2026-07-14' },
      }),
      CONTEXT,
    );
    expect(result.valid).toBe(false);
    expect(result.violatedRule?.code).toBe('BR-200');
  });

  it('staat een informatief voorstel (geen payload) toe ook al noemt het een vergrendelde beurt', () => {
    const result = detectConflicts(candidate({ impactedJobIds: ['job-locked'] }), CONTEXT);
    expect(result.valid).toBe(true);
  });
});
