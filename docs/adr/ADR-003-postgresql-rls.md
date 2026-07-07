# ADR-003: PostgreSQL + Row-Level Security als datafundament

- **Status:** Accepted
- **Datum:** 2026-07-07
- **Beslisser:** Chief Software Architect (RouteFlow)
- **Bron van waarheid:** `00_PRD.md` § 12.2 (RLS-multitenancy)
- **Gerelateerd:** ADR-002 (Supabase), ADR-004 (Multi-tenancy), ADR-008 (Edge Functions); 11_DatabaseConcept.md, 23_Gebruikersrollen.md, 36_Security.md

---

## Context

RouteFlow is een multi-tenant SaaS waarin elke datalek tussen bedrijven onaanvaardbaar is (NFR-301). Daarnaast bevat het domein sterk relationele data (klanten → objecten → dienstafspraken → beurten → routes/facturen) en **geodata** voor route-clustering (PostGIS). Autorisatie is fijnmazig: medewerkers mogen bijvoorbeeld geen prijzen/facturen zien (PRD § 14, 23_Gebruikersrollen.md).

## Probleem

Hoe garanderen we tenant-isolatie en rolgebaseerde toegang op een manier die **niet** afhankelijk is van foutgevoelige filtering in applicatiecode, en die tegelijk complexe relationele queries en geoqueries ondersteunt?

## Gekozen oplossing

**PostgreSQL** als relationele database met **Row-Level Security (RLS)** als primaire autorisatiegrens.

- Elke tabel heeft `company_id`; RLS-policies dwingen `company_id = current_company_id()` af op databaseniveau (11 § 1).
- `current_company_id()` leest de tenant uit de JWT-claim (ADR-002, 22_Authenticatie.md).
- Rolregels (23) worden aanvullend via policies/grants en kolomniveau afgedwongen (bv. prijsvelden uitgesloten voor medewerkers).
- **PostGIS** voor geodata en clustering (`ST_DWithin`, GiST-index) t.b.v. de AI Planner (ADR-010, 14/15).

## Alternatieven

| Alternatief | Waarom niet |
|---|---|
| **Tenant-filtering in applicatiecode** | Eén vergeten `WHERE company_id` = datalek; verboden als enige verdediging (PRD § 12.2) |
| **Database-per-tenant** | Sterke isolatie maar onbeheersbaar bij 10.000 tenants (migraties, kosten, ops) — zie ADR-004 |
| **NoSQL (document store)** | Relationele integriteit en geoqueries zwak; RLS-equivalent ontbreekt |
| **Schema-per-tenant** | Beheer- en migratielast schaalt slecht; PostGIS-indexen dupliceren |

## Consequenties

**Positief**
- Isolatie afgedwongen door de database → robuust tegen applicatiebugs (defense-in-depth, 36).
- Relationele integriteit (FK's, constraints) borgt businessregels (bv. BR-020 gap-loze nummering).
- PostGIS levert performante geo-clustering zonder externe geo-store.

**Negatief / risico's**
- RLS-policies vereisen zorgvuldig ontwerp en testen; fouten in policies zijn subtiel.
- Complexe policies kunnen query-planning beïnvloeden (performance).

**Mitigaties**
- Verplichte **negatieve RLS-tests** per tabel (31 § 4, NFR-301) als release-gate.
- Tenant-bewuste indexen beginnen met `company_id` (11 § 4) voor selectiviteit.
- Policies horen bij de migratie van hun tabel (35 § 4) — nooit los toegevoegd.

## Waarom deze keuze toekomstbestendig is

PostgreSQL is een van de meest volwassen, langst-ondersteunde databases ter wereld; RLS en PostGIS zijn stabiele, bewezen kernfeatures. Door isolatie in de datalaag te verankeren blijft de garantie overeind ongeacht toekomstige wijzigingen in de applicatielaag of zelfs een frontend-herbouw. Het schema is porteerbaar (NFR-704), zodat groei naar zeer grote schaal (sharding/partitionering, 38) of een andere Postgres-host mogelijk blijft zonder het beveiligingsmodel te herzien. De keuze schaalt mee van MVP tot marktleiderschap zonder architectuurbreuk.

## Referenties

- PRD § 12.2, § 13 (NFR-301), § 14 (autorisatie)
- 11_DatabaseConcept.md, 23_Gebruikersrollen.md, 36_Security.md, 38_Schaalbaarheid.md
