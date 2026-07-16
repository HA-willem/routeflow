import { beforeAll, describe, expect, it } from 'vitest';

import {
  adminClient,
  seedPlatformAdmin,
  signUpAndConfirm,
  uniqueTestEmail,
  type TestSupabaseClient,
} from './helpers';

/**
 * Integratietests voor Sprint 11's Platform Admin & Product Agent-fundament
 * (027/028/029/030-migraties, ADR-013, 46_PlatformAdmin.md, BR-900–904):
 * platform-admin-autorisatie los van tenant-RLS, cross-tenant zichtbaarheid
 * voor feature requests/proposals uitsluitend voor platform-admins, en de
 * decide/mark-merged-RPC's (Human-Approval-grens, BR-901).
 */
describe('Sprint 11 — platform admin RLS + decide_platform_proposal()/mark_platform_proposal_merged()', () => {
  let ownerClient: TestSupabaseClient;
  let companyId: string;
  let otherCompanyOwnerClient: TestSupabaseClient;
  let platformAdminClient: TestSupabaseClient;
  let featureRequestId: string;
  let proposalId: string;

  beforeAll(async () => {
    ownerClient = await signUpAndConfirm(uniqueTestEmail('pa-owner'));
    const { data: company } = await ownerClient.rpc('onboard_company', {
      company_name: `Platform Admin Tenant ${crypto.randomUUID().slice(0, 8)}`,
      owner_full_name: 'Eigenaar',
    });
    companyId = requireId(company?.id);
    await ownerClient.auth.updateUser({ data: { company_id: companyId } });
    await ownerClient.auth.refreshSession();

    const otherCompanyOwner = await signUpAndConfirm(uniqueTestEmail('pa-other-owner'));
    const { data: otherCompany } = await otherCompanyOwner.rpc('onboard_company', {
      company_name: `Ander Bedrijf ${crypto.randomUUID().slice(0, 8)}`,
      owner_full_name: 'Andere Eigenaar',
    });
    await otherCompanyOwner.auth.updateUser({ data: { company_id: requireId(otherCompany?.id) } });
    await otherCompanyOwner.auth.refreshSession();
    otherCompanyOwnerClient = otherCompanyOwner;

    // Platform-admin: eigen bedrijf (Eigenaar-rol) én op de allowlist — toont
    // dat platform-toegang een orthogonale dimensie is, geen vervanging van
    // de tenant-rol (ADR-013 §1, BR-900).
    const platformAdminEmail = uniqueTestEmail('pa-admin');
    platformAdminClient = await signUpAndConfirm(platformAdminEmail);
    const { data: adminCompany } = await platformAdminClient.rpc('onboard_company', {
      company_name: `Platform Admin Eigen Bedrijf ${crypto.randomUUID().slice(0, 8)}`,
      owner_full_name: 'Platform Admin',
    });
    await platformAdminClient.auth.updateUser({
      data: { company_id: requireId(adminCompany?.id) },
    });
    await platformAdminClient.auth.refreshSession();
    const {
      data: { user: platformAdminUser },
    } = await platformAdminClient.auth.getUser();
    await seedPlatformAdmin(requireId(platformAdminUser?.id));

    const { data: featureRequest } = await ownerClient
      .from('feature_requests')
      .insert({
        company_id: companyId,
        submitted_by: requireId((await ownerClient.auth.getUser()).data.user?.id),
        title: 'WhatsApp-herinnering i.p.v. e-mail',
        description: 'Testverzoek voor integratietest.',
      })
      .select('id')
      .single();
    featureRequestId = requireId(featureRequest?.id);
  });

  it('toont een feature request aan de eigen indiener', async () => {
    const { data, error } = await ownerClient
      .from('feature_requests')
      .select('id')
      .eq('id', featureRequestId);
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
  });

  it('verbergt een feature request voor een ander bedrijf (BR-904, geen cross-tenant zichtbaarheid)', async () => {
    const { data } = await otherCompanyOwnerClient
      .from('feature_requests')
      .select('id')
      .eq('id', featureRequestId);
    expect(data).toEqual([]);
  });

  it('toont een feature request platformbreed aan een platform-admin (BR-904-uitzondering)', async () => {
    const { data, error } = await platformAdminClient
      .from('feature_requests')
      .select('id')
      .eq('id', featureRequestId);
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
  });

  it('weigert dat een niet-platform-admin platform_proposals leest of aanmaakt (BR-900)', async () => {
    const { data } = await ownerClient.from('platform_proposals').select('id');
    expect(data).toEqual([]);

    const { error: insertError } = await ownerClient.from('platform_proposals').insert({
      title: 'Zelf-ingevoegd voorstel',
      trigger_summary: 'x',
    });
    expect(insertError).not.toBeNull();
  });

  it('platform-admin kan zelf een voorstel aanmaken (Sprint 11-fundament, handmatig pad)', async () => {
    const { data, error } = await platformAdminClient
      .from('platform_proposals')
      .insert({
        title: 'WhatsApp-herinnering toevoegen',
        trigger_summary: `Getriggerd door feature request ${featureRequestId}`,
        risk_level: 'normal',
        linked_feature_request_ids: [featureRequestId],
      })
      .select('id')
      .single();
    expect(error).toBeNull();
    proposalId = requireId(data?.id);
  });

  it('weigert een rechtstreekse UPDATE op een contract-kolom door de platform-admin (kolomgrendel-trigger)', async () => {
    const { error } = await platformAdminClient
      .from('platform_proposals')
      .update({ trigger_summary: 'gemanipuleerd' })
      .eq('id', proposalId);
    expect(error).not.toBeNull();
    expect(error?.code).toBe('42501');
  });

  it('weigert decide_platform_proposal() voor een niet-platform-admin', async () => {
    const { error } = await ownerClient.rpc('decide_platform_proposal', {
      p_proposal_id: proposalId,
      p_status: 'approved',
    });
    expect(error).not.toBeNull();
    expect(error?.code).toBe('42501');
  });

  it('decide_platform_proposal(): open → approved zet decided_by/decided_at (BR-901)', async () => {
    const { data, error } = await platformAdminClient.rpc('decide_platform_proposal', {
      p_proposal_id: proposalId,
      p_status: 'approved',
    });
    expect(error).toBeNull();
    expect(data?.status).toBe('approved');
    expect(data?.decided_by).not.toBeNull();
    expect(data?.decided_at).not.toBeNull();
  });

  it('decide_platform_proposal(): een al-behandeld voorstel opnieuw beslissen faalt (state-transition-guard)', async () => {
    const { error } = await platformAdminClient.rpc('decide_platform_proposal', {
      p_proposal_id: proposalId,
      p_status: 'rejected',
    });
    expect(error).not.toBeNull();
    expect(error?.code).toBe('P0002');
  });

  it('mark_platform_proposal_merged(): weigert vanuit "open" (moet eerst approved zijn)', async () => {
    const admin = adminClient();
    const { data: freshProposal } = await admin
      .from('platform_proposals')
      .insert({ title: 'Nog niet goedgekeurd', trigger_summary: 'x' })
      .select('id')
      .single();

    const { error } = await platformAdminClient.rpc('mark_platform_proposal_merged', {
      p_proposal_id: requireId(freshProposal?.id),
    });
    expect(error).not.toBeNull();
    expect(error?.code).toBe('P0002');
  });

  it('mark_platform_proposal_merged(): approved → merged (puur boekhouding, BR-901)', async () => {
    const { data, error } = await platformAdminClient.rpc('mark_platform_proposal_merged', {
      p_proposal_id: proposalId,
    });
    expect(error).toBeNull();
    expect(data?.status).toBe('merged');
  });

  it('platform-admin leest agent_runs platformbreed (FR-953, 030-migratie), niet-admin krijgt alleen het eigen bedrijf', async () => {
    const admin = adminClient();
    await admin
      .from('agent_runs')
      .insert({ company_id: companyId, agent: 'capacity', result: 'success', candidate_count: 0 });

    const { data: asAdmin, error: adminError } = await platformAdminClient
      .from('agent_runs')
      .select('company_id')
      .eq('company_id', companyId);
    expect(adminError).toBeNull();
    expect(asAdmin?.length).toBeGreaterThan(0);

    const { data: asOtherOwner } = await otherCompanyOwnerClient
      .from('agent_runs')
      .select('company_id')
      .eq('company_id', companyId);
    expect(asOtherOwner).toEqual([]);
  });
});

function requireId(id: string | undefined | null): string {
  if (!id) {
    throw new Error('Verwachtte een id.');
  }
  return id;
}
