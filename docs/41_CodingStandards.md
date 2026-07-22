# 41 — Coding Standards

**Status:** DONE
**Versie:** 1.0
**Bron van waarheid:** `00_PRD.md` § 12 (Technische Architectuur), alle ADR's (`docs/adr/`), en `40_Implementatieplan.md` — dit document mag geen van deze tegenspreken. Het operationaliseert de vastgestelde architectuur (Next.js/RSC, Supabase, RLS-multitenancy, provider-adapters, PWA, AI Planner) tot concrete, afdwingbare regels voor engineers.
**Werkinstructie:** zie `MASTER_PROMPT.md`.
**Relaties:** ADR-001…010, `11_DatabaseConcept.md`, `12_Entiteiten.md` (NL-EN mapping), `13_API_Specificatie.md`, `22_Authenticatie.md`, `23_Gebruikersrollen.md`, `25_DesignSystem.md`, `26_ComponentLibrary.md`, `31_Testplan.md`, `35_Deployment.md`, `36_Security.md`, `37_Performance.md`, `40_Implementatieplan.md`.

---

## Doel van dit document

Dit document is de **technische stijlgids** waarmee een team van senior engineers ServOps bouwt vanaf Sprint 1. Waar de documenten 00–40 bepalen *wat* er gebouwd wordt en *waarom*, bepaalt dit document *hoe* — op een niveau van detail waarmee code van verschillende engineers niet van elkaar te onderscheiden is qua stijl, conventie en kwaliteitsniveau.

Dit is geen inleiding tot React/TypeScript/PostgreSQL — het is een verzameling **project-specifieke beslissingen** op punten waar de taal/het framework meerdere geldige keuzes toelaat. Waar dit document zwijgt, geldt de standaardconventie van het framework/de linter.

**Autoriteit:** dit document staat onder `00_PRD.md` en de ADR's (MASTER_PROMPT § 1). Een engineer die hiervan wil afwijken, stelt eerst een wijziging van dit document voor (met motivatie), niet een stilzwijgende uitzondering in een PR.

---

## 1. Bestandsstructuur

Uitbreiding van het repo-skelet uit `40_Implementatieplan.md`:

```
/app
  /(app)                      Desktop-applicatie (planner/eigenaar/administratie), 27 § 1
    /(dashboard)/page.tsx
    /planning/**
    /klanten/**
    /facturen/**
    /instellingen/**
    layout.tsx                 App-shell, zijbalk (30)
  /m                           PWA-medewerker (27 § 2), eigen layout
    /beurt/[id]/**
    /profiel/**
  /(auth)                      Login, wachtwoord-vergeten, uitnodiging
  /pay/[paymentId]             Publieke mobiele betaalpagina (Sprint 6)
  /api                         Uitsluitend voor dingen die geen Edge Function/Server Action kunnen zijn (zeldzaam)

/components
  /primitives                  Button, Input, Modal, Toast, Skeleton, … (26 § 2)
  /composed                    DataTable, Form, CommandPalette, MapView, … (26 § 3)
  /domain                      JobCard, RouteBoard, InvoicePreview, … (26 § 4)
  /mobile                      Mobiel-specifieke varianten (29, 26 § 6)

/lib
  /supabase                    client.ts (browser), server.ts (RSC/Server Actions), admin.ts (service-role, alléén binnen /supabase/functions)
  /routing                     provider.ts (interface) + mapbox.ts + osrm.ts (14 § 2)
  /payments                    provider.ts (interface) + mollie.ts (16 § 8, ADR-007)
  /messaging                   provider.ts (interface) + threesixtydialog.ts + email.ts (19 § 2)
  /weather                     provider.ts (interface) + openmeteo.ts (15 § 6)
  /planning                    horizon.ts, reactive.ts, clustering.ts, scoring.ts (15)
  /invoicing                   vat.ts, numbering.ts, pdf.ts (16, BR-020)
  /auth                        sessie- en rol-guards (22, 23 § 4)
  /validation                  Zod-schema's per domeinentiteit (12), gedeeld tussen formulieren en Server Actions
  /utils                       Kleine, generieke helpers zonder domeinkennis

/types                          Gegenereerde Supabase-types (`database.types.ts`, § 3.4) + handmatige domeintypes
/hooks                           Herbruikbare client-hooks (React Query, realtime-subscriptions)
/locales                         `nl.json` (bron), voorbereid voor V2 (A-01, 01 § 4.6)
/public                          Statische assets, PWA-iconen, manifest

/supabase
  /migrations                   Genummerde SQL-migraties (§ 5)
  /functions                    Edge Functions: planning-generate, route-optimize, invoice-finalize, webhooks/*, *-cron

/tests
  /unit                         Co-located waar mogelijk (zie § 9); globale fixtures hier
  /integration
  /e2e                          Playwright, genoemd naar E2E-flow-ID (31 § 2)
  /load                         38 § 6 (LT-1…5)
```

