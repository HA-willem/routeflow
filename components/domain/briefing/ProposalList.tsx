'use client';

import { CheckCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/primitives/button';
import { EmptyState } from '@/components/primitives/empty-state';
import type { AgentProposal } from '@/lib/briefing/types';

import { AiPreviewBadge } from './AiPreviewBadge';
import { ProposalCard } from './ProposalCard';

interface ProposalListProps {
  proposals: AgentProposal[];
  aiPreview: boolean;
}

const PREVIEW_NOTE = 'Voorbeeldweergave — er is nog niets uitgevoerd of opgeslagen.';

/**
 * Voorstellen-sectie (44 § 3.6/§ 5): kaarten met accepteren/bewerken/afwijzen
 * plus "alles accepteren". Zolang `aiPreview` geldt, werken de acties lokaal
 * (kaart verdwijnt, met ongedaan maken) en meldt de toast expliciet dat er
 * niets is uitgevoerd — de echte uitvoering via Edge Functions is Sprint 7.
 */
export function ProposalList({ proposals, aiPreview }: ProposalListProps) {
  const router = useRouter();
  const [handledIds, setHandledIds] = useState<ReadonlySet<string>>(new Set());
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

  function handleAccept(proposal: AgentProposal) {
    markHandled([proposal.id]);
    toast.success(`Voorstel geaccepteerd: ${proposal.title}`, {
      description: aiPreview ? PREVIEW_NOTE : undefined,
      action: { label: 'Ongedaan maken', onClick: () => restore([proposal.id]) },
    });
  }

  function handleReject(proposal: AgentProposal) {
    markHandled([proposal.id]);
    toast(`Voorstel afgewezen: ${proposal.title}`, {
      description: aiPreview ? PREVIEW_NOTE : undefined,
      action: { label: 'Ongedaan maken', onClick: () => restore([proposal.id]) },
    });
  }

  function handleEdit(proposal: AgentProposal) {
    if (aiPreview) toast(PREVIEW_NOTE);
    void proposal;
    router.push('/planning');
  }

  function handleFeedback(proposal: AgentProposal, positive: boolean) {
    void proposal;
    toast(positive ? 'Bedankt — dit helpt de AI leren.' : 'Bedankt voor je feedback.', {
      description: aiPreview ? PREVIEW_NOTE : undefined,
    });
  }

  function handleAcceptAll() {
    const ids = visible.map((p) => p.id);
    markHandled(ids);
    toast.success(`${ids.length} ${ids.length === 1 ? 'voorstel' : 'voorstellen'} geaccepteerd.`, {
      description: aiPreview ? PREVIEW_NOTE : undefined,
      action: { label: 'Ongedaan maken', onClick: () => restore(ids) },
    });
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
