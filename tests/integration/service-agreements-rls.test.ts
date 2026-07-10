import { beforeAll, describe, expect, it } from 'vitest';

import { signUpAndConfirm, uniqueTestEmail, type TestSupabaseClient } from './helpers';

/**
 * Integratietests voor pricings/service_agreements (FR-004/FR-005,
 * 007_pricings.sql, 008_service_agreements.sql). Codificeert de verplichte
 * negatieve RLS-test per nieuwe tabel (41_CodingStandards.md § 12, NFR-301) en
 * de FR-005-statusmachine ("geen teruggaan" vanuit `ended`). Zie
 * customers-rls.test.ts voor de toelichting waarom rol-restricties nog niet
 * los getest worden.
 *
 * Elke test die een écht werkende dienstafspraak nodig heeft, maakt zijn eigen
 * object aan (via `createObject()`): `UNIQUE(company_id, object_id, service_id)`
 * (FR-004/BR-203-verwant) staat maar één afspraak per dienst per object toe, dus
 * hergebruik van hetzelfde object tussen tests zou tests onbedoeld laten falen.
 */
describe('pricings/service_agreements RLS (NFR-301) + statusmachine (FR-005)', () => {
  let clientA: TestSupabaseClient;
  let clientB: TestSupabaseClient;
  let companyAId: string;
  let customerAId: string;
  let serviceAId: string;

  beforeAll(async () => {
    clientA = await signUpAndConfirm(uniqueTestEmail('sa-a'));
    const { data: companyA } = await clientA.rpc('onboard_company', {
      company_name: `SA Tenant A ${crypto.randomUUID().slice(0, 8)}`,
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
    customerAId = requireId(customerA?.id);

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
    serviceAId = requireId(serviceA?.id);

    clientB = await signUpAndConfirm(uniqueTestEmail('sa-b'));
    const { data: companyB } = await clientB.rpc('onboard_company', {
      company_name: `SA Tenant B ${crypto.randomUUID().slice(0, 8)}`,
      owner_full_name: 'Eigenaar B',
    });
    await clientB.auth.updateUser({ data: { company_id: companyB?.id } });
    await clientB.auth.refreshSession();
  });

  async function createObject() {
    const { data } = await clientA
      .from('objects')
      .insert({
        company_id: companyAId,
        customer_id: customerAId,
        address_line1: `Teststraat ${crypto.randomUUID().slice(0, 8)}`,
        postal_code: '1234 AB',
        city: 'Amsterdam',
        type: 'residence',
      })
      .select('id')
      .single();
    return requireId(data?.id);
  }

  async function createAgreement(objectId: string) {
    const { data: pricing } = await clientA
      .from('pricings')
      .insert({ company_id: companyAId, type: 'per_job', amount_cents: 2500, vat_rate: 21 })
      .select('id')
      .single();
    const pricingId = requireId(pricing?.id);

    const { data: agreement, error } = await clientA
      .from('service_agreements')
      .insert({
        company_id: companyAId,
        object_id: objectId,
        service_id: serviceAId,
        pricing_id: pricingId,
        frequency_type: 'weekly',
        frequency_interval_days: 7,
        flexibility_window_days: 3,
      })
      .select('*')
      .single();

    return { agreement, error, pricingId };
  }

  it('eigenaar kan een dienstafspraak + prijsafspraak aanmaken', async () => {
    const { agreement, error } = await createAgreement(await createObject());
    expect(error).toBeNull();
    expect(agreement?.status).toBe('active');
  });

  it('weigert een dubbele dienstafspraak voor dezelfde dienst op hetzelfde object', async () => {
    const objectId = await createObject();
    const { pricingId: firstPricingId } = await createAgreement(objectId);

    const { data: secondPricing } = await clientA
      .from('pricings')
      .insert({ company_id: companyAId, type: 'per_job', amount_cents: 3000, vat_rate: 21 })
      .select('id')
      .single();

    const { error } = await clientA.from('service_agreements').insert({
      company_id: companyAId,
      object_id: objectId,
      service_id: serviceAId,
      pricing_id: requireId(secondPricing?.id),
      frequency_type: 'weekly',
      frequency_interval_days: 7,
      flexibility_window_days: 3,
    });
    expect(error).not.toBeNull();
    expect(error?.code).toBe('23505');
    expect(firstPricingId).not.toBe(secondPricing?.id);
  });

  it('weigert custom-frequentie zonder interval (DB-constraint)', async () => {
    const { data: pricing } = await clientA
      .from('pricings')
      .insert({ company_id: companyAId, type: 'per_job', amount_cents: 2500, vat_rate: 21 })
      .select('id')
      .single();

    const { error } = await clientA.from('service_agreements').insert({
      company_id: companyAId,
      object_id: await createObject(),
      service_id: serviceAId,
      pricing_id: requireId(pricing?.id),
      frequency_type: 'custom',
      flexibility_window_days: 3,
    });
    expect(error).not.toBeNull();
  });

  it('weigert een prijsafspraak van het type hourly zonder uurtarief (DB-constraint)', async () => {
    const { error } = await clientA
      .from('pricings')
      .insert({ company_id: companyAId, type: 'hourly', vat_rate: 21 });
    expect(error).not.toBeNull();
  });

  describe('statusmachine (FR-005: geen teruggaan vanuit ended)', () => {
    it('pauzeren en hervatten werkt', async () => {
      const { agreement } = await createAgreement(await createObject());
      const id = requireId(agreement?.id);

      const { error: pauseError } = await clientA
        .from('service_agreements')
        .update({ status: 'paused', paused_until: '2099-01-01' })
        .eq('id', id);
      expect(pauseError).toBeNull();

      const { error: resumeError } = await clientA
        .from('service_agreements')
        .update({ status: 'active', paused_until: null })
        .eq('id', id);
      expect(resumeError).toBeNull();
    });

    it('weigert reactivering nadat een dienstafspraak beëindigd is', async () => {
      const { agreement } = await createAgreement(await createObject());
      const id = requireId(agreement?.id);

      await clientA
        .from('service_agreements')
        .update({ status: 'ended', ended_at: new Date().toISOString() })
        .eq('id', id);

      const { error } = await clientA
        .from('service_agreements')
        .update({ status: 'active' })
        .eq('id', id);
      expect(error).not.toBeNull();
    });
  });

  describe('tenant-isolatie', () => {
    it('bedrijf B kan de dienstafspraak van bedrijf A niet lezen', async () => {
      const { agreement } = await createAgreement(await createObject());
      const { data } = await clientB
        .from('service_agreements')
        .select('*')
        .eq('id', requireId(agreement?.id));
      expect(data).toEqual([]);
    });

    it('bedrijf B kan de prijsafspraak van bedrijf A niet lezen', async () => {
      const { pricingId } = await createAgreement(await createObject());
      const { data } = await clientB.from('pricings').select('*').eq('id', pricingId);
      expect(data).toEqual([]);
    });
  });
});

function requireId(id: string | undefined): string {
  if (!id) {
    throw new Error('Verwachtte een id.');
  }
  return id;
}
