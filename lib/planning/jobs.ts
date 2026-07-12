import type { PlanningJob } from '@/components/domain/JobCard';

/**
 * Gedeelde shape/mapper voor een Beurt-rij met geneste PostgREST-embeds
 * (dienstafspraak → dienst/object → klant) — gebruikt door zowel
 * app/(app)/planning/page.tsx als app/(app)/planning/wachtrij/page.tsx zodat
 * de twee query's niet onafhankelijk uit de pas kunnen lopen (41_CodingStandards.md
 * § 1, DRY tussen paginas met dezelfde databron).
 */
export const PLANNING_JOB_SELECT = `id, status, locked, route_id, scheduled_date, sequence, arrival_time,
   service_start, service_end, estimated_duration_minutes, drive_time_from_prev_sec,
   distance_from_prev_m,
   service_agreements!jobs_service_agreement_id_fkey(
     services!service_agreements_service_id_fkey(name),
     objects!service_agreements_object_id_fkey(
       address_line1, city,
       customers!objects_customer_id_fkey(name)
     )
   )`;

export interface PlanningJobRow {
  id: string;
  status: PlanningJob['status'];
  locked: boolean;
  route_id: string | null;
  scheduled_date: string;
  sequence: number | null;
  arrival_time: string | null;
  service_start: string | null;
  service_end: string | null;
  estimated_duration_minutes: number;
  drive_time_from_prev_sec: number | null;
  distance_from_prev_m: number | null;
  service_agreements: {
    services: { name: string } | null;
    objects: {
      address_line1: string;
      city: string;
      customers: { name: string } | null;
    } | null;
  } | null;
}

export function toPlanningJob(row: PlanningJobRow): PlanningJob {
  const object = row.service_agreements?.objects ?? null;
  return {
    id: row.id,
    status: row.status,
    locked: row.locked,
    routeId: row.route_id,
    scheduledDate: row.scheduled_date,
    sequence: row.sequence,
    arrivalTime: row.arrival_time,
    serviceStart: row.service_start,
    serviceEnd: row.service_end,
    estimatedDurationMinutes: row.estimated_duration_minutes,
    driveTimeFromPrevSec: row.drive_time_from_prev_sec,
    distanceFromPrevM: row.distance_from_prev_m,
    customerName: object?.customers?.name ?? 'Onbekende klant',
    addressLine: object?.address_line1 ?? '—',
    city: object?.city ?? '',
    serviceName: row.service_agreements?.services?.name ?? 'Dienst',
  };
}
