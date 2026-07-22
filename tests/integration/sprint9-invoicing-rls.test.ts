import { beforeAll, describe, expect, it } from 'vitest';

import {
  adminClient,
  createCompanyUserSession,
  signUpAndConfirm,
  uniqueTestEmail,
  type TestSupabaseClient,
} from './helpers';

/**
 * Sprint 10 — vult de RLS-negatieve-testsuite (31_Testplan.md § 4, NFR-301)
 * aan voor de Sprint 9-facturatiewijzigingen: `invoices`/`invoice_lines`
 * hadden nog geen eigen RLS-testbestand, en `create_credit_invoice()`
 * (035_invoice_credit_notes.sql) is een nieuwe SECURITY DEFINER-functie die
 * zijn eigen company-scoping herimplementeert (bypasst RLS intern) — precies
 * het soort code dat het meest een negatieve test verdient.
 *
 * `invoices`/`invoice_lines` hebben geen directe INSERT-policy voor
 * `authenticated` (alleen via complete_job()/generate_subscription_invoices()/
 * create_credit_invoice(), allemaal SECURITY DEFINER) — fixtures worden
 * daarom via de service-role aangemaakt (adminClient(), zelfde patroon als
 * tests/e2e/sprint9-credit-invoice.spec.ts).
 */
describe('invoices/invoice_lines RLS + create_credit_invoice (NFR-301, FR-068)', () => {
  let clientB: TestSupabaseClient;
  let adminA: TestSupabaseClient;
  let adminB: TestSupabaseClient;
  let companyAId: string;
  let invoiceAId: string;

  beforeAll(async () => {
    const clientA = await signUpAndConfirm(uniqueTestEmail('invoices-a'));
    const { data: companyA } = await clientA.rpc('onboard_company', {
      company_name: `Invoices Tenant A ${crypto.randomUUID().slice(0, 8)}`,
      owner_full_name: 'Eigenaar A',
    });
    companyAId = requireId(companyA?.id);
    await clientA.auth.updateUser({ data: { company_id: companyAId } });
    await clientA.auth.refreshSession();

    clientB = await signUpAndConfirm(uniqueTestEmail('invoices-b'));
    const { data: companyB } = await clientB.rpc('onboard_company', {
      company_name: `Invoices Tenant B ${crypto.randomUUID().slice(0, 8)}`,
      owner_full_name: 'Eigenaar B',
    });
    const companyBId = requireId(companyB?.id);
    await clientB.auth.updateUser({ data: { company_id: companyBId } });
    await clientB.auth.refreshSession();

    // create_credit_invoice() staat uitsluitend Admin/Administratie toe
    // (zelfde rolcontrole als next_invoice_number(), 019_invoicing_mvp.sql) —
    // Eigenaar heeft alleen Read op Facturen (23_Gebruikersrollen.md § 2).
    ({ client: adminA } = await createCompanyUserSession(
      companyAId,
      uniqueTestEmail('invoices-admin-a'),
      'admin',
    ));
    ({ client: adminB } = await createCompanyUserSession(
      companyBId,
      uniqueTestEmail('invoices-admin-b'),
      'admin',
    ));

    const admin = adminClient();
    const { data: customer } = await admin
      .from('customers')
      .insert({ company_id: companyAId, name: 'RLS-test klant A', type: 'person' })
      .select('id')
      .single();
    const { data: invoice } = await admin
      .from('invoices')
      .insert({
        company_id: companyAId,
        customer_id: requireId(customer?.id),
        status: 'sent',
        invoice_number: `RLS-TEST-${crypto.randomUUID().slice(0, 8)}`,
        invoice_date: new Date().toISOString().slice(0, 10),
        due_date: new Date().toISOString().slice(0, 10),
        total_amount_cents: 1000,
        total_tax_cents: 100,
        sent_at: new Date().toISOString(),
      })
      .select('id')
      .single();
    invoiceAId = requireId(invoice?.id);
    await admin.from('invoice_lines').insert({
      company_id: companyAId,
      invoice_id: invoiceAId,
      description: 'RLS-testregel',
      quantity: 1,
      unit_price_cents: 1000,
      vat_rate: 10,
      vat_amount_cents: 100,
      total_amount_cents: 1100,
      sequence: 1,
    });
  });

  it('bedrijf B kan de factuur van bedrijf A niet lezen', async () => {
    const { data } = await clientB.from('invoices').select('*').eq('id', invoiceAId);
    expect(data).toEqual([]);
  });

  it('bedrijf B kan de factuurregels van bedrijf A niet lezen', async () => {
    const { data } = await clientB.from('invoice_lines').select('*').eq('invoice_id', invoiceAId);
    expect(data).toEqual([]);
  });

  it('create_credit_invoice() weigert een factuur-id buiten het eigen bedrijf', async () => {
    const { data, error } = await adminB.rpc('create_credit_invoice', {
      p_invoice_id: invoiceAId,
      p_lines: [{ description: 'Poging vanuit bedrijf B', amount_cents: 100, vat_rate: 21 }],
    });
    expect(data).toBeNull();
    expect(error).not.toBeNull();
  });

  it('create_credit_invoice() werkt voor de eigen Admin-gebruiker', async () => {
    const { data, error } = await adminA.rpc('create_credit_invoice', {
      p_invoice_id: invoiceAId,
      p_lines: [{ description: 'Correctie', amount_cents: 500, vat_rate: 21 }],
    });
    expect(error).toBeNull();
    expect(data?.parent_invoice_id).toBe(invoiceAId);
    expect(data?.total_amount_cents).toBeLessThan(0);
  });
});

