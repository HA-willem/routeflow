# 40 — Implementatieplan (Sprint 1–11)

**Status:** DONE
**Versie:** 1.15
**Bron van waarheid:** `00_PRD.md` (scope § 5, architectuur § 12) + 33_Roadmap.md — dit document mag het PRD niet tegenspreken.
**Werkinstructie:** zie `MASTER_PROMPT.md`. **Let op:** dit is een *plan*; er wordt in de documentatiefase nog **niets** gebouwd (CLAUDE.md).
**Relaties:** 08_FunctioneleEisen.md (FR), 10_BusinessRules.md (BR), 11_DatabaseConcept.md (tabellen), 12_Entiteiten.md, 13_API_Specificatie.md, 14_RoutingEngine.md, 15_AIPlanner.md, 26_ComponentLibrary.md, 31_Testplan.md, 33_Roadmap.md, `docs/adr/ADR-011-human-in-the-loop-ai.md` en `43_AI_Agents.md` (agent-architectuur relevant voor Sprint 7), `docs/adr/ADR-013-platform-admin-product-agent.md` en `46_PlatformAdmin.md` (Sprint 11).

---

## Doel & uitgangspunten

Dit document verdeelt de bouw van ServOps in **10 sprints** (indicatief ~2 weken elk) en geeft per sprint: **doelen**, **bestanden**, **database-migraties**, **componenten** en **testcases**. Het volgt de fasering uit 33_Roadmap.md:

| Sprints | Fase | Mijlpaal |
|---|---|---|
| 1–5 | **MVP** | Glazenwasser gooit wijkboekje weg (planning + uitvoering + e-mailfactuur) |
| 6–9 | **V1** | Commercieel product (Mollie, AI-herplan, WhatsApp, PWA+) |
| 10 | **V1-hardening → V2-prep** | Kwaliteit, schaal, security, rapportage |

**Sprint 11 valt buiten deze fase-tabel:** Platform Admin & Product Agent (ADR-013, `46_PlatformAdmin.md`) is platform-tooling voor de platform-eigenaar, geen klant-gerichte MVP/V1/V2-functionaliteit (PRD § 5.2/§ 19 A-23) — vergelijkbaar met hoe `41_CodingStandards.md` ook geen fase heeft. Niet tijdgebonden aan "na Sprint 10"; kan parallel of op elk moment na Sprint 1 (fundament/auth) ingepland worden, in overleg met de platform-eigenaar.

**Volgorde-principe:** fundament vóór features; niets uit een latere fase vervroegen (MASTER_PROMPT § 3). Elke sprint eindigt met groene tests (31) en een demo.

**Technische conventies (vast):** Next.js App Router (RSC), Supabase (PostgreSQL + RLS + Edge Functions + Storage + Realtime), Vercel, Tailwind + design tokens (25), provider-adapters (Mapbox/Mollie/360dialog/weer). Migraties: versioned SQL in `/supabase/migrations`, expand/contract (35 § 4). RLS-policy hoort bij de migratie van elke tabel.

**Bestandsconventie (repo-skelet):**
```
/app            Next.js routes (desktop + /m PWA)
/components     UI (primitieven, samengesteld, domein) — 26
/lib           adapters, domeinlogica, supabase-clients
/supabase/migrations   SQL-migraties
/supabase/functions    Edge Functions (planning, routing, facturen, webhooks)
/tests         unit / integratie / e2e
```

---

## Sprint 1 — Fundament, tenancy & auth

### Doelen
- Werkend app-skelet (Next.js + Supabase + Vercel CI/CD).
- Multi-tenancy via RLS op `company_id` (NFR-301); auth (22).
- Design tokens + basis-componentbibliotheek (25/26).
- Onboarding-stap 1 (bedrijf aanmaken, FR-100/101 begin).

### Bestanden
- `/lib/supabase/{client,server}.ts` — Supabase-clients (browser/RSC).
- `/lib/auth/*` — sessie, rol-guards.
- `/app/(auth)/login`, `/wachtwoord-vergeten`, `/uitnodiging/[token]`.
- `/app/(app)/layout.tsx` — app-shell, zijbalk (30).
- `/lib/design/tokens.css`, `tailwind.config.ts` — tokens (25).
- `/.github/workflows/ci.yml`, Vercel-config (35).

### Database-migraties
- `001_init_extensions.sql` — `postgis`, `uuid-ossp`, `pgcrypto`.
- `002_companies_users.sql` — `companies`, `users` (11 § 3.1) + `current_company_id()`.
- `003_rls_baseline.sql` — RLS aan + policies op `companies`/`users`.

### Componenten
Button, IconButton, Input, Select, Checkbox/Switch, Modal, Toast, Skeleton, EmptyState, PageHeader, AppSidebar (26 primitieven).

### Testcases
- Unit: `current_company_id()`, rol-guards.
- Integratie: **RLS-baseline** — bedrijf A ziet bedrijf B niet (NFR-301, 31 § 4).
- E2E: signup → login → bedrijf aanmaken (deel E2E-1).
- NFR: Lighthouse-baseline op login/shell (NFR-101).

---

## Sprint 2 — Klanten, objecten, diensten & geocoding

### Doelen
- CRUD Klanten/Objecten/Diensten (FR-001/002/003, FR-100 diensten).
- Mapbox geocoding-adapter (A-06, 14 § 5); handmatige pin-fallback (BR-800).
- Globale ⌘K-zoek basis (FR-008).

### Bestanden
- `/lib/routing/provider.ts` (interface) + `/lib/routing/mapbox.ts` (14 § 2).
- `/app/(app)/klanten/**`, `/app/(app)/instellingen/diensten/**`.
- `/components/domain/{CustomerForm,ObjectForm,ServiceForm,MapView}.tsx`.
- `/components/CommandPalette.tsx`.

### Database-migraties
- `004_customers.sql` — `customers` + RLS + unique(email per company).
- `005_objects.sql` — `objects` + GiST-index op `location` + `location_status`.
- `006_services.sql` — `services` + RLS.

### Componenten
DataTable, FilterBar, Form, Tabs, MapView (Mapbox + attributie), Combobox, CommandPalette.

### Testcases
- Unit: postcode-validatie (`^[A-Z]{2}\d{2}\s?[A-Z]{2}$`), NL-nummer.
- Integratie: geocoding-adapter (mock) → ok/ambiguous/not_found (14 RE-01/02).
- E2E: klant + object aanmaken met geocoding; handmatige pin.
- BR: BR-040 (klant met facturen niet verwijderen — voorbereidend, negatieve test volgt bij facturen).

---

## Sprint 3 — Dienstafspraken, prijzen & automatische beurt-generatie

### Doelen
- Dienstafspraken met frequentie/prijs/voorkeuren/flexvenster (FR-004/005).
- Prijsafspraken (18): per beurt, uurtarief (abonnement V1).
- Horizon-laag: automatische `voorgesteld`-beurten 12 weken (FR-020, 15 § 1.1, BR-001).

### Bestanden
- `/lib/planning/horizon.ts` — ideale-datumberekening (BR-001), venster (BR-101).
- `/supabase/functions/planning-generate/` — Edge Function (FR-020, 13 § 4).
- `/app/(app)/klanten/[id]/objecten/[objectId]/**` — dienstafspraak-tab.
- `/components/domain/{ServiceAgreementForm,PricingForm}.tsx`.

### Database-migraties
- `007_pricings.sql` — `pricings` (11 § 3.8).
- `008_service_agreements.sql` — `service_agreements` + FK's + unique(object,service).
- `009_jobs.sql` — `jobs` incl. status-enum `(...,invoiced,...)` (11/12), indexen (company_id, scheduled_date).

### Componenten
ServiceAgreementForm, PricingForm, StatusBadge (statuskleuren 25 § 1.2), WhyExplanation (basis).

