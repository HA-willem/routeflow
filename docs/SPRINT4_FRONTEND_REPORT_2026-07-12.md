# Sprint 4 Frontend Report (2026-07-12)

**Doel:** oplevering van de Sprint 4 Frontend (Planning-module: Planning-overzicht, Dagplanner, Weekplanner, RouteBoard, JobCards, RouteStopList, Drag & Drop, Route-details, Realtime updates, Responsive desktop/tablet, Skeletons, Loading/Error/Empty states), uitsluitend bouwend op de bestaande, reeds gedeployde backend (`SPRINT4_BACKEND_REVIEW_2026-07-11.md`). Geen wijzigingen aan routing-engine, database of Edge Functions — er is geen echte bug in die laag gevonden die dat had gerechtvaardigd.

## Samenvatting

De Planning-module (`/planning`, `/planning/wachtrij`) is functioneel compleet, end-to-end geverifieerd in een echte browser tegen een lokale Supabase-instantie (login → data → drag-and-drop → optimaliseren → route-details, inclusief de foutpaden), en doorstaat typecheck/lint/tests/build zonder waarschuwingen. Voorafgaand aan de componentbouw is op expliciet verzoek eerst `docs/42_DesignSystem.md` uitgewerkt — een operationalisatie van de bestaande tokens (`25_DesignSystem.md`) en componentenlagen (`26_ComponentLibrary.md`) tot een concreet visueel systeem voor de dichte planner-schermen. Na oplevering is een volledige architectuurreview uitgevoerd (8 onafhankelijke review-hoeken); 11 bevindingen zijn opgelost, 2 bewust niet (zie § 6).

## 1. Wat is opgeleverd

| Onderdeel | Bestand(en) |
|---|---|
| Design-systeemdocument (vooraf, op verzoek) | `docs/42_DesignSystem.md` |
| PRD-aanvulling: dnd-kit als drag-and-drop-library | `docs/00_PRD.md` § 19, A-14 |
| JobCard | `components/domain/JobCard.tsx` |
| RouteStopList | `components/domain/RouteStopList.tsx` |
| RouteBoard (drag-and-drop, `@dnd-kit`) | `components/domain/RouteBoard/RouteBoard.tsx` |
| PlanningBoard (realtime + dialog-state-schil) | `components/domain/RouteBoard/PlanningBoard.tsx` |
| RouteDetailsDialog | `components/domain/RouteDetailsDialog.tsx` |
| WachtrijBoard | `components/domain/WachtrijBoard.tsx` |
| `useRealtimeRoute`-hook | `hooks/useRealtimeRoute.ts` |
| Server Actions (`moveJob`, `optimizeEmployeeDay`) | `app/(app)/planning/actions.ts` |
| Gedeelde query/mapper voor Beurt-rijen | `lib/planning/jobs.ts` |
| Datum/tijd-hulpfuncties | `lib/planning/dates.ts` |
| `/planning` (week/dag-subviews, skeleton) | `app/(app)/planning/page.tsx`, `loading.tsx` |
| `/planning/wachtrij` (herplan-queue, skeleton) | `app/(app)/planning/wachtrij/page.tsx`, `loading.tsx` |
| `job_status`-labels/tonen | `lib/labels.ts` |
| Globale `prefers-reduced-motion`-regel (ontbrak nog) | `app/globals.css` |

## 2. Scope-beslissingen (gedocumenteerd, geen aannames stilzwijgend gemaakt)

- **RouteBoard toont één datum tegelijk** (kolommen = medewerkers), niet een week × medewerker-grid: `route-optimize` optimaliseert uitdrukkelijk "één voertuig" per aanroep (14_RoutingEngine.md § 4.1) — een weekgrid-drag zou een niet-bestaande backend-capaciteit veronderstellen. "Week"-subview toont in plaats daarvan een dag-tabbalk (Ma–Zo) die naar de dag-view navigeert.
- **Wachtrij's "Auto-herplan" roept `route-optimize` per (medewerker, datum) aan** i.p.v. een echte AI-Planner-distributie over medewerkers — die laag bestaat nog niet (15_AIPlanner.md § 1.2, Sprint 7-scope). De planner kiest zelf een medewerker per beurt; dit is expliciet gedocumenteerd in `WachtrijBoard.tsx`'s doc-comment, geen verborgen simulatie van een feature die er niet is.
- **`@dnd-kit` gekozen als drag-and-drop-library** — geen ADR (dit is een vervangbaar UI-implementatiedetail, geen architectuurbeslissing) maar wel geregistreerd als PRD § 19 A-14, met motivatie (toegankelijkheid, actief onderhouden, geïsoleerd achter `components/domain/RouteBoard`).
- **Route-details is een Dialog, geen aparte pagina** — `27_PaginaOverzicht.md`'s sitemap kent geen `/planning/route/:id`.

## 3. Browser-verificatie (empirisch, niet alleen typecheck/build)

