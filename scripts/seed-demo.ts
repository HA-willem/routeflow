/**
 * Demo-seedscript — uitsluitend voor lokale development/demo-omgevingen.
 * NOOIT tegen productie draaien (het script weigert dit expliciet als
 * NEXT_PUBLIC_SUPABASE_URL niet naar 127.0.0.1/localhost wijst).
 *
 * Idempotent: identificeert alle entiteiten via een natuurlijke sleutel
 * (bedrijfsslug, klant-e-mail, dienstnaam, medewerker-telefoonnummer) en
 * hergebruikt bestaande rijen i.p.v. te dupliceren. Tijdgebonden data
 * (routes/jobs/facturen, "komende 8 weken") wordt bij elke run voor dit ene
 * demo-bedrijf gewist en opnieuw opgebouwd — veilig omdat alles strikt
 * gescoped is op de company_id van "Glashelder Nijmegen B.V.".
 *
 * Gebruikt de service-role-client (bypass RLS) — een bewuste, geïsoleerde
 * uitzondering op "nooit service-role buiten Edge Functions" (41_CodingStandards.md
 * § 8), zoals ook al toegepast in tests/integration/helpers.ts, omdat dit een
 * eenmalig admin-seedscript is, geen applicatiecode.
 *
 * Run: npx dotenv -e .env.local -- npx tsx scripts/seed-demo.ts
 */
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
const OWNER_EMAIL = 'demo@routeflow.nl';
const DEMO_PASSWORD = 'DemoWachtwoord123';
const COMPANY_NAME = 'Glashelder Nijmegen B.V.';

const report: string[] = [];
function log(line: string) {
  console.log(line);
  report.push(line);
}

// ---------------------------------------------------------------------------
// Data-pools (fictief)
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
  'Bakker Jansen',
  "Café 't Hoekje",
  'Kapsalon Linda',
  'Slagerij Willems',
  'Boekhandel Smits',
  'Advocatenkantoor de Vries',
  'Tandartspraktijk Bos',
  'Fysio Dukenburg',
  'Restaurant De Waag',
  'Autobedrijf Mulder',
];

interface Wijk {
  naam: string;
  aantal: number;
  postcodePrefix: string;
  straten: string[];
}

const WIJKEN: Wijk[] = [
  {
    naam: 'Nijmegen Noord',
    aantal: 10,
    postcodePrefix: '6541',
    straten: ['Voorstadslaan', 'Griftdijk', 'Broodkorf', 'Weezenhof'],
  },
  {
    naam: 'Nijmegen Oost',
    aantal: 10,
    postcodePrefix: '6522',
    straten: ['Berg en Dalseweg', 'Gerard Noodtstraat', 'Groesbeekseweg', 'Hatertseweg'],
  },
  {
    naam: 'Nijmegen Zuid',
    aantal: 10,
    postcodePrefix: '6535',
    straten: ['Malderburchtstraat', 'Wolfskuilseweg', 'Sint Annastraat', 'Heijendaalseweg'],
  },
  {
    naam: 'Bottendaal',
    aantal: 5,
    postcodePrefix: '6511',
    straten: ['Bijleveldsingel', 'Berkelstraat', 'Regulierstraat'],
  },
  {
    naam: 'Lent',
    aantal: 5,
    postcodePrefix: '6663',
    straten: ['Pijlpuntstraat', 'Dorpsstraat', 'Veerstraat'],
  },
  {
    naam: 'Hatert',
    aantal: 5,
    postcodePrefix: '6533',
    straten: ['Voorstenkampstraat', 'Slotemaker de Bruïneweg'],
  },
  {
    naam: 'Dukenburg',
    aantal: 5,
    postcodePrefix: '6537',
    straten: ['Meijhorst', 'Aldenhof', 'Malvert'],
  },
];

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
const FREQUENTIES: { type: 'custom'; intervalDays: number; label: string }[] = [
  { type: 'custom', intervalDays: 28, label: '4-wekelijks' },
  { type: 'custom', intervalDays: 42, label: '6-wekelijks' },
  { type: 'custom', intervalDays: 56, label: '8-wekelijks' },
  { type: 'custom', intervalDays: 84, label: '12-wekelijks' },
];

