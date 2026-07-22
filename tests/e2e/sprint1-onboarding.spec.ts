import { expect, test } from '@playwright/test';

import { findConfirmationLink } from '../shared/mailpit';

/**
 * Dekt het Sprint-1-deel van E2E-1 (31_Testplan.md § 2): registreren → e-mail
 * bevestigen (echte PKCE-link via @supabase/ssr, opgehaald uit de lokale
 * Mailpit-mailbox) → onboarding (FR-101) → dashboard. Het volledige E2E-1
 * ("...→ eerste planning") kan pas vanaf Sprint 3 (dienstafspraken) volledig
 * doorlopen worden.
 */
test('registreren → bevestigen → bedrijf aanmaken → dashboard', async ({ page }) => {
  const uniqueSuffix = crypto.randomUUID().slice(0, 8);
  const email = `e2e-${uniqueSuffix}@servops.test`;
  const fullName = 'Frans de Haan';
  const companyName = `E2E Glaswasserij ${uniqueSuffix}`;

  await page.goto('/registreren');
  await page.getByLabel('Naam').fill(fullName);
  await page.getByLabel('E-mailadres').fill(email);
  await page.getByLabel('Wachtwoord', { exact: true }).fill('Testwachtwoord123');
  await page.getByLabel('Bevestig wachtwoord').fill('Testwachtwoord123');
  await page.getByRole('button', { name: 'Account aanmaken' }).click();

  await expect(page.getByText('Controleer je inbox')).toBeVisible();

  const confirmationLink = await findConfirmationLink(email);
  await page.goto(confirmationLink);

  // /auth/confirm wisselt de PKCE-token server-side in en redirect naar / (dashboard),
  // waar proxy.ts een niet-onboarded gebruiker vervolgens naar /onboarding stuurt.
  await expect(page).toHaveURL(/\/onboarding$/);
  await expect(page.getByRole('heading', { name: 'Welkom bij ServOps' })).toBeVisible();

  await page.getByLabel('Bedrijfsnaam').fill(companyName);
  await page.getByRole('button', { name: 'Bedrijf aanmaken' }).click();

  await expect(page).toHaveURL('/');
  await expect(page.getByText(companyName)).toBeVisible();
  await expect(page.getByText(`, ${fullName.split(' ')[0]}.`)).toBeVisible();

  // Het KPI-dashboard (met zijn eigen lege-staat) staat sinds de Morning
  // Briefing-migratie (PRD § 19 A-21) op /dashboard, niet meer op /.
  await page.goto('/dashboard');
  await expect(page.getByText('Nog geen data.')).toBeVisible();
});
