import { describe, expect, it } from 'vitest';

import {
  aggregateProductivityByEmployee,
  aggregateRevenueByMonth,
  revenueToCsv,
  summarizeRouteEfficiency,
} from './reporting';

describe('aggregateRevenueByMonth', () => {
  it('groepeert sent/paid-facturen per maand en negeert drafts', () => {
    const result = aggregateRevenueByMonth([
      { invoice_date: '2026-07-05', total_amount_cents: 1000, status: 'sent' },
      { invoice_date: '2026-07-20', total_amount_cents: 500, status: 'paid' },
      { invoice_date: '2026-07-21', total_amount_cents: 9999, status: 'draft' },
      { invoice_date: '2026-08-01', total_amount_cents: 2000, status: 'paid' },
    ]);

    expect(result).toEqual([
      { period: '2026-07', totalCents: 1500 },
      { period: '2026-08', totalCents: 2000 },
    ]);
  });

  it('geeft een lege lijst zonder facturen', () => {
    expect(aggregateRevenueByMonth([])).toEqual([]);
  });
});

describe('summarizeRouteEfficiency', () => {
  it('berekent gemiddelden en negeert routes zonder waarde', () => {
    const result = summarizeRouteEfficiency([
      { total_distance_meters: 10000, total_drive_time_minutes: 60, optimization_score: 80 },
      { total_distance_meters: 20000, total_drive_time_minutes: 90, optimization_score: null },
      { total_distance_meters: null, total_drive_time_minutes: null, optimization_score: null },
    ]);

    expect(result.routeCount).toBe(3);
    expect(result.avgDistanceMeters).toBe(15000);
    expect(result.avgDriveTimeMinutes).toBe(75);
    expect(result.avgOptimizationScore).toBe(80);
  });

  it('geeft null-gemiddelden zonder routes', () => {
    const result = summarizeRouteEfficiency([]);
    expect(result.routeCount).toBe(0);
    expect(result.avgDistanceMeters).toBeNull();
    expect(result.avgDriveTimeMinutes).toBeNull();
    expect(result.avgOptimizationScore).toBeNull();
  });
});

describe('aggregateProductivityByEmployee', () => {
  it('telt voltooide beurten per medewerker en sorteert aflopend', () => {
    const result = aggregateProductivityByEmployee([
      { employeeId: 'e1', employeeName: 'Piet' },
      { employeeId: 'e2', employeeName: 'Jeroen' },
      { employeeId: 'e1', employeeName: 'Piet' },
      { employeeId: 'e1', employeeName: 'Piet' },
    ]);

    expect(result).toEqual([
      { employeeId: 'e1', employeeName: 'Piet', completedJobs: 3 },
      { employeeId: 'e2', employeeName: 'Jeroen', completedJobs: 1 },
    ]);
  });
});

describe('revenueToCsv', () => {
  it('genereert een CSV met header en rijen', () => {
    const csv = revenueToCsv([
      { period: '2026-07', totalCents: 1500 },
      { period: '2026-08', totalCents: 2000 },
    ]);
    expect(csv).toBe('periode,omzet_cents\n2026-07,1500\n2026-08,2000');
  });

  it('genereert alleen de header zonder data', () => {
    expect(revenueToCsv([])).toBe('periode,omzet_cents');
  });
});
