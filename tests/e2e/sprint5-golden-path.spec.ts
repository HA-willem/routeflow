import path from 'node:path';

import { expect, test } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

/**
 * Sprint 5-opdracht: volledige medewerker-flow end-to-end. Zaait fixtures
 * rechtstreeks via de Supabase-API (net als tests/integration/helpers.ts —
 * er bestaat vandaag geen UI-flow om een tweede, echte medewerker-gebruiker
 * aan een bedrijf te koppelen, zie de toelichting in dat bestand) en drijft
 * daarna de daadwerkelijke medewerker-flow volledig via de browser:
 * inloggen → dagroute → beurt openen → starten → foto vóór → afronden
 * (foto na + notitie) → conceptfactuur (werkbon zichtbaar).
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

test('medewerker: inloggen, dagroute, starten, fotos, afronden, conceptfactuur', async ({
  page,
}) => {
  const anonKey = requireEnvValue('NEXT_PUBLIC_SUPABASE_ANON_KEY', ANON_KEY);
  const serviceRoleKey = requireEnvValue('SUPABASE_SERVICE_ROLE_KEY', SERVICE_ROLE_KEY);
  const admin = createClient(SUPABASE_URL, serviceRoleKey);

  const suffix = crypto.randomUUID().slice(0, 8);
  const ownerEmail = `e2e-owner-${suffix}@routeflow.test`;
  const employeeEmail = `e2e-employee-${suffix}@routeflow.test`;
  const password = 'Testwachtwoord123';

  // Eigenaar + bedrijf (via onboard_company, het enige toegestane pad).
  await admin.auth.admin.createUser({ email: ownerEmail, password, email_confirm: true });
  const ownerClient = createClient(SUPABASE_URL, anonKey);
  await ownerClient.auth.signInWithPassword({ email: ownerEmail, password });
  const { data: company } = await ownerClient.rpc('onboard_company', {
    company_name: `E2E Sprint5 ${suffix}`,
    owner_full_name: 'E2E Eigenaar',
  });
  const companyId = company!.id as string;
  await ownerClient.auth.updateUser({ data: { company_id: companyId } });
  await ownerClient.auth.refreshSession();

  const { data: customer } = await ownerClient
    .from('customers')
    .insert({ company_id: companyId, name: 'E2E Klant Bakker', type: 'person' })
    .select('id')
    .single();
  const { data: object } = await ownerClient
    .from('objects')
    .insert({
      company_id: companyId,
      customer_id: customer!.id,
      address_line1: 'Pijlpuntstraat 30',
      postal_code: '6512 AB',
      city: 'Nijmegen',
      type: 'commercial',
      access_notes: 'Sleutel bij de buren.',
    })
    .select('id')
    .single();
  const { data: service } = await ownerClient
    .from('services')
    .insert({
      company_id: companyId,
      name: 'Glasbewassing buiten',
      standard_duration_minutes: 30,
      standard_price_cents: 4500,
      vat_rate: 21,
    })
    .select('id')
    .single();
  const { data: pricing } = await ownerClient
    .from('pricings')
    .insert({ company_id: companyId, type: 'per_job', amount_cents: 4500, vat_rate: 21 })
    .select('id')
    .single();
  const { data: agreement } = await ownerClient
    .from('service_agreements')
    .insert({
      company_id: companyId,
      object_id: object!.id,
      service_id: service!.id,
      pricing_id: pricing!.id,
      frequency_type: 'weekly',
      frequency_interval_days: 7,
      flexibility_window_days: 3,
    })
    .select('id')
    .single();
  const { data: employee } = await ownerClient
    .from('employees')
    .insert({
      company_id: companyId,
      first_name: 'E2E',
      last_name: 'Medewerker',
      phone: '0611111111',
    })
    .select('id')
    .single();
  const today = new Date().toISOString().slice(0, 10);
  const { data: route } = await ownerClient
    .from('routes')
    .insert({ company_id: companyId, employee_id: employee!.id, route_date: today })
    .select('id')
    .single();
  await ownerClient.from('jobs').insert({
    company_id: companyId,
    service_agreement_id: agreement!.id,
    route_id: route!.id,
    scheduled_date: today,
    status: 'planned',
    sequence: 1,
    estimated_duration_minutes: 30,
  });

  // createUser zet geen public.users-rij; die maken we hier zelf aan
  // (analoog aan createCompanyUserSession in tests/integration/helpers.ts —
  // er bestaat geen uitnodigingsflow om een tweede echte gebruiker aan een
  // bestaand bedrijf te koppelen).
  const { data: employeeAuth } = await admin.auth.admin.createUser({
    email: employeeEmail,
    password,
    email_confirm: true,
  });
  const employeeUserId = employeeAuth.user!.id;
  // De JWT user_metadata.company_id-claim is de enige bron voor current_company_id()
  // (002_companies_users.sql) — zonder deze admin-only update blijft de medewerker
  // "niet onboarded" ondanks de public.users-rij hieronder.
  await admin.auth.admin.updateUserById(employeeUserId, {
    user_metadata: { company_id: companyId },
  });
  await admin.from('users').insert({
    id: employeeUserId,
    company_id: companyId,
    email: employeeEmail,
    role: 'employee',
    full_name: 'E2E Medewerker',
  });
  await admin.from('employees').update({ user_id: employeeUserId }).eq('id', employee!.id);

  // --- Vanaf hier: volledig via de browser, als de medewerker. ---
  await page.goto('/login');
  await page.getByLabel('E-mailadres').fill(employeeEmail);
  await page.getByLabel('Wachtwoord').fill(password);
  await page.getByRole('button', { name: 'Inloggen' }).click();

  // Login redirect gaat altijd naar / (dashboard) — de medewerker navigeert
  // zelf naar /m (bv. via een bookmarked PWA-icoon op het homescreen).
  await page.waitForURL('/');
  await page.goto('/m');
  await expect(page.getByText('E2E Klant Bakker')).toBeVisible();

  await page.getByText('E2E Klant Bakker').click();
  await page.waitForURL(/\/m\/beurt\//);
  await expect(page.getByText('Pijlpuntstraat 30')).toBeVisible();
  await expect(page.getByText('Sleutel bij de buren.')).toBeVisible();

  await page.getByRole('button', { name: 'Start' }).click();
  await expect(page.getByRole('button', { name: 'Pauzeren' })).toBeVisible();

  const photoPath = path.join(__dirname, 'fixtures', 'photo.png');
  await page.locator('#photo-before').setInputFiles(photoPath);
  await expect(page.getByAltText('Foto vóór 1')).toBeVisible();

  await page.getByRole('button', { name: 'Gereed', exact: true }).click();
  await page.locator('#photo-after').setInputFiles(photoPath);
  await expect(page.getByAltText('Foto na 1')).toBeVisible();
  await page.getByPlaceholder('Notitie (optioneel)').fill('Alles gedaan, geen bijzonderheden.');
  await page.getByRole('button', { name: 'Gereed ✓' }).click();

  await page.waitForURL('/m');
  await expect(page.getByText('Top werk! Conceptfactuur aangemaakt.')).toBeVisible();
  await expect(page.getByText('Uitgevoerd')).toBeVisible();

  // Werkbon bekijken vanaf de dagroute.
  await page.getByText('E2E Klant Bakker').click();
  await page.getByRole('link', { name: 'Werkbon bekijken' }).click();
  await page.waitForURL(/\/werkbon$/);
  await expect(page.getByText('Alles gedaan, geen bijzonderheden.')).toBeVisible();
  await expect(page.getByAltText('Vóór', { exact: true })).toBeVisible();
  await expect(page.getByAltText('Na', { exact: true })).toBeVisible();

  // Werkbon + conceptfactuur controleren via de databron (desktop-UI voor
  // facturen is los getest in tests/integration/job-execution-rls.test.ts).
  const { data: invoice } = await ownerClient
    .from('invoices')
    .select('status, total_amount_cents')
    .eq('customer_id', customer!.id)
    .maybeSingle();
  expect(invoice?.status).toBe('draft');
  expect(invoice?.total_amount_cents).toBe(5445); // 4500 + 21% BTW
});
