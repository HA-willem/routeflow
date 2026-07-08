const MAILPIT_URL = process.env.MAILPIT_URL ?? 'http://127.0.0.1:54324';

interface MailpitMessage {
  ID: string;
  To: { Address: string }[];
}

/**
 * Haalt de meest recente bevestigings-/herstellink op die de lokale mailserver
 * (Mailpit, onderdeel van `supabase start`) voor dit e-mailadres heeft ontvangen.
 * Gedeeld tussen integratie- en E2E-tests (31_Testplan.md § 7).
 */
export async function findConfirmationLink(email: string): Promise<string> {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const listRes = await fetch(`${MAILPIT_URL}/api/v1/messages`);
    const list = (await listRes.json()) as { messages: MailpitMessage[] };
    const match = list.messages.find((m) => m.To.some((to) => to.Address === email));
    if (match) {
      const msgRes = await fetch(`${MAILPIT_URL}/api/v1/message/${match.ID}`);
      const msg = (await msgRes.json()) as { Text?: string };
      const found = msg.Text?.match(/http:\/\/[^\s)]+\/auth\/v1\/verify\?[^\s)]+/);
      if (found) {
        return found[0];
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Geen bevestigingsmail gevonden voor ${email} binnen de wachttijd.`);
}
