import type { Database } from '@/types/database.types';

import type { AgentProposal } from './types';
import type { SupabaseClient } from '@supabase/supabase-js';

type AgentProposalRow = Database['public']['Tables']['agent_proposals']['Row'];

/** Database-rij → UI-contract (ADR-012 § 6 Explanation Generator-schema) — gedeeld tussen de Morning Briefing en de Planning-pagina (`45_AgentMemory.md` niet van toepassing, puur mapping). */
export function toAgentProposal(row: AgentProposalRow): AgentProposal {
  return {
    id: row.id,
    agent: row.agent,
    title: row.title,
    summary: row.summary,
    reasoning: row.reasoning,
    dataSources: (row.data_sources ?? []) as string[],
    businessRules: (row.business_rules ?? []) as unknown as AgentProposal['businessRules'],
    confidence: row.confidence,
    impact: row.impact,
    expectedGain: row.expected_gain,
    alternatives: row.alternatives,
    severity: row.severity,
    payload: row.payload as AgentProposal['payload'],
  };
}

/**
 * Open (nog niet behandelde) voorstellen binnen een datumbereik — gebruikt
 * door zowel de Morning Briefing (§ vandaag t/m horizon) als de
 * Planning-pagina (§ zichtbare week/dag, FR-900-uitbreiding "voorstellen ook
 * bij Planning zichtbaar"). Geen `aiPreview`-demo-fallback hier — Planning is
 * een operationele tool, geen showcase; bij nul echte voorstellen toont
 * `ProposalList` gewoon zijn bestaande lege staat.
 */
export async function getOpenProposals(
  supabase: SupabaseClient<Database>,
  companyId: string,
  range: { from: string; to: string },
): Promise<AgentProposal[]> {
  const { data } = await supabase
    .from('agent_proposals')
    .select('*')
    .eq('company_id', companyId)
    .eq('approval_status', 'proposed')
    .gte('scheduled_date', range.from)
    .lte('scheduled_date', range.to)
    .order('scheduled_date', { ascending: true })
    .order('created_at', { ascending: true });

  return (data ?? []).map(toAgentProposal);
}
