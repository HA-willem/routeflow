import type {
  DirectionsResult,
  DistanceMatrixResult,
  GeocodeResult,
  LatLng,
  RoutingProvider,
} from './types.ts';

/**
 * Mapbox-implementatie van RoutingProvider (14_RoutingEngine.md § 1.3/§ 2,
 * ADR-005, A-06). I/O via `fetch` — werkt zowel onder Deno (Edge Functions)
 * als Node, geen platformspecifieke API's, conform ADR-007
 * (provider-adapter-pattern: domeinlogica praat alleen tegen `RoutingProvider`).
 *
 * RE-08 (rate limit, HTTP 429): exponential backoff, max 3 pogingen, daarna
 * gooit deze functie — de aanroeper (matrix.ts) vangt dat af met de
 * RE-06-Haversine-fallback.
 */

const GEOCODE_URL = 'https://api.mapbox.com/search/geocode/v6/forward';
const MATRIX_URL = 'https://api.mapbox.com/directions-matrix/v1/mapbox/driving';
const DIRECTIONS_URL = 'https://api.mapbox.com/directions/v5/mapbox/driving';
const MAX_RETRIES = 3;

async function fetchWithBackoff(url: string): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt += 1) {
    const response = await fetch(url);
    if (response.status !== 429) return response;
    lastError = new Error(`Mapbox rate limit (429) na ${attempt + 1} pogingen`);
    await new Promise((resolve) => setTimeout(resolve, 2 ** attempt * 300));
  }
  throw lastError ?? new Error('Mapbox rate limit: max pogingen bereikt');
}

export class MapboxProvider implements RoutingProvider {
  constructor(private readonly accessToken: string) {}

  async geocode(input: {
    postalCode: string;
    houseNumber: string;
    countryCode: string;
  }): Promise<GeocodeResult> {
    const query = `${input.postalCode} ${input.houseNumber}`;
    const url = new URL(GEOCODE_URL);
    url.searchParams.set('q', query);
    url.searchParams.set('country', input.countryCode.toLowerCase());
    url.searchParams.set('limit', '2');
    url.searchParams.set('access_token', this.accessToken);

    const response = await fetchWithBackoff(url.toString());
    if (!response.ok) {
      throw new Error(`Mapbox geocode-fout: HTTP ${response.status}`);
    }
    const body = (await response.json()) as {
      features: Array<{
        geometry: { coordinates: [number, number] };
        properties: { full_address?: string; match_code?: { confidence?: string } };
      }>;
    };

    if (body.features.length === 0) {
      return { status: 'not_found' };
    }

    const [feature] = body.features;
    const [lng, lat] = feature!.geometry.coordinates;
    const confidence = feature!.properties.match_code?.confidence === 'exact' ? 1 : 0.6;

    return {
      status: body.features.length > 1 ? 'ambiguous' : 'ok',
      location: { lat, lng },
      confidence,
      matchedAddress: feature!.properties.full_address,
    };
  }

  async distanceMatrix(points: LatLng[], profile: 'driving'): Promise<DistanceMatrixResult> {
    if (profile !== 'driving') {
      throw new Error(`Onbekend profiel: ${profile}`);
    }
    const coordinates = points.map((p) => `${p.lng},${p.lat}`).join(';');
    const url = new URL(`${MATRIX_URL}/${coordinates}`);
    url.searchParams.set('annotations', 'duration,distance');
    url.searchParams.set('access_token', this.accessToken);

    const response = await fetchWithBackoff(url.toString());
    if (!response.ok) {
      throw new Error(`Mapbox matrix-fout: HTTP ${response.status}`);
    }
    const body = (await response.json()) as { durations: number[][]; distances: number[][] };
    return { durations: body.durations, distances: body.distances };
  }

  async directions(orderedPoints: LatLng[]): Promise<DirectionsResult> {
    const coordinates = orderedPoints.map((p) => `${p.lng},${p.lat}`).join(';');
    const url = new URL(`${DIRECTIONS_URL}/${coordinates}`);
    url.searchParams.set('geometries', 'geojson');
    url.searchParams.set('access_token', this.accessToken);

    const response = await fetchWithBackoff(url.toString());
    if (!response.ok) {
      throw new Error(`Mapbox directions-fout: HTTP ${response.status}`);
    }
    const body = (await response.json()) as {
      routes: Array<{ geometry: unknown; duration: number; distance: number }>;
    };
    if (body.routes.length === 0) {
      throw new Error('Mapbox directions: geen route gevonden');
    }
    const [route] = body.routes;
    return {
      geometry: route!.geometry,
      totalDurationSec: route!.duration,
      totalDistanceM: route!.distance,
    };
  }
}
