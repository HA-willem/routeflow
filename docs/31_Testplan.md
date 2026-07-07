# 31 — Testplan

**Status:** DONE
**Versie:** 2.0
**Bron van waarheid:** `00_PRD.md` § 13 (NFR), § 16 (edge cases) — dit document mag het PRD niet tegenspreken.
**Werkinstructie:** zie `MASTER_PROMPT.md`.
**Relaties:** 32_Acceptatiecriteria.md (AC's), 08_FunctioneleEisen.md (FR's), 09_NietFunctioneleEisen.md (NFR's), 10_BusinessRules.md (BR's).

---

## Doel van dit document

Dit document beschrijft de **teststrategie**: welke testniveaus, welke dekking, welke kritieke scenario's, en de release-criteria. Het koppelt tests aan FR's/NFR's/BR's zodat elke eis verifieerbaar is (MASTER_PROMPT § 6e: bouwbaar/toetsbaar zonder voorkennis).

---

## 1. Testpiramide

| Niveau | Dekking | Tooling (indicatief) | Waar |
|---|---|---|---|
| **Unit** | Domeinlogica: frequentie-/datumberekening (BR-001), BTW, factuurnummering, scorefunctie | Vitest/Jest | Functies, pure services |
| **Integratie** | API-endpoints, DB-queries, **RLS-policies**, webhooks | Test-DB (Supabase local), supertest | Edge Functions, PostgREST |
| **E2E** | Kritieke flows end-to-end | Playwright | Browser + PWA |
| **Niet-functioneel** | Performance, toegankelijkheid, security | Lighthouse, axe, load-tool | CI + periodiek |
| **Handmatig/UAT** | Beleving, 15-min-test per persona | Menselijk | Pre-release |

Zwaartepunt: veel unit + integratie (snel, betrouwbaar), gerichte E2E op kritieke paden.

---

## 2. Kritieke E2E-flows (must-pass per release)

| # | Flow | Raakt |
|---|---|---|
| E2E-1 | Onboarding: signup → bedrijf → klant → dienst → eerste planning (< 15 min) | FR-101, 01 § 4.4 |
| E2E-2 | Klant + object + dienstafspraak aanmaken, beurt automatisch gegenereerd | FR-001…004/020 |
| E2E-3 | Weekplanning genereren, drag-and-drop, live herberekening | FR-021/022 |
| E2E-4 | Vergrendelde beurt blijft staan bij herplannen | FR-026, BR-200 |
| E2E-5 | Medewerker PWA: route → navigeren → afronden met foto | FR-040…044 |
| E2E-6 | Niet-thuis → klantbericht → herplan-wachtrij | FR-043, BR-015 |
| E2E-7 | Beurt uitgevoerd → conceptfactuur → finaliseren → PDF → verzenden | FR-060…064 |
| E2E-8 | Betaling via Mollie (sandbox) → webhook → status betaald | FR-063/067, BR-400 |
| E2E-9 | Herinneringsschema stuurt op +7/+14/+21 | FR-065, BR-401 |
| E2E-10 | Ziekmelding → reactief herplan-voorstel → accepteren | FR-024, BR-802 |

---

## 3. Business-rule-tests (must)

Elke harde BR heeft ≥ 1 test, incl. negatieve gevallen:

| BR | Test |
|---|---|
| BR-001 | Ideale datum = laatste `uitgevoerd` + interval (niet geplande datum) |
| BR-200 | Vergrendelde beurt wordt door optimalisatie/herplan niet verplaatst |
| BR-202 | Route > 8,5u wordt geweigerd/gewaarschuwd |
| BR-020 | Factuurnummers gap-loos; gefinaliseerde factuur immutable |
| BR-403 | Dubbele betaling → overschot-afhandeling |
| BR-040 | Klant met facturen kan niet hard verwijderd worden |
| BR-600/601 | Geen WhatsApp zonder opt-in; opt-out gerespecteerd |
| BR-801 | Twee diensten zelfde object/week → gecombineerde stop, twee factuurregels |

---

## 4. RLS- & autorisatietests (must, security-kritiek)

