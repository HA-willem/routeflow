'use server';

import { revalidatePath } from 'next/cache';

import { requireOnboardedUser } from '@/lib/auth/session';
import {
  actionError,
  actionSuccess,
  mapPostgresError,
  validationActionError,
  type ActionResult,
} from '@/lib/errors';
import { logger } from '@/lib/logging/logger';
import { addDaysIso } from '@/lib/planning/dates';
import { createClient } from '@/lib/supabase/server';
import { manualJobSchema } from '@/lib/validation/manual-job';

/**
 * Server Actions rond de routing-Edge-Functions (41_CodingStandards.md § 7:
 * "Server Action is de dunne UI-schil, de Edge Function bevat de daadwerkelijke
 * logica"). De eigenlijke optimalisatie/verplaatsing-logica staat in
 * supabase/functions/route-optimize en route-move-job (ADR-008) — hier alleen
 * auth, input-doorgifte en het uniforme foutmodel (lib/errors.ts).
 */

interface EdgeFunctionError {
  code: string;
  message: string;
  hint?: string;
  status?: number;
}

interface MoveJobResult {
  success: true;
}

interface OptimizeResult {
  route: { id: string } | null;
  stops: unknown[];
  unplaceable_job_ids: string[];
  message?: string;
}

export async function moveJob(params: {
  jobId: string;
  targetRouteId: string;
  position: number;
}): Promise<ActionResult<MoveJobResult>> {
  const { profile } = await requireOnboardedUser();
  const supabase = await createClient();

  // V2-voorbereiding (15_AIPlanner.md § 10, 038_correction_log.sql): oude
  // route/positie vastleggen vóór de move, zodat de logregel na een
  // geslaagde move zowel oud als nieuw kan tonen.
  const { data: jobBefore } = await supabase
    .from('jobs')
    .select('route_id, sequence')
    .eq('id', params.jobId)
    .maybeSingle();

  const { data, error } = await supabase.functions.invoke<
    MoveJobResult | { error: EdgeFunctionError }
  >('route-move-job', {
    body: {
      job_id: params.jobId,
      target_route_id: params.targetRouteId,
      position: params.position,
    },
  });

  if (error || !data || 'error' in data) {
    const edgeError = data && 'error' in data ? data.error : null;
    if (!edgeError) {
      logger.error('moveJob: route-move-job onbereikbaar', { message: error?.message });
    }
    return actionError({
      code: edgeError?.code ?? 'move_job_failed',
      message: edgeError?.message ?? 'Beurt kon niet worden verplaatst. Probeer het opnieuw.',
      hint: edgeError?.hint,
    });
  }

  // Best-effort, non-blocking: alleen het schrijfpad van "leren van
  // correcties" (V2-concept) — een loggingfout mag een geslaagde move nooit
  // laten falen.
  const { error: logError } = await supabase.from('correction_log').insert({
    company_id: profile.company_id,
    job_id: params.jobId,
    correction_type: 'moved',
    old_value: { route_id: jobBefore?.route_id ?? null, sequence: jobBefore?.sequence ?? null },
    new_value: { route_id: params.targetRouteId, position: params.position },
    created_by: profile.id,
  });
  if (logError) {
    logger.warn('moveJob: correction_log-schrijven mislukt (non-blocking)', {
      message: logError.message,
    });
  }

  revalidatePath('/planning');
  return actionSuccess(data);
}

/**
 * Verplaatst een beurt naar een (medewerker, datum)-combinatie i.p.v. een
 * bekende `targetRouteId` — nodig voor de ZZP-weekweergave (WeekBoard) waar
 * een dagkolom nog geen route heeft zolang er niets naartoe gesleept is
 * (`routes` heeft dan gewoonweg nog geen rij, RLS: alleen owner/admin/planner
 * mag er een aanmaken, 003_rls_baseline.sql-precedent). Maakt de route lazy
 * aan via het gewone RLS-pad (niet de service-rol) en hergebruikt daarna
 * exact dezelfde `moveJob` — geen tweede uitvoerpad naast route-move-job.
 */
