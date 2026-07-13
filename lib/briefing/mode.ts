import type { AgentProposal, BriefingWarning, MorningMode } from './types';

/**
 * Morning Mode — afgeleide, geen los ingesteld veld (44_MorningBriefing_UX.md § 6):
 * 🔴 zodra er urgente voorstellen/waarschuwingen zijn (meerdere gelijktijdige
 * risico's, BR-702-grens, onplaatsbare beurten), 🟡 zodra er íets op beoordeling
 * wacht, anders 🟢.
 */
export function deriveMorningMode(
  proposals: AgentProposal[],
  warnings: BriefingWarning[],
): MorningMode {
  const hasUrgent =
    proposals.some((p) => p.severity === 'urgent') || warnings.some((w) => w.severity === 'urgent');
  if (hasUrgent) return 'red';

  const needsReview = proposals.length > 0 || warnings.some((w) => w.severity === 'attention');
  if (needsReview) return 'yellow';

  return 'green';
}

/**
 * Geaggregeerd dagvertrouwen (44 § 3.4): gemiddelde van de voorstel-confidences,
 * vertaald naar een mens-leesbaar niveau — nooit een kaal percentage.
 */
export function deriveConfidence(proposals: AgentProposal[]): {
  level: 'high' | 'medium' | 'low';
  score: number;
} {
  if (proposals.length === 0) return { level: 'high', score: 1 };
  const score = proposals.reduce((sum, p) => sum + p.confidence, 0) / proposals.length;
  if (score >= 0.8) return { level: 'high', score };
  if (score >= 0.6) return { level: 'medium', score };
  return { level: 'low', score };
}
