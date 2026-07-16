/**
 * Demo-seedscript — tweede fictief bedrijf (naast Glashelder Nijmegen B.V.,
 * scripts/seed-demo.ts) voor het testen van cross-tenant/platform-admin-
 * functionaliteit (bv. het AI-tokengebruik-dashboard, ADR-014) met meer dan
 * één Bedrijf in de lokale database. Uitsluitend voor lokale development —
 * zelfde localhost-guard als seed-demo.ts.
 *
 * Idempotent op bedrijfsniveau: als "Cleaning Service van Liempd" al bestaat,
 * stopt het script direct (geen dubbele 400 klanten bij een herhaalde run).
 * In tegenstelling tot seed-demo.ts géén routes/jobs/facturen — dat is de
 * normale taak van de bestaande Planning Agent zodra de dienstafspraken
 * bestaan; dit script legt alleen het stamdata-fundament (bedrijf, diensten,
 * medewerkers, klanten/objecten/dienstafspraken).
 *
 * Run: npx dotenv -e .env.local -- npx tsx scripts/seed-cleaning-service-van-liempd.ts
 */
import { randomUUID } from 'node:crypto';

import { createClient } from '@supabase/supabase-js';

import type { Database } from '../types/database.types';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54321';

if (!/127\.0\.0\.1|localhost/.test(SUPABASE_URL)) {
  console.error(`Weiger te seeden: SUPABASE_URL (${SUPABASE_URL}) is geen lokale instantie.`);
  process.exit(1);
}
if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('NEXT_PUBLIC_SUPABASE_ANON_KEY en SUPABASE_SERVICE_ROLE_KEY zijn vereist.');
  process.exit(1);
}
const ANON_KEY: string = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_ROLE_KEY: string = process.env.SUPABASE_SERVICE_ROLE_KEY;

const admin = createClient<Database>(SUPABASE_URL, SERVICE_ROLE_KEY);
const OWNER_EMAIL = 'eigenaar@cleaningservicevanliempd.nl';
const DEMO_PASSWORD = 'DemoWachtwoord123';
const COMPANY_NAME = 'Cleaning Service van Liempd';
const KVK_NUMBER = '82833605';

const report: string[] = [];
function log(line: string) {
  console.log(line);
  report.push(line);
}

// ---------------------------------------------------------------------------
// Data-pools (fictief) — zelfde opzet als seed-demo.ts, andere stad (Arnhem
// i.p.v. Nijmegen) zodat de twee demo-bedrijven visueel te onderscheiden zijn.
// ---------------------------------------------------------------------------
const VOORNAMEN = [
  'Jan',
  'Linda',
  'Kees',
  'Marieke',
  'Peter',
  'Sanne',
  'Willem',
  'Anna',
  'Hendrik',
  'Femke',
  'Gerrit',
  'Els',
  'Bram',
  'Nienke',
  'Rob',
  'Karin',
  'Dirk',
  'Marjolein',
  'Theo',
  'Ingrid',
  'Frans',
  'Wendy',
  'Cor',
  'Petra',
  'Erik',
  'Hanneke',
  'Sander',
  'Ellen',
  'Maarten',
  'Judith',
  'Arjan',
  'Monique',
  'Ronald',
  'Corine',
  'Bert',
  'Yvonne',
  'Wim',
  'Astrid',
  'Henk',
  'Simone',
  'Jos',
  'Marianne',
  'Twan',
  'Lotte',
  'Pim',
  'Anouk',
  'Guus',
  'Roos',
  'Niels',
  'Iris',
];
const ACHTERNAMEN = [
  'Jansen',
  'Peters',
  'Willems',
  'Smits',
  'de Vries',
  'Bakker',
  'Visser',
  'Mulder',
  'de Boer',
  'Meijer',
  'Dijkstra',
  'Bos',
  'Vermeulen',
  'van Dijk',
  'de Groot',
  'Hendriks',
  'Kramer',
  'van den Berg',
  'de Wit',
  'Peeters',
  'van Leeuwen',
  'Schouten',
  'van Vliet',
  'Verhoeven',
  'Koster',
  'Kuipers',
  'van der Berg',
  'de Jager',
  'Postma',
  'Verbeek',
];
const BEDRIJFSNAMEN = [
  'Bakkerij van Liempd',
  'Grand Café De Sonsbeek',
  'Kapsalon Rosalie',
  'Slagerij Hermsen',
  'Boekhandel Jansen & Zn',
  'Advocatenkantoor Terwindt',
  'Tandartspraktijk Elden',
  'Fysio Presikhaaf',
  'Restaurant De Rijnoever',
  'Autobedrijf Klarendal',
];