describe('subscription_invoice_periods RLS (NFR-301, FR-066)', () => {
  let clientA: TestSupabaseClient;
  let clientB: TestSupabaseClient;
  let companyAId: string;
  let periodAId: string;

  beforeAll(async () => {
    clientA = await signUpAndConfirm(uniqueTestEmail('subperiods-a'));
    const { data: companyA } = await clientA.rpc('onboard_company', {
      company_name: `Subperiods Tenant A ${crypto.randomUUID().slice(0, 8)}`,
      owner_full_name: 'Eigenaar A',
    });
    companyAId = requireId(companyA?.id);
    await clientA.auth.updateUser({ data: { company_id: companyAId } });
    await clientA.auth.refreshSession();

    clientB = await signUpAndConfirm(uniqueTestEmail('subperiods-b'));
    const { data: companyB } = await clientB.rpc('onboard_company', {
      company_name: `Subperiods Tenant B ${crypto.randomUUID().slice(0, 8)}`,
      owner_full_name: 'Eigenaar B',
    });
    await clientB.auth.updateUser({ data: { company_id: companyB?.id } });
    await clientB.auth.refreshSession();

    // Alleen via generate_subscription_invoices() geschreven — service-role
    // fixture, analoog aan de invoices-fixtures hierboven.
    const admin = adminClient();
    const { data: customer } = await admin
      .from('customers')
      .insert({ company_id: companyAId, name: 'Abonnee A', type: 'person' })
      .select('id')
      .single();
    const { data: object } = await admin
      .from('objects')
      .insert({
        company_id: companyAId,
        customer_id: requireId(customer?.id),
        address_line1: 'Abonnementstraat 1',
        postal_code: '1234 AB',
        city: 'Test',
        type: 'residence',
      })
      .select('id')
      .single();
    const { data: service } = await admin
      .from('services')
      .insert({
        company_id: companyAId,
        name: 'RLS-testdienst',
        standard_duration_minutes: 30,
        standard_price_cents: 1000,
        vat_rate: 21,
      })
      .select('id')
      .single();
    const { data: pricing } = await admin
      .from('pricings')
      .insert({
        company_id: companyAId,
        type: 'subscription',
        amount_cents: 15000,
        included_jobs_per_period: 4,
        overage_amount_cents: 5000,
        billing_period: 'monthly',
        billing_timing: 'arrears',
        vat_rate: 21,
      })
      .select('id')
      .single();
    const { data: agreement } = await admin
      .from('service_agreements')
      .insert({
        company_id: companyAId,
        object_id: requireId(object?.id),
        service_id: requireId(service?.id),
        pricing_id: requireId(pricing?.id),
        frequency_type: 'weekly',
        frequency_interval_days: 7,
        flexibility_window_days: 3,
      })
      .select('id')
      .single();
    const { data: invoice } = await admin
      .from('invoices')
      .insert({
        company_id: companyAId,
        customer_id: requireId(customer?.id),
        status: 'draft',
        invoice_date: new Date().toISOString().slice(0, 10),
        due_date: new Date().toISOString().slice(0, 10),
        total_amount_cents: 15000,
        total_tax_cents: 0,
      })
      .select('id')
      .single();
    const { data: period } = await admin
      .from('subscription_invoice_periods')
      .insert({
        company_id: companyAId,
        service_agreement_id: requireId(agreement?.id),
        period_start: '2026-06-01',
        period_end: '2026-06-30',
        invoice_id: requireId(invoice?.id),
      })
      .select('id')
      .single();
    periodAId = requireId(period?.id);
  });

  it('bedrijf B kan de periode van bedrijf A niet lezen', async () => {
    const { data } = await clientB
      .from('subscription_invoice_periods')
      .select('*')
      .eq('id', periodAId);
    expect(data).toEqual([]);
  });

  it('een gewone gebruiker kan niet rechtstreeks in subscription_invoice_periods schrijven', async () => {
    const { error } = await clientA.from('subscription_invoice_periods').insert({
      company_id: companyAId,
      service_agreement_id: crypto.randomUUID(),
      period_start: '2026-07-01',
      period_end: '2026-07-31',
      invoice_id: crypto.randomUUID(),
    });
    expect(error).not.toBeNull();
  });
});

