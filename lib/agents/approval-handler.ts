import type { ApprovalDecision, AutomationLevel } from './types.ts';

/**
 * Approval Handler (ADR-012 §2/§7) — de exacte, technische beslisregel per
 * kandidaat. Geïmplementeerd als volledige beslisboom (incl. het
 * confidence-drempel-niveau) ook al gebruikt Sprint 7 uitsluitend het
 * "Voorstel"-automatiseringsniveau (15_AIPlanner.md §8) — zodat een latere
 * sprint die Semi-/Volautomatisch introduceert deze functie hergebruikt in
 * plaats van herschrijft (ADR-012: "toekomstbestendig... agent-onafhankelijk").
 */

const DEFAULT_CONFIDENCE_THRESHOLD = 0.7;

/**
 * BR-702-actietypen (ADR-011 §4): facturen versturen, betalingen uitvoeren,
 * prijsafspraken wijzigen, klant/medewerker verwijderen, definitieve
 * planning overschrijven. Geen van Sprint 7's kandidaat-`payload.type`-waarden
 * (§ lib/agents/types.ts::ActionablePayload) staat hierop — `route_optimize`
 * is expliciet toegestaan zonder per-actie-goedkeuring (ADR-011 §12:
 * "Routes optimaliseren (binnen een reeds toegewezen route)"). Deze set ligt
 * hier vast zodat een toekomstige agent die een BR-702-actie zou willen
 * automatiseren, daar niet stilzwijgend omheen kan (ADR-011 slotalinea).
 */
const HARD_APPROVAL_ACTION_TYPES: ReadonlySet<string> = new Set();

export function decideApproval(params: {
  actionType: string | null;
  automationLevel: AutomationLevel;
  confidence: number;
  confidenceThreshold?: number;
}): ApprovalDecision {
  // Een informatief voorstel (Capacity/Weather-signalering, geen `payload`)
  // heeft niets om automatisch uit te voeren — "auto_execute" zou hier
  // niets betekenen. Het voorstel blijft gewoon een voorstel totdat de
  // gebruiker het bevestigt/afwijst (accepteren = kennisnemen, geen mutatie).
  if (!params.actionType) {
    return {
      outcome: 'requires_approval',
      reason: 'Informatief voorstel — geen uitvoerbare actie.',
    };
  }

  if (HARD_APPROVAL_ACTION_TYPES.has(params.actionType)) {
    return {
      outcome: 'requires_approval',
      reason: 'BR-702: deze actie vereist altijd expliciete goedkeuring.',
    };
  }

  if (params.automationLevel === 'proposal') {
    return {
      outcome: 'requires_approval',
      reason: 'Automatiseringsniveau "Voorstel" (default, 15_AIPlanner.md §8).',
    };
  }

  const threshold = params.confidenceThreshold ?? DEFAULT_CONFIDENCE_THRESHOLD;
  if (params.confidence < threshold) {
    return {
      outcome: 'requires_approval',
      reason: `Confidence (${params.confidence}) onder de drempel (${threshold}) — downgrade naar voorstel, ongeacht het geconfigureerde niveau (ADR-012 §7).`,
    };
  }

  return {
    outcome: 'auto_execute',
    reason: 'Automatiseringsniveau en confidence-drempel behaald.',
  };
}
