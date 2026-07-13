import { beforeAll, describe, expect, it } from 'vitest';

import {
  adminClient,
  createCompanyUserSession,
  signUpAndConfirm,
  uniqueTestEmail,
  type TestSupabaseClient,
} from './helpers';

/**
 * Integratietests voor Sprint 7's AI Execution Pipeline-opslag
 * (022_agent_pipeline.sql, ADR-012 §2/§6/§7/§8): RLS-isolatie op
 * `agent_runs`/`agent_proposals`, de `decide_agent_proposal()`-RPC
 * (state-transition-guard, BR-702-goedkeuringspad) en de kolomgrendel-trigger
 * die voorkomt dat een gebruiker de explainability-velden zelf kan wijzigen
 * (ADR-012 §8: "Beslissingen zijn reproduceerbaar").
 */
describe('Sprint 7 — agent pipeline RLS + decide_agent_proposal()', () => {
  let ownerClient: TestSupabaseClient;
  let companyId: string;
  let administrationClient: TestSupabaseClient;
  let otherCompanyOwnerClient: TestSupabaseClient;
  let agentRunId: string;
  let proposalId: string;

  beforeAll(async () => {
    ownerClient = await signUpAndConfirm(uniqueTestEmail('agents-owner'));
    const { data: company } = await ownerClient.rpc('onboard_company', {
      company_name: `Agent Pipeline Tenant ${crypto.randomUUID().slice(0, 8)}`,
      owner_full_name: 'Eigenaar',
    });
    companyId = requireId(company?.id);
    await ownerClient.auth.updateUser({ data: { company_id: companyId } });
    await ownerClient.auth.refreshSession();

    ({ client: administrationClient } = await createCompanyUserSession(
      companyId,
      uniqueTestEmail('agents-administration'),
      'administration',
    ));

    const otherCompanyOwner = await signUpAndConfirm(uniqueTestEmail('agents-other-owner'));
    const { data: otherCompany } = await otherCompanyOwner.rpc('onboard_company', {
      company_name: `Ander Bedrijf ${crypto.randomUUID().slice(0, 8)}`,
      owner_full_name: 'Andere Eigenaar',
    });
    await otherCompanyOwner.auth.updateUser({ data: { company_id: requireId(otherCompany?.id) } });
    await otherCompanyOwner.auth.refreshSession();
    otherCompanyOwnerClient = otherCompanyOwner;

    // Agent-schrijfpad simuleren zoals agent-orchestrator dat zou doen
    // (service-rol, buiten RLS om) — dit is precies het pad dat lokaal
    // end-to-end tegen echte Edge Functions is geverifieerd.
    const admin = adminClient();
    const { data: run } = await admin
      .from('agent_runs')
      .insert({ company_id: companyId, agent: 'capacity', result: 'success', candidate_count: 1 })
      .select('id')
      .single();
    agentRunId = requireId(run?.id);

    const { data: proposal } = await admin
      .from('agent_proposals')
      .insert({
        company_id: companyId,
        agent_run_id: agentRunId,
        agent: 'capacity',
        scheduled_date: '2026-07-17',
        title: 'Capaciteitstekort op 2026-07-17',
        summary: 'Testvoorstel',
        reasoning: 'Testreden',
        data_sources: ['Test-bron'],
        business_rules: [{ code: 'BR-202', label: 'Werkdaglimiet' }],
        confidence: 0.8,
        impact: 'Testimpact',
        expected_gain: 'Testwinst',
        alternatives: 'Test-alternatief',
        severity: 'urgent',
      })
      .select('id')
      .single();
    proposalId = requireId(proposal?.id);
  });

  it('toont agent_proposals aan owner binnen het eigen bedrijf', async () => {
    const { data, error } = await ownerClient
      .from('agent_proposals')
      .select('id, title')
      .eq('id', proposalId);
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
  });

  it('verbergt agent_proposals voor Administratie (rechtenmatrix: geen Planning-toegang)', async () => {
    const { data, error } = await administrationClient
      .from('agent_proposals')
      .select('id')
      .eq('id', proposalId);
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it('verbergt agent_proposals en agent_runs van een ander bedrijf (tenant-isolatie)', async () => {
    const { data: proposals } = await otherCompanyOwnerClient
      .from('agent_proposals')
      .select('id')
      .eq('id', proposalId);
    expect(proposals).toEqual([]);

    const { data: runs } = await otherCompanyOwnerClient
      .from('agent_runs')
      .select('id')
      .eq('id', agentRunId);
    expect(runs).toEqual([]);
  });

  it('weigert een rechtstreekse INSERT op agent_proposals door een ingelogde gebruiker (alleen service-rol schrijft)', async () => {
    const { error } = await ownerClient.from('agent_proposals').insert({
      company_id: companyId,
      agent_run_id: agentRunId,
      agent: 'capacity',
      scheduled_date: '2026-07-18',
      title: 'Zelf-ingevoegd voorstel',
      summary: 's',
      reasoning: 'r',
      confidence: 0.5,
      impact: 'i',
      expected_gain: 'e',
      alternatives: 'a',
    });
    expect(error).not.toBeNull();
  });

  it('weigert een rechtstreekse UPDATE op een expliciete-uitleg-kolom, ook door de eigenaar (kolomgrendel-trigger)', async () => {
    const { error } = await ownerClient
      .from('agent_proposals')
      .update({ confidence: 0.01 })
      .eq('id', proposalId);
    expect(error).not.toBeNull();
    expect(error?.code).toBe('42501');
  });

  it('decide_agent_proposal(): accepteren zet approval_status en decided_by/decided_at (BR-702)', async () => {
    const { data, error } = await ownerClient.rpc('decide_agent_proposal', {
      p_proposal_id: proposalId,
      p_approval_status: 'approved',
    });
    expect(error).toBeNull();
    expect(data?.approval_status).toBe('approved');
    expect(data?.decided_by).not.toBeNull();
    expect(data?.decided_at).not.toBeNull();
  });

  it('decide_agent_proposal(): een al-behandeld voorstel opnieuw beslissen faalt (state-transition-guard)', async () => {
    const { error } = await ownerClient.rpc('decide_agent_proposal', {
      p_proposal_id: proposalId,
      p_approval_status: 'rejected',
    });
    expect(error).not.toBeNull();
    expect(error?.code).toBe('P0002');
  });

  it('decide_agent_proposal(): een ongeldige approval_status-waarde wordt geweigerd', async () => {
    const admin = adminClient();
    const { data: run } = await admin
      .from('agent_runs')
      .insert({ company_id: companyId, agent: 'weather', result: 'success', candidate_count: 1 })
      .select('id')
      .single();
    const { data: freshProposal } = await admin
      .from('agent_proposals')
      .insert({
        company_id: companyId,
        agent_run_id: requireId(run?.id),
        agent: 'weather',
        scheduled_date: '2026-07-19',
        title: 'Ander testvoorstel',
        summary: 's',
        reasoning: 'r',
        confidence: 0.5,
        impact: 'i',
        expected_gain: 'e',
        alternatives: 'a',
      })
      .select('id')
      .single();

    const { error } = await ownerClient.rpc('decide_agent_proposal', {
      p_proposal_id: requireId(freshProposal?.id),
      // 'proposed' is een geldige enum-waarde op TS-niveau maar geen toegestane
      // *beslissing* — de RPC's eigen runtime-check (niet het TS-type) moet dit weigeren.
      p_approval_status: 'proposed',
    });
    expect(error).not.toBeNull();
    expect(error?.code).toBe('22023');
  });
});

function requireId(id: string | undefined): string {
  if (!id) {
    throw new Error('Verwachtte een id.');
  }
  return id;
}
