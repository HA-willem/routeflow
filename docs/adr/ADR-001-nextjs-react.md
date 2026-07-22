# ADR-001: Next.js (App Router) + React als frontend-framework

- **Status:** Accepted
- **Datum:** 2026-07-07
- **Beslisser:** Chief Software Architect (ServOps)
- **Bron van waarheid:** `00_PRD.md` § 12.1 (vastgestelde stack)
- **Gerelateerd:** ADR-002 (Supabase), ADR-008 (Edge Functions), ADR-009 (PWA); 24_UI_UX.md, 25_DesignSystem.md, 26_ComponentLibrary.md, 37_Performance.md

---

## Context

ServOps is een premium, Nederlandstalige SaaS met twee zeer verschillende frontends: een **desktop-regie-omgeving** (planning, drag-and-drop, dashboards) en een **mobiele PWA voor medewerkers** (PRD § 11.8). De UX-lat ligt hoog: TTI < 2s op 4G, feedback < 100ms, optimistic UI, instant-voelende navigatie (PRD § 11.3, NFR-101/102/105). Het bedrijf host op Vercel (PRD § 12.1) en werkt met een klein team dat snel moet kunnen leveren.

## Probleem

Welk frontend-framework stelt ons in staat om (a) één codebase voor desktop + PWA te onderhouden, (b) de performance-budgetten te halen, (c) server-side data veilig te renderen binnen een multi-tenant RLS-model, en (d) op Vercel optimaal te draaien — zonder vendor lock-in op UI-niveau?

## Gekozen oplossing

**Next.js (App Router, React Server Components) met React** als UI-laag.

- **App Router + RSC:** minder client-JS, snellere first load, server-side data-fetching dicht bij Supabase.
- **Vercel-synergie:** first-class hosting, edge-rendering, preview-deploys per PR (35_Deployment.md).
- **PWA-ondersteuning:** service worker + manifest bovenop de Next-build (ADR-009).
- **Tailwind + design tokens** als styling-laag (25_DesignSystem.md).
- React als component-model voor de bibliotheek in 26_ComponentLibrary.md.

## Alternatieven

| Alternatief | Waarom niet |
|---|---|
| **SvelteKit** | Kleiner ecosysteem, minder kant-en-klare libs; team-expertise en Vercel-synergie minder sterk |
| **Remix** | Sterk data-model, maar minder naadloze Vercel/edge-integratie en kleiner ecosysteem dan Next |
| **SPA (Vite + React, client-only)** | Geen server-rendering → slechtere TTI/SEO, RLS-data-fetching complexer, geen RSC-voordeel |
| **Native apps (iOS/Android)** | Buiten scope t/m V1 (PRD A-05); dubbele codebase, tragere iteratie |

## Consequenties

**Positief**
- Eén framework voor desktop + PWA; gedeelde componenten en tokens.
- RSC beperkt client-bundle → helpt NFR-101/104.
- Preview-deploys versnellen review en QA (31_Testplan.md).

**Negatief / risico's**
- App Router/RSC kent een leercurve en enkele scherpe randen (caching-semantiek).
- Koppeling aan Vercel-optimalisaties (mitigatie: Next is self-hostbaar; geen harde lock-in).

**Mitigaties**
- UI blijft provider-agnostisch t.o.v. backend via de Supabase-SDK en adapters (ADR-007).
- Performance-budgetten bewaakt als release-gate (37 § 6).

## Waarom deze keuze toekomstbestendig is

Next.js/React is een van de breedst gedragen, best onderhouden frontend-stacks met een groot talent- en libraryreservoir — laag risico op stilstand. RSC en edge-rendering sluiten aan op de richting waarin webperformance zich beweegt. Doordat Next self-hostbaar is en de UI losstaat van de backend-provider (adapters, ADR-007), blijft zowel een hosting- als backend-migratie mogelijk zonder de frontend te herschrijven. De verticaal-agnostische productkern (PRD § 6.7) wordt op UI-niveau ondersteund door een tokengedreven, herbruikbare componentbibliotheek.

## Referenties

- PRD § 12.1 (stack), § 11 (UX-principes)
- 24_UI_UX.md, 25_DesignSystem.md, 26_ComponentLibrary.md, 37_Performance.md
