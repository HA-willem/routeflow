import { describe, expect, it } from 'vitest';

import { summarizeDraftInvoices } from './invoice';

describe('summarizeDraftInvoices (43_AI_Agents.md § 8, Invoice Agent)', () => {
  it('geeft null zonder openstaande conceptfacturen', () => {
    const result = summarizeDraftInvoices({ drafts: [], today: '2026-07-16' });
    expect(result).toBeNull();
  });

  it('vat aantal en totaalbedrag samen, severity "attention" bij een recent concept', () => {
    const result = summarizeDraftInvoices({
      drafts: [
        { invoiceDate: '2026-07-15', totalAmountCents: 12100 },
        { invoiceDate: '2026-07-16', totalAmountCents: 6050 },
      ],
      today: '2026-07-16',
    });
    expect(result).not.toBeNull();
    expect(result!.title).toBe('2 conceptfacturen klaar om te versturen');
    expect(result!.summary).toContain('€181.50');
    expect(result!.severity).toBe('attention');
    expect(result!.payload).toBeNull();
  });

  it('gebruikt enkelvoud bij precies 1 conceptfactuur', () => {
    const result = summarizeDraftInvoices({
      drafts: [{ invoiceDate: '2026-07-16', totalAmountCents: 5000 }],
      today: '2026-07-16',
    });
    expect(result!.title).toBe('1 conceptfactuur klaar om te versturen');
    expect(result!.summary).toContain('1 conceptfactuur staat');
  });

  it('severity wordt "urgent" zodra de oudste minstens 3 dagen open staat', () => {
    const justUnderThreshold = summarizeDraftInvoices({
      drafts: [{ invoiceDate: '2026-07-14', totalAmountCents: 5000 }],
      today: '2026-07-16', // 2 dagen oud
    });
    expect(justUnderThreshold!.severity).toBe('attention');

    const atThreshold = summarizeDraftInvoices({
      drafts: [{ invoiceDate: '2026-07-13', totalAmountCents: 5000 }],
      today: '2026-07-16', // 3 dagen oud
    });
    expect(atThreshold!.severity).toBe('urgent');
    expect(atThreshold!.summary).toContain('3 dagen open');
  });

  it('gebruikt de oudste van meerdere concepten voor de severity-bepaling', () => {
    const result = summarizeDraftInvoices({
      drafts: [
        { invoiceDate: '2026-07-16', totalAmountCents: 5000 }, // vandaag
        { invoiceDate: '2026-07-10', totalAmountCents: 5000 }, // 6 dagen oud
      ],
      today: '2026-07-16',
    });
    expect(result!.severity).toBe('urgent');
  });

  it('vult het volledige BR-703-explainability-schema in', () => {
    const result = summarizeDraftInvoices({
      drafts: [{ invoiceDate: '2026-07-16', totalAmountCents: 5000 }],
      today: '2026-07-16',
    });
    expect(result!.reasoning).not.toBe('');
    expect(result!.dataSources.length).toBeGreaterThan(0);
    expect(result!.businessRules.length).toBeGreaterThan(0);
    expect(result!.alternatives).not.toBe('');
    expect(result!.impactedJobIds).toEqual([]);
    expect(result!.impactedEmployeeIds).toEqual([]);
  });
});
