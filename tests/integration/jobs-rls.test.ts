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

  /**
   * BR-030: pauzeren annuleert alle toekomstige NIET-vergrendelde beurten.
   * Oefent hier dezelfde query uit als `pauseServiceAgreement`
   * (app/(app)/klanten/[id]/objecten/[objectId]/dienstafspraken/actions.ts) —
   * die Server Action vereist een Next.js request-context (`requireOnboardedUser`)
   * en is daarom niet direct aanroepbaar vanuit een Vitest-integratietest; het
   * RLS-gedrag van de onderliggende query is wel hier los verifieerbaar
   * (41_CodingStandards.md § 12: elke harde BR heeft minimaal één test).
   */
  describe('BR-030: pauzering annuleert toekomstige niet-vergrendelde beurten', () => {
    let agreementId: string;
    let futureUnlockedJobId: string;
    let futureLockedJobId: string;
    let pastUnlockedJobId: string;
    let futureCompletedJobId: string;

    beforeAll(async () => {
      const { data: customer } = await clientA
        .from('customers')
        .insert({ company_id: companyAId, name: 'Klant BR-030', type: 'person' })
        .select('id')
        .single();

      const { data: object } = await clientA
        .from('objects')
        .insert({
          company_id: companyAId,
          customer_id: requireId(customer?.id),
          address_line1: `BR030-straat ${crypto.randomUUID().slice(0, 8)}`,
          postal_code: '1234 AB',
          city: 'Amsterdam',
          type: 'residence',
        })
        .select('id')
        .single();

      const { data: service } = await clientA
        .from('services')
        .insert({
          company_id: companyAId,
          name: 'BR-030-dienst',
          standard_duration_minutes: 30,
          standard_price_cents: 4000,
          vat_rate: 21,
        })
        .select('id')
        .single();

      const { data: pricing } = await clientA
        .from('pricings')
        .insert({ company_id: companyAId, type: 'per_job', amount_cents: 2000, vat_rate: 21 })
        .select('id')
        .single();

      const { data: agreement } = await clientA
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
      agreementId = requireId(agreement?.id);

      const { data: futureUnlockedJob } = await clientA
        .from('jobs')
        .insert({
          company_id: companyAId,
          service_agreement_id: agreementId,
          scheduled_date: '2099-01-05',
          status: 'planned',
          locked: false,
          estimated_duration_minutes: 30,
        })
        .select('id')
        .single();
      futureUnlockedJobId = requireId(futureUnlockedJob?.id);

      const { data: futureLockedJob } = await clientA
        .from('jobs')
        .insert({
          company_id: companyAId,
          service_agreement_id: agreementId,
          scheduled_date: '2099-01-12',
          status: 'planned',
          locked: true,
          estimated_duration_minutes: 30,
        })
        .select('id')
        .single();
      futureLockedJobId = requireId(futureLockedJob?.id);

      const { data: pastUnlockedJob } = await clientA
        .from('jobs')
        .insert({
          company_id: companyAId,
          service_agreement_id: agreementId,
          scheduled_date: '2020-01-01',
          status: 'planned',
          locked: false,
          estimated_duration_minutes: 30,
        })
        .select('id')
        .single();
      pastUnlockedJobId = requireId(pastUnlockedJob?.id);

      const { data: futureCompletedJob } = await clientA
        .from('jobs')
        .insert({
          company_id: companyAId,
          service_agreement_id: agreementId,
          scheduled_date: '2099-01-19',
          status: 'completed',
          locked: false,
          estimated_duration_minutes: 30,
        })
        .select('id')
        .single();
      futureCompletedJobId = requireId(futureCompletedJob?.id);

      // Zelfde query als `pauseServiceAgreement` (BR-030).
      await clientA
        .from('jobs')
        .update({ status: 'cancelled' })
        .eq('service_agreement_id', agreementId)
        .eq('locked', false)
        .gte('scheduled_date', new Date().toISOString().slice(0, 10))
        .in('status', ['proposed', 'planned', 'en_route', 'rescheduling']);
    });

    it('annuleert een toekomstige niet-vergrendelde beurt', async () => {
      const { data } = await clientA
        .from('jobs')
        .select('status')
        .eq('id', futureUnlockedJobId)
        .single();
      expect(data?.status).toBe('cancelled');
    });

    it('laat een toekomstige vergrendelde beurt ongemoeid', async () => {
      const { data } = await clientA
        .from('jobs')
        .select('status')
        .eq('id', futureLockedJobId)
        .single();
      expect(data?.status).toBe('planned');
    });

    it('laat een beurt in het verleden ongemoeid', async () => {
      const { data } = await clientA
        .from('jobs')
        .select('status')
        .eq('id', pastUnlockedJobId)
        .single();
      expect(data?.status).toBe('planned');
    });

    it('laat een al afgeronde beurt ongemoeid', async () => {
      const { data } = await clientA
        .from('jobs')
        .select('status')
        .eq('id', futureCompletedJobId)
        .single();
      expect(data?.status).toBe('completed');
    });
  });
});

function requireId(id: string | undefined): string {
  if (!id) {
    throw new Error('Verwachtte een id.');
  }
  return id;
}
