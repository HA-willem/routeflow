import { describe, expect, it } from 'vitest';

import { customerSchema } from './customer';

const valid = {
  name: 'Bakkerij Jansen BV',
  type: 'business' as const,
  email: 'info@bakkerij-jansen.nl',
  phone: '020-1234567',
  whatsappNumber: '0612345678',
  whatsappOptIn: true,
  emailOptIn: true,
  billingPreference: 'email' as const,
  kvkNumber: '87654321',
  vatNumber: 'NL123456789B01',
  paymentTermsDays: 30,
  notes: 'Eigenaar zei: bel vooraf',
};

describe('customerSchema (FR-001)', () => {
  it('accepteert een volledig ingevulde zakelijke klant', () => {
    expect(customerSchema.safeParse(valid).success).toBe(true);
  });

  it('accepteert een particuliere klant zonder KVK-nummer', () => {
    const result = customerSchema.safeParse({
      ...valid,
      type: 'person',
      kvkNumber: undefined,
    });
    expect(result.success).toBe(true);
  });

  it('accepteert een klant zonder e-mail/mobiel (edge case FR-001)', () => {
    const result = customerSchema.safeParse({
      ...valid,
      type: 'person',
      kvkNumber: undefined,
      email: undefined,
      whatsappNumber: undefined,
    });
    expect(result.success).toBe(true);
  });

  it('weigert een lege naam', () => {
    expect(customerSchema.safeParse({ ...valid, name: '  ' }).success).toBe(false);
  });

  it('weigert een ongeldig e-mailadres', () => {
    expect(customerSchema.safeParse({ ...valid, email: 'niet-een-email' }).success).toBe(false);
  });

  it('weigert een zakelijke klant zonder KVK-nummer', () => {
    const result = customerSchema.safeParse({ ...valid, kvkNumber: undefined });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(['kvkNumber']);
    }
  });

  it('weigert een KVK-nummer dat niet uit 8 cijfers bestaat', () => {
    expect(customerSchema.safeParse({ ...valid, kvkNumber: '123' }).success).toBe(false);
  });

  describe('NL-mobiel nummer (whatsappNumber)', () => {
    it.each(['0612345678', '+31612345678', '06 12 34 56 78', '06-12-34-56-78'])(
      'accepteert %s',
      (whatsappNumber) => {
        expect(customerSchema.safeParse({ ...valid, whatsappNumber }).success).toBe(true);
      },
    );

    it.each(['0512345678', '12345678', '06123456', '+31512345678'])(
      'weigert %s',
      (whatsappNumber) => {
        expect(customerSchema.safeParse({ ...valid, whatsappNumber }).success).toBe(false);
      },
    );
  });

  it('weigert een betaaltermijn buiten 1-90 dagen', () => {
    expect(customerSchema.safeParse({ ...valid, paymentTermsDays: 0 }).success).toBe(false);
    expect(customerSchema.safeParse({ ...valid, paymentTermsDays: 91 }).success).toBe(false);
  });
});
