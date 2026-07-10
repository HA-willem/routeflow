# RouteFlow

Premium SaaS voor Nederlandse servicebedrijven met terugkerende werkzaamheden (start: glazenwassers).

## Status
- ✅ `docs/00_PRD.md` — volledig geschreven (single source of truth, ~4.200 woorden; per hoofdstuk uitbreidbaar)
- ✅ `docs/MASTER_PROMPT.md` — werkinstructie voor AI-agents
- ✅ `docs/01`–`41` — documentatiefase afgerond (incl. Implementatieplan en Coding Standards)
- ✅ **Sprint 1 voltooid** — fundament, tenancy & auth (40_Implementatieplan.md)
- ✅ **Sprint 2 voltooid** — klanten, objecten, diensten & geocoding (`v0.2.0`)
- 🔄 Sprint 3 — dienstafspraken, prijzen & automatische beurt-generatie (in ontwikkeling)
- ✅ **Deployment voltooid** — Vercel live, Supabase Cloud gekoppeld (migraties 001–008)

## Deployment
- **Productie:** [routeflow-delta.vercel.app](https://routeflow-delta.vercel.app) (Vercel)
- **Database:** Supabase Cloud project "Routeflow" (eu-west-1), RLS-multitenancy, migraties 001–008 toegepast
- Lokale ontwikkeling gebruikt de Supabase CLI (`npx supabase start`) tegen een losse lokale instantie — zie `41_CodingStandards.md` § 8/9.

## Werkwijze (met Claude Code)
1. Open deze map in VS Code.
2. Start Claude Code in de projectroot.
3. Werk sprint voor sprint volgens `docs/40_Implementatieplan.md`, feature voor feature, met lint/typecheck/build/test per stap (`41_CodingStandards.md`).
4. Documentatie (`docs/00`–`41`) is leidend; wijzigingen/aannames worden geregistreerd in PRD § 19.

## Regels
- `00_PRD.md` wint bij elk conflict.
- Documentatiefase is afgerond; nieuwe code volgt strikt `40_Implementatieplan.md` (sprintvolgorde) en `41_CodingStandards.md`.
- Routing-provider: Mapbox (A-06, → doc 14). WhatsApp-BSP: 360dialog (A-08, → doc 19).
