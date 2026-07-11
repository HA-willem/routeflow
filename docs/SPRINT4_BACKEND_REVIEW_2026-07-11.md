# Sprint 4 Backend Review Report (2026-07-11)

**Doel:** volledige review van het Sprint 4-backend (routing-engine, employees/routes/availability-schema, twee Edge Functions) vóór start van frontend-werk. Uitsluitend kleine, noodzakelijke refactors — geen nieuwe functionaliteit.

## Samenvatting

Het backend is functioneel compleet en aantoonbaar correct op de kernpunten (RLS, tenant-isolatie, hard business rules BR-200/BR-202/BR-203, migratie-hygiëne). Één spec-gedocumenteerde index ontbrak en is toegevoegd. De belangrijkste openstaande punten zijn geen bugs maar **operationele configuratie** (geen Mapbox-token in productie, geen depot-locatie per tenant) en twee **gedocumenteerde, bewuste afwijkingen** van coding standards die risicovoller zijn om nu te fixen dan te laten staan tot een dedicated refactor-sprint.

## 1. Architectuur

- Lagen zijn correct gescheiden: `lib/routing/` (zuivere logica, testbaar zonder I/O) → `mapbox-provider.ts`/`matrix.ts` (I/O-adapters) → Edge Functions (orchestratie + persistente). Dit volgt ADR-007 (provider-adapter-pattern) en het bestaande `lib/planning/horizon.ts`-precedent exact.
- `RoutingProvider`-interface (14_RoutingEngine.md § 2) is één-op-één geïmplementeerd; geen lekkende Mapbox-specifieke details in `optimize.ts`/`matrix.ts`.
- Employees-CRUD volgt het bestaande services-CRUD-patroon 1-op-1 (Server Action → Zod-schema → PostgREST). Geen structurele afwijking.

## 2. Code duplicatie

- **Gevonden:** `route-move-job/index.ts`'s `recomputeRoute()`-helper dupliceert grotendeels de matrix/optimize-orkestratie die inline in `route-optimize/index.ts` staat (object-locaties ophalen, matrix bouwen, `optimizeRoute()` aanroepen, resultaten wegschrijven).
  **Niet opgelost:** een echte extractie naar een gedeelde `lib/routing/route-write.ts` is mogelijk, maar de twee call-sites verschillen net genoeg in job-selectie (route-optimize kiest kandidaten via `company_id`+`scheduled_date`+`status`, route-move-job via een vaste `route_id`) dat een correcte generalisatie meer dan een "kleine" wijziging is — en het risico van een subtiele regressie in twee al-gedeployde, moeilijk end-to-end testbare (Deno-only) Edge Functions weegt zwaarder dan de duplicatie-besparing. Aanbevolen voor een aparte, goed geteste refactor-ronde.

## 3. Performance & query efficiency

- **Bevinding (schending van 41_CodingStandards.md § 17 "Geen N+1-queries"):** zowel `route-optimize` als `route-move-job` schrijven per route-stop een aparte `UPDATE jobs ... WHERE id=?` in een `for`-loop, in plaats van één bulk-operatie.
  **Niet opgelost:** PostgREST's `.upsert()` kan dit niet vervangen zonder een NOT-NULL-constraint-fout te riskeren (de INSERT-tak van `ON CONFLICT DO UPDATE` valideert alsnog de volledige rij, ook al resolved die altijd naar een UPDATE) — een correcte bulk-fix vereist een database-functie (`unnest()`-gebaseerde set-based update), wat nieuwe backend-functionaliteit zou zijn en dus buiten de scope van deze review valt ("geen nieuwe functionaliteit"). Dit is dezelfde klasse gat als het al-bekende, al-geaccepteerde N+1-patroon in `planning-generate` (Architectuurreview 2026-07-10) — geen regressie, maar wel een gat dat groeit naarmate meer Edge Functions dit patroon overnemen. **Aanbevolen als eerste werk voor een volgende backend-sprint.**
