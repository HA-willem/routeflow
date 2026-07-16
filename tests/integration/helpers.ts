import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import { createClient } from '@supabase/supabase-js';

import { requireEnv } from '@/lib/env';
import type { Database } from '@/types/database.types';

import { findConfirmationLink } from '../shared/mailpit';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54321';
const SUPABASE_ANON_KEY = requireEnv(
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

export function anonClient() {
  return createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);
}

export type TestSupabaseClient = ReturnType<typeof anonClient>;

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

/**
 * Service-role-client — uitsluitend voor testfixtures die de app zelf (nog) niet
 * kan doen via een publiek pad. Er bestaat vandaag geen uitnodigingsflow die een
 * tweede gebruiker als `role='employee'` aan een bestaand bedrijf koppelt (de
 * enige schrijfpad naar `public.users` is `onboard_company()`, dat altijd
 * `role='owner'` van een NIEUW bedrijf zet, 002_companies_users.sql) — dat is een
 * bekend, dan ook in `PRODUCTION_READINESS_REPORT`/eerdere sessies genoemd gat,
 * geen Sprint 5-scope om te bouwen. Deze helper omzeilt dat gat uitsluitend voor
 * testopzet (analoog aan hoe `signUpAndConfirm` al Mailpit rechtstreeks leest).
 *
 * Vereist lokaal (niet gecommitteerd als migratie, bewust — zie de motivatie
 * hierboven): `GRANT SELECT, INSERT ON public.users TO service_role`,
 * `GRANT SELECT ON public.companies TO service_role`,
 * `GRANT SELECT, UPDATE ON public.invoices TO service_role` (`auto_expose_new_tables`
 * staat uit, dus service_role krijgt anders geen enkele tabeltoegang — zie
 * `supabase/config.toml`). Na elke `supabase db reset` opnieuw uitvoeren via
 * `npx supabase db query --local "GRANT ..."`.
 */
export function adminClient() {
  const serviceRoleKey = requireEnv(
    'SUPABASE_SERVICE_ROLE_KEY',
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
  return createClient<Database>(SUPABASE_URL, serviceRoleKey);
}

const execFileAsync = promisify(execFile);

/**
 * Zet een testgebruiker op de platform-admin-allowlist (027_platform_admins.sql,
 * BR-900) — uitsluitend voor testfixtures. `platform_admins` heeft bewust GEEN
 * enkele INSERT/UPDATE-grant aan `service_role`/`authenticated` (ADR-013 §1.1:
 * mutaties uitsluitend handmatig via de SQL Editor) — deze helper simuleert
 * precies dat pad door rechtstreeks als de Postgres-superuser (`psql` in de
 * lokale db-container) te schrijven, in plaats van via PostgREST/adminClient()
 * zoals de overige helpers hier. Er wordt geen grant toegevoegd/gewijzigd; de
 * productie-garantie (geen applicatie-schrijfpad) blijft volledig intact.
 * Vereist lokaal: de Supabase db-container onder de naam `supabase_db_routeflow`
 * (`supabase start`-default).
 */
export async function seedPlatformAdmin(userId: string): Promise<void> {
  await execFileAsync('docker', [
    'exec',
    '-i',
    'supabase_db_routeflow',
    'psql',
    '-U',
    'postgres',
    '-d',
    'postgres',
    '-v',
    'ON_ERROR_STOP=1',
    '-c',
    `insert into public.platform_admins (user_id, note) values ('${userId}', 'integration-test') on conflict (user_id) do nothing;`,
  ]);
}

/** Maakt een bevestigde gebruiker met een gekozen rol binnen een bestaand bedrijf en logt in. */
export async function createCompanyUserSession(
  companyId: string,
  email: string,
  role: Database['public']['Enums']['user_role'],
  password = 'Testwachtwoord123',
): Promise<{ client: TestSupabaseClient; userId: string }> {
  const admin = adminClient();
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (createError || !created.user) {
    throw createError ?? new Error('createUser leverde geen user op.');
  }

  const { error: profileError } = await admin.from('users').insert({
    id: created.user.id,
    company_id: companyId,
    email,
    role,
    full_name: 'Test Gebruiker',
  });
  if (profileError) {
    throw profileError;
  }

  const client = anonClient();
  const { error: signInError } = await client.auth.signInWithPassword({ email, password });
  if (signInError) {
    throw signInError;
  }
  await client.auth.updateUser({ data: { company_id: companyId } });
  await client.auth.refreshSession();

  return { client, userId: created.user.id };
}
