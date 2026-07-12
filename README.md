# RouteFlow

Premium SaaS voor Nederlandse servicebedrijven met terugkerende werkzaamheden (start: glazenwassers).

## Status
- ✅ `docs/00_PRD.md` — volledig geschreven (single source of truth, ~4.200 woorden; per hoofdstuk uitbreidbaar)
- ✅ `docs/MASTER_PROMPT.md` — werkinstructie voor AI-agents
- ✅ `docs/01`–`41` — documentatiefase afgerond (incl. Implementatieplan en Coding Standards)
- ✅ **Sprint 1 voltooid** — fundament, tenancy & auth (40_Implementatieplan.md)
- ✅ **Sprint 2 voltooid** — klanten, objecten, diensten & geocoding (`v0.2.0`)
- ✅ **Sprint 3 voltooid** — dienstafspraken, prijzen & automatische beurt-generatie
- ✅ **Sprint 4 voltooid (`v0.4.0`)** — routing-engine, dag-laag & planning-board: afstandsmatrix + `distance_cache` (Mapbox), nearest-neighbor/2-opt route-optimizer, `route-optimize`/`route-move-job` Edge Functions, RouteBoard met toegankelijke drag-and-drop (`@dnd-kit`, keyboard + screen-reader), realtime routewijzigingen, `/planning` + `/planning/wachtrij`. Browser-geverifieerd (Playwright) inclusief foutpaden; zie `docs/SPRINT4_BACKEND_REVIEW_2026-07-11.md` en `docs/SPRINT4_FRONTEND_REPORT_2026-07-12.md`.
- ✅ **Deployment voltooid** — Vercel live, Supabase Cloud gekoppeld
- ✅ **Productie-auth werkend** — registratie/bevestigingsmail/login/onboarding/logout/opnieuw-inloggen zijn end-to-end geverifieerd op productie, na correctie van de Vercel `NEXT_PUBLIC_SUPABASE_ANON_KEY` en de Supabase Auth Site URL/Redirect URLs (zie `docs/PRODUCTION_READINESS_REPORT_2026-07-10.md`). **GO FOR PUBLIC BETA**, met de aantekening dat custom SMTP nog ingesteld moet worden vóór trafiek op schaal.
- ⚠️ De `planning-generate` Edge Function is nog niet naar Supabase Cloud gedeployed (staat alleen lokaal) — "eerste planning-generatie" werkt daardoor nog niet voor nieuwe klanten in productie.
- ⚠️ Migratie `016_jobs_route_composite_index.sql` staat lokaal/GitHub maar is nog niet naar Supabase Cloud productie gepusht.
- ⚠️ `MAPBOX_ACCESS_TOKEN` staat nog niet als secret op Supabase Cloud en geen enkele company heeft `config_json.depot_location` ingesteld — `route-optimize`/`route-move-job` geven daardoor in productie nu nog `config_error`/`depot_location_missing` totdat dit is geconfigureerd (er is nog geen UI voor depot-locatie; PRD § 19 A-13).

## Deployment
- **Productie:** [routeflow-delta.vercel.app](https://routeflow-delta.vercel.app) (Vercel)
- **Database:** Supabase Cloud project "Routeflow" (eu-west-1), RLS-multitenancy, migraties 001–015 toegepast, 016 nog niet gepusht (zie hierboven)
- **Edge Functions op Supabase Cloud:** `planning-generate` (alleen lokaal, nog niet gedeployed), `route-optimize`, `route-move-job` (gedeployed, wachten op Mapbox-token + depot-configuratie)
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
