/**
 * Geografische clustering (15_AIPlanner.md § 3, FR-025, BR-204-soft): trekt
 * nieuw te genereren beurten naar dezelfde datum als al bestaande beurten van
 * ándere dienstafspraken binnen ~1km, mits dat past binnen het bestaande
 * flexibiliteitsvenster (BR-101). Puur, geen I/O (41_CodingStandards.md § 12,
 * zelfde filosofie als horizon.ts) — de aanroeper (planning-generate) haalt de
 * nabije beurten al op.
 *
 * Bewust alleen "aansluiten bij bestaande beurten", nooit ze verplaatsen: een
 * reeds aangemaakte `job` van een andere dienstafspraak wordt hier nooit
 * gewijzigd (dat zou BR-200/vergrendelde-beurten-risico's kunnen raken).
 * Clusters ontstaan zo organisch naarmate er dienstafspraken in een buurt
 * bijkomen, i.p.v. met terugwerkende kracht bestaande planning te herschikken.
 */

// Expliciete .ts-extensies (net als lib/routing onderling): dit bestand wordt
// zowel via Vitest/Next.js (bundler-resolutie) als via Deno (planning-generate
// Edge Function) geïmporteerd — Deno vereist exacte specifiers zonder
// extensie-resolutie.
import { haversineDistanceMeters } from '../routing/haversine.ts';

import { addDays, toIso, toUtcDate } from './horizon.ts';

import type { LatLng } from '../routing/types.ts';

/** 15_AIPlanner.md § 3: "ST_DWithin(location, $punt, 1000m)". */
const CLUSTER_RADIUS_METERS = 1000;

export interface NearbyJob {
  serviceAgreementId: string;
  scheduledDate: string;
  location: LatLng;
}

export interface ClusterNudgeInput {
  objectLocation: LatLng | null;
  /** Chronologisch, eerste datum is de ideale/ankerdatum (BR-001). */
  rawDates: string[];
  flexibilityWindowDays: number;
  excludeDates: string[];
  /** Beurten van ándere dienstafspraken; deze functie filtert zelf op afstand/venster. */
  nearbyJobs: NearbyJob[];
}

export interface ClusterNudgeResult {
  dates: string[];
  clustered: boolean;
  shiftDays: number;
}

function diffDays(a: string, b: string): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((toUtcDate(a).getTime() - toUtcDate(b).getTime()) / msPerDay);
}

export function applyGeographicClusterNudge(input: ClusterNudgeInput): ClusterNudgeResult {
  const { objectLocation, rawDates, flexibilityWindowDays, excludeDates, nearbyJobs } = input;
  const noNudge: ClusterNudgeResult = { dates: rawDates, clustered: false, shiftDays: 0 };

  if (!objectLocation || rawDates.length === 0) {
    return noNudge;
  }

  const anchor = rawDates[0]!;
  const candidates = nearbyJobs
    .filter((job) => haversineDistanceMeters(objectLocation, job.location) <= CLUSTER_RADIUS_METERS)
    .map((job) => ({ date: job.scheduledDate, deltaDays: diffDays(job.scheduledDate, anchor) }))
    .filter((job) => job.deltaDays !== 0 && Math.abs(job.deltaDays) <= flexibilityWindowDays);

  if (candidates.length === 0) {
    return noNudge;
  }

  // Groepeer per datum: grootste cluster wint; bij gelijkspel de kleinste
  // afwijking t.o.v. de ideale datum (BR-101 blijft primair bij een gelijke keuze).
  const byDate = new Map<string, { count: number; deltaDays: number }>();
  for (const candidate of candidates) {
    const existing = byDate.get(candidate.date);
    if (existing) {
      existing.count += 1;
    } else {
      byDate.set(candidate.date, { count: 1, deltaDays: candidate.deltaDays });
    }
  }

  let best: { count: number; deltaDays: number } | null = null;
  for (const info of byDate.values()) {
    const better =
      !best ||
      info.count > best.count ||
      (info.count === best.count && Math.abs(info.deltaDays) < Math.abs(best.deltaDays));
    if (better) {
      best = info;
    }
  }

  const shiftDays = best!.deltaDays;
  if (shiftDays === 0) {
    return noNudge;
  }

  const shiftedDates = rawDates.map((date) => toIso(addDays(toUtcDate(date), shiftDays)));
  if (shiftedDates.some((date) => excludeDates.includes(date))) {
    return noNudge;
  }

  return { dates: shiftedDates, clustered: true, shiftDays };
}
