import { estimateDriveTimeSeconds, estimateRoadDistanceMeters } from './haversine.ts';
import { splitIntoTiles } from './tiling.ts';

import type { DistanceMatrixResult, LatLng, RoutingProvider } from './types.ts';

/**
 * Matrix-opbouw met cache (14_RoutingEngine.md § 3.3): haalt bestaande paren
 * uit `distance_cache`, vult ontbrekende paren aan via de provider (getegeld,
 * § 3.3/RE-07), schrijft nieuwe resultaten terug, en valt bij een
 * provider-fout terug op de Haversine-schatting (RE-06) i.p.v. de hele
 * berekening te laten falen.
 *
 * I/O (in tegenstelling tot optimize.ts/tiling.ts/haversine.ts) — draait
 * uitsluitend in een Edge Function met de service-rol, nooit vanuit de
 * client (11_DatabaseConcept.md § 3.8: distance_cache heeft geen RLS/grants).
 * `supabase` is een minimale, structurele interface i.p.v. het volledige
 * gegenereerde Database-type, zodat dit bestand geen afhankelijkheid heeft op
 * @/types/database.types (dat pad is niet zonder meer Deno-importeerbaar).
 */

export interface DistanceCacheClient {
  from(table: 'distance_cache'): {
    select(columns: string): {
      in(
        column: string,
        values: string[],
      ): {
        gte(column: string, value: string): Promise<{ data: CacheRow[] | null; error: unknown }>;
      };
    };
    upsert(rows: CacheRow[], options: { onConflict: string }): Promise<{ error: unknown }>;
  };
}

interface CacheRow {
  from_object_id: string;
  to_object_id: string;
  distance_meters: number;
  drive_time_seconds: number;
  profile: 'driving';
  provider: string;
  cached_at?: string;
}

export interface MatrixPoint {
  /** `objects.id`, of een pseudo-id voor het bedrijfsadres (§ 3.2). */
  id: string;
  location: LatLng;
}

const TTL_DAYS = 30;

function cacheKey(fromId: string, toId: string): string {
  return `${fromId}::${toId}`;
}

export async function buildMatrix(params: {
  supabase: DistanceCacheClient;
  provider: RoutingProvider;
  points: MatrixPoint[];
  providerName: string;
}): Promise<DistanceMatrixResult> {
  const { supabase, provider, points, providerName } = params;
  const n = points.length;
  const durations: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
  const distances: number[][] = Array.from({ length: n }, () => Array(n).fill(0));

  const cutoff = new Date(Date.now() - TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const ids = points.map((p) => p.id);
  const { data: cachedRows } = await supabase
    .from('distance_cache')
    .select('from_object_id,to_object_id,distance_meters,drive_time_seconds,provider,cached_at')
    .in('from_object_id', ids)
    .gte('cached_at', cutoff);

  const cache = new Map<string, CacheRow>();
  for (const row of cachedRows ?? []) {
    if (row.provider === providerName && ids.includes(row.to_object_id)) {
      cache.set(cacheKey(row.from_object_id, row.to_object_id), row);
    }
  }

  // Diagonaal (i==i) is altijd 0 en hoeft nooit bevraagd te worden.
  for (let i = 0; i < n; i += 1) {
    durations[i]![i] = 0;
    distances[i]![i] = 0;
  }

  const missingIdx = new Set<number>();
  for (let i = 0; i < n; i += 1) {
    for (let j = 0; j < n; j += 1) {
      if (i === j) continue;
      const hit = cache.get(cacheKey(points[i]!.id, points[j]!.id));
      if (hit) {
        durations[i]![j] = hit.drive_time_seconds;
        distances[i]![j] = hit.distance_meters;
      } else {
        missingIdx.add(i);
        missingIdx.add(j);
      }
    }
  }

  if (missingIdx.size > 0) {
    const involved = Array.from(missingIdx).sort((a, b) => a - b);
    const tiles = splitIntoTiles(involved.length);
    const newRows: CacheRow[] = [];

    for (const tile of tiles) {
      const tilePointIdx = tile.map((localIdx) => involved[localIdx]!);
      const tilePoints = tilePointIdx.map((idx) => points[idx]!.location);

      let tileResult: DistanceMatrixResult;
      try {
        tileResult = await provider.distanceMatrix(tilePoints, 'driving');
      } catch {
        // RE-06: provider onbereikbaar — Haversine-schatting i.p.v. de hele batch te laten falen.
        tileResult = {
          durations: tilePoints.map((a) => tilePoints.map((b) => estimateDriveTimeSeconds(a, b))),
          distances: tilePoints.map((a) => tilePoints.map((b) => estimateRoadDistanceMeters(a, b))),
        };
      }

      tilePointIdx.forEach((globalI, li) => {
        tilePointIdx.forEach((globalJ, lj) => {
          if (globalI === globalJ) return;
          const durationSec = tileResult.durations[li]?.[lj] ?? 0;
          const distanceM = tileResult.distances[li]?.[lj] ?? 0;
          durations[globalI]![globalJ] = durationSec;
          distances[globalI]![globalJ] = distanceM;
          newRows.push({
            from_object_id: points[globalI]!.id,
            to_object_id: points[globalJ]!.id,
            distance_meters: Math.round(distanceM),
            drive_time_seconds: Math.round(durationSec),
            profile: 'driving',
            provider: providerName,
          });
        });
      });
    }

    if (newRows.length > 0) {
      await supabase
        .from('distance_cache')
        .upsert(newRows, { onConflict: 'from_object_id,to_object_id,provider' });
    }
  }

  return { durations, distances };
}
