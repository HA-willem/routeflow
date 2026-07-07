# ADR-008: Supabase Edge Functions voor server-side domeinlogica

- **Status:** Accepted
- **Datum:** 2026-07-07
- **Beslisser:** Chief Software Architect (RouteFlow)
- **Bron van waarheid:** `00_PRD.md` § 12.2 (domeinlogica server-side, nooit in de client)
- **Gerelateerd:** ADR-002 (Supabase), ADR-001 (Next.js), ADR-007 (Provider Adapter Pattern); 13_API_Specificatie.md § 4, 14_RoutingEngine.md § 7, 35_Deployment.md

---

## Context

RouteFlow bevat zware, gevoelige of tijdgebonden server-side operaties: planning genereren, routes optimaliseren, PDF's genereren, webhook-verwerking (Mollie/WhatsApp), en geplande taken (aankondigingen, herinneringen). PRD § 12.2 is expliciet: *"planningsgeneratie en factuurjobs draaien server-side (scheduled edge functions / pg_cron), nooit in de client."* Deze logica moet dicht bij de database draaien, secrets veilig bewaren, en binnen strikte performancebudgetten blijven (14 § 7, 37).

## Probleem

Waar draait domeinlogica die (a) niet in de client mag/kan (security, secrets, zware berekening), (b) dicht bij Postgres/RLS moet zitten, en (c) zowel event-driven (webhooks, gebruikersacties) als tijdgestuurd (cron) getriggerd moet kunnen worden?

## Gekozen oplossing

**Supabase Edge Functions** (Deno-runtime) als de plek voor server-side domeinlogica, aangevuld met **pg_cron** voor tijdgestuurde taken.

- **RPC-endpoints** (13 § 4): `planning-generate`, `route-optimize`, `route-move-job`, `replan`, `invoice-finalize`, `invoice-credit`, `notify-send`, `geocode`.
- **Webhooks** (13 § 5): `webhooks/mollie`, `webhooks/whatsapp` — signature-verificatie, idempotentie.
- **Cron-jobs**: aankondigingen (T-1 18:00), betaalherinneringen, planning-verversing (21 § 4, 16 § 7).
- Edge Functions roepen providers uitsluitend via adapters aan (ADR-007) en schrijven met de service-rol dicht bij RLS-context.

## Alternatieven

| Alternatief | Waarom niet |
|---|---|
| **Logica in Next.js API-routes (Vercel Functions)** | Werkt, maar verspreidt server-logica over twee platformen (Vercel + Supabase) i.p.v. één samenhangende backend; cron-integratie minder natuurlijk |
| **Losse Node-backend (Nest/Express) op eigen infra** | Extra infrastructuur/ops-last; verliest Supabase-integratie (RLS-context, service-rol) |
| **Alles client-side laten rekenen** | Expliciet verboden (PRD § 12.2): lekt secrets, onbetrouwbaar, geen controle over zware berekeningen |
| **Message queue + workers (bv. SQS/BullMQ)** | Overengineering voor huidige schaal; introduceert extra infrastructuur zonder duidelijke MVP-winst |

## Consequenties

**Positief**
- Eén platform (Supabase) voor database én server-logica → minder bewegende delen, snellere levering.
- Dicht bij Postgres: lage latency naar de data, natuurlijke plek voor RLS-bewuste service-calls.
- Cron + Edge Functions dekken zowel event-driven als tijdgestuurde behoeften zonder extra infrastructuur.

**Negatief / risico's**
- Deno-runtime wijkt af van Node — sommige npm-packages vereisen aandacht/compat-laag.
- Cold starts en runtime-limieten bij zeer zware taken (bv. grote routeberekeningen) vragen monitoring.
- Cron-piek bij 10.000 tenants kan gelijktijdige runs veroorzaken.

**Mitigaties**
- Performancebudgetten en anytime-algoritme voor routing (14 § 5/§ 7) i.p.v. onbegrensde rekentijd.
- Cron-spreiding/batching per tenant tegen piekbelasting (38 § 3).
- Job-monitoring en alerting op cron-mislukkingen (NFR-703, 35 § 6).
- Zware/afwijkende workloads kunnen later verplaatst worden naar een aparte worker-service zonder de RPC-contracten (13) te wijzigen.

## Waarom deze keuze toekomstbestendig is

Door domeinlogica achter stabiele RPC-contracten (13_API_Specificatie.md § 4) te plaatsen — en niet rechtstreeks te verweven met een specifieke runtime — blijft de *architectuur* onafhankelijk van waar de code precies draait. Mocht Edge Functions bij extreme schaal (38) tegen limieten aanlopen, dan is de exit-strategie een verplaatsing van specifieke functies naar een dedicated workerproces, met behoud van dezelfde interfaces en RLS-discipline. Voor de fase waarin RouteFlow zich bevindt (MVP → V1 → V2, 33_Roadmap.md) geeft deze keuze de snelste, veiligste route naar een werkend, schaalbaar systeem met minimale infrastructuurlast.

## Referenties

- PRD § 12.2, § 13 (performance-NFR)
- 13_API_Specificatie.md § 4–5, 14_RoutingEngine.md § 7, 35_Deployment.md, 38_Schaalbaarheid.md
