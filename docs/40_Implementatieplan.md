# 40 — Implementatieplan (Sprint 1–10)

**Status:** DONE
**Versie:** 1.0
**Bron van waarheid:** `00_PRD.md` (scope § 5, architectuur § 12) + 33_Roadmap.md — dit document mag het PRD niet tegenspreken.
**Werkinstructie:** zie `MASTER_PROMPT.md`. **Let op:** dit is een *plan*; er wordt in de documentatiefase nog **niets** gebouwd (CLAUDE.md).
**Relaties:** 08_FunctioneleEisen.md (FR), 10_BusinessRules.md (BR), 11_DatabaseConcept.md (tabellen), 12_Entiteiten.md, 13_API_Specificatie.md, 14_RoutingEngine.md, 15_AIPlanner.md, 26_ComponentLibrary.md, 31_Testplan.md, 33_Roadmap.md.

---

## Doel & uitgangspunten

Dit document verdeelt de bouw van RouteFlow in **10 sprints** (indicatief ~2 weken elk) en geeft per sprint: **doelen**, **bestanden**, **database-migraties**, **componenten** en **testcases**. Het volgt de fasering uit 33_Roadmap.md:

| Sprints | Fase | Mijlpaal |
|---|---|---|
| 1–5 | **MVP** | Glazenwasser gooit wijkboekje weg (planning + uitvoering + e-mailfactuur) |
| 6–9 | **V1** | Commercieel product (Mollie, AI-herplan, WhatsApp, PWA+) |
| 10 | **V1-hardening → V2-prep** | Kwaliteit, schaal, security, rapportage |

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

## Sprint 7 — AI Planner V1: weer, herplannen, clustering, capaciteit

### Doelen
- Reactieve laag: herplannen bij ziekte/verlof met diff-voorstel (FR-024, 15 § 7, BR-802).
- Weerslaag met drempels (FR-023, 15 § 6).
- Geografische clustering (FR-025, BR-204), capaciteitswaarschuwing (FR-027), "plan opnieuw" (FR-028), "waarom" (BR-700).

### Bestanden
- `/lib/planning/reactive.ts` (herplan-diff), `/lib/weather/provider.ts` + `openmeteo.ts`.
- `/lib/planning/clustering.ts` (PostGIS `ST_DWithin`), `/lib/planning/scoring.ts` (15 § 4).
- `/supabase/functions/replan/`, `/replan-accept/`.
- `/components/domain/{ReplanDiff,WeatherBanner,CapacityWarning}.tsx`.

### Database-migraties
- `019_weather_cache.sql` — weerdata-cache.
- `020_planning_reasons.sql` — reden-/scorevelden op jobs (BR-700, transparantie).
- `021_leave_periods.sql` — `leave_periods` (meerdaags verlof).

### Componenten
ReplanDiff (accepteren/aanpassen), WeatherBanner, CapacityWarning, WhyExplanation (volledig), scoring-sliders.

### Testcases
- Unit: scorefunctie + gewichten; clustering-groepen; weer-drempels (15 § 6.3).
- Integratie: `replan` genereert diff, `replan-accept` past toe; onplaatsbaar → wachtrij (BR-802).
- BR: **BR-200** stabiliteit bij herplannen; BR-201 beschikbaarheid absoluut.
- E2E: ziekmelding → herplan-voorstel → accepteren (E2E-10); weerwaarschuwing → herplan (AC-023).

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

## Sprint 9 — PWA+ & facturatie+ → **V1-release**

### Doelen
- Foto's (voor/na) + offline-tolerantie/retry-queue (FR-044/045, 20 § 3).
- CSV-import klanten/objecten (FR-006), klant-tijdlijn (FR-007).
- Abonnementsfacturatie (FR-066, BR-304), creditfacturen (FR-068), donkere modus (25 § 7).

### Bestanden
- `/lib/pwa/sync-queue.ts` (IndexedDB), `/components/domain/PhotoCapture.tsx`.
- `/lib/import/csv.ts` + mapping-wizard, `/components/domain/CustomerTimeline.tsx`.
- `/supabase/functions/invoice-credit/`, `/subscription-billing-cron/`.

### Database-migraties
- `025_job_photos.sql` — `job_photos` (metadata bij Storage).
- `026_invoices_credit.sql` — `parent_invoice_id` + credit-velden.
- `027_import_jobs.sql` — import-batch + foutrapport.

### Componenten
PhotoCapture, ImportWizard, CustomerTimeline, credit-flow op InvoicePreview, thema-toggle.

### Testcases
- Integratie: offline afvinken → queue → sync bij herverbinding (PWA-02/03); foto-upload + compressie.
- Unit: CSV-mapping + foutrapport; **BR-304** abonnement + overage; creditfactuur koppelt aan origineel (BR-020 immutabel).
- E2E: import → klanten aangemaakt; abonnementsfactuur; creditfactuur (AC-068).
- **Release-gate V1** (31 § 9) incl. security ASVS L2, AVG-DPA's, PITR.

---

## Sprint 10 — Hardening, rapportage, schaal & security → **V1-hardening / V2-prep**

### Doelen
- Rapportage (omzet/route/productiviteit), donkere-modus-afwerking, WCAG 2.1 AA (NFR-601).
- Performance-/load-tests (37/38), observability (Sentry, cron-monitoring, statuspagina).
- Security-hardening (ASVS L2, pentest-voorbereiding), backups/PITR-hersteltest (NFR-803).
- V2-voorbereiding: correctie-logging voor "leren van correcties" (15 § 10), OSRM-fallback-spike (BL-040).

### Bestanden
- `/app/(app)/rapportage/**`, `/lib/analytics/*`.
- `/lib/observability/*` (Sentry, structured logging), statuspagina-config.
- `/tests/load/*` (LT-1…5, 38 § 6), `/tests/a11y/*` (axe).

### Database-migraties
- `028_reporting_views.sql` — materialized views / aggregaties (voorberekening, 37 § 3).
- `029_audit_log.sql` — audit-trail met triggers (11 § 7, optioneel V2).
- `030_correction_log.sql` — planner-correcties loggen (15 § 10, V2-voorbereiding).

### Componenten
Rapportage-grafieken (dataviz-richtlijn), DateRangePicker, export (CSV), a11y-verbeteringen op bestaande componenten.

### Testcases
- NFR: Lighthouse/axe volledige suite (NFR-601/602); load LT-1…5 (NFR-503/504); PITR-hersteltest (NFR-803).
- Security: RLS-negatieve suite compleet, dependency-/secret-scan, webhook-integriteit (NFR-301/302/307).
- Regressie: volledige E2E-suite groen; performance-budgetten als gate (37 § 6).

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