interface Wijk {
  naam: string;
  aantal: number;
  postcodePrefix: string;
  straten: string[];
  /** Wijk-centrum — objecten krijgen een deterministische jitter hieromheen. */
  lat: number;
  lng: number;
}

// Som = 400 (exacte doelstelling), realistische Arnhemse postcode-prefixen.
const WIJKEN: Wijk[] = [
  {
    naam: 'Arnhem Noord',
    aantal: 60,
    postcodePrefix: '6821',
    straten: ['Apeldoornseweg', 'Velperweg', 'Amsterdamseweg', 'Bakenbergseweg'],
    lat: 51.99,
    lng: 5.9,
  },
  {
    naam: 'Arnhem Zuid',
    aantal: 60,
    postcodePrefix: '6832',
    straten: ['Groningensingel', 'Rijksweg', 'Huissensedijk', 'Zuidelijke Parallelweg'],
    lat: 51.955,
    lng: 5.93,
  },
  {
    naam: 'Presikhaaf',
    aantal: 55,
    postcodePrefix: '6826',
    straten: ['Bakenbergseweg', 'Ir. J.P. van Muijlwijkstraat', 'Bernhardstraat'],
    lat: 51.99,
    lng: 5.95,
  },
  {
    naam: 'Elden',
    aantal: 50,
    postcodePrefix: '6836',
    straten: ['Eldenseweg', 'Elderveld', 'Schaapsdrift'],
    lat: 51.955,
    lng: 5.87,
  },
  {
    naam: 'Schuytgraaf',
    aantal: 50,
    postcodePrefix: '6846',
    straten: ['Schuytgraaf', 'Marga Klompélaan', 'Anne Frankstraat'],
    lat: 51.94,
    lng: 5.83,
  },
  {
    naam: 'Malburgen',
    aantal: 50,
    postcodePrefix: '6841',
    straten: ['Malburgse Bandijk', 'Hussenstraat', 'Frombergstraat'],
    lat: 51.965,
    lng: 5.92,
  },
  {
    naam: 'Klarendal',
    aantal: 40,
    postcodePrefix: '6822',
    straten: ['Klarendalseweg', 'Diependalseweg', 'Burgemeesterswijk'],
    lat: 51.99,
    lng: 5.92,
  },
  {
    naam: 'Rijkerswoerd',
    aantal: 35,
    postcodePrefix: '6835',
    straten: ['Rijkerswoerdsestraat', 'Beemdstraat'],
    lat: 51.94,
    lng: 5.9,
  },
];

/**
 * Deterministische coördinaat rond het wijk-centrum (±~400m) — zelfde
 * motivatie als in seed-demo.ts (QA-audit 2026-07-16): zonder locatie is elk
 * object onplaatsbaar voor de routing-laag en test de demo-omgeving
 * stilzwijgend de helft van het product niet.
 */
function objectLocation(wijk: Wijk, seed: number): string {
  const latJitter = (((seed * 2654435761) % 800) - 400) / 100000;
  const lngJitter = (((seed * 40503) % 800) - 400) / 100000;
  return `SRID=4326;POINT(${(wijk.lng + lngJitter).toFixed(6)} ${(wijk.lat + latJitter).toFixed(6)})`;
}

const DIENSTEN = [
  {
    name: 'Glasbewassing buiten',
    duration: 30,
    priceCents: 1800,
    vat: 21,
    weatherSensitive: true,
    weatherType: 'rain' as const,
  },
  {
    name: 'Glasbewassing binnen',
    duration: 40,
    priceCents: 2400,
    vat: 21,
    weatherSensitive: false,
  },
  {
    name: 'Gevelreiniging',
    duration: 90,
    priceCents: 5800,
    vat: 21,
    weatherSensitive: true,
    weatherType: 'rain' as const,
  },
  {
    name: 'Dakgootreiniging',
    duration: 60,
    priceCents: 4500,
    vat: 21,
    weatherSensitive: true,
    weatherType: 'wind' as const,
  },
  {
    name: 'Zonnepanelen reinigen',
    duration: 45,
    priceCents: 3200,
    vat: 21,
    weatherSensitive: true,
    weatherType: 'rain' as const,
  },
];

