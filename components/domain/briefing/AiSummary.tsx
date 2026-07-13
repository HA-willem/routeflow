import { Sparkles } from 'lucide-react';

import type { BriefingConfidence } from '@/lib/briefing/types';

import { AiPreviewBadge } from './AiPreviewBadge';

interface AiSummaryProps {
  summary: string;
  confidence: BriefingConfidence;
  aiPreview: boolean;
}

/**
 * AI Samenvatting + geaggregeerd dagvertrouwen (44 § 3.4/3.5/§ 4) — de kern van
 * de briefing: één alinea, platte tekst, geen knoppen erin. Confidence als korte
 * tekst met subtiele indicator, nooit een kaal percentage.
 */
export function AiSummary({ summary, confidence, aiPreview }: AiSummaryProps) {
  return (
    <section
      aria-label="AI-samenvatting"
      className="border-border bg-surface rounded-lg border p-6"
    >
      <div className="flex items-center gap-2 pb-3">
        <Sparkles aria-hidden className="text-primary size-4" />
        <h2 className="text-text text-sm font-semibold">Vannacht doorgenomen</h2>
        {aiPreview ? <AiPreviewBadge /> : null}
      </div>
      <p className="text-text max-w-2xl text-base leading-relaxed">{summary}</p>
      <div className="mt-4 flex items-center gap-3">
        <div aria-hidden className="bg-border h-1 w-24 overflow-hidden rounded-full">
          <div
            className="bg-primary h-full rounded-full transition-[width] duration-200"
            style={{ width: `${Math.round(confidence.score * 100)}%` }}
          />
        </div>
        <p className="text-text-muted text-xs">{confidence.label}</p>
      </div>
    </section>
  );
}
