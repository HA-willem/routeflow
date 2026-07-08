import { beforeAll, describe, expect, it } from 'vitest';

import { anonClient, signUpAndConfirm, uniqueTestEmail } from './helpers';

/**
 * Integratietests tegen een lokale Supabase-instantie (`npx supabase start`).
 * Codificeert de handmatige verificatie die tijdens Sprint 1 is uitgevoerd voor
 * onboard_company() en de RLS-baseline (003_rls_baseline.sql, NFR-301, 31 § 4).
 */
describe('onboard_company() + RLS-baseline', () => {
  it('weigert lezen van companies zonder ingelogde sessie (anon)', async () => {
    const client = anonClient();
    const { error } = await client.from('companies').select('*');
    expect(error).not.toBeNull();
    expect(error?.code).toBe('42501');
  });

  it('maakt atomair een company + owner-user aan en koppelt company_id in de JWT', async () => {
    const email = uniqueTestEmail('onboard');
    const client = await signUpAndConfirm(email);

    const { data: company, error } = await client.rpc('onboard_company', {
      company_name: 'Glaswasserij Test BV',
      owner_full_name: 'Test Eigenaar',
    });
    expect(error).toBeNull();
    expect(company?.slug).toBe('glaswasserij-test-bv');
    expect(company?.subscription_tier).toBe('starter');
    expect(company?.max_employees).toBe(5);

    // Vóór de metadata-update + refresh kent de JWT nog geen company_id (BR-701/
    // ADR-003): current_company_id() is dan null, dus RLS toont terecht nog niets.
    const { data: beforeRefresh } = await client.from('companies').select('*');
    expect(beforeRefresh).toEqual([]);

    await client.auth.updateUser({ data: { company_id: company?.id } });
    await client.auth.refreshSession();

    const { data: companies } = await client.from('companies').select('*');
    expect(companies).toHaveLength(1);
    expect(companies?.[0]?.id).toBe(company?.id);

    const { data: users } = await client.from('users').select('*');
    expect(users).toHaveLength(1);
    expect(users?.[0]?.role).toBe('owner');
    expect(users?.[0]?.full_name).toBe('Test Eigenaar');
  });

  it('weigert een tweede onboard_company()-aanroep voor dezelfde gebruiker', async () => {
    const email = uniqueTestEmail('double-onboard');
    const client = await signUpAndConfirm(email);

    await client.rpc('onboard_company', {
      company_name: 'Eerste Bedrijf',
      owner_full_name: 'Test',
    });

    const { error } = await client.rpc('onboard_company', {
      company_name: 'Tweede Bedrijf',
      owner_full_name: 'Test',
    });
    expect(error).not.toBeNull();
    expect(error?.code).toBe('23505');
  });

  it('genereert een unieke slug bij een naamsbotsing', async () => {
    const nameSuffix = crypto.randomUUID().slice(0, 8);
    const companyName = `Botsing ${nameSuffix}`;

    const clientA = await signUpAndConfirm(uniqueTestEmail('slug-a'));
    const { data: companyA } = await clientA.rpc('onboard_company', {
      company_name: companyName,
      owner_full_name: 'A',
    });

    const clientB = await signUpAndConfirm(uniqueTestEmail('slug-b'));
    const { data: companyB } = await clientB.rpc('onboard_company', {
      company_name: companyName,
      owner_full_name: 'B',
    });

    expect(companyA?.slug).not.toBe(companyB?.slug);
    expect(companyB?.slug).toMatch(new RegExp(`^${companyA?.slug}-\\d+$`));
  });

  describe('tenant-isolatie (NFR-301)', () => {
    let companyAId: string;
    let clientA: Awaited<ReturnType<typeof signUpAndConfirm>>;
    let clientB: Awaited<ReturnType<typeof signUpAndConfirm>>;

    beforeAll(async () => {
      clientA = await signUpAndConfirm(uniqueTestEmail('tenant-a'));
      const { data: companyA } = await clientA.rpc('onboard_company', {
        company_name: `Tenant A ${crypto.randomUUID().slice(0, 8)}`,
        owner_full_name: 'Eigenaar A',
      });
      companyAId = requireCompanyId(companyA?.id);
      await clientA.auth.updateUser({ data: { company_id: companyAId } });
      await clientA.auth.refreshSession();

      clientB = await signUpAndConfirm(uniqueTestEmail('tenant-b'));
      const { data: companyB } = await clientB.rpc('onboard_company', {
        company_name: `Tenant B ${crypto.randomUUID().slice(0, 8)}`,
        owner_full_name: 'Eigenaar B',
      });
      await clientB.auth.updateUser({ data: { company_id: companyB?.id } });
      await clientB.auth.refreshSession();
    });

    it('bedrijf B kan bedrijf A niet lezen via companies', async () => {
      const { data } = await clientB.from('companies').select('*').eq('id', companyAId);
      expect(data).toEqual([]);
    });

    it('bedrijf B kan de users-rij van bedrijf A niet lezen', async () => {
      const { data } = await clientB.from('users').select('*').eq('company_id', companyAId);
      expect(data).toEqual([]);
    });
  });
});

function requireCompanyId(id: string | undefined): string {
  if (!id) {
    throw new Error('Verwachtte een company id uit onboard_company().');
  }
  return id;
}
