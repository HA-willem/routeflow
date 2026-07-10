/**
 * Routing-engine types & provider-contract (14_RoutingEngine.md § 2, ADR-007).
 * Zuivere types zonder I/O zodat ze zowel door de Next.js-app als door Deno
 * Edge Functions geïmporteerd kunnen worden (41_CodingStandards.md § 12),
 * analoog aan lib/planning/horizon.ts.
 */

export interface LatLng {
  lat: number;
  lng: number;
}

export interface GeocodeResult {
  status: 'ok' | 'ambiguous' | 'not_found';
  location?: LatLng;
  confidence?: number;
  matchedAddress?: string;
}

export interface DistanceMatrixResult {
  /** [i][j] reistijd in seconden. */
  durations: number[][];
  /** [i][j] afstand in meters. */
  distances: number[][];
}

export interface DirectionsResult {
  geometry: unknown;
  totalDurationSec: number;
  totalDistanceM: number;
}

/** Provider-adapter (14 § 2) — implementaties: MapboxProvider (MVP/V1), OsrmProvider (V2). */
export interface RoutingProvider {
  geocode(input: {
    postalCode: string;
    houseNumber: string;
    countryCode: string;
  }): Promise<GeocodeResult>;
  distanceMatrix(points: LatLng[], profile: 'driving'): Promise<DistanceMatrixResult>;
  directions(orderedPoints: LatLng[]): Promise<DirectionsResult>;
}

/** Eén te bezoeken stop (Beurt) — input voor de dag-laag-optimalisatie (§ 4.2). */
export interface RouteStopInput {
  jobId: string;
  location: LatLng;
  /** Dienstduur in minuten (som bij gecombineerde stop, E-02/BR-801). */
  serviceDurationMinutes: number;
  preferredDaypart?: 'morning' | 'afternoon';
  callAheadRequired?: boolean;
  /** BR-200: vergrendelde stop mag positie niet wijzigen. */
  locked?: boolean;
}

/** Output per stop (14 § 4.4). */
export interface RouteStopOutput {
  jobId: string;
  sequence: number;
  arrivalTime: string;
  serviceStart: string;
  serviceEnd: string;
  driveTimeFromPrevSec: number;
  distanceFromPrevM: number;
}

export interface OptimizeResult {
  stops: RouteStopOutput[];
  /** Stops die niet binnen de werkdag pasten (RE-03). */
  unplaceableJobIds: string[];
  totalDriveTimeSec: number;
  totalDistanceM: number;
  totalWorkTimeSec: number;
  /** 0-100, 100 = geen straf/minimale reistijd (§ 5.3). */
  optimizationScore: number;
}

export interface OptimizeParams {
  stops: RouteStopInput[];
  /** Index 0 = startlocatie (bedrijfsadres), matcht de puntenvolgorde van de matrix. */
  matrix: DistanceMatrixResult;
  /** ISO-datum, gebruikt om absolute tijden te construeren. */
  routeDate: string;
  /** Default 08:00. */
  workdayStartHHmm?: string;
  /** BR-202: default 8,5u = 510 minuten. */
  maxWorkdayMinutes?: number;
  /** Default 30 min rond 12:00. */
  breakMinutes?: number;
  breakAroundHHmm?: string;
}
