# 42 — ServOps Design System (Sprint 4 Frontend)

**Status:** DONE
**Versie:** 1.3
**Bron van waarheid:** `25_DesignSystem.md` (tokens) en `26_ComponentLibrary.md` (componentenlagen) — dit document spreekt geen van beide tegen, het **operationaliseert** ze tot een concreet, visueel systeem voor de Sprint 4 Frontend-bouw (Planning-module) en alle daaropvolgende schermen.
**Werkinstructie:** zie `MASTER_PROMPT.md`.
**Relaties:** `24_UI_UX.md` (gedrag/principes), `25_DesignSystem.md` (tokens — canoniek, dit document voegt niets toe aan de tokenwaarden zelf), `26_ComponentLibrary.md` (componentenlagen/staten-eis), `27_PaginaOverzicht.md` (Planning-schermen), `29_MobieleApp.md` (PWA-varianten, buiten scope hier), `41_CodingStandards.md` (implementatie), `lib/design/tokens.css` (codematige bron van de tokens).

---

## Doel van dit document

`25_DesignSystem.md` legt tokens vast (kleur, type, spacing, radius, elevation, motion). `26_ComponentLibrary.md` legt vast *welke* componenten er zijn en *welke staten* verplicht zijn. Geen van beide documenten beschrijft hoe die tokens en componenten **samen een visuele taal** vormen — met name niet voor de planner-specifieke schermen (RouteBoard, JobCard, RouteStopList) die de kern van Sprint 4 Frontend zijn. Dit document vult dat gat: het is de referentie waartegen elke Sprint 4-component wordt gebouwd en gereviewd.

**Visuele richting:** de UX-principes van moderne, dichte planning-tools (zoals Housapp) als inspiratie voor *informatiedichtheid zonder rommeligheid* in de RouteBoard/JobCard — gecombineerd met de rust en het minimalisme van Linear (veel witruimte, één sterke accentkleur, subtiele randen i.p.v. zware schaduwen, snelle/stille motion) en de verfijnde, consistente spacing-ritmes van moderne SaaS-applicaties. Dit is **inspiratie op principe-niveau** (dichtheid, hiërarchie, rust, ritme) — er worden geen specifieke layouts, iconen, illustraties of andere beschermde ontwerpelementen van Housapp overgenomen. Alle daadwerkelijke waarden (kleur, spacing, radius) komen uitsluitend uit `25_DesignSystem.md`.

**Ontwerp-volgorde:** desktop-first vanaf 1024px (primaire werkplek van Eigenaar/Planner/Admin, 24 § 6), met een volwaardig — niet geschaald — tablet-ontwerp vanaf 640px (23_Gebruikersrollen.md: Planner werkt ook op tablet in het veld). Mobiel (<640px) is bewust buiten scope van dit document: de PWA-medewerkerervaring heeft eigen componenten (`29_MobieleApp.md`) en de planningsschermen zijn geen mobiele use-case (24 § 6: "Desktop en mobiel zijn geen simpele grid-collapse — aparte ontwerpen").

---

## 1. Kleurenpalet

Canoniek in `25_DesignSystem.md` § 1 / `lib/design/tokens.css` — hier alleen **toepassingsregels**, geen nieuwe waarden.

| Token | Toepassing in Sprint 4 Frontend |
|---|---|
| `--color-bg` | Paginabody, dialoog-overlay-achtergrond (het paneel zelf, niet de scrim) |
| `--color-surface` | Sidebar, topbar, RouteBoard-kolomkoppen, JobCard-achtergrond, tabelheader |
| `--color-border` | Kolomscheiding RouteBoard, kaartranden, tabelranden, inputranden |
| `--color-text` / `--color-text-muted` | Primaire vs. secundaire tekst — elke JobCard heeft exact één primaire tekstregel (klantnaam) en de rest muted |
| `--color-primary` | Primaire knop, actieve navigatie-item, actieve dagkolom-indicator, drag-ghost-rand |
| `--color-success` / `--color-warning` / `--color-danger` / `--color-info` | Uitsluitend via `StatusBadge`/`Toast`/formuliervalidatie — nooit los als achtergrondkleur van een hele kaart of sectie (25 § 1.2: kleur is nooit de enige informatiedrager, en overheerst anders de rust van het scherm) |

**Principe (Linear-invloed):** één accentkleur (`--color-primary`) draagt de nadruk. Statuskleuren zijn functioneel en klein (badge, stip, rand van 2px) — nooit vlakvullend over een kaart, zodat een RouteBoard met 20+ JobCards rustig blijft ook al hebben de beurten uiteenlopende statussen. Neutrale grijzen (`surface`/`border`/`text-muted`) doen het meeste werk; kleur is uitzondering, niet regel.

