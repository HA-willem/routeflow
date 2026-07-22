import type { AgentName, AutomationLevel } from './types.ts';

export type BuiltAgentName =
  'planning' | 'replanning' | 'weather' | 'capacity' | 'optimization' | 'invoice';

/**
 * Agents die daadwerkelijk draaien (Sprint 7/7-vervolg) — `communication`
 * (Sprint 8/WhatsApp, geblokkeerd) en `revenue` (nooit gebouwd) bestaan alleen
 * als toekomstige `agent_name`-enum-waarden, geen Edge Function erachter.
 * De "AI-assistent"-instellingenpagina toont daarom uitsluitend deze zes.
 */
export const BUILT_AGENTS: BuiltAgentName[] = [
  'planning',
  'replanning',
  'weather',
  'capacity',
  'optimization',
  'invoice',
];

export const AGENT_LABEL: Record<AgentName, string> = {
  planning: 'Planning Agent',
  replanning: 'Replanning Agent',
  weather: 'Weather Agent',
  communication: 'Communication Agent',
  invoice: 'Invoice Agent',
  capacity: 'Capacity Agent',
  revenue: 'Revenue Agent',
  optimization: 'Optimization Agent',
};

export const AGENT_DESCRIPTION: Record<AgentName, string> = {
  planning: 'Genereert voorgestelde beurten uit dienstafspraken.',
  replanning: 'Herverdeelt beurten bij ziekmelding/verlof van een medewerker.',
  weather: 'Signaleert slecht-weer-risico bij weersgevoelige diensten.',
  communication: 'Nog niet gebouwd (Sprint 8, WhatsApp).',
  invoice: 'Signaleert openstaande conceptfacturen.',
  capacity: 'Signaleert overboeking per dag/medewerker.',
  revenue: 'Nog niet gebouwd.',
  optimization: 'Optimaliseert de rijvolgorde binnen een route.',
};

export const AUTOMATION_LEVEL_LABEL: Record<AutomationLevel, string> = {
  proposal: 'Voorstel',
  semi_automatic: 'Semi-automatisch',
  fully_automatic: 'Volautomatisch',
};
