import { describe, expect, it, vi } from 'vitest';

import { buildMatrix, type DistanceCacheClient, type MatrixPoint } from './matrix.ts';

import type { RoutingProvider } from './types.ts';

const start: MatrixPoint = { id: 'start', location: { lat: 0, lng: 0 } };
const a: MatrixPoint = { id: 'a', location: { lat: 0, lng: 1 } };
const b: MatrixPoint = { id: 'b', location: { lat: 0, lng: 2 } };

function fakeCache(rows: Array<Record<string, unknown>> = []): {
  client: DistanceCacheClient;
  upsertMock: ReturnType<typeof vi.fn>;
} {
  const upsertMock = vi.fn(async () => ({ error: null }));
  const client: DistanceCacheClient = {
    from: () => ({
      select: () => ({
        in: () => ({
          gte: async () => ({ data: rows as never, error: null }),
        }),
      }),
      upsert: upsertMock,
    }),
  };
  return { client, upsertMock };
}

function fakeProvider(): { provider: RoutingProvider; matrixMock: ReturnType<typeof vi.fn> } {
  const matrixMock = vi.fn(async (points: { lat: number; lng: number }[]) => ({
    durations: points.map(() => points.map(() => 100)),
    distances: points.map(() => points.map(() => 1000)),
  }));
  const provider: RoutingProvider = {
    geocode: vi.fn(),
    distanceMatrix: matrixMock,
    directions: vi.fn(),
  };
  return { provider, matrixMock };
}

describe('buildMatrix', () => {
  it('vraagt de provider aan en cachet het resultaat wanneer er geen cache-hits zijn', async () => {
    const { client, upsertMock } = fakeCache([]);
    const { provider, matrixMock } = fakeProvider();

    const result = await buildMatrix({
      supabase: client,
      provider,
      points: [start, a, b],
      providerName: 'mapbox',
    });

    expect(matrixMock).toHaveBeenCalledTimes(1);
    expect(result.durations[0]![1]).toBe(100);
    expect(upsertMock).toHaveBeenCalledTimes(1);
    const [rows] = upsertMock.mock.calls[0]!;
    // 3 punten × 2 richtingen (i≠j) = 6 rijen.
    expect(rows).toHaveLength(6);
  });

  it('slaat de provider volledig over wanneer alle paren al vers gecached zijn', async () => {
    const now = new Date().toISOString();
    const rows = [
      {
        from_object_id: 'start',
        to_object_id: 'a',
        distance_meters: 500,
        drive_time_seconds: 50,
        provider: 'mapbox',
        cached_at: now,
      },
      {
        from_object_id: 'a',
        to_object_id: 'start',
        distance_meters: 500,
        drive_time_seconds: 50,
        provider: 'mapbox',
        cached_at: now,
      },
    ];
    const { client, upsertMock } = fakeCache(rows);
    const { provider, matrixMock } = fakeProvider();

    const result = await buildMatrix({
      supabase: client,
      provider,
      points: [start, a],
      providerName: 'mapbox',
    });

    expect(matrixMock).not.toHaveBeenCalled();
    expect(upsertMock).not.toHaveBeenCalled();
    expect(result.durations[0]![1]).toBe(50);
    expect(result.distances[0]![1]).toBe(500);
  });

  it('valt terug op een Haversine-schatting als de provider faalt (RE-06)', async () => {
    const { client, upsertMock } = fakeCache([]);
    const provider: RoutingProvider = {
      geocode: vi.fn(),
      distanceMatrix: vi.fn(async () => {
        throw new Error('Mapbox onbereikbaar');
      }),
      directions: vi.fn(),
    };

    const result = await buildMatrix({
      supabase: client,
      provider,
      points: [start, a],
      providerName: 'mapbox',
    });

    expect(result.durations[0]![1]).toBeGreaterThan(0);
    expect(upsertMock).toHaveBeenCalledTimes(1);
  });

  it('zet de diagonaal altijd op 0 zonder de cache/provider te bevragen', async () => {
    const { client } = fakeCache([]);
    const { provider } = fakeProvider();

    const result = await buildMatrix({
      supabase: client,
      provider,
      points: [start, a, b],
      providerName: 'mapbox',
    });

    expect(result.durations[0]![0]).toBe(0);
    expect(result.durations[1]![1]).toBe(0);
    expect(result.durations[2]![2]).toBe(0);
  });
});
