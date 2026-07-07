# 09 — Niet-Functionele Eisen

**Status:** DONE
**Versie:** 2.0
**Bron van waarheid:** `00_PRD.md` § 13 (Niet-functionele Requirements) — dit document mag het PRD niet tegenspreken.
**Werkinstructie:** zie `MASTER_PROMPT.md`.
**Relaties:** 36_Security.md, 37_Performance.md, 38_Schaalbaarheid.md, 35_Deployment.md, 31_Testplan.md.

---

## Doel van dit document

Dit document specificeert de **niet-functionele requirements (NFR-xxx)**: meetbare kwaliteitseisen aan performance, beschikbaarheid, security, privacy, schaalbaarheid, toegankelijkheid en onderhoudbaarheid. Elke NFR is **meetbaar** (target + meetmethode) en **verifieerbaar** (hoe getest — 31_Testplan.md).

Waar PRD § 13 een samenvatting geeft, werkt dit document elke eis uit tot een toetsbare norm. Nummering NFR-### is stabiel.

---

## 1. Conventies

- **NFR-###:** genummerd per categorie.
- Elke NFR heeft: **eis**, **target** (meetbaar), **meetmethode**, **prio** (Must/Should), **fase**.
- "Must" = release-blokkerend als niet gehaald; "Should" = sterk gewenst, afweegbaar.

---

## 2. Performance (NFR-1xx)

| ID | Eis | Target | Meetmethode | Prio | Fase |
|---|---|---|---|---|---|
| NFR-101 | Time-to-interactive kernpagina's op 4G | < 2 s | Lighthouse (mobiel, 4G-throttle), p75 | Must | MVP |
| NFR-102 | Feedback op interactie (klik/tik) | < 100 ms | Manuele + RUM (Interaction to Next Paint) | Must | MVP |
| NFR-103 | Routeberekening dag | < 3 s voor 60 stops (koud), < 2 s warm | Server-timing log routing-engine (14_RoutingEngine.md § 7) | Must | MVP |
| NFR-104 | First Contentful Paint | < 1 s (4G, p75) | Lighthouse / Vercel Analytics | Should | MVP |
| NFR-105 | Paginanavigatie voelt instant | Prefetch + skeleton < 100 ms | RUM | Should | V1 |
| NFR-106 | PDF-factuurgeneratie | < 2 s per factuur | Edge Function-timing | Should | MVP |

**Budgetprincipe:** optimistic UI overal; zware operaties (planning, PDF, matrix) server-side (Edge Functions), nooit blokkerend op de main thread.

---

## 3. Beschikbaarheid & betrouwbaarheid (NFR-2xx)

| ID | Eis | Target | Meetmethode | Prio | Fase |
|---|---|---|---|---|---|
| NFR-201 | Uptime SaaS | ≥ 99,5% / maand | Statuspagina + externe uptime-monitor | Must | MVP |
| NFR-202 | Geplande maintenance-vensters | Aangekondigd, buiten NL-kantooruren | Changelog/statuspagina | Should | V1 |
| NFR-203 | Foutpercentage kern-endpoints | < 0,5% 5xx | Sentry / logs | Must | MVP |
| NFR-204 | Graceful degradation bij provider-uitval | Fallbacks actief (routing→Haversine, WhatsApp→e-mail) | Chaos-test (31_Testplan.md) | Must | V1 |
| NFR-205 | Herstel na incident (RTO) | < 4 uur | Runbook + oefening | Should | V1 |

---

## 4. Security (NFR-3xx)

| ID | Eis | Target | Meetmethode | Prio | Fase |
|---|---|---|---|---|---|
| NFR-301 | Multi-tenant isolatie | 100% via RLS op `company_id`; geen cross-tenant lek | RLS-testsuite (per tabel, negatieve tests) | Must | MVP |
| NFR-302 | Security-baseline | OWASP ASVS L2-richtlijn | Checklist-review + dependency-scan | Must | V1 |
| NFR-303 | Transport | TLS 1.2+ overal, HSTS | SSL Labs A+ | Must | MVP |
| NFR-304 | Secrets-beheer | Geen secrets in code/repo; Vercel/Supabase vault | Secret-scan in CI | Must | MVP |
| NFR-305 | Authenticatie | Wachtwoordbeleid + optioneel 2FA (TOTP) | 22_Authenticatie.md | Must (2FA Should) | MVP / V1 |
| NFR-306 | Autorisatie | Rolgebaseerd; medewerker ziet geen prijzen/facturen | 23_Gebruikersrollen.md, negatieve tests | Must | MVP |
| NFR-307 | Webhook-integriteit | Signature-verificatie (Mollie, 360dialog/Meta) | Integratietest | Must | V1 |

Detail: 36_Security.md.

---

## 5. Privacy & AVG (NFR-4xx)