const PRIJZEN_CENTS = [1800, 2400, 3200, 4500, 5800, 7200, 9500];
const FREQUENTIES: { type: 'custom'; intervalDays: number }[] = [
  { type: 'custom', intervalDays: 28 },
  { type: 'custom', intervalDays: 42 },
  { type: 'custom', intervalDays: 56 },
  { type: 'custom', intervalDays: 84 },
];

const MEDEWERKERS = [
  {
    firstName: 'Marco',
    lastName: 'van Liempd',
    phone: '0622000001',
    wijken: ['Arnhem Noord', 'Klarendal'],
  },
  {
    firstName: 'Youssef',
    lastName: 'Amrani',
    phone: '0622000002',
    wijken: ['Arnhem Zuid', 'Malburgen'],
  },
  { firstName: 'Daan', lastName: 'Hermsen', phone: '0622000003', wijken: ['Presikhaaf'] },
  {
    firstName: 'Lars',
    lastName: 'Terwindt',
    phone: '0622000004',
    wijken: ['Elden', 'Rijkerswoerd'],
  },
  { firstName: 'Milan', lastName: 'de Ruiter', phone: '0622000005', wijken: ['Schuytgraaf'] },
  {
    firstName: 'Tim',
    lastName: 'Klaassen',
    phone: '0622000006',
    wijken: ['Arnhem Noord', 'Presikhaaf'],
  },
  {
    firstName: 'Bram',
    lastName: 'Visscher',
    phone: '0622000007',
    wijken: ['Arnhem Zuid', 'Elden'],
  },
  {
    firstName: 'Joey',
    lastName: 'Kuster',
    phone: '0622000008',
    wijken: ['Malburgen', 'Klarendal'],
  },
];

function pick<T>(arr: T[], seed: number): T {
  return arr[((seed % arr.length) + arr.length) % arr.length]!;
}

async function insertInChunks<T extends Record<string, unknown>>(
  table: string,
  rows: T[],
  chunkSize = 200,
) {
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    // @ts-expect-error — generieke helper over meerdere tabelnamen, kolomtypes verifiëren per aanroepplek.
    const { error } = await admin.from(table).insert(chunk);
    if (error) throw new Error(`${table} bulk insert mislukt (rij ${i}): ${error.message}`);
  }
}

