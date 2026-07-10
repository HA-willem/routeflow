import { expect, test } from '@playwright/test';

import { findConfirmationLink } from '../shared/mailpit';

/**
 * Dekt E2E-2 volledig (31_Testplan.md § 2): klant + object + dienstafspraak
 * aanmaken, met als sluitstuk (Sprint 3, FR-020) de automatisch gegenereerde
 * eerste beurt via de planning-generate Edge Function.
 */
test('klant + object + dienst + dienstafspraak aanmaken (FR-001…004/020)', async ({ page }) => {
  const uniqueSuffix = crypto.randomUUID().slice(0, 8);
  const email = `e2e2-${uniqueSuffix}@routeflow.test`;
  const fullName = 'Frans de Haan';
  const companyName = `E2E Glaswasserij ${uniqueSuffix}`;
  const customerName = `Bakkerij Jansen ${uniqueSuffix}`;
  const serviceName = `Glasbewassing buiten ${uniqueSuffix}`;

  // Onboarding (Sprint 1) — nodig als vertrekpunt voor een ingelogde, onboarded gebruiker.
  await page.goto('/registreren');
  await page.getByLabel('Naam').fill(fullName);
  await page.getByLabel('E-mailadres').fill(email);
  await page.getByLabel('Wachtwoord', { exact: true }).fill('Testwachtwoord123');
  await page.getByLabel('Bevestig wachtwoord').fill('Testwachtwoord123');
  await page.getByRole('button', { name: 'Account aanmaken' }).click();
  await expect(page.getByText('Controleer je inbox')).toBeVisible();

  const confirmationLink = await findConfirmationLink(email);
  await page.goto(confirmationLink);
  await expect(page).toHaveURL(/\/onboarding$/);
  await page.getByLabel('Bedrijfsnaam').fill(companyName);
  await page.getByRole('button', { name: 'Bedrijf aanmaken' }).click();
  await expect(page).toHaveURL('/');

  // FR-001: klant aanmaken.
  await page.goto('/klanten');
  await page.getByRole('link', { name: 'Nieuwe klant' }).first().click();
  await expect(page).toHaveURL('/klanten/nieuw');
  await page.getByLabel('Naam').fill(customerName);
  await page.getByRole('button', { name: 'Klant aanmaken' }).click();
  await expect(page).toHaveURL(/\/klanten\/[0-9a-f-]+$/);
  await expect(page.getByRole('heading', { name: customerName })).toBeVisible();

  // FR-002/FR-003: object toevoegen (adres-only, PRD § 19 A-10).
  await page.getByRole('tab', { name: 'Objecten' }).click();
  await page.getByRole('link', { name: 'Object toevoegen' }).first().click();
  await page.getByLabel('Adres').fill('Kerkstraat 42');
  await page.getByLabel('Postcode').fill('1234 AB');
  await page.getByLabel('Plaats').fill('Amsterdam');
  await page.getByRole('button', { name: 'Object aanmaken' }).click();
  await expect(page.getByRole('heading', { name: 'Kerkstraat 42' })).toBeVisible();
  const objectUrl = page.url();

  // Dienst aanmaken (instellingen), nodig als input voor de dienstafspraak.
  await page.goto('/instellingen/diensten/nieuw');
  await page.getByLabel('Naam').fill(serviceName);
  await page.getByRole('button', { name: 'Dienst aanmaken' }).click();
  await expect(page).toHaveURL('/instellingen/diensten');
  await expect(page.getByText(serviceName)).toBeVisible();

  // FR-004: dienstafspraak aanmaken op het object.
  await page.goto(objectUrl);
  await expect(page.getByRole('heading', { name: 'Kerkstraat 42' })).toBeVisible();
  await page.getByRole('tab', { name: 'Dienstafspraken' }).click();
  await page.getByRole('link', { name: 'Afspraak toevoegen' }).first().click();

  await page.getByRole('combobox', { name: 'Dienst' }).click();
  await expect(page.getByRole('listbox')).toBeVisible();
  await page.getByRole('option', { name: serviceName }).click();
  await page.getByLabel('Bedrag per beurt (€, excl. BTW)').fill('25');
  await page.getByRole('button', { name: 'Afspraak aanmaken' }).click();

  await expect(page.getByRole('heading', { name: 'Kerkstraat 42' })).toBeVisible();
  await page.getByRole('tab', { name: 'Dienstafspraken' }).click();
  await expect(page.getByText(serviceName)).toBeVisible();
  await expect(page.getByText('Wekelijks')).toBeVisible();
  await expect(page.getByText('Actief')).toBeVisible();

  // FR-020: createServiceAgreement roept planning-generate synchroon aan, dus
  // de eerste voorgestelde beurt staat er meteen (WhyExplanation-kolom "Volgende
  // beurt") — noch "Nog niet gegenereerd", noch "—" (dat laatste is voor
  // niet-actieve afspraken).
  await expect(page.getByText('Nog niet gegenereerd')).not.toBeVisible();
});
