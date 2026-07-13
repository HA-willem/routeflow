import type { LatLng, WeatherHourForecast } from './types.ts';

/**
 * Weerdata-cache-hulpfuncties (11_DatabaseConcept.md §3.9,
 * `weerdata_cache`-schema) — Sprint 7 schrijft de dagaggregaten weg naar de
 * al-gespecificeerde tabel (ADR-012 §3: "geen agent bouwt een eigen,
 * parallelle cache-laag"). Zuiver, geen I/O.
 */

/** Geo-cache-sleutel, ~1,1 km precisie (2 decimalen) — genoeg voor een depotlocatie. */
export function buildAreaKey(location: LatLng): string {
  return `${location.lat.toFixed(2)},${location.lng.toFixed(2)}`;
}

export interface DailyWeatherAggregate {
  precipitationProbabilityPercent: number;
  precipitationMmPerHour: number;
  minTempCelsius: number;
  maxWindBft: number;
}

/**
 * Verdicht het werkvenster-uurbeeld tot het `weerdata_cache`-dagformaat
 * (max. neerslagkans, max. mm/u, min. temp, max. windkracht) — het schema is
 * al vastgesteld (11 §3.9) vóórdat dit sprint bestond; deze functie
 * respecteert dat, in plaats van een rijkere, eigen tabel te introduceren.
 */
export function aggregateDailyWeather(hours: WeatherHourForecast[]): DailyWeatherAggregate | null {
  if (hours.length === 0) return null;
  return {
    precipitationProbabilityPercent: Math.max(
      ...hours.map((hour) => hour.precipitationProbabilityPercent),
    ),
    precipitationMmPerHour: Math.max(...hours.map((hour) => hour.precipitationMm)),
    minTempCelsius: Math.min(...hours.map((hour) => hour.temperatureCelsius)),
    maxWindBft: Math.max(...hours.map((hour) => hour.windBft)),
  };
}