const MEDEWERKERS = [
  {
    firstName: 'Jan',
    lastName: 'de Ruiter',
    phone: '0611000001',
    wijken: ['Nijmegen Noord', 'Lent'],
  },
  {
    firstName: 'Pieter',
    lastName: 'van Dam',
    phone: '0611000002',
    wijken: ['Nijmegen Oost', 'Bottendaal'],
  },
  { firstName: 'Tom', lastName: 'Hendriksen', phone: '0611000003', wijken: ['Nijmegen Zuid'] },
  {
    firstName: 'Kevin',
    lastName: 'Molenaar',
    phone: '0611000004',
    wijken: ['Hatert', 'Dukenburg'],
  },
  {
    firstName: 'Rick',
    lastName: 'Vos',
    phone: '0611000005',
    wijken: ['Nijmegen Noord', 'Nijmegen Oost'],
  },
  {
    firstName: 'Bas',
    lastName: 'Timmermans',
    phone: '0611000006',
    wijken: ['Nijmegen Zuid', 'Bottendaal'],
  },
];

function pick<T>(arr: T[], seed: number): T {
  return arr[((seed % arr.length) + arr.length) % arr.length]!;
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(d: Date, days: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + days);
  return copy;
}

// weekday: 0 = maandag .. 6 = zondag (BR-consistent, zie service_agreements.preferred_day)
function nextWeekday(from: Date, weekday: number): Date {
  const jsDay = (weekday + 1) % 7; // ma=1..zo=0 in JS Date
  const diff = (jsDay - from.getDay() + 7) % 7;
  return addDays(from, diff === 0 ? 7 : diff);
}