- **Mapbox-geocoding-loop** in `route-optimize` (RE-01, objecten zonder locatie) is ook sequentieel, maar zelf-beperkend: eenmaal gegeocodeerd blijft `objects.location` gezet, dus de kost daalt naar nul na de eerste run per object. Geen actie nodig.
- **Opgelost:** ontbrekende index `jobs(company_id, route_id, scheduled_date)` — expliciet gedocumenteerd in `11_DatabaseConcept.md` § 4 als vereist voor precies het queryplan dat `route-optimize` gebruikt, maar `014_routes.sql` had alleen een los `idx_jobs_route_id` toegevoegd. Migratie `016_jobs_route_composite_index.sql` toegevoegd, lokaal geverifieerd (schone `db reset`, 46/46 integratietests groen), **nog niet naar Supabase Cloud gepusht** (zie Conclusie).

## 4. RLS

Geverifieerd rechtstreeks tegen de gelinkte productiedatabase (`db query --linked`):

| Tabel | RLS | Policies | Overeenkomstig 23_Gebruikersrollen.md § 2? |
|---|---|---|---|
| `employees` | ✅ aan | SELECT (eigen bedrijf + eigen rij), INSERT/UPDATE (owner/admin) | ✅ |
| `availability` | ✅ aan | SELECT/INSERT (+eigen medewerker), UPDATE (planning-rollen), DELETE (owner/admin) | ✅ |
| `routes` | ✅ aan | SELECT (eigen bedrijf + eigen route), INSERT/UPDATE (planning-rollen) | ✅ |
| `distance_cache` | ❌ uit (**bewust**) | geen — uitsluitend service-role via Edge Functions, analoog aan `weerdata_cache` | ✅ conform 11_DatabaseConcept.md § 3.8 |

Geen wijzigingen nodig.

## 5. Indexes

Zie § 3 — één gat gevonden en gefixt (`016_jobs_route_composite_index.sql`). Overige indexen op de vier nieuwe tabellen (`employees`, `availability`, `routes`, `distance_cache`) zijn compleet volgens 11_DatabaseConcept.md § 4/§ 3.5/§ 3.8, geverifieerd via `pg_indexes` op productie.

## 6. Edge Functions

- Beide functies (`route-optimize`, `route-move-job`) draaien correct onder de caller-JWT voor alle RLS-gebonden tabellen; een aparte service-role-client wordt uitsluitend voor `distance_cache` gebruikt — het enige geval waar dat nodig is (geen RLS op die tabel).
- **Coding-standard-afwijking gevonden (41_CodingStandards.md § 8):** `lib/supabase/admin.ts` bestaat als de voorgeschreven, enige plek voor een service-role-client (ESLint-regel verbiedt de import daarbuiten al preventief). Beide nieuwe Edge Functions maken in plaats daarvan hun eigen service-role-client inline aan.
  **Niet opgelost:** het canonieke bestand zou Deno-specifieke code (`Deno.env.get`, `jsr:`-imports) moeten bevatten, maar `lib/supabase/admin.ts` valt onder `tsconfig.json`'s `include` (alleen `supabase/functions/**` is uitgesloten) — het zou `tsc --noEmit` breken tenzij er een oplossing komt die zowel Deno- als Node-compatibel is (bv. parameters i.p.v. env-reads, met een importpad dat in beide runtimes resolved). Dat vergt uitproberen tegen de daadwerkelijke Deno-bundling van een **al gedeployde productiefunctie** — het risico op een stille importfout in productie weegt niet op tegen de conventienetheid. Gevlagd voor een aparte, geïsoleerde refactor met een test-deploy vóórdat het op de huidige functies wordt toegepast.
