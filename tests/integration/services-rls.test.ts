import { beforeAll, describe, expect, it } from 'vitest';

import { signUpAndConfirm, uniqueTestEmail, type TestSupabaseClient } from './helpers';

/**
 * Integratietests voor services (12_Entiteiten.md § 5, 006_services.sql).
 * Codificeert de verplichte negatieve RLS-test per nieuwe tabel
 * (41_CodingStandards.md § 12, NFR-301). Zie customers-rls.test.ts voor de
 * toelichting waarom rol-restricties (planner/administratie/medewerker) hier
 * nog niet los getest worden.
 */
describe('services RLS (NFR-301)', () => {
  let clientA: TestSupabaseClient;
  let clientB: TestSupabaseClient;
  let companyAId: string;

  beforeAll(async () => {
    clientA = await signUpAndConfirm(uniqueTestEmail('services-a'));
    const { data: companyA } = await clientA.rpc('onboard_company', {
      company_name: `Diensten Tenant A ${crypto.randomUUID().slice(0, 8)}`,
      owner_full_name: 'Eigenaar A',
    });
    companyAId = requireId(companyA?.id);
    await clientA.auth.updateUser({ data: { company_id: companyAId } });
    await clientA.auth.refreshSession();

    clientB = await signUpAndConfirm(uniqueTestEmail('services-b'));
    const { data: companyB } = await clientB.rpc('onboard_company', {
      company_name: `Diensten Tenant B ${crypto.randomUUID().slice(0, 8)}`,
      owner_full_name: 'Eigenaar B',
    });
    await clientB.auth.updateUser({ data: { company_id: companyB?.id } });
    await clientB.auth.refreshSession();
  });

  it('eigenaar kan een dienst aanmaken', async () => {
    const { data, error } = await clientA
      .from('services')
      .insert({
        company_id: companyAId,
        name: 'Glasbewassing buiten',
        standard_duration_minutes: 45,
        standard_price_cents: 5000,
        vat_rate: 9,
      })
      .select('*')
      .single();

    expect(error).toBeNull();
    expect(Number(data?.vat_rate)).toBe(9);
  });

  it('weigert een ongeldig BTW-tarief', async () => {
    const { error } = await clientA.from('services').insert({
      company_id: companyAId,
      name: 'Ongeldig BTW-tarief',
      standard_duration_minutes: 45,
      standard_price_cents: 5000,
      vat_rate: 15,
    });
    expect(error).not.toBeNull();
  });

  it('weigert een duur buiten 15-480 minuten', async () => {
    const { error } = await clientA.from('services').insert({
      company_id: companyAId,
      name: 'Te kort',
      standard_duration_minutes: 5,
      standard_price_cents: 5000,
      vat_rate: 21,
    });
    expect(error).not.toBeNull();
  });

  it('weigert een weersgevoelige dienst zonder weerstype', async () => {
    const { error } = await clientA.from('services').insert({
      company_id: companyAId,
      name: 'Zonder weerstype',
      standard_duration_minutes: 45,
      standard_price_cents: 5000,
      vat_rate: 21,
      is_weather_sensitive: true,
    });
    expect(error).not.toBeNull();
  });

  describe('tenant-isolatie', () => {
    let serviceAId: string;

    beforeAll(async () => {
      const { data } = await clientA
        .from('services')
        .insert({
          company_id: companyAId,
          name: 'Isolatie-test dienst A',
          standard_duration_minutes: 30,
          standard_price_cents: 2500,
          vat_rate: 21,
        })
        .select('id')
        .single();
      serviceAId = requireId(data?.id);
    });

    it('bedrijf B kan de dienst van bedrijf A niet lezen', async () => {
      const { data } = await clientB.from('services').select('*').eq('id', serviceAId);
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
