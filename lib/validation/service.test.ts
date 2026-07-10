import { describe, expect, it } from 'vitest';

import { serviceSchema } from './service';

const valid = {
  name: 'Glasbewassing buiten',
  description: undefined,
  standardDurationMinutes: 45,
  standardPriceEuros: 50,
  vatRate: 9,
  isWeatherSensitive: true,
  weatherSensitivityType: 'rain' as const,
  icon: '🪟',
  colorHex: '#4285F4',
};

describe('serviceSchema (12_Entiteiten.md § 5)', () => {
  it('accepteert een volledig ingevulde, weersgevoelige dienst', () => {
    expect(serviceSchema.safeParse(valid).success).toBe(true);
  });

  it('accepteert een niet-weersgevoelige dienst zonder weerstype', () => {
    const result = serviceSchema.safeParse({
      ...valid,
      isWeatherSensitive: false,
      weatherSensitivityType: undefined,
    });
    expect(result.success).toBe(true);
  });

  it('weigert een weersgevoelige dienst zonder weerstype', () => {
    const result = serviceSchema.safeParse({ ...valid, weatherSensitivityType: undefined });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(['weatherSensitivityType']);
    }
  });

  it('weigert een lege naam', () => {
    expect(serviceSchema.safeParse({ ...valid, name: '  ' }).success).toBe(false);
  });

  it.each([14, 481])('weigert een duur van %i minuten (buiten 15-480)', (minutes) => {
    expect(serviceSchema.safeParse({ ...valid, standardDurationMinutes: minutes }).success).toBe(
      false,
    );
  });

  it('weigert een negatieve prijs', () => {
    expect(serviceSchema.safeParse({ ...valid, standardPriceEuros: -1 }).success).toBe(false);
  });

  it.each([1, 6, 20, 22])('weigert een ongeldig BTW-tarief van %i%%', (vatRate) => {
    expect(serviceSchema.safeParse({ ...valid, vatRate }).success).toBe(false);
  });

  it.each([0, 9, 21])('accepteert BTW-tarief %i%%', (vatRate) => {
    expect(serviceSchema.safeParse({ ...valid, vatRate }).success).toBe(true);
  });

  it('weigert een ongeldige kleurcode', () => {
    expect(serviceSchema.safeParse({ ...valid, colorHex: 'blauw' }).success).toBe(false);
  });
});
