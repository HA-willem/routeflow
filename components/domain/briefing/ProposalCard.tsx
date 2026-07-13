'use client';

import { Check, ChevronDown, Pencil, Sparkles, ThumbsDown, ThumbsUp, X } from 'lucide-react';
import { useId, useState } from 'react';

import { Button } from '@/components/primitives/button';
import type { AgentProposal } from '@/lib/briefing/types';
import { cn } from '@/lib/utils';

const AGENT_LABELS: Record<AgentProposal['agent'], string> = {
  planning: 'Planning',
  replanning: 'Herplanning',
  weather: 'Weer',
  optimization: 'Optimalisatie',
  capacity: 'Capaciteit',
  communication: 'Communicatie',
  revenue: 'Omzet',
  invoice: 'Facturatie',
};

interface ProposalCardProps {
  proposal: AgentProposal;
  onAccept: (proposal: AgentProposal) => void;
  onEdit: () => void;
  onReject: (proposal: AgentProposal) => void;
  onFeedback: (positive: boolean) => void;
}

/**
 * AI-voorstelkaart (44 § 5) — vaste structuur gevoed door het Explanation
 * Generator-schema (ADR-012 § 6): titel, samenvatting, confidence, impact,
 * winst, en een uitklapbare "Waarom?" met de vier vaste vragen (44 § 8).
 * Naast de hoofdacties een onafhankelijke 👍/👎-feedbackknop (FR-902).
 */
export function ProposalCard({
  proposal,
  onAccept,
  onEdit,
  onReject,
  onFeedback,
}: ProposalCardProps) {
  const [whyOpen, setWhyOpen] = useState(false);
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null);
  const whyId = useId();
  const confidencePct = Math.round(proposal.confidence * 100);

  function giveFeedback(positive: boolean) {
    setFeedback(positive ? 'up' : 'down');
    onFeedback(positive);
  }

  return (
    <article className="border-border bg-bg flex flex-col gap-4 rounded-lg border p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 pb-1">
            <span className="bg-primary/10 text-primary inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium">
              <Sparkles aria-hidden className="size-3" />
              {AGENT_LABELS[proposal.agent]}
            </span>
            <span className="text-text-muted text-xs tabular-nums">{confidencePct}% zeker</span>
          </div>
          <h3 className="text-text text-sm font-semibold">{proposal.title}</h3>
          <p className="text-text-muted pt-0.5 text-sm">{proposal.summary}</p>
        </div>
        <div aria-hidden className="bg-border mt-1 h-1 w-16 shrink-0 overflow-hidden rounded-full">
          <div className="bg-primary h-full rounded-full" style={{ width: `${confidencePct}%` }} />
        </div>
      </div>

      <dl className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
        <div className="flex gap-2">
          <dt className="text-text-muted shrink-0 text-xs leading-5">Impact</dt>
          <dd className="text-text text-xs leading-5">{proposal.impact}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="text-text-muted shrink-0 text-xs leading-5">Winst</dt>
          <dd className="text-text text-xs leading-5">{proposal.expectedGain}</dd>
        </div>
      </dl>

      <div>
        <button
          type="button"
          onClick={() => setWhyOpen((open) => !open)}
          aria-expanded={whyOpen}
          aria-controls={whyId}
          className="text-primary flex items-center gap-1 text-xs font-medium hover:underline"
        >
          Waarom dit voorstel?
          <ChevronDown
            aria-hidden
            className={cn('size-3 transition-transform duration-200', whyOpen && 'rotate-180')}
          />
        </button>
        {whyOpen ? (
          <dl id={whyId} className="border-border mt-3 flex flex-col gap-3 border-l-2 pl-4">
            <ExplainRow question="Waarom?" answer={proposal.reasoning} />
            <ExplainRow question="Welke gegevens?" answer={proposal.dataSources.join(' · ')} />
            <ExplainRow
              question="Welke regels?"
              answer={proposal.businessRules
                .map((rule) => `${rule.label} (${rule.code})`)
                .join(' · ')}
            />
            <ExplainRow question="Waarom niet anders?" answer={proposal.alternatives} />
          </dl>
        ) : null}
      </div>

      <div className="border-border flex flex-wrap items-center justify-between gap-2 border-t pt-4">
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => onAccept(proposal)}>
            <Check aria-hidden className="size-4" />
            Accepteren
          </Button>
          <Button size="sm" variant="outline" onClick={onEdit}>
            <Pencil aria-hidden className="size-4" />
            Bewerken
          </Button>
          <Button size="sm" variant="ghost" onClick={() => onReject(proposal)}>
            <X aria-hidden className="size-4" />
            Afwijzen
          </Button>
        </div>
        <div className="flex gap-1">
          <button
            type="button"
            aria-label="Dit voorstel is nuttig"
            aria-pressed={feedback === 'up'}
            onClick={() => giveFeedback(true)}
            className={cn(
              'hover:bg-surface rounded-md p-1.5 transition-colors duration-150',
              feedback === 'up' ? 'text-success' : 'text-text-muted',
            )}
          >
            <ThumbsUp className="size-4" />
          </button>
          <button
            type="button"
            aria-label="Dit voorstel is niet nuttig"
            aria-pressed={feedback === 'down'}
            onClick={() => giveFeedback(false)}
            className={cn(
              'hover:bg-surface rounded-md p-1.5 transition-colors duration-150',
              feedback === 'down' ? 'text-danger' : 'text-text-muted',
            )}
          >
            <ThumbsDown className="size-4" />
          </button>
        </div>
      </div>
    </article>
  );
}

function ExplainRow({ question, answer }: { question: string; answer: string }) {
  return (
    <div>
      <dt className="text-text text-xs font-medium">{question}</dt>
      <dd className="text-text-muted pt-0.5 text-xs leading-relaxed">{answer}</dd>
    </div>
  );
}
