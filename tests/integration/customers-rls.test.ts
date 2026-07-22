import { beforeAll, describe, expect, it } from 'vitest';

import { signUpAndConfirm, uniqueTestEmail, type TestSupabaseClient } from './helpers';

/**
 * Integratietests voor customers (FR-001, 004_customers.sql). Codificeert de
 * verplichte negatieve RLS-test per nieuwe tabel (41_CodingStandards.md § 12,
 * NFR-301).
 *
 * Rol-gebaseerde restricties (alleen owner/admin/planner mogen schrijven) zijn
 * hier NIET los getest: er bestaat nog geen gebruikers-uitnodigingsfunctie
 * (23_Gebruikersrollen.md "Gebruikers & rollen"-CRUD is geen Sprint 2-scope), dus
 * een planner/administratie/medewerker-testgebruiker kan nog niet worden
 * aangemaakt. De tenant-isolatietest hieronder dekt wél de kern van NFR-301; de
 * rol-restrictietest volgt zodra het uitnodigen van gebruikers bestaat.
 */
describe('customers RLS (NFR-301)', () => {
  let clientA: TestSupabaseClient;
  let clientB: TestSupabaseClient;
  let companyAId: string;

  beforeAll(async () => {
    clientA = await signUpAndConfirm(uniqueTestEmail('customers-a'));
    const { data: companyA } = await clientA.rpc('onboard_company', {
      company_name: `Klanten Tenant A ${crypto.randomUUID().slice(0, 8)}`,
      owner_full_name: 'Eigenaar A',
    });
    companyAId = requireId(companyA?.id);
    await clientA.auth.updateUser({ data: { company_id: companyAId } });
    await clientA.auth.refreshSession();

    clientB = await signUpAndConfirm(uniqueTestEmail('customers-b'));
    const { data: companyB } = await clientB.rpc('onboard_company', {
      company_name: `Klanten Tenant B ${crypto.randomUUID().slice(0, 8)}`,
      owner_full_name: 'Eigenaar B',
    });
    await clientB.auth.updateUser({ data: { company_id: companyB?.id } });
    await clientB.auth.refreshSession();
  });

  it('eigenaar kan een klant aanmaken binnen het eigen bedrijf', async () => {
    const { data, error } = await clientA
      .from('customers')
      .insert({
        company_id: companyAId,
        name: 'Bakkerij Jansen',
        type: 'business',
        kvk_number: '12345678',
      })
      .select('*')
      .single();

    expect(error).toBeNull();
    expect(data?.name).toBe('Bakkerij Jansen');
    expect(data?.archived_at).toBeNull();
  });

  it('weigert een zakelijke klant zonder KVK-nummer (DB-constraint)', async () => {
    const { error } = await clientA
      .from('customers')
      .insert({ company_id: companyAId, name: 'Zonder KVK', type: 'business' });
    expect(error).not.toBeNull();
  });

  it('weigert een tweede klant met hetzelfde e-mailadres binnen hetzelfde bedrijf', async () => {
    const email = `dup-${crypto.randomUUID()}@servops.test`;
    await clientA
      .from('customers')
      .insert({ company_id: companyAId, name: 'Klant 1', type: 'person', email });
    const { error } = await clientA
      .from('customers')
      .insert({ company_id: companyAId, name: 'Klant 2', type: 'person', email });
    expect(error).not.toBeNull();
    expect(error?.code).toBe('23505');
  });

  describe('tenant-isolatie', () => {
    let customerAId: string;

    beforeAll(async () => {
      const { data } = await clientA
        .from('customers')
        .insert({ company_id: companyAId, name: 'Isolatie-test klant A', type: 'person' })
        .select('id')
        .single();
      customerAId = requireId(data?.id);
    });

    it('bedrijf B kan de klant van bedrijf A niet lezen', async () => {
      const { data } = await clientB.from('customers').select('*').eq('id', customerAId);
      expect(data).toEqual([]);
    });

    it('bedrijf B kan de klant van bedrijf A niet bijwerken', async () => {
      const { data } = await clientB
        .from('customers')
        .update({ name: 'Gehackt' })
        .eq('id', customerAId)
        .select('*');
      expect(data).toEqual([]);
    });

    it('bedrijf B kan geen klant aanmaken onder het company_id van bedrijf A', async () => {
      const { error } = await clientB
        .from('customers')
        .insert({ company_id: companyAId, name: 'Ingesmokkeld', type: 'person' });
      expect(error).not.toBeNull();
    });
  });

  it('een gearchiveerde klant blijft bestaan maar is via archived_at te herkennen', async () => {
    const { data: created } = await clientA
      .from('customers')
      .insert({ company_id: companyAId, name: 'Archiveer mij', type: 'person' })
      .select('id')
      .single();
    const id = requireId(created?.id);

    const { error } = await clientA
      .from('customers')
      .update({ archived_at: new Date().toISOString() })
      .eq('id', id);
    expect(error).toBeNull();

    const { data: stillThere } = await clientA
      .from('customers')
      .select('archived_at')
      .eq('id', id)
      .single();
    expect(stillThere?.archived_at).not.toBeNull();
  });
});

function requireId(id: string | undefined): string {
  if (!id) {
    throw new Error('Verwachtte een id.');
  }
  return id;
}
