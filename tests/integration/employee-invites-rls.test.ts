import { beforeAll, describe, expect, it } from 'vitest';

import { signUpAndConfirm, uniqueTestEmail, type TestSupabaseClient } from './helpers';

/**
 * Integratietests voor invites (FR-103, 040_employee_invites.sql) — de
 * medewerker-uitnodigingsflow. Dekt zowel de standaard tenant-RLS
 * (41_CodingStandards.md § 12, NFR-301) als de twee SECURITY DEFINER-RPC's
 * (get_invite_by_token/accept_employee_invite), die RLS bewust omzeilen voor
 * één zorgvuldig afgeschermde operatie — zelfde precedent als
 * onboard_company() (tests/integration/*-rls.test.ts dekt dat pad niet apart,
 * dit is de eerste keer dat een vergelijkbaar self-service-RPC-pad getest wordt).
 */
describe('invites RLS + accept-flow (NFR-301, FR-103)', () => {
  let clientA: TestSupabaseClient;
  let clientB: TestSupabaseClient;
  let companyAId: string;
  let ownerAId: string;
  let employeeAId: string;

  beforeAll(async () => {
    clientA = await signUpAndConfirm(uniqueTestEmail('invites-owner-a'));
    const { data: companyA } = await clientA.rpc('onboard_company', {
      company_name: `Uitnodiging Tenant A ${crypto.randomUUID().slice(0, 8)}`,
      owner_full_name: 'Eigenaar A',
    });
    companyAId = requireId(companyA?.id);
    await clientA.auth.updateUser({ data: { company_id: companyAId } });
    await clientA.auth.refreshSession();
    const {
      data: { user: ownerA },
    } = await clientA.auth.getUser();
    ownerAId = requireId(ownerA?.id);

    clientB = await signUpAndConfirm(uniqueTestEmail('invites-owner-b'));
    const { data: companyB } = await clientB.rpc('onboard_company', {
      company_name: `Uitnodiging Tenant B ${crypto.randomUUID().slice(0, 8)}`,
      owner_full_name: 'Eigenaar B',
    });
    await clientB.auth.updateUser({ data: { company_id: companyB?.id } });
    await clientB.auth.refreshSession();

    const { data: employeeA } = await clientA
      .from('employees')
      .insert({
        company_id: companyAId,
        first_name: 'Piet',
        last_name: 'Medewerker',
        phone: '0612345678',
      })
      .select('id')
      .single();
    employeeAId = requireId(employeeA?.id);
  });

  it('eigenaar kan een medewerker uitnodigen binnen het eigen bedrijf', async () => {
    const { data, error } = await clientA
      .from('invites')
      .insert({
        company_id: companyAId,
        employee_id: employeeAId,
        email: uniqueTestEmail('invitee'),
        token: crypto.randomUUID(),
        invited_by: ownerAId,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select('id')
      .single();

    expect(error).toBeNull();
    expect(data?.id).toBeTruthy();
  });

  describe('tenant-isolatie', () => {
    let inviteAId: string;

    beforeAll(async () => {
      const { data } = await clientA
        .from('invites')
        .insert({
          company_id: companyAId,
          employee_id: employeeAId,
          email: uniqueTestEmail('isolatie-invitee'),
          token: crypto.randomUUID(),
          invited_by: ownerAId,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .select('id')
        .single();
      inviteAId = requireId(data?.id);
    });

    it('bedrijf B kan de uitnodiging van bedrijf A niet lezen', async () => {
      const { data } = await clientB.from('invites').select('*').eq('id', inviteAId);
      expect(data).toEqual([]);
    });

    it('bedrijf B kan geen uitnodiging aanmaken onder het company_id van bedrijf A', async () => {
      const { error } = await clientB.from('invites').insert({
        company_id: companyAId,
        employee_id: employeeAId,
        email: uniqueTestEmail('ingesmokkeld'),
        token: crypto.randomUUID(),
        invited_by: ownerAId,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      });
      expect(error).not.toBeNull();
    });

    it('bedrijf B kan de uitnodiging van bedrijf A niet intrekken', async () => {
      const { data } = await clientB.from('invites').delete().eq('id', inviteAId).select('*');
      expect(data).toEqual([]);
    });
  });

  it('get_invite_by_token() geeft valid:false voor een verlopen uitnodiging', async () => {
    const token = crypto.randomUUID();
    await clientA.from('invites').insert({
      company_id: companyAId,
      employee_id: employeeAId,
      email: uniqueTestEmail('verlopen'),
      token,
      invited_by: ownerAId,
      expires_at: new Date(Date.now() - 1000).toISOString(),
    });

    const { data } = await clientA.rpc('get_invite_by_token', { p_token: token }).maybeSingle();
    expect(data?.valid).toBe(false);
  });

  it('get_invite_by_token() geeft geen rij terug voor een onbestaand token', async () => {
    const { data } = await clientA
      .rpc('get_invite_by_token', { p_token: 'onbestaand-token' })
      .maybeSingle();
    expect(data).toBeNull();
  });

  describe('accept_employee_invite()', () => {
    it('koppelt een nieuw account aan de medewerker bij een geldig token/e-mailadres', async () => {
      const inviteeEmail = uniqueTestEmail('accept-flow');
      const token = crypto.randomUUID();

      const { data: employee } = await clientA
        .from('employees')
        .insert({
          company_id: companyAId,
          first_name: 'Anna',
          last_name: 'Nieuw',
          phone: '0612340000',
        })
        .select('id')
        .single();
      const employeeId = requireId(employee?.id);

      await clientA.from('invites').insert({
        company_id: companyAId,
        employee_id: employeeId,
        email: inviteeEmail,
        token,
        invited_by: ownerAId,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      });

      const inviteeClient = await signUpAndConfirm(inviteeEmail);
      const { data: company, error } = await inviteeClient.rpc('accept_employee_invite', {
        p_token: token,
      });

      expect(error).toBeNull();
      expect(company?.id).toBe(companyAId);

      const {
        data: { user: inviteeUser },
      } = await inviteeClient.auth.getUser();

      const { data: userRow } = await clientA
        .from('users')
        .select('role, company_id')
        .eq('id', requireId(inviteeUser?.id))
        .single();
      expect(userRow?.role).toBe('employee');
      expect(userRow?.company_id).toBe(companyAId);

      const { data: employeeRow } = await clientA
        .from('employees')
        .select('user_id')
        .eq('id', employeeId)
        .single();
      expect(employeeRow?.user_id).toBe(inviteeUser?.id);
    });

    it('weigert een token dat bij een ander e-mailadres hoort', async () => {
      const token = crypto.randomUUID();
      await clientA.from('invites').insert({
        company_id: companyAId,
        employee_id: employeeAId,
        email: uniqueTestEmail('bedoeld-voor-iemand-anders'),
        token,
        invited_by: ownerAId,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      });

      const otherClient = await signUpAndConfirm(uniqueTestEmail('verkeerd-emailadres'));
      const { error } = await otherClient.rpc('accept_employee_invite', { p_token: token });
      expect(error).not.toBeNull();
    });

    it('weigert een al-geaccepteerde uitnodiging opnieuw te accepteren', async () => {
      const inviteeEmail = uniqueTestEmail('dubbel-accepteren');
      const token = crypto.randomUUID();

      const { data: employee } = await clientA
        .from('employees')
        .insert({
          company_id: companyAId,
          first_name: 'Bram',
          last_name: 'Dubbel',
          phone: '0612340001',
        })
        .select('id')
        .single();

      await clientA.from('invites').insert({
        company_id: companyAId,
        employee_id: requireId(employee?.id),
        email: inviteeEmail,
        token,
        invited_by: ownerAId,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      });

      const inviteeClient = await signUpAndConfirm(inviteeEmail);
      await inviteeClient.rpc('accept_employee_invite', { p_token: token });

      const secondClient = await signUpAndConfirm(uniqueTestEmail('tweede-poging'));
      const { error } = await secondClient.rpc('accept_employee_invite', { p_token: token });
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