| ID | Eis | Target | Meetmethode | Prio | Fase |
|---|---|---|---|---|---|
| NFR-401 | Datalocatie | EU (Supabase EU-region) | Config-audit | Must | MVP |
| NFR-402 | Verwerkersovereenkomsten | Met alle subverwerkers (Supabase, Vercel, Mollie, Mapbox, 360dialog) | DPA-register | Must | V1 |
| NFR-403 | Recht op inzage/export | Dataexport per bedrijf/klant (machineleesbaar) | Functionele test | Must | V1 |
| NFR-404 | Recht op verwijdering | Anonimiseren/archiveren i.p.v. hard delete waar facturen bestaan (BR-040) | Functionele test | Must | V1 |
| NFR-405 | Retentiebeleid | Gedefinieerd per datatype; berichtlogs beperkt | Beleidsdocument (36_Security.md) | Should | V1 |
| NFR-406 | Opt-in-registratie | Per klant/kanaal gelogd (BR-600) | Audit-trail | Must | V1 |

---

## 6. Schaalbaarheid (NFR-5xx)

| ID | Eis | Target | Meetmethode | Prio | Fase |
|---|---|---|---|---|---|
| NFR-501 | Aantal bedrijven | Ontwerp voor 10.000 tenants | Load-model (38_Schaalbaarheid.md) | Must | V1 |
| NFR-502 | Medewerkers per bedrijf | 50 | Idem | Must | V1 |
| NFR-503 | Objecten per bedrijf | 5.000 | Query-performance-test met indexen | Must | V1 |
| NFR-504 | Planning-query p95 | < 300 ms bij 5.000 objecten | DB-benchmark | Should | V1 |
| NFR-505 | Afstandsmatrix-cache hitratio | > 90% na inloop | Cache-metriek | Should | V1 |

---

## 7. Toegankelijkheid (NFR-6xx)

| ID | Eis | Target | Meetmethode | Prio | Fase |
|---|---|---|---|---|---|
| NFR-601 | WCAG-conformiteit | 2.1 niveau AA (doel) | axe-scan + handmatige audit | Should | V1 |
| NFR-602 | Toetsenbordbediening desktop | Volledig zonder muis | Handmatige test | Should | V1 |
| NFR-603 | Kleurcontrast | ≥ 4,5:1 tekst | Contrast-checker (25_DesignSystem.md) | Should | V1 |
| NFR-604 | Tap-targets mobiel | ≥ 44×44 px | Design-review (29_MobieleApp.md) | Must | MVP |
| NFR-605 | Donkere modus | Systeemvoorkeur-volgend | Visuele test | Should | V1 |

---

## 8. Onderhoudbaarheid & observability (NFR-7xx)

| ID | Eis | Target | Meetmethode | Prio | Fase |
|---|---|---|---|---|---|
| NFR-701 | Gestructureerde logging | JSON-logs met correlatie-id, geen PII in logs | Log-review | Must | MVP |
| NFR-702 | Error tracking | Sentry op frontend + Edge Functions | Config | Must | MVP |
| NFR-703 | Planning-job-monitoring | Cron-jobs (planning, facturen, herinneringen) gemonitord met alerting | Dashboard/alerts | Must | V1 |
| NFR-704 | Portabiliteit database | Standaard PostgreSQL, geen niet-porteerbare Supabase-lock-in in schema | Schema-review | Should | V1 |
| NFR-705 | Provider-adapters | Betalingen/WhatsApp/routing/weer achter interfaces | Code-review | Must | V1 |

---

## 9. Backup & recovery (NFR-8xx)

| ID | Eis | Target | Meetmethode | Prio | Fase |
|---|---|---|---|---|---|
| NFR-801 | Point-in-time recovery | ≤ 30 dagen terug | Supabase PITR-config | Must | V1 |
| NFR-802 | Dagelijkse backups | Automatisch, EU-opslag | Config-audit | Must | V1 |
| NFR-803 | Hersteltest | Elk kwartaal geoefend | Testverslag | Should | V1 |

---

## 10. Browser- & device-support (NFR-9xx)

| ID | Eis | Target | Prio | Fase |
|---|---|---|---|---|
| NFR-901 | Desktopbrowsers | Laatste 2 versies Chrome/Safari/Edge/Firefox | Must | MVP |
| NFR-902 | Mobiel | iOS Safari + Android Chrome (PWA) | Must | MVP |
| NFR-903 | Schermformaten | 320px (klein mobiel) t/m 4K desktop | Should | V1 |

---

## 11. Meetbaarheid & release-gate

Een release naar productie vereist dat alle **Must-NFR's** van de betreffende fase groen zijn in 31_Testplan.md. Should-NFR's worden per release afgewogen en gerapporteerd. NFR-regressies blokkeren de release net als functionele bugs.

---

## Changelog

| Datum | Versie | Wijziging |
|---|---|---|
| 2026-07-06 | 1.0 | Placeholder-tabel met 5 categorieën |
| 2026-07-07 | 2.0 | Volledige uitwerking: 9 categorieën, ~45 genummerde NFR's met meetbare targets, meetmethode, prio en fase; release-gate |
