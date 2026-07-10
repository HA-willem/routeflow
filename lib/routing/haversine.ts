import type { LatLng } from './types.ts';

/**
 * RE-06-fallback (14_RoutingEngine.md § 8): hemelsbrede afstand × wegfactor
 * 1,3 als schatting wanneer Mapbox tijdelijk onbereikbaar is. Zuiver, geen I/O
 * (41_CodingStandards.md § 12).
 */
const EARTH_RADIUS_M = 6_371_000;
const ROAD_FACTOR = 1.3;
/** Gemiddelde snelheid (km/u) voor de reistijd-schatting bij een gemiste matrixcel. */
const ASSUMED_SPEED_KMH = 40;

export function haversineDistanceMeters(a: LatLng, b: LatLng): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));

  return EARTH_RADIUS_M * c;
}

/** Geschatte reisafstand (rechte lijn × wegfactor) in meters. */
export function estimateRoadDistanceMeters(a: LatLng, b: LatLng): number {
  return haversineDistanceMeters(a, b) * ROAD_FACTOR;
}

/** Geschatte reistijd in seconden, uitgaand van ASSUMED_SPEED_KMH. */
export function estimateDriveTimeSeconds(a: LatLng, b: LatLng): number {
  const meters = estimateRoadDistanceMeters(a, b);
  const metersPerSecond = (ASSUMED_SPEED_KMH * 1000) / 3600;
  return Math.round(meters / metersPerSecond);
}
