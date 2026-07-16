# QA & Production Readiness Audit — 2026-07-16

**Rol:** extern Principal QA Engineer / Staff Software Architect / Product Owner
**Scope:** volledige codebase, documentatie 00–46, lokale omgeving (Supabase + Next.js dev), Vercel-productieconfiguratie voor zover extern verifieerbaar.
**Verdict: zie § 6 — NO GO voor een eerste betalende klant morgen; GO voor besloten pilot op de huidige demo-omgeving.**

---

## 1. Testresultaten (na fixes, eindstand)

| Suite | Resultaat |
|---|---|
| ESLint | ✅ 0 fouten |
| TypeScript (`tsc --noEmit`) | ✅ 0 fouten |
| Prettier `format:check` | ✅ (alleen een untracked lokaal bestand resteert; CI-relevant alles schoon) |
| Production build (Next 16, Turbopack) | ✅ |
| Unit (Vitest) | ✅ 222/222 |
| Integratie (RLS + contracts, echte lokale Supabase) | ✅ 77/77 |
| Playwright E2E (onboarding, klant→dienstafspraak→beurt, medewerker-golden-path) | ✅ 3/3 |
| Browser-audit 11 plannerpagina's (console errors / pageerrors / 5xx) | ✅ 0 fouten |
| Command Bar vrije-tekst-AI (echte Anthropic-aanroep) | ✅ juiste intent + uitvoering + tokenlogging |
| Ziekmelding → Replanning Agent → diff → goedkeuring → **daadwerkelijke verplaatsing** | ✅ (na fixes; zie B1/B4) |
| db lint | ✅ (alleen PostGIS-interne ruis + één onschuldige ongebruikte variabele in `complete_job`) |

## 2. Bevindingen & fixes (deze audit, alle gecommit)

