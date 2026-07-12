import { describe, expect, it } from 'vitest';

import { calculateVat, formatCents } from './money';

describe('calculateVat (16_Facturatie.md § 4)', () => {
  it('berekent 21% BTW en rondt af op hele centen', () => {
    expect(calculateVat(5000, 21)).toEqual({ vatAmountCents: 1050, totalAmountCents: 6050 });
  });

  it('berekent 9% BTW', () => {
    expect(calculateVat(1000, 9)).toEqual({ vatAmountCents: 90, totalAmountCents: 1090 });
  });

  it('behandelt 0%/verlegd (geen BTW)', () => {
    expect(calculateVat(1000, 0)).toEqual({ vatAmountCents: 0, totalAmountCents: 1000 });
  });

  it('rondt af naar boven bij .5 centen', () => {
    // 333 * 0.21 = 69.93 -> 70
    expect(calculateVat(333, 21).vatAmountCents).toBe(70);
  });
});

describe('formatCents', () => {
  it('formatteert centen als NL-euro-bedrag', () => {
    expect(formatCents(605000).replace(/\s/g, ' ')).toBe('€ 6.050,00');
  });

  it('formatteert nul correct', () => {
    expect(formatCents(0).replace(/\s/g, ' ')).toBe('€ 0,00');
  });
});