export async function moveJobToDate(params: {
  jobId: string;
  employeeId: string;
  targetDate: string;
  position: number;
}): Promise<ActionResult<MoveJobResult>> {
  const { profile } = await requireOnboardedUser();
  const supabase = await createClient();

  const { data: existingRoute } = await supabase
    .from('routes')
    .select('id')
    .eq('company_id', profile.company_id)
    .eq('employee_id', params.employeeId)
    .eq('route_date', params.targetDate)
    .maybeSingle();

  let targetRouteId = existingRoute?.id ?? null;
  if (!targetRouteId) {
    const { data: created, error: createError } = await supabase
      .from('routes')
      .insert({
        company_id: profile.company_id,
        employee_id: params.employeeId,
        route_date: params.targetDate,
      })
      .select('id')
      .single();
    if (createError || !created) {
      logger.error('moveJobToDate: route aanmaken mislukt', { message: createError?.message });
      return actionError({
        code: createError?.code ?? 'route_create_failed',
        message: 'Kon geen route aanmaken voor deze dag. Probeer het opnieuw.',
      });
    }
    targetRouteId = created.id;
  }

  return moveJob({ jobId: params.jobId, targetRouteId, position: params.position });
}

export async function optimizeEmployeeDay(params: {
  employeeId: string;
  date: string;
}): Promise<ActionResult<OptimizeResult>> {
  await requireOnboardedUser();
  const supabase = await createClient();

  const { data, error } = await supabase.functions.invoke<
    OptimizeResult | { error: EdgeFunctionError }
  >('route-optimize', {
    body: { employee_id: params.employeeId, date: params.date },
  });

  if (error || !data || 'error' in data) {
    const edgeError = data && 'error' in data ? data.error : null;
    if (!edgeError) {
      logger.error('optimizeEmployeeDay: route-optimize onbereikbaar', { message: error?.message });
    }
    return actionError({
      code: edgeError?.code ?? 'optimize_failed',
      message: edgeError?.message ?? 'Route kon niet worden geoptimaliseerd. Probeer het opnieuw.',
      hint: edgeError?.hint,
    });
  }

  revalidatePath('/planning');
  revalidatePath('/planning/wachtrij');
  return actionSuccess(data);
}

interface ReplanningResult {
  proposal_id: string | null;
}

/**
 * Ziek/verlof melden (BR-802, 43_AI_Agents.md § 5, Replanning Agent —
 * Sprint 7-vervolg). Twee stappen, nooit één: (1) legt de afwezigheid vast in
 * `availability` (bestaand schema, geen nieuwe tabel); (2) roept direct
 * agent-replanning aan zodat het herplan-voorstel meteen beschikbaar is,
 * geen wachttijd tot een toekomstige nachtcyclus (ADR-011 § 6: "een
 * user-actie tijdens de dag genereert een gerichte tussentijdse Replanning
 * Agent-aanroep"). `proposal_id: null` is een geldige uitkomst (bv. geen
 * route die dag) — geen fout.
 */
export async function reportSickLeave(params: {
  employeeId: string;
  date: string;
  reason?: string;
}): Promise<ActionResult<ReplanningResult>> {
  const { profile } = await requireOnboardedUser();
  const supabase = await createClient();

  const { error: availabilityError } = await supabase.from('availability').insert({
    company_id: profile.company_id,
    employee_id: params.employeeId,
    date: params.date,
    status: 'sick',
    reason: params.reason ?? null,
  });

  if (availabilityError) {
    return mapPostgresError(
      availabilityError,
      {
        code: 'already_reported',
        message: 'Deze medewerker is al afwezig gemeld op deze datum.',
      },
      {
        code: 'availability_insert_failed',
        message: 'Kon de afwezigheid niet vastleggen. Probeer het opnieuw.',
      },
    );
  }

  const { data, error } = await supabase.functions.invoke<
    ReplanningResult | { error: EdgeFunctionError }
  >('agent-replanning', {
    body: { company_id: profile.company_id, employee_id: params.employeeId, date: params.date },
  });

  if (error || !data || 'error' in data) {
    const edgeError = data && 'error' in data ? data.error : null;
    if (!edgeError) {
      logger.error('reportSickLeave: agent-replanning onbereikbaar', { message: error?.message });
    }
    // Afwezigheid staat al vast; alleen het voorstel kon niet gegenereerd
    // worden — de planner ziet dit terug als een foutmelding, maar de
    // ziekmelding zelf is niet verloren gegaan.
    return actionError({
      code: edgeError?.code ?? 'replanning_failed',
      message:
        edgeError?.message ??
        'Afwezigheid is vastgelegd, maar het herplanvoorstel kon niet worden gegenereerd.',
      hint: edgeError?.hint,
    });
  }

  revalidatePath('/');
  revalidatePath('/planning');
  return actionSuccess(data);
}

export interface CustomerObjectJobOption {
  objectId: string;
  addressLabel: string;
  agreements: { id: string; serviceId: string; serviceName: string }[];
}

