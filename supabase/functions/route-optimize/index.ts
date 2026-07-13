// route-optimize — 13_API_Specificatie.md § 4, FR-021, 14_RoutingEngine.md, ADR-008.
//
// Berekent de optimale route voor één medewerker op één dag: haalt de nog
// niet-geroute Beurten van die dag op (plus eventueel al aan deze medewerker
// gekoppelde Beurten, voor een herberekening), bouwt de afstandsmatrix
// (lib/routing/matrix.ts, met cache) en optimaliseert de volgorde
// (lib/routing/optimize.ts, § 5). Schrijft het resultaat terug naar
// `routes`/`jobs`.
//
// Draait grotendeels onder de sessie van de aanroeper (RLS is de
// autorisatiegrens, ADR-003) — behalve voor `distance_cache`, dat bewust geen
// RLS/grants heeft (11_DatabaseConcept.md § 3.8) en dus een aparte
// service-role-client vereist, uitsluitend voor die ene tabel.
//
// Distributie van Beurten *over* medewerkers is expliciet geen taak van deze
// engine (14_RoutingEngine.md § 4.1: "deze engine optimaliseert één
// voertuig") — dat is de dag-laag van de AI Planner (15_AIPlanner.md § 1.2,
// nog niet gebouwd). Tot die distributiestap bestaat, behandelt deze functie
// alle nog niet-geroute actieve Beurten van de dag als kandidaat voor de
// opgegeven medewerker.

import { createClient } from 'jsr:@supabase/supabase-js@2';

import { buildMatrix, type MatrixPoint } from '../../../lib/routing/matrix.ts';
import { MapboxProvider } from '../../../lib/routing/mapbox-provider.ts';
import { optimizeRoute } from '../../../lib/routing/optimize.ts';
import type { RouteStopInput } from '../../../lib/routing/types.ts';

