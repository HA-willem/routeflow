import { describe, expect, it } from 'vitest';

import { calculateIdealDate, generateHorizonDates, type HorizonAgreement } from './horizon';

function agreement(overrides: Partial<HorizonAgreement> = {}): HorizonAgreement {
  return {
    frequencyType: 'weekly',
    frequencyIntervalDays: 7,
    preferredDay: null,
    excludeDates: [],
    ...overrides,
  };
}

describe('calculateIdealDate (BR-001)', () => {
  it('gebruikt de datum van de laatste uitgevoerde beurt, niet de geplande datum', () => {
    // 10_BusinessRules.md § BR-001-voorbeeld: "elke 4 weken", uitgevoerd wo 26/6
    // → ideale datum beurt #2 = 26/6 + 28 dagen = do 24/7 (niet 24/6 + 28 = 22/7).
    const result = calculateIdealDate(
      agreement({ frequencyType: 'custom', frequencyIntervalDays: 28 }),
      '2026-06-26',
      '2026-06-24',
    );
    expect(result).toBe('2026-07-24');
  });

  it('weekly: +7 dagen na de laatste uitgevoerde beurt', () => {
    const result = calculateIdealDate(
      agreement({ frequencyType: 'weekly' }),
      '2026-06-01',
      '2026-06-01',
    );
    expect(result).toBe('2026-06-08');
  });

  it('biweekly: +14 dagen na de laatste uitgevoerde beurt', () => {
    const result = calculateIdealDate(
      agreement({ frequencyType: 'biweekly', frequencyIntervalDays: 14 }),
      '2026-06-01',
      '2026-06-01',
    );
    expect(result).toBe('2026-06-15');
  });

  it('gooit een fout als custom geen interval heeft (zou al door de DB-CHECK geweigerd zijn)', () => {
    expect(() =>
      calculateIdealDate(
        agreement({ frequencyType: 'custom', frequencyIntervalDays: null }),
        '2026-06-01',
        '2026-06-01',
      ),
    ).toThrow();
  });

  describe('eerste beurt zonder voorgaande uitgevoerde beurt (PRD § 19 A-11)', () => {
    it('kiest de eerstvolgende voorkeursdag op-of-na de referentiedatum', () => {
      // 2026-06-01 is een maandag (weekday 0); voorkeursdag = woensdag (2).
      const result = calculateIdealDate(agreement({ preferredDay: 2 }), null, '2026-06-01');
      expect(result).toBe('2026-06-03');
    });

    it('valt terug op donderdag zonder ingestelde voorkeursdag', () => {
      const result = calculateIdealDate(agreement(), null, '2026-06-01');
      expect(result).toBe('2026-06-04');
    });
  });

  describe('BR-102: eenmalige beurten krijgen geen opvolger', () => {
    it('retourneert null als er al een uitgevoerde beurt is', () => {
      const result = calculateIdealDate(
        agreement({ frequencyType: 'once', frequencyIntervalDays: null }),
        '2026-06-01',
        '2026-06-01',
      );
      expect(result).toBeNull();
    });

    it('levert wel de eerste (enige) datum als er nog geen uitgevoerde beurt is', () => {
      const result = calculateIdealDate(
        agreement({ frequencyType: 'once', frequencyIntervalDays: null, preferredDay: 0 }),
        null,
        '2026-06-01',
      );
      expect(result).toBe('2026-06-01');
    });
  });

  describe('BR-103: maandpatronen', () => {
    it('quarterly: eerste donderdag van het volgende kwartaal na de laatste beurt', () => {
      // 10_BusinessRules.md § BR-103-voorbeeld: Q1=jan-mrt, Q2=apr-jun, Q3=jul-sep.
      // Laatste beurt in Q1 (feb) → volgende ideale datum = 1e donderdag van Q2 (april).
      const result = calculateIdealDate(
        agreement({ frequencyType: 'quarterly', frequencyIntervalDays: null }),
        '2026-02-10',
        '2026-02-10',
      );
      expect(result).toBe('2026-04-02'); // 2 april 2026 is een donderdag.
    });

    it('quarterly: eerste beurt = eerste donderdag van het huidige kwartaal', () => {
      const result = calculateIdealDate(
        agreement({ frequencyType: 'quarterly', frequencyIntervalDays: null }),
        null,
        '2026-02-10',
      );
      // Kwartaalstart (januari) ligt vóór de referentiedatum; eerste donderdag van januari.
      expect(result).toBe('2026-01-01');
    });

    it('monthly: eerste voorkeursdag van de volgende maand na de laatste beurt', () => {
      const result = calculateIdealDate(
        agreement({ frequencyType: 'monthly', frequencyIntervalDays: null, preferredDay: 0 }),
        '2026-06-10',
        '2026-06-10',
      );
      expect(result).toBe('2026-07-06'); // 6 juli 2026 is een maandag.
    });

    it('yearly: eerste voorkeursdag van dezelfde maand, één jaar later', () => {
      const result = calculateIdealDate(
        agreement({ frequencyType: 'yearly', frequencyIntervalDays: null, preferredDay: 0 }),
        '2026-06-10',
        '2026-06-10',
      );
      expect(result).toBe('2027-06-07'); // 7 juni 2027 is een maandag.
    });
  });
});

describe('generateHorizonDates (FR-020)', () => {
  it('genereert wekelijkse beurten tot 12 weken vooruit', () => {
    const dates = generateHorizonDates({
      agreement: agreement({ preferredDay: 0 }),
      lastCompletedDate: null,
      fromDate: '2026-06-01', // maandag
      weeks: 12,
    });
    expect(dates).toHaveLength(13);
    expect(dates[0]).toBe('2026-06-01');
    expect(dates.at(-1)).toBe('2026-08-24');
  });

  it('BR-102: once levert nooit meer dan één voorgestelde datum', () => {
    const dates = generateHorizonDates({
      agreement: agreement({ frequencyType: 'once', frequencyIntervalDays: null, preferredDay: 0 }),
      lastCompletedDate: null,
      fromDate: '2026-06-01',
      weeks: 12,
    });
    expect(dates).toEqual(['2026-06-01']);
  });

  it('slaat uitgesloten datums over zonder de reeks daarna te verschuiven', () => {
    const dates = generateHorizonDates({
      agreement: agreement({ preferredDay: 0, excludeDates: ['2026-06-08'] }),
      lastCompletedDate: null,
      fromDate: '2026-06-01',
      weeks: 3,
    });
    expect(dates).toEqual(['2026-06-01', '2026-06-15', '2026-06-22']);
  });

  it('stopt bij de horizon-grens', () => {
    const dates = generateHorizonDates({
      agreement: agreement({ preferredDay: 0 }),
      lastCompletedDate: null,
      fromDate: '2026-06-01',
      weeks: 2,
    });
    expect(dates).toEqual(['2026-06-01', '2026-06-08', '2026-06-15']);
  });
});
