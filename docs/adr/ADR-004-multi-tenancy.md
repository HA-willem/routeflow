# ADR-004: Multi-tenancy — gedeelde database met RLS-isolatie op `company_id`

- **Status:** Accepted
- **Datum:** 2026-07-07
- **Beslisser:** Chief Software Architect (RouteFlow)
- **Bron van waarheid:** `00_PRD.md` § 6.1 (Bedrijf/tenant), § 12.2
- **Gerelateerd:** ADR-003 (PostgreSQL + RLS), ADR-002 (Supabase); 11_DatabaseConcept.md, 22_Authenticatie.md, 36_Security.md, 38_Schaalbaarheid.md

---

## Context

Elke klant van RouteFlow is een **Bedrijf** (tenant); data is strikt gescheiden (PRD § 6.1). De schaal-ambitie is **10.000 bedrijven** met elk tot 50 medewerkers en 5.000 objecten (PRD § 13). Een gebruiker kan (edge case: franchise) lid zijn van meerdere bedrijven, maar werkt in de context van één actief bedrijf.

## Probleem

Welk multi-tenancy-model biedt sterke isolatie **en** beheersbaarheid op de schaal van tienduizenden tenants, met acceptabele kosten en migratielast?

## Gekozen oplossing

**Gedeelde database, gedeeld schema, isolatie via RLS op `company_id`.**

- Elke tabel draagt `company_id`; RLS dwingt tenant-scope af (ADR-003).
- Tenant-context komt uit de JWT (`user_metadata.company_id`, 22).
- Multi-bedrijf-lidmaatschap: actief bedrijf in sessie; wisselen herlaadt context (22 § 5).
- Groeipad: individuele zeer grote tenants kunnen later worden geïsoleerd (dedicated instance/sharding) zonder domeinwijziging.

## Alternatieven

| Alternatief | Isolatie | Schaalbaarheid | Oordeel |
|---|---|---|---|
| **Gedeeld schema + RLS (gekozen)** | Sterk (DB-afgedwongen) | Uitstekend bij 10k tenants | ✅ |
| **Schema-per-tenant** | Sterker | Migraties × N schema's; ops-last | ❌ te zwaar |
| **Database-per-tenant** | Sterkst | Onbeheersbaar bij 10k (kosten/migraties/connections) | ❌ |
| **Applicatie-filtering** | Zwak | — | ❌ verboden als enige verdediging (PRD § 12.2) |

## Consequenties

**Positief**
- Eén schema en migratiepad voor alle tenants → lage beheerlast, snelle iteratie.
- Kostenefficiënt op schaal (gedeelde resources).
- Isolatie DB-afgedwongen (NFR-301), niet afhankelijk van applicatiecode.

**Negatief / risico's**
- "Noisy neighbor": zware tenant kan gedeelde resources belasten.
- Eén RLS-policyfout raakt in principe alle tenants (hoge impact).
- Grote gedeelde tabellen vragen zorgvuldige indexering/partitionering.

**Mitigaties**
- Tenant-first indexen (11 § 4); partitionering op `company_id`/tijd als optie (38, BL-042).
- Verplichte negatieve RLS-tests + review van elke policy (31 § 4, 36).
- Cron-spreiding en per-tenant-batching tegen piekbelasting (38 § 3).
- Escape-hatch: dedicated instance voor uitzonderlijk grote tenants.

## Waarom deze keuze toekomstbestendig is

Het gedeelde-schema-met-RLS-model is de industriestandaard voor B2B-SaaS die van tientallen naar tienduizenden tenants groeit, juist omdat het isolatie en beheersbaarheid combineert. Omdat `company_id` overal aanwezig is, blijven latere optimalisaties (partitionering, read-replica's, of het afsplitsen van een zware tenant) **additief** — geen herontwerp. Het model dwingt vanaf dag één de discipline af die op schaal nodig is, en sluit naadloos aan op de schaal-NFR's (38). Zo ondersteunt het de weg naar marktleiderschap (PRD § 3) zonder architectuurbreuk.

## Referenties

- PRD § 6.1, § 12.2, § 13 (schaal-NFR)
- 11_DatabaseConcept.md, 22_Authenticatie.md, 36_Security.md, 38_Schaalbaarheid.md
