import { describe, expect, it } from 'vitest';

import { objectSchema } from './object';

const valid = {
  addressLine1: 'Kerkstraat 42',
  postalCode: '1234 AB',
  city: 'Amsterdam',
  countryCode: 'NL' as const,
  type: 'commercial' as const,
  accessNotes: 'Bel aan voorkant; sleutel onder mat',
};

describe('objectSchema (FR-002/FR-003)', () => {
  it('accepteert een volledig ingevuld object', () => {
    expect(objectSchema.safeParse(valid).success).toBe(true);
  });

  it('accepteert een object zonder toegangsinstructies', () => {
    expect(objectSchema.safeParse({ ...valid, accessNotes: undefined }).success).toBe(true);
  });

  it('weigert een leeg adres', () => {
    expect(objectSchema.safeParse({ ...valid, addressLine1: '  ' }).success).toBe(false);
  });

  it('weigert een lege plaats', () => {
    expect(objectSchema.safeParse({ ...valid, city: '' }).success).toBe(false);
  });

  describe('postcode-validatie (12_Entiteiten.md § 4: ^[1-9][0-9]{3}\\s?[A-Z]{2}$)', () => {
    it.each(['1234 AB', '1234AB', '9999 ZZ'])('accepteert %s', (postalCode) => {
      expect(objectSchema.safeParse({ ...valid, postalCode }).success).toBe(true);
    });

    it('normaliseert kleine letters naar hoofdletters', () => {
      const result = objectSchema.safeParse({ ...valid, postalCode: '1234 ab' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.postalCode).toBe('1234 AB');
      }
    });

    it.each(['0123 AB', 'AB12CD', '123 AB', '1234 A', '12345'])('weigert %s', (postalCode) => {
      expect(objectSchema.safeParse({ ...valid, postalCode }).success).toBe(false);
    });
  });
});
