/**
 * Weather Agent-types & provider-contract (43_AI_Agents.md §6, ADR-007).
 * Zuivere types zonder I/O, dual-importeerbaar door Next.js en Deno Edge
 * Functions (41_CodingStandards.md §12), analoog aan lib/routing/types.ts.
 */

export interface LatLng {
  lat: number;
  lng: number;
}

/** Eén uur uit het werkvenster (08:00-17:00, 44_MorningBriefing_UX.md §7). */
export interface WeatherHourForecast {
  /** 0-23. */
  hour: number;
  precipitationProbabilityPercent: number;
  precipitationMm: number;
  temperatureCelsius: number;
  windBft: number;
}

/** Provider-adapter (ADR-007) — implementatie: OpenMeteoProvider (V1). */
export interface WeatherProvider {
  /** Uurlijkse forecast voor het werkvenster van `date`, op locatie `location`. */
  getHourlyForecast(location: LatLng, date: string): Promise<WeatherHourForecast[]>;
}