**Statuskleur-mapping (uitgebreid van 25 § 1.2 naar de volledige `job_status`-enum):**

| `job_status` | Label (NL) | `StatusBadge`-toon |
|---|---|---|
| `proposed` | Voorgesteld | muted |
| `planned` | Gepland | muted |
| `en_route` | Onderweg | muted |
| `completed` | Uitgevoerd | success |
| `invoiced` | Gefactureerd | success |
| `not_home` | Niet thuis | warning |
| `cancelled` | Geannuleerd | muted |
| `rescheduling` | Wordt herpland | warning |

(`StatusBadge` kent uitsluitend `success`/`warning`/`muted` — 26 § 4; `onderweg`/`gefactureerd` zijn semantisch info/primary maar vallen op muted/success terug om het aantal tonen klein te houden, consistent met "kleur is uitzondering".)

---

## 2. Typografie

Canoniek: 25 § 2 (Inter, schaal `text-xs`…`text-3xl`). Toepassing in Sprint 4:

| Element | Token | Gewicht |
|---|---|---|
| Paginakop (PageHeader) | `text-2xl` | 600 |
| Kolomkop RouteBoard (medewerkernaam) | `text-sm` | 600 |
| JobCard klantnaam | `text-sm` | 500 |
| JobCard adres/dienst/tijd | `text-xs` | 400, `--color-text-muted` |
| Tabelkop | `text-xs` | 500, uppercase-tracking **niet** gebruikt (24 § NL-leesbaarheid; gewoon Nederlandse labels, geen hoofdlettertrucs) |
| Tabelcel | `text-sm` | 400 |
| Tijden/afstanden/bedragen | `text-xs`/`text-sm` met `tabular-nums` (25 § 2) | — |

Regel: maximaal twee gewichten per component (bijv. JobCard: 500 voor naam, 400 voor de rest). Geen `text-lg`/`text-xl` binnen kaarten — die schaal is voor paginakoppen, niet voor kaartinhoud (voorkomt visuele drukte in een dichte RouteBoard).

---

## 3. Spacing (8px-ritme)

Canoniek: 25 § 3, schaal 4/8/12/16/24/32/48/64px. Sprint 4 past hierop een **consistent 8px-ritme** toe voor alles behalve de fijnste interne kaartopmaak:

| Context | Waarde |
|---|---|
| Interne kaartpadding (JobCard, kleine Card) | 12px |
| Gap tussen JobCards in een kolom | 8px |
| Gap tussen RouteBoard-kolommen | 16px |
| Padding RouteBoard-kolomkop | 12px 16px |
| Sectiemarge (tussen PageHeader en content, tussen FilterBar en board) | 24px |
| Paginamarge (desktop, binnen `<main>`) | 32px (bestaand: `app/(app)/layout.tsx` `px-8` = 32px) |
| Paginamarge (tablet) | 16px |
| Sidebar-item padding | 8px 12px |
| Topbar hoogte | 56px (7 × 8px) |

**Regel:** elke marge/padding is een waarde uit de 25 § 3-schaal. Nooit een losse pixelwaarde ernaast (bijv. geen `13px` of `18px`) — dit is de directe voortzetting van 25 § 9 (governance: geen ad-hoc pixels).

---

## 4. Border radius

Canoniek: 25 § 4. Toepassing:

| Element | Token |
|---|---|
| JobCard, Card, tabel-container | `radius-md` (8px) |
| Badge, input, kleine chip | `radius-sm` (4px) |
| Dialog/modal, RouteBoard-kolom-container | `radius-lg` (12px) |
| Avatar (medewerker-initialen in kolomkop) | `radius-full` |

Geen component introduceert een eigen radius-waarde buiten deze vier tokens.

---

## 5. Shadows (elevation)

Canoniek: 25 § 4 (3 niveaus). Sprint 4-specifiek:

| Niveau | Gebruik in Sprint 4 |
|---|---|
| `shadow-sm` | JobCard in rust, Card |
| `shadow-md` | **Gesleepte JobCard** (tijdens drag, 25 § 4: "gesleepte items"), open Select/Dropdown, popover met route-details |
| `shadow-lg` | Dialog (bevestiging, route-details-modal op tablet-breedte), CommandPalette |

