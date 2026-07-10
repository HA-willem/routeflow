import { beforeAll, describe, expect, it } from 'vitest';

import { signUpAndConfirm, uniqueTestEmail, type TestSupabaseClient } from './helpers';

/**
 * Integratietests voor objects (FR-002/FR-003, 005_objects.sql). Codificeert de
 * verplichte negatieve RLS-test per nieuwe tabel (41_CodingStandards.md § 12,
 * NFR-301). Zie customers-rls.test.ts voor de toelichting waarom rol-restricties
 * (planner/administratie/medewerker) hier nog niet los getest worden.
 */
describe('objects RLS (NFR-301)', () => {
  let clientA: TestSupabaseClient;
  let clientB: TestSupabaseClient;
  let companyAId: string;
  let customerAId: string;

  beforeAll(async () => {
    clientA = await signUpAndConfirm(uniqueTestEmail('objects-a'));
    const { data: companyA } = await clientA.rpc('onboard_company', {
      company_name: `Objecten Tenant A ${crypto.randomUUID().slice(0, 8)}`,
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

    clientB = await signUpAndConfirm(uniqueTestEmail('objects-b'));
    const { data: companyB } = await clientB.rpc('onboard_company', {
      company_name: `Objecten Tenant B ${crypto.randomUUID().slice(0, 8)}`,
      owner_full_name: 'Eigenaar B',
    });
    await clientB.auth.updateUser({ data: { company_id: companyB?.id } });
    await clientB.auth.refreshSession();
  });

  it('eigenaar kan een object aanmaken bij een eigen klant', async () => {
    const { data, error } = await clientA
      .from('objects')
      .insert({
        company_id: companyAId,
        customer_id: customerAId,
        address_line1: 'Kerkstraat 42',
        postal_code: '1234 AB',
        city: 'Amsterdam',
        type: 'residence',
      })
      .select('*')
      .single();

    expect(error).toBeNull();
    expect(data?.location_status).toBe('manual');
    expect(data?.location).toBeNull();
  });

  it('weigert een ongeldige postcode (DB-constraint)', async () => {
    const { error } = await clientA.from('objects').insert({
      company_id: companyAId,
      customer_id: customerAId,
      address_line1: 'Kerkstraat 43',
      postal_code: 'ONGELDIG',
      city: 'Amsterdam',
      type: 'residence',
    });
    expect(error).not.toBeNull();
  });

  it('weigert een tweede object met hetzelfde adres bij dezelfde klant', async () => {
    await clientA.from('objects').insert({
      company_id: companyAId,
      customer_id: customerAId,
      address_line1: 'Dubbelstraat 1',
      postal_code: '1000 AA',
      city: 'Amsterdam',
      type: 'residence',
    });
    const { error } = await clientA.from('objects').insert({
      company_id: companyAId,
      customer_id: customerAId,
      address_line1: 'Dubbelstraat 1',
      postal_code: '1000 AA',
      city: 'Amsterdam',
      type: 'residence',
    });
    expect(error).not.toBeNull();
    expect(error?.code).toBe('23505');
  });

  describe('tenant-isolatie', () => {
    let objectAId: string;

    beforeAll(async () => {
      const { data } = await clientA
        .from('objects')
        .insert({
          company_id: companyAId,
          customer_id: customerAId,
          address_line1: 'Isolatiestraat 1',
          postal_code: '2000 BB',
          city: 'Rotterdam',
          type: 'residence',
        })
        .select('id')
        .single();
      objectAId = requireId(data?.id);
    });

    it('bedrijf B kan het object van bedrijf A niet lezen', async () => {
      const { data } = await clientB.from('objects').select('*').eq('id', objectAId);
      expect(data).toEqual([]);
    });

    it('bedrijf B kan geen object aanmaken onder de klant van bedrijf A', async () => {
      const { error } = await clientB.from('objects').insert({
        company_id: companyAId,
        customer_id: customerAId,
        address_line1: 'Ingesmokkeld 1',
        postal_code: '3000 CC',
        city: 'Utrecht',
        type: 'residence',
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
