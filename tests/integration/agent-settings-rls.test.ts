import { beforeAll, describe, expect, it } from 'vitest';

import {
  createCompanyUserSession,
  signUpAndConfirm,
  uniqueTestEmail,
  type TestSupabaseClient,
} from './helpers';

/**
 * Integratietests voor agent_settings (042_agent_settings.sql) — de
 * "AI-assistent"-instellingen (automatiseringsniveau/confidence-drempel per
 * agent, 15_AIPlanner.md § 8). Alleen Eigenaar/Admin mag schrijven
 * (23_Gebruikersrollen.md-precedent, zelfde rechten als Bedrijfsinstellingen);
 * Planner mag lezen (context), Medewerker/Administratie niet.
 */
describe('agent_settings RLS (NFR-301)', () => {
  let ownerClient: TestSupabaseClient;
  let companyId: string;
  let plannerClient: TestSupabaseClient;
  let administrationClient: TestSupabaseClient;
  let otherCompanyOwnerClient: TestSupabaseClient;

  beforeAll(async () => {
    ownerClient = await signUpAndConfirm(uniqueTestEmail('agent-settings-owner'));
    const { data: company } = await ownerClient.rpc('onboard_company', {
      company_name: `Agent Settings Tenant ${crypto.randomUUID().slice(0, 8)}`,
      owner_full_name: 'Eigenaar',
    });
    companyId = requireId(company?.id);
    await ownerClient.auth.updateUser({ data: { company_id: companyId } });
    await ownerClient.auth.refreshSession();

    ({ client: plannerClient } = await createCompanyUserSession(
      companyId,
      uniqueTestEmail('agent-settings-planner'),
      'planner',
    ));
    ({ client: administrationClient } = await createCompanyUserSession(
      companyId,
      uniqueTestEmail('agent-settings-administration'),
      'administration',
    ));

    const otherOwner = await signUpAndConfirm(uniqueTestEmail('agent-settings-other-owner'));
    const { data: otherCompany } = await otherOwner.rpc('onboard_company', {
      company_name: `Ander Bedrijf ${crypto.randomUUID().slice(0, 8)}`,
      owner_full_name: 'Andere Eigenaar',
    });
    await otherOwner.auth.updateUser({ data: { company_id: requireId(otherCompany?.id) } });
    await otherOwner.auth.refreshSession();
    otherCompanyOwnerClient = otherOwner;
  });

  it('eigenaar kan een agent-instelling opslaan binnen het eigen bedrijf', async () => {
    const { data, error } = await ownerClient
      .from('agent_settings')
      .insert({
        company_id: companyId,
        agent: 'optimization',
        automation_level: 'semi_automatic',
        confidence_threshold: 0.85,
      })
      .select('*')
      .single();

    expect(error).toBeNull();
    expect(data?.automation_level).toBe('semi_automatic');
    expect(data?.confidence_threshold).toBe(0.85);
  });

  it('planner mag lezen maar niet schrijven', async () => {
    const { data: readData, error: readError } = await plannerClient
      .from('agent_settings')
      .select('*')
      .eq('company_id', companyId);
    expect(readError).toBeNull();
    expect(readData?.length).toBeGreaterThan(0);

    const { error: writeError } = await plannerClient.from('agent_settings').insert({
      company_id: companyId,
      agent: 'weather',
      automation_level: 'fully_automatic',
      confidence_threshold: 0.9,
    });
    expect(writeError).not.toBeNull();
  });

  it('administratie mag agent_settings niet lezen of schrijven', async () => {
    const { data: readData } = await administrationClient
      .from('agent_settings')
      .select('*')
      .eq('company_id', companyId);
    expect(readData).toEqual([]);

    const { error: writeError } = await administrationClient.from('agent_settings').insert({
      company_id: companyId,
      agent: 'capacity',
      automation_level: 'proposal',
      confidence_threshold: 0.7,
    });
    expect(writeError).not.toBeNull();
  });

  it('bedrijf B kan de agent-instellingen van bedrijf A niet lezen of wijzigen', async () => {
    const { data } = await otherCompanyOwnerClient
      .from('agent_settings')
      .select('*')
      .eq('company_id', companyId);
    expect(data).toEqual([]);

    const { error } = await otherCompanyOwnerClient
      .from('agent_settings')
      .update({ automation_level: 'fully_automatic' })
      .eq('company_id', companyId);
    // RLS levert geen rijen op om te wijzigen (geen error, wel 0 effect) —
    // controleer dat de waarde bij bedrijf A onaangetast blijft.
    expect(error).toBeNull();
    const { data: unchanged } = await ownerClient
      .from('agent_settings')
      .select('automation_level')
      .eq('company_id', companyId)
      .eq('agent', 'optimization')
      .single();
    expect(unchanged?.automation_level).toBe('semi_automatic');
  });

  it('weigert een ongeldige confidence-drempel buiten 0..1 (DB-constraint)', async () => {
    const { error } = await ownerClient.from('agent_settings').insert({
      company_id: companyId,
      agent: 'invoice',
      automation_level: 'proposal',
      confidence_threshold: 1.5,
    });
    expect(error).not.toBeNull();
  });

  it('upsert op (company_id, agent) werkt (herhaald opslaan overschrijft, stapelt niet)', async () => {
    await ownerClient
      .from('agent_settings')
      .upsert(
        {
          company_id: companyId,
          agent: 'planning',
          automation_level: 'proposal',
          confidence_threshold: 0.7,
        },
        { onConflict: 'company_id,agent' },
      );
    const { error } = await ownerClient.from('agent_settings').upsert(
      {
        company_id: companyId,
        agent: 'planning',
        automation_level: 'semi_automatic',
        confidence_threshold: 0.6,
      },
      { onConflict: 'company_id,agent' },
    );
    expect(error).toBeNull();

    const { data } = await ownerClient
      .from('agent_settings')
      .select('automation_level')
      .eq('company_id', companyId)
      .eq('agent', 'planning');
    expect(data?.length).toBe(1);
    expect(data?.[0]?.automation_level).toBe('semi_automatic');
  });
});

function requireId(id: string | undefined): string {
  if (!id) {
    throw new Error('Verwachtte een id.');
  }
  return id;
}
