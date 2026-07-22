import { expect, test } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

import { findConfirmationLink } from '../shared/mailpit';

/**
 * FR-103 (medewerker-uitnodiging) — het kritieke gat dat Sprint 12 sluit:
 * een medewerker kan vanaf nu daadwerkelijk een eigen inlogaccount krijgen en
 * daarmee in de PWA komen. De uitnodigingsmail zelf gaat via Resend (geen
 * lokale interceptie zoals Mailpit voor Supabase Auth-mail) — deze test
 * zaait de `invites`-rij daarom rechtstreeks (net als sprint9-credit-
 * invoice.spec.ts al eerdere Resend-afhankelijke stappen omzeilt) en test het
 * deel dat wél volledig lokaal te verifiëren is: accepteren → wachtwoord
 * instellen → Supabase's eigen bevestigingsmail (via Mailpit) → automatische
 * koppeling → landing in /m.
 */
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54321';
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function requireEnvValue(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Ontbrekende env-variabele: ${name}`);
  }
  return value;
}

test.describe('medewerker-uitnodiging (FR-103)', () => {
  let token: string;
  let inviteeEmail: string;
  let employeeId: string;
  let companyName: string;

  test.beforeAll(async () => {
    const anonKey = requireEnvValue('NEXT_PUBLIC_SUPABASE_ANON_KEY', ANON_KEY);
    const serviceRoleKey = requireEnvValue('SUPABASE_SERVICE_ROLE_KEY', SERVICE_ROLE_KEY);
    const admin = createClient(SUPABASE_URL, serviceRoleKey);

    const suffix = crypto.randomUUID().slice(0, 8);
    const ownerEmail = `e2e-invite-owner-${suffix}@servops.test`;
    inviteeEmail = `e2e-invite-employee-${suffix}@servops.test`;
    companyName = `E2E Uitnodiging ${suffix}`;

    await admin.auth.admin.createUser({
      email: ownerEmail,
      password: 'Testwachtwoord123',
      email_confirm: true,
    });
    const ownerClient = createClient(SUPABASE_URL, anonKey);
    await ownerClient.auth.signInWithPassword({ email: ownerEmail, password: 'Testwachtwoord123' });
    const { data: company } = await ownerClient.rpc('onboard_company', {
      company_name: companyName,
      owner_full_name: 'E2E Eigenaar',
    });
    const companyId = company!.id as string;
    await ownerClient.auth.updateUser({ data: { company_id: companyId } });
    await ownerClient.auth.refreshSession();

    const {
      data: { user: owner },
    } = await ownerClient.auth.getUser();

    const { data: employee } = await ownerClient
      .from('employees')
      .insert({
        company_id: companyId,
        first_name: 'E2E',
        last_name: 'Medewerker',
        phone: '0612345678',
      })
      .select('id')
      .single();
    employeeId = employee!.id as string;

    token = crypto.randomUUID();
    await ownerClient.from('invites').insert({
      company_id: companyId,
      employee_id: employeeId,
      email: inviteeEmail,
      token,
      invited_by: owner!.id,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });
  });

  test('accepteren → wachtwoord instellen → bevestigen → landt in /m, gekoppeld aan de medewerker', async ({
    page,
  }) => {
    await page.goto(`/uitnodiging/${token}`);
    await expect(page.getByText(companyName)).toBeVisible();
    await expect(page.getByText(inviteeEmail)).toBeVisible();

    await page.getByLabel('Wachtwoord', { exact: true }).fill('Testwachtwoord123');
    await page.getByLabel('Wachtwoord bevestigen').fill('Testwachtwoord123');
    await page.getByRole('button', { name: 'Account activeren' }).click();

    await expect(page.getByText(inviteeEmail).last()).toBeVisible();

    const link = await findConfirmationLink(inviteeEmail);
    await page.goto(link);

    await page.waitForURL('/m');
    await expect(page.getByText('ServOps')).toBeVisible();

    const serviceRoleKey = requireEnvValue('SUPABASE_SERVICE_ROLE_KEY', SERVICE_ROLE_KEY);
    const admin = createClient(SUPABASE_URL, serviceRoleKey);
    const { data: employeeRow } = await admin
      .from('employees')
      .select('user_id')
      .eq('id', employeeId)
      .single();
    expect(employeeRow?.user_id).toBeTruthy();
  });
});