**Regel:** een bestand hoort in precies één laag. Een `/components/domain`-component mag `/lib`-functies aanroepen, nooit andersom. `/app`-routes bevatten geen domeinlogica — die staat in `/lib` of een Edge Function, alleen zo blijft hij testbaar zonder Next.js te hoeven opstarten.

---

## 2. TypeScript-conventies

- **Strict mode verplicht:** `strict: true`, `noUncheckedIndexedAccess: true`, `noImplicitOverride: true`. Geen `any` — gebruik `unknown` + type-narrowing, of genereer het juiste type. Een `as`-cast is een code-smell die een commentaar met de *why* vereist (§ 19).
- **`type` vs `interface`:** `interface` voor alles wat door componenten/adapters wordt geïmplementeerd of uitgebreid (props, `RoutingProvider`, `PaymentProvider`); `type` voor unions, mapped types en samengestelde vormen.
- **Domeinstatussen als discriminated unions, niet losse booleans.** De Beurt-statusmachine (10_BusinessRules.md § 2) wordt gemodelleerd als een union op het `status`-veld, zodat de compiler onmogelijke transities (bv. `locked_reason` lezen op een `voorgesteld`-beurt) opvangt waar dat zinvol is.
- **Runtime-validatie op elke grens met Zod** (zie § 8): formulierdata, Server Action-input, Edge Function request-bodies, webhook-payloads. TypeScript-types alleen zijn onvoldoende op een grens waar externe input binnenkomt (36 § 6, input-validatie server-side).
- **Gedeelde domeintypes** leven in `/types`, afgeleid van of gevalideerd tegen het Supabase-schema (`supabase gen types typescript`) — nooit een tweede, met de hand bijgehouden kopie van de databasevorm.
- **Geen `enum`-keyword**: gebruik `as const`-object + afgeleid union-type (beter tree-shakeable, geen TS-only runtime-constructie). Voorbeeld:
  ```ts
  export const JobStatus = {
    Proposed: 'proposed',
    Planned: 'planned',
    EnRoute: 'en_route',
    Completed: 'completed',
    Invoiced: 'invoiced',
    NotHome: 'not_home',
    Cancelled: 'cancelled',
    Rescheduling: 'rescheduling',
  } as const;
  export type JobStatus = (typeof JobStatus)[keyof typeof JobStatus];
  ```
- **Padaliassen** via `tsconfig.json` `paths`: `@/components/*`, `@/lib/*`, `@/types/*`, `@/hooks/*` — nooit `../../../../lib/...`.

---

## 3. Naming conventions

| Wat | Conventie | Voorbeeld |
|---|---|---|
| Bestanden (componenten) | PascalCase, gelijk aan export | `JobCard.tsx` |
| Bestanden (overig TS) | kebab-case of camelCase, consistent per map | `invoice-numbering.ts` |
| Mappen | kebab-case | `service-agreements/` |
| React-componenten | PascalCase | `RouteBoard` |
| Hooks | `use`-prefix, camelCase | `useRealtimeRoute` |
| Functies/variabelen | camelCase | `calculateIdealDate` |
| Types/interfaces | PascalCase, geen `I`-prefix | `RoutingProvider`, niet `IRoutingProvider` |
| Constanten | UPPER_SNAKE_CASE alléén voor echte constanten (limieten, config-defaults) | `MAX_WORKDAY_MINUTES` |
| Databasetabellen/-kolommen | snake_case (PostgREST-conventie, 13 § 1) | `service_agreements`, `next_ideal_date` |
| SQL-migratiebestanden | `NNN_beschrijving.sql`, 3-cijferig, doorlopend | `007_pricings.sql` |
| Edge Functions | kebab-case, werkwoord-eerst | `route-optimize`, `invoice-finalize` |
| CSS/Tailwind-tokens | kebab-case, zoals in 25_DesignSystem.md | `--color-primary`, `radius-md` |
| i18n-keys | punt-genest, domein-eerst | `klanten.leeg.titel` |

