/**
 * Command Bar intent-routing — types & provider-contract (ADR-014, ADR-007).
 * Zuivere types zonder I/O, dual-importeerbaar door Next.js en (toekomstige)
 * Deno-aanroepen, analoog aan lib/weather/types.ts.
 *
 * Bewust smal: het model kiest uitsluitend uit een gesloten, vooraf
 * meegegeven commandolijst (ADR-014 "het taalmodel routeert, het beslist
 * niet") — geen vrije-tekst-respons, geen open-eindige acties.
 */

export interface IntentCommand {
  id: string;
  label: string;
}

export interface IntentRouterProvider {
  /** `null` = geen commando past goed genoeg — aanroeper toont fallback-UI. */
  routeIntent(params: { text: string; commands: IntentCommand[] }): Promise<string | null>;
}
