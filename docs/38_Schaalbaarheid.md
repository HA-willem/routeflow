# 38 — Schaalbaarheid & Load

**Status:** DONE
**Versie:** 2.0
**Bron van waarheid:** `00_PRD.md` § 13 (schaal-NFR), § 12 (architectuur) — dit document mag het PRD niet tegenspreken.
**Werkinstructie:** zie `MASTER_PROMPT.md`.
**Relaties:** 09_NietFunctioneleEisen.md (NFR-5xx), 37_Performance.md, 11_DatabaseConcept.md (indexen), 14_RoutingEngine.md (routing-schaal), 35_Deployment.md.

---

## Doel van dit document

Dit document beschrijft hoe ServOps **schaalt** naar de doelgetallen uit PRD § 13, welke onderdelen het eerst knellen (bottlenecks), en welke architectuurkeuzes en mitigaties dat opvangen. Ontwerpuitgangspunt: de architectuur is *van dag één* ontworpen voor schaal (multi-tenant RLS, stateless compute, cachebare zware taken), maar wordt gefaseerd gevalideerd (33/34).

---

## 1. Schaal-targets (NFR-5xx)

| Dimensie | Doel |
|---|---|
| Bedrijven (tenants) | 10.000 |
| Medewerkers per bedrijf | 50 |
| Objecten per bedrijf | 5.000 |
| Beurten per bedrijf per week | 500+ |
| Planning-query p95 (5.000 objecten) | < 300 ms |
| Afstandsmatrix-cache hitratio | > 90% na inloop |

Ordegrootte totaal: ~10k tenants × duizenden objecten = miljoenen rijen in `objects`/`jobs`/`invoices` — ruim binnen PostgreSQL-bereik mits correct geïndexeerd en gepartitioneerd waar nodig.

---

## 2. Multi-tenant schaalmodel

- **Gedeelde database, RLS-isolatie** (PRD § 12.2): één schema, `company_id` overal, RLS-policies. Efficiënter dan database-per-tenant bij 10k tenants (beheer/kosten), met sterke isolatie (36 § 1).
- **Indexen zijn tenant-bewust:** samengestelde indexen beginnen met `company_id` (11 § 4) zodat queries per tenant selectief blijven ongeacht totale omvang.
- **Groei-optie:** zeer grote tenants kunnen later naar een eigen instance (sharding per tenant) zonder domeinwijziging — schema is portabel (NFR-704).

---

## 3. Compute-schaal

| Component | Schaalgedrag |
|---|---|
| Frontend (Next.js/Vercel) | Stateless, edge, horizontaal automatisch |
| Edge Functions (planning, PDF, webhooks) | Stateless, schalen per request; zwaar werk asynchroon |
| Cron-jobs (aankondiging, herinneringen, planning) | Gespreid/gebatcht per tenant; niet alles tegelijk om 18:00 (spreiding) |
| Database | Verticaal (Supabase-tier) + read-replica's voor lees-zware rapportage (V2) |

**Cron-spreiding:** 10k tenants × dagelijkse jobs vereist spreiding (jitter/wachtrij) om piekbelasting te vermijden — geen "thundering herd" op één tijdstip.

---

## 4. Bottlenecks & mitigaties

| # | Bottleneck | Symptoom @ schaal | Mitigatie |
|---|---|---|---|
| SC-1 | Afstandsmatrix N×N | API-kosten + latency; externe rate-limits | Cache (14 § 3, hitratio > 90%); tegeling; **OSRM self-host** (BL-040) |
| SC-2 | Planning-generatie voor veel tenants | Cron-piek | Spreiding + per-tenant-batching; anytime-algoritme |
| SC-3 | Grote tabellen (`jobs`, `invoices`) | Trage queries/writes | Tenant-first indexen; overweeg partitionering op `company_id`/tijd (V2) |
| SC-4 | Geo-queries (clustering) | Kosten PostGIS | GiST-index (11 § 4); buurt-clustering begrensd tot tenant |
| SC-5 | Realtime fan-out | Veel WebSocket-abonnees | Selectieve subscripties per tenant/rij; RLS op realtime |
| SC-6 | Rapportage-aggregaties | Zware scans | Voorberekening/materialized views; read-replica (V2) |
| SC-7 | Storage (foto's/PDF's) | Volume-groei | Objectopslag schaalt; levenscyclus/retentie; compressie |
| SC-8 | E-mail/WhatsApp-volume | Provider-limieten/kosten | Bundeling (19 § 9, 21 § 4); tier-gebaseerde doorbelasting |

---

## 5. Datagroei & retentie

- **Beurten/facturen** groeien lineair met tenants × activiteit; historische data blijft (audit/AVG), maar hoeft niet "hot" te zijn → archiveringsstrategie/partitionering voor oude periodes (V2).
- **Berichtlogs** met retentiebeleid (36 § 7.3) om ongelimiteerde groei te voorkomen.
- **Distance-cache** zelfregulerend via TTL (30 dgn) — groeit met unieke object-paren, niet met tijd.

---

## 6. Load-testplan (→ 31_Testplan.md)

| Test | Scenario | Norm |
|---|---|---|
| LT-1 | 5.000 objecten in één tenant, planning-query | p95 < 300 ms (NFR-504) |
| LT-2 | Weekplanning-generatie voor grote tenant | Binnen budget, geen timeouts |
| LT-3 | Gelijktijdige cron-run gesimuleerd voor N tenants | Spreiding houdt piek < capaciteit |
| LT-4 | Concurrent drag-drop/herberekening | < 2 s warm onder last |
| LT-5 | Storage-groei/upload onder volume | Geen degradatie |

Uitgevoerd met representatieve seed-data vóór V1-launch (schaal-NFR's = V1, 33).

---

## 7. Kostenschaal (kort)

- Grootste variabele kosten @ schaal: route-API en messaging. Beide gemitigeerd via caching/bundeling en doorbelastbaar in tier (PRD § 18).
- Supabase/Vercel-tiers schalen met gebruik; monitoring op kostentrends naast performancetrends.

---

## 8. Openstaande punten

Geen open beslissingen. Concrete keuzes over partitionering en read-replica's worden pas gemaakt wanneer meetdata (LT-1…5) daar aanleiding toe geeft — voortijdig optimaliseren wordt vermeden. Genoteerd als BL-042 (34).

---

## Changelog

| Datum | Versie | Wijziging |
|---|---|---|
| 2026-07-06 | 1.0 | Placeholder met scale-targets |
| 2026-07-07 | 2.0 | Volledige uitwerking: schaal-targets, multi-tenant/compute-schaalmodel, cron-spreiding, 8 bottlenecks met mitigatie, datagroei/retentie, load-testplan, kostenschaal |
