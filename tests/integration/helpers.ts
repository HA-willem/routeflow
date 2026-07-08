import { createClient } from '@supabase/supabase-js';

import { requireEnv } from '@/lib/env';
import type { Database } from '@/types/database.types';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54321';
const SUPABASE_ANON_KEY = requireEnv(
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);
const MAILPIT_URL = process.env.MAILPIT_URL ?? 'http://127.0.0.1:54324';

export function anonClient() {
  return createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);
}

export type TestSupabaseClient = ReturnType<typeof anonClient>;

interface MailpitMessage {
  ID: string;
  To: { Address: string }[];
}

async function findConfirmationLink(email: string): Promise<string> {
  // Kortstondige polling: de lokale mailserver (Mailpit/Inbucket) verwerkt async.
  for (let attempt = 0; attempt < 20; attempt += 1) {
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

/**
 * Registreert een nieuwe testgebruiker en volgt de bevestigingslink via de lokale
 * Mailpit-mailbox, zodat de test een echte, ingelogde sessie krijgt — dezelfde flow
 * als een echte gebruiker doorloopt (22_Authenticatie.md § 1).
 */
export async function signUpAndConfirm(
  email: string,
  password = 'Testwachtwoord123',
): Promise<TestSupabaseClient> {
  const client = anonClient();
  const { error: signUpError } = await client.auth.signUp({ email, password });
  if (signUpError) {
    throw signUpError;
  }

  const link = await findConfirmationLink(email);
  const verifyRes = await fetch(link, { redirect: 'manual' });
  const location = verifyRes.headers.get('location');
  if (!location) {
    throw new Error('Bevestigingslink leverde geen redirect met sessie-tokens op.');
  }

  const fragment = new URLSearchParams(new URL(location).hash.slice(1));
  const accessToken = fragment.get('access_token');
  const refreshToken = fragment.get('refresh_token');
  if (!accessToken || !refreshToken) {
    throw new Error('Geen access_token/refresh_token in de bevestigingsredirect gevonden.');
  }

  const sessionClient = anonClient();
  const { error: sessionError } = await sessionClient.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
  if (sessionError) {
    throw sessionError;
  }

  return sessionClient;
}

export function uniqueTestEmail(label: string): string {
  return `${label}-${crypto.randomUUID()}@routeflow.test`;
}