**Domeintaal (bindend, MASTER_PROMPT § 2):** code-identifiers zijn Engels, maar volgen de vaste NL→EN-mapping uit `12_Entiteiten.md` § 1. Verzin nooit een eigen Engelse term voor een domeinconcept — `Job` niet `Task`, `ServiceAgreement` niet `Contract`, `Route` niet `Trip`. Bij twijfel: 12_Entiteiten.md is bindend.

---

## 4. Component-conventies

Volgt de lagen uit `26_ComponentLibrary.md` § 1: **primitieven → samengesteld → domein → pagina's**. Een component hoort in de laagste laag die hem kan bevatten; til een domeincomponent niet op naar "samengesteld" omdat het "misschien generiek wordt".

- **Eén component per bestand**, bestandsnaam = componentnaam.
- **Props altijd expliciet getypeerd** met een `interface <Component>Props` in hetzelfde bestand (geen inline object-types bij >2 props).
- **Server Component tenzij interactiviteit vereist is** (§ 5–6) — begin altijd als RSC, voeg `'use client'` pas toe wanneer een hook/event-handler dat noodzaakt, en dan zo laag mogelijk in de boom (§ 6).
- **Verplichte vier staten** voor elke datagedreven component (26 § 5): `loading` (skeleton), `empty` (copy + actie, 24 § 4), `error` (menselijke melding + retry, 24 § 5), `loaded`. Een PR die een DataTable/domeincomponent toevoegt zonder deze vier staten is niet compleet.
- **Alleen tokens, nooit rauwe waarden**: geen `#1a73e8`, geen `padding: 13px` — uitsluitend Tailwind-classes die naar 25_DesignSystem.md-tokens verwijzen. Een linter-regel (§ 17) controleert hierop.
- **Toegankelijkheid is geen aparte stap**: `aria-label` op iconknoppen, focus-states, `aria-live` op toasts worden in dezelfde PR als het component geschreven, niet nagekomen als "later" (26 § 7).

---

## 5. React Server Components (RSC)

- **Default.** Elke pagina/`layout.tsx` en elk `/components/domain`-component is een Server Component tenzij het reden heeft om Client te zijn.
- **Databevraging gebeurt in de RSC**, dicht bij Supabase, via de server-Supabase-client (`lib/supabase/server.ts`). Geen client-side `useEffect`-fetch voor data die de server al kent bij eerste render (NFR-101/104: minder client-JS, snellere TTI).
- **Geen React-hooks** (`useState`, `useEffect`, event handlers) in een RSC — dat is het signaal dat het component eigenlijk een Client Component (§ 6) nodig heeft, of dat de interactiviteit naar een klein child-component moet worden verplaatst.
- **`fetch`-caching is expliciet**: geef altijd bewust `cache: 'no-store'` (planning/realtime-data) of een `revalidate`-tag mee — nooit de Next.js-default stilzwijgend laten gelden voor tenant-gevoelige data.
- **RLS geldt ook hier**: de server-Supabase-client draagt de JWT van de ingelogde gebruiker door; er wordt **nooit** de service-role-key gebruikt in een RSC/Server Action (die is uitsluitend voor Edge Functions, § 8) — anders omzeil je RLS en daarmee NFR-301.

---

## 6. Client Components

- `'use client'` staat bovenaan een bestand dat **uitsluitend** de interactieve schil bevat — niet bovenaan een hele pagina omdat één knop daarin een `onClick` heeft. Split het interactieve deel eruit.
- Client Components zijn voor: formulieren (§ ivm. Server Actions), drag-and-drop (RouteBoard), realtime-subscriptions (Supabase Realtime channel), optimistic UI-mutaties, `⌘K`-palette, alles met browser-APIs (camera, geolocation, IndexedDB — 20_PWA.md).
- **Dataverversing na een mutatie** gaat via Server Action + `revalidatePath`/`revalidateTag` waar mogelijk (server blijft bron van waarheid); pas bij écht realtime multi-user-gedrag (planning-updates door een collega) een Supabase Realtime-subscription in een klein, geïsoleerd hook (`useRealtimeRoute`).
- **Geen domeinlogica in Client Components.** Een Client Component roept een Server Action of `/lib`-functie aan; hij berekent zelf geen ideale datum, BTW of routescore.

