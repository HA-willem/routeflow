# 26 — Component Library

**Status:** DONE
**Versie:** 2.2
**Bron van waarheid:** `00_PRD.md` § 11, § 12.1 (Next.js/React, Tailwind) — dit document mag het PRD niet tegenspreken.
**Werkinstructie:** zie `MASTER_PROMPT.md`.
**Relaties:** 25_DesignSystem.md (tokens), 24_UI_UX.md (gedrag), 27_PaginaOverzicht.md (waar gebruikt), 29_MobieleApp.md (mobiele varianten).

---

## Doel van dit document

Dit document beschrijft de **herbruikbare componentenbibliotheek**: de primitieven en domeincomponenten waaruit alle schermen worden opgebouwd. Per component: doel, varianten, staten, en toegankelijkheids-/gedragsregels. Componenten consumeren uitsluitend design tokens (25_DesignSystem.md) en volgen de UX-regels (24_UI_UX.md).

**Technisch:** React (Server + Client Components) in Next.js App Router, Tailwind CSS, TypeScript. Voorkeur voor toegankelijke headless-primitieven (bijv. Radix) als basis, gestyled met tokens.

---

## 1. Lagen

```
Primitieven (generiek)  →  Samengestelde componenten  →  Domeincomponenten  →  Pagina's (27)
Button, Input, Modal…      Toolbar, DataTable, Form…      JobCard, RouteBoard…    Planning, Facturen…
```

---

## 2. Primitieven

| Component | Varianten | Staten | Toegankelijkheid/gedrag |
|---|---|---|---|
| **Button** | primary, secondary, ghost, danger; sizes sm/md/lg | default, hover, focus, loading (spinner-in-knop), disabled | Werkwoord-label; focus-ring; ≥44px tap-target mobiel |
| **IconButton** | idem | idem | Verplicht `aria-label` |
| **Input / Textarea** | text, number, email, tel, search | default, focus, error, disabled, readonly | Label + inline-fout onder veld (blur-validatie, 24 § 2) |
| **Select / Combobox** | single, searchable | idem + open | Toetsenbord-navigeerbaar; type-ahead |
| **Checkbox / Radio / Switch** | — | checked, indeterminate, disabled | Klikbaar label |
| **Badge / Pill** | status-varianten (statuskleuren 25 § 1.2) | — | Kleur + label (nooit alleen kleur) |
| **Tooltip** | — | hover/focus | Toetsenbord-bereikbaar; niet voor essentiële info |
| **Toast** | success, error, info, undo | enter/exit (150–250ms) | Aria-live; undo-actie waar van toepassing |
| **Modal / Dialog** | standaard, bevestiging (danger) | open/dicht | Focus-trap, ESC sluit, overlay-klik sluit (behalve destructief) |
| **Popover / Dropdown** | menu, content | open/dicht | `shadow-md`; klik-buiten sluit |
| **Skeleton** | tekst, kaart, tabel-rij | shimmer | < 100ms zichtbaar (NFR-105) |
| **Spinner / ProgressBar** | inline, blok | — | Voor async acties/lange taken |
| **EmptyState** | met/zonder actie | — | Copy + primaire actie (24 § 4) |
| **Avatar** | initialen, kleur | — | `radius-full` |

---

## 3. Samengestelde componenten

| Component | Opbouw | Gebruik |
|---|---|---|
| **Toolbar / PageHeader** | titel + primaire actie + overflow | Bovenaan elke pagina (één primaire actie, 24 § 1.1) |
| **DataTable** | kolommen, sortering, paginatie, bulk-selectie, lege staat | Klanten, facturen, beurten |
| **Form** | velden, inline-validatie, submit met loading | Klant/dienst/afspraak aanmaken |
| **FilterBar** | filters + actieve-filter-chips | Facturen, planning |
| **CommandPalette (⌘K)** | zoek + acties, categorieën | Globaal (FR-008, 30_Navigatie.md) |
| **Tabs** | tabbladen | Klant-detail (objecten/tijdlijn/facturen) |
| **DateRangePicker** | periode-selectie | Rapportage, herplan |
| **MapView** | kaart + speldjes (Mapbox) + attributie | Planning, object-locatie (14 § 9) |

---

## 4. Domeincomponenten

| Component | Beschrijving | Kernvelden/gedrag | Ref |
|---|---|---|---|
| **JobCard** | Één beurt (planning of PWA) | Klant, adres, dienst, tijd, status-badge; sleepbaar (tenzij locked → anker-icoon) | FR-022/040 |
| **RouteBoard** | Dagrooster: kolommen per medewerker, drag-and-drop | Live herberekening bij drop; capaciteitsindicatie | FR-021/022/027 |
| **WeekBoard** | Weekrooster voor één medewerker (ZZP): kolommen per dag, drag-and-drop tussen dagen | Route lazy aangemaakt bij eerste drop op een lege dag (`moveJobToDate`); zelfde capaciteitsindicatie als RouteBoard | FR-021/022/027, 27 § 1.2 |
| **RouteStopList** | Geordende stops van een route | Volgorde, reistijd tussen stops, verwachte tijden | 14 § 4.4 |
| **ReplanDiff** | Herplan-voorstel als diff | Beurt · van → naar · extra reistijd; "Accepteren"/"Aanpassen" | FR-024, 15 § 7 |
| **WhyExplanation** | "Waarom?"-uitleg bij voorstel | Reden, datum-delta, cluster, score | PRD § 8.5, BR-700 |
| **CustomerTimeline** | Chronologische events | Beurten, facturen, berichten; filterbaar | FR-007 |
| **InvoicePreview** | Factuur zoals PDF | Regels, BTW, totaal, betaalstatus, QR | FR-062/063 |
| **ServiceAgreementForm** | Dienstafspraak instellen | Dienst, frequentie, prijs, voorkeuren, flexvenster | FR-004 |
| **WeatherBanner** | Weerwaarschuwing | Aantal getroffen beurten, herplan-CTA | FR-023 |
| **KPICard** | Dashboard-tegel | Titel, waarde, trend | FR-102, 28 |
| **StatusBadge** | Beurt-/factuurstatus | Kleur + label + icoon (statusmachine) | 10 |
| **PhotoCapture** | Foto vastleggen (PWA) | Camera, upload naar Storage, thumbnail | FR-044 |
| **CompleteJobSheet** | Beurt afronden (PWA) | "Gereed", notitie, foto, succes-animatie | FR-042 |

