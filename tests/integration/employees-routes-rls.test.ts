import { beforeAll, describe, expect, it } from 'vitest';

import { signUpAndConfirm, uniqueTestEmail, type TestSupabaseClient } from './helpers';

/**
 * Integratietests voor employees/availability/routes (FR-021/022/024,
 * 013_employees_availability.sql, 014_routes.sql). Codificeert de verplichte
 * negatieve RLS-test per nieuwe tabel (41_CodingStandards.md § 12, NFR-301).
 * Zie customers-rls.test.ts voor de toelichting waarom rol-restricties
 * (planner/administratie/medewerker) hier nog niet los getest worden.
 */
describe('employees/availability/routes RLS (NFR-301)', () => {
  let clientA: TestSupabaseClient;
  let clientB: TestSupabaseClient;
  let companyAId: string;

  beforeAll(async () => {
    clientA = await signUpAndConfirm(uniqueTestEmail('routing-a'));
    const { data: companyA } = await clientA.rpc('onboard_company', {
      company_name: `Routing Tenant A ${crypto.randomUUID().slice(0, 8)}`,
      owner_full_name: 'Eigenaar A',
    });
    companyAId = requireId(companyA?.id);
    await clientA.auth.updateUser({ data: { company_id: companyAId } });
    await clientA.auth.refreshSession();

    clientB = await signUpAndConfirm(uniqueTestEmail('routing-b'));
    const { data: companyB } = await clientB.rpc('onboard_company', {
      company_name: `Routing Tenant B ${crypto.randomUUID().slice(0, 8)}`,
      owner_full_name: 'Eigenaar B',
    });
    await clientB.auth.updateUser({ data: { company_id: companyB?.id } });
    await clientB.auth.refreshSession();
  });

  async function createEmployee(client: TestSupabaseClient, companyId: string) {
    const { data, error } = await client
      .from('employees')
      .insert({
        company_id: companyId,
        first_name: 'Piet',
        last_name: 'Jansen',
        phone: '0612345678',
      })
      .select('id')
      .single();
    return { data, error };
  }

  it('eigenaar kan een medewerker aanmaken', async () => {
    const { data, error } = await createEmployee(clientA, companyAId);
    expect(error).toBeNull();
    expect(data?.id).toBeTruthy();
  });

  describe('availability', () => {
    it('eigenaar kan beschikbaarheid melden voor een medewerker', async () => {
      const { data: employee } = await createEmployee(clientA, companyAId);
      const { error } = await clientA.from('availability').insert({
        company_id: companyAId,
        employee_id: requireId(employee?.id),
        date: '2026-08-01',
        status: 'sick',
        reason: 'Griep',
      });
      expect(error).toBeNull();
    });

    it('weigert een dubbele beschikbaarheidsrij voor dezelfde medewerker/dag (DB-constraint)', async () => {
      const { data: employee } = await createEmployee(clientA, companyAId);
      const employeeId = requireId(employee?.id);
      await clientA
        .from('availability')
        .insert({
          company_id: companyAId,
          employee_id: employeeId,
          date: '2026-08-05',
          status: 'leave',
        });
      const { error } = await clientA
        .from('availability')
        .insert({
          company_id: companyAId,
          employee_id: employeeId,
          date: '2026-08-05',
          status: 'sick',
        });
      expect(error).not.toBeNull();
      expect(error?.code).toBe('23505');
    });
  });

  describe('routes', () => {
    it('eigenaar kan een route aanmaken voor een eigen medewerker', async () => {
      const { data: employee } = await createEmployee(clientA, companyAId);
      const { data, error } = await clientA
        .from('routes')
        .insert({
          company_id: companyAId,
          employee_id: requireId(employee?.id),
          route_date: '2026-08-10',
        })
        .select('*')
        .single();
      expect(error).toBeNull();
      expect(data?.sequence_version).toBe(0);
    });

    it('weigert een tweede route voor dezelfde medewerker/dag (DB-constraint)', async () => {
      const { data: employee } = await createEmployee(clientA, companyAId);
      const employeeId = requireId(employee?.id);
      await clientA
        .from('routes')
        .insert({ company_id: companyAId, employee_id: employeeId, route_date: '2026-08-11' });
      const { error } = await clientA
        .from('routes')
        .insert({ company_id: companyAId, employee_id: employeeId, route_date: '2026-08-11' });
      expect(error).not.toBeNull();
      expect(error?.code).toBe('23505');
    });
  });

  describe('tenant-isolatie', () => {
    it('bedrijf B kan de medewerker van bedrijf A niet lezen', async () => {
      const { data: employee } = await createEmployee(clientA, companyAId);
      const { data } = await clientB
        .from('employees')
        .select('*')
        .eq('id', requireId(employee?.id));
      expect(data).toEqual([]);
    });

    it('bedrijf B kan geen route aanmaken voor de medewerker van bedrijf A', async () => {
      const { data: employee } = await createEmployee(clientA, companyAId);
      const { error } = await clientB.from('routes').insert({
        company_id: companyAId,
        employee_id: requireId(employee?.id),
        route_date: '2026-08-12',
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