---

## 7. Server Actions

Server Actions zijn een **dunne mutatielaag voor UI-formulieren**, geen plek voor domeinlogica.

**Wel in een Server Action:**
- Eenvoudige CRUD die 1-op-1 op een tabel/PostgREST-resource inwerkt binnen RLS (klant aanmaken, dienst bewerken).
- Validatie van form-input met hetzelfde Zod-schema als de client gebruikte (§ 2), server-side herhaald (nooit alleen client-side vertrouwen, 36 § 6).
- Aanroepen van een Edge Function-RPC als de eigenlijke mutatie zwaar/gedeeld/gevoelig is (bijv. een Server Action rond `/functions/v1/invoice-finalize` — de Server Action is de dunne UI-schil, de Edge Function bevat de daadwerkelijke logica).
- `revalidatePath`/`revalidateTag` na succes.

**Nooit in een Server Action** (dit hoort in een Edge Function, ADR-008):
- Planning genereren/optimaliseren, herplan-diffs, PDF-genereren, webhook-verwerking, cron-getriggerde taken.
- Alles wat een provider-secret nodig heeft (Mollie, 360dialog, Mapbox) — providers worden **uitsluitend** vanuit Edge Functions aangeroepen via de adapters in `/lib/<domein>/provider.ts` (ADR-007), nooit rechtstreeks vanuit een Server Action of Client Component.

**Foutafhandeling:** een Server Action retourneert altijd een discriminated union (`{ success: true, data }` of `{ success: false, error: { code, message, hint } }`), consistent met het foutmodel van `13_API_Specificatie.md` § 6 — nooit een geworpen exception die de client als een onafgehandelde 500 ziet.

---

## 8. Supabase-conventies

- **Drie clients, drie contexten** (`/lib/supabase/`):
  - `client.ts` — browser, anon key, voor Client Components.
  - `server.ts` — RSC/Server Actions, leest de sessie-cookie, anon key + gebruikers-JWT (RLS actief).
  - `admin.ts` — service-role key, **uitsluitend importeerbaar vanuit `/supabase/functions`**; een ESLint-regel (§ 17) verbiedt deze import buiten die map.
- **RLS is de enige verdedigingslinie die telt** (ADR-003/004, PRD § 12.2): applicatiecode filtert nooit "voor de zekerheid" op `company_id` als vervanging van een policy — wél als extra leesbaarheid, nooit als enige garantie.
- **Elke nieuwe tabel krijgt zijn RLS-policy in dezelfde migratie** (35 § 4) — nooit een tabel zonder policy mergen, ook niet "tijdelijk". `11_DatabaseConcept.md` is de canonieke tabellenlijst; een nieuwe tabel die daar niet in staat, wordt daar eerst aan toegevoegd (documentatie vóór migratie, niet andersom).
- **Realtime-subscripties** abonneren altijd op een specifieke tabel/filter binnen de eigen tenant-scope (RLS geldt ook op `postgres_changes`); nooit een ongefilterd kanaal.
- **Storage** volgt het pad-patroon `{bucket}/{company_id}/{resource_id}/...` (bijv. `job_photos/{company_id}/{job_id}/voor.jpg`) met bucket-policies die dezelfde tenant-scope afdwingen als de RLS op de metadata-tabel (11 § 3.9).
- **Gegenereerde types** (`supabase gen types typescript`) worden bij elke schemawijziging herbouwd en gecommit in `/types/database.types.ts` — nooit handmatig bewerkt.

---

## 9. SQL-conventies

