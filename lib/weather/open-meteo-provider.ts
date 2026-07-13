import type { LatLng, WeatherHourForecast, WeatherProvider } from './types.ts';

/**
 * Open-Meteo-implementatie van WeatherProvider (15_AIPlanner.md §6.1, ADR-007).
 * Open-Meteo vereist geen API-key (gratis, geen auth) — I/O via `fetch`,
 * werkt zowel onder Deno (Edge Functions) als Node, analoog aan
 * lib/routing/mapbox-provider.ts.
 *
 * AP-04 (15_AIPlanner.md §11, "weer-API onbereikbaar"): deze klasse gooit
 * gewoon door bij een fout — de aanroeper (agent-weather) vangt dat af en
 * degradeert (ADR-012 §4), net als route-optimize/matrix.ts dat voor Mapbox
 * doen.
 */

const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
const WORK_WINDOW_START_HOUR = 8;
const WORK_WINDOW_END_HOUR = 17;

/** Windsnelheid (km/h, Open-Meteo-default) → Beaufort, standaard schaalgrenzen. */
const BEAUFORT_UPPER_BOUNDS_KMH = [1, 5, 11, 19, 28, 38, 49, 61, 74, 88, 102, 117];

function kmhToBeaufort(kmh: number): number {
  for (let bft = 0; bft < BEAUFORT_UPPER_BOUNDS_KMH.length; bft += 1) {
    if (kmh <= BEAUFORT_UPPER_BOUNDS_KMH[bft]!) return bft;
  }
  return 12;
}

interface OpenMeteoHourlyResponse {
  hourly: {
    time: string[];
    precipitation_probability: number[];
    precipitation: number[];
    temperature_2m: number[];
    wind_speed_10m: number[];
  };
}

export class OpenMeteoProvider implements WeatherProvider {
  async getHourlyForecast(location: LatLng, date: string): Promise<WeatherHourForecast[]> {
    const url = new URL(FORECAST_URL);
    url.searchParams.set('latitude', location.lat.toString());
    url.searchParams.set('longitude', location.lng.toString());
    url.searchParams.set(
      'hourly',
      'precipitation_probability,precipitation,temperature_2m,wind_speed_10m',
    );
    url.searchParams.set('timezone', 'Europe/Amsterdam');
    url.searchParams.set('start_date', date);
    url.searchParams.set('end_date', date);

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`Open-Meteo-fout: HTTP ${response.status}`);
    }

    const body = (await response.json()) as OpenMeteoHourlyResponse;
    const hours: WeatherHourForecast[] = [];

    for (let i = 0; i < body.hourly.time.length; i += 1) {
      const hour = Number(body.hourly.time[i]!.slice(11, 13));
      if (hour < WORK_WINDOW_START_HOUR || hour > WORK_WINDOW_END_HOUR) continue;

      hours.push({
        hour,
        precipitationProbabilityPercent: body.hourly.precipitation_probability[i] ?? 0,
        precipitationMm: body.hourly.precipitation[i] ?? 0,
        temperatureCelsius: body.hourly.temperature_2m[i] ?? 0,
        windBft: kmhToBeaufort(body.hourly.wind_speed_10m[i] ?? 0),
      });
    }

    return hours;
  }
}