describe('import_jobs RLS (NFR-301, FR-006)', () => {
  let clientA: TestSupabaseClient;
  let clientB: TestSupabaseClient;
  let companyAId: string;

  beforeAll(async () => {
    clientA = await signUpAndConfirm(uniqueTestEmail('importjobs-a'));
    const { data: companyA } = await clientA.rpc('onboard_company', {
      company_name: `ImportJobs Tenant A ${crypto.randomUUID().slice(0, 8)}`,
      owner_full_name: 'Eigenaar A',
    });
    companyAId = requireId(companyA?.id);
    await clientA.auth.updateUser({ data: { company_id: companyAId } });
    await clientA.auth.refreshSession();

    clientB = await signUpAndConfirm(uniqueTestEmail('importjobs-b'));
    const { data: companyB } = await clientB.rpc('onboard_company', {
      company_name: `ImportJobs Tenant B ${crypto.randomUUID().slice(0, 8)}`,
      owner_full_name: 'Eigenaar B',
    });
    await clientB.auth.updateUser({ data: { company_id: companyB?.id } });
    await clientB.auth.refreshSession();
  });

  it('eigenaar kan een import_job aanmaken binnen het eigen bedrijf', async () => {
    const { data, error } = await clientA
      .from('import_jobs')
      .insert({ company_id: companyAId, status: 'running', total_rows: 10 })
      .select('*')
      .single();
    expect(error).toBeNull();
    expect(data?.total_rows).toBe(10);
  });

  describe('tenant-isolatie', () => {
    let jobAId: string;

    beforeAll(async () => {
      const { data } = await clientA
        .from('import_jobs')
        .insert({ company_id: companyAId, status: 'completed', total_rows: 5, success_count: 5 })
        .select('id')
        .single();
      jobAId = requireId(data?.id);
    });

    it('bedrijf B kan het import_job van bedrijf A niet lezen', async () => {
      const { data } = await clientB.from('import_jobs').select('*').eq('id', jobAId);
      expect(data).toEqual([]);
    });

    it('bedrijf B kan geen import_job aanmaken onder het company_id van bedrijf A', async () => {
      const { error } = await clientB
        .from('import_jobs')
        .insert({ company_id: companyAId, status: 'running', total_rows: 1 });
      expect(error).not.toBeNull();
    });
  });
});

function requireId(id: string | undefined): string {
  if (!id) {
    throw new Error('Verwachtte een id.');
  }
  return id;
}
