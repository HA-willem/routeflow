import { describe, expect, it } from 'vitest';

import { decideApproval } from './approval-handler';

describe('decideApproval (ADR-012 §7, exacte beslisboom)', () => {
  it('vereist altijd goedkeuring op automatiseringsniveau "proposal", ongeacht confidence', () => {
    const result = decideApproval({
      actionType: 'route_optimize',
      automationLevel: 'proposal',
      confidence: 0.99,
    });
    expect(result.outcome).toBe('requires_approval');
  });

  it('voert automatisch uit bij semi_automatic + confidence boven de drempel', () => {
    const result = decideApproval({
      actionType: 'route_optimize',
      automationLevel: 'semi_automatic',
      confidence: 0.85,
    });
    expect(result.outcome).toBe('auto_execute');
  });

  it('downgradet naar voorstel als confidence onder de drempel zit, ook bij semi_automatic (niet-overrulebaar)', () => {
    const result = decideApproval({
      actionType: 'route_optimize',
      automationLevel: 'semi_automatic',
      confidence: 0.5,
    });
    expect(result.outcome).toBe('requires_approval');
  });

  it('respecteert een aangepaste confidence-drempel (bedrijf-instelbaar, default 0.7)', () => {
    const result = decideApproval({
      actionType: 'route_optimize',
      automationLevel: 'semi_automatic',
      confidence: 0.65,
      confidenceThreshold: 0.6,
    });
    expect(result.outcome).toBe('auto_execute');
  });

  it('vereist altijd goedkeuring voor een informatief voorstel zonder actionType, zelfs op volautomatisch (niets om uit te voeren)', () => {
    const result = decideApproval({
      actionType: null,
      automationLevel: 'fully_automatic',
      confidence: 0.99,
    });
    expect(result.outcome).toBe('requires_approval');
  });
});