### Testcases
- Unit: **BR-001** ideale datum = laatste `uitgevoerd` + interval; frequentie-varianten (BR-102/103).
- Integratie: `planning-generate` produceert juiste `voorgesteld`-beurten.
- BR: BR-030 (pauzeren annuleert toekomstige niet-vergrendelde beurten, FR-005).
- E2E: dienstafspraak aanmaken → eerste beurt verschijnt (E2E-2).

---

## Sprint 4 — Routing-engine, dag-laag & planning-board

### Doelen
- Afstandsmatrix (Mapbox) + `distance_cache` (14 § 3).
- Dag-laag: verdeling + nearest-neighbor + tijden (15 § 1.2, 14 § 4–5).
- RouteBoard met drag-and-drop + live herberekening (FR-021/022), vergrendelen (FR-026, BR-200).

### Bestanden
- `/lib/routing/matrix.ts` (tegeling/cache), `/lib/routing/optimize.ts` (nearest-neighbor + 2-opt).
- `/supabase/functions/route-optimize/`, `/route-move-job/` (13 § 4).
- `/app/(app)/planning/**` (week/dag/kaart).
- `/components/domain/{RouteBoard,JobCard,RouteStopList}.tsx`.

### Database-migraties
- `010_routes.sql` — `routes` + unique(company,employee,date).
- `011_distance_cache.sql` — `distance_cache` (PK from,to,provider; TTL-logica in app).
- `012_employees_availability.sql` — `employees`, `availability` (nodig voor dag-laag).

### Componenten
RouteBoard (drag-and-drop), JobCard (sleepbaar/anker bij locked), RouteStopList, capaciteitsindicator.

### Testcases
- Unit: nearest-neighbor volgorde; tijdberekening; matrix-tegeling (14 § 3.3).
- Integratie: `route-optimize` < 3s/60 stops (NFR-103); cache-hit gedrag.
- BR: **BR-200** vergrendelde beurt verplaatst niet; **BR-202** > 8,5u geweigerd; BR-203 dubbele afspraak.
- E2E: weekplanning + drag-and-drop + undo (E2E-3/4).

**Sprint 4-vervolg (nog te plannen):** FR-029, handmatige beurt-toevoeging op dag/tijdstip (PRD § 19 A-27, 2026-07-18) — ontdekt als gat ná Sprint 7-vervolg: RouteBoard ondersteunt verplaatsen (FR-021/022) en genereren via dienstafspraken (FR-020), maar geen directe "voeg beurt toe op dag X, tijdstip Y"-actie voor klanten met een harde dag/tijdstip-beperking (relevant voor verticalen buiten glazenwassers, § 5 principe 5). Hergebruikt bestaand `locked`-mechanisme (FR-026); geen nieuwe migratie verwacht. Direct gebouwd (2026-07-19): `lib/validation/manual-job.ts`, `app/(app)/planning/actions.ts` (`getCustomerObjectsForJob`/`addManualJob`), `components/domain/RouteBoard/AddJobDialog.tsx`.

Ook toegevoegd aan Sprint 4-vervolg: FR-030, "Vul de dag" (PRD § 19 A-28, 2026-07-19) — spiegelbeeld van FR-024 (Replanning Agent): capaciteit-*winst* i.p.v. -verlies, met name relevant voor de eenmanszaak-weekweergave. Voorstel-ter-goedkeuring (ADR-011), geen automatische invulling. Geeft `availability.status='available'` voor het eerst een echt schrijfpad.

---

## Sprint 5 — PWA-uitvoering, MVP-facturatie (e-mail) & dashboard → **MVP-release**

### Doelen
- PWA-medewerker: dagroute, navigatie, afvinken (FR-040/041/042, 29).
- Conceptfactuur bij `uitgevoerd`, NL-BTW, nummering, PDF, e-mailverzending (FR-060/061/062/064-email, BR-020).
- Dashboard basis (FR-102) + onboarding compleet (FR-101).

### Bestanden
- `/app/m/**` — PWA (dagroute, beurt-detail), `manifest.webmanifest`, service worker (20).
- `/supabase/functions/invoice-finalize/` (nummering, PDF, e-mail).
- `/lib/invoicing/{vat.ts,numbering.ts,pdf.ts}`, `/lib/email/resend.ts`.
- `/app/(app)/facturen/**`, `/app/(app)/(dashboard)/page.tsx`.
- `/components/domain/{CompleteJobSheet,InvoicePreview,KPICard}.tsx`.

