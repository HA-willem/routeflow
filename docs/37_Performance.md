# 37 — Performance & Optimalisatie

**Status:** DONE
**Versie:** 2.0
**Bron van waarheid:** `00_PRD.md` § 13 (NFR performance), § 11.3 (snelheid als beleving) — dit document mag het PRD niet tegenspreken.
**Werkinstructie:** zie `MASTER_PROMPT.md`.
**Relaties:** 09_NietFunctioneleEisen.md (NFR-1xx), 14_RoutingEngine.md (routebudget), 11_DatabaseConcept.md (indexen), 38_Schaalbaarheid.md, 20_PWA.md.

---

## Doel van dit document

Dit document vertaalt de performance-NFR's naar concrete **budgetten, technieken en meetpunten**. Snelheid is in ServOps een belevingsfeature (PRD § 11.3): optimistic UI, skeletons < 100ms, instant-voelende navigatie.

---

## 1. Performancebudgetten (samengevat uit NFR-1xx)

| Metriek | Budget | Meting |
|---|---|---|
| TTI kernpagina's (4G, p75) | < 2 s | Lighthouse mobiel |
| FCP (4G, p75) | < 1 s | Lighthouse |
| Interactiefeedback (INP) | < 100 ms | RUM |
| Routeberekening 60 stops (koud) | < 3 s | Server-timing (14 § 7) |
| Drag-drop-herberekening (warm) | < 2 s | Server-timing |
| PDF-factuur | < 2 s | Edge-Function-timing |
| Planning-query bij 5.000 objecten (p95) | < 300 ms | DB-benchmark |

---

## 2. Frontend-technieken

- **RSC / server components** (Next.js App Router): minder client-JS, snellere first load.
- **Code-splitting & lazy loading:** zware componenten (kaart, grafiek, RouteBoard) op aanvraag.
- **Prefetching:** links/intent-based prefetch → navigatie voelt instant (NFR-105).
- **Skeletons < 100ms:** nooit blanco flash (24 § 3).
- **Optimistic UI:** mutaties tonen direct resultaat; server bevestigt async; rollback bij fout.
- **Asset-optimalisatie:** moderne beeldformaten, `max-width:100%`, gecomprimeerde uploads (foto's vóór upload knijpen, 20 § 3).
- **Fonts:** Inter met `font-display: swap`, gesubset.

---

## 3. Backend- & datatechnieken

- **Indexen** op hot paths (11 § 4): planning per dag, geo-clustering (GiST), open facturen, beschikbaarheid.
- **Afstandsmatrix-cache** (14 § 3): TTL 30 dagen; doel hitratio > 90% (NFR-505) → drastisch minder API-calls en snellere routeberekening.
- **Zware taken server-side** (Edge Functions/pg_cron): planning genereren, PDF, herplannen — nooit op de client (PRD § 12.2).
- **Anytime-algoritme** routing (14 § 5): levert beste-tot-nu-toe binnen budget.
- **Paginatie** default 50 (13 § 7); geen onbegrensde lijsten.
- **Realtime** selectief: alleen relevante tabellen/rijen binnen tenant.
- **Voorberekening/materialisatie** van dashboard-aggregaties waar query's duur zijn.

---

## 4. Netwerk & caching

| Resource | Strategie |
|---|---|
| App-shell | Precache + stale-while-revalidate (20 § 2) |
| Statische assets | Cache-first, ver-cachebare hashes; CDN (Vercel) |
| API-data | Network-first + cache-fallback (PWA) |
| Kaarttegels | Beperkte cache (licentie/kosten) |

Edge-CDN (Vercel) serveert statische content dicht bij de NL-gebruiker.

---

## 5. Meetplan

- **Lab:** Lighthouse + axe op elke preview-deploy (35 § 3).
- **Veld (RUM):** Vercel Analytics voor Core Web Vitals (LCP/INP/CLS), p75 mobiel.
- **Server:** timing-logs voor routeberekening, PDF, planning-jobs; alerts bij budgetoverschrijding.
- **DB:** query-benchmarks met representatieve dataset (5.000 objecten/tenant, 38).

---

## 6. Regressiebewaking

- Performance-budgetten zijn onderdeel van de release-gate (31 § 9): budgetoverschrijding = release-blocker net als een bug.
- Lighthouse-CI-drempels op kernpagina's; trend gemonitord.

---

## 7. Bekende zware punten & mitigatie

| Punt | Risico | Mitigatie |
|---|---|---|
| Afstandsmatrix N×N | API-kosten + latency | Cache + tegeling (14 § 3); OSRM-fallback (BL-040) |
| Weekplanning veel stops | Rekentijd | Anytime-heuristiek, server-side, budget 3s |
| Dashboard-aggregaties | Query-kosten | Voorberekening/caching |
| Foto-uploads mobiel | Trage upload | Compressie + achtergrond-upload (queue) |
| Grote klantenlijsten | Renderkosten | Paginatie + virtualisatie |

---

## 8. Openstaande punten

Geen open beslissingen. Concrete budget-fijnafstelling gebeurt met echte metingen tijdens de codefase; de budgetten hier zijn de harde bovengrenzen (NFR-1xx).

---

## Changelog

| Datum | Versie | Wijziging |
|---|---|---|
| 2026-07-06 | 1.0 | Placeholder met targets |
| 2026-07-07 | 2.0 | Volledige uitwerking: budgetten-tabel, frontend-/backend-/datatechnieken, netwerk/caching, meetplan (lab+RUM+server+DB), regressiebewaking in release-gate, zware punten met mitigatie |