async function main() {
  log(`# Seed Report — ${COMPANY_NAME}`);
  log(`Datum: ${new Date().toISOString()}`);
  log('');

  // --- 1. Bedrijf + eigenaar --------------------------------------------
  let companyId: string;
  const { data: existingCompany } = await admin
    .from('companies')
    .select('id')
    .eq('name', COMPANY_NAME)
    .maybeSingle();

  if (existingCompany) {
    companyId = existingCompany.id;
    log(`Bedrijf bestaat al: ${COMPANY_NAME} (${companyId})`);
  } else {
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
      owner_full_name: 'Demo Eigenaar',
    });
    if (onboardError || !company) throw onboardError ?? new Error('onboard_company mislukt');
    companyId = company.id;

    await admin.auth.admin.updateUserById(ownerUser.id, {
      user_metadata: { company_id: companyId },
    });
    await admin
      .from('companies')
      .update({
        config_json: {
          invoicing: {
            company_code: 'GLH',
            kvk_number: '12345678',
            vat_number: 'NL123456789B01',
            iban: 'NL91ABNA0417164300',
            bic: 'ABNANL2A',
          },
          depot_location: { lat: 51.8425, lng: 5.8528 }, // Nijmegen centrum (PRD § 19 A-13)
        },
      })
      .eq('id', companyId);
    log(
      `Bedrijf aangemaakt: ${COMPANY_NAME} (${companyId}), eigenaar ${OWNER_EMAIL} / ${DEMO_PASSWORD}`,
    );
  }

  // --- 2. Diensten ---------------------------------------------------------
  const serviceIds: Record<string, string> = {};
  for (const dienst of DIENSTEN) {
    const { data: existing } = await admin
      .from('services')
      .select('id')
      .eq('company_id', companyId)
      .eq('name', dienst.name)
      .maybeSingle();
    if (existing) {
      serviceIds[dienst.name] = existing.id;
      continue;
    }
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
  const employeeIds: { id: string; firstName: string; wijken: string[] }[] = [];
  for (const m of MEDEWERKERS) {
    const { data: existing } = await admin
      .from('employees')
      .select('id')
      .eq('company_id', companyId)
      .eq('phone', m.phone)
      .maybeSingle();
    let employeeId = existing?.id;
    if (!employeeId) {
      const { data: created, error } = await admin
        .from('employees')
        .insert({
          company_id: companyId,
          first_name: m.firstName,
          last_name: m.lastName,
          phone: m.phone,
        })
        .select('id')
        .single();
      if (error || !created) throw error ?? new Error('employee insert mislukt');
      employeeId = created.id;
    }

    const email = `${m.firstName.toLowerCase()}@glashelder-demo.nl`;
    const { data: authUsers } = await admin.auth.admin.listUsers();
    let authUser = authUsers.users.find((u) => u.email === email);
    if (!authUser) {
      const { data: created, error } = await admin.auth.admin.createUser({
        email,
        password: DEMO_PASSWORD,
        email_confirm: true,
      });
      if (error || !created.user) throw error ?? new Error('employee auth createUser mislukt');
      authUser = created.user;
      await admin.auth.admin.updateUserById(authUser.id, {
        user_metadata: { company_id: companyId },
      });
      const { data: profile } = await admin
        .from('users')
        .select('id')
        .eq('id', authUser.id)
        .maybeSingle();
      if (!profile) {
        await admin.from('users').insert({
          id: authUser.id,
          company_id: companyId,
          email,
          role: 'employee',
          full_name: `${m.firstName} ${m.lastName}`,
        });
      }
      await admin.from('employees').update({ user_id: authUser.id }).eq('id', employeeId);
    }

    // Beschikbaarheid: één toekomstige ziektedag voor de eerste medewerker,
    // zodat BR-802/Replanning Agent-scenario's ook demonstreerbaar zijn.
    if (m === MEDEWERKERS[0]) {
      const sickDate = isoDate(addDays(new Date(), 10));
      const { data: existingAvail } = await admin
        .from('availability')
        .select('id')
        .eq('employee_id', employeeId)
        .eq('date', sickDate)
        .maybeSingle();
      if (!existingAvail) {
        await admin
          .from('availability')
          .insert({
            company_id: companyId,
            employee_id: employeeId,
            date: sickDate,
            status: 'sick',
            reason: 'Griep',
          });
      }
    }

    employeeIds.push({ id: employeeId, firstName: m.firstName, wijken: m.wijken });
  }
  log(
    `Medewerkers: ${employeeIds.length} (inloggen: <voornaam>@glashelder-demo.nl / ${DEMO_PASSWORD})`,
  );

  // --- 4. Klanten + objecten + dienstafspraken + prijzen ----------------
  let customerCount = 0;
  let objectCount = 0;
  let agreementCount = 0;
  const agreementsByWijk: Record<string, { agreementId: string; objectId: string }[]> = {};

  let globalIndex = 0;
  for (const wijk of WIJKEN) {
    agreementsByWijk[wijk.naam] = [];
    for (let i = 0; i < wijk.aantal; i += 1) {
      globalIndex += 1;
      const isBusiness = globalIndex % 4 === 0;
      const name = isBusiness
        ? pick(BEDRIJFSNAMEN, globalIndex)
        : `${pick(VOORNAMEN, globalIndex)} ${pick(ACHTERNAMEN, globalIndex + 7)}`;
      const email = `${name.toLowerCase().replace(/[^a-z0-9]+/g, '.')}.${globalIndex}@voorbeeld.routeflow.test`;

      const { data: existingCustomer } = await admin
        .from('customers')
        .select('id')
        .eq('company_id', companyId)
        .eq('email', email)
        .maybeSingle();
      let customerId = existingCustomer?.id;
      if (!customerId) {
        const { data: created, error } = await admin
          .from('customers')
          .insert({
            company_id: companyId,
            name,
            type: isBusiness ? 'business' : 'person',
            email,
            phone: `06${String(20000000 + globalIndex).padStart(8, '0')}`,
            kvk_number: isBusiness ? String(10000000 + globalIndex) : null,
            payment_terms_days: 14,
          })
          .select('id')
          .single();
        if (error || !created) throw error ?? new Error(`customer insert mislukt (${email})`);
        customerId = created.id;
        customerCount += 1;
      }

      const objectenPerKlant = 1 + (globalIndex % 3); // 1..3
      for (let o = 0; o < objectenPerKlant; o += 1) {
        const straat = pick(wijk.straten, globalIndex + o);
        const huisnummer = 1 + ((globalIndex * 3 + o) % 150);
        const postcode = `${wijk.postcodePrefix} ${String.fromCharCode(65 + (o % 26))}${String.fromCharCode(66 + (o % 25))}`;

        const { data: existingObject } = await admin
          .from('objects')
          .select('id')
          .eq('company_id', companyId)
          .eq('customer_id', customerId)
          .eq('postal_code', postcode)
          .eq('address_line1', `${straat} ${huisnummer}`)
          .maybeSingle();
        let objectId = existingObject?.id;
        if (!objectId) {
          const { data: created, error } = await admin
            .from('objects')
            .insert({
              company_id: companyId,
              customer_id: customerId,
              address_line1: `${straat} ${huisnummer}`,
              postal_code: postcode,
              city: 'Nijmegen',
              type: isBusiness ? 'commercial' : o === 0 ? 'residence' : 'complex',
              access_notes: o === 0 ? undefined : 'Bel aan bij de hoofdingang.',
            })
            .select('id')
            .single();
          if (error || !created) throw error ?? new Error('object insert mislukt');
          objectId = created.id;
          objectCount += 1;
        }

        const dienst = pick(DIENSTEN, globalIndex + o);
        const { data: existingAgreement } = await admin
          .from('service_agreements')
          .select('id')
          .eq('company_id', companyId)
          .eq('object_id', objectId)
          .eq('service_id', serviceIds[dienst.name]!)
          .maybeSingle();
        let agreementId = existingAgreement?.id;
        if (!agreementId) {
          const priceCents = pick(PRIJZEN_CENTS, globalIndex + o);
          const { data: pricing, error: pricingError } = await admin
            .from('pricings')
            .insert({
              company_id: companyId,
              type: 'per_job',
              amount_cents: priceCents,
              vat_rate: dienst.vat,
            })
            .select('id')
            .single();
          if (pricingError || !pricing) throw pricingError ?? new Error('pricing insert mislukt');

          const frequentie = pick(FREQUENTIES, globalIndex + o);
          const { data: created, error } = await admin
            .from('service_agreements')
            .insert({
              company_id: companyId,
              object_id: objectId,
              service_id: serviceIds[dienst.name]!,
              pricing_id: pricing.id,
              frequency_type: frequentie.type,
              frequency_interval_days: frequentie.intervalDays,
              preferred_day: globalIndex % 5, // 0=ma..4=vr
              flexibility_window_days: 2,
            })
            .select('id')
            .single();
          if (error || !created) throw error ?? new Error('service_agreement insert mislukt');
          agreementId = created.id;
          agreementCount += 1;
        }

        agreementsByWijk[wijk.naam]!.push({ agreementId, objectId });
      }
    }
  }
  log(`Klanten: ${customerCount} nieuw (${globalIndex} totaal verwacht)`);
  log(`Objecten: ${objectCount} nieuw`);
  log(`Dienstafspraken: ${agreementCount} nieuw`);

  // --- 5. Routes + jobs voor de komende 8 weken (schoon herbouwd) --------
  const horizonStart = new Date();
  const horizonEnd = addDays(horizonStart, 56);

  // Alleen dit bedrijf, alleen toekomstige/horizon-jobs — bestaande
  // afgeronde/gefactureerde historie (stap 6) blijft ongemoeid.
  const { data: staleJobs } = await admin
    .from('jobs')
    .select('id')
    .eq('company_id', companyId)
    .gte('scheduled_date', isoDate(horizonStart))
    .in('status', ['proposed', 'planned', 'en_route']);
  if (staleJobs && staleJobs.length > 0) {
    await admin
      .from('jobs')
      .delete()
      .in(
        'id',
        staleJobs.map((j) => j.id),
      );
  }
  await admin
    .from('routes')
    .delete()
    .eq('company_id', companyId)
    .gte('route_date', isoDate(horizonStart));

  const routesByEmployeeDate = new Map<string, string>();
  async function ensureRoute(employeeId: string, date: string): Promise<string> {
    const key = `${employeeId}|${date}`;
    const existing = routesByEmployeeDate.get(key);
    if (existing) return existing;
    const { data: created, error } = await admin
      .from('routes')
      .insert({ company_id: companyId, employee_id: employeeId, route_date: date })
      .select('id')
      .single();
    if (error || !created) throw error ?? new Error('route insert mislukt');
    routesByEmployeeDate.set(key, created.id);
    return created.id;
  }

  let jobsCreated = 0;
  let jobsUnrouted = 0;
  let sequenceCounter = 0;

  for (const wijk of WIJKEN) {
    const wijkEmployees = employeeIds.filter((e) => e.wijken.includes(wijk.naam));
    const employeesForWijk = wijkEmployees.length > 0 ? wijkEmployees : employeeIds;

    for (const { agreementId } of agreementsByWijk[wijk.naam]!) {
      const { data: agreement } = await admin
        .from('service_agreements')
        .select('preferred_day, frequency_interval_days')
        .eq('id', agreementId)
        .single();
      if (!agreement?.preferred_day && agreement?.preferred_day !== 0) continue;

      let occurrence = nextWeekday(horizonStart, agreement.preferred_day);
      const interval = agreement.frequency_interval_days ?? 28;
      let occurrenceIndex = 0;
      while (occurrence <= horizonEnd) {
        sequenceCounter += 1;
        const employee = pick(employeesForWijk, sequenceCounter);
        // ~15% blijft bewust ongeroute (wachtrij, FR-020 § "AI iets te optimaliseren").
        const leaveUnrouted = sequenceCounter % 7 === 0;
        const dateStr = isoDate(occurrence);

        const jobInsert: Database['public']['Tables']['jobs']['Insert'] = {
          company_id: companyId,
          service_agreement_id: agreementId,
          scheduled_date: dateStr,
          status: 'planned',
          estimated_duration_minutes: 30,
        };
        if (!leaveUnrouted) {
          const routeId = await ensureRoute(employee.id, dateStr);
          jobInsert.route_id = routeId;
          // Bewust geen sequence/arrival_time voor de helft — laat iets over
          // voor route-optimize (14_RoutingEngine.md) om te doen.
          if (sequenceCounter % 2 === 0) {
            jobInsert.sequence = occurrenceIndex + 1;
          }
        } else {
          jobsUnrouted += 1;
        }

        const { error } = await admin.from('jobs').insert(jobInsert);
        if (error && error.code !== '23505') {
          throw error;
        }
        if (!error) jobsCreated += 1;

        occurrence = addDays(occurrence, interval);
        occurrenceIndex += 1;
      }
    }
  }
  log(
    `Jobs (komende 8 weken): ${jobsCreated} aangemaakt, waarvan ${jobsUnrouted} bewust in de wachtrij (geen route_id)`,
  );
  log(`Routes: ${routesByEmployeeDate.size}`);

  // --- 6. Facturen: 20 concept, 15 verzonden, 12 betaald, 3 achterstallig -
  // "Achterstallig" bestaat niet als los statusveld in het Sprint 5 MVP-model
  // (PRD § 19 A-19: draft/sent/paid) — gesimuleerd als status='sent' met een
  // due_date in het verleden, functioneel identiek aan "te laat".
  await admin.from('invoice_lines').delete().eq('company_id', companyId);
  await admin.from('invoices').delete().eq('company_id', companyId);

  const { data: allCustomers } = await admin
    .from('customers')
    .select('id')
    .eq('company_id', companyId);
  const customerIds = (allCustomers ?? []).map((c) => c.id);

  type InvoicePlan = { status: 'draft' | 'sent' | 'paid'; overdue: boolean };
  const invoicePlans: InvoicePlan[] = [
    ...Array(20).fill({ status: 'draft', overdue: false }),
    ...Array(15).fill({ status: 'sent', overdue: false }),
    ...Array(12).fill({ status: 'paid', overdue: false }),
    ...Array(3).fill({ status: 'sent', overdue: true }),
  ];

  let invoiceIndex = 0;
  for (const plan of invoicePlans) {
    invoiceIndex += 1;
    const customerId = customerIds[invoiceIndex % customerIds.length]!;
    const dienst = pick(DIENSTEN, invoiceIndex);
    const unitPrice = pick(PRIJZEN_CENTS, invoiceIndex);
    const vat = dienst.vat;
    const vatAmount = Math.round((unitPrice * vat) / 100);
    const total = unitPrice + vatAmount;

    const invoiceDate = plan.overdue
      ? addDays(new Date(), -45)
      : plan.status === 'draft'
        ? addDays(new Date(), -1)
        : addDays(new Date(), -10);
    const dueDate = plan.overdue ? addDays(new Date(), -31) : addDays(invoiceDate, 14);

    const { data: invoice, error: invoiceError } = await admin
      .from('invoices')
      .insert({
        company_id: companyId,
        customer_id: customerId,
        status: plan.status,
        invoice_number:
          plan.status === 'draft'
            ? null
            : `GLH-${new Date().getFullYear()}-${String(invoiceIndex).padStart(5, '0')}`,
        invoice_date: isoDate(invoiceDate),
        due_date: isoDate(dueDate),
        total_amount_cents: total,
        total_tax_cents: vatAmount,
        sent_at: plan.status === 'draft' ? null : invoiceDate.toISOString(),
        paid_at: plan.status === 'paid' ? addDays(invoiceDate, 5).toISOString() : null,
        // Expliciet gezet (i.p.v. de default `now()`) zodat het dashboard
        // ("omzet vandaag/deze week", created_at-gebaseerd) een realistische
        // spreiding toont i.p.v. alle 50 facturen als "vandaag".
        created_at: invoiceDate.toISOString(),
      })
      .select('id')
      .single();
    if (invoiceError || !invoice) throw invoiceError ?? new Error('invoice insert mislukt');

    await admin.from('invoice_lines').insert({
      company_id: companyId,
      invoice_id: invoice.id,
      service_id: serviceIds[dienst.name]!,
      description: `${dienst.name} — voorbeeldregel ${invoiceIndex}`,
      quantity: 1,
      unit_price_cents: unitPrice,
      vat_rate: vat,
      vat_amount_cents: vatAmount,
      total_amount_cents: total,
      sequence: 1,
    });
  }
  log(
    `Facturen: ${invoicePlans.length} (20 concept, 15 verzonden, 12 betaald, 3 achterstallig-gesimuleerd)`,
  );

  // --- 7. Weer & WhatsApp — bewust overgeslagen -------------------------
  log('');
  log('Overgeslagen (geen bestaande tabel/architectuur, geen scope-uitbreiding dit script):');
  log('- Weerdata (weather_cache is Sprint 7-scope, nog geen migratie)');
  log(
    '- WhatsApp-voorbeeldberichten (messages/notifications zijn Sprint 8-scope, nog geen migratie)',
  );

  log('');
  log('## Inloggegevens (lokaal, fictief)');
  log(`Eigenaar: ${OWNER_EMAIL} / ${DEMO_PASSWORD}`);
  for (const m of MEDEWERKERS) {
    log(
      `Medewerker ${m.firstName}: ${m.firstName.toLowerCase()}@glashelder-demo.nl / ${DEMO_PASSWORD}`,
    );
  }

  console.log('\n--- SEED VOLTOOID ---');
}

main().catch((err) => {
  console.error('Seed mislukt:', err);
  process.exit(1);
});
