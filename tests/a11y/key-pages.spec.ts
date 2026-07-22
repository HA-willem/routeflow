import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

/**
 * WCAG 2.1 AA (NFR-601/602/603, Sprint 10). Zaait één bedrijf met een klein
 * representatief datasetje (analoog aan sprint5-golden-path.spec.ts) en
 * draait axe tegen de kernpagina's, ingelogd als eigenaar — geen lege
 * empty-states, want die verbergen labeling/contrast-problemen in de
 * daadwerkelijke content (tabellen, formulieren, KPI-tegels).
 *
 * `wcag2a`/`wcag2aa`/`wcag21aa`-tags dekken NFR-601 (WCAG 2.1 AA); kleur-
 * contrast (NFR-603) zit in `wcag2aa`.
 */
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54321';
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function requireEnvValue(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Ontbrekende env-variabele voor a11y-fixtures: ${name}`);
  }
  return value;
}

test.describe('a11y — kernpaginas (NFR-601/602/603)', () => {
  test.describe.configure({ mode: 'serial' });

  let customerUrl: string;
  let ownerEmail: string;
  const password = 'Testwachtwoord123';

  test.beforeAll(async () => {
    const anonKey = requireEnvValue('NEXT_PUBLIC_SUPABASE_ANON_KEY', ANON_KEY);
    const serviceRoleKey = requireEnvValue('SUPABASE_SERVICE_ROLE_KEY', SERVICE_ROLE_KEY);
    const admin = createClient(SUPABASE_URL, serviceRoleKey);

    const suffix = crypto.randomUUID().slice(0, 8);
    ownerEmail = `e2e-a11y-owner-${suffix}@servops.test`;

    await admin.auth.admin.createUser({ email: ownerEmail, password, email_confirm: true });
    const ownerClient = createClient(SUPABASE_URL, anonKey);
    await ownerClient.auth.signInWithPassword({ email: ownerEmail, password });
    const { data: company } = await ownerClient.rpc('onboard_company', {
      company_name: `E2E A11y ${suffix}`,
      owner_full_name: 'E2E Eigenaar',
    });
    const companyId = company!.id as string;
    await ownerClient.auth.updateUser({ data: { company_id: companyId } });
    await ownerClient.auth.refreshSession();

    const { data: customer } = await ownerClient
      .from('customers')
      .insert({ company_id: companyId, name: `A11y Klant ${suffix}`, type: 'person' })
      .select('id')
      .single();
    await ownerClient.from('objects').insert({
      company_id: companyId,
      customer_id: customer!.id,
      address_line1: 'A11ylaan 1',
      postal_code: '1234 AB',
      city: 'Nijmegen',
      type: 'residence',
    });
    await admin.from('invoices').insert({
      company_id: companyId,
      customer_id: customer!.id,
      status: 'sent',
      invoice_number: `A11Y-2026-${suffix}`,
      invoice_date: new Date().toISOString().slice(0, 10),
      due_date: new Date().toISOString().slice(0, 10),
      total_amount_cents: 1000,
      total_tax_cents: 100,
      sent_at: new Date().toISOString(),
    });

    customerUrl = `/klanten/${customer!.id}`;
  });

  async function login(page: import('@playwright/test').Page) {
    await page.goto('/login');
    await page.getByLabel('E-mailadres').fill(ownerEmail);
    await page.getByLabel('Wachtwoord').fill(password);
    await page.getByRole('button', { name: 'Inloggen' }).click();
    await page.waitForURL('/');
  }

  const PAGES: { name: string; path: () => string }[] = [
    { name: 'Vandaag', path: () => '/' },
    { name: 'Klanten', path: () => '/klanten' },
    { name: 'Klant-detail', path: () => customerUrl },
    { name: 'Planning', path: () => '/planning' },
    { name: 'Facturen', path: () => '/facturen' },
    { name: 'Rapportage', path: () => '/rapportage' },
  ];

  for (const { name, path } of PAGES) {
    test(`${name} heeft geen WCAG 2.1 AA-violations`, async ({ page }) => {
      await login(page);
      await page.goto(path());
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze();

      expect(
        results.violations,
        JSON.stringify(
          results.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })),
          null,
          2,
        ),
      ).toEqual([]);
    });
  }
});
