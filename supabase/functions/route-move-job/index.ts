// route-move-job — 13_API_Specificatie.md § 4, FR-022, 14_RoutingEngine.md § 6.
//
// Verplaatst een beurt naar een (andere) route en herberekent alléén de
// betrokken route(s) — niet de hele week (§ 6.1). `position` is een hint voor
// de invoegvolgorde vóór herberekening; de optimalisatie (or-opt/2-opt) kan de
// uiteindelijke volgorde nog licht bijstellen, vandaar "optimistic UI... server
// bevestigt" (§ 6.1 punt 4) i.p.v. de exacte dropzone-positie te garanderen.
//
// BR-200 (vergrendelde beurt niet sleepbaar), H1/BR-202 (werkdag-limiet op de
// doelroute) en BR-201 (medewerker-beschikbaarheid) worden vóór het schrijven
// gecontroleerd — bij schending wordt niets aangepast (§ 6.2).

import { createClient } from 'jsr:@supabase/supabase-js@2';

import { buildMatrix, type MatrixPoint } from '../../../lib/routing/matrix.ts';
import { MapboxProvider } from '../../../lib/routing/mapbox-provider.ts';
import { optimizeRoute } from '../../../lib/routing/optimize.ts';
import type { RouteStopInput } from '../../../lib/routing/types.ts';

interface RequestBody {
  job_id: string;
  target_route_id: string;
  position: number;
}

interface AppError {
  code: string;
  message: string;
  hint?: string;
}

