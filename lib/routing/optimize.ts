import type { OptimizeParams, OptimizeResult, RouteStopOutput } from './types.ts';

/**
 * VRP-heuristiek (14_RoutingEngine.md § 5): constructie (nearest-neighbor,
 * tijdvenster-bewust) + verbetering (2-opt + or-opt, chain-lengte 1). Zuiver,
 * geen I/O (41_CodingStandards.md § 12) — matrix/stops komen kant-en-klaar
 * binnen, de aanroeper (Edge Function) haalt/cachet de matrix.
 *
 * Vergrendelde stops (H2/BR-200) zijn *fixed points* in de verbeteringsfase:
 * 2-opt/or-opt overweegt nooit een wijziging die een vergrendelde stop van
 * positie verandert. In de constructiefase worden ze als gewone kandidaten
 * meegenomen (er is bij een eerste opbouw geen "oude positie" om te
 * respecteren — die garantie geldt pas zodra een route al bestaat en
 * herberekend wordt, § 6).
 *
 * `optimizationScore` (§ 5.3) is hier gedefinieerd als 100 minus een
 * straf per zachte-constraint-schending (S1/S2/S3), niet als een
 * theoretisch-optimale-baseline-vergelijking (die baseline vereist het zelf
 * oplossen van het optimale VRP en is dus niet zinvol binnen deze zuivere
 * functie) — een expliciete, gedocumenteerde vereenvoudiging.
 */

const DEFAULT_WORKDAY_START = '08:00';
const DEFAULT_MAX_WORKDAY_MINUTES = 8.5 * 60;
const DEFAULT_BREAK_MINUTES = 30;
const DEFAULT_BREAK_AROUND = '12:00';

const MORNING_END_MINUTES = 12 * 60;
const DAYPART_PENALTY_MINUTES = 30;
const CALL_AHEAD_FIRST_PENALTY_MINUTES = 20;
const LATE_FINISH_PENALTY_PER_MINUTE = 1;

function hhmmToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