- **snake_case** voor tabellen, kolommen, functies, indexen — geen camelCase in SQL.
- **Elke tenant-tabel begint met `id UUID PK`, `company_id UUID NOT NULL REFERENCES companies(id)`** als tweede kolom (11_DatabaseConcept.md-patroon); samengestelde indexen beginnen met `company_id` (§ 4 aldaar) voor tenant-selectiviteit op schaal (38 § 2).
- **Migratienaamgeving:** `NNN_beschrijving.sql`, doorlopend genummerd, nooit hergebruikt of hernummerd — ook niet na een revert (35 § 4, 40_Implementatieplan.md-sprintconventie).
- **Expand/contract-patroon** voor breaking schema-wijzigingen: eerst toevoegen (nullable/met default), code deployen die met beide vormen overweg kan, dán pas de oude kolom verwijderen in een latere migratie. Nooit een kolom in dezelfde migratie hernoemen/verwijderen én de applicatiecode die ervan afhangt in dezelfde deploy vervangen.
- **Index-naamgeving:** `idx_<table>_<kolommen>` (bv. `idx_jobs_company_date`); **FK-naamgeving:** impliciet via PostgreSQL-default of `fk_<table>_<referenced_table>` bij expliciete constraint-namen.
- **`ON DELETE`-gedrag is verplicht expliciet** bij elke FK (dit was een gat, gecorrigeerd in `11_DatabaseConcept.md` PRR 2026-07-08 — zie changelog aldaar): `RESTRICT` als default-houding voor alles wat audit-trail/factuurhistorie raakt, `CASCADE` alléén voor puur samengestelde child-records die zonder hun parent betekenisloos zijn (bv. `invoice_lines` bij een `draft`-factuur die zelf nog verwijderbaar is), nooit stilzwijgend de PostgreSQL-default.
- **Soft-delete via `archived_at`** is de norm (11 § 5); een `DELETE`-statement op een tabel met `archived_at` is een codesmell tenzij het een tabel uit de expliciete hard-delete-lijst betreft (`payments`, `invoice_lines`, logs).
- **Concurrency-gevoelige tellers** (bijv. factuurnummering, BR-020) gebruiken een dedicated tellerrij met `SELECT ... FOR UPDATE` binnen de transactie — nooit een `MAX(kolom)+1`-query zonder locking (zie 10_BusinessRules.md § 5 voor het canonieke patroon, gecorrigeerd tijdens de Production Readiness Review).
- **Alle timestamps UTC**, tijdzone-conversie gebeurt client-side (11 § 1, BR-805).

---

## 10. Error handling

- **Uniform foutmodel** (13_API_Specificatie.md § 6) overal waar server-code een fout retourneert: `{ error: { code, message, hint, status } }`. `code` is een stabiele, machine-leesbare string (`customer_has_invoices`), `message` is de mens-gerichte NL-tekst (24 § 5), `hint` is de suggestie tot actie.
- **Nooit een kale stacktrace of technische foutcode naar de UI** — technische details (correlatie-id) staan hooguit ingeklapt onder "Details" voor support (24 § 5).
- **Fail loud in development, fail graceful in productie**: in `development` mag een onverwachte fout een duidelijke console-error + Sentry-melding geven; in productie krijgt de gebruiker altijd de menselijke variant, nooit een witte pagina.
- **Error boundaries** op route-segment-niveau (`error.tsx` in de App Router) vangen onverwachte RSC/render-fouten op; domeincomponenten falen onafhankelijk van elkaar waar mogelijk (28 § 4: "losse tegels falen onafhankelijk, geen hele-pagina-crash").
- **Providerfouten worden genormaliseerd** naar interne foutklassen in de adapter zelf (ADR-007) — domeinlogica ziet nooit een rauwe Mollie-/Mapbox-/Meta-foutcode, alleen het eigen contract (bijv. `GeocodeResult.status: 'not_found'`, 14 § 2).
- **Nooit een `catch` die een fout stil negeert.** Minimaal loggen (§ 11) + óf opnieuw gooien óf expliciet een fallback-pad kiezen dat in een commentaar wordt gemotiveerd.

---

## 11. Logging

- **Gestructureerde JSON-logs**, nooit `console.log`-vrije-tekst in server-code (NFR-701). Minimaal: `timestamp`, `level`, `correlation_id`, `company_id` (waar van toepassing), `message`, `context`.
- **Correlatie-id** wordt bij elke request/Edge Function-aanroep gegenereerd (of doorgegeven vanaf de client) en door de hele keten (Server Action → Edge Function → provider-adapter) meegedragen, zodat één gebeurtenis in de logs te herleiden is.
- **Nooit PII in logs**: geen e-mailadres, telefoonnummer, adres of factuurbedrag onversleuteld in logregels — verwijs naar het record-ID, niet naar de inhoud.
- **Log-niveaus:** `error` (actie vereist, Sentry-alert), `warn` (afwijking, geen directe actie — bv. fallback geactiveerd), `info` (belangrijke domeingebeurtenis — beurt afgerond, factuur gefinaliseerd), `debug` (alleen lokaal/development).
- **Cron-/Edge Function-jobs loggen altijd start én eind** met resultaat-samenvatting (aantal verwerkt, aantal gefaald) — een job die stil faalt zonder logregel is een monitoring-gat (NFR-703).

