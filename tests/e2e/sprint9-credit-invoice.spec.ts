import { expect, test } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

/**
 * FR-068/BR-020 — creditfactuur op een verzonden factuur, volledig via de
 * browser: Correctie-knop → regel selecteren → creditfactuur aangemaakt →
 * saldo klopt op de originele factuur. Zaait bedrijf + al-verzonden factuur
 * rechtstreeks (er bestaat geen sneller UI-pad om een "verzonden" factuur te
 * krijgen dan de volledige Sprint 5-golden-path te herhalen — dat wordt daar
 * al gedekt, deze test focust op de correctie-flow zelf).
 *
 * Rolkeuze: een Admin-gebruiker, niet de Eigenaar — Facturen-matrix
 * (23_Gebruikersrollen.md § 2) geeft Eigenaar alleen Read, en
 * create_credit_invoice()/next_invoice_number() staan uitsluitend
 * Admin/Administratie toe (zelfde precedent als 019_invoicing_mvp.sql).
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

test('creditfactuur: correctie op verzonden factuur (FR-068/BR-020)', async ({ page }) => {
  const anonKey = requireEnvValue('NEXT_PUBLIC_SUPABASE_ANON_KEY', ANON_KEY);
  const serviceRoleKey = requireEnvValue('SUPABASE_SERVICE_ROLE_KEY', SERVICE_ROLE_KEY);
  const admin = createClient(SUPABASE_URL, serviceRoleKey);

  const suffix = crypto.randomUUID().slice(0, 8);
  const ownerEmail = `e2e-credit-owner-${suffix}@servops.test`;
  const adminEmail = `e2e-credit-admin-${suffix}@servops.test`;
  const password = 'Testwachtwoord123';
  const invoiceNumber = `E2ECR-2026-${suffix}`;
  const lineDescription = `E2E test dienst ${suffix}`;

  await admin.auth.admin.createUser({ email: ownerEmail, password, email_confirm: true });
  const ownerClient = createClient(SUPABASE_URL, anonKey);
  await ownerClient.auth.signInWithPassword({ email: ownerEmail, password });
  const { data: company } = await ownerClient.rpc('onboard_company', {
    company_name: `E2E Credit ${suffix}`,
    owner_full_name: 'E2E Eigenaar',
  });
  const companyId = company!.id as string;
  await ownerClient.auth.updateUser({ data: { company_id: companyId } });
  await ownerClient.auth.refreshSession();

  const { data: customer } = await ownerClient
    .from('customers')
    .insert({
      company_id: companyId,
      name: `E2E Credit Klant ${suffix}`,
      type: 'person',
      email: `klant-${suffix}@servops.test`,
    })
    .select('id')
    .single();

  const { data: invoice } = await admin
    .from('invoices')
    .insert({
      company_id: companyId,
      customer_id: customer!.id,
      invoice_number: invoiceNumber,
      status: 'sent',
      invoice_date: new Date().toISOString().slice(0, 10),
      due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      total_amount_cents: 5445,
      total_tax_cents: 945,
      sent_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  await admin.from('invoice_lines').insert({
    company_id: companyId,
    invoice_id: invoice!.id,
    description: lineDescription,
    quantity: 1,
    unit_price_cents: 4500,
    vat_rate: 21,
    vat_amount_cents: 945,
    total_amount_cents: 5445,
    sequence: 1,
  });

  const { data: adminAuth } = await admin.auth.admin.createUser({
    email: adminEmail,
    password,
    email_confirm: true,
  });
  const adminUserId = adminAuth.user!.id;
  await admin.auth.admin.updateUserById(adminUserId, { user_metadata: { company_id: companyId } });
  await admin.from('users').insert({
    id: adminUserId,
    company_id: companyId,
    email: adminEmail,
    role: 'admin',
    full_name: 'E2E Admin',
  });

  await page.goto('/login');
  await page.getByLabel('E-mailadres').fill(adminEmail);
  await page.getByLabel('Wachtwoord').fill(password);
  await page.getByRole('button', { name: 'Inloggen' }).click();
  await page.waitForURL('/');

  await page.goto(`/facturen/${invoice!.id}`);
  await expect(page.getByRole('heading', { name: invoiceNumber })).toBeVisible();

  await page.getByRole('button', { name: 'Correctie' }).click();
  await page.getByRole('checkbox', { name: lineDescription }).check();
  await page.getByRole('button', { name: 'Creditfactuur aanmaken' }).click();

  // Na aanmaken navigeert de dialoog naar de nieuwe creditfactuur.
  await page.waitForURL(/\/facturen\/[0-9a-f-]+$/);
  await expect(page.getByText(/Dit is een creditfactuur voor/)).toBeVisible();
  await expect(page.getByText(new RegExp(invoiceNumber))).toBeVisible();

  // Terug naar de originele factuur: correctie-banner + saldo €0,00 (volledig gecrediteerd).
  await page.goto(`/facturen/${invoice!.id}`);
  await expect(page.getByText(/Correctie via/)).toBeVisible();
  await expect(page.getByText(/Saldo:\s*€\s*0,00/)).toBeVisible();

  const { data: creditInvoice } = await admin
    .from('invoices')
    .select('total_amount_cents, parent_invoice_id')
    .eq('parent_invoice_id', invoice!.id)
    .single();
  expect(creditInvoice?.total_amount_cents).toBe(-5445);
});
