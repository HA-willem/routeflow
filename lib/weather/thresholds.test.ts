import { describe, expect, it } from 'vitest';

import { DEFAULT_WEATHER_THRESHOLDS, detectWeatherRisks, firstRiskHour } from './thresholds';

import type { WeatherRiskHour } from './thresholds';
import type { WeatherHourForecast } from './types';

function hour(overrides: Partial<WeatherHourForecast> = {}): WeatherHourForecast {
  return {
    hour: 10,
    precipitationProbabilityPercent: 10,
    precipitationMm: 0,
    temperatureCelsius: 15,
    windBft: 3,
    ...overrides,
  };
}

describe('detectWeatherRisks (15_AIPlanner.md §6.3, exacte drempels)', () => {
  it('signaleert geen risico onder alle drempels', () => {
    expect(detectWeatherRisks([hour()])).toEqual([]);
  });

  it('signaleert regen bij ≥70% neerslagkans', () => {
    const result = detectWeatherRisks([hour({ precipitationProbabilityPercent: 70 })]);
    expect(result).toEqual([{ hour: 10, risks: ['rain'] }]);
  });

  it('signaleert geen regen bij 69% (net onder de drempel)', () => {
    expect(detectWeatherRisks([hour({ precipitationProbabilityPercent: 69 })])).toEqual([]);
  });

  it('signaleert regen bij ≥2 mm/u ook als de kans laag is', () => {
    const result = detectWeatherRisks([
      hour({ precipitationProbabilityPercent: 20, precipitationMm: 2 }),
    ]);
    expect(result[0]!.risks).toContain('rain');
  });

  it('signaleert vorst strikt onder 0°C, niet bij exact 0°C', () => {
    expect(detectWeatherRisks([hour({ temperatureCelsius: -0.1 })])[0]!.risks).toContain('frost');
    expect(detectWeatherRisks([hour({ temperatureCelsius: 0 })])).toEqual([]);
  });

  it('signaleert wind bij ≥8 Bft', () => {
    expect(detectWeatherRisks([hour({ windBft: 8 })])[0]!.risks).toContain('wind');
    expect(detectWeatherRisks([hour({ windBft: 7 })])).toEqual([]);
  });

  it('kan meerdere risico-types in hetzelfde uur combineren', () => {
    const result = detectWeatherRisks([hour({ precipitationProbabilityPercent: 80, windBft: 9 })]);
    expect(result[0]!.risks).toEqual(expect.arrayContaining(['rain', 'wind']));
  });

  it('respecteert een aangepaste, bedrijf-instelbare drempel', () => {
    const result = detectWeatherRisks([hour({ windBft: 6 })], {
      ...DEFAULT_WEATHER_THRESHOLDS,
      windBft: 6,
    });
    expect(result[0]!.risks).toContain('wind');
  });
});

describe('firstRiskHour', () => {
  it('geeft null zonder risico-uren', () => {
    expect(firstRiskHour([])).toBeNull();
  });

  it('geeft het eerste uur van het gevraagde type', () => {
    const riskHours: WeatherRiskHour[] = [
      { hour: 13, risks: ['wind'] },
      { hour: 15, risks: ['rain'] },
    ];
    expect(firstRiskHour(riskHours, 'rain')).toBe(15);
    expect(firstRiskHour(riskHours, 'wind')).toBe(13);
    expect(firstRiskHour(riskHours)).toBe(13);
  });
});
