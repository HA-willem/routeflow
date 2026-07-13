import { describe, expect, it } from 'vitest';

import { aggregateDailyWeather, buildAreaKey } from './cache';

import type { WeatherHourForecast } from './types';

describe('buildAreaKey', () => {
  it('rondt af tot 2 decimalen', () => {
    expect(buildAreaKey({ lat: 51.8425, lng: 5.8528 })).toBe('51.84,5.85');
  });

  it('geeft dezelfde sleutel voor bijna-identieke locaties (cache-hergebruik)', () => {
    expect(buildAreaKey({ lat: 51.84251, lng: 5.85281 })).toBe(
      buildAreaKey({ lat: 51.84249, lng: 5.85279 }),
    );
  });
});

describe('aggregateDailyWeather (11_DatabaseConcept.md §3.9-schema)', () => {
  it('geeft null zonder uren', () => {
    expect(aggregateDailyWeather([])).toBeNull();
  });

  it('neemt het maximum voor neerslag/wind en het minimum voor temperatuur', () => {
    const hours: WeatherHourForecast[] = [
      {
        hour: 8,
        precipitationProbabilityPercent: 10,
        precipitationMm: 0,
        temperatureCelsius: 12,
        windBft: 3,
      },
      {
        hour: 15,
        precipitationProbabilityPercent: 80,
        precipitationMm: 3,
        temperatureCelsius: 16,
        windBft: 5,
      },
      {
        hour: 9,
        precipitationProbabilityPercent: 20,
        precipitationMm: 0.5,
        temperatureCelsius: 8,
        windBft: 6,
      },
    ];
    expect(aggregateDailyWeather(hours)).toEqual({
      precipitationProbabilityPercent: 80,
      precipitationMmPerHour: 3,
      minTempCelsius: 8,
      maxWindBft: 6,
    });
  });
});