function minutesToIso(routeDate: string, minutes: number): string {
  const days = Math.floor(minutes / (24 * 60));
  const clamped = ((minutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  const date = new Date(`${routeDate}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  date.setUTCHours(h, m, 0, 0);
  return date.toISOString();
}

interface WorkingState {
  currentMatrixIdx: number;
  currentTimeMin: number;
  breakTaken: boolean;
}

function daypartPenalty(
  stopStartMin: number,
  preferred: 'morning' | 'afternoon' | undefined,
): number {
  if (!preferred) return 0;
  const isMorning = stopStartMin < MORNING_END_MINUTES;
  const matches = preferred === 'morning' ? isMorning : !isMorning;
  return matches ? 0 : DAYPART_PENALTY_MINUTES;
}

export function optimizeRoute(params: OptimizeParams): OptimizeResult {
  const {
    stops,
    matrix,
    routeDate,
    workdayStartHHmm = DEFAULT_WORKDAY_START,
    maxWorkdayMinutes = DEFAULT_MAX_WORKDAY_MINUTES,
    breakMinutes = DEFAULT_BREAK_MINUTES,
    breakAroundHHmm = DEFAULT_BREAK_AROUND,
  } = params;

  if (stops.length === 0) {
    return {
      stops: [],
      unplaceableJobIds: [],
      totalDriveTimeSec: 0,
      totalDistanceM: 0,
      totalWorkTimeSec: 0,
      optimizationScore: 100,
    };
  }

  const workdayStartMin = hhmmToMinutes(workdayStartHHmm);
  const breakAroundMin = hhmmToMinutes(breakAroundHHmm);

  // --- Fase 1: constructie (nearest-neighbor, tijdvenster-bewust) ---
  const remaining = new Set(stops.map((_, i) => i));
  const order: number[] = [];
  const unplaceable: number[] = [];
  const state: WorkingState = {
    currentMatrixIdx: 0,
    currentTimeMin: workdayStartMin,
    breakTaken: false,
  };

  while (remaining.size > 0) {
    let bestIdx: number | null = null;
    let bestScore = Infinity;
    let bestDriveSec = 0;

    for (const idx of remaining) {
      const matrixIdx = idx + 1; // 0 = startlocatie
      const driveSec = matrix.durations[state.currentMatrixIdx]?.[matrixIdx] ?? Infinity;
      if (!Number.isFinite(driveSec)) continue;

      const driveMin = driveSec / 60;
      let arrivalMin = state.currentTimeMin + driveMin;
      let breakAdded = 0;
      if (!state.breakTaken && arrivalMin >= breakAroundMin) {
        breakAdded = breakMinutes;
        arrivalMin += breakAdded;
      }
      const serviceEndMin = arrivalMin + stops[idx]!.serviceDurationMinutes;

      // H3: retour naar start moet ook nog binnen H1 passen.
      const returnDriveSec = matrix.durations[matrixIdx]?.[0] ?? Infinity;
      if (!Number.isFinite(returnDriveSec)) continue;
      const totalIfPlaced = serviceEndMin + returnDriveSec / 60 - workdayStartMin;
      if (totalIfPlaced > maxWorkdayMinutes) continue; // H1

      const penalty = daypartPenalty(arrivalMin, stops[idx]!.preferredDaypart);
      const score = driveMin + penalty;
      if (score < bestScore) {
        bestScore = score;
        bestIdx = idx;
        bestDriveSec = driveSec;
      }
    }

    if (bestIdx === null) {
      // RE-03: resterende stops passen niet meer binnen de werkdag.
      for (const idx of remaining) unplaceable.push(idx);
      break;
    }

    const matrixIdx = bestIdx + 1;
    const driveMin = bestDriveSec / 60;
    let arrivalMin = state.currentTimeMin + driveMin;
    if (!state.breakTaken && arrivalMin >= breakAroundMin) {
      arrivalMin += breakMinutes;
      state.breakTaken = true;
    }
    state.currentTimeMin = arrivalMin + stops[bestIdx]!.serviceDurationMinutes;
    state.currentMatrixIdx = matrixIdx;
    order.push(bestIdx);
    remaining.delete(bestIdx);
  }

  // --- Fase 2: verbetering (2-opt), vergrendelde stops blijven fixed ---
  const locked = new Set(order.filter((idx) => stops[idx]!.locked));

  function routeDriveTimeSec(seq: number[]): number {
    if (seq.length === 0) return 0;
    let total = matrix.durations[0]?.[seq[0]! + 1] ?? 0;
    for (let i = 0; i < seq.length - 1; i += 1) {
      total += matrix.durations[seq[i]! + 1]?.[seq[i + 1]! + 1] ?? 0;
    }
    total += matrix.durations[seq[seq.length - 1]! + 1]?.[0] ?? 0;
    return total;
  }

  let improved = true;
  let iterations = 0;
  const MAX_ITERATIONS = 200;
  while (improved && iterations < MAX_ITERATIONS) {
    improved = false;
    iterations += 1;
    for (let i = 0; i < order.length - 1; i += 1) {
      if (locked.has(order[i]!)) continue;
      for (let j = i + 1; j < order.length; j += 1) {
        if (locked.has(order[j]!)) continue;
        const candidate = [
          ...order.slice(0, i),
          ...order.slice(i, j + 1).reverse(),
          ...order.slice(j + 1),
        ];
        if (routeDriveTimeSec(candidate) < routeDriveTimeSec(order) - 1e-6) {
          order.splice(0, order.length, ...candidate);
          improved = true;
        }
      }
    }
  }

  // or-opt (chain-lengte 1): verplaats een losse, niet-vergrendelde stop naar een betere positie.
  improved = true;
  iterations = 0;
  while (improved && iterations < MAX_ITERATIONS) {
    improved = false;
    iterations += 1;
    for (let from = 0; from < order.length; from += 1) {
      if (locked.has(order[from]!)) continue;
      const stopIdx = order[from]!;
      const withoutStop = [...order.slice(0, from), ...order.slice(from + 1)];
      for (let to = 0; to <= withoutStop.length; to += 1) {
        if (to === from) continue;
        const candidate = [...withoutStop.slice(0, to), stopIdx, ...withoutStop.slice(to)];
        if (routeDriveTimeSec(candidate) < routeDriveTimeSec(order) - 1e-6) {
          order.splice(0, order.length, ...candidate);
          improved = true;
          break;
        }
      }
    }
  }

  // --- Serialisatie: absolute tijden + totalen ---
  const outputStops: RouteStopOutput[] = [];
  let currentMatrixIdx = 0;
  let currentTimeMin = workdayStartMin;
  let breakTaken = false;
  let totalDriveSec = 0;
  let totalDistanceM = 0;
  let totalServiceMin = 0;
  let softPenaltyMinutes = 0;

  order.forEach((idx, position) => {
    const matrixIdx = idx + 1;
    const driveSec = matrix.durations[currentMatrixIdx]?.[matrixIdx] ?? 0;
    const distanceM = matrix.distances[currentMatrixIdx]?.[matrixIdx] ?? 0;
    let arrivalMin = currentTimeMin + driveSec / 60;
    if (!breakTaken && arrivalMin >= breakAroundMin) {
      arrivalMin += breakMinutes;
      breakTaken = true;
    }
    const serviceStartMin = arrivalMin;
    const serviceEndMin = serviceStartMin + stops[idx]!.serviceDurationMinutes;

    softPenaltyMinutes += daypartPenalty(serviceStartMin, stops[idx]!.preferredDaypart);
    if (position === 0 && stops[idx]!.callAheadRequired) {
      softPenaltyMinutes += CALL_AHEAD_FIRST_PENALTY_MINUTES;
    }

    outputStops.push({
      jobId: stops[idx]!.jobId,
      sequence: position + 1,
      arrivalTime: minutesToIso(routeDate, arrivalMin),
      serviceStart: minutesToIso(routeDate, serviceStartMin),
      serviceEnd: minutesToIso(routeDate, serviceEndMin),
      driveTimeFromPrevSec: Math.round(driveSec),
      distanceFromPrevM: Math.round(distanceM),
    });

    totalDriveSec += driveSec;
    totalDistanceM += distanceM;
    totalServiceMin += stops[idx]!.serviceDurationMinutes;
    currentTimeMin = serviceEndMin;
    currentMatrixIdx = matrixIdx;
  });

  if (order.length > 0) {
    const returnDriveSec = matrix.durations[currentMatrixIdx]?.[0] ?? 0;
    const returnDistanceM = matrix.distances[currentMatrixIdx]?.[0] ?? 0;
    totalDriveSec += returnDriveSec;
    totalDistanceM += returnDistanceM;
    const streefEindtijdMin = workdayStartMin + maxWorkdayMinutes;
    const eindtijdMin = currentTimeMin + returnDriveSec / 60;
    softPenaltyMinutes +=
      Math.max(0, eindtijdMin - streefEindtijdMin) * LATE_FINISH_PENALTY_PER_MINUTE;
  }

  const optimizationScore = Math.max(0, Math.round(100 - softPenaltyMinutes));

  return {
    stops: outputStops,
    unplaceableJobIds: unplaceable.map((idx) => stops[idx]!.jobId),
    totalDriveTimeSec: Math.round(totalDriveSec),
    totalDistanceM: Math.round(totalDistanceM),
    totalWorkTimeSec: Math.round(totalServiceMin * 60),
    optimizationScore,
  };
}
