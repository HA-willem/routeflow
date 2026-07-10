import { describe, expect, it } from 'vitest';

import {
  frequencyIntervalDays,
  pauseServiceAgreementSchema,
  serviceAgreementSchema,
} from './service-agreement';

const valid = {
  serviceId: 'uuid-service-1',
  frequencyType: 'weekly' as const,
  customIntervalDays: undefined,
  preferredDay: 2,
  preferredDaypart: 'morning' as const,
  flexibilityWindowDays: 3,
  callAheadRequired: false,
  pricingType: 'per_job' as const,
  amountEuros: 25,
  hourlyRateEuros: undefined,
  vatRate: 9,
};

describe('serviceAgreementSchema (FR-004)', () => {
  it('accepteert een volledige wekelijkse per-beurt-afspraak', () => {
    expect(serviceAgreementSchema.safeParse(valid).success).toBe(true);
  });

  it('accepteert een uurtarief-afspraak', () => {
    const result = serviceAgreementSchema.safeParse({
      ...valid,
      pricingType: 'hourly',
      amountEuros: undefined,
      hourlyRateEuros: 35,
    });
    expect(result.success).toBe(true);
  });

  it('weigert per_job zonder bedrag', () => {
    const result = serviceAgreementSchema.safeParse({ ...valid, amountEuros: undefined });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(['amountEuros']);
    }
  });

  it('weigert hourly zonder uurtarief', () => {
    const result = serviceAgreementSchema.safeParse({
      ...valid,
      pricingType: 'hourly',
      amountEuros: undefined,
      hourlyRateEuros: undefined,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(['hourlyRateEuros']);
    }
  });

  it('weigert custom-frequentie zonder interval', () => {
    const result = serviceAgreementSchema.safeParse({
      ...valid,
      frequencyType: 'custom',
      customIntervalDays: undefined,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(['customIntervalDays']);
    }
  });

  it('accepteert custom-frequentie met interval', () => {
    const result = serviceAgreementSchema.safeParse({
      ...valid,
      frequencyType: 'custom',
      customIntervalDays: 28,
    });
    expect(result.success).toBe(true);
  });

  it('weigert een flexibiliteitsvenster buiten 0-21 dagen', () => {
    expect(serviceAgreementSchema.safeParse({ ...valid, flexibilityWindowDays: 22 }).success).toBe(
      false,
    );
  });
});

describe('frequencyIntervalDays (BR-102/BR-103)', () => {
  it('geeft 7 voor weekly', () => {
    expect(frequencyIntervalDays('weekly', undefined)).toBe(7);
  });

  it('geeft 14 voor biweekly', () => {
    expect(frequencyIntervalDays('biweekly', undefined)).toBe(14);
  });

  it('geeft het opgegeven aantal dagen voor custom', () => {
    expect(frequencyIntervalDays('custom', 28)).toBe(28);
  });

  it('geeft null voor kalender-gebaseerde frequenties (BR-103: monthly/quarterly/yearly)', () => {
    expect(frequencyIntervalDays('monthly', undefined)).toBeNull();
    expect(frequencyIntervalDays('quarterly', undefined)).toBeNull();
    expect(frequencyIntervalDays('yearly', undefined)).toBeNull();
  });

  it('geeft null voor once (BR-102: geen opvolgingsbeurt)', () => {
    expect(frequencyIntervalDays('once', undefined)).toBeNull();
  });
});

describe('pauseServiceAgreementSchema (FR-005)', () => {
  it('accepteert vandaag als pauzeerdatum', () => {
    const today = new Date().toISOString().slice(0, 10);
    expect(pauseServiceAgreementSchema.safeParse({ pausedUntil: today }).success).toBe(true);
  });

  it('accepteert een datum in de toekomst', () => {
    const future = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    expect(pauseServiceAgreementSchema.safeParse({ pausedUntil: future }).success).toBe(true);
  });

  it('weigert een datum in het verleden', () => {
    const past = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const result = pauseServiceAgreementSchema.safeParse({ pausedUntil: past });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(['pausedUntil']);
    }
  });
});
