// agent-weather — Weather Agent (43_AI_Agents.md §6, ADR-012 §1).
//
// Toetst de weersverwachting voor het bedrijfsdepot tegen weersgevoelige
// diensten en genereert een informatief voorstel bij drempeloverschrijding
// (15_AIPlanner.md §6.3) — Sprint 7-scope is uitsluitend signalering
// (`payload: null`); het daadwerkelijk verplaatsen van beurten is de taak van
// de Replanning Agent (43 §5), bewust nog niet gebouwd (zie de strategische
// review). AP-04 (15 §11, "weer-API onbereikbaar"): bij een providerfout
// degradeert deze functie naar een lege kandidatenlijst i.p.v. de hele
// nachtcyclus te blokkeren.
//
// Uitsluitend aanroepbaar met de service-rol (zelfde motivatie als
// agent-capacity/agent-optimization).

import { createClient } from 'jsr:@supabase/supabase-js@2';

import { buildWeatherCandidates } from '../../../lib/weather/candidates.ts';
import { aggregateDailyWeather, buildAreaKey } from '../../../lib/weather/cache.ts';
import { OpenMeteoProvider } from '../../../lib/weather/open-meteo-provider.ts';
import { detectWeatherRisks } from '../../../lib/weather/thresholds.ts';

import type { WeatherSensitiveJob } from '../../../lib/weather/candidates.ts';
import type { RawCandidate } from '../../../lib/agents/types.ts';

interface RequestBody {
  company_id: string;
  date: string;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

function errorResponse(code: string, message: string, status: number): Response {
  return new Response(JSON.stringify({ error: { code, message } }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function requireServiceRole(req: Request): boolean {
  return req.headers.get('Authorization') === `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`;
}

function parseBody(raw: unknown): RequestBody | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const body = raw as Record<string, unknown>;
  if (typeof body.company_id !== 'string' || !UUID_RE.test(body.company_id)) return null;
  if (typeof body.date !== 'string' || !DATE_ONLY.test(body.date)) return null;
  return { company_id: body.company_id, date: body.date };
}

function log(level: 'info' | 'error', message: string, context: Record<string, unknown>): void {
  console.log(JSON.stringify({ timestamp: new Date().toISOString(), level, message, context }));
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return errorResponse('method_not_allowed', 'Alleen POST is toegestaan.', 405);
  }
  if (!requireServiceRole(req)) {
    return errorResponse('unauthenticated', 'Uitsluitend voor interne agent-aanroepen.', 401);
  }

  let body: RequestBody | null;
  try {
    body = parseBody(await req.json());
  } catch {
    body = null;
  }
  if (!body) {
    return errorResponse(
      'validation_error',
      'company_id (uuid) en date (YYYY-MM-DD) zijn verplicht.',
      400,
    );
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data: company, error: companyError } = await supabase
    .from('companies')
    .select('config_json')
    .eq('id', body.company_id)
    .single();

  if (companyError) {
    log('error', 'agent-weather: kon bedrijf niet ophalen', { code: companyError.code });
    return errorResponse('internal_error', 'Kon bedrijfsgegevens niet ophalen.', 500);
  }

  const depotLocation = (
    company.config_json as { depot_location?: { lat: number; lng: number } } | null
  )?.depot_location;

  if (!depotLocation) {
    // Zelfde bekende gat als route-optimize (PRD §19 A-13) — geen depot
    // ingesteld betekent geen locatie om weer voor op te vragen. Geen fout,
    // gewoon niets te melden.
    return new Response(JSON.stringify({ candidates: [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const provider = new OpenMeteoProvider();
  let hours: Awaited<ReturnType<typeof provider.getHourlyForecast>>;
  try {
    hours = await provider.getHourlyForecast(depotLocation, body.date);
  } catch (err) {
    // AP-04: weer-API onbereikbaar — degradeer, blokkeer de rest van de keten niet.
    log('error', 'agent-weather: forecast onbereikbaar (AP-04)', {
      message: err instanceof Error ? err.message : String(err),
    });
    return new Response(JSON.stringify({ candidates: [], degraded: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const aggregate = aggregateDailyWeather(hours);
  if (aggregate) {
    const { error: cacheError } = await supabase.from('weerdata_cache').upsert(
      {
        area_key: buildAreaKey(depotLocation),
        forecast_date: body.date,
        precipitation_probability: aggregate.precipitationProbabilityPercent,
        precipitation_mm_per_hour: aggregate.precipitationMmPerHour,
        min_temp_celsius: aggregate.minTempCelsius,
        wind_bft: aggregate.maxWindBft,
        provider: 'open-meteo',
      },
      { onConflict: 'area_key,forecast_date,provider' },
    );
    if (cacheError) {
      log('error', 'agent-weather: kon weerdata-cache niet schrijven', { code: cacheError.code });
    }
  }

  const riskHours = detectWeatherRisks(hours);
  if (riskHours.length === 0) {
    return new Response(JSON.stringify({ candidates: [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { data: jobs, error: jobsError } = await supabase
    .from('jobs')
    .select(
      `id, service_start, route_id,
       service_agreements!jobs_service_agreement_id_fkey(
         services!service_agreements_service_id_fkey(is_weather_sensitive, weather_sensitivity_type)
       ),
       routes!jobs_route_id_fkey(employee_id, employees!routes_employee_id_fkey(first_name))`,
    )
    .eq('company_id', body.company_id)
    .eq('scheduled_date', body.date)
    .neq('status', 'cancelled');

  if (jobsError) {
    log('error', 'agent-weather: kon beurten niet ophalen', { code: jobsError.code });
    return errorResponse('internal_error', 'Kon beurten niet ophalen.', 500);
  }

  const weatherSensitiveJobs: WeatherSensitiveJob[] = [];
  for (const job of jobs ?? []) {
    const service = (
      job.service_agreements as {
        services: { is_weather_sensitive: boolean; weather_sensitivity_type: string | null } | null;
      } | null
    )?.services;
    const route = job.routes as {
      employee_id: string;
      employees: { first_name: string } | null;
    } | null;

    if (!service?.is_weather_sensitive || !service.weather_sensitivity_type) continue;
    if (!route || !job.service_start) continue;

    weatherSensitiveJobs.push({
      jobId: job.id,
      employeeId: route.employee_id,
      employeeFirstName: route.employees?.first_name ?? 'Onbekend',
      sensitivityType: service.weather_sensitivity_type as WeatherSensitiveJob['sensitivityType'],
      serviceStartHour: new Date(job.service_start).getUTCHours(),
    });
  }

  const candidates: RawCandidate[] = buildWeatherCandidates({
    date: body.date,
    riskHours,
    jobs: weatherSensitiveJobs,
  });

  return new Response(JSON.stringify({ candidates }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
