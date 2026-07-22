import { describe, expect, it } from 'vitest';

import { manualJobSchema } from './manual-job';

const withExistingAgreement = {
  objectId: 'uuid-object-1',
  serviceAgreementId: 'uuid-agreement-1',
  newService: null,
  employeeId: 'uuid-employee-1',
  scheduledDate: '2026-07-21',
  scheduledTime: '14:00',
  note: 'Klant alleen dinsdag 14:00 bereikbaar',
};

const withNewService = {
  objectId: 'uuid-object-1',
  serviceAgreementId: null,
  newService: {
    serviceId: 'uuid-service-1',
    pricingType: 'per_job' as const,
    amountEuros: 45,
    hourlyRateEuros: undefined,
    vatRate: 21,
  },
  employeeId: 'uuid-employee-1',
  scheduledDate: '2026-07-21',
  scheduledTime: '09:30',
  note: 'Eenmalige spoedklus',
};

describe('manualJobSchema (FR-029)', () => {
  it('accepteert een beurt op een bestaande dienstafspraak', () => {
    expect(manualJobSchema.safeParse(withExistingAgreement).success).toBe(true);
  });

  it('accepteert een beurt met inline nieuwe eenmalige dienstafspraak', () => {
    expect(manualJobSchema.safeParse(withNewService).success).toBe(true);
  });

  it('weigert wanneer zowel serviceAgreementId als newService ontbreken', () => {
    const result = manualJobSchema.safeParse({
      ...withExistingAgreement,
      serviceAgreementId: null,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(['serviceAgreementId']);
    }
  });

  it('weigert wanneer zowel serviceAgreementId als newService gezet zijn', () => {
    const result = manualJobSchema.safeParse({
      ...withExistingAgreement,
      newService: withNewService.newService,
    });
    expect(result.success).toBe(false);
  });

  it('weigert een ongeldig tijdstip', () => {
    const result = manualJobSchema.safeParse({ ...withExistingAgreement, scheduledTime: '25:00' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(['scheduledTime']);
    }
  });

  it('weigert een lege toelichting', () => {
    const result = manualJobSchema.safeParse({ ...withExistingAgreement, note: '  ' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(['note']);
    }
  });

  it('weigert nieuwe dienst per_job zonder bedrag', () => {
    const result = manualJobSchema.safeParse({
      ...withNewService,
      newService: { ...withNewService.newService, amountEuros: undefined },
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(['newService', 'amountEuros']);
    }
  });

  it('weigert nieuwe dienst hourly zonder uurtarief', () => {
    const result = manualJobSchema.safeParse({
      ...withNewService,
      newService: {
        ...withNewService.newService,
        pricingType: 'hourly' as const,
        amountEuros: undefined,
        hourlyRateEuros: undefined,
      },
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(['newService', 'hourlyRateEuros']);
    }
  });
});