interface ObjectWithAgreementsRow {
  id: string;
  address_line1: string;
  city: string;
  service_agreements: {
    id: string;
    service_id: string;
    status: string;
    services: { name: string } | null;
  }[];
}

/**
 * FR-029: klant-objecten + hun actieve dienstafspraken, voor de "Beurt
 * toevoegen"-dialoog op het planning-board (klant is al gekozen via
 * `searchCustomersForCommand`, hier alleen het vervolg).
 */
export async function getCustomerObjectsForJob(
  customerId: string,
): Promise<CustomerObjectJobOption[]> {
  await requireOnboardedUser();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('objects')
    .select(
      `id, address_line1, city,
       service_agreements!service_agreements_object_id_fkey(
         id, service_id, status,
         services!service_agreements_service_id_fkey(name)
       )`,
    )
    .eq('customer_id', customerId)
    .is('archived_at', null)
    .order('address_line1', { ascending: true })
    .returns<ObjectWithAgreementsRow[]>();

  if (error) {
    logger.error('getCustomerObjectsForJob: query mislukt', { code: error.code, customerId });
    return [];
  }

  return (data ?? []).map((row) => ({
    objectId: row.id,
    addressLabel: `${row.address_line1}, ${row.city}`,
    agreements: row.service_agreements
      .filter((agreement) => agreement.status === 'active')
      .map((agreement) => ({
        id: agreement.id,
        serviceId: agreement.service_id,
        serviceName: agreement.services?.name ?? 'Dienst',
      })),
  }));
}

export interface AddManualJobResult {
  jobId: string;
  /** true als de dag te vol is om deze beurt daadwerkelijk in te plannen (BR-202). */
  unplaceable: boolean;
}

/**
 * FR-029: handmatige beurt-toevoeging op dag/tijdstip. Twee paden voor de
 * onderliggende dienstafspraak (AC2): een bestaande kiezen, of — als die er
 * niet is — inline een eenmalige (`frequency_type='once'`) aanmaken, analoog
 * aan `createServiceAgreement` maar zonder de horizon-generatie-aanroep: de
 * planner koos hier zelf al de exacte datum, dus `planning-generate` zou
 * alleen een tweede, ongewenste datum kunnen toevoegen.
 *
 * De nieuwe beurt is altijd `locked=true` (FR-026) — een handmatig vastgezet
 * tijdstip mag niet automatisch verschuiven bij een latere herplanning. Na
 * het aanmaken hergebruikt dit `optimizeEmployeeDay` (FR-022) om de beurt in
 * de dagroute te plaatsen en tijden te berekenen — geen los "voeg toe aan
 * route"-pad ernaast.
 */