- **Rate limiting ontbreekt** op `route-optimize`, terwijl 41_CodingStandards.md § 16 dit endpoint met naam noemt ("zware/gevoelige endpoints (auth, `route-optimize`, publieke betaalpagina)"). Niet geïmplementeerd — vereist externe infrastructuur (bv. Upstash) die niet bestaat in dit project en dus nieuwe functionaliteit zou zijn. **Reëel gat, geen blocker voor frontend-werk, wel vóór public beta op schaal.**
- Foutmodel is consistent (`{ error: { code, message, status } }`), 404-i.p.v.-403 voor cross-tenant lookups is correct toegepast (13_API_Specificatie.md § 6).
- Tijdens deze en de vorige sessie **empirisch geverifieerd** tegen de lokale Supabase-instantie (`supabase functions serve`): beide functies laden zonder import-/syntaxfouten, validatiepaden geven correcte 400's, en het volledige pad auth → RLS → employees/companies-lookup → jobs-query is doorlopen tot en met een schone "geen beurten"-respons. Twee echte bugs zijn daarbij gevonden en gefixt vóór deployment (ongeldige `location_status`-enumwaarde, PGRST201 ambiguous-embed-fout). **Niet getest:** het volledige pad mét een echte Mapbox-token en fixture-jobs/objecten (geen Mapbox-account beschikbaar in deze sessie).

## 7. Routing engine (lib/routing/)

- `optimize.ts` (nearest-neighbor + 2-opt + or-opt) is correct en volledig getest tegen de business rules: H1/BR-202 (werkdaglimiet → `unplaceableJobIds`), H2/BR-200 (vergrendelde stops blijven fixed tijdens verbetering), H3 (start/eind bij depot). Zie `optimize.test.ts`, 10 tests.
- `route-move-job` handhaaft H1 correct door na herberekening te controleren of de verplaatste beurt daadwerkelijk geplaatst is (`unplaceableJobIds`), en draait de hele verplaatsing terug zo niet — dit is toegevoegd tijdens de bouw zelf (niet tijdens deze review) na het herlezen van 14_RoutingEngine.md § 6.2, maar wordt hier bevestigd als correct geïmplementeerd.
- **Niet getest (bekende, bewuste lacune):** BR-201 (medewerker-onbeschikbaarheid blokkeert een drop) — de logica staat in `route-move-job` (query op `availability`), maar er is geen test (unit noch integratie) die dit pad daadwerkelijk oefent, omdat de Edge-Function-orkestratie zelf niet unit-testbaar is (Deno, uitgesloten van Vitest) en er nog geen fixture-opzet bestaat voor een volledige multi-tabel Edge-Function-integratietest. Aanbevolen voor een toekomstige `supabase functions serve`-gebaseerde testharness.
- `optimizationScore` is expliciet gedefinieerd als een zachte-constraint-strafscore (niet een vergelijking met een theoretisch optimum) — gedocumenteerde, bewuste vereenvoudiging, geen bug.

## 8. Testdekking

| Laag | Dekking |
|---|---|
| `lib/routing/*.ts` (pure logica) | ✅ Sterk — 135 unit tests totaal in de suite, incl. tiling (6), haversine (6), optimize (10), matrix (4 met fakes) |
| `employees`/`availability`/`routes` RLS | ✅ Negatieve tenant-isolatietest + unique-constraint-tests aanwezig |
| Edge Functions zelf (orkestratie) | ⚠️ Alleen empirisch/handmatig geverifieerd deze sessie, geen geautomatiseerde test (Deno, buiten Vitest-bereik) |
| BR-201 (medewerker-beschikbaarheid in route-move-job) | ❌ Geen test — zie § 7 |
| Employees-CRUD (Server Actions/UI) | ✅ Playwright-smoke-test uitgevoerd (create+list), geen permanente e2e-testfile toegevoegd |

## 9. Security