interface RequestBody {
  employee_id: string;
  date: string;
  /**
   * Sprint 7 (ADR-012 §2, Optimization Agent): candidate-only — berekent de
   * optimalisatie maar schrijft niets naar routes/jobs. Default false, zodat
   * het bestaande, manuele "optimaliseren"-pad (drag-and-drop-planner) exact
   * ongewijzigd blijft. De Agent Orchestrator gebruikt dry_run:true om een
   * kandidaat te genereren; pas ná menselijke goedkeuring roept de Approval
   * Handler deze functie nogmaals aan met dry_run:false (of default).
   */
  dry_run?: boolean;
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

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function parseBody(raw: unknown): RequestBody | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const body = raw as Record<string, unknown>;
  if (typeof body.employee_id !== 'string' || !UUID_RE.test(body.employee_id)) return null;
  if (typeof body.date !== 'string' || !DATE_ONLY.test(body.date)) return null;
  if (body.dry_run !== undefined && typeof body.dry_run !== 'boolean') return null;
  return { employee_id: body.employee_id, date: body.date, dry_run: body.dry_run ?? false };
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
        message: 'employee_id (uuid) en date (YYYY-MM-DD) zijn verplicht.',
      },
      400,
    );
  }

  // Sprint 7 (ADR-012 §1, Agent Orchestrator): de nachtcyclus heeft geen
  // ingelogde gebruiker, dus geen bruikbare JWT voor RLS. De service-rol mag
  // hier uitsluitend in combinatie met dry_run:true — dit voorkomt dat de
  // service-rol-sleutel misbruikt kan worden om een écht schrijfpad (route/
  // jobs-mutatie) buiten RLS om te forceren; alleen de kandidaat-berekening
  // (geen schrijfactie) staat open voor deze auth-modus. Het reguliere,
  // door-een-gebruiker-geïnitieerde pad (handmatige "optimaliseren"-knop,
  // altijd met een echte JWT, altijd zonder dry_run) is volledig ongewijzigd.
  const isServiceRoleCaller = authHeader === `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`;
  if (isServiceRoleCaller && !body.dry_run) {
    return errorResponse(
      { code: 'forbidden', message: 'Service-rol-toegang is uitsluitend toegestaan met dry_run.' },
      403,
    );
  }

  const supabase = isServiceRoleCaller
    ? createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    : createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
        global: { headers: { Authorization: authHeader } },
      });

  const { data: employee, error: employeeError } = await supabase
    .from('employees')
    .select('id, company_id')
    .eq('id', body.employee_id)
    .maybeSingle();

  if (employeeError) {
    log('error', 'route-optimize: kon medewerker niet ophalen', { code: employeeError.code });
    return errorResponse({ code: 'internal_error', message: 'Kon medewerker niet ophalen.' }, 500);
  }
  if (!employee) {
    // RLS verbergt medewerkers van andere tenants — 404 i.p.v. 403 (13 § 6).
    return errorResponse({ code: 'not_found', message: 'Medewerker niet gevonden.' }, 404);
  }

  const { data: company, error: companyError } = await supabase
    .from('companies')
    .select('config_json')
    .eq('id', employee.company_id)
    .single();

  if (companyError) {
    log('error', 'route-optimize: kon bedrijf niet ophalen', { code: companyError.code });
    return errorResponse(
      { code: 'internal_error', message: 'Kon bedrijfsgegevens niet ophalen.' },
      500,
    );
  }

  const depotLocation = (
    company.config_json as { depot_location?: { lat: number; lng: number } } | null
  )?.depot_location;
  if (
    !depotLocation ||
    typeof depotLocation.lat !== 'number' ||
    typeof depotLocation.lng !== 'number'
  ) {
    return errorResponse(
      {
        code: 'depot_location_missing',
        message: 'Stel eerst een depotlocatie in voor je bedrijf (PRD § 19 A-13).',
      },
      422,
    );
  }

  // Kandidaat-beurten: nog niet-geroute actieve beurten van de dag, plus reeds
  // aan deze medewerker gekoppelde beurten (herberekening van een bestaande route).
  const { data: existingRoute } = await supabase
    .from('routes')
    .select('id, sequence_version, total_drive_time_minutes')
    .eq('employee_id', body.employee_id)
    .eq('route_date', body.date)
    .maybeSingle();

  let jobsQuery = supabase
    .from('jobs')
    .select(
      'id, service_agreement_id, estimated_duration_minutes, locked, service_agreements!jobs_service_agreement_id_fkey(object_id, service_id)',
    )
    .eq('company_id', employee.company_id)
    .eq('scheduled_date', body.date)
    .in('status', ['proposed', 'planned']);

  jobsQuery = existingRoute
    ? jobsQuery.or(`route_id.is.null,route_id.eq.${existingRoute.id}`)
    : jobsQuery.is('route_id', null);

  const { data: jobs, error: jobsError } = await jobsQuery;

  if (jobsError) {
    log('error', 'route-optimize: kon beurten niet ophalen', { code: jobsError.code });
    return errorResponse({ code: 'internal_error', message: 'Kon beurten niet ophalen.' }, 500);
  }

  if (!jobs || jobs.length === 0) {
    return new Response(
      JSON.stringify({
        route: null,
        stops: [],
        unplaceable_job_ids: [],
        message: 'Geen beurten om te plannen.',
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
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
    .select('id, location, postal_code, address_line1, country_code')
    .in('id', objectIds);

  if (objectsError) {
    log('error', 'route-optimize: kon objecten niet ophalen', { code: objectsError.code });
    return errorResponse({ code: 'internal_error', message: 'Kon objecten niet ophalen.' }, 500);
  }

  const mapboxToken = Deno.env.get('MAPBOX_ACCESS_TOKEN');
  if (!mapboxToken) {
    return errorResponse({ code: 'config_error', message: 'Routing is niet geconfigureerd.' }, 500);
  }
  const provider = new MapboxProvider(mapboxToken);

  // RE-01: objecten zonder locatie eerst geocoden en persisteren.
  const objectLocations = new Map<string, { lat: number; lng: number }>();
  for (const object of objects ?? []) {
    if (object.location) {
      const coords = object.location as unknown as { coordinates: [number, number] };
      objectLocations.set(object.id, { lng: coords.coordinates[0], lat: coords.coordinates[1] });
      continue;
    }
    const houseNumberMatch = /(\d+\w*)\s*$/.exec(object.address_line1 ?? '');
    const geocodeResult = await provider
      .geocode({
        postalCode: object.postal_code,
        houseNumber: houseNumberMatch?.[1] ?? '',
        countryCode: object.country_code,
      })
      .catch(() => ({ status: 'not_found' as const }));

    if (geocodeResult.status === 'ok' && geocodeResult.location) {
      objectLocations.set(object.id, geocodeResult.location);
      await supabase
        .from('objects')
        .update({
          location: `POINT(${geocodeResult.location.lng} ${geocodeResult.location.lat})`,
          location_status: 'geocoded',
        })
        .eq('id', object.id);
    } else {
      // object_location_status kent geen 'ambiguous' (005_objects.sql) — RE-02's
      // "planner kiest juiste match"-UI bestaat nog niet, dus een ambigue match
      // valt hier terug op 'failed' (net als 'not_found'): niet routeerbaar
      // totdat een mens het adres bevestigt.
      await supabase.from('objects').update({ location_status: 'failed' }).eq('id', object.id);
    }
  }

  const routableJobs = jobs.filter((j) => {
    const objectId = (j.service_agreements as { object_id: string } | null)?.object_id;
    return objectId && objectLocations.has(objectId);
  });
  const unroutableJobIds = jobs.filter((j) => !routableJobs.includes(j)).map((j) => j.id);

  if (routableJobs.length === 0) {
    return new Response(
      JSON.stringify({
        route: null,
        stops: [],
        unplaceable_job_ids: unroutableJobIds,
        message: 'Geen routeerbare beurten (ontbrekende locaties).',
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const matrixPoints: MatrixPoint[] = [
    { id: `depot-${employee.company_id}`, location: depotLocation },
    ...routableJobs.map((j) => ({
      id: (j.service_agreements as { object_id: string }).object_id,
      location: objectLocations.get((j.service_agreements as { object_id: string }).object_id)!,
    })),
  ];

  const serviceRoleClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const matrix = await buildMatrix({
    supabase: serviceRoleClient,
    provider,
    points: matrixPoints,
    providerName: 'mapbox',
  });

  const stopInputs: RouteStopInput[] = routableJobs.map((j) => ({
    jobId: j.id,
    location: objectLocations.get((j.service_agreements as { object_id: string }).object_id)!,
    serviceDurationMinutes: j.estimated_duration_minutes,
    locked: j.locked,
  }));

  const optimized = optimizeRoute({ stops: stopInputs, matrix, routeDate: body.date });

  if (body.dry_run) {
    // Candidate-only (ADR-012 §2, Optimization Agent): geen schrijfactie —
    // levert dezelfde `optimized`-berekening plus de vorige reistijd (indien
    // een route al bestond) zodat de aanroeper de verwachte winst kan tonen
    // zonder iets te muteren.
    log('info', 'route-optimize: dry-run voltooid (geen schrijfactie)', {
      employeeId: body.employee_id,
      date: body.date,
      stops: optimized.stops.length,
    });
    return new Response(
      JSON.stringify({
        route: null,
        stops: optimized.stops,
        unplaceable_job_ids: [...optimized.unplaceableJobIds, ...unroutableJobIds],
        dry_run: true,
        total_drive_time_minutes: Math.round(optimized.totalDriveTimeSec / 60),
        total_distance_meters: optimized.totalDistanceM,
        optimization_score: optimized.optimizationScore,
        previous_total_drive_time_minutes: existingRoute?.total_drive_time_minutes ?? null,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const { data: route, error: routeError } = await supabase
    .from('routes')
    .upsert(
      {
        id: existingRoute?.id,
        company_id: employee.company_id,
        employee_id: body.employee_id,
        route_date: body.date,
        total_distance_meters: optimized.totalDistanceM,
        total_drive_time_minutes: Math.round(optimized.totalDriveTimeSec / 60),
        total_work_time_minutes: Math.round(optimized.totalWorkTimeSec / 60),
        sequence_version: (existingRoute?.sequence_version ?? -1) + 1,
        optimization_score: optimized.optimizationScore,
      },
      { onConflict: 'company_id,employee_id,route_date' },
    )
    .select('id')
    .single();

  if (routeError || !route) {
    log('error', 'route-optimize: kon route niet opslaan', { code: routeError?.code });
    return errorResponse({ code: 'internal_error', message: 'Kon route niet opslaan.' }, 500);
  }

  for (const stop of optimized.stops) {
    const { error: jobUpdateError } = await supabase
      .from('jobs')
      .update({
        route_id: route.id,
        status: 'planned',
        sequence: stop.sequence,
        arrival_time: stop.arrivalTime,
        service_start: stop.serviceStart,
        service_end: stop.serviceEnd,
        drive_time_from_prev_sec: stop.driveTimeFromPrevSec,
        distance_from_prev_m: stop.distanceFromPrevM,
      })
      .eq('id', stop.jobId);

    if (jobUpdateError) {
      log('error', 'route-optimize: kon beurt niet bijwerken', {
        code: jobUpdateError.code,
        jobId: stop.jobId,
      });
    }
  }

  log('info', 'route-optimize: voltooid', {
    employeeId: body.employee_id,
    date: body.date,
    stops: optimized.stops.length,
    unplaceable: optimized.unplaceableJobIds.length + unroutableJobIds.length,
  });

  return new Response(
    JSON.stringify({
      route: { id: route.id, ...optimized, stops: undefined },
      stops: optimized.stops,
      unplaceable_job_ids: [...optimized.unplaceableJobIds, ...unroutableJobIds],
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );
});
