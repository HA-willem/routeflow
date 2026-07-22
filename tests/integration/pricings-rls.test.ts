import { beforeAll, describe, expect, it } from 'vitest';

import { signUpAndConfirm, uniqueTestEmail, type TestSupabaseClient } from './helpers';

/**
 * Integratietests voor pricings (18_Prijsafspraken.md, 007_pricings.sql).
 * Sprint 10 vult een gat in de RLS-negatieve-testsuite (31_Testplan.md § 4,
 * NFR-301) — pricings bestaat sinds Sprint 2 maar had nog geen eigen
 * RLS-testbestand.
 */
describe('pricings RLS (NFR-301)', () => {
  let clientA: TestSupabaseClient;
  let clientB: TestSupabaseClient;
  let companyAId: string;

  beforeAll(async () => {
    clientA = await signUpAndConfirm(uniqueTestEmail('pricings-a'));
    const { data: companyA } = await clientA.rpc('onboard_company', {
      company_name: `Pricings Tenant A ${crypto.randomUUID().slice(0, 8)}`,
      owner_full_name: 'Eigenaar A',
    });
    companyAId = requireId(companyA?.id);
    await clientA.auth.updateUser({ data: { company_id: companyAId } });
    await clientA.auth.refreshSession();

    clientB = await signUpAndConfirm(uniqueTestEmail('pricings-b'));
    const { data: companyB } = await clientB.rpc('onboard_company', {
      company_name: `Pricings Tenant B ${crypto.randomUUID().slice(0, 8)}`,
      owner_full_name: 'Eigenaar B',
    });
    await clientB.auth.updateUser({ data: { company_id: companyB?.id } });
    await clientB.auth.refreshSession();
  });

  it('eigenaar kan een prijsafspraak aanmaken binnen het eigen bedrijf', async () => {
    const { data, error } = await clientA
      .from('pricings')
      .insert({ company_id: companyAId, type: 'per_job', amount_cents: 2500, vat_rate: 21 })
      .select('*')
      .single();

    expect(error).toBeNull();
    expect(data?.amount_cents).toBe(2500);
  });

  describe('tenant-isolatie', () => {
    let pricingAId: string;

    beforeAll(async () => {
      const { data } = await clientA
        .from('pricings')
        .insert({ company_id: companyAId, type: 'per_job', amount_cents: 3000, vat_rate: 21 })
        .select('id')
        .single();
      pricingAId = requireId(data?.id);
    });

    it('bedrijf B kan de prijsafspraak van bedrijf A niet lezen', async () => {
      const { data } = await clientB.from('pricings').select('*').eq('id', pricingAId);
      expect(data).toEqual([]);
    });

    it('bedrijf B kan de prijsafspraak van bedrijf A niet bijwerken', async () => {
      const { data } = await clientB
        .from('pricings')
        .update({ amount_cents: 1 })
        .eq('id', pricingAId)
        .select('*');
      expect(data).toEqual([]);
    });

    it('bedrijf B kan geen prijsafspraak aanmaken onder het company_id van bedrijf A', async () => {
      const { error } = await clientB
        .from('pricings')
        .insert({ company_id: companyAId, type: 'per_job', amount_cents: 100, vat_rate: 21 });
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