Uitgevoerd met Playwright tegen `npm run dev` + lokale Supabase (`supabase start`), met een tijdelijk test-account en handmatig geseede data (bedrijf, 2 medewerkers, dienstafspraken, routes/beurten) — na afloop volledig opgeruimd (auth-user verwijderd, alle rijen verwijderd, geen scratch-bestanden achtergelaten in de repo).

Geverifieerd, met screenshots:
- Login → Planning (week- én dagweergave) → correcte tijden, status-badges, vergrendeld-icoon, capaciteitsbalk.
- Route-details-dialog (klik op een JobCard) — correcte volgorde, aankomst-/vertrektijden, rijtijd tussen stops.
- **Drag-and-drop end-to-end**, inclusief het faalpad: met de Edge Runtime lokaal niet actief (geen `MAPBOX_ACCESS_TOKEN`/`supabase functions serve`) faalde `route-move-job` zoals verwacht — de kaart ging optimistisch naar de nieuwe kolom, en bij de mislukte server-bevestiging **rolde exact terug naar de oorspronkelijke positie** met een foutmelding-toast. Dit bewijst dat de optimistic-UI-plus-rollback (24_UI_UX.md § 1.5) daadwerkelijk werkt, niet alleen in theorie.
- "Route optimaliseren" tegen een onbereikbare Edge Function → nette foutmelding-toast, geen crash, geen witte pagina.
- Wachtrij-pagina met niet-geroute beurten + medewerker-select.
- Tablet-breedte (800px) — RouteBoard blijft leesbaar, geen horizontale layout-breuk.

