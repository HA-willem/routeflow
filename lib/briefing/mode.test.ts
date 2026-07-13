import { describe, expect, it } from 'vitest';

import { deriveConfidence, deriveMorningMode } from './mode';

import type { AgentProposal, BriefingWarning } from './types';

function proposal(overrides: Partial<AgentProposal> = {}): AgentProposal {
  return {
    id: 'p1',
    agent: 'optimization',
    title: 'Test',
    summary: '',
    reasoning: '',
    dataSources: [],
    businessRules: [],
    confidence: 0.9,
    impact: '',
    expectedGain: '',
    alternatives: '',
    severity: 'info',
    ...overrides,
  };
}

function warning(overrides: Partial<BriefingWarning> = {}): BriefingWarning {
  return {
    id: 'w1',
    severity: 'info',
    text: '',
    href: '/',
    hrefLabel: '',
    ...overrides,
  };
}

describe('deriveMorningMode (44_MorningBriefing_UX.md § 6)', () => {
  it('geeft 🟢 green zonder voorstellen en zonder waarschuwingen boven informatief', () => {
    expect(deriveMorningMode([], [])).toBe('green');
    expect(deriveMorningMode([], [warning({ severity: 'info' })])).toBe('green');
  });

  it('geeft 🟡 yellow zodra er íets op beoordeling wacht', () => {
    expect(deriveMorningMode([proposal()], [])).toBe('yellow');
    expect(deriveMorningMode([], [warning({ severity: 'attention' })])).toBe('yellow');
  });

  it('geeft 🔴 red bij een urgent voorstel of urgente waarschuwing', () => {
    expect(deriveMorningMode([proposal({ severity: 'urgent' })], [])).toBe('red');
    expect(deriveMorningMode([], [warning({ severity: 'urgent' })])).toBe('red');
  });
});

describe('deriveConfidence (44 § 3.4, ADR-012 § 3)', () => {
  it('is hoog (score 1) zonder voorstellen — er is niets onzeker', () => {
    expect(deriveConfidence([])).toEqual({ level: 'high', score: 1 });
  });

  it('middelt de voorstel-confidences en vertaalt naar een niveau', () => {
    expect(deriveConfidence([proposal({ confidence: 0.9 })]).level).toBe('high');
    expect(deriveConfidence([proposal({ confidence: 0.65 })]).level).toBe('medium');
    expect(deriveConfidence([proposal({ confidence: 0.4 })]).level).toBe('low');
    expect(
      deriveConfidence([proposal({ confidence: 0.6 }), proposal({ confidence: 1 })]).score,
    ).toBeCloseTo(0.8);
  });
});