- **Tenant-isolatie (NFR-301):** per tabel een negatieve test — gebruiker van bedrijf A kan géén data van bedrijf B lezen/schrijven, ongeacht query.
- **Rol-permissies (23):** medewerker krijgt 403 op facturen/prijzen; planner kan geen facturen muteren; administratie geen planning-mutaties.
- **Kolomniveau:** prijs-/factuurvelden ontbreken in medewerker-responses (niet slechts client-side verborgen).
- **Webhook-integriteit (NFR-307):** ongeldige signature wordt afgewezen; idempotentie bij duplicate.

---

## 5. Edge-case-tests (PRD § 16)

| PRD | Scenario | Verwacht |
|---|---|---|
| E-01 | Adres niet geocodeerbaar | Object opslaan, "handmatige locatie", niet routeerbaar tot opgelost |
| E-02 | Twee dienstafspraken zelfde object/week | Gecombineerde stop |
| E-03 | Medewerker 's ochtends ziek | Reactief herplan, onplaatsbaar → wachtrij |
| E-06 | Dubbel betaalde factuur | Overschot terugbetalen/verrekenen |
| E-07 | WhatsApp geweigerd/geen WhatsApp | Fallback e-mail, kanaalvlag |
| E-08 | Zomer-/wintertijd op routedag | Correcte tijden (UTC-opslag, Europe/Amsterdam-render) |
| E-09 | Abonnementslimiet medewerkers | Soft-block met upgrade-prompt |

---

## 6. Niet-functionele tests

| Categorie | Test | Norm |
|---|---|---|
| Performance | Lighthouse mobiel 4G | NFR-101/104 |
| Performance | Routeberekening 60 stops | NFR-103 (< 3s koud) |
| Toegankelijkheid | axe-scan + toetsenbordtest | NFR-601/602 |
| Security | Dependency-scan, secret-scan, ASVS-checklist | NFR-302/304 |
| Load | Query-performance bij 5.000 objecten/tenant | NFR-503/504 |
| Offline (PWA) | Scenario's PWA-01…06 | 20_PWA.md § 7 |
| DST | Beurten rond 26 mrt / 29 okt | E-08 |

---

## 7. Testdata & omgevingen

- **Omgevingen:** lokaal (Supabase local) → preview (per PR, Vercel) → productie.
- **Seed-data:** representatief glazenwasser-bedrijf (klanten, objecten, dienstafspraken, historische beurten) voor E2E/handmatig.
- **Externe providers in test:** Mollie sandbox, Mapbox test-token, WhatsApp/360dialog sandbox; adapters mockbaar in unit/integratie.
- **Isolatie:** elke testrun eigen tenant; teardown ruimt op.

---

## 8. CI/CD-integratie

- Unit + integratie + lint draaien op elke PR (blokkerend).
- E2E-kernflows op PR naar `main` + nightly volledige suite.
- Lighthouse/axe op preview-deploy.
- Rode test = geen merge/deploy.

---

## 9. Release-criteria (gate)

Een release naar productie vereist:
1. Alle **must** E2E-flows groen (§ 2).
2. Alle harde **BR**- en **RLS**-tests groen (§ 3–4).
3. Alle **must-NFR's** van de fase gehaald (09 § 11).
4. Geen open kritieke/hoge bugs.
5. Handmatige UAT + 15-min-test akkoord.

---

## 10. Handmatige UAT per persona

| Persona | Scenario |
|---|---|
| Frans (eigenaar) | Onboarding zonder handleiding; weekplanning; facturen finaliseren |
| Piet (ZZP) | Alles op telefoon: klant, route, afvinken, factuur |
| Mariska (administratie) | Facturen controleren (BTW/nummering), herinneringen, debiteuren |
| Jeroen (medewerker) | Dagroute, navigatie, afvinken met foto, niet-thuis, offline |

---

## Changelog

| Datum | Versie | Wijziging |
|---|---|---|
| 2026-07-06 | 1.0 | Placeholder met test-types |
| 2026-07-07 | 2.0 | Volledige uitwerking: testpiramide, 10 kritieke E2E-flows, BR-/RLS-/edge-case-testmatrices, niet-functionele tests, testdata/omgevingen, CI/CD, release-gate, UAT per persona |
