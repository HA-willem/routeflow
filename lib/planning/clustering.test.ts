import { describe, expect, it } from 'vitest';

import { applyGeographicClusterNudge, type NearbyJob } from './clustering';

// Amsterdam Centraal (referentiepunt) en Utrecht Centraal (~35,5 km, ruim buiten 1km).
const amsterdam = { lat: 52.3791, lng: 4.9003 };
const utrecht = { lat: 52.0894, lng: 5.1101 };
// ~400m van Amsterdam Centraal (ruim binnen de 1km-clusterradius).
const nearAmsterdam = { lat: 52.3821, lng: 4.9012 };

function nearbyJob(overrides: Partial<NearbyJob> = {}): NearbyJob {
  return {
    serviceAgreementId: 'sa-other',
    scheduledDate: '2026-08-05',
    location: nearAmsterdam,
    ...overrides,
  };
}

describe('applyGeographicClusterNudge (FR-025/BR-204)', () => {
  it('geen wijziging zonder objectLocation', () => {
    const result = applyGeographicClusterNudge({
      objectLocation: null,
      rawDates: ['2026-08-01'],
      flexibilityWindowDays: 3,
      excludeDates: [],
      nearbyJobs: [nearbyJob()],
    });
    expect(result).toEqual({ dates: ['2026-08-01'], clustered: false, shiftDays: 0 });
  });

  it('geen wijziging zonder nabije beurten', () => {
    const result = applyGeographicClusterNudge({
      objectLocation: amsterdam,
      rawDates: ['2026-08-01'],
      flexibilityWindowDays: 3,
      excludeDates: [],
      nearbyJobs: [],
    });
    expect(result.clustered).toBe(false);
    expect(result.dates).toEqual(['2026-08-01']);
  });

  it('clustert naar een nabije beurt binnen 1km en binnen het flexibiliteitsvenster', () => {
    // Ideale datum 1 aug, nabije beurt 5 aug (+4 dagen) binnen venster van 5.
    const result = applyGeographicClusterNudge({
      objectLocation: amsterdam,
      rawDates: ['2026-08-01', '2026-08-08'],
      flexibilityWindowDays: 5,
      excludeDates: [],
      nearbyJobs: [nearbyJob({ scheduledDate: '2026-08-05' })],
    });
    expect(result.clustered).toBe(true);
    expect(result.shiftDays).toBe(4);
    // Uniforme verschuiving: interval tussen de twee datums blijft 7 dagen.
    expect(result.dates).toEqual(['2026-08-05', '2026-08-12']);
  });

  it('geen wijziging als de nabije beurt buiten het flexibiliteitsvenster valt', () => {
    const result = applyGeographicClusterNudge({
      objectLocation: amsterdam,
      rawDates: ['2026-08-01'],
      flexibilityWindowDays: 2,
      excludeDates: [],
      nearbyJobs: [nearbyJob({ scheduledDate: '2026-08-05' })], // +4 dagen, buiten venster van 2
    });
    expect(result.clustered).toBe(false);
    expect(result.dates).toEqual(['2026-08-01']);
  });

  it('geen wijziging als de nabije beurt binnen het venster maar buiten 1km ligt', () => {
    const result = applyGeographicClusterNudge({
      objectLocation: amsterdam,
      rawDates: ['2026-08-01'],
      flexibilityWindowDays: 5,
      excludeDates: [],
      nearbyJobs: [nearbyJob({ scheduledDate: '2026-08-05', location: utrecht })],
    });
    expect(result.clustered).toBe(false);
    expect(result.dates).toEqual(['2026-08-01']);
  });

  it('kiest de datum met de meeste nabije beurten (grootste cluster)', () => {
    const result = applyGeographicClusterNudge({
      objectLocation: amsterdam,
      rawDates: ['2026-08-01'],
      flexibilityWindowDays: 5,
      excludeDates: [],
      nearbyJobs: [
        nearbyJob({ serviceAgreementId: 'sa-1', scheduledDate: '2026-08-02' }),
        nearbyJob({ serviceAgreementId: 'sa-2', scheduledDate: '2026-08-04' }),
        nearbyJob({ serviceAgreementId: 'sa-3', scheduledDate: '2026-08-04' }),
      ],
    });
    expect(result.clustered).toBe(true);
    expect(result.dates).toEqual(['2026-08-04']);
  });

  it('bij een gelijke clustergrootte kiest de kleinste afwijking t.o.v. de ideale datum', () => {
    const result = applyGeographicClusterNudge({
      objectLocation: amsterdam,
      rawDates: ['2026-08-01'],
      flexibilityWindowDays: 5,
      excludeDates: [],
      nearbyJobs: [
        nearbyJob({ serviceAgreementId: 'sa-1', scheduledDate: '2026-08-05' }), // +4
        nearbyJob({ serviceAgreementId: 'sa-2', scheduledDate: '2026-08-02' }), // +1
      ],
    });
    expect(result.clustered).toBe(true);
    expect(result.dates).toEqual(['2026-08-02']);
  });

  it('valt terug op de oorspronkelijke datums als de verschoven reeks een excludeDate raakt', () => {
    const result = applyGeographicClusterNudge({
      objectLocation: amsterdam,
      rawDates: ['2026-08-01'],
      flexibilityWindowDays: 5,
      excludeDates: ['2026-08-05'],
      nearbyJobs: [nearbyJob({ scheduledDate: '2026-08-05' })],
    });
    expect(result.clustered).toBe(false);
    expect(result.dates).toEqual(['2026-08-01']);
  });

  it('negeert exact dezelfde datum (deltaDays 0) als geen cluster-kandidaat', () => {
    const result = applyGeographicClusterNudge({
      objectLocation: amsterdam,
      rawDates: ['2026-08-01'],
      flexibilityWindowDays: 5,
      excludeDates: [],
      nearbyJobs: [nearbyJob({ scheduledDate: '2026-08-01' })],
    });
    expect(result.clustered).toBe(false);
  });
});
