import type { Database } from '@/types/database.types';

import type { SupabaseClient } from '@supabase/supabase-js';

type AgentRunRow = Database['public']['Tables']['agent_runs']['Row'];
export type PlatformProposalRow = Database['public']['Tables']['platform_proposals']['Row'];
export type FeatureRequestRow = Database['public']['Tables']['feature_requests']['Row'];

export interface CompanyAgentHealth {
  companyId: string;
  companyName: string;
  totalRuns: number;
  failedRuns: number;
  lastRunAt: string;
}

/**
 * Cross-tenant agent-rungezondheid (FR-953, 46_PlatformAdmin.md § 1.3) —
 * geaggregeerd over de laatste 7 dagen. Hergebruikt bestaande `agent_runs`-data
 * (Sprint 7); geen nieuwe telemetrie-infrastructuur. RLS-bypass via
 * `is_platform_admin()` (030_agent_runs_platform_admin_read.sql) levert hier
 * alle bedrijven i.p.v. alleen het eigen bedrijf.
 */
export async function getAgentHealthOverview(
  supabase: SupabaseClient<Database>,
): Promise<CompanyAgentHealth[]> {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: runs } = await supabase
    .from('agent_runs')
    .select('company_id, result, started_at, companies(name)')
    .gte('started_at', since)
    .order('started_at', { ascending: false });

  const byCompany = new Map<string, CompanyAgentHealth>();

  for (const run of (runs ?? []) as Array<
    Pick<AgentRunRow, 'company_id' | 'result' | 'started_at'> & {
      companies: { name: string } | null;
    }
  >) {
    const existing = byCompany.get(run.company_id);
    if (existing) {
      existing.totalRuns += 1;
      if (run.result === 'failed') existing.failedRuns += 1;
      continue;
    }
    byCompany.set(run.company_id, {
      companyId: run.company_id,
      companyName: run.companies?.name ?? 'Onbekend bedrijf',
      totalRuns: 1,
      failedRuns: run.result === 'failed' ? 1 : 0,
      lastRunAt: run.started_at,
    });
  }

  return Array.from(byCompany.values()).sort((a, b) => b.failedRuns - a.failedRuns);
}

/** Product Agent-voorstellen (FR-952, 46_PlatformAdmin.md § 1.3/§ 3.3), nieuwste eerst. */
export async function getPlatformProposals(
  supabase: SupabaseClient<Database>,
): Promise<PlatformProposalRow[]> {
  const { data } = await supabase
    .from('platform_proposals')
    .select('*')
    .order('created_at', { ascending: false });

  return data ?? [];
}

/** Feature requests platformbreed (FR-952), voor de inbox in het portal. */
export async function getFeatureRequestsForPortal(
  supabase: SupabaseClient<Database>,
): Promise<Array<FeatureRequestRow & { companies: { name: string } | null }>> {
  const { data } = await supabase
    .from('feature_requests')
    .select('*, companies(name)')
    .order('created_at', { ascending: false });

  return data ?? [];
}
