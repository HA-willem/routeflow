'use client';

import { useTransition } from 'react';
import { toast } from 'sonner';

import { StatusBadge } from '@/components/domain/StatusBadge';
import { Button } from '@/components/primitives/button';
import {
  PLATFORM_PROPOSAL_STATUS_LABEL,
  PLATFORM_PROPOSAL_STATUS_TONE,
  PROPOSAL_RISK_LEVEL_LABEL,
  PROPOSAL_RISK_LEVEL_TONE,
} from '@/lib/labels';
import type { PlatformProposalRow } from '@/lib/platform-admin/queries';

interface ProposalCardProps {
  proposal: PlatformProposalRow;
  onDecide: (
    proposalId: string,
    decision: 'approved' | 'rejected',
  ) => Promise<{ success: true } | { success: false; error: { message: string } }>;
  onMarkMerged: (
    proposalId: string,
  ) => Promise<{ success: true } | { success: false; error: { message: string } }>;
}

/**
 * ProposalCard (platform-admin) — 46_PlatformAdmin.md § 1.3/§ 3.3, hergebruikt
 * het bestaande why/trigger/risico-contract-patroon (analoog aan de
 * WhyExplanation-briefing-kaart, 26_ComponentLibrary.md § 4) maar voor
 * codewijzigingen i.p.v. planningsvoorstellen. "Goedkeuren" merget nooit
 * zelf (BR-901) — daarvoor bestaat geen knop in deze UI.
 */
export function ProposalCard({ proposal, onDecide, onMarkMerged }: ProposalCardProps) {
  const [isPending, startTransition] = useTransition();

  function handleDecide(decision: 'approved' | 'rejected') {
    startTransition(async () => {
      const result = await onDecide(proposal.id, decision);
      if (!result.success) {
        toast.error(result.error.message);
        return;
      }
      toast.success(decision === 'approved' ? 'Voorstel goedgekeurd' : 'Voorstel afgewezen');
    });
  }

  function handleMarkMerged() {
    startTransition(async () => {
      const result = await onMarkMerged(proposal.id);
      if (!result.success) {
        toast.error(result.error.message);
        return;
      }
      toast.success('Geregistreerd als gemerged');
    });
  }

  return (
    <div className="border-border bg-bg rounded-lg border p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-text text-sm font-semibold">{proposal.title}</p>
          {proposal.pr_url ? (
            <a
              href={proposal.pr_url}
              target="_blank"
              rel="noreferrer"
              className="text-primary text-xs underline"
            >
              PR bekijken
            </a>
          ) : null}
        </div>
        <div className="flex gap-2">
          <StatusBadge
            label={PROPOSAL_RISK_LEVEL_LABEL[proposal.risk_level]}
            tone={PROPOSAL_RISK_LEVEL_TONE[proposal.risk_level]}
          />
          <StatusBadge
            label={PLATFORM_PROPOSAL_STATUS_LABEL[proposal.status]}
            tone={PLATFORM_PROPOSAL_STATUS_TONE[proposal.status]}
          />
        </div>
      </div>

      <p className="text-text-muted mt-3 text-sm whitespace-pre-wrap">{proposal.trigger_summary}</p>

      {proposal.alternatives_considered ? (
        <p className="text-text-muted mt-2 text-xs whitespace-pre-wrap">
          <span className="font-medium">Overwogen alternatieven: </span>
          {proposal.alternatives_considered}
        </p>
      ) : null}

      {proposal.linked_feature_request_ids.length > 0 ? (
        <p className="text-text-muted mt-2 text-xs">
          Gekoppeld aan {proposal.linked_feature_request_ids.length} feature request
          {proposal.linked_feature_request_ids.length === 1 ? '' : 's'}.
        </p>
      ) : null}

      {proposal.status === 'open' ? (
        <div className="mt-4 flex gap-2">
          <Button size="sm" disabled={isPending} onClick={() => handleDecide('approved')}>
            Goedkeuren
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={isPending}
            onClick={() => handleDecide('rejected')}
          >
            Afwijzen
          </Button>
        </div>
      ) : null}

      {proposal.status === 'approved' ? (
        <div className="mt-4">
          <Button size="sm" variant="outline" disabled={isPending} onClick={handleMarkMerged}>
            Markeer als gemerged
          </Button>
          <p className="text-text-muted mt-1 text-xs">
            Deze knop mergt niets — merge de PR eerst zelf in git, registreer het daarna hier
            (BR-901).
          </p>
        </div>
      ) : null}
    </div>
  );
}
