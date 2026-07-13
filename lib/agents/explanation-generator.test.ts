import { describe, expect, it } from 'vitest';

import { validateExplanation } from './explanation-generator';

import type { PipelineCandidate } from './types';

function candidate(overrides: Partial<PipelineCandidate> = {}): PipelineCandidate {
  return {
    agent: 'capacity',
    scheduledDate: '2026-07-14',
    title: 'Capaciteitstekort',
    summary: 'Samenvatting',
    reasoning: 'Reden',
    dataSources: ['Bron A'],
    businessRules: [{ code: 'BR-202', label: 'Werkdaglimiet' }],
    confidence: 0.8,
    impact: 'Impact',
    expectedGain: 'Winst',
    alternatives: 'Alternatief overwogen',
    severity: 'attention',
    impactedJobIds: [],
    impactedEmployeeIds: [],
    payload: null,
    ...overrides,
  };
}

describe('validateExplanation (ADR-012 §4/§6, BR-703)', () => {
  it('accepteert een volledig ingevulde kandidaat', () => {
    expect(validateExplanation(candidate())).toEqual({ valid: true, missingFields: [] });
  });

  it('verwerpt een kandidaat met een leeg reasoning-veld', () => {
    const result = validateExplanation(candidate({ reasoning: '' }));
    expect(result.valid).toBe(false);
    expect(result.missingFields).toContain('reasoning');
  });

  it('verwerpt een kandidaat zonder dataSources of businessRules', () => {
    const result = validateExplanation(candidate({ dataSources: [], businessRules: [] }));
    expect(result.missingFields).toEqual(expect.arrayContaining(['dataSources', 'businessRules']));
  });

  it('verzamelt alle ontbrekende velden tegelijk (geen "best effort"-doorlaat, ADR-012 §4)', () => {
    const result = validateExplanation(
      candidate({ reasoning: '  ', impact: '', expectedGain: '', alternatives: '' }),
    );
    expect(result.valid).toBe(false);
    expect(result.missingFields).toEqual(
      expect.arrayContaining(['reasoning', 'impact', 'expectedGain', 'alternatives']),
    );
  });
});