### B1 — P1 · Bedrijfsconfig (depot + factuurgegevens) verdween stil; herplan-uitvoering en optimalisatie daardoor kapot
- **Symptoom:** goedgekeurd Replanning-voorstel voerde 0 van 5 moves uit ("0 van 5 beurten verplaatst"); nachtelijke optimalisatie altijd "geen verbetering"; weer-cache leeg.
- **Oorzaak (keten):** `service_role` heeft géén UPDATE-grant op `companies` (correct, least-privilege) → de seed-scripts deden de `config_json`-update via de service-rol **zonder foutcontrole** → stil mislukt → `depot_location` ontbrak → `route-move-job`/`route-optimize`/`agent-weather` weigeren terecht (`depot_location_missing`).
- **Fix:** seed-scripts schrijven config nu via de owner-client (RLS-pad) mét sessie-refresh (JWT-claim!) én readback-assert; lokale data gerepareerd. Commit: zie onderaan.
- **Test:** ziekmelding-scenario end-to-end groen (Jan 2 → 0 beurten, collega's +1); browserverificatie met screenshot.

### B2 — P1 (productie-blocker, niet in deze audit te fixen) · Geen instellingen-UI voor depot & factuurgegevens
- `config_json.depot_location` en `config_json.invoicing` zijn **nergens in de app** in te stellen (bewuste deferral, PRD A-13/A-20). Een echte klant kan dus nooit routes optimaliseren/herplannen of facturen versturen zonder handmatige SQL door de platform-eigenaar. **Moet gebouwd worden vóór de eerste betalende klant.**

### B3 — P2 · `spatial_ref_sys` was schrijfbaar met de publieke anon-key
- Anon-key kon PostGIS-referentiedata muteren/wissen via de data-API (DELETE gaf 204) → geocoding platformbreed te breken door iedereen met de anon-key. Oorzaak: `create extension postgis` zonder schema (001) + grants van `supabase_admin`.
- **Fix:** schrijfrechten ingetrokken (lokaal als `supabase_admin`; migratie 033 bevat best-effort + expliciete WARNING). Geverifieerd: DELETE → 42501, SELECT blijft werken. **Actiepunt productie: zelfde revoke daar uitvoeren en verifiëren** (zie § 4).

### B4 — P2 · Seed-objecten hadden geen coördinaten (901 objecten `location = NULL`)
- Elke beurt was daardoor "onplaatsbaar" voor de optimizer → elke herplan-move werd met `workday_limit_exceeded` afgewezen; de demo-omgeving testte stilzwijgend de halve routing-laag niet.
- **Fix:** beide seed-scripts zetten nu deterministische coördinaten per wijk; bestaande 901 objecten via SQL gerepareerd (`location_status: geocoded`).

### B5 — P2 · `distance_cache` ontoegankelijk voor de service-rol — cache sinds Sprint 4 de facto dood
- Geen SELECT/INSERT/UPDATE-grants (auto_expose uit; migratie 015 verleende niets); alle cache-reads/writes in `lib/routing/matrix.ts` faalden **stil** → elke optimalisatie betaalde de volledige Mapbox-matrixprijs opnieuw (14_RoutingEngine § 3 vereist deze cache expliciet).
- **Fix:** migratie 033 verleent de grants; REST-verificatie 200. Plus RLS aangezet op `distance_cache`/`weerdata_cache` (defense-in-depth; service-rol heeft bypassrls).

### B6 — P2 · Platform Admin toonde "Onbekend bedrijf" voor elk ander bedrijf
- `companies` had geen platform-admin-SELECT-policy → alle cross-tenant joins (operationeel overzicht FR-953, feature-request-inbox, AI-tokendashboard) faalden op naamresolutie.
- **Fix:** migratie 033, policy "platform admins can read all companies". Browserverificatie: 0 × "Onbekend bedrijf".

### B7 — P2 · CI op `main` was rood: 2 tracked bestanden faalden `format:check` (blocking step)
- **Fix:** prettier --write op `scripts/seed-demo.ts` en `tests/integration/employees-routes-rls.test.ts`.

### B8 — P3/P4 · Waarnemingen zonder fix (bewust)
- **Agent/executor-contractverschil:** de Replanning Agent toetst capaciteit op werktijd (510 min − `total_work_time_minutes`), de uitvoerder (`route-move-job`) hertelt inclusief reistijd — een voorstel kan dus nog steeds deels afgewezen worden bij uitvoering. Gedrag is graceful (duidelijke toast, bron-route ongemoeid), maar aanbeveling: agent laten pre-valideren via `route-optimize dry_run`.
- **Voorstel-status na mislukte uitvoering blijft `approved`** — alleen de toast meldt het; overweeg een aparte status of her-trigger-pad.
- **`lib/routing/matrix.ts` cachet Haversine-fallback-schattingen onder de providernaam** (RE-06-pad) — 7 dagen mogelijk onnauwkeurige "provider"-data; overweeg fallback niet of gelabeld te cachen.
- Restgrants (TRUNCATE e.d.) aan anon/authenticated op oudere tabellen: inert via PostgREST, cosmetisch opruimen kan later.

## 3. Doc-vs-implementatie-afwijkingen

| Doc-claim | Werkelijkheid | Ernst |
|---|---|---|
| 36 § 6: CSP-headers | Geen CSP geconfigureerd (`next.config.ts` heeft geen headers; HSTS komt van Vercel-platform) | P3 |
| 36 § 9: Sentry-alerts als detectie | Geen Sentry/error-tracking geïntegreerd | P3 |
| 36 § 6: rate limiting op gevoelige endpoints | Niet aangetroffen in app-laag (Supabase Auth heeft eigen limiter) | P3 |
| 36 § 8: Anthropic-DPA "vóór productiegebruik" | Nog niet geregeld (gedocumenteerd open punt) | P3 (compliance) |
| 43 § 3a: agentstatus-tabel | Klopt (6 gebouwd, Communication/Revenue open, correct gedocumenteerd) | ✅ |
| BR-702/BR-802/ADR-011-grenzen | Correct geïmplementeerd: goedkeuren = enige schrijfpad, diff-contract compleet (why/confidence/alternatieven) | ✅ |

## 4. Production-readiness (extern verifieerbaar deel)

| Onderdeel | Status |
|---|---|
| Vercel prod-env | ⚠️ Alleen `NEXT_PUBLIC_*`-trio aanwezig. **Ontbreekt:** `RESEND_API_KEY`/`RESEND_FROM_EMAIL` (factuur-e-mail → `config_error`), `ANTHROPIC_API_KEY` (Command Bar-AI stil uit). `DEV_BYPASS_*` terecht afwezig ✅ |
| Productie-Supabase | ❓ Niet extern verifieerbaar. Checklist vóór go-live: migraties t/m 033 toepassen; `spatial_ref_sys`-revoke herhalen + verifiëren (anon-DELETE moet 42501 geven); `MAPBOX_ACCESS_TOKEN` als function-secret; cron `agent-orchestrator-nightly` actief; `platform_admins`-allowlist gevuld; Edge Functions gedeployed |
| Storage | ✅ `job_photos` + `invoices` privé, tenant-scoped policies |
| Cron (lokaal) | ✅ `agent-orchestrator-nightly` 02:00 actief |
| PWA | ✅ manifest + service worker + IndexedDB offline-queue (golden path e2e groen) |
| Secrets in repo | ✅ geen (`.env*` genegeerd; geen keys in git) |

**Niet afgedekt door deze audit** (expliciet): Lighthouse/axe-runs (NFR-601/602), load-tests, echte-device mobile/tablet, niet-Chromium-browsers, WhatsApp/Mollie (nog niet gebouwd — gedocumenteerde fase), productie-Supabase-inspectie.

## 5. Commits van deze audit

| Commit | Inhoud |
|---|---|
| (zie git log 2026-07-16) | migratie `033_qa_hardening.sql` (B3/B5/B6) · seed-scripts config-via-owner + readback + coördinaten (B1/B4) · prettier-fixes (B7) · dit rapport |

## 6. Eindoordeel

**NO GO** voor "morgen live met de eerste betalende klant", om drie redenen die geen van alle vandaag lokaal te fixen waren:

1. **B2** — een betalende klant kan depot/factuurgegevens niet instellen; routes optimaliseren, herplannen en factureren werken dan aantoonbaar niet (dit was precies de faalwijze die deze audit live aantrof).
2. **Productie-omgeving onvolledig geconfigureerd** — ontbrekende Resend/Anthropic-keys, en de productie-Supabase-checklist (§ 4) is onbevestigd, inclusief de `spatial_ref_sys`-beveiligingsfix.
3. **Compliance/observability** — Anthropic-DPA open; geen error-tracking (36 § 9), dus een productie-incident wordt pas bij een klantmelding zichtbaar.

**GO** is realistisch dichtbij: de kern (multi-tenancy/RLS, agents met human-approval, planning, facturatie-MVP, PWA, Command Bar-AI) is na de fixes van vandaag functioneel en getest, alle suites zijn groen, en de resterende punten zijn afgebakend: (1) instellingen-UI voor depot+factuurgegevens, (2) productie-checklist § 4 afwerken, (3) DPA + minimale error-tracking. Daarna is een herkeuring van alleen die punten voldoende — de rest van dit rapport blijft geldig.

---

*Changelog: 2026-07-16 — initieel rapport (audit uitgevoerd op commit `aa344e0` + fixes).*
