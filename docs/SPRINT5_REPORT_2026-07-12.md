# Sprint 5 Report — MVP Release Sprint (2026-07-12)

**Doel:** de eerste complete MVP waarmee een glazenwasser een volledige werkdag kan uitvoeren — planning (Sprint 3/4), uitvoering (PWA) en eenvoudige facturatie.
**Scope-discipline:** geen Mollie/herinneringen/incasso/abonnementen/creditfacturen, geen nieuwe AI-functionaliteit, geen nieuwe architectuurdocumentatie — uitsluitend de bestaande architectuur (ADR-007/008, 41_CodingStandards.md).

---

## 1. Gerealiseerde functionaliteit

| Onderdeel | Status | Toelichting |
|---|---|---|
| Medewerker-PWA | ✅ | `/m` (dagroute), `/m/beurt/[id]` (detail), installeerbaar (manifest + icons + service worker), offline-tolerant (IndexedDB-retryqueue voor mutaties, netwerk-eerst-met-cache-fallback voor navigatie) |
| Uitvoering werkzaamheden | ✅ | Start/pauzeren/hervatten/afronden via nieuwe Postgres-RPC's (`start_job`/`pause_job`/`resume_job`/`complete_job`); werkelijke duur = verstreken tijd minus pauzetijd |
| Foto's | ✅ | Voor/na, meerdere foto's, directe upload naar Storage + preview (`PhotoCapture`), gekoppeld aan de beurt |
| Werkbon | ✅ | Gedeelde databron, zichtbaar op `/m/beurt/[id]/werkbon` (medewerker) én `/planning/werkbon/[id]` (desktop) |
| MVP-facturatie | ✅ | Conceptfactuur automatisch bij afronden (BTW correct per dienst/prijsafspraak), verzenden = BR-020-nummer + PDF + e-mail (Resend) in één stap, handmatig "markeer betaald" (geen Mollie) |
| Dashboard | ✅ | Uitgevoerd vandaag, open opdrachten, omzet vandaag/deze week, facturen concept/verzonden |
| Planning-realtime | ✅ (hergebruikt Sprint 4) | `useRealtimeRoute` pikt jobs-wijzigingen van de PWA automatisch op in het desktop RouteBoard — geen nieuwe code nodig |
| Offline | ✅ (basis, per 20_PWA.md-scope) | Retry-queue voor status-mutaties; **geen** volledige offline-first datasync (expliciet buiten MVP-scope, zelfde als het bestaande PWA-document al vastlegt) |
| Tests | ✅ | Unit, integratie (RLS + RPC's), Playwright-gouden-pad — zie § 3 |
| Demo-seedscript | ✅ | `scripts/seed-demo.ts`, apart Seed Report |

## 2. Nieuwe componenten & bestanden (selectie)

- **Migraties:** `017_jobs_execution.sql` (pauzeren/hervatten + medewerker-RLS + kolom-trigger), `018_job_photos.sql`, `019_invoicing_mvp.sql`, `020_job_completion.sql` (start/pause/resume/complete/not-home RPC's), `021_invoice_storage.sql`.
- **lib:** `lib/invoicing/{money,pdf}.ts`, `lib/email/resend.ts`, `lib/execution/{navigate,werkbon}.ts`, `lib/pwa/offline-queue.ts`.
- **Server Actions:** `app/m/actions.ts` (uitvoering), `app/(app)/facturen/actions.ts` (verzenden/betaald).
- **UI:** `app/m/**` (PWA), `components/domain/{PhotoCapture,Werkbon,InvoiceActions,KPICard}.tsx`, `app/(app)/facturen/page.tsx`, bijgewerkt dashboard.
- **PWA-infra:** `public/manifest.webmanifest`, `public/sw.js`, `public/icons/*`.

18 kleine Conventional Commits (`v0.4.0..HEAD`), zie `git log`.

## 3. Testresultaten

| Suite | Resultaat |
|---|---|
| Unit (`npm run test`) | **141/141 groen** |
| Integratie (`npm run test:integration`) | **56/56 groen**, incl. nieuwe `job-execution-rls.test.ts` (10 tests): tenant-isolatie, employee-kolom-trigger, pauzeren/hervatten, BTW-correcte conceptfactuur, Facturen-rechtenmatrix, BR-020 gap-loze nummering, `mark_invoice_paid`-status-guard |
| Playwright (`sprint5-golden-path.spec.ts`) | **Groen** — volledige flow: inloggen → dagroute → beurt → starten → foto vóór → afronden (foto na + notitie) → werkbon → conceptfactuur met correcte BTW geverifieerd in de database |
| Lint/typecheck/build | Schoon |

**Tijdens het testen gevonden en gefixte bug (niet via lint/typecheck):** `start_job`/`pause_job`/`resume_job`/`mark_job_not_home` waren aanvankelijk `language sql`-functies met een non-SETOF composite return. Bij 0 geraakte rijen (bv. een niet-geautoriseerde aanroep, geblokkeerd door RLS) leverden ze een rij van louter NULL-kolommen op — geen echte SQL NULL. Een client die alleen op `!data` test (zoals de Server Actions) zou dat ten onrechte als succes zien. Omgezet naar `plpgsql` met een expliciete "geen rij gevonden"-exception — nu fail-closed.

## 4. Bekende beperkingen (bewust, gedocumenteerd)

1. **Geen uitnodigingsflow.** Er bestaat nog geen UI om een tweede, echte gebruiker met een andere rol (medewerker/admin) aan een bestaand bedrijf te koppelen — `onboard_company()` is nog het enige schrijfpad naar `public.users`, en zet altijd `role='owner'` van een nieuw bedrijf. Alle test-medewerkers/-admins in dit sprint zijn aangemaakt via de Supabase Admin API (service-role), puur voor testopzet. Dit is een gat, niet nieuw geïntroduceerd door Sprint 5, maar wel nu zichtbaarder omdat de PWA het voor het eerst relevant maakt.
2. **3-statusmodel facturen** (`draft`/`sent`/`paid`) i.p.v. het volledige 5-statusmodel uit `11_DatabaseConcept.md` — expliciete, gedocumenteerde vereenvoudiging (PRD § 19 A-19) omdat Mollie/herinneringen/creditfacturen buiten scope zijn.
3. **Subscription/punch_card-prijsafspraken** vallen bij `complete_job()` terug op de dienst-standaardprijs i.p.v. abonnementsdekking — abonnementen zijn expliciet Sprint 9-scope.
4. **Geen Werkbon-link vanuit het desktop RouteBoard** (alleen bereikbaar via directe URL `/planning/werkbon/[id]`) — bewust niet toegevoegd aan `RouteDetailsDialog` om geen regressierisico op Sprint 4-code te nemen binnen deze sprint.
5. **Offline is "tolerant", niet "first"** — conform 20_PWA.md's eigen scopering. De dagroute zelf wordt niet vooraf in IndexedDB gecached voor lezen; alleen de laatst bezochte pagina (via de service worker) en mutaties (via de retry-queue).
6. **`config_json.invoicing`** (bedrijfscode/KVK/BTW-nr/IBAN/BIC) heeft geen instellingen-UI — moet nu handmatig in `companies.config_json` gezet worden (net als `depot_location`, PRD § 19 A-13/A-20). Zonder deze config geeft "Verzenden" een duidelijke `config_error`.
7. **Lokale testfixtures vereisen handmatige `service_role`-grants** (`auto_expose_new_tables=false`) — gedocumenteerd in `tests/integration/helpers.ts` en `scripts/seed-demo.ts`, niet gecommitteerd als migratie (zou de productie-invariant "alleen `onboard_company()` schrijft naar `users`" onnodig verzwakken).

## 5. MVP-checklist (Sprint 5-opdracht)

| Vereist | Status |
|---|---|
| Medewerker-PWA (dagroute, route-overzicht, opdracht, navigeren, offline-basis, sync, installeerbaar) | ✅ |
| Start/pauzeren/hervatten/voltooien + start-/eindtijd/duur/opmerkingen | ✅ |
| Foto's vóór/na, meerdere, upload, preview | ✅ |
| Werkbon (klant/object/dienst/medewerker/datum/opmerkingen/foto's/status) | ✅ |
| MVP-facturatie (concept/PDF/BTW/nummer/e-mail/concept-verzonden-betaald) | ✅ |
| Dashboard-KPI's | ✅ |
| Planning realtime bijwerken na afronding | ✅ (hergebruik Sprint 4) |
| Offline (route/opdracht bekijken, foto's tijdelijk, sync) | ✅ (basis, zie § 4.5) |
| Tests (unit/integratie/Playwright, volledige flow) | ✅ |
| Kwaliteit (lint/typecheck/build/tests per feature) | ✅ |

## 6. Production Readiness

**Niet productie-klaar zonder de volgende stappen** (allemaal configuratie, geen bouwwerk):
1. Migraties 017–021 naar Supabase Cloud pushen.
2. `RESEND_API_KEY` + `RESEND_FROM_EMAIL` instellen (Vercel env).
3. Per company `config_json.invoicing` (bedrijfscode/KVK/BTW-nr/IBAN/BIC) invullen.
4. `MAPBOX_ACCESS_TOKEN` + `depot_location` (al bekend gat sinds Sprint 4).
5. Storage-buckets (`job_photos`, `invoices`) bestaan lokaal via migratie 018/021 — verifiëren dat ze na het pushen ook op Cloud aangemaakt worden (Storage-buckets worden normaliter wél door reguliere migraties aangemaakt, maar nog niet los bevestigd op Cloud in deze sessie).

## 7. GO / NO-GO voor eerste pilot

**GO, met de vier configuratiestappen in § 6 als harde voorwaarde vooraf.** De code zelf is functioneel compleet, getest (unit/integratie/E2E) en doorstaat lint/typecheck/build zonder waarschuwingen. Er is geen enkele openstaande bug in de kernflow — alleen ontbrekende productie-configuratie en het al-bekende (niet dit-sprint-geïntroduceerde) gat rond een echte uitnodigingsflow voor medewerkers, wat vóór een echte pilot met échte medewerkers (i.p.v. testaccounts) wél opgelost moet worden. **Aanbeveling:** een korte, gerichte volgende stap (niet per se een volledige Sprint 6) om minimaal één medewerker handmatig via Supabase Dashboard/SQL te kunnen aanmaken vóór de eerste pilot start, tot de echte uitnodigingsflow gebouwd is.

---

## Changelog

| Datum | Versie | Wijziging |
|---|---|---|
| 2026-07-12 | 1.0 | Sprint 5 opgeleverd: medewerker-PWA, uitvoering, foto's, werkbon, MVP-facturatie, dashboard-KPI's, demo-seedscript. |