export async function addManualJob(input: unknown): Promise<ActionResult<AddManualJobResult>> {
  const parsed = manualJobSchema.safeParse(input);
  if (!parsed.success) {
    return validationActionError(parsed.error, 'Controleer de ingevulde gegevens.');
  }

  const { profile } = await requireOnboardedUser();
  const supabase = await createClient();
  const values = parsed.data;

  let serviceAgreementId = values.serviceAgreementId;

  if (!serviceAgreementId && values.newService) {
    const { data: pricing, error: pricingError } = await supabase
      .from('pricings')
      .insert({
        company_id: profile.company_id,
        type: values.newService.pricingType,
        amount_cents:
          values.newService.pricingType === 'per_job' && values.newService.amountEuros !== undefined
            ? Math.round(values.newService.amountEuros * 100)
            : null,
        hourly_rate_cents:
          values.newService.pricingType === 'hourly' &&
          values.newService.hourlyRateEuros !== undefined
            ? Math.round(values.newService.hourlyRateEuros * 100)
            : null,
        vat_rate: values.newService.vatRate,
      })
      .select('id')
      .single();

    if (pricingError || !pricing) {
      logger.error('addManualJob: pricing insert mislukt', { code: pricingError?.code });
      return actionError({
        code: pricingError?.code || 'create_pricing_failed',
        message: 'De prijsafspraak kon niet worden aangemaakt. Probeer het opnieuw.',
      });
    }

    const { data: agreement, error: agreementError } = await supabase
      .from('service_agreements')
      .insert({
        company_id: profile.company_id,
        object_id: values.objectId,
        service_id: values.newService.serviceId,
        pricing_id: pricing.id,
        frequency_type: 'once',
        frequency_interval_days: null,
        preferred_day: null,
        preferred_daypart: null,
        flexibility_window_days: 0,
        call_ahead_required: false,
      })
      .select('id')
      .single();

    if (agreementError || !agreement) {
      if (agreementError?.code === '23505') {
        return actionError({
          code: 'service_agreement_exists',
          message: 'Er bestaat al een dienstafspraak voor deze dienst bij dit object.',
        });
      }
      logger.error('addManualJob: agreement insert mislukt', { code: agreementError?.code });
      return actionError({
        code: agreementError?.code || 'create_service_agreement_failed',
        message: 'De eenmalige dienstafspraak kon niet worden aangemaakt. Probeer het opnieuw.',
      });
    }

    serviceAgreementId = agreement.id;
  }

  if (!serviceAgreementId) {
    return actionError({
      code: 'missing_service_agreement',
      message: 'Kies een dienstafspraak of maak een nieuwe eenmalige afspraak aan.',
    });
  }

  const { data: agreementRow, error: agreementFetchError } = await supabase
    .from('service_agreements')
    .select('services!service_agreements_service_id_fkey(standard_duration_minutes)')
    .eq('id', serviceAgreementId)
    .eq('company_id', profile.company_id)
    .single<{ services: { standard_duration_minutes: number } | null }>();

  const durationMinutes = agreementRow?.services?.standard_duration_minutes;
  if (agreementFetchError || !durationMinutes) {
    logger.error('addManualJob: dienstafspraak/duur niet gevonden', {
      code: agreementFetchError?.code,
      serviceAgreementId,
    });
    return actionError({
      code: 'service_agreement_not_found',
      message: 'De gekozen dienstafspraak kon niet worden gevonden.',
    });
  }

  const { data: job, error: jobError } = await supabase
    .from('jobs')
    .insert({
      company_id: profile.company_id,
      service_agreement_id: serviceAgreementId,
      scheduled_date: values.scheduledDate,
      status: 'planned',
      locked: true,
      locked_reason: `${values.scheduledTime} — ${values.note}`.slice(0, 255),
      estimated_duration_minutes: durationMinutes,
    })
    .select('id')
    .single();

  if (jobError || !job) {
    return mapPostgresError(
      jobError,
      {
        code: 'job_exists',
        message: 'Er bestaat al een beurt voor deze dienstafspraak op deze datum.',
      },
      {
        code: 'create_job_failed',
        message: 'De beurt kon niet worden aangemaakt. Probeer het opnieuw.',
      },
    );
  }

  // FR-029 AC5: dagroute herberekent (zelfde gedrag als drag-and-drop, FR-022) —
  // route-optimize plukt nieuw-toegevoegde, nog niet-geroute beurten van deze
  // dag automatisch op; geen apart "voeg toe aan route"-pad nodig.
  const optimizeResult = await optimizeEmployeeDay({
    employeeId: values.employeeId,
    date: values.scheduledDate,
  });
  const unplaceable =
    optimizeResult.success && optimizeResult.data.unplaceable_job_ids.includes(job.id);

  revalidatePath('/planning');
  return actionSuccess({ jobId: job.id, unplaceable });
}

/** Zelfde bovengrens als serviceAgreementSchema.flexibilityWindowDays (lib/validation/service-agreement.ts). */
const MAX_FLEXIBILITY_WINDOW_DAYS = 21;

export interface FillDayCandidate {
  jobId: string;
  customerName: string;
  addressLine: string;
  serviceName: string;
  originalDate: string;
  estimatedDurationMinutes: number;
}

interface FillDayCandidateRow {
  id: string;
  scheduled_date: string;
  estimated_duration_minutes: number;
  service_agreements: {
    flexibility_window_days: number;
    services: { name: string } | null;
    objects: {
      address_line1: string;
      customers: { name: string } | null;
    } | null;
  } | null;
}

/**
 * FR-030 AC2: kandidaat-beurten voor "Vul de dag" — niet-vergrendeld, nog
 * niet geroute (`route_id is null`, dus vrij om aan wie dan ook toegewezen
 * te worden, zelfde aanname als route-optimize) en waarvan de huidige datum
 * ná `date` ligt maar binnen het BR-101-flexibiliteitsvenster van hún eigen
 * dienstafspraak — d.w.z. naar voren halen is toegestaan.
 */
