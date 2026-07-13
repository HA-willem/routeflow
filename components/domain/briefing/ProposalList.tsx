'use client';

import { CheckCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/primitives/button';
import { EmptyState } from '@/components/primitives/empty-state';
import type { AgentProposal } from '@/lib/briefing/types';
import type { ActionResult } from '@/lib/errors';

import { AiPreviewBadge } from './AiPreviewBadge';
import { ProposalCard } from './ProposalCard';

export type DecideProposalAction = (
  proposalId: string,
  decision: 'approved' | 'rejected',
) => Promise<ActionResult<{ executed: boolean }>>;

interface ProposalListProps {
  proposals: AgentProposal[];
  aiPreview: boolean;
  /** Server Action (41_CodingStandards.md § 1: leeft in app/(app)/briefing-actions.ts,
   * hier als prop doorgegeven i.p.v. geïmporteerd — components/domain hangt nooit
   * rechtstreeks van /app af, zelfde patroon als RouteBoard's moveJobAction). */
  decideProposalAction: DecideProposalAction;
}

const PREVIEW_NOTE = 'Voorbeeldweergave — er is nog niets uitgevoerd of opgeslagen.';

/**
 * Voorstellen-sectie (44 § 3.6/§ 5): kaarten met accepteren/bewerken/afwijzen
 * plus "alles accepteren". Zolang `aiPreview` geldt, werken de acties lokaal
 * (kaart verdwijnt, met ongedaan maken) en meldt de toast expliciet dat er
 * niets is uitgevoerd. Zodra de agent-pipeline echte voorstellen levert
 * (Sprint 7, `aiPreview: false`) roept accepteren/afwijzen de echte
 * `decideProposal`-Server Action aan (BR-702-goedkeuringspad,
 * 022_agent_pipeline.sql `decide_agent_proposal()`), inclusief uitvoering van
 * uitvoerbare voorstellen (Optimization Agent) via de bestaande
 * route-optimize-Edge-Function.
 */
export function ProposalList({ proposals, aiPreview, decideProposalAction }: ProposalListProps) {
  const router = useRouter();
  const [handledIds, setHandledIds] = useState<ReadonlySet<string>>(new Set());
  const [, startTransition] = useTransition();
  const visible = proposals.filter((p) => !handledIds.has(p.id));

  function markHandled(ids: string[]) {
    setHandledIds((prev) => new Set([...prev, ...ids]));
  }

  function restore(ids: string[]) {
    setHandledIds((prev) => {
      const next = new Set(prev);
      for (const id of ids) next.delete(id);
      return next;
    });
  }

  function decideReal(proposal: AgentProposal, decision: 'approved' | 'rejected') {
    startTransition(async () => {
      const result = await decideProposalAction(proposal.id, decision);
      if (!result.success) {
        toast.error(result.error.message);
        restore([proposal.id]);
        return;
      }
      if (decision === 'approved' && result.data.executed) {
        toast.success(`Uitgevoerd: ${proposal.title}`, {
          description: 'De route is bijgewerkt.',
        });
      }
    });
  }

  function handleAccept(proposal: AgentProposal) {
    markHandled([proposal.id]);
    if (aiPreview) {
      toast.success(`Voorstel geaccepteerd: ${proposal.title}`, {
        description: PREVIEW_NOTE,
        action: { label: 'Ongedaan maken', onClick: () => restore([proposal.id]) },
      });
      return;
    }
    toast.success(`Voorstel geaccepteerd: ${proposal.title}`);
    decideReal(proposal, 'approved');
  }

  function handleReject(proposal: AgentProposal) {
    markHandled([proposal.id]);
    if (aiPreview) {
      toast(`Voorstel afgewezen: ${proposal.title}`, {
        description: PREVIEW_NOTE,
        action: { label: 'Ongedaan maken', onClick: () => restore([proposal.id]) },
      });
      return;
    }
    toast(`Voorstel afgewezen: ${proposal.title}`);
    decideReal(proposal, 'rejected');
  }

  function handleEdit() {
    if (aiPreview) toast(PREVIEW_NOTE);
    router.push('/planning');
  }

  function handleFeedback(positive: boolean) {
    toast(positive ? 'Bedankt — dit helpt de AI leren.' : 'Bedankt voor je feedback.', {
      description: aiPreview ? PREVIEW_NOTE : undefined,
    });
  }

  function handleAcceptAll() {
    const targets = visible;
    const ids = targets.map((p) => p.id);
    markHandled(ids);
    if (aiPreview) {
      toast.success(
        `${ids.length} ${ids.length === 1 ? 'voorstel' : 'voorstellen'} geaccepteerd.`,
        {
          description: PREVIEW_NOTE,
          action: { label: 'Ongedaan maken', onClick: () => restore(ids) },
        },
      );
      return;
    }
    toast.success(`${ids.length} ${ids.length === 1 ? 'voorstel' : 'voorstellen'} geaccepteerd.`);
    for (const proposal of targets) decideReal(proposal, 'approved');
  }

  return (
    <section aria-label="AI-voorstellen" className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <h2 className="text-text text-sm font-semibold">
            Voorstellen
            {visible.length > 0 ? (
              <span className="text-text-muted pl-1.5 font-normal tabular-nums">
                {visible.length}
              </span>
            ) : null}
          </h2>
          {aiPreview && proposals.length > 0 ? <AiPreviewBadge /> : null}
        </div>
        {visible.length > 1 ? (
          <Button size="sm" variant="outline" onClick={handleAcceptAll}>
            <CheckCheck aria-hidden className="size-4" />
            Alles accepteren
          </Button>
        ) : null}
      </div>

      {visible.length > 0 ? (
        <div className="flex flex-col gap-3">
          {visible.map((proposal) => (
            <ProposalCard
              key={proposal.id}
              proposal={proposal}
              onAccept={handleAccept}
              onEdit={handleEdit}
              onReject={handleReject}
              onFeedback={handleFeedback}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          title={
            proposals.length > 0
              ? 'Alle voorstellen behandeld. Mooi.'
              : 'Ik heb de planning doorgenomen en zie geen verbetering — je huidige planning is al optimaal.'
          }
          className="py-8"
        />
      )}
    </section>
  );
}