---

## 12. Testing-conventies

Volgt de testpiramide uit `31_Testplan.md` § 1.

- **Unit-tests** (Vitest) co-located naast de broncode: `invoice-numbering.ts` + `invoice-numbering.test.ts`. Puur domeinlogica (BR-001-datumberekening, BTW, scoring) is met fakes/geen I/O te testen — als dat niet lukt, staat er te veel logica in een component/Edge Function in plaats van in `/lib`.
- **Integratietests** draaien tegen een lokale Supabase-instantie (test-DB); dit is waar RLS-policies **verplicht negatief getest** worden per tabel (bedrijf A ziet nooit data van bedrijf B — NFR-301, 31 § 4) en waar providers worden gemockt via hun adapter-interface (ADR-007), nooit via een echte netwerkcall.
- **E2E-tests** (Playwright) heten naar hun flow-ID uit 31 § 2 (`e2e-1-onboarding.spec.ts`, `e2e-8-mollie-webhook.spec.ts`) zodat de koppeling tussen testbestand en releasegate-eis direct zichtbaar is.
- **Testdata via factories**, nooit hardcoded UUID's die per ongeluk gedeeld worden tussen tests; elke testrun krijgt een eigen tenant (31 § 7).
- **Geen `%`-dekkingsdoel als doel op zich** — dekking is een signaal, geen KPI. Wel verplicht: elke harde BR (10_BusinessRules.md) heeft minimaal één test, elke Must-NFR heeft een meetpunt (09 § 11), elke nieuwe RLS-policy heeft een negatieve test.
- **Concurrency-scenario's expliciet testen** waar de business-regel dat vereist (bijv. gelijktijdige factuurfinalisering tegen `invoice_number_counters`, § 9) — niet alleen het happy path.

---

## 13. Git commit-conventies

- **Conventional Commits**, Engelstalig (dev-facing, i.t.t. UI/domein-documentatie die Nederlands is — MASTER_PROMPT § 2): `<type>(<scope>): <onderwerp>`.
  - Types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `perf`, `style`.
  - Scope = het domein/de map (`feat(planning): ...`, `fix(invoicing): ...`).
- **Eén logische wijziging per commit.** Een commit die zowel een BR-implementatie als een ongerelateerde lint-fix bevat, wordt gesplitst.
- **Verwijs naar FR/BR/NFR/ADR-nummers in de body** waar relevant, zodat de link met de documentatie traceerbaar blijft: `Implements FR-020, respects BR-001 (ideal-date calculation).`
- **Geen `--no-verify`**, geen geskipte pre-commit hooks, tenzij expliciet met de tech lead afgestemd.
- **Nooit force-pushen naar `main`.**

---

## 14. Branch-strategie

- **Trunk-based met kortlevende branches.** `main` is altijd deploybaar (Vercel preview + productie, 35 § 2–3).
- **Branch-naamgeving:** `feature/<korte-slug>`, `fix/<korte-slug>`, `chore/<korte-slug>` — geen ticketnummer-only namen zonder context.
- **Eén PR = één sprint-scope-item** waar mogelijk (40_Implementatieplan.md-sprintstructuur); grote sprintdoelen worden in meerdere PR's opgeknipt, niet als één weekslange branch.
- **Elke PR krijgt een Vercel preview-deploy** (automatisch, 35 § 3); Lighthouse/axe-rapport en E2E-kernflows draaien hierop vóór merge.
- **`main` is beschermd**: geen directe commits, verplicht ≥1 review, alle CI-checks groen (lint, typecheck, unit, integratie, kern-E2E) vóór merge (31 § 8, 35 § 3).
- **Optionele `release`-branch** voor een staging-cutover vóór een grote V1-mijlpaal (Mollie-live, WhatsApp-live) — zie 35 § 2 en de PRR-aanbeveling om staging verplicht te maken rond die cutovers.