**Linear-invloed:** schaduw is spaarzaam en subtiel — de rust komt primair van `--color-border` (1px rand) op kaarten in rust, niet van schaduw. Schaduw is gereserveerd voor elevatie-*verandering* (iets tilt op: drag, open dropdown, modal), niet voor statische diepte. In donkere modus geldt 25 § 4: lichtere `surface`-tint i.p.v. schaduw.

---

## 6. Iconografie (Lucide)

- Eén icon-set: **Lucide** (`lucide-react`, al een dependency), lijnstijl, `stroke-width: 2` (pakket-default), consistent met 25 § 5.
- Groottes: 16px (inline bij tekst, JobCard-metadata), 20px (buttons, tabel-acties), 24px (sidebar-navigatie, topbar).
- Icoon + tekst, nooit icoon alleen als enige informatiedrager buiten `IconButton` (die verplicht `aria-label` heeft, 26 § 2).
- Vaste iconen voor Sprint 4:

| Concept | Icoon |
|---|---|
| Vergrendelde beurt (BR-200, niet sleepbaar) | `Anchor` |
| Rijtijd tussen stops | `Car` |
| Afstand | `MapPin` (stop) / route-lijn via `MapView`, niet via icoon |
| Capaciteitswaarschuwing | `AlertTriangle` (warning-kleur) |
| Realtime-update (subtiele highlight-indicator) | geen icoon — een korte achtergrond-pulse (§ 15), icoon zou ruis toevoegen |
| Drag-handle (indien apart van de kaart zelf) | `GripVertical` |
| Route optimaliseren | `Wand2` |
| Undo (na drag-drop, 24 § 1.5) | `Undo2` in de toast-actie |

Diensten behouden hun eigen `icon`/`color_hex` (12_Entiteiten.md § 5) voor herkenning in JobCard/MapView — dat is domeindata, geen deel van dit icon-set-hoofdstuk.

---

## 7. Buttons

Bron: `components/primitives/button.tsx` (reeds geïmplementeerd, cva-varianten `default/destructive/outline/secondary/ghost/link`, sizes `xs/sm/default/lg/icon*`) — dit hoofdstuk legt vast *wanneer* welke variant.

| Variant | Gebruik in Sprint 4 |
|---|---|
| `default` (primary) | Eén per scherm/sectie: "Route optimaliseren", "Auto-herplan", "Nieuwe beurt" |
| `outline` | Secundaire acties naast een primaire: "Vandaag", filter-toggles |
| `ghost` | Tertiair, lage nadruk: uitloggen (bestaand), kolomkop-acties, "Annuleren" in dialogen |
| `destructive` | Alleen bevestigde destructieve acties (archiveren) — niet gebruikt in Sprint 4 Planning zelf |
| `icon`/`icon-sm` | RouteBoard-kolomkop-acties (optimaliseren, route-details openen), tabel-rij-acties |

**Regel (24 § 1.1, herhaald hier voor buttons specifiek):** maximaal één `default`-variant zichtbaar per scherm-sectie. Een RouteBoard-kolomkop heeft dus een `icon`/`ghost`-knop voor "optimaliseren", niet een volwaardige primary-button per kolom — anders staan er op een weekboard met 6 medewerkers 6 primary-knoppen naast elkaar, wat de "één primaire actie"-regel ondermijnt.

---

## 8. Inputs

Bron: `components/primitives/input.tsx`, `select.tsx`, `textarea.tsx`, `checkbox.tsx`, `switch.tsx` (reeds geïmplementeerd). Toepassing in Sprint 4:

- **Datumnavigatie** (dag-/weekkiezer boven RouteBoard): `outline`-buttons met chevron-iconen (`ChevronLeft`/`ChevronRight`) + een gecentreerd label ("Week van 14 juli" / "Vrijdag 17 juli"), geen vrije-tekst-datuminvoer nodig voor de primaire navigatie (sneltoetsen boven typewerk, Linear-principe).
- **Medewerker-select** (Wachtrij, per-item toewijzing): standaard `Select`-primitief, niet-doorzoekbaar (aantal medewerkers is klein per FR-scope) — `Combobox`-variant (26 § 2) alleen nodig zodra een bedrijf >15 medewerkers heeft, niet Sprint 4-scope.
- **FilterBar** (26 § 3): chips met `Checkbox`-gedrag (aan/uit) voor status-filters op de RouteBoard, niet een aparte `Select` — filteren op planningsstatus is multi-select van nature.
- Alle formuliervalidatie: bestaand patroon (`react-hook-form` + `zod` + `Form`-primitief), inline-fout onder veld bij blur (24 § 2) — geen nieuw patroon voor Sprint 4.

