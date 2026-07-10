import { describe, expect, it } from 'vitest';

import {
  estimateDriveTimeSeconds,
  estimateRoadDistanceMeters,
  haversineDistanceMeters,
} from './haversine.ts';

// Amsterdam Centraal ↔ Utrecht Centraal, ~35.5 km hemelsbreed.
const amsterdam = { lat: 52.3791, lng: 4.9003 };
const utrecht = { lat: 52.0894, lng: 5.1101 };

describe('haversineDistanceMeters', () => {
  it('geeft 0 voor identieke punten', () => {
    expect(haversineDistanceMeters(amsterdam, amsterdam)).toBe(0);
  });

  it('geeft een plausibele afstand voor Amsterdam-Utrecht', () => {
    const meters = haversineDistanceMeters(amsterdam, utrecht);
    expect(meters).toBeGreaterThan(33_000);
    expect(meters).toBeLessThan(38_000);
  });

  it('is symmetrisch', () => {
    expect(haversineDistanceMeters(amsterdam, utrecht)).toBeCloseTo(
      haversineDistanceMeters(utrecht, amsterdam),
      6,
    );
  });
});

describe('estimateRoadDistanceMeters (RE-06 wegfactor 1,3)', () => {
  it('is 1,3x de hemelsbrede afstand', () => {
    const straight = haversineDistanceMeters(amsterdam, utrecht);
    expect(estimateRoadDistanceMeters(amsterdam, utrecht)).toBeCloseTo(straight * 1.3, 3);
  });
});

describe('estimateDriveTimeSeconds', () => {
  it('geeft 0 voor identieke punten', () => {
    expect(estimateDriveTimeSeconds(amsterdam, amsterdam)).toBe(0);
  });

  it('geeft een positieve schatting die toeneemt met afstand', () => {
    const near = estimateDriveTimeSeconds(amsterdam, { lat: 52.38, lng: 4.91 });
    const far = estimateDriveTimeSeconds(amsterdam, utrecht);
    expect(far).toBeGreaterThan(near);
    expect(far).toBeGreaterThan(0);
  });
});
