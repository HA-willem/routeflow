import { expect, test } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

/**
 * FR-006 — CSV-import klanten/objecten, volledige wizard-flow via de
 * browser: upload → kolommen koppelen → valideren → bevestigen → rapport →
 * klant zichtbaar in de klantenlijst. Zaait alleen het bedrijf/eigenaar
 * (analoog aan sprint5-golden-path.spec.ts) — de klant zelf komt via de
 * daadwerkelijke import-flow, niet via een fixture.
 *
 * Geocoding (Mapbox) draait hier echt (MAPBOX_ACCESS_TOKEN uit .env.local) —
 * de assertions hangen bewust niet af van of het testadres wel/niet
 * geocodeerbaar is (`status: 'warning'` blokkeert de import niet, zie
 * lib/import/csv.ts), zodat de test niet flaky wordt op Mapbox-resultaten.
 */
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54321';
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function requireEnvValue(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Ontbrekende env-variabele voor e2e-fixtures: ${name}`);
  }
  return value;
}

test('CSV-import: upload, mapping, valideren, bevestigen (FR-006)', async ({ page }) => {
  const anonKey = requireEnvValue('NEXT_PUBLIC_SUPABASE_ANON_KEY', ANON_KEY);
  const serviceRoleKey = requireEnvValue('SUPABASE_SERVICE_ROLE_KEY', SERVICE_ROLE_KEY);
  const admin = createClient(SUPABASE_URL, serviceRoleKey);

  const suffix = crypto.randomUUID().slice(0, 8);
  const ownerEmail = `e2e-csv-owner-${suffix}@servops.test`;
  const password = 'Testwachtwoord123';
  const customerName = `E2E CSV Klant ${suffix}`;

  await admin.auth.admin.createUser({ email: ownerEmail, password, email_confirm: true });
  const ownerClient = createClient(SUPABASE_URL, anonKey);
  await ownerClient.auth.signInWithPassword({ email: ownerEmail, password });
  const { data: company } = await ownerClient.rpc('onboard_company', {
    company_name: `E2E CSV-import ${suffix}`,
    owner_full_name: 'E2E Eigenaar',
  });
  const companyId = company!.id as string;
  await ownerClient.auth.updateUser({ data: { company_id: companyId } });
  await ownerClient.auth.refreshSession();

  await page.goto('/login');
  await page.getByLabel('E-mailadres').fill(ownerEmail);
  await page.getByLabel('Wachtwoord').fill(password);
  await page.getByRole('button', { name: 'Inloggen' }).click();
  await page.waitForURL('/');

  await page.goto('/klanten/importeren');

  const csvContent = [
    'naam,adres,postcode,plaats,email',
    `${customerName},Testlaan 1,1012 AB,Amsterdam,e2e-csv-${suffix}@servops.test`,
  ].join('\n');

  await page.locator('input[type="file"]').setInputFiles({
    name: 'klanten.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(csvContent, 'utf-8'),
  });

  await expect(page.getByText('1 rijen gevonden.')).toBeVisible();

  await page.getByRole('combobox', { name: 'Naam' }).click();
  await page.getByRole('option', { name: 'naam', exact: true }).click();

  await page.getByRole('combobox', { name: 'Adres (straat + huisnummer)' }).click();
  await page.getByRole('option', { name: 'adres', exact: true }).click();

  await page.getByRole('combobox', { name: 'Postcode' }).click();
  await page.getByRole('option', { name: 'postcode', exact: true }).click();

  await page.getByRole('combobox', { name: 'Plaats' }).click();
  await page.getByRole('option', { name: 'plaats', exact: true }).click();

  await page.getByRole('combobox', { name: 'E-mail' }).click();
  await page.getByRole('option', { name: 'email', exact: true }).click();

  await page.getByRole('button', { name: 'Volgende: valideren' }).click();

  await expect(page.getByText(customerName)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Bevestigen en importeren' })).toBeEnabled();

  await page.getByRole('button', { name: 'Bevestigen en importeren' }).click();

  await expect(page.getByText('1 klanten + objecten aangemaakt, 0 fouten.')).toBeVisible();

  await page.goto('/klanten');
  await expect(page.getByText(customerName)).toBeVisible();

  const { data: createdCustomer } = await ownerClient
    .from('customers')
    .select('id, objects(address_line1)')
    .eq('company_id', companyId)
    .eq('name', customerName)
    .single();
  expect(createdCustomer?.objects?.[0]?.address_line1).toBe('Testlaan 1');
});