---

## 9. Cards

Bron: `components/primitives/card.tsx`. Sprint 4 introduceert geen nieuwe Card-variant, maar wel een strikte interne structuur voor **JobCard** (§ 13) en **route-samenvattingskaart** (in de route-details-weergave):

- Route-samenvattingskaart: `CardHeader` (medewerkernaam + datum), `CardContent` (drie KPI's op één regel: totale rijtijd, afstand, werktijd — `tabular-nums`), `CardFooter` (optimalisatiescore als kleine voortgangsindicator).
- Geen geneste Cards-in-Cards: een JobCard binnen een RouteBoard-kolom is zelf geen `Card`-component (te veel visuele padding/schaduw-overhead in een dichte lijst) — zie § 13 voor de lichtere JobCard-opbouw.

---

## 10. Tabellen

Bron: `components/composed/DataTable.tsx` (reeds geïmplementeerd: header in `--color-surface`, rijen met `border-t`, hover-highlight, lege staat via `EmptyState`). Sprint 4 hergebruikt `DataTable` ongewijzigd voor eventuele lijstweergaven (bijv. een toekomstige "alle beurten deze week"-lijst); de RouteBoard zelf is **geen tabel** maar een kolommen-layout (§ 14) — een `<table>` is semantisch fout voor een drag-and-drop-bord en zou de a11y-eisen (toetsenbord-drag, 26 § 7) bemoeilijken.

Regel voor toekomstige planningstabellen: `tabular-nums` verplicht op elke numerieke kolom (tijd, afstand, bedrag), rij is volledig klikbaar via `onRowHref` (bestaand `DataTable`-gedrag) tenzij de rij zelf interactieve controls bevat.

---

## 11. Formulieren

Geen wijziging t.o.v. het bestaande patroon (`CustomerForm.tsx` e.a.): `react-hook-form` + `zod`-schema in `/lib/validation`, `Form`-primitief, Server Action met `ActionResult<T>`-retourtype (`lib/errors.ts`), submit-knop toont loading-state via `disabled` + tekstwissel (geen aparte spinner-component nodig, bestaand patroon). Sprint 4 Frontend voegt geen nieuwe formuliertypen toe (geen nieuwe entiteit) — de enige "invoer" is drag-and-drop en de medewerker-select in Wachtrij (§ 8).

---

## 12. Plannercomponenten — algemeen principe

De planner-schermen (RouteBoard, JobCard, RouteStopList, Wachtrij) zijn de dichtste schermen in ServOps: een planner overziet in één oogopslag 5-10 medewerkers × 5-15 beurten. Drie principes sturen elk ontwerp hier:

1. **Dichtheid met ademruimte (Housapp-invloed, principe-niveau):** compacte JobCards (12px interne padding, geen overbodige witruimte) zodat een kolom met 10 beurten zonder scrollen leesbaar blijft — maar met een consistente 8px-gap ertussen zodat kaarten niet aan elkaar plakken. Dichtheid ontstaat door *compacte componenten*, niet door *kleine marges tussen componenten*.
2. **Eén scan-pad per kaart (Linear-invloed):** de blik van een planner leest een JobCard in vaste volgorde — tijd (links, prominent) → klantnaam → adres/dienst → statusbadge (rechts). Geen kaart wijkt van deze volgorde, zodat 50 kaarts-per-scherm scanbaar blijven.
3. **Rust bij interactie:** drag-and-drop, realtime-updates en optimalisatie-resultaten zijn nooit abrupt (§ 15, 24 § 1.5) — een RouteBoard die constant "springt" is onbruikbaar bij hoge informatiedichtheid.

---

## 13. JobCards

**Layout (vaste volgorde, § 12.2):**

```
┌──────────────────────────────────┐
│ 09:00          [Gepland]         │  ← tijd (text-sm, 500) · StatusBadge rechts
│ Fam. de Vries                    │  ← klantnaam (text-sm, 500, --color-text)
│ Kerkstraat 12, Utrecht            │  ← adres (text-xs, muted)
│ Glasbewassing · 45 min            │  ← dienst + duur (text-xs, muted)
└──────────────────────────────────┘
```

- Achtergrond `--color-surface`, rand `--color-border` 1px, `radius-md`, padding 12px, `shadow-sm` in rust.
- **Vergrendeld** (BR-200, `jobs.locked`): `Anchor`-icoon linksboven i.p.v. drag-handle, niet-sleepbaar, rand blijft neutraal (geen aparte kleur — het icoon draagt de betekenis, 25 § 1.2).
- **Gesleept:** `shadow-md`, lichte rotatie (2°) en 95%-opacity op de originele plek (dnd-kit `DragOverlay`-patroon) — subtiel, geen bounce/spring (24 § 1.5: alleen betekenisvolle motion).
- **Compacte variant** (RouteBoard bij >8 kaarten in kolom, optioneel toekomstig): alleen tijd + klantnaam + badge-stip, geen adres/dienst-regel — niet Sprint 4-MVP, wel als uitbreidingspad vastgelegd zodat een latere "dichtheid"-toggle geen nieuw component vereist.
- Statusbadge altijd rechtsboven, nooit als achtergrondkleur van de hele kaart (§ 1).
- Klik op kaart (niet-drag) opent de route-details/beurt-details (§ 16), niet een aparte navigatie-pagina — blijft in context van het bord.

---

## 14. RouteBoard

**Layout:** horizontaal scrollende kolommen, één per medewerker (weekweergave: één per dag × medewerker-groepering via tabs, zie 27 § 1.1 "week/dag/kaart-subviews").

```
┌─ Kolomkop (surface, 12px/16px padding) ──────┐
│ [Avatar] Jan Jansen        [⚡] [⋮]           │  ← naam text-sm/600, acties rechts
│ 6 beurten · 4u 20m rijtijd                     │  ← capaciteitsindicator, text-xs muted
├───────────────────────────────────────────────┤
│ JobCard                                        │
│ JobCard                                        │
│ JobCard                                        │
│ ...                                             │
└───────────────────────────────────────────────┘
```

- Kolombreedte vast (280px desktop, 240px tablet) zodat kaarten niet herformatteren tijdens scrollen — voorspelbaarheid bij een dicht bord (Housapp-invloed: vaste kolombreedte is wat dichte planningstools scanbaar houdt).
- Kolomkop: medewerker-avatar (initialen, `radius-full`, gekleurd via een gehashte kleur uit de statuspalet-neutrale set — geen willekeurige felle kleuren die met statuskleuren verwarren), naam, capaciteitsindicator (aantal beurten + totale werktijd t.o.v. 8,5u-limiet BR-202 — een dunne voortgangsbalk, `warning`-kleur vanaf 90%).
- Kolomkop-acties: `icon-sm`-knop "Route optimaliseren" (`Wand2`), overflow-menu (`⋮`) voor route-details/verwijderen.
- **Drop-zone-feedback:** kolom krijgt tijdens een actieve drag een subtiele `--color-primary` 2px binnenrand (geen volledige achtergrondkleurverandering — te veel visuele ruis bij meerdere kolommen tegelijk zichtbaar).
- **Capaciteitswaarschuwing:** als een drop de 8,5u-limiet zou overschrijden, toont de kolomkop-balk direct `warning`-kleur zodra de drag daarboven hovert (optimistische preview) — de daadwerkelijke afwijzing komt van `route-move-job` (`workday_limit_exceeded`, 422) via toast + rollback (24 § 1.5).
- Lege kolom (medewerker zonder beurten die dag): `EmptyState`-variant in het klein — "Geen beurten gepland" zonder actie (de actie is elders: een beurt hierheen slepen).

---

## 15. Realtime updates

- Een wijziging door een collega (andere sessie, `postgres_changes` op `jobs`/`routes` binnen de eigen `company_id`, 41 § 8) verschijnt **niet** als abrupte re-render: de betrokken JobCard/kolom krijgt een korte (600ms) achtergrond-highlight-puls in `--color-primary` op 8%-opacity, daarna terug naar normaal — geen layout-shift, geen icoon (§ 6).
- Optimistic UI blijft leidend voor de eigen acties van de planner (drag-drop, optimaliseren) — de realtime-subscription ververst alleen wat *een ander* wijzigt, nooit de eigen net-uitgevoerde actie opnieuw (voorkomt dubbele/flikkerende updates).

---

## 16. Route-details

Geen aparte pagina/URL (27 § 1 kent geen `/planning/route/:id` in de sitemap) — een **paneel** (`Dialog`, `radius-lg`, `shadow-lg`, opent vanuit RouteBoard-kolomkop-overflow of JobCard-klik):

- Header: medewerkernaam + datum + sluitknop.
- Route-samenvattingskaart (§ 9): rijtijd/afstand/werktijd/optimalisatiescore.
- `RouteStopList`: geordende stops, elk met volgnummer, aankomsttijd, rijtijd-vanaf-vorige (`Car`-icoon + `tabular-nums`), verwachte service-start/eind.
- Op tablet-breedte (640–1024px): `Dialog` neemt volledige breedte in (geen gecentreerd smal paneel) zodat de stoplijst leesbaar blijft zonder horizontaal scrollen.

---

## 17. Sidebar

Bron: `components/composed/AppSidebar.tsx` (reeds geïmplementeerd, rolgebaseerde `NAV_ITEMS`). Visuele regels:

- Achtergrond `--color-surface`, geen rand nodig aan de rechterkant boven 1px `--color-border` (subtiliteit, Linear-invloed).
- Actief item: `--color-primary` op 8%-opacity achtergrond + `--color-primary` tekst/icoon, `radius-md`. Geen linker-accentbalk (extra visueel element dat de rust doorbreekt) — achtergrond+tekstkleur is voldoende onderscheid.
- Item-hoogte 36px (multiple van 4px), 8px verticale gap tussen items, 8px/12px interne padding (§ 3).
- Tablet (640–1024px): sidebar collapst naar iconen-alleen (24px iconen, `aria-label` per item — `IconButton`-a11y-regel, § 6) met een expand-toggle; niet volledig verborgen achter een hamburger, want Planner/Eigenaar navigeren op tablet net zo veel als op desktop (23_Gebruikersrollen.md).

---

## 18. Topbar

Bron: `app/(app)/layout.tsx` `<header>` (reeds geïmplementeerd: "Ingelogd als …" + uitlog-knop). Sprint 4 breidt dit **niet** uit met een aparte topbar-per-pagina — `PageHeader` (26 § 3, binnen `<main>`) blijft de plek voor paginatitel + primaire actie. De globale topbar blijft minimaal: sessie-info + uitloggen, hoogte 56px (§ 3), `--color-surface` achtergrond, `--color-border` onderrand 1px. Dit voorkomt dubbele koppen (globale topbar-titel + PageHeader-titel) die bij Housapp-achtige dashboards een bekende bron van visuele ruis zijn.

---

## 19. Dialogen

Bron: `components/primitives/dialog.tsx` (Radix-gebaseerd, reeds geïmplementeerd). Sprint 4-gebruik: route-details-paneel (§ 16), eventuele bevestigingsdialogen. Regels ongewijzigd t.o.v. 26 § 2: focus-trap, ESC sluit, overlay-klik sluit (behalve destructieve dialogen — niet van toepassing in Sprint 4 Planning). `shadow-lg`, `radius-lg`, overlay-scrim in `--color-bg` op ~60%-opacity zwart/donker (bestaande Radix-overlay-styling, geen nieuwe waarde).

---

## 20. Toastmeldingen

Bron: `components/primitives/sonner.tsx` (reeds geïmplementeerd). Sprint 4-gebruik (24 § 1.5, § 5):

| Situatie | Toast-variant | Inhoud |
|---|---|---|
| Drag-drop succesvol | success + undo-actie | "Beurt verplaatst naar [medewerker]." + "Ongedaan maken"-knop (`Undo2`) |
| Drag-drop afgewezen (`job_locked`/`employee_unavailable`/`workday_limit_exceeded`/`recompute_failed`) | error | Exacte NL-boodschap uit de Edge Function-respons (§ 6 Edge Function-contract) — geen technische code getoond |
| Route-optimalisatie voltooid | success | "Route bijgewerkt: N beurten gepland." (+ "M niet plaatsbaar" als `unplaceable_job_ids.length > 0`, warning-variant i.p.v. success in dat geval) |
| Realtime-conflict (zeldzaam: twee planners slepen tegelijk) | info | "Deze route is net bijgewerkt door een collega — ververst." |

Toast-duur: 4s voor success/info, geen auto-dismiss voor error (planner moet de foutmelding bewust wegklikken) — bestaand `sonner`-gedrag, geen aanpassing nodig.

---

## 21. Skeletons

Bron: `components/primitives/skeleton.tsx` (reeds geïmplementeerd: `animate-pulse`, `--color-surface`... eigenlijk `bg-accent`). Sprint 4-skeletons (26 § 2: <100ms zichtbaar, NFR-105; nooit een blanco flits):

- **RouteBoard-skeleton** (`app/(app)/planning/loading.tsx`): 4-5 kolom-vormige skeleton-blokken naast elkaar, elk met een kolomkop-skeleton (avatar-rondje + naam-balk) en 3-4 kaart-vormige skeleton-blokken — mimt de exacte RouteBoard-layout (§ 14), niet een generieke spinner.
- **Wachtrij-skeleton**: 4-6 horizontale kaart-skeletons (JobCard-vorm zonder inhoud).
- Skeleton-vorm volgt altijd de uiteindelijke component-afmeting (breedte/hoogte) zodat er geen layout-shift optreedt zodra de echte data laadt (CLS-vriendelijk, 37_Performance.md).

---

## 22. Empty states

Bron: `components/primitives/empty-state.tsx` (reeds geïmplementeerd). Voorgeschreven copy (24 § 4, letterlijk overgenomen — dit document introduceert geen nieuwe tekst):

| Scherm | Titel | Beschrijving | Actie |
|---|---|---|---|
| Planning-week, geen beurten | "Nog niets gepland." | "Voeg klanten met dienstafspraken toe; wij stellen de eerste week voor." | "Naar klanten" → `/klanten` |
| Herplan-wachtrij, leeg | "Alles gepland — niets in de wachtrij. Mooi." | — | geen |
| Lege RouteBoard-kolom (medewerker zonder beurten die dag) | "Geen beurten gepland." | — | geen (compacte in-kolom variant, § 14) |

---

## 23. Loading states

Onderscheid (26 § 5, herhaald met Sprint 4-specifieke toewijzing):

- **Route-segment-niveau** (RSC-data-fetch bij navigatie): `loading.tsx` met skeleton (§ 21) — `/planning`, `/planning/wachtrij`.
- **Actie-niveau** (binnen een reeds geladen scherm: optimaliseren, drag-drop): knop toont `disabled` + label-wissel ("Optimaliseren…") in plaats van een aparte spinner-overlay over het hele bord — het bord blijft interactief/leesbaar tijdens een optimalisatie-call, alleen de betrokken kolom/knop toont de bezig-status. Dit is een bewuste afwijking van een volledig-scherm-spinner: bij een dicht bord (§ 12) is een blokkerende overlay storender dan een lokale bezig-indicator.
- Drag-drop zelf toont **geen** loading-state (optimistic UI, 24 § 1.5) — de kaart verschijnt direct op de nieuwe plek, bevestiging/rollback volgt async.

---

## 24. Motion-principes

Canoniek: 25 § 6 (150/200/250ms, `ease-out`, `prefers-reduced-motion`). Sprint 4-toepassing:

| Interactie | Duur | Notitie |
|---|---|---|
| JobCard hover (subtiele lift, `shadow-sm`→iets sterker) | `duration-fast` (150ms) | Alleen desktop (hover bestaat niet op touch/tablet) |
| Drag-start (schaal/rotatie naar gesleepte staat, § 13) | `duration-fast` | Directe visuele feedback (24 § 1.5: "direct visuele feedback bij oppakken") |
| Drop-animatie (kaart landt op nieuwe positie) | `duration-base` (200ms) | `ease-out`, geen overshoot/bounce |
| Realtime-highlight-puls (§ 15) | 600ms (buiten de standaardschaal, want een puls is geen overgang maar een tijdelijke attentiewaarde — vergelijkbaar met de bestaande toast-enter/exit-conventie van 150–250ms per fase, hier in+uit samen 600ms) | Nooit herhaald/knipperend |
| Dialog open/sluit | `duration-base` | Fade + lichte schaal (Radix-default, reeds in `dialog.tsx`) |
| Toast enter/exit | `duration-fast`–`duration-base` | Bestaand `sonner`-gedrag (26 § 2: 150-250ms) |

`prefers-reduced-motion`: alle bovenstaande transities vervallen naar een directe state-wissel zonder animatie (25 § 6) — geldt ook voor de realtime-puls (wordt dan een korte, niet-animerende kleurflits van 1 frame of gewoon direct zichtbaar/onzichtbaar).

---

## 25. Responsief gedrag

Breakpoints (24 § 6, herhaald hier met concrete Tailwind-aliasing): `md:` (768px) als praktische tablet-drempel binnen Tailwind's schaal, volledig desktop-gedrag vanaf `lg:` (1024px) — dit benadert de in 24 § 6 genoemde 640/1024-grens voldoende nauwkeurig zonder een custom breakpoint te introduceren (Tailwind-default blijft de standaard, 41_CodingStandards.md).

| Breakpoint | RouteBoard | Sidebar | Route-details |
|---|---|---|---|
| `< md` (mobiel, buiten scope) | n.v.t. — Planning is geen mobiele use-case (§ 0) | n.v.t. | n.v.t. |
| `md` – `lg` (tablet, 768–1024px) | Horizontaal scrollend, kolombreedte 240px, drag-and-drop functioneel maar met grotere hit-targets (44px min., NFR-602) voor touch | Icoon-only, expandable (§ 17) | Volledig-breed `Dialog` |
| `≥ lg` (desktop) | Kolombreedte 280px, tot ~4-5 kolommen zichtbaar zonder scrollen op een 1440px-scherm | Volledig (iconen + labels) | Gecentreerd paneel, max-breedte 640px |

Paginamarges volgen § 3 (32px desktop, 16px tablet). Geen enkel Sprint 4-component herschikt zijn *interne* structuur tussen tablet en desktop (alleen kolombreedte/aantal-zichtbaar en sidebar-breedte veranderen) — dit houdt het aantal te onderhouden layout-varianten laag.

---

## 26. Governance

Zelfde regel als 25 § 9 / 26 § 8: een nieuw visueel patroon in de Planning-module toetst eerst aan dit document; als het patroon hier niet beschreven staat, wordt dit document uitgebreid (met changelog-entry) vóór het patroon in code landt — niet andersom. Wijzigingen aan tokens zelf blijven bij `25_DesignSystem.md`; dit document mag nooit een tokenwaarde herdefiniëren, alleen toepassen.

---

## Changelog

| Datum | Versie | Wijziging |
|---|---|---|
| 2026-07-11 | 1.0 | Eerste volledige versie: kleurtoepassing, typografie-toepassing, 8px-spacingritme, radius/shadow-toepassing, Lucide-iconenset, buttons/inputs/cards/tabellen/formulieren-toepassingsregels, plannercomponenten-principes (Housapp/Linear-geïnspireerd), volledige JobCard- en RouteBoard-specificatie, realtime-gedrag, route-details-paneel, sidebar/topbar-visuele regels, dialogen, toasts, skeletons, empty/loading states, motion-tabel, responsief gedrag (tablet/desktop). Geschreven voorafgaand aan de Sprint 4 Frontend-componentbouw op expliciet verzoek. |
| 2026-07-13 | 1.1 | Nieuwe patronen (§ 26-governance) vastgelegd bij de AI-first frontend (PRD § 19 A-21): CommandPalette (⌘K, top-uitgelijnd paneel, `shadow-lg` conform § 5) via `cmdk`; route-details als rechts-zijpaneel (slide-in, zelfde § 16-inhoud + rijtijd/afstand-totalen en werkbon-links); "Voorbeeldweergave"-chip (gestippelde rand, muted) voor AI-preview-content; `tw-animate-css` toegevoegd zodat de al gespecificeerde Radix-`animate-in`-overgangen (§ 24) daadwerkelijk renderen. Geen tokenwijzigingen. |
| 2026-07-19 | 1.2 | Visuele audit ("lichter/frisser"-verzoek): shadcn's ongedocumenteerde `shadow-xs` op 6 formulierprimitieven (button-outline, input, select-trigger, checkbox, switch, textarea) verwijderd — geen vierde elevation-niveau, zie `25_DesignSystem.md` § 4 (2.1). Bevestigt en scherpt de bestaande Linear-geïnspireerde richting uit dit document aan ("subtiele randen i.p.v. zware schaduwen"): kaarten/dialogen/dropdowns/command-palette gebruikten al correct sm/md/lg en blijven ongewijzigd. Geen kleur-/tokenwijziging. |
| 2026-07-19 | 1.3 | Warme paletvernieuwing (25_DesignSystem.md 2.2, op gebruikersverzoek met Housapp-kleurreferentie — zelfde, al gesanctioneerde inspiratiebron als het Sprint 4-openingscitaat hierboven, principe-niveau, geen overname van beschermde elementen): `KPICard` kreeg een `tone`-prop (`bg-{info/warning/success/primary}/10`, hergebruikt het bestaande `StatusBadge`-tint-patroon) voor een "pop"-effect tegen de nu warmere paginaachtergrond. **Scopegrens, bewust vastgelegd:** uitsluitend `/dashboard` en `/` (Vandaag) — RouteBoard, JobCard, DataTable en formulieren blijven neutraal; kleur zou daar de "dichtheid zonder rommeligheid"-eis (§ "Visuele richting" bovenaan dit document) doorbreken. Geen serif-/tweede lettertype toegevoegd — Inter blijft het enige font (25 § 2, ongewijzigd). |