### Database-migraties
- `013_invoices.sql` — `invoices` + `invoice_lines` (11 § 3.6), gap-loze nummering-constraint (BR-020).
- `014_products.sql` — `products` (losse factuurposten, 17 § 2).
- `015_job_photos_storage.sql` — Storage-bucket + policies (voorbereiding foto's).

### Componenten
CompleteJobSheet, InvoicePreview (PDF-layout), KPICard, dashboard-banners, PWA JobCard/RouteStopList (mobiele varianten).

### Testcases
- Unit: **BTW** 21/9/0/verlegd; **BR-020** gap-loze nummering + immutabiliteit; **BR-010** gefactureerd alleen vanuit uitgevoerd.
- Integratie: `invoice-finalize` → PDF + e-mail (mock Resend).
- E2E: PWA route → afvinken → conceptfactuur → finaliseren → e-mail (E2E-5/7); onboarding < 15 min (E2E-1, AC-101).
- NFR: PWA TTI/tap-targets (NFR-604), Lighthouse.
- **Release-gate MVP** (31 § 9).

---

## Sprint 6 — Betalingen (Mollie), herinneringen & niet-thuis

### Doelen
- Betaallink + QR (iDEAL/Mollie), webhook-statusupdate (FR-063/067, BR-400).
- Automatische herinneringen +7/+14/+21 (FR-065, BR-401/402).
- Niet-thuis-flow met wachtrij (FR-043, BR-015).

### Bestanden
- `/lib/payments/provider.ts` + `/lib/payments/mollie.ts` (adapter).
- `/supabase/functions/webhooks/mollie/` (signature-verify, idempotent — NFR-307).
- `/supabase/functions/reminders-cron/` (pg_cron dagelijks).
- `/app/pay/[paymentId]/**` — mobiele betaalpagina.

### Database-migraties
- `016_payments.sql` — `payments` (11 § 3.6) + webhook_verified.
- `017_reminders.sql` — `reminders` + schema-velden op company.config.
- `018_jobs_not_home_queue.sql` — herplan-wachtrij-velden/indexen.

### Componenten
BetaalpaginaMobiel, herinneringsstatus op InvoicePreview, wachtrij-lijst (JobCard).

### Testcases
- Integratie: **Mollie-webhook** → status `betaald` (BR-400); ongeldige signature afgewezen; idempotent (E2E-8).
- Unit: herinnering-trigger-logica (BR-401); overschot/dubbele betaling (BR-403).
- BR: **BR-015** niet-thuis telt niet mee, naar wachtrij (E2E-6).
- E2E: betaling sandbox → bevestiging; herinneringsschema (E2E-9).

---

## Sprint 7 — "AI wordt echt": Execution Pipeline + Capacity/Optimization/Weather Agent

**Architectuurcontext (ADR-011/ADR-012, `43_AI_Agents.md`):** een strategische review (PRD § 19 A-22, 2026-07-13) paste de oorspronkelijk hier geplande scope (Replanning/Weather/Capacity Agent) aan vóórdat gebouwd werd. **Gebouwd:** de gedeelde Execution Pipeline (ADR-012 § 2: Conflict Detector/Suggestion Generator/Explanation Generator/Approval Handler, als herbruikbare `lib/agents/`-modules — niet per-agent gedupliceerd), de Agent Orchestrator (ADR-012 § 1), en drie agents: **Capacity Agent** (43 § 9, nieuw, geen externe afhankelijkheid), **Optimization Agent** (43 § 11, formaliseert de bestaande `route-optimize`-Edge-Function met een nieuwe `dry_run`-modus, geen nieuwe optimalisatielogica), **Weather Agent** (43 § 6, nieuw, `WeatherProvider`-adapter op Open-Meteo). **Bewust vervangen/uitgesteld:** de Replanning Agent (43 § 5, reactieve laag/herplan-diff bij ziekte/verlof) is naar een vervolgsprint verschoven — te groot (event-driven trigger, multi-job-diff-UI, BR-802-wiring) om naast de pipeline-bouw en drie andere agents in één sprint te passen zonder kwaliteit te verliezen; zie "Sprint 7-vervolg" hieronder. Geografische clustering (FR-025) is eveneens uitgesteld — hoort logisch bij de Planning Agent-formalisering, niet bij deze drie.

### Doelen (gerealiseerd)
- Weerslaag met drempels (FR-023, 15 § 6) — als Weather Agent-voorstel (informatief; het daadwerkelijk herplannen van geraakte beurten is Replanning Agent-scope, hieronder).
- Capaciteitswaarschuwing (FR-027) — als Capacity Agent-voorstel, 7 dagen vooruit.
- Route-optimalisatie als proactief agent-voorstel i.p.v. alleen een handmatige knop (Optimization Agent, hergebruikt Sprint 4).
- Confidence/bronnen/alternatieven-outputcontract (BR-703) — eenmalig in de gedeelde Explanation Generator, niet per agent herhaald.
- Morning Briefing (FR-900, UI al gebouwd vóór dit sprint, PRD § 19 A-21) toont voor deze drie voorstel-types geen "Voorbeeldweergave" meer zodra de agent-cyclus voor een bedrijf gedraaid heeft.

### Bestanden
- `/lib/agents/{types,conflict-detector,suggestion-generator,explanation-generator,approval-handler,capacity,optimization}.ts` — gedeelde pipeline + agent-domeinlogica, puur/getest.
- `/lib/weather/{types,thresholds,candidates,cache,open-meteo-provider}.ts` — Weather Agent-domeinlogica + provider-adapter (ADR-007).
- `/supabase/functions/{agent-orchestrator,agent-capacity,agent-optimization,agent-weather}/index.ts` — dunne Edge-Function-wrappers, service-rol-only (nachtcyclus heeft geen ingelogde gebruiker).
- `/supabase/functions/route-optimize/index.ts` — uitgebreid met optioneel `dry_run`-veld + service-rol-auth-pad (uitsluitend i.c.m. `dry_run:true`); bestaand gedrag ongewijzigd.
- `/app/(app)/briefing-actions.ts` — `decideProposal`-Server-Action (BR-702-goedkeuringspad).
- `/lib/briefing/get-briefing.ts` — vervangt `buildDemoProposals` door een echte `agent_proposals`-query zodra er vandaag een succesvolle agent-run is; `WeatherTimeline` blijft voorbeeldweergave (zie A-22 punt 4).

### Database-migraties
- `022_agent_pipeline.sql` — `agent_runs`/`agent_proposals` (ADR-012 § 6/§ 8-schema) + `decide_agent_proposal()`-RPC (BR-702, state-transition-guard) + kolomgrendel-trigger (alleen `approval_status`/`decided_by`/`decided_at` wijzigbaar door een gebruiker).
- `023_weerdata_cache.sql` — exact het al-gespecificeerde schema uit 11_DatabaseConcept.md § 3.9.
- `024_agent_service_role_reads.sql` — ontbrekende service-rol-leesrechten op `companies`/`employees`/`availability`/`jobs`/`routes`/`service_agreements`/`services` (`auto_expose_new_tables` staat uit, PRD § 19 A-22 punt 6).

*(De hier oorspronkelijk geplande nummers `019`–`021` zijn niet meer beschikbaar — Sprint 5 gebruikte die al; zie PRD § 19 A-22 punt 5.)*

### Componenten
Geen nieuwe UI-componenten — de Morning Briefing-UI (`components/domain/briefing/*`, PRD § 19 A-21) consumeert de echte `agent_proposals`-data via exact dezelfde `AgentProposal`-shape die al vóór dit sprint bestond.

### Testcases
- Unit (47 nieuw): Conflict Detector (BR-200/tenant-defense/confidence-schema), Explanation Generator (schema-volledigheid), Approval Handler (ADR-012 § 7-beslisboom incl. confidence-drempel), Capacity Agent (drempellogica + per-kandidaat-datumkoppeling), Weather-drempels (15 § 6.3 exacte grenswaarden) + kandidaatgeneratie, Optimization-kandidaatgeneratie (besparingsdrempel).
- Integratie (8 nieuw, `tests/integration/agent-pipeline-rls.test.ts`): RLS-tenant-isolatie op `agent_runs`/`agent_proposals`, rechtenmatrix (Administratie geen toegang), `decide_agent_proposal()` (goedkeuren, dubbele-beslissing-guard, ongeldige status), kolomgrendel-trigger (rechtstreekse PATCH op `confidence` geweigerd).
- Lokale end-to-end-verificatie (niet geautomatiseerd, handmatig via `supabase functions serve` + browser): orchestrator → echte capaciteitswaarschuwing → Morning Briefing zonder "Voorbeeldweergave" → "Waarom?"-uitklap → accepteren → `decide_agent_proposal` → toast + verdwijnt uit de briefing. Bestaande Sprint 4/5-regressie bevestigd (golden-path-E2E, handmatige "optimaliseren"-knop).

---

## Sprint 7-vervolg — Replanning + Planning + Invoice Agent + geografische clustering (✅ alle vier gebouwd)

Expliciet uitgesteld tijdens Sprint 7 (PRD § 19 A-22), niet vergeten:

- **Replanning Agent** (43 § 5) — ✅ **gebouwd en live geverifieerd** (2026-07-14, `HANDMATIGE_ACCEPTATIETEST_2026-07-13.md` TC-7.x): reactieve laag, herplan-diff bij ziekte/verlof (BR-802) via de nieuwe multi-job-diff-UI (`ReplanDiff`, `components/domain/briefing/ReplanDiff.tsx`), event-driven trigger-wiring (`reportSickLeave`-Server-Action → `agent-replanning`-Edge-Function, buiten de dagcyclus om, ADR-012 § 1), stabiliteitsgewogen bin-packing-algoritme (15 § 7.3, `lib/agents/replanning.ts`). Scope bewust beperkt tot ziekmelding/verlof van één medewerker op één dag; spoedopdracht/niet-thuis/weersgedreven herplanning volgen dezelfde vorm in een latere sprint.
- **Planning Agent** (43 § 4) — ✅ **gebouwd en live geverifieerd** (2026-07-16, `HANDMATIGE_ACCEPTATIETEST_2026-07-13.md` TC-8.x): formaliseert de bestaande horizon-laag (`lib/planning/horizon.ts`/`planning-generate`, Sprint 3) tot agent — `planning-generate` kreeg een service-rol-pad met verplichte `company_id`-filter (RLS wordt bij service-rol volledig omzeild, dus expliciete filtering is de enige tenant-grens op dit pad) plus een fix zodat alleen daadwerkelijk-nieuw-ingevoegde beurten gerapporteerd worden (`ON CONFLICT DO NOTHING RETURNING *` i.p.v. het berekende, mogelijk-al-bestaande aantal — voorkomt dat de Briefing elke nacht hetzelfde aantal "nieuwe" beurten blijft melden). Nieuwe `agent-planning`-Edge-Function bouwt een informatieve kandidaat (`lib/agents/planning.ts`, geen `payload` — het aanmaken van `voorgesteld`-beurten is zelf al de door ADR-011 § 4 toegestane autonome actie), draait als eerste stap in `agent-orchestrator` (vóór Weather/Optimization/Capacity, die moeten weten welke beurten er zijn). "Medewerker-toewijzing per dag" bewust niet gedupliceerd — blijft bij Optimization Agent (43 § 4-implementatienotitie).
- **Invoice Agent** (43 § 8) — ✅ **gebouwd en live geverifieerd** (2026-07-16, `HANDMATIGE_ACCEPTATIETEST_2026-07-13.md` TC-9.x). Bij de bouw bleek conceptfactuur-aanmaak zelf al volledig geïmplementeerd (`complete_job()`, 020_job_completion.sql, Sprint 5) — geen nieuwe aanmaaklogica nodig. De agent (`agent-invoice`, `lib/agents/invoice.ts`) signaleert uitsluitend openstaande conceptfacturen (`status = 'draft'`) als persistente Briefing-waarschuwing (severity schaalt naar `urgent` vanaf 3 dagen oud), analoog aan Capacity Agent. BR-702 blijft ongewijzigd: versturen is en blijft een losse, menselijke actie (bestaande `sendInvoice`-Server-Action) — geen `payload`, geen goedkeuringsstap.
- **Geografische clustering** (FR-025, BR-204) — ✅ **gebouwd** (2026-07-18): `lib/planning/clustering.ts` (puur, hergebruikt `lib/routing/haversine.ts` i.p.v. een aparte PostGIS-query) laat `planning-generate` een nieuw te genereren datumreeks aansluiten op een al-bestaande beurt van een ándere dienstafspraak binnen 1km, mits dat binnen het bestaande flexibiliteitsvenster (BR-101) past — nooit door bestaande beurten te verplaatsen, alleen door nieuw te plannen datums te kiezen. Zichtbaar als extra zin in de bestaande Planning Agent-Briefing-samenvatting (`lib/agents/planning.ts`), geen nieuwe UI. **Bewust niet meegenomen:** FR-025 AC2/AC4 (gewogen scoringsmodel + instelbare slider) — dat bestaat voor geen van de 4 BR-701-criteria en is losstaand, groter vervolgwerk (zie `08_FunctioneleEisen.md` FR-025-changelog).
- **Organizational Memory-leeskant** (`45_AgentMemory.md`): Sprint 7 legt alleen het schrijfpad van impliciete waarnemingen vast (PRD § 19 A-22 punt 7); agents gebruiken geleerde voorkeuren nog niet als input.

---

## Sprint 8 — Communicatie: WhatsApp (360dialog), notificaties & templates

### Doelen
- 360dialog/Cloud API messaging-adapter (A-08, 19 § 2).
- Externe berichten (aankondiging/niet-thuis/factuur/herinnering/bevestiging) + templates (FR-080/081/064-WhatsApp).
- Interne notificatie-inbox + web-push (FR-082, 21).

### Bestanden
- `/lib/messaging/provider.ts` + `/lib/messaging/threesixtydialog.ts` + `/email` fallback (19 § 8).
- `/supabase/functions/notify-send/`, `/webhooks/whatsapp/` (inbound, idempotent).
- `/supabase/functions/announce-cron/` (T-1 18:00, FR-080).
- `/app/(app)/instellingen/berichttemplates/**`, notificatie-inbox in shell.

### Database-migraties
- `022_notifications.sql` — `notifications` (11 § 3.7) + kanaal/status.
- `023_messages.sql` — `messages` (WhatsApp/e-mail-log, opt-in-audit BR-600).
- `024_notification_templates.sql` — templates + Meta-statusvelden (19 § 4).

### Componenten
NotificationInbox, TemplateEditor (variabelen {{...}}), kanaalvoorkeuren, WeatherBanner→notificatie-koppeling.

### Testcases
- Unit: template-rendering + variabelen (BR-602); kanaalkeuze-logica (21 § 1).
- Integratie: WhatsApp verzenden (mock) → fallback e-mail (WA-E1/E2); **BR-600** geen opt-in = geen WhatsApp; webhook idempotent.
- E2E: aankondiging-cron → klant ontvangt bericht (AC-080); niet-thuis → automatisch bericht.

---

## Sprint 9 — PWA+ & facturatie+ → **V1-release** (✅ afgerond, m.u.v. release-gate)

### Doelen
- ✅ Foto's (voor/na) + offline-tolerantie/retry-queue (FR-044/045, 20 § 3) — al eerder gebouwd (Sprint 5, `018_job_photos.sql`, `lib/pwa/offline-queue.ts`) en donkere modus (25 § 7, `lib/design/tokens.css`) — beide vóór dit sprint al aanwezig.
- ✅ CSV-import klanten/objecten (FR-006), klant-tijdlijn (FR-007, bewust verkleinde scope — zie PRD § 19 A-29).
- ✅ Abonnementsfacturatie (FR-066, BR-304), creditfacturen (FR-068).

### Bestanden
- `/lib/import/csv.ts` (mapping/validatie/geocoding-batch), `/components/domain/CsvImportWizard.tsx`, `/app/(app)/klanten/importeren/**`.
- `/components/domain/CustomerTimeline.tsx` (client-side filter — zie A-29, geen query-param i.v.m. de al-bestaande ongecontroleerde Tabs).
- `/components/domain/CreditInvoiceDialog.tsx`, `/app/(app)/facturen/[id]/page.tsx` (nieuwe factuur-detailpagina).
- Geen nieuwe Edge Functions: abonnementsfacturatie is een pure DB-cron (`generate_subscription_invoices()`, `SECURITY DEFINER` + `pg_cron`), net als `complete_job()` — geen externe aanroep nodig zoals bij de agent-orchestrator.

### Database-migraties
*(volgnummer bij daadwerkelijke bouw bleek `034`–`036`, niet de hier oorspronkelijk geplande `025`–`027` — die waren al bezet door Sprint 7/7-vervolg/11, zelfde migratienummer-drift als eerder bij Sprint 7 opgetreden, PRD § 19 A-22 punt 5.)*
- `034_subscription_billing.sql` — patcht `complete_job()` (subscription-beurt maakt geen eigen conceptfactuur meer aan) + nieuwe `subscription_invoice_periods`-tabel (idempotentie) + `generate_subscription_invoices()` + `pg_cron`-schedule.
- `035_invoice_credit_notes.sql` — `invoices.parent_invoice_id` + aangepaste check-constraints (credit = negatief totaal) + `create_credit_invoice()`.
- `036_import_jobs.sql` — `import_jobs` (rapportagelog, geen staging-tabel voor ruwe CSV-rijen).

### Componenten
CsvImportWizard, CustomerTimeline, CreditInvoiceDialog, factuur-detailpagina (nieuw — bestond nog niet, alleen een lijst).

### Testcases
- Unit: `lib/import/csv.test.ts` (mapping/validatie/foutrapport, incl. dat een geocode-fout waarschuwt maar niet blokkeert); `lib/validation/service-agreement.test.ts` uitgebreid met het subscription-pad.
- SQL-businesslogica (abonnement-overage-berekening, credit-koppeling) is — net als `complete_job()`'s bestaande pricing-logica — niet in Vitest getest (geen pgTAP-precedent in deze repo); lokaal geverifieerd via directe RPC-aanroepen tegen de lokale Supabase-instantie tijdens de bouw.
- E2E: import-flow (upload → mapping → rapport → klant zichtbaar) en creditfactuur-flow (verzonden factuur → correctie → nieuwe creditfactuur + saldo).
- **Release-gate V1** (31 § 9) incl. security ASVS L2, AVG-DPA's, PITR: **niet in deze afronding meegenomen** — overlapt inhoudelijk met Sprint 10 (Hardening/rapportage/security) en wordt daar behandeld, niet gedupliceerd.

---

## Sprint 10 — Hardening, rapportage, schaal & security → **V1-hardening / V2-prep** (✅ code-bouwbare deel afgerond)

**Scope-toelichting (PRD § 19 A-30):** deze sprint mengt echte codewerk met operationele/audit-activiteiten (pentest, PITR-restore-executie, load-test-executie tegen een niet-bestaande staging-omgeving) die geen agent-bouwtaak zijn. Het codewerk hieronder is afgerond; de vijf operationele items staan expliciet als "bewust niet gedaan" geregistreerd, niet stilzwijgend overgeslagen.

### Doelen
- ✅ Rapportage (omzet/route/productiviteit), WCAG 2.1 AA-pas (NFR-601/602/603) op de kernpagina's. Donkere-modus bestond al (zie Sprint 9-notitie).
- ✅ Observability-basis (Sentry, cron-zichtbaarheid in Platform Admin). Geen statuspagina (productbeslissing, uitgesteld).
- ✅ RLS-negatieve-testsuite aangevuld (`invoices`/`invoice_lines`/`pricings`/Sprint 9-tabellen).
- ✅ V2-voorbereiding: correctie-logging (schrijfpad, `moved`/`rejected_proposal`).
- ⏸ Niet gedaan: load-test-*executie* (wél scriptskeleton), ASVS L2-pentest, PITR-hersteltest-executie, statuspagina, OSRM-fallback-spike, `audit_log` (optioneel V2, bleef open).

### Bestanden
- `/app/(app)/rapportage/page.tsx`, `/lib/analytics/reporting.ts`, `/components/composed/DateRangePicker.tsx`, `/components/domain/reporting/*` (RevenueChart, RevenueExportButton).
- `instrumentation.ts`/`instrumentation-client.ts` (Sentry, inert zonder DSN), `/components/domain/platform-admin/CronStatusOverview.tsx`.
- `/tests/a11y/key-pages.spec.ts` (axe), `/tests/load/README.md` + `lt1-planning-query.js` (skeleton, niet uitgevoerd), `/tests/integration/pricings-rls.test.ts` + `sprint9-invoicing-rls.test.ts`.

### Database-migraties
*(volgnummer bij bouw: `037`–`039`, niet de hier oorspronkelijk geplande `028`–`030` — zelfde migratienummer-drift-precedent als eerdere sprints.)*
- `037_reporting_indexes.sql` — indexen voor datumbereik-gefilterde rapportage-queries (geen materialized views, PRD § 19 A-30).
- `038_correction_log.sql` — planner-correcties loggen (15 § 10, V2-voorbereiding, alleen schrijfpad).
- `039_cron_job_status.sql` — `get_cron_job_status()`, ontsluit `cron.job_run_details` voor het Platform Admin-portal.
- `029_audit_log.sql` (audit-trail met triggers) **niet gebouwd** — optioneel V2, blijft open.

### Componenten
RevenueChart (handgerolde SVG, dataviz-skill), RevenueExportButton (CSV), DateRangePicker, CronStatusOverview (Platform Admin).

### Testcases
- Unit: `lib/analytics/reporting.test.ts`.
- A11y: `tests/a11y/key-pages.spec.ts` (axe, wcag2a/wcag2aa/wcag21aa) tegen Vandaag/Klanten/Klant-detail/Planning/Facturen/Rapportage — groen.
- Security: RLS-negatieve suite aangevuld (pricings, invoices/invoice_lines + `create_credit_invoice()`-cross-tenant-check, subscription_invoice_periods, import_jobs) — groen. Dependency-/secret-scan, webhook-integriteit: niet dit sprint (buiten code-bouwbare scope).
- Regressie: volledige E2E-suite (11 specs) + integratiesuite (12 bestanden) groen; `npm run build` geverifieerd met Sentry-wrapper zonder DSN/auth-token (geen build-fout).
- **Niet uitgevoerd**: load LT-1…5 (NFR-503/504), PITR-hersteltest (NFR-803), Lighthouse — zie "Bewust niet gedaan" hierboven.

---

## Sprint 11 — Platform Admin & Product Agent (fundament)

**Architectuurcontext (ADR-013, `46_PlatformAdmin.md`, PRD § 19 A-23):** dit sprint bouwt uitsluitend het **fundament** — platform-admin-autorisatie, tenant-zijde feature-request-indiening, en het Platform Admin-portal met **alleen handmatige** goedkeuring. De geautomatiseerde Product Agent-triage zelf (FR-951, geplande agent-run die PR's opent) is bewust uitgesteld naar "Sprint 11-vervolg" hieronder — zelfde motivatie als de Replanning Agent-deferral in Sprint 7 (PRD § 19 A-22): eerst het fundament bewijzen (RLS-scheiding, portal, handmatige flow) vóórdat een agent zelfstandig code-PR's mag openen.

**Migratienummers:** de volgende drie migraties gebruiken het eerstvolgende vrije nummer **op het moment van bouwen** — niet hier vast vooringevuld. Reden: Sprint 7/7-vervolg heeft al aangetoond dat geplande nummers in dit document verschuiven zodra sprints in een andere volgorde gebouwd worden dan hier gepland (PRD § 19 A-22 punt 5); controleer `/supabase/migrations` op het hoogst bestaande nummer vóór het aanmaken van deze drie.

### Doelen
- Platform-admin-allowlist + autorisatiegrens, orthogonaal aan tenant-RLS (BR-900, 46 § 1.1).
- Tenant-zijde: feature request indienen + eigen-status-overzicht (FR-950).
- Platform Admin-portal: cross-tenant operationeel overzicht (FR-953) + voorstellenlijst met **handmatige** goedkeuringsactie (FR-952) — "goedkeuren" registreert alleen dat een PR gemerged mag worden, de merge blijft een losse git-actie (BR-901).
- Nog **niet** in dit sprint: de geplande Product Agent-run die zelf PR's opent (FR-951) — zie Sprint 11-vervolg.

### Bestanden
- `/lib/platform-admin/{guard,queries}.ts` — allowlist-check (los van `/lib/auth/*`-rolmodel), cross-tenant read-queries.
- `/app/admin/**` — eigen routegroep, buiten `(app)`, eigen layout/guard (46 § 1.2). URL is `/admin`; interne module-mappen (`lib/platform-admin/`, `components/domain/platform-admin/`) behielden hun naam bij de URL-verkorting (2026-07-17).
- `/app/(app)/instellingen/feature-requests/**` — indienformulier + eigen-status-lijst (FR-950).
- `/components/domain/platform-admin/{ProposalCard,OperationalOverview}.tsx` — hergebruikt het bestaande `WhyExplanation`-patroon (26 § 4) voor het voorstel-contract (BR-903).
- `/components/domain/{FeatureRequestForm,FeatureRequestList}.tsx` — tenant-zijde.

### Database-migraties
- `platform_admins` — `user_id` (PK), geen `company_id`; RLS: uitsluitend leesbaar door zichzelf via de app-laag, schrijven uitsluitend via SQL Editor/Dashboard (46 § 1.1, geen applicatie-schrijfpad).
- `feature_requests` — standaard tenant-model: `company_id` RLS, FK naar `users` (indiener), status-enum (`nieuw/getrieerd/voorgesteld/afgewezen/gepland/gebouwd`, 46 § 2.3).
- `platform_proposals` — platform-admin-only leesbaar; velden voor het BR-903-contract (titel, PR-link, trigger, risicoclassificatie, gekoppelde `feature_request_id[]`); in dit sprint alleen handmatig aan te maken (geen agent-schrijfpad — dat komt in Sprint 11-vervolg).

### Componenten
FeatureRequestForm, FeatureRequestList (statusbadges), ProposalCard (platform-admin-portal), OperationalOverview (agent-rungezondheid geaggregeerd, hergebruikt bestaande `agent_runs`-data uit Sprint 7).

### Testcases
- Unit: platform-admin-guard geeft nooit toegang op basis van een tenant-rol, uitsluitend op basis van de allowlist (BR-900).
- Integratie: RLS — `feature_requests` nooit cross-tenant leesbaar (BR-904, negatieve test: bedrijf A queryt bedrijf B's requests); `platform_admins`/`platform_proposals` alleen leesbaar met geldige allowlist-vlag.
- E2E: tenant dient feature request in → status "nieuw" in eigen omgeving → platform-eigenaar ziet 'm in portal → handmatig een test-voorstel aanmaken en goedkeuren → geen "auto-merge"-knop bestaat in de UI (BR-901, expliciet negatief getest: er is geen endpoint dat merget).
- BR: **BR-904** (geen cross-tenant zichtbaarheid); **BR-900/901** (autorisatie- en merge-scheiding).

---

## Sprint 11-vervolg (nog te plannen) — Product Agent-triage inschakelen

**Startvoorwaarde (nog niet vervuld):** niet eerder beginnen dan dat Sprint 11's fundament (handmatige flow, commits `09b5e51`/`d82999a`, 2026-07-16) minstens één sprint stabiel heeft gedraaid — geen harde regel, maar een expliciete aanbeveling (vergelijkbaar met hoe Organizational Memory's leeskant pas ná het schrijfpad kwam, PRD § 19 A-22 punt 7). Deze sectie legt de scope al vast zodat een latere bouwsessie niet opnieuw hoeft te ontwerpen — het is **planning, geen vrijgave om te starten**.

### Doelen
- Geplande Product Agent-run (FR-951, 46 § 3): leest `feature_requests` + `agent_runs`-foutpatronen, clustert over tenants, opent zelfstandig branch + PR, schrijft een `platform_proposals`-rij met het volledige BR-903-contract.
- High-risk-classificatielogica (BR-902) mechanisch toegepast vóór elke automatische run — definitieve lijst in `46_PlatformAdmin.md` § 3.5.
- Geen wijziging aan de Human-Approval-grens uit Sprint 11 (BR-901): de agent opent uitsluitend een branch + PR, mergt/deployt nooit zelf.

### Bestanden
- Scheduling-configuratie voor de geplande run (cadans: wekelijks, instelbaar) — via de bestaande Claude Code-`schedule`-capaciteit van de ontwikkelomgeving, **geen** nieuwe Edge-Function-infrastructuur (46 § 3.2).
- `lib/platform-admin/high-risk-classifier.ts` (nieuw) — pure functie die een voorgestelde bestandenlijst/diff toetst aan `46_PlatformAdmin.md` § 3.5; gebruikt door de agent-run zelf vóór het openen van een PR, en indien technisch haalbaar aanvullend als CI-check op elke Product-Agent-PR (defense-in-depth, PA-03: menselijke review blijft sowieso de laatste linie).
- Schrijfpad naar `platform_proposals` vanuit de agent-run (service-rol, analoog aan hoe de bestaande domein-agents naar `agent_proposals` schrijven, ADR-012 § 2) — het bestaande, handmatige aanmaakpad uit Sprint 11 blijft ongewijzigd naast dit nieuwe pad.

### Database-migraties
Geen nieuwe tabellen verwacht. `platform_proposals` (Sprint 11) krijgt vermoedelijk één kolom om "automatisch door de Product Agent aangemaakt" te onderscheiden van "handmatig door de platform-eigenaar aangemaakt" (bv. `created_by_agent boolean not null default false`) — exacte kolomnaam/migratienummer te bepalen bij daadwerkelijke bouw, niet hier vast vooringevuld (zelfde reden als de migratienummer-opmerking bij Sprint 11 zelf).

### Componenten
Geen nieuwe UI-componenten verwacht — het bestaande `ProposalCard` (Sprint 11) toont zowel handmatig als agent-aangemaakte voorstellen; een klein visueel onderscheid (bv. een "Automatisch voorstel"-badge) is aan te raden voor transparantie over de bron, ook al niet expliciet vereist door BR-903.

### Testcases
- Unit: `high-risk-classifier.ts` — elk scenario uit `46_PlatformAdmin.md` § 3.5 (migratiebestand, RLS-SQL, auth-pad, betalingspad, secret/Vault-pad, eigen governance-pad) classificeert correct als high-risk; een voorstel zonder enig geraakt patroon classificeert als normaal.
- Integratie: een simulatie-run met een high-risk-diff triggert nooit automatisch een PR (BR-902, negatieve test).
- E2E: feature-request-clustering → voorstel in `platform_proposals` → zichtbaar in portal → handmatige goedkeuring/merge ongewijzigd t.o.v. Sprint 11 (geen "auto-merge"-pad ontstaat door deze uitbreiding).
- BR: **BR-901/902/903**, nu getest tegen het geautomatiseerde schrijfpad i.p.v. alleen het handmatige uit Sprint 11.

---

## Sprint 12 — Modulair MKB/ZZP/branche-pakket & medewerker-uitnodiging (✅ gebouwd)

**Aanleiding (PRD § 19 A-33, 2026-07-21):** gebruikersopdracht om te analyseren wat er nog gebouwd moet worden richting een simpel, modulair pakket — planner op kantoor, medewerkers met eigen account die taken/bezoeken afvinken, ZZP'ers die meteen kunnen factureren, instelbaar per bedrijfstype (MKB/ZZP) en branche. WhatsApp (Sprint 8) bleef expliciet buiten deze analyse. Na gebruikersbevestiging ("ja werk sprint 12 uit") direct gebouwd, in de volgorde die deze sectie al vastlegde: **FR-103 eerst** (zonder werkende medewerker-uitnodigingsflow is "medewerkers met een eigen account" een belofte zonder pad ernaartoe), daarna FR-100/FR-104 (modulaire configuratie) en FR-069 (ZZP-versnelling).

**Migratienummers:** `040_employee_invites.sql`, `041_company_type_industry.sql` (het eerstvolgende vrije nummer ná Sprint 10, zoals verwacht).

### Doelen (alle vier gerealiseerd)
- ✅ FR-103: medewerker-uitnodigingsflow (eigen inlogaccount, token-based) — sluit het kritieke gat tussen "medewerker kan beurten afvinken" (bestond al) en "medewerker kan er als medewerker bij" (bestond niet).
- ✅ FR-100: Bedrijfsinstellingen-pagina eindelijk gebouwd (was al MVP-scope, nooit gebouwd) — de bestaande, tot dan toe UI-loze `config_json.invoicing`-velden (PRD § 19 A-20) plus de nieuwe bedrijfstype (MKB/ZZP)- en branche-velden. **Scope-cut, bewust:** logo/primaire kleur (oorspronkelijke FR-100 AC2) niet meegebouwd — white-label-branding (file-upload/kleurkiezer, raakt PDF-/e-mail-templates) is een materieel andere, grotere feature dan de rest van dit sprint; blijft open voor een latere sessie.
- ✅ FR-104: branche-dienstensjabloon — het al sinds PRD v1.0 beloofde "Diensttype-templates per branche" (§ 5.2/§ 6.7), voor het eerst gebouwd.
- ✅ FR-069: optionele "direct factureren bij afronden" voor ZZP'ers, binnen BR-702 (blijft een menselijke actie, alleen sneller: hergebruikt de bestaande `sendInvoice()` rechtstreeks vanuit `completeJob()` i.p.v. een aparte `completeJobAndSend()`-variant).

### Bestanden (zoals daadwerkelijk gebouwd)
- **FR-103:** `app/(app)/instellingen/medewerkers/actions.ts` (`inviteEmployee()`/`revokeInvite()`, idempotent — vervangt een bestaande niet-geaccepteerde uitnodiging i.p.v. te stapelen), `app/(app)/instellingen/medewerkers/[id]/uitnodigen/page.tsx`, `components/domain/InviteEmployeeForm.tsx`, `lib/email/invite-employee.ts`, `lib/validation/employee.ts` (+`inviteEmployeeSchema`)/`lib/validation/auth.ts` (+`acceptInviteSchema`). Accepteren: `app/(auth)/uitnodiging/[token]/{page.tsx,actions.ts}`, `components/domain/AcceptInviteForm.tsx`, `app/uitnodiging/voltooien/route.ts` (koppelt `public.users`/`employees.user_id` ná Supabase's eigen e-mailbevestiging, analoog aan `app/onboarding/actions.ts`). **`proxy.ts` moest mee-wijzigen** — ontdekt tijdens E2E-verificatie: zonder toevoeging aan de publieke-pad-uitzondering (naast het al-bestaande `/auth/`-pad) stuurde de proxy zowel een niet-ingelogde bezoeker van `/uitnodiging/[token]` als de net-bevestigde-maar-nog-niet-gekoppelde medewerker op `/uitnodiging/voltooien` fout naar `/login`/`/onboarding` — de hele flow was zonder deze fix onbruikbaar.
- **FR-100:** `app/(app)/instellingen/bedrijf/{page.tsx,actions.ts}`, `components/domain/CompanySettingsForm.tsx`, `lib/validation/company-settings.ts`. Nieuwe tegel op `/instellingen`.
- **FR-104:** `lib/branche-templates/data.ts` (`INDUSTRIES`, `BRANCHE_TEMPLATES` — statische data, geen `applyBrancheTemplate()`-functie nodig; de Server Action filtert/mapt rechtstreeks), `app/(app)/instellingen/diensten/actions.ts` (+`importBrancheTemplate()`, herleidt sjabloonrijen server-side uit `industryId`+namen i.p.v. de client-objecten te vertrouwen), `app/(app)/instellingen/diensten/sjabloon/page.tsx`, `components/domain/BrancheTemplateImportForm.tsx` (preview + checkboxes, één client component i.p.v. een dialoog — consistent met hoe Diensten/Medewerkers al aparte pagina's i.p.v. modals gebruiken).
- **FR-069:** `app/m/actions.ts` (`completeJob()` uitgebreid, geen nieuwe functie), `app/m/beurt/[id]/JobExecutionPanel.tsx` (toast-tekst reflecteert `invoiceSent`).
- **DataTable-uitbreiding** (`components/composed/DataTable.tsx`): nieuwe optionele `interactive`-kolomvlag — nodig omdat `onRowHref` elke cel al in een eigen `<Link>` wrapt; de nieuwe "Uitnodigen"-actielink op de Medewerkers-lijst zou anders in een ongeldige geneste `<a>` terechtkomen (zelfde bugklasse als eerder al eens gefixt op de facturen-lijst).

### Database-migraties
- `040_employee_invites.sql` — `invites`-tabel (22_Authenticatie.md § 8-schema, met `token`/`accepted_at` i.p.v. het schema letterlijk te volgen — `accepted_at` vervangt "verwijderen bij accepteren" voor een audit-spoor) + RLS (standaard tenant-model, owner/admin-only insert/delete) + twee `SECURITY DEFINER`-functies: `get_invite_by_token()` (anoniem aanroepbaar, minimale info) en `accept_employee_invite()` (self-service koppeling, analoog aan `onboard_company()` — geen Admin-API/service-role in de applicatielaag, `lib/supabase/server.ts` staat dat bewust niet toe).
- `041_company_type_industry.sql` — `companies.company_type` (enum `zzp`/`mkb`, nullable), `companies.industry` (varchar, geen eigen enum — nieuwe branches zonder migratie), `companies.instant_invoice_on_complete boolean not null default false` — echte kolommen i.p.v. `config_json` (zie PRD § 19 A-33-motivatie).
- Geen nieuwe tabel voor FR-104 — een reeks inserts in de bestaande `services`-tabel.

### Componenten
CompanySettingsForm (FR-100), InviteEmployeeForm + AcceptInviteForm (FR-103), BrancheTemplateImportForm (FR-104, preview + checkboxes), StatusBadge-hergebruik voor uitnodigingsstatus ("Uitgenodigd"/"Actief"/"Verlopen"/"Nog niet uitgenodigd") op de Medewerkers-lijst.

### Testcases (alle groen)
- Integratie (`tests/integration/employee-invites-rls.test.ts`, 9 tests): `invites`-RLS (tenant-isolatie SELECT/INSERT/DELETE), `get_invite_by_token()` (verlopen → `valid:false`, onbestaand token → geen rij), `accept_employee_invite()` (koppelt account+medewerker correct, weigert een verkeerd e-mailadres, weigert dubbel accepteren).
- E2E (`tests/e2e/sprint12-employee-invite.spec.ts`): volledige uitnodigingsflow browser-first — accepteren → wachtwoord instellen → Supabase-bevestigingsmail (Mailpit) → landt op `/m`, gekoppeld aan de medewerker. Dit was de test die de `proxy.ts`-bug hierboven blootlegde.
- Handmatige browser-verificatie (niet als permanente test toegevoegd, wel uitgevoerd tijdens de bouw): Bedrijfsinstellingen opslaan+herladen behoudt waarden; branchesjabloon-import vult de Diensten-lijst; FR-069 met de toggle aan rondt een beurt af zonder te crashen (Resend ontbreekt lokaal → nette fallback naar conceptfactuur, geen foutmelding aan de medewerker).
- Regressie: volledige bestaande suite (264 unit, 99 integratie incl. de 9 nieuwe, 12 E2E/a11y incl. de nieuwe) + `npm run build` — allemaal groen ná elke fase.
- BR: **BR-702 blijft ongewijzigd** (FR-069 is geen automatisering-zonder-mens — `completeJob()` blijft één user-geïnitieerde actie, alleen met een extra stap erachteraan).

---

## Afhankelijkheden-overzicht

```
S1 fundament ─▶ S2 klanten/geocoding ─▶ S3 afspraken/beurt-gen ─▶ S4 routing/planning ─▶ S5 PWA+factuur (MVP)
                                                                                              │
                                       S6 Mollie/herinneringen ◀──────────────────────────────┘
                                            │
                              S7 AI-herplan/weer ─▶ S8 WhatsApp/notificaties ─▶ S9 PWA+/factuur+ (V1)
                                                                                     │
                                                                          S10 hardening/schaal/security
```

**Kritieke koppelingen:** routing-engine (S4) blokkeert AI-herplan (S7); messaging-adapter (S8) hergebruikt e-mail-fundament (S5); betalingen (S6) vereisen facturen (S5).

**Sprint 11** staat buiten dit diagram: enige harde afhankelijkheid is S1 (auth/RLS-fundament, voor de platform-admin-allowlist en `feature_requests`-RLS) — verder onafhankelijk van S2–S10, in te plannen op elk gewenst moment na S1.

---

## Definition of Done per sprint

1. Alle geplande FR's voldoen aan hun AC's (32) en betrokken BR's (10).
2. Unit + integratie + relevante E2E groen in CI (31 § 8).
3. Must-NFR's van de fase niet geregresseerd (09 § 11, 37 § 6).
4. Migraties expand/contract, met RLS-policies (35 § 4).
5. Demo + korte release-notitie; changelog bijgewerkt.

---

## Changelog

| Datum | Versie | Wijziging |
|---|---|---|
| 2026-07-07 | 1.0 | Implementatieplan Sprint 1–10 opgesteld: per sprint doelen, bestanden, DB-migraties, componenten, testcases; afhankelijkheden-diagram; DoD per sprint. Gebaseerd op 33_Roadmap en de complete docset. |
| 2026-07-12 | 1.1 | Sprint 7 aangevuld met architectuurcontext vanuit ADR-011 (Human-in-the-Loop AI, `43_AI_Agents.md`) — Sprint 7 bouwt de Replanning/Weather/Capacity Agents; geen wijziging aan bestaande sprintdoelen, alleen expliciete koppeling aan de nieuwe agent-architectuur. |
| 2026-07-13 | 1.2 | Sprint 7 herzien ná strategische review (PRD § 19 A-22) en gebouwd: Replanning Agent vervangen door Optimization Agent-formalisering (kleinere scope, sluit het grootste zichtbare "voorbeeldweergave"-gat); gedeelde Execution Pipeline (ADR-012 § 2) als herbruikbare `lib/agents/`-modules i.p.v. per-agent-explainability; Capacity/Weather Agent nieuw gebouwd. Replanning Agent + geografische clustering expliciet verschoven naar een nieuwe "Sprint 7-vervolg"-sectie. Migratienummers gecorrigeerd (`022`–`024`, de geplande `019`–`021` waren al door Sprint 5 gebruikt). |
| 2026-07-16 | 1.3 | Sprint 11 (Platform Admin & Product Agent — fundament) toegevoegd, voortvloeiend uit ADR-013/`46_PlatformAdmin.md`/PRD § 19 A-23: platform-admin-allowlist, tenant-zijde feature requests (FR-950), portal met alleen handmatige goedkeuring (FR-952/953). Geautomatiseerde Product Agent-triage (FR-951) expliciet uitgesteld naar nieuwe "Sprint 11-vervolg"-sectie, analoog aan het Sprint 7-vervolg-precedent. Sprint 11 expliciet buiten de MVP/V1/V2-fase-tabel geplaatst (§ "Doel & uitgangspunten") en buiten het afhankelijkheden-diagram (enige harde afhankelijkheid: Sprint 1). |
| 2026-07-16 | 1.4 | Sprint 7-vervolg bijgewerkt: Replanning Agent gemarkeerd als gebouwd en live geverifieerd (was "nog te plannen"); geografische clustering en Organizational Memory-leeskant blijven open. |
| 2026-07-16 | 1.5 | Sprint 7-vervolg bijgewerkt: Planning Agent gemarkeerd als gebouwd en live geverifieerd (`planning-generate` service-rol-pad + incrementele-detectie-fix, nieuwe `agent-planning`-Edge-Function, orchestrator-koppeling als eerste stap). Geografische clustering blijft open, nu niet meer geblokkeerd op de formalisering. |
| 2026-07-16 | 1.6 | Sprint 7-vervolg bijgewerkt: Invoice Agent gemarkeerd als gebouwd en live geverifieerd — bleek bij de bouw uitsluitend signalering nodig te hebben (conceptfactuur-aanmaak was al `complete_job()`, Sprint 5); geen Mollie/betaalverzoek-link meegenomen in deze stap (aparte, latere uitbreiding op `sendInvoice`). |
| 2026-07-16 | 1.7 | Sprint 11-vervolg formeel uitgewerkt (scope, bestanden, database-migraties, componenten, testcases — zelfde diepte als reguliere sprintsecties), incl. verwijzing naar de nieuwe high-risk-classificatielijst (`46_PlatformAdmin.md` § 3.5). Uitdrukkelijk **planning, geen vrijgave om te bouwen**: de startvoorwaarde ("minstens één sprint stabiel gedraaid" sinds Sprint 11-fundament, 2026-07-16) is nog niet vervuld. |
| 2026-07-17 | 1.8 | Sprint 11 § Bestanden: URL verkort van `/platform-admin` naar `/admin` (`app/admin/**`), zie `46_PlatformAdmin.md` § 1.2/changelog 1.3. |
| 2026-07-18 | 1.9 | Sprint 7-vervolg afgerond: geografische clustering (FR-025/BR-204) gemarkeerd als gebouwd en live geverifieerd — laatste openstaande punt van Sprint 7/7-vervolg. AC2/AC4 (scoringsmodel + slider) expliciet uitgesteld naar een aparte, latere "AI-planner tuning"-uitbreiding (zie `08_FunctioneleEisen.md` FR-025-changelog). |
| 2026-07-18 | 1.10 | Sprint 4 § "Sprint 4-vervolg" toegevoegd: nieuw FR-029 (handmatige beurt-toevoeging op dag/tijdstip, PRD § 19 A-27) geregistreerd als nog te plannen vervolgwerk op de bestaande RouteBoard. |
| 2026-07-19 | 1.11 | Sprint 4-vervolg: FR-029 gebouwd (was "nog te plannen"). FR-030 toegevoegd ("Vul de dag", PRD § 19 A-28) — spiegelbeeld van FR-024, ontdekt tijdens de FR-029-bouw. |
| 2026-07-20 | 1.12 | Sprint 9 afgerond (was gedeeltelijk gebouwd — foto's/donkere modus bleken al eerder klaar): CSV-import (FR-006), klant-tijdlijn (FR-007, verkleinde scope), abonnementsfacturatie (FR-066/BR-304) en creditfacturen (FR-068/BR-020) gebouwd en gecommit. Migratienummers `034`–`036` i.p.v. de gepland `025`–`027` (zelfde migratienummer-drift-precedent als Sprint 7, PRD § 19 A-22 punt 5). Vier scope-beslissingen geregistreerd als PRD § 19 A-29. Release-gate V1 (security ASVS L2/AVG-DPA's/PITR) bewust niet meegenomen — hoort inhoudelijk bij Sprint 10 en wordt daar behandeld. |
| 2026-07-21 | 1.13 | Sprint 10 — code-bouwbare deel afgerond: rapportage-module (`/rapportage`), a11y-pas (axe tegen 6 kernpagina's, WCAG 2.1 AA), RLS-negatieve-suite aangevuld, correctie-logging-schrijfpad (V2-voorbereiding), Sentry-observability-basis, cron-zichtbaarheid in Platform Admin. Migratienummers `037`–`039` i.p.v. gepland `028`–`030`. Vijf operationele/audit-activiteiten (load-test-executie, ASVS L2-pentest, PITR-hersteltest-executie, statuspagina, OSRM-fallback-spike) + `audit_log` (optioneel V2) expliciet bewust niet gedaan, geregistreerd als PRD § 19 A-30 — geen agent-bouwtaken. |
| 2026-07-21 | 1.14 | Naamswijziging RouteFlow → ServOps.nl door dit hele document (PRD § 19 A-31), geen inhoudelijke wijziging. Nieuwe "Sprint 12 (nog te plannen)"-sectie toegevoegd: modulair MKB/ZZP/branche-pakket + medewerker-uitnodigingsflow (FR-069/103/104, PRD § 19 A-33) — planning, nog niet gebouwd, wacht op korte gebruikersbevestiging op branche-lijst/module-indeling vóór start. Grootste ontdekte gat: de medewerker-uitnodigingsflow (FR-103) staat al sinds Sprint 1 gepland (`/app/(auth)/uitnodiging/[token]`) maar is nooit gebouwd — geverifieerd bij deze analyse. |
| 2026-07-21 | 1.15 | Sprint 12 gebouwd en groen (op gebruikersbevestiging "ja werk sprint 12 uit"): medewerker-uitnodigingsflow (FR-103, incl. een tijdens E2E-verificatie ontdekte en gefixte `proxy.ts`-blokkade zonder welke de hele flow onbruikbaar was), Bedrijfsinstellingen-pagina (FR-100, logo/kleur bewust uitgesteld), branche-dienstensjabloon (FR-104), ZZP-directfactureren-toggle (FR-069). Migraties `040`/`041`. Nieuwe `DataTable`-`interactive`-kolomvlag (voorkomt geneste `<a>`-elementen bij rij-acties). 9 nieuwe integratietests + 1 nieuwe E2E-spec, volledige bestaande suite + build groen ná elke fase. |
