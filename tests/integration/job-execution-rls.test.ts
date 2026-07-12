import { beforeAll, describe, expect, it } from 'vitest';

import {
  adminClient,
  createCompanyUserSession,
  signUpAndConfirm,
  uniqueTestEmail,
  type TestSupabaseClient,
} from './helpers';

/**
 * Integratietests voor de Sprint 5-uitvoeringsflow (29_MobieleApp.md § 2.2/2.3,
 * 017_jobs_execution.sql, 020_job_completion.sql, 019_invoicing_mvp.sql).
 * Codificeert: employee-RLS + kolom-trigger, complete_job()'s conceptfactuur,
 * BR-020-nummering (next_invoice_number), en de Facturen-rechtenmatrix
 * (23_Gebruikersrollen.md § 2: Admin/Administratie U, Eigenaar/Planner alleen R).
 */
describe('Sprint 5 — job execution + MVP invoicing', () => {
  let ownerClient: TestSupabaseClient;
  let companyId: string;
  let employeeClient: TestSupabaseClient;
  let employeeUserId: string;
  let otherEmployeeClient: TestSupabaseClient;
  let adminUserClient: TestSupabaseClient;
  let jobId: string;
  let invoiceId: string;

  beforeAll(async () => {
    ownerClient = await signUpAndConfirm(uniqueTestEmail('exec-owner'));
    const { data: company } = await ownerClient.rpc('onboard_company', {
      company_name: `Execution Tenant ${crypto.randomUUID().slice(0, 8)}`,
      owner_full_name: 'Eigenaar',
    });
    companyId = requireId(company?.id);
    await ownerClient.auth.updateUser({ data: { company_id: companyId } });
    await ownerClient.auth.refreshSession();

    const { data: customer } = await ownerClient
      .from('customers')
      .insert({
        company_id: companyId,
        name: 'Klant Uitvoering',
        type: 'person',
        payment_terms_days: 14,
      })
      .select('id')
      .single();

    const { data: object } = await ownerClient
      .from('objects')
      .insert({
        company_id: companyId,
        customer_id: requireId(customer?.id),
        address_line1: `Uitvoeringsstraat ${crypto.randomUUID().slice(0, 8)}`,
        postal_code: '1234 AB',
        city: 'Amsterdam',
        type: 'residence',
      })
      .select('id')
      .single();

    const { data: service } = await ownerClient
      .from('services')
      .insert({
        company_id: companyId,
        name: 'Glasbewassing buiten',
        standard_duration_minutes: 45,
        standard_price_cents: 4000,
        vat_rate: 21,
      })
      .select('id')
      .single();

    const { data: pricing } = await ownerClient
      .from('pricings')
      .insert({ company_id: companyId, type: 'per_job', amount_cents: 5000, vat_rate: 21 })
      .select('id')
      .single();

    const { data: agreement } = await ownerClient
      .from('service_agreements')
      .insert({
        company_id: companyId,
        object_id: requireId(object?.id),
        service_id: requireId(service?.id),
        pricing_id: requireId(pricing?.id),
        frequency_type: 'weekly',
        frequency_interval_days: 7,
        flexibility_window_days: 3,
      })
      .select('id')
      .single();

    const { data: employee } = await ownerClient
      .from('employees')
      .insert({
        company_id: companyId,
        first_name: 'Piet',
        last_name: 'Jansen',
        phone: '0612345678',
      })
      .select('id')
      .single();

    const { data: route } = await ownerClient
      .from('routes')
      .insert({
        company_id: companyId,
        employee_id: requireId(employee?.id),
        route_date: '2026-08-03',
      })
      .select('id')
      .single();

    const { data: job } = await ownerClient
      .from('jobs')
      .insert({
        company_id: companyId,
        service_agreement_id: requireId(agreement?.id),
        route_id: requireId(route?.id),
        scheduled_date: '2026-08-03',
        status: 'planned',
        estimated_duration_minutes: 45,
      })
      .select('id')
      .single();
    jobId = requireId(job?.id);

    const employeeSession = await createCompanyUserSession(
      companyId,
      uniqueTestEmail('exec-employee'),
      'employee',
    );
    employeeClient = employeeSession.client;
    employeeUserId = employeeSession.userId;
    await ownerClient
      .from('employees')
      .update({ user_id: employeeUserId })
      .eq('id', requireId(employee?.id));

    const otherCompany = await signUpAndConfirm(uniqueTestEmail('exec-other-owner'));
    const { data: otherCompanyRow } = await otherCompany.rpc('onboard_company', {
      company_name: `Other Tenant ${crypto.randomUUID().slice(0, 8)}`,
      owner_full_name: 'Andere Eigenaar',
    });
    const otherSession = await createCompanyUserSession(
      requireId(otherCompanyRow?.id),
      uniqueTestEmail('exec-other-employee'),
      'employee',
    );
    otherEmployeeClient = otherSession.client;

    const adminSession = await createCompanyUserSession(
      companyId,
      uniqueTestEmail('exec-admin'),
      'admin',
    );
    adminUserClient = adminSession.client;
  });

  it('een andere-bedrijf-medewerker kan de beurt niet starten (RLS-tenant-isolatie)', async () => {
    const { data, error } = await otherEmployeeClient.rpc('start_job', { p_job_id: jobId });
    expect(data).toBeNull();
    expect(error).not.toBeNull();
  });

  it('medewerker kan de eigen beurt starten', async () => {
    const { data, error } = await employeeClient.rpc('start_job', { p_job_id: jobId });
    expect(error).toBeNull();
    expect(data?.status).toBe('en_route');
    expect(data?.started_at).toBeTruthy();
  });

  it('trigger blokkeert een medewerker die planningsvelden probeert te wijzigen', async () => {
    const { error } = await employeeClient.from('jobs').update({ locked: true }).eq('id', jobId);
    expect(error).not.toBeNull();
  });

  it('medewerker kan pauzeren en hervatten', async () => {
    const { data: paused } = await employeeClient.rpc('pause_job', { p_job_id: jobId });
    expect(paused?.paused_at).toBeTruthy();

    const { data: resumed } = await employeeClient.rpc('resume_job', { p_job_id: jobId });
    expect(resumed?.paused_at).toBeNull();
    expect(resumed?.paused_seconds).toBeGreaterThanOrEqual(0);
  });

  it('medewerker kan de beurt afronden — genereert een conceptfactuur met correcte BTW', async () => {
    const { data, error } = await employeeClient
      .rpc('complete_job', { p_job_id: jobId, p_notes: 'Alles gedaan' })
      .single();
    expect(error).toBeNull();

    const result = data as unknown as {
      job: { status: string; actual_duration_minutes: number };
      invoice: { id: string; status: string; total_amount_cents: number; total_tax_cents: number };
    };
    expect(result.job.status).toBe('completed');
    expect(result.invoice.status).toBe('draft');
    // pricing per_job amount_cents=5000, vat_rate=21% -> 1050 BTW, 6050 totaal
    expect(result.invoice.total_tax_cents).toBe(1050);
    expect(result.invoice.total_amount_cents).toBe(6050);
    invoiceId = result.invoice.id;
  });

  it('medewerker heeft geen leesrecht op facturen (23_Gebruikersrollen.md § 2)', async () => {
    const { data } = await employeeClient.from('invoices').select('*').eq('id', invoiceId);
    expect(data).toEqual([]);
  });

  it('eigenaar (alleen R op Facturen) mag geen factuurnummer toekennen', async () => {
    const { error } = await ownerClient.rpc('next_invoice_number', {
      p_year: 2026,
      p_company_code: 'ABC',
    });
    expect(error).not.toBeNull();
  });

  it('admin kan gap-loze, sequentiële factuurnummers toekennen (BR-020)', async () => {
    const { data: first } = await adminUserClient.rpc('next_invoice_number', {
      p_year: 2026,
      p_company_code: 'ABC',
    });
    const { data: second } = await adminUserClient.rpc('next_invoice_number', {
      p_year: 2026,
      p_company_code: 'ABC',
    });
    expect(first).toMatch(/^ABC-2026-\d{5}$/);
    expect(second).toMatch(/^ABC-2026-\d{5}$/);

    const firstSeq = Number(first?.split('-')[2]);
    const secondSeq = Number(second?.split('-')[2]);
    expect(secondSeq).toBe(firstSeq + 1);
  });

  it('mark_invoice_paid weigert een conceptfactuur (moet eerst verzonden zijn)', async () => {
    const { error } = await adminUserClient.rpc('mark_invoice_paid', { p_invoice_id: invoiceId });
    expect(error).not.toBeNull();
  });

  it('admin kan een verzonden factuur als betaald markeren', async () => {
    // Geen client heeft een UPDATE-policy op invoices (bewust, zie
    // 019_invoicing_mvp.sql) — de "sent"-status hier zetten kan daarom alleen
    // via de service-role-client, puur om de precondition voor deze test op
    // te zetten (niet de app-flow zelf, die loopt via sendInvoice()).
    await adminClient()
      .from('invoices')
      .update({ status: 'sent', invoice_number: 'ABC-2026-00099' })
      .eq('id', invoiceId);

    const { data, error } = await adminUserClient.rpc('mark_invoice_paid', {
      p_invoice_id: invoiceId,
    });
    expect(error).toBeNull();
    expect(data?.status).toBe('paid');
    expect(data?.paid_at).toBeTruthy();
  });
});

function requireId(id: string | undefined): string {
  if (!id) {
    throw new Error('Verwachtte een id.');
  }
  return id;
}
