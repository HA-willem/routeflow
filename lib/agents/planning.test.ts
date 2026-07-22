import { describe, expect, it } from 'vitest';

import { summarizePlanningRun } from './planning';

describe('summarizePlanningRun (43_AI_Agents.md § 4, Planning Agent)', () => {
  it('geeft null wanneer er niets nieuws gegenereerd is', () => {
    const result = summarizePlanningRun({
      fromDate: '2026-07-16',
      weeks: 12,
      agreementResults: [],
      skippedCount: 0,
    });
    expect(result).toBeNull();
  });

  it('geeft null wanneer alle dienstafspraken 0 nieuwe datums opleverden', () => {
    const result = summarizePlanningRun({
      fromDate: '2026-07-16',
      weeks: 12,
      agreementResults: [
        { serviceAgreementId: 'a1', datesGenerated: 0, clustered: false },
        { serviceAgreementId: 'a2', datesGenerated: 0, clustered: false },
      ],
      skippedCount: 0,
    });
    expect(result).toBeNull();
  });

  it('vat het aantal gegenereerde beurten en dienstafspraken samen', () => {
    const result = summarizePlanningRun({
      fromDate: '2026-07-16',
      weeks: 12,
      agreementResults: [
        { serviceAgreementId: 'a1', datesGenerated: 3, clustered: false },
        { serviceAgreementId: 'a2', datesGenerated: 5, clustered: false },
      ],
      skippedCount: 1,
    });
    expect(result).not.toBeNull();
    expect(result!.title).toContain('8');
    expect(result!.summary).toContain('2 dienstafspraken');
    expect(result!.impact).toContain('1 overgeslagen');
    expect(result!.severity).toBe('info');
    expect(result!.payload).toBeNull();
  });

  it('gebruikt enkelvoud bij precies 1 beurt/dienstafspraak', () => {
    const result = summarizePlanningRun({
      fromDate: '2026-07-16',
      weeks: 12,
      agreementResults: [{ serviceAgreementId: 'a1', datesGenerated: 1, clustered: false }],
      skippedCount: 0,
    });
    expect(result!.title).toBe('1 nieuwe beurt voorgesteld');
    expect(result!.summary).toContain('1 dienstafspraak ');
    expect(result!.impact).toBe('1 beurt, 1 dienstafspraak');
  });

  it('vult het volledige BR-703-explainability-schema in', () => {
    const result = summarizePlanningRun({
      fromDate: '2026-07-16',
      weeks: 12,
      agreementResults: [{ serviceAgreementId: 'a1', datesGenerated: 4, clustered: false }],
      skippedCount: 0,
    });
    expect(result!.reasoning).not.toBe('');
    expect(result!.dataSources.length).toBeGreaterThan(0);
    expect(result!.businessRules.length).toBeGreaterThan(0);
    expect(result!.alternatives).not.toBe('');
    expect(result!.impactedJobIds).toEqual([]);
    expect(result!.impactedEmployeeIds).toEqual([]);
  });

  it('vermeldt geografische clustering (FR-025/BR-204) alleen als er geclusterd is', () => {
    const withoutClustering = summarizePlanningRun({
      fromDate: '2026-07-16',
      weeks: 12,
      agreementResults: [{ serviceAgreementId: 'a1', datesGenerated: 3, clustered: false }],
      skippedCount: 0,
    });
    expect(withoutClustering!.summary).not.toContain('buurtgenoten');

    const withClustering = summarizePlanningRun({
      fromDate: '2026-07-16',
      weeks: 12,
      agreementResults: [
        { serviceAgreementId: 'a1', datesGenerated: 3, clustered: true },
        { serviceAgreementId: 'a2', datesGenerated: 2, clustered: false },
      ],
      skippedCount: 0,
    });
    expect(withClustering!.summary).toContain(
      '1 dienstafspraak dichter bij bestaande buurtgenoten',
    );
    expect(withClustering!.businessRules.map((b) => b.code)).toContain('BR-204');
  });
});