function errorResponse(error: AppError, status: number): Response {
  return new Response(JSON.stringify({ error: { ...error, status } }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function log(level: 'info' | 'error', message: string, context: Record<string, unknown>): void {
  console.log(JSON.stringify({ timestamp: new Date().toISOString(), level, message, context }));
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function parseBody(raw: unknown): RequestBody | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const body = raw as Record<string, unknown>;
  if (typeof body.job_id !== 'string' || !UUID_RE.test(body.job_id)) return null;
  if (typeof body.target_route_id !== 'string' || !UUID_RE.test(body.target_route_id)) return null;
  if (typeof body.position !== 'number' || !Number.isInteger(body.position) || body.position < 0) {
    return null;
  }
  return { job_id: body.job_id, target_route_id: body.target_route_id, position: body.position };
}

/** Herberekent en persisteert één route in zijn geheel (§ 6.1 stap 2-5). */
async function recomputeRoute(params: {
  supabase: ReturnType<typeof createClient>;
  serviceRoleClient: ReturnType<typeof createClient>;
  provider: MapboxProvider;
  routeId: string;
  companyId: string;
  routeDate: string;
  depotLocation: { lat: number; lng: number };
}): Promise<{ error: string | null; unplaceableJobIds: string[] }> {
  const { supabase, serviceRoleClient, provider, routeId, companyId, routeDate, depotLocation } =
    params;

  const { data: currentRoute } = await supabase
    .from('routes')
    .select('sequence_version')
    .eq('id', routeId)
    .single();
  const nextSequenceVersion = (currentRoute?.sequence_version ?? -1) + 1;

  const { data: jobs, error: jobsError } = await supabase
    .from('jobs')
    .select(
      'id, estimated_duration_minutes, locked, service_agreements!jobs_service_agreement_id_fkey(object_id)',
    )
    .eq('route_id', routeId);

  if (jobsError) return { error: jobsError.message, unplaceableJobIds: [] };

  if (!jobs || jobs.length === 0) {
    await supabase
      .from('routes')
      .update({
        total_distance_meters: 0,
        total_drive_time_minutes: 0,
        total_work_time_minutes: 0,
        sequence_version: nextSequenceVersion,
      })
      .eq('id', routeId);
    return { error: null, unplaceableJobIds: [] };
  }

  const objectIds = Array.from(
    new Set(
      jobs
        .map((j) => (j.service_agreements as { object_id: string } | null)?.object_id)
        .filter(Boolean),
    ),
  ) as string[];
  const { data: objects, error: objectsError } = await supabase
    .from('objects')
    .select('id, location')
    .in('id', objectIds);
  if (objectsError) return { error: objectsError.message, unplaceableJobIds: [] };

  const locations = new Map<string, { lat: number; lng: number }>();
  for (const object of objects ?? []) {
    if (!object.location) continue;
    const coords = object.location as unknown as { coordinates: [number, number] };
    locations.set(object.id, { lng: coords.coordinates[0], lat: coords.coordinates[1] });
  }

  const routableJobs = jobs.filter((j) => {
    const objectId = (j.service_agreements as { object_id: string } | null)?.object_id;
    return objectId && locations.has(objectId);
  });
  const unroutableJobIds = jobs.filter((j) => !routableJobs.includes(j)).map((j) => j.id);
  if (routableJobs.length === 0) return { error: null, unplaceableJobIds: unroutableJobIds };

  const matrixPoints: MatrixPoint[] = [
    { id: `depot-${companyId}`, location: depotLocation },
    ...routableJobs.map((j) => ({
      id: (j.service_agreements as { object_id: string }).object_id,
      location: locations.get((j.service_agreements as { object_id: string }).object_id)!,
    })),
  ];
  const matrix = await buildMatrix({
    supabase: serviceRoleClient,
    provider,
    points: matrixPoints,
    providerName: 'mapbox',
  });

  const stopInputs: RouteStopInput[] = routableJobs.map((j) => ({
    jobId: j.id,
    location: locations.get((j.service_agreements as { object_id: string }).object_id)!,
    serviceDurationMinutes: j.estimated_duration_minutes,
    locked: j.locked,
  }));

  const optimized = optimizeRoute({ stops: stopInputs, matrix, routeDate });

  await supabase
    .from('routes')
    .update({
      total_distance_meters: optimized.totalDistanceM,
      total_drive_time_minutes: Math.round(optimized.totalDriveTimeSec / 60),
      total_work_time_minutes: Math.round(optimized.totalWorkTimeSec / 60),
      optimization_score: optimized.optimizationScore,
      sequence_version: nextSequenceVersion,
    })
    .eq('id', routeId);

  for (const stop of optimized.stops) {
    await supabase
      .from('jobs')
      .update({
        sequence: stop.sequence,
        arrival_time: stop.arrivalTime,
        service_start: stop.serviceStart,
        service_end: stop.serviceEnd,
        drive_time_from_prev_sec: stop.driveTimeFromPrevSec,
        distance_from_prev_m: stop.distanceFromPrevM,
      })
      .eq('id', stop.jobId);
  }

  return { error: null, unplaceableJobIds: [...optimized.unplaceableJobIds, ...unroutableJobIds] };
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return errorResponse(
      { code: 'method_not_allowed', message: 'Alleen POST is toegestaan.' },
      405,
    );
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return errorResponse({ code: 'unauthenticated', message: 'Niet ingelogd.' }, 401);
  }

  let body: RequestBody | null;
  try {
    body = parseBody(await req.json());
  } catch {
    body = null;
  }
  if (!body) {
    return errorResponse(
      {
        code: 'validation_error',
        message: 'job_id, target_route_id (uuid) en position (>=0) zijn verplicht.',
      },
      400,
    );
  }

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: job, error: jobError } = await supabase
    .from('jobs')
    .select('id, company_id, route_id, locked')
    .eq('id', body.job_id)
    .maybeSingle();
  if (jobError) {
    log('error', 'route-move-job: kon beurt niet ophalen', { code: jobError.code });
    return errorResponse({ code: 'internal_error', message: 'Kon beurt niet ophalen.' }, 500);
  }
  if (!job) {
    return errorResponse({ code: 'not_found', message: 'Beurt niet gevonden.' }, 404);
  }
  if (job.locked) {
    // BR-200: een vergrendelde beurt is niet sleepbaar.
    return errorResponse(
      { code: 'job_locked', message: 'Deze beurt is vergrendeld en kan niet verplaatst worden.' },
      409,
    );
  }

  const { data: targetRoute, error: targetRouteError } = await supabase
    .from('routes')
    .select('id, employee_id, route_date, company_id')
    .eq('id', body.target_route_id)
    .maybeSingle();
  if (targetRouteError) {
    log('error', 'route-move-job: kon doelroute niet ophalen', { code: targetRouteError.code });
    return errorResponse({ code: 'internal_error', message: 'Kon doelroute niet ophalen.' }, 500);
  }
  if (!targetRoute) {
    return errorResponse({ code: 'not_found', message: 'Doelroute niet gevonden.' }, 404);
  }

  // BR-201: medewerker onbeschikbaar op de doeldag → drop geweigerd (§ 6.2).
  const { data: unavailability } = await supabase
    .from('availability')
    .select('status')
    .eq('employee_id', targetRoute.employee_id)
    .eq('date', targetRoute.route_date)
    .in('status', ['sick', 'leave'])
    .maybeSingle();
  if (unavailability) {
    return errorResponse(
      {
        code: 'employee_unavailable',
        message: 'De medewerker is op deze dag niet beschikbaar.',
      },
      409,
    );
  }

  const { data: company, error: companyError } = await supabase
    .from('companies')
    .select('config_json')
    .eq('id', targetRoute.company_id)
    .single();
  if (companyError) {
    return errorResponse(
      { code: 'internal_error', message: 'Kon bedrijfsgegevens niet ophalen.' },
      500,
    );
  }
  const depotLocation = (
    company.config_json as { depot_location?: { lat: number; lng: number } } | null
  )?.depot_location;
  if (!depotLocation) {
    return errorResponse(
      {
        code: 'depot_location_missing',
        message: 'Stel eerst een depotlocatie in voor je bedrijf.',
      },
      422,
    );
  }

  const mapboxToken = Deno.env.get('MAPBOX_ACCESS_TOKEN');
  if (!mapboxToken) {
    return errorResponse({ code: 'config_error', message: 'Routing is niet geconfigureerd.' }, 500);
  }
  const provider = new MapboxProvider(mapboxToken);
  const serviceRoleClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const sourceRouteId = job.route_id;

  // Verplaats de beurt eerst (§ 6.1 stap 1), herbereken daarna beide routes.
  // `scheduled_date` volgt altijd de doelroute mee — bij een gelijke-dag-move
  // (bestaande RouteBoard) is dat een no-op (target-route-datum == huidige
  // datum), maar bij een cross-day-move (WeekBoard, ZZP-weekgrid) voorkomt dit
  // dat een beurt aan de juiste route hangt terwijl elke andere query
  // (facturatie, Vandaag-tellingen, PWA-dagroute) 'm nog op de oude datum
  // zoekt — gevonden tijdens QA-verificatie van de weekgrid (2026-07-17).
  const { error: moveError } = await supabase
    .from('jobs')
    .update({
      route_id: body.target_route_id,
      sequence: body.position + 1,
      scheduled_date: targetRoute.route_date,
    })
    .eq('id', body.job_id);
  if (moveError) {
    log('error', 'route-move-job: kon beurt niet koppelen aan doelroute', { code: moveError.code });
    return errorResponse({ code: 'internal_error', message: 'Kon beurt niet verplaatsen.' }, 500);
  }

  const targetResult = await recomputeRoute({
    supabase,
    serviceRoleClient,
    provider,
    routeId: body.target_route_id,
    companyId: targetRoute.company_id,
    routeDate: targetRoute.route_date,
    depotLocation,
  });

  if (targetResult.error) {
    // Terugdraaien: de beurt hoort weer bij zijn oorspronkelijke route (§ 6.2 "drop teruggedraaid").
    await supabase.from('jobs').update({ route_id: sourceRouteId }).eq('id', body.job_id);
    log('error', 'route-move-job: herberekening doelroute mislukt, drop teruggedraaid', {
      error: targetResult.error,
    });
    return errorResponse(
      {
        code: 'recompute_failed',
        message: 'Deze beurt past niet op de doelroute. Wijziging teruggedraaid.',
      },
      422,
    );
  }

  if (targetResult.unplaceableJobIds.includes(body.job_id)) {
    // H1/BR-202: de beurt past niet binnen de werkdag op de doelroute — drop teruggedraaid (§ 6.2).
    await supabase.from('jobs').update({ route_id: sourceRouteId }).eq('id', body.job_id);
    if (sourceRouteId) {
      await recomputeRoute({
        supabase,
        serviceRoleClient,
        provider,
        routeId: sourceRouteId,
        companyId: targetRoute.company_id,
        routeDate: targetRoute.route_date,
        depotLocation,
      });
    }
    return errorResponse(
      {
        code: 'workday_limit_exceeded',
        message: 'Deze beurt past niet op deze dag (werkdag zou de 8,5u-limiet overschrijden).',
      },
      422,
    );
  }

  if (sourceRouteId && sourceRouteId !== body.target_route_id) {
    const { data: sourceRoute } = await supabase
      .from('routes')
      .select('company_id, employee_id, route_date')
      .eq('id', sourceRouteId)
      .maybeSingle();
    if (sourceRoute) {
      await recomputeRoute({
        supabase,
        serviceRoleClient,
        provider,
        routeId: sourceRouteId,
        companyId: sourceRoute.company_id,
        routeDate: sourceRoute.route_date,
        depotLocation,
      });
    }
  }

  log('info', 'route-move-job: voltooid', {
    jobId: body.job_id,
    fromRouteId: sourceRouteId,
    toRouteId: body.target_route_id,
  });

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
