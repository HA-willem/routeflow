import type { IntentCommand, IntentRouterProvider } from './types';

/**
 * Claude-implementatie van IntentRouterProvider (ADR-014, ADR-007). Gebruikt
 * tool-use/structured output met een enum begrensd tot de meegegeven
 * commando-ID's + `'none'` — het model kan structureel geen ander antwoord
 * geven dan "welke van deze" of "geen van deze", nooit vrije tekst
 * (ADR-014: "het taalmodel routeert, het beslist niet"). Ruwe `fetch`, geen
 * SDK-dependency — zelfde keuze als lib/weather/open-meteo-provider.ts.
 *
 * `commandId` uit de modelrespons wordt sowieso nog eens tegen de
 * meegegeven lijst gevalideerd (defense-in-depth, 41_CodingStandards.md) —
 * nooit blind vertrouwd, ook al dwingt de tool-schema-enum dit al af.
 */

const MESSAGES_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';
/** Classificatietaak (1 van ~4 bekende commando's kiezen) — snelste/goedkoopste model volstaat. */
const MODEL = 'claude-haiku-4-5-20251001';
const NONE_SENTINEL = 'none';

interface AnthropicToolUseBlock {
  type: 'tool_use';
  input: { command_id?: string };
}

interface AnthropicMessagesResponse {
  content: Array<AnthropicToolUseBlock | { type: string }>;
}

export class AnthropicIntentRouter implements IntentRouterProvider {
  constructor(private readonly apiKey: string) {}

  async routeIntent({
    text,
    commands,
  }: {
    text: string;
    commands: IntentCommand[];
  }): Promise<string | null> {
    const commandIds = commands.map((c) => c.id);
    const commandList = commands.map((c) => `- ${c.id}: "${c.label}"`).join('\n');

    const response = await fetch(MESSAGES_URL, {
      method: 'POST',
      headers: {
        'x-api-key': this.apiKey,
        'anthropic-version': ANTHROPIC_VERSION,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 100,
        tools: [
          {
            name: 'select_command',
            description:
              'Kies het commando dat het beste bij de vraag van de gebruiker past, of "none" als niets goed genoeg past.',
            input_schema: {
              type: 'object',
              properties: {
                command_id: {
                  type: 'string',
                  enum: [...commandIds, NONE_SENTINEL],
                  description: 'Het ID van het best passende commando, of "none".',
                },
              },
              required: ['command_id'],
            },
          },
        ],
        tool_choice: { type: 'tool', name: 'select_command' },
        messages: [
          {
            role: 'user',
            content: `Beschikbare commando's:\n${commandList}\n\nVraag van de gebruiker: "${text}"`,
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`Anthropic API-fout: ${response.status}`);
    }

    const data = (await response.json()) as AnthropicMessagesResponse;
    const toolUse = data.content.find(
      (block): block is AnthropicToolUseBlock => block.type === 'tool_use',
    );
    const commandId = toolUse?.input.command_id;

    return commandId && commandIds.includes(commandId) ? commandId : null;
  }
}
