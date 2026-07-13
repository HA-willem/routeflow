import type { WeatherHourForecast } from './types.ts';

/**
 * Weer-drempellogica (15_AIPlanner.md §6.3 — enige bron van waarheid voor de
 * default-getallen, hier alleen toegepast, niet gedupliceerd). Zuiver, geen
 * I/O (41_CodingStandards.md §12).
 */

export interface WeatherThresholds {
  rainProbabilityPercent: number;
  rainMmPerHour: number;
  frostTempCelsius: number;
  windBft: number;
}

/** 15_AIPlanner.md §6.3: regen ≥70%/≥2mm/u, vorst <0°C, wind ≥8 Bft. */
export const DEFAULT_WEATHER_THRESHOLDS: WeatherThresholds = {
  rainProbabilityPercent: 70,
  rainMmPerHour: 2,
  frostTempCelsius: 0,
  windBft: 8,
};

export type WeatherRiskType = 'rain' | 'frost' | 'wind';

export interface WeatherRiskHour {
  hour: number;
  risks: WeatherRiskType[];
}

export function detectWeatherRisks(
  hours: WeatherHourForecast[],
  thresholds: WeatherThresholds = DEFAULT_WEATHER_THRESHOLDS,
): WeatherRiskHour[] {
  const result: WeatherRiskHour[] = [];

  for (const hour of hours) {
    const risks: WeatherRiskType[] = [];
    if (
      hour.precipitationProbabilityPercent >= thresholds.rainProbabilityPercent ||
      hour.precipitationMm >= thresholds.rainMmPerHour
    ) {
      risks.push('rain');
    }
    if (hour.temperatureCelsius < thresholds.frostTempCelsius) {
      risks.push('frost');
    }
    if (hour.windBft >= thresholds.windBft) {
      risks.push('wind');
    }
    if (risks.length > 0) {
      result.push({ hour: hour.hour, risks });
    }
  }

  return result;
}

/** Eerste uur met een risico van het gegeven type (of, zonder type, elk risico). */
export function firstRiskHour(riskHours: WeatherRiskHour[], type?: WeatherRiskType): number | null {
  const matches = type ? riskHours.filter((r) => r.risks.includes(type)) : riskHours;
  return matches.length > 0 ? matches[0]!.hour : null;
}