---

## 15. Formatter/Linter-regels

- **ESLint** (`next/core-web-vitals` + `@typescript-eslint/recommended-type-checked`) + **Prettier** voor formattering — geen handmatige format-discussies in code review, de tool beslist.
- **Tailwind class-volgorde** afgedwongen via `prettier-plugin-tailwindcss`.
- **Project-specifieke lint-regels (verplicht):**
  - Verbied import van `lib/supabase/admin.ts` buiten `/supabase/functions/**`.
  - Verbied rauwe hex-kleuren/pixelwaarden in `className`/inline-`style` buiten `/lib/design` (25 § 9, governance).
  - Verbied `console.log` in server-code buiten de logger-wrapper (§ 11).
  - Verbied `any` (behalve met `// eslint-disable-next-line` + verplichte reden-commentaar).
- **Pre-commit hook** (`lint-staged` + `husky`): lint + format op gewijzigde bestanden; **pre-push**: typecheck.
- **CI is de uiteindelijke poort** (35 § 3): een rode lint/typecheck/test = geen merge, ongeacht lokale hooks.
- **Een lint-regel uitschakelen vereist een inline-commentaar met reden** — nooit een stille `eslint-disable` zonder toelichting.

---

## 16. Security-regels

Operationalisering van `36_Security.md` op codeniveau:

- **RLS is de grens, niet de UI.** Rol-gebaseerde UI-verberging (23 § 4) is comfort, geen beveiliging — elke autorisatiecontrole wordt herhaald op database- (RLS/kolomniveau) of Edge Function-niveau.
- **Nooit vertrouwen op client-input.** Elke Server Action en Edge Function valideert zijn eigen input opnieuw met Zod, ook als de client al valideerde (36 § 6).
- **Secrets uitsluitend via omgevingsvariabelen/vault** (Vercel/Supabase), nooit in code, nooit in een commit, nooit in een log (§ 11). `.env*` staat in `.gitignore`; een secret-scan draait in CI (35 § 3, NFR-304).
- **Financiële/prijsvelden worden server-side weggelaten voor rollen zonder recht** (Medewerker/Planner, 23 P1) — via database-`select`-scoping of een aparte view, niet door het veld in de UI te verbergen terwijl de API het toch teruggeeft.
- **Webhook-signatures worden altijd geverifieerd** vóórdat de payload wordt vertrouwd (Mollie/Meta, NFR-307); bij Mollie wordt de status bovendien altijd opnieuw bij Mollie zelf opgehaald (13 § 5.1) — de webhook-body is een trigger, geen bron van waarheid.
- **Idempotentie op elke financiële/planning-mutatie** die door een retry geraakt kan worden (§ 7, webhook-handlers) — dubbele verwerking is een bug, geen edge case.
- **Dependency-scan in CI** (NFR-302); een kwetsbaarheid met beschikbare patch wordt niet "later" opgelost.
- **Rate limiting** op zware/gevoelige endpoints (auth, `route-optimize`, publieke betaalpagina) — 13 § 7.

---

## 17. Performance-regels

Operationalisering van `37_Performance.md`:

- **RSC-first, minimale client-JS** (§ 5) — dit is de belangrijkste hefboom voor NFR-101/104, geen losse "performance sprint" later.
- **Zware componenten lazy/code-split** (kaart, grafiek, RouteBoard) — nooit in de initiële bundle van een pagina die ze niet direct nodig heeft.
- **Optimistic UI is de default voor mutaties**: toon het resultaat direct, bevestig async, rollback + toast bij serverfout (24 § 2) — dit is een verplicht patroon, geen keuze per component.
- **Geen N+1-queries.** Data-ophaling in een RSC of Edge Function gebruikt PostgREST-embedding (`select=*,objects(*,customers(name))`, 13 § 3.1) of een enkele join-query, nooit een loop met losse queries per rij.
- **Paginatie is verplicht** op elke lijst-endpoint (default 50, max 200, 13 § 7) — geen "haal alles op, filter client-side" voor tenant-data die kan groeien.
- **Afbeeldingen/foto's gecomprimeerd vóór upload** (job-foto's, 20 § 3.3) en via Next.js image-optimalisatie waar toepasselijk.
- **Performance-budgetten zijn een release-gate** (37 § 6) — een PR die een budget laat regresseren (Lighthouse-CI) is net zo blokkerend als een falende test.