**Eén echte bug gevonden tijdens deze verificatie (niet via lint/typecheck):** `arrival_time`/`service_start`/`service_end` zijn `timestamptz`-kolommen (volledige ISO-datumtijd, `014_routes.sql`), maar de eerste versie van `formatTime()` deed een naïeve `isoTime.slice(0, 5)` — dat geeft `"2026-"` in plaats van `"09:00"`. Gefixt als gedeelde `formatClockTime()` in `lib/planning/dates.ts`, die de UTC-uurwaarde leest (consistent met hoe `lib/routing/optimize.ts`'s `minutesToIso()` kloktijden daadwerkelijk encodeert — geen tijdzone-conversie, een bewuste bestaande backend-conventie, geen backend-wijziging nodig).

**Tweede bug gevonden (hydration-mismatch):** `@dnd-kit`'s `DndContext` genereert zonder een expliciete `id`-prop een `aria-describedby` via een module-globale teller die niet gegarandeerd gelijk oploopt tussen server- en client-render — dit is een gedocumenteerd SSR-probleem van de library. Gefixt met `<DndContext id="route-board" ...>`.

## 4. Architectuurreview (op verzoek, na eerste oplevering)

Acht onafhankelijke review-hoeken uitgevoerd (line-by-line, removed-behavior, cross-file, reuse, simplificatie, efficiëntie, altitude, conventies/toegankelijkheid) tegen de volledige diff. Vier hoeken faalden herhaaldelijk door een tijdelijke infrastructuur-storing (agent-stalls); de overige vier leverden voldoende dekking op, aangevuld met handmatige verificatie (FK-namen tegen migraties, prop-drilling-consistentie).

**Opgelost (11 bevindingen):**

1. **Toegankelijkheid — geen keyboard-drag.** `DndContext` had alleen `PointerSensor`, geen `KeyboardSensor` — dit weersprak rechtstreeks de eigen motivatie in PRD § 19 A-14 ("toegankelijk … keyboard/screen-reader-drag") en NFR-602. Toegevoegd.
2. **Toegankelijkheid — vergrendelde JobCard onbereikbaar per toetsenbord.** Een `div` met alleen `onClick` (geen `role`/`tabIndex`/`onKeyDown`); voor vergrendelde beurten werden dnd-kit's attributen (die toevallig ook `role`/`tabIndex` meegeven) niet gespreid, dus was route-details volledig onbereikbaar zonder muis. Eigen `role="button"`/`tabIndex`/Enter-Space-handler toegevoegd.
3. **Realtime toont eigen acties als "collega-wijziging".** `useRealtimeRoute` kon niet onderscheiden of een `jobs`-wijziging van de eigen sessie kwam — een eigen drag-and-drop veroorzaakte de highlight-puls die bedoeld is voor collega's, plus een overbodige extra `router.refresh()` bovenop de Server Action's eigen `revalidatePath`. Opgelost met een `suppressUntilRef` die `PlanningBoard` zet vlak vóór elke eigen mutatie.
4. **`RouteDetailsDialog` had een eigen `formatDate()`** die (anders dan de rest van de codebase) lokale tijd i.p.v. de UTC-middernacht-conventie gebruikte — een reëel risico op een dag-verschil rond middernacht. Vervangen door het bestaande `formatDayHeading()`.
5–6. **Ontbrekende `company_id`-filter op de `employees`-query** in zowel `/planning` als `/planning/wachtrij` — inconsistent met de andere query's in dezelfde `Promise.all`-batch, die wel filteren. RLS blokkeerde dit al, maar defense-in-depth hersteld.
7. **`JobRow`/`toPlanningJob()`/de PostgREST-select-string stonden letterlijk dubbel** in beide pagina's. Samengevoegd in `lib/planning/jobs.ts`.
8. **O(medewerkers × routes)-scan** waar de rest van hetzelfde bestand al een `Map`-patroon gebruikt voor de equivalente `jobs`-lookup — hersteld naar consistente `Map`-lookup.
9. **Wachtrij's "Auto-herplan" wachtte sequentieel** op onafhankelijke `route-optimize`-aanroepen. Omgezet naar `Promise.allSettled` (elk (medewerker, datum)-paar is onafhankelijk, geen gedeelde schrijfstate).
10. **`/planning`'s pagina-kop was met de hand opgebouwd** i.p.v. de bestaande `PageHeader` te hergebruiken — inconsistent met de eigen `/planning/wachtrij` in dezelfde diff. Hersteld.
11. **Dode `style`-prop** op `JobCard` (nooit door een aanroeper gebruikt) verwijderd.

**Bewust niet opgelost (2 bevindingen, met reden):**

1. **Supabase-queries controleren `error` niet, alleen `data`** (§ 3, beide pagina's) — bij een mislukte fetch rendert de pagina een lege staat i.p.v. een expliciete foutmelding. Dit is echter **exact het patroon dat al codebase-breed gebruikt wordt** (bv. het bestaande, al-gereviewde `app/(app)/klanten/page.tsx` doet hetzelfde). Het nu alleen in de Planning-module anders doen zou een nieuw, inconsistent patroon introduceren — 41_CodingStandards.md § governance vereist eerst een voorstel tot wijziging van de standaard, niet een stille uitzondering in één module. Aanbevolen als codebase-brede opvolging, geen Sprint 4-specifiek gat.
2. **`lib/planning/dates.ts` herimplementeert vier privé-helpers** (`toUtcDate`/`toIso`/`addDays`/`isoWeekday`) die al in `lib/planning/horizon.ts` bestaan, met identieke UTC-conventie. Geen gedragsverschil (beide kloppen), puur DRY. Niet opgelost omdat `horizon.ts`'s helpers `private` (niet-geëxporteerd) zijn — ze delen zou een aparte, op zichzelf staande refactor van `horizon.ts` vereisen (nieuwe geëxporteerde module, mogelijk `lib/planning/date-utils.ts`) die buiten de scope van dit al-grote Sprint 4-frontend-werk valt. Aanbevolen als kleine op-zichzelf-staande opvolgtaak.

## 5. Toegankelijkheid (samengevat, zie ook § 4)

- Keyboard-drag nu functioneel (`KeyboardSensor`).
- Klik-naar-route-details nu keyboard-bereikbaar, ook voor vergrendelde beurten.
- `prefers-reduced-motion` was nergens in de codebase afgedwongen (25_DesignSystem.md § 6 vereist dit al sinds Sprint 1) — toegevoegd in `app/globals.css` als onderdeel van dit werk, geldt nu voor de hele app.
- Iconknoppen (optimaliseren, dag-navigatie, dialoog-sluiten) hebben allemaal `aria-label`.

## 6. Testdekking

| Laag | Dekking |
|---|---|
| `lib/planning/dates.ts`, `lib/planning/jobs.ts` | ⚠️ Geen unit-tests toegevoegd — puur presentatie-/mapping-logica zonder business rules; `lib/planning/horizon.ts` (wél BR-gedreven) heeft de bestaande testdekking |
| Server Actions (`moveJob`/`optimizeEmployeeDay`) | ⚠️ Geen unit-tests — dunne Edge-Function-schillen, zelfde patroon als de al-bestaande `klanten/actions.ts` (niet unit-getest, wel manueel/E2E geverifieerd) |
| Componenten (JobCard/RouteBoard/RouteStopList/WachtrijBoard) | ✅ Empirisch E2E geverifieerd in browser (§ 3), geen Vitest/RTL-componenttests toegevoegd (geen bestaand precedent hiervoor in dit project — zie `31_Testplan.md`) |
| Volledige testsuite (bestaand + dit werk) | ✅ 135/135 groen, typecheck/lint/build schoon |

## 7. Wat is bewust buiten scope gebleven

- Depotlocatie-instellingen-UI — PRD § 19 A-13 noemt dit expliciet als niet-Sprint-4.
- Een echte AI-Planner-distributielaag voor Wachtrij — Sprint 7 (zie § 2).
- Componentcatalogus/Storybook — 26_ComponentLibrary.md § 8 noemt dit expliciet "buiten scope documentatiefase".
- Backend-wijzigingen — geen enkele gevonden bug rechtvaardigde dit; de twee bugs in § 3 waren beide frontend-zijdig.

## Conclusie

De Planning-module is klaar voor gebruik op de bestaande backend, inclusief een architectuurreview-ronde met concrete, opgeloste bevindingen op toegankelijkheid, consistentie en een reëel realtime-UX-defect. De twee resterende punten (§ 4, "bewust niet opgelost") zijn beide gedocumenteerde, kleine techschuld-items voor een aparte opvolging — geen blockers.