- Geen hardcoded secrets in de gecommitte code (gecontroleerd via grep op `lib/`, `supabase/functions/`, `app/`).
- RLS blijft de enige autorisatiegrens; geen `company_id`-filtering-als-vervanging-voor-RLS gevonden.
- Service-role wordt uitsluitend gebruikt voor `distance_cache`, nooit voor RLS-gebonden tabellen — geen bypass-risico.
- Input-validatie: beide Edge Functions valideren body-shape (UUID-regex, datum-regex) vóór gebruik; `employeeSchema` (Zod) valideert server-side, consistent met 36_Security.md § 6.
- **Rate limiting ontbreekt** op `route-optimize` — zie § 6, expliciet genoemd in 41_CodingStandards.md § 16.
- Geen PII in logregels (alleen id's/codes gelogd, geen namen/adressen/telefoonnummers).

## 10. Coding standards (41_CodingStandards.md)

| Regel | Status |
|---|---|
| § 8 "drie clients, admin.ts uitsluitend vanuit /supabase/functions" | ⚠️ Afgeweken — inline service-role-clients i.p.v. `lib/supabase/admin.ts` (zie § 6) |
| § 9 SQL-conventies (snake_case, `ON DELETE` expliciet, index-naamgeving) | ✅ Volledig conform |
| § 10 Uniform foutmodel | ✅ Conform |
| § 12 Testing (RLS-negatieve tests, BR-tests) | ⚠️ BR-201 ontbreekt (zie § 7/§ 8) |
| § 16 Security (rate limiting op `route-optimize`) | ⚠️ Ontbreekt (zie § 6) |
| § 17 Performance (geen N+1) | ⚠️ Afgeweken in job-update-loops (zie § 3) |

## Wat is opgelost in deze review

1. `016_jobs_route_composite_index.sql` — ontbrekende, spec-gedocumenteerde index toegevoegd, lokaal geverifieerd, gecommit en gepusht naar GitHub. **Nog niet naar Supabase Cloud productie gepusht** — vereist dezelfde expliciete bevestiging als de vorige migratie-deploys in deze sessie.

## Wat bewust niet is opgelost (met reden)

Alle drie zijn reële, benoembare gaten — geen enkele is een acute blocker voor het starten van frontend-werk, die immers tegen de bestaande (correcte) data-contracten van `routes`/`jobs` bouwt, niet tegen de interne Edge-Function-implementatie:

1. Code duplicatie tussen de twee Edge Functions (§ 2) — extractie is risicovoller dan de duplicatie zelf op dit moment.
2. N+1 job-update-loops (§ 3/§ 10) — correcte fix vereist een nieuwe database-functie (nieuwe functionaliteit, expliciet buiten scope).
3. `lib/supabase/admin.ts`-conventie niet gevolgd (§ 6/§ 10) — vereist een Deno/Node-dubbel-compatibele oplossing die eerst apart getest moet worden vóór toepassing op productiefuncties.
4. Rate limiting op `route-optimize` (§ 6/§ 9/§ 10) — vereist externe infrastructuur, nieuwe functionaliteit.
5. BR-201-testdekking (§ 7/§ 8) — vereist een Edge-Function-testharness die nog niet bestaat.

## Operationele gaten (geen codeprobleem)

- Geen `MAPBOX_ACCESS_TOKEN`-secret ingesteld op Supabase Cloud (geverifieerd via `supabase secrets list`) — `route-optimize`/`route-move-job` geven momenteel altijd `config_error` in productie totdat dit is ingesteld.
- Geen enkele company heeft `config_json.depot_location` ingesteld op productie — elke `route-optimize`-aanroep geeft `depot_location_missing` totdat dit per bedrijf is geconfigureerd (er is nog geen UI hiervoor; PRD § 19 A-13 documenteert dit bewust als buiten Sprint 4-scope).

## Conclusie

**BACKEND READY FOR FRONTEND**

Het schema, de RLS-policies, de routing-engine en de Edge-Function-orkestratie zijn correct, intern consistent en aantoonbaar (via een combinatie van 135 automatische tests en handmatige verificatie tegen de lokale Supabase-instantie). De vijf bewust-niet-opgeloste punten zijn reële technical-debt-items voor een volgende backend-sprint, maar blokkeren niet het bouwen van de RouteBoard/JobCard/RouteStopList-UI: die bouwt tegen de nu-stabiele `routes`/`jobs`-datacontracten en roept de Edge Functions aan als black box. De twee operationele gaten (Mapbox-token, depot-locatie) zijn config, niet code, en moeten vóór een echte end-to-end-test van de RouteBoard ingevuld worden — maar blokkeren evenmin het bouwen van de UI zelf.