---

## 18. Comment-conventies

- **Standaard: geen commentaar.** Goede naamgeving en kleine functies leggen het *wat* al uit.
- **Schrijf alleen een commentaar als het de *waarom* uitlegt** die niet uit de code zelf blijkt: een niet-voor-de-hand-liggende invariant, een workaround voor een specifieke provider-bug, de reden voor een afwijking van het voor-de-hand-liggende patroon.
- **Geen commentaar die de huidige taak, fix of caller beschrijft** ("toegevoegd voor issue #123", "gebruikt door de facturatie-flow") — dat hoort in de PR-beschrijving/commit-body (§ 13), niet in de code, want het veroudert.
- **Geen uitgecommentarieerde code** in een merge — verwijderen, git-historie bewaart het.
- **JSDoc alleen op publieke adapter-interfaces** (`RoutingProvider`, `PaymentProvider`, `MessagingProvider`, `WeatherProvider`) waar het contract voor een implementator niet vanzelfsprekend is (bijv. eenheden: seconden vs. minuten) — niet op elke interne functie.
- **`// TODO` alleen met een concrete referentie** (BL-nummer uit 34_Backlog.md of een issue-link), nooit een kaal `// TODO: fix later`.

---

## 19. Import-conventies

- **Vaste volgorde, met een lege regel tussen groepen** (afgedwongen via `eslint-plugin-import`):
  1. Node/externe packages (`react`, `next/navigation`, `zod`)
  2. Interne alias-imports (`@/lib/...`, `@/components/...`, `@/types/...`)
  3. Relatieve imports binnen dezelfde map (`./JobCard.helpers`)
  4. Type-only imports apart (`import type { ... }`) onderaan hun groep
- **Altijd padaliassen (`@/...`) over meerdere mappen heen** (§ 2) — een relatieve import die meer dan één map omhoog gaat (`../../lib/...`) wordt herschreven naar een alias.
- **Geen barrel-files (`index.ts` die alles herexporteert) op laagoverstijgend niveau** — ze verbergen circulaire afhankelijkheden en vertragen tree-shaking. Een klein, lokaal barrel-bestand binnen één component-map (bv. `components/domain/RouteBoard/index.ts`) mag, een project-breed `components/index.ts` niet.
- **Geen circulaire imports** tussen `/lib`-submappen — `/lib/planning` mag `/lib/routing` importeren (ADR-010: dag-laag roept routing-engine aan), nooit andersom.
- **Provider-implementaties worden nergens rechtstreeks geïmporteerd buiten hun eigen adapter-registratie** (`lib/routing/index.ts` kiest `MapboxProvider` vs. `OsrmProvider` op config) — domeinlogica importeert altijd de interface, nooit `MapboxProvider` direct (ADR-007).

---

## Relaties met andere documenten

- **ADR-001…010**: elk hoofdstuk hierboven operationaliseert één of meer ADR's zonder ze tegen te spreken.
- **11_DatabaseConcept.md / 12_Entiteiten.md**: canonieke tabellen, kolommen en NL-EN-mapping — § 3, 9 volgen hieruit.
- **13_API_Specificatie.md**: foutmodel, idempotentie, paginatie — § 7, 10 passen dit toe op codeniveau.
- **23_Gebruikersrollen.md / 36_Security.md**: autorisatie- en security-eisen — § 16.
- **25_DesignSystem.md / 26_ComponentLibrary.md**: tokens en componentlagen — § 4.
- **31_Testplan.md**: testpiramide en releasegate — § 12.
- **35_Deployment.md**: CI/CD, migraties — § 9, 14, 15.
- **37_Performance.md**: budgetten — § 17.
- **40_Implementatieplan.md**: sprintstructuur en repo-skelet — § 1.

---

## Changelog

| Datum | Versie | Wijziging |
|---|---|---|
| 2026-07-08 | 1.0 | Eerste versie: volledige coding standards voor Sprint 1 — bestandsstructuur, TypeScript, naming, componenten, RSC/Client Components/Server Actions, Supabase- en SQL-conventies, error handling, logging, testing, git/branch-strategie, formatter/linter, security- en performance-regels, comment- en import-conventies. Documentatiefase hiermee definitief gesloten. |
