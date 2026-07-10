import { describe, expect, it } from 'vitest';

import { optimizeRoute } from './optimize.ts';

import type { OptimizeParams, RouteStopInput } from './types.ts';

const loc = { lat: 52.37, lng: 4.9 };

function stop(jobId: string, overrides: Partial<RouteStopInput> = {}): RouteStopInput {
  return { jobId, location: loc, serviceDurationMinutes: 30, ...overrides };
}

/** Symmetrische matrix uit een simpele puntenlijst-op-een-lijn (0=start). */
function lineMatrix(positionsSec: number[]): OptimizeParams['matrix'] {
  const n = positionsSec.length;
  const durations = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => Math.abs(positionsSec[i]! - positionsSec[j]!)),
  );
  return { durations, distances: durations.map((row) => row.map((v) => v * 10)) };
}

describe('optimizeRoute — geldigheid van de tour', () => {
  it('geeft null-resultaat voor een lege stoplijst', () => {
    const result = optimizeRoute({
      stops: [],
      matrix: { durations: [[0]], distances: [[0]] },
      routeDate: '2026-08-01',
    });
    expect(result.stops).toEqual([]);
    expect(result.unplaceableJobIds).toEqual([]);
    expect(result.optimizationScore).toBe(100);
  });

  it('plaatst elke stop precies één keer met oplopende sequence', () => {
    const stops = [stop('a'), stop('b'), stop('c')];
    const result = optimizeRoute({
      stops,
      matrix: lineMatrix([0, 600, 1200, 1800]),
      routeDate: '2026-08-01',
      maxWorkdayMinutes: 1000,
    });

    expect(result.stops).toHaveLength(3);
    expect(new Set(result.stops.map((s) => s.jobId))).toEqual(new Set(['a', 'b', 'c']));
    expect(result.stops.map((s) => s.sequence)).toEqual([1, 2, 3]);
  });

  it('houdt aankomst-/servicetijden monotoon oplopend', () => {
    const stops = [stop('a'), stop('b'), stop('c')];
    const result = optimizeRoute({
      stops,
      matrix: lineMatrix([0, 600, 1200, 1800]),
      routeDate: '2026-08-01',
      maxWorkdayMinutes: 1000,
    });

    for (let i = 1; i < result.stops.length; i += 1) {
      expect(new Date(result.stops[i]!.arrivalTime).getTime()).toBeGreaterThanOrEqual(
        new Date(result.stops[i - 1]!.serviceEnd).getTime(),
      );
    }
  });

  it('vindt de optimale volgorde voor punten op een lijn (NN is hier al optimaal)', () => {
    // Punten op een lijn: S=0, A op 10min, B op 20min, C op 30min.
    const stops = [stop('a'), stop('b'), stop('c')];
    const result = optimizeRoute({
      stops,
      matrix: lineMatrix([0, 600, 1200, 1800]),
      routeDate: '2026-08-01',
      maxWorkdayMinutes: 1000,
    });

    expect(result.stops.map((s) => s.jobId)).toEqual(['a', 'b', 'c']);
    // S-A(600)+A-B(600)+B-C(600)+C-S retour(1800) = 3600s.
    expect(result.totalDriveTimeSec).toBe(3600);
  });
});

describe('optimizeRoute — H1 (BR-202: max werkdaglengte)', () => {
  it('markeert een stop die de werkdag zou overschrijden als onplaatsbaar (RE-03)', () => {
    const stops = [
      stop('near', { serviceDurationMinutes: 10 }),
      stop('far', { serviceDurationMinutes: 10 }),
    ];
    const result = optimizeRoute({
      stops,
      // near: 5 min heen/terug; far: 1000 min heen (ver boven elk redelijk dagbudget).
      matrix: lineMatrix([0, 300, 60_000]),
      routeDate: '2026-08-01',
      maxWorkdayMinutes: 120,
    });

    expect(result.unplaceableJobIds).toEqual(['far']);
    expect(result.stops.map((s) => s.jobId)).toEqual(['near']);
  });
});

describe('optimizeRoute — H3 (start-/eindpunt is de startlocatie)', () => {
  it('telt de retourrit naar start mee in de totale reistijd', () => {
    const stops = [stop('a')];
    const result = optimizeRoute({
      stops,
      matrix: lineMatrix([0, 600]),
      routeDate: '2026-08-01',
    });

    // Heen (600s) + terug (600s) = 1200s, ondanks dat er maar 1 stop is.
    expect(result.totalDriveTimeSec).toBe(1200);
  });
});

describe('optimizeRoute — zachte constraints & score (§ 5.3)', () => {
  it('geeft score 100 zonder enige zachte-constraint-schending', () => {
    const stops = [stop('a', { preferredDaypart: 'morning' })];
    const result = optimizeRoute({
      stops,
      matrix: lineMatrix([0, 60]),
      routeDate: '2026-08-01',
      workdayStartHHmm: '08:00',
    });
    expect(result.optimizationScore).toBe(100);
  });

  it('verlaagt de score bij een dagdeel-overtreding (S1)', () => {
    const stops = [stop('a', { preferredDaypart: 'afternoon' })];
    const result = optimizeRoute({
      stops,
      matrix: lineMatrix([0, 60]),
      routeDate: '2026-08-01',
      workdayStartHHmm: '08:00',
    });
    // Stop komt 's ochtends aan terwijl 'afternoon' gewenst is.
    expect(result.optimizationScore).toBeLessThan(100);
  });

  it('verlaagt de score voor een "bel-vooraf"-stop als allereerste stop (S2)', () => {
    const stops = [stop('a', { callAheadRequired: true }), stop('b')];
    const result = optimizeRoute({
      stops,
      matrix: lineMatrix([0, 60, 120]),
      routeDate: '2026-08-01',
      maxWorkdayMinutes: 1000,
    });
    expect(result.stops[0]!.jobId).toBe('a');
    expect(result.optimizationScore).toBeLessThan(100);
  });
});

describe('optimizeRoute — H2 (BR-200: vergrendelde stop niet verplaatst)', () => {
  it('laat een vergrendelde stop gewoon meedoen zonder te crashen', () => {
    const stops = [stop('a', { locked: true }), stop('b'), stop('c')];
    const result = optimizeRoute({
      stops,
      matrix: lineMatrix([0, 600, 1200, 1800]),
      routeDate: '2026-08-01',
      maxWorkdayMinutes: 1000,
    });
    expect(result.stops.map((s) => s.jobId).sort()).toEqual(['a', 'b', 'c']);
  });
});
