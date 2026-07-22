# ADR-002: Supabase als backend-platform (BaaS)

- **Status:** Accepted
- **Datum:** 2026-07-07
- **Beslisser:** Chief Software Architect (ServOps)
- **Bron van waarheid:** `00_PRD.md` § 12.1 (vastgestelde stack)
- **Gerelateerd:** ADR-003 (PostgreSQL + RLS), ADR-004 (Multi-tenancy), ADR-008 (Edge Functions); 11_DatabaseConcept.md, 13_API_Specificatie.md, 22_Authenticatie.md, 35_Deployment.md

---

## Context

ServOps moet snel naar de markt met een klein team, maar tegelijk voldoen aan stevige eisen: multi-tenant isolatie (NFR-301), EU-datalocatie/AVG (NFR-401), realtime planning-updates, bestandsopslag (foto's/PDF's), authenticatie en server-side domeinlogica (PRD § 12). We willen geen zelfgebouwde, te onderhouden backend-infrastructuur.

## Probleem

Welk backend-platform levert database, auth, storage, realtime én serverless functies met **PostgreSQL als kern** (i.v.m. RLS en PostGIS), EU-hosting, en een lage operationele last — zonder ons vast te ketenen aan een niet-porteerbaar datamodel?

## Gekozen oplossing

**Supabase** als geïntegreerd backend-platform:

- **PostgreSQL** (managed) als database, met **RLS** en **PostGIS** (ADR-003/004, 14_RoutingEngine.md).
- **Supabase Auth** (JWT) — koppelt aan RLS via `company_id`-claim (22_Authenticatie.md).
- **Storage** (S3-compatibel) voor foto's/PDF's.
- **Edge Functions** (Deno) voor server-side domeinlogica en webhooks (ADR-008).
- **Realtime** voor live planning-updates.
- **EU-region** voor AVG-conformiteit (NFR-401).

## Alternatieven

| Alternatief | Waarom niet |
|---|---|
| **Firebase** | NoSQL (Firestore) past slecht bij relationele planning-/facturatiedata en RLS; geen PostGIS |
| **Zelf gebouwd (Node/Nest + eigen Postgres)** | Meer controle, maar veel hogere ops-last (auth, realtime, storage, backups zelf bouwen) — te traag voor MVP |
| **AWS (RDS + Cognito + Lambda + S3)** | Zeer capabel maar complexer op te zetten/beheren; hogere time-to-market voor klein team |
| **PlanetScale/Neon + losse auth/storage** | Losse componenten stikken samen; minder geïntegreerd dan Supabase |

## Consequenties

**Positief**
- Eén samenhangend platform → hoge ontwikkelsnelheid, minder glue-code.
- PostgreSQL-kern maakt RLS-multitenancy en PostGIS-geoqueries native mogelijk.
- Ingebouwde auth/storage/realtime dekken meerdere NFR's out-of-the-box.

**Negatief / risico's**
- Platform-afhankelijkheid van Supabase-features (bv. realtime, edge-runtime).
- Edge Functions draaien op Deno-runtime (aandachtspunt bij libraries).

**Mitigaties**
- Schema is **standaard PostgreSQL** en porteerbaar (NFR-704); geen niet-porteerbare constructies.
- Externe integraties achter adapters (ADR-007); domeinlogica in SQL/Edge Functions blijft verplaatsbaar.
- Vendor-risico expliciet als "laag/middel" erkend (PRD § 18) met portable-schema-mitigatie.

## Waarom deze keuze toekomstbestendig is

Doordat de **kern gewoon PostgreSQL is**, is de belangrijkste asset (het datamodel + RLS-policies + PostGIS) porteerbaar naar elke Postgres-host; Supabase levert vooral het gemak eromheen. De afhankelijkheid zit dus in convenience-lagen, niet in het hart van het systeem. Dit maakt een eventuele migratie (bv. naar zelf-gehoste Postgres of RDS bij zeer grote schaal) een infrastructuurproject, niet een herbouw. Combinatie met adapters (ADR-007) houdt ook externe koppelingen vervangbaar. Zo blijft de architectuur meegroeien van 1 tot 10.000 tenants (38_Schaalbaarheid.md) zonder fundamentele koersverlegging.

## Referenties

- PRD § 12 (architectuur), § 13 (NFR), § 18 (vendor-risico)
- 11_DatabaseConcept.md, 22_Authenticatie.md, 35_Deployment.md, 38_Schaalbaarheid.md
