import { PageHeader } from '@/components/composed/PageHeader';
import { AgentSettingsForm } from '@/components/domain/AgentSettingsForm';
import { BUILT_AGENTS } from '@/lib/agents/labels';
import { requireOnboardedUser } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import type { AgentSettingsFormInput } from '@/lib/validation/agent-settings';

import { updateAgentSettings } from './actions';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI-assistent — ServOps',
};

const DEFAULT_AUTOMATION_LEVEL = 'proposal' as const;
const DEFAULT_CONFIDENCE_THRESHOLD = 0.7;

export default async function AiAssistentPage() {
  const { profile } = await requireOnboardedUser();
  const supabase = await createClient();

  const { data: rows } = await supabase
    .from('agent_settings')
    .select('agent, automation_level, confidence_threshold')
    .eq('company_id', profile.company_id);

  const byAgent = new Map((rows ?? []).map((row) => [row.agent, row]));

  const defaultValues: AgentSettingsFormInput = {
    settings: BUILT_AGENTS.map((agent) => {
      const existing = byAgent.get(agent);
      return {
        agent,
        automationLevel: existing?.automation_level ?? DEFAULT_AUTOMATION_LEVEL,
        confidenceThreshold: existing?.confidence_threshold ?? DEFAULT_CONFIDENCE_THRESHOLD,
      };
    }),
  };

  return (
    <div>
      <PageHeader
        title="AI-assistent"
        description="Automatiseringsniveau en confidence-drempel per agent."
      />
      <AgentSettingsForm defaultValues={defaultValues} onSubmit={updateAgentSettings} />
    </div>
  );
}