---

## 5. Component-staten (verplicht per component)

Elke datagedreven component ondersteunt vier staten (24 § 3–4):
1. **Loading** — skeleton/spinner.
2. **Empty** — lege-staat-copy + evt. actie.
3. **Error** — menselijke melding + retry.
4. **Loaded** — de data.

Reviews checken expliciet of alle vier bestaan; ontbrekende empty/error-staat = niet klaar.

---

## 6. Mobiele varianten

PWA-medewerkercomponenten (29_MobieleApp.md) zijn eigen varianten, geen geschaalde desktop: grotere tap-targets, duimzone-plaatsing van primaire acties, bottom-sheets i.p.v. modals. JobCard, CompleteJobSheet, PhotoCapture en RouteStopList hebben expliciete mobiele ontwerpen.

---

## 7. Toegankelijkheid (component-niveau)

- Alle interactieve componenten toetsenbord-bedienbaar met zichtbare focus (NFR-602).
- Iconbuttons/inputs met labels/`aria`-attributen.
- Toasts via `aria-live`; modals met focus-trap.
- Contrast via tokens gegarandeerd (25 § 1.3).

---

## 8. Governance

- Nieuw UI-patroon → eerst kijken of een bestaand component past; anders component toevoegen (niet lokaal improviseren).
- Componenten gebruiken alleen tokens; geen rauwe kleuren/pixels.
- Storybook-achtige catalogus met alle staten in de codefase (buiten scope documentatiefase).

---

## 9. Externe UI-inspiratie (backlog-kandidaten, nog niet ingepland)

Screenshots van CACAO (healthcare platform, door de platform-eigenaar aangedragen 2026-07-17) leverden drie overdraagbare **patronen** op — niet de visuele identiteit zelf: ServOps' eigen kleuren/typografie/merk (25_DesignSystem.md) blijven leidend, dit document neemt geen huisstijl van een ander product over. Nog niet toegewezen aan een sprint (40_Implementatieplan.md); vermeld hier zodat het patroon niet verloren gaat vóórdat er een geschikt moment is.

| Patroon (bron: CACAO) | Wat het is | Mogelijke toepassing in ServOps |
|---|---|---|
| **Avatar-stack met overflow-teller** | Overlappende cirkel-avatars (initialen) van teamleden op een kaart, met een `+N`-badge voor de rest die niet past | Uitbreiding van het bestaande **Avatar**-primitief (§ 2): op een klant-/route-kaart de betrokken medewerkers tonen zonder een volledige naamlijst te printen |
| **"Aankomende taken"-zijpaneel met "Te laat"-badge** | Compacte lijst: rode "Te laat"-pil + taaknaam + context (klant/werkruimte) + toegewezene-avatar + vervaldatum, rechts op het dashboard | Sluit aan bij de bestaande Vandaag-waarschuwingen ("3 verzonden facturen zijn over de vervaldatum", `lib/briefing/get-briefing.ts`) — zou een generiek `TaskListWidget`-domeincomponent kunnen worden i.p.v. losse tekstregels, herbruikbaar voor openstaande facturen én onplaatsbare beurten |
| **Topbar-identiteitsblok** | Naam + rol + organisatie in twee regels naast de avatar, rechtsboven | ServOps toont nu alleen "Ingelogd als [naam]" (`app/(app)/layout.tsx`) — rol eronder tonen (Eigenaar/Admin/Planner) kost niets extra (al bekend uit `profile.role`) en verduidelijkt direct waarom iemand wel/geen actie ziet (23_Gebruikersrollen.md) |

**Bewust niet overgenomen:** het blauwe gradient-inlogscherm en het CACAO-merk/logo — ServOps' eigen auth-schermen (22_Authenticatie.md) en design tokens (25 § 1) zijn hier leidend, dit is puur patroon-inspiratie.

---

## Changelog

| Datum | Versie | Wijziging |
|---|---|---|
| 2026-07-06 | 1.0 | Placeholder met opsomming |
| 2026-07-07 | 2.0 | Volledige uitwerking: lagenmodel, primitieven, samengestelde + domeincomponenten met refs, verplichte 4 staten, mobiele varianten, toegankelijkheid, governance |
| 2026-07-17 | 2.1 | § 4: RouteBoard-beschrijving verduidelijkt naar "dagrooster" (was al zo geïmplementeerd, nooit een echte weekgrid); WeekBoard toegevoegd — nieuwe weekrooster-variant voor eenmanszaken (27 § 1.2). |
| 2026-07-17 | 2.2 | § 9 (nieuw): drie UI-patronen uit een extern voorbeeld (CACAO healthcare platform) vastgelegd als backlog-kandidaat — avatar-stack met overflow-teller, "aankomende taken"-widget met "Te laat"-badge, topbar-identiteitsblok met rol. Geen huisstijl/merk overgenomen, nog niet ingepland. |
