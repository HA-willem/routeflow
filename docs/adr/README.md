# Architecture Decision Records — ServOps

Dit is het register van architectuurbeslissingen voor ServOps. Elke ADR legt een **onomkeerbare of kostbaar-te-wijzigen** architectuurkeuze vast: context, probleem, gekozen oplossing, alternatieven, consequenties en toekomstbestendigheid.

**Bron van waarheid:** `../00_PRD.md`. Een ADR mag het PRD niet tegenspreken; bij conflict wint het PRD totdat het PRD expliciet wordt aangepast (zie `../MASTER_PROMPT.md`).

**Status-conventie:** Proposed → Accepted → (Superseded by ADR-xxx | Deprecated). Nieuwe ADR's krijgen het eerstvolgende vrije nummer; nummers zijn stabiel en worden nooit hergebruikt.

## Register

| ADR | Titel | Status |
|---|---|---|
| [ADR-001](ADR-001-nextjs-react.md) | Next.js (App Router) + React als frontend-framework | Accepted |
| [ADR-002](ADR-002-supabase.md) | Supabase als backend-platform | Accepted |
| [ADR-003](ADR-003-postgresql-rls.md) | PostgreSQL + Row-Level Security als datafundament | Accepted |
| [ADR-004](ADR-004-multi-tenancy.md) | Multi-tenancy: gedeelde database met RLS-isolatie | Accepted |
| [ADR-005](ADR-005-mapbox.md) | Mapbox als routing-/geocoding-provider | Accepted |
| [ADR-006](ADR-006-360dialog.md) | 360dialog als WhatsApp Business Solution Provider | Accepted |
| [ADR-007](ADR-007-provider-adapter-pattern.md) | Provider Adapter Pattern voor externe integraties | Accepted |
| [ADR-008](ADR-008-edge-functions.md) | Supabase Edge Functions voor server-side domeinlogica | Accepted |
| [ADR-009](ADR-009-pwa-architecture.md) | PWA-architectuur voor de medewerker-uitvoering | Accepted |
| [ADR-010](ADR-010-ai-planner-architecture.md) | AI Planner — drielagen-architectuur | Accepted |
| [ADR-011](ADR-011-human-in-the-loop-ai.md) | Human-in-the-Loop AI — Agent-orchestratie & Morning Briefing | Accepted |
| [ADR-012](ADR-012-ai-execution-pipeline.md) | AI Execution Pipeline — runtime-samenwerking tussen agents | Accepted |
| [ADR-013](ADR-013-platform-admin-product-agent.md) | Platform Admin & Product Agent — zelfverbeterend product met menselijke goedkeuring | Accepted |
| [ADR-014](ADR-014-command-bar-intent-routing.md) | Command Bar Intent Routing via LLM — taalmodel routeert, beslist niet | Accepted |

## Relaties

- `../33_Roadmap.md` en `../40_Implementatieplan.md` bouwen op deze beslissingen.
- Productbeslissingen A-04 t/m A-08 (`../00_PRD.md` § 19) zijn hier architecturaal uitgewerkt (ADR-005, ADR-006).
- ADR-011 generaliseert ADR-010 naar een meervoudige agent-architectuur; `../43_AI_Agents.md` is de operationele uitwerking per agent.
- ADR-012 specificeert de technische runtime-mechaniek (orchestratie, execution pipeline, kosten, failure handling) waarmee ADR-011's agents daadwerkelijk uitvoeren — de *hoe*-laag onder ADR-011's *wat/waarom*.
- ADR-013 past hetzelfde Human-Approval-principe (ADR-011 § 4) toe op de codebase zelf — een orthogonale autorisatiedimensie (platform-admin) los van de tenant-RLS-grens (ADR-003/004); `../46_PlatformAdmin.md` is de operationele uitwerking.
- ADR-014 is de eerste taalmodel-integratie in het project, bewust smal afgebakend (routeert vrije Command Bar-tekst naar bestaande, deterministische acties) om ADR-010's afwijzing van "black-box ML-first" agents niet te doorbreken.