export async function getFillDayCandidates(params: { date: string }): Promise<FillDayCandidate[]> {
  const { profile } = await requireOnboardedUser();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('jobs')
    .select(
      `id, scheduled_date, estimated_duration_minutes,
       service_agreements!jobs_service_agreement_id_fkey(
         flexibility_window_days,
         services!service_agreements_service_id_fkey(name),
         objects!service_agreements_object_id_fkey(
           address_line1,
           customers!objects_customer_id_fkey(name)
         )
       )`,
    )
    .eq('company_id', profile.company_id)
    .eq('status', 'proposed')
    .eq('locked', false)
    .is('route_id', null)
    .gte('scheduled_date', params.date)
    .lte('scheduled_date', addDaysIso(params.date, MAX_FLEXIBILITY_WINDOW_DAYS))
    .returns<FillDayCandidateRow[]>();

  if (error) {
    logger.error('getFillDayCandidates: query mislukt', { code: error.code });
    return [];
  }

  return (data ?? [])
    .filter((row) => {
      const flexibilityWindowDays = row.service_agreements?.flexibility_window_days ?? 0;
      return row.scheduled_date <= addDaysIso(params.date, flexibilityWindowDays);
    })
    .map((row) => {
      const object = row.service_agreements?.objects ?? null;
      return {
        jobId: row.id,
        customerName: object?.customers?.name ?? 'Onbekende klant',
        addressLine: object?.address_line1 ?? '—',
        serviceName: row.service_agreements?.services?.name ?? 'Dienst',
        originalDate: row.scheduled_date,
        estimatedDurationMinutes: row.estimated_duration_minutes,
      };
    });
}

export interface FillDayResult {
  movedCount: number;
  skippedCount: number;
  unplaceableCount: number;
}

/**
 * FR-030 AC4/AC5: verplaatst de gekozen kandidaten naar `date` (één voor één,
 * zodat een enkele BR-203-botsing niet de hele batch laat falen), legt de dag
 * vast als `available` (eerste echte schrijfpad voor die statuswaarde), en
 * herberekent daarna de dagroute (hergebruikt `optimizeEmployeeDay`, FR-022).
 */
export async function fillDay(params: {
  employeeId: string;
  date: string;
  jobIds: string[];
}): Promise<ActionResult<FillDayResult>> {
  const { profile } = await requireOnboardedUser();
  const supabase = await createClient();

  const { error: availabilityError } = await supabase.from('availability').upsert(
    {
      company_id: profile.company_id,
      employee_id: params.employeeId,
      date: params.date,
      status: 'available',
    },
    { onConflict: 'company_id,employee_id,date' },
  );

  if (availabilityError) {
    logger.error('fillDay: availability-upsert mislukt', { code: availabilityError.code });
  }

  let movedCount = 0;
  let skippedCount = 0;

  for (const jobId of params.jobIds) {
    const { error, count } = await supabase
      .from('jobs')
      .update({ scheduled_date: params.date }, { count: 'exact' })
      .eq('id', jobId)
      .eq('company_id', profile.company_id)
      .eq('status', 'proposed')
      .eq('locked', false)
      .is('route_id', null);

    if (error || !count) {
      skippedCount += 1;
      if (error) {
        logger.error('fillDay: job-update mislukt', { code: error.code, jobId });
      }
    } else {
      movedCount += 1;
    }
  }

  if (movedCount === 0) {
    return actionError({
      code: 'no_jobs_moved',
      message: 'Geen van de gekozen beurten kon verplaatst worden. Probeer het opnieuw.',
    });
  }

  const optimizeResult = await optimizeEmployeeDay({
    employeeId: params.employeeId,
    date: params.date,
  });

  if (!optimizeResult.success) {
    // De datumwijziging op de beurten staat al (movedCount > 0 hierboven) —
    // dat teruggedraaid krijgen is meer risico dan waard (de gebruiker moet
    // dan opnieuw dezelfde selectie maken). In plaats daarvan een eerlijke
    // foutmelding i.p.v. stilzwijgend "geslaagd" te melden terwijl er geen
    // route/route_id tot stand kwam — anders lijkt de dag zonder verklaring
    // leeg te blijven (bv. bij een ontbrekende depotlocatie/routing-config,
    // PRD § 19 A-13).
    logger.error('fillDay: optimizeEmployeeDay mislukt na verplaatsen', {
      code: optimizeResult.error.code,
      employeeId: params.employeeId,
      date: params.date,
    });
    revalidatePath('/planning');
    return actionError({
      code: optimizeResult.error.code,
      message: `${movedCount} beurt(en) zijn verzet naar ${params.date}, maar de route kon niet worden herberekend (${optimizeResult.error.message}). Ververs de pagina en probeer "Plan opnieuw" zodra dit is opgelost.`,
      hint: optimizeResult.error.hint,
    });
  }

  const unplaceableCount = optimizeResult.data.unplaceable_job_ids.filter((id) =>
    params.jobIds.includes(id),
  ).length;

  revalidatePath('/planning');
  return actionSuccess({ movedCount, skippedCount, unplaceableCount });
}