async function main() {
  log(`# Seed Report — ${COMPANY_NAME}`);
  log(`Datum: ${new Date().toISOString()}`);
  log('');

  // --- 1. Bedrijf + eigenaar (idempotent-guard: stopt volledig als al aanwezig) ---
  const { data: existingCompany } = await admin
    .from('companies')
    .select('id')
    .eq('name', COMPANY_NAME)
    .maybeSingle();

  if (existingCompany) {
    log(
      `Bedrijf bestaat al: ${COMPANY_NAME} (${existingCompany.id}) — script stopt (geen dubbele seed).`,
    );
    console.log('\n--- SEED OVERGESLAGEN (bestond al) ---');
    return;
  }

  const { data: existingUsers } = await admin.auth.admin.listUsers();
  let ownerUser = existingUsers.users.find((u) => u.email === OWNER_EMAIL);
  if (!ownerUser) {
    const { data: created, error } = await admin.auth.admin.createUser({
      email: OWNER_EMAIL,
      password: DEMO_PASSWORD,
      email_confirm: true,
    });
    if (error || !created.user) throw error ?? new Error('createUser mislukt');
    ownerUser = created.user;
  }

  const ownerClient = createClient<Database>(SUPABASE_URL, ANON_KEY);
  const { error: signInError } = await ownerClient.auth.signInWithPassword({
    email: OWNER_EMAIL,
    password: DEMO_PASSWORD,
  });
  if (signInError) throw signInError;

  const { data: company, error: onboardError } = await ownerClient.rpc('onboard_company', {
    company_name: COMPANY_NAME,
    owner_full_name: 'Willem van Liempd',
  });
  if (onboardError || !company) throw onboardError ?? new Error('onboard_company mislukt');
  const companyId = company.id;

  await admin.auth.admin.updateUserById(ownerUser.id, {
    user_metadata: { company_id: companyId },
  });
  // Via de owner-client + sessie-refresh, niet via de service-rol (geen
  // UPDATE-grant op companies) — zelfde patroon en reden als seed-demo.ts
  // (QA-audit 2026-07-16: stil-mislukte config-update = geen depot_location
  // = route-optimize/route-move-job/agent-weather weigeren).
  const { error: refreshError } = await ownerClient.auth.refreshSession();
  if (refreshError) throw new Error(`sessie verversen mislukt: ${refreshError.message}`);

  const { error: configError } = await ownerClient
    .from('companies')
    .update({
      config_json: {
        invoicing: {
          company_code: 'CSVL',
          kvk_number: KVK_NUMBER,
          vat_number: 'NL828336050B01',
          iban: 'NL02RABO0123456789',
          bic: 'RABONL2U',
        },
        depot_location: { lat: 51.9851, lng: 5.8987 }, // Arnhem centrum
      },
    })
    .eq('id', companyId);
  if (configError) {
    throw new Error(`companies.config_json bijwerken mislukt: ${configError.message}`);
  }
  const { data: configCheck } = await admin
    .from('companies')
    .select('config_json')
    .eq('id', companyId)
    .single();
  const savedConfig = configCheck?.config_json as { depot_location?: unknown } | null;
  if (!savedConfig?.depot_location) {
    throw new Error('config_json is niet opgeslagen (depot_location ontbreekt na update)');
  }
  log(
    `Bedrijf aangemaakt: ${COMPANY_NAME} (${companyId}), KVK ${KVK_NUMBER}, eigenaar ${OWNER_EMAIL} / ${DEMO_PASSWORD}`,
  );

  // --- 2. Diensten ---------------------------------------------------------
  const serviceIds: Record<string, string> = {};
  for (const dienst of DIENSTEN) {
    const { data: created, error } = await admin
      .from('services')
      .insert({
        company_id: companyId,
        name: dienst.name,
        standard_duration_minutes: dienst.duration,
        standard_price_cents: dienst.priceCents,
        vat_rate: dienst.vat,
        is_weather_sensitive: dienst.weatherSensitive,
        weather_sensitivity_type: dienst.weatherType ?? null,
      })
      .select('id')
      .single();
    if (error || !created) throw error ?? new Error('service insert mislukt');
    serviceIds[dienst.name] = created.id;
  }
  log(`Diensten: ${Object.keys(serviceIds).length}`);

  // --- 3. Medewerkers --------------------------------------------------
  let employeeCount = 0;
  for (const m of MEDEWERKERS) {
    const { data: createdEmployee, error: employeeError } = await admin
      .from('employees')
      .insert({
        company_id: companyId,
        first_name: m.firstName,
        last_name: m.lastName,
        phone: m.phone,
      })
      .select('id')
      .single();
    if (employeeError || !createdEmployee)
      throw employeeError ?? new Error('employee insert mislukt');

    const email = `${m.firstName.toLowerCase()}@csvl-demo.nl`;
    const { data: created, error } = await admin.auth.admin.createUser({
      email,
      password: DEMO_PASSWORD,
      email_confirm: true,
    });
    if (error || !created.user) throw error ?? new Error('employee auth createUser mislukt');
    await admin.auth.admin.updateUserById(created.user.id, {
      user_metadata: { company_id: companyId },
    });
    await admin.from('users').insert({
      id: created.user.id,
      company_id: companyId,
      email,
      role: 'employee',
      full_name: `${m.firstName} ${m.lastName}`,
    });
    await admin.from('employees').update({ user_id: created.user.id }).eq('id', createdEmployee.id);
    employeeCount += 1;
  }
  log(`Medewerkers: ${employeeCount} (inloggen: <voornaam>@csvl-demo.nl / ${DEMO_PASSWORD})`);

  // --- 4. Klanten + objecten + dienstafspraken (bulk, client-side uuid's) ---
  type CustomerRow = Database['public']['Tables']['customers']['Insert'];
  type ObjectRow = Database['public']['Tables']['objects']['Insert'];
  type PricingRow = Database['public']['Tables']['pricings']['Insert'];
  type AgreementRow = Database['public']['Tables']['service_agreements']['Insert'];

  const customerRows: CustomerRow[] = [];
  const objectRows: ObjectRow[] = [];
  const pricingRows: PricingRow[] = [];
  const agreementRows: AgreementRow[] = [];

  let globalIndex = 0;
  for (const wijk of WIJKEN) {
    for (let i = 0; i < wijk.aantal; i += 1) {
      globalIndex += 1;
      const isBusiness = globalIndex % 4 === 0;
      const name = isBusiness
        ? `${pick(BEDRIJFSNAMEN, globalIndex)} ${globalIndex}`
        : `${pick(VOORNAMEN, globalIndex)} ${pick(ACHTERNAMEN, globalIndex + 7)}`;
      const email = `${name.toLowerCase().replace(/[^a-z0-9]+/g, '.')}.${globalIndex}@voorbeeld.routeflow.test`;
      const customerId = randomUUID();

      customerRows.push({
        id: customerId,
        company_id: companyId,
        name,
        type: isBusiness ? 'business' : 'person',
        email,
        phone: `06${String(30000000 + globalIndex).padStart(8, '0')}`,
        kvk_number: isBusiness ? String(20000000 + globalIndex) : null,
        payment_terms_days: 14,
      });

      const objectenPerKlant = 1 + (globalIndex % 3); // 1..3
      for (let o = 0; o < objectenPerKlant; o += 1) {
        const straat = pick(wijk.straten, globalIndex + o);
        const huisnummer = 1 + ((globalIndex * 3 + o) % 150);
        const postcode = `${wijk.postcodePrefix} ${String.fromCharCode(65 + (o % 26))}${String.fromCharCode(66 + (o % 25))}`;
        const objectId = randomUUID();

        objectRows.push({
          id: objectId,
          company_id: companyId,
          customer_id: customerId,
          address_line1: `${straat} ${huisnummer}`,
          postal_code: postcode,
          city: 'Arnhem',
          type: isBusiness ? 'commercial' : o === 0 ? 'residence' : 'complex',
          access_notes: o === 0 ? undefined : 'Bel aan bij de hoofdingang.',
          location: objectLocation(wijk, globalIndex * 7 + o),
          location_status: 'geocoded',
        });

        const dienst = pick(DIENSTEN, globalIndex + o);
        const pricingId = randomUUID();
        const priceCents = pick(PRIJZEN_CENTS, globalIndex + o);
        pricingRows.push({
          id: pricingId,
          company_id: companyId,
          type: 'per_job',
          amount_cents: priceCents,
          vat_rate: dienst.vat,
        });

        const frequentie = pick(FREQUENTIES, globalIndex + o);
        agreementRows.push({
          company_id: companyId,
          object_id: objectId,
          service_id: serviceIds[dienst.name]!,
          pricing_id: pricingId,
          frequency_type: frequentie.type,
          frequency_interval_days: frequentie.intervalDays,
          preferred_day: globalIndex % 5, // 0=ma..4=vr
          flexibility_window_days: 2,
        });
      }
    }
  }

  await insertInChunks('customers', customerRows);
  log(`Klanten: ${customerRows.length}`);
  await insertInChunks('objects', objectRows);
  log(`Objecten: ${objectRows.length}`);
  await insertInChunks('pricings', pricingRows);
  await insertInChunks('service_agreements', agreementRows);
  log(`Dienstafspraken: ${agreementRows.length}`);

  log('');
  log('Overgeslagen (bewuste scope-keuze, geen routes/jobs/facturen):');
  log(
    '- Routes/jobs voor de komende weken: ontstaan via de bestaande Planning Agent-nachtcyclus zodra dienstafspraken bestaan, geen handmatige duplicatie hier.',
  );
  log('- Facturen: pas relevant zodra er afgeronde beurten zijn.');

  log('');
  log('## Inloggegevens (lokaal, fictief)');
  log(`Eigenaar: ${OWNER_EMAIL} / ${DEMO_PASSWORD}`);
  for (const m of MEDEWERKERS) {
    log(`Medewerker ${m.firstName}: ${m.firstName.toLowerCase()}@csvl-demo.nl / ${DEMO_PASSWORD}`);
  }

  console.log('\n--- SEED VOLTOOID ---');
}

main().catch((err) => {
  console.error('Seed mislukt:', err);
  process.exit(1);
});
