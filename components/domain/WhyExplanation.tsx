import { cn } from '@/lib/utils';

interface WhyExplanationProps {
  /** De uitkomst zelf, bv. de berekende datum. */
  summary: string;
  /** Korte, mens-leesbare toelichting op de uitkomst (BR-700: transparantie). */
  reason: string;
  className?: string;
}

/**
 * WhyExplanation (basis) — 26_ComponentLibrary.md § 4, BR-700. Toont niet
 * alleen een uitkomst van de AI Planner (hier: de horizon-laag, FR-020) maar
 * ook een korte reden erbij, zodat een planner nooit een "magisch" getal ziet.
 * Dit is de basisvariant (samenvatting + reden inline); de volledige variant
 * met stapsgewijze berekening/score volgt in Sprint 7 (15_AIPlanner.md § 4,
 * 40_Implementatieplan.md Sprint 7).
 */
export function WhyExplanation({ summary, reason, className }: WhyExplanationProps) {
  return (
    <div className={cn('text-sm', className)}>
      <p className="text-text">{summary}</p>
      <p className="text-text-muted text-xs">{reason}</p>
    </div>
  );
}
