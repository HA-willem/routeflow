import { beforeAll, describe, expect, it } from 'vitest';

import { signUpAndConfirm, uniqueTestEmail, type TestSupabaseClient } from './helpers';

/**
 * Integratietests voor jobs (FR-020, 009_jobs.sql). Codificeert de verplichte
 * negatieve RLS-test per nieuwe tabel (41_CodingStandards.md § 12, NFR-301) en
 * BR-203 (geen dubbele dienstafspraak op dezelfde dag). Zie
 * service-agreements-rls.test.ts voor de toelichting waarom rol-restricties
 * nog niet los getest worden.
 */
describe('jobs RLS (NFR-301) + BR-203 (geen dubbele beurt per dag)', () => {
  let clientA: TestSupabaseClient;
  let clientB: TestSupabaseClient;
  let companyAId: string;
  let agreementAId: string;

  beforeAll(async () => {
    clientA = await signUpAndConfirm(uniqueTestEmail('jobs-a'));
    const { data: companyA } = await clientA.rpc('onboard_company', {
      company_name: `Jobs Tenant A ${crypto.randomUUID().slice(0, 8)}`,
      owner_full_name: 'Eigenaar A',
    });
    companyAId = requireId(companyA?.id);
    await clientA.auth.updateUser({ data: { company_id: companyAId } });
    await clientA.auth.refreshSession();

    const { data: customerA } = await clientA
      .from('customers')
      .insert({ company_id: companyAId, name: 'Klant A', type: 'person' })
      .select('id')
      .single();

    const { data: objectA } = await clientA
      .from('objects')
      .insert({
        company_id: companyAId,
        customer_id: requireId(customerA?.id),
        address_line1: `Teststraat ${crypto.randomUUID().slice(0, 8)}`,
        postal_code: '1234 AB',
        city: 'Amsterdam',
        type: 'residence',
      })
      .select('id')
      .single();

    const { data: serviceA } = await clientA
      .from('services')
      .insert({
        company_id: companyAId,
        name: 'Glasbewassing buiten',
        standard_duration_minutes: 45,
        standard_price_cents: 5000,
        vat_rate: 21,
      })
      .select('id')
      .single();

    const { data: pricingA } = await clientA
      .from('pricings')
      .insert({ company_id: companyAId, type: 'per_job', amount_cents: 2500, vat_rate: 21 })
      .select('id')
      .single();

    const { data: agreementA } = await clientA
      .from('service_agreements')
      .insert({
        company_id: companyAId,
        object_id: requireId(objectA?.id),
        service_id: requireId(serviceA?.id),
        pricing_id: requireId(pricingA?.id),
        frequency_type: 'weekly',
        frequency_interval_days: 7,
        flexibility_window_days: 3,
      })
      .select('id')
      .single();
    agreementAId = requireId(agreementA?.id);

    clientB = await signUpAndConfirm(uniqueTestEmail('jobs-b'));
    const { data: companyB } = await clientB.rpc('onboard_company', {
      company_name: `Jobs Tenant B ${crypto.randomUUID().slice(0, 8)}`,
      owner_full_name: 'Eigenaar B',
    });
    await clientB.auth.updateUser({ data: { company_id: companyB?.id } });
    await clientB.auth.refreshSession();
  });

  it('eigenaar kan een voorgestelde beurt aanmaken', async () => {
    const { data, error } = await clientA
      .from('jobs')
      .insert({
        company_id: companyAId,
        service_agreement_id: agreementAId,
        scheduled_date: '2026-08-03',
        estimated_duration_minutes: 45,
      })
      .select('*')
      .single();

    expect(error).toBeNull();
    expect(data?.status).toBe('proposed');
    expect(data?.locked).toBe(false);
  });

  it('BR-203: weigert een tweede beurt voor dezelfde afspraak op dezelfde dag', async () => {
    await clientA.from('jobs').insert({
      company_id: companyAId,
      service_agreement_id: agreementAId,
      scheduled_date: '2026-08-10',
      estimated_duration_minutes: 45,
    });

    const { error } = await clientA.from('jobs').insert({
      company_id: companyAId,
      service_agreement_id: agreementAId,
      scheduled_date: '2026-08-10',
      estimated_duration_minutes: 45,
    });

    expect(error).not.toBeNull();
    expect(error?.code).toBe('23505');
  });

  describe('tenant-isolatie', () => {
    it('bedrijf B kan de beurten van bedrijf A niet lezen', async () => {
      await clientA.from('jobs').insert({
        company_id: companyAId,
        service_agreement_id: agreementAId,
        scheduled_date: '2026-08-17',
        estimated_duration_minutes: 45,
      });

      const { data } = await clientB
        .from('jobs')
        .select('*')
        .eq('service_agreement_id', agreementAId);
      expect(data).toEqual([]);
    });

    it('bedrijf B kan geen beurt aanmaken voor de dienstafspraak van bedrijf A', async () => {
      const { error } = await clientB.from('jobs').insert({
        company_id: companyAId,
        service_agreement_id: agreementAId,
        scheduled_date: '2026-08-24',
        estimated_duration_minutes: 45,
      });
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
