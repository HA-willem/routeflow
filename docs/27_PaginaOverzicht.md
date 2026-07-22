# 27 — Pagina-Overzicht

**Status:** DONE
**Versie:** 2.4
**Bron van waarheid:** `00_PRD.md` § 7, § 11 — dit document mag het PRD niet tegenspreken.
**Werkinstructie:** zie `MASTER_PROMPT.md`.
**Relaties:** 30_Navigatie.md (routes/IA), 26_ComponentLibrary.md (componenten), 28_Dashboard.md, 29_MobieleApp.md, 08_FunctioneleEisen.md (FR per pagina), 23_Gebruikersrollen.md (toegang), `docs/adr/ADR-011-human-in-the-loop-ai.md` en `43_AI_Agents.md` (FR-900 Morning Briefing, § 1.1).

---

## Doel van dit document

Dit document geeft de **volledige sitemap**: elke pagina/scherm met doel, primaire actie, belangrijkste componenten, gekoppelde FR's en toegestane rollen. Het is de kaart die 08 (wat), 26 (waarmee) en 30 (navigatie) samenbrengt.

Splitsing volgt PRD § 11.8: **desktop = regie**, **mobiel (PWA) = uitvoering**. Sommige pagina's bestaan alleen desktop, andere alleen mobiel.

---

## 1. Desktop-applicatie (planner/eigenaar/administratie)

### 1.1 Dashboard `/`
- **Doel:** in één blik weten hoe het bedrijf ervoor staat (28_Dashboard.md) — sinds ADR-011 formeel de **Morning Briefing** (FR-900): het door de acht AI Agents (`43_AI_Agents.md`) samengestelde dagoverzicht, klaar vóór inloggen.
- **Primaire actie:** contextafhankelijk ("Plan deze week", "Herplan-wachtrij bekijken").
- **Componenten:** KPICard, WeatherBanner, ReplanDiff-teaser, omzetgrafiek.
- **FR:** FR-102, FR-900. **Rollen:** Eigenaar/Admin (volledig), Planner/Administratie (beperkt, 23 voetnoot 10).

### 1.2 Planning `/planning`
- **Doel:** week-/dagplanning maken en corrigeren.
- **Primaire actie:** "Plan (opnieuw)".
- **Componenten:** RouteBoard (drag-and-drop, kolom per medewerker/dag) of WeekBoard (kolom per dag, alleen bij één actieve medewerker — § "ZZP-weekgrid" hieronder), JobCard, MapView, capaciteitsindicatie, WhyExplanation, ProposalList (AI-voorstellen binnen de zichtbare week/dag, zie 1.1).
- **Subweergaven:** Week (default), Dag, Kaart.
- **ZZP-weekgrid (2026-07-17):** heeft het bedrijf precies één actieve medewerker, dan toont de Week-subweergave een echte weekgrid — 7 dagkolommen naast elkaar, drag-and-drop verplaatst een beurt tussen dagen (niet alleen tussen medewerkers). Bij meerdere medewerkers blijft Week het bestaande kolom-per-medewerker/dagchip-model (RouteBoard.tsx-doc-comment: een volledige medewerker×dag-weekgrid is een grotere, niet-gevraagde UI-uitbreiding).
- **AI-voorstellen op Planning (2026-07-17):** dezelfde open voorstellen als de Morning Briefing (1.1), maar gefilterd tot de zichtbare week/dag i.p.v. "vandaag t/m horizon" — geen `aiPreview`-demo-fallback (Planning is een operationeel scherm, geen showcase); bij nul open voorstellen toont de sectie zichzelf niet.
- **FR:** FR-020…028. **Rollen:** Eigenaar/Admin/Planner.

### 1.3 Herplan-wachtrij `/planning/wachtrij`
- **Doel:** onplaatsbare/niet-thuis/uitgestelde beurten afhandelen.
- **Primaire actie:** "Auto-herplan".
- **Componenten:** lijst met JobCard, ReplanDiff.
- **FR:** FR-024/043. **Rollen:** Eigenaar/Admin/Planner.

### 1.4 Klanten `/klanten`
- **Doel:** klantenkring beheren.
- **Primaire actie:** "Klant toevoegen".
- **Componenten:** DataTable, FilterBar, zoek.
- **FR:** FR-001/006/008. **Rollen:** Eigenaar/Admin/Planner (C/R/U), Administratie (R).
- **Nieuwe klant (2026-07-17):** `/klanten/nieuw` is een doorlopende 3-stappen-wizard (klantgegevens → adres/object → dienst+frequentie, `NieuweKlantWizard`) die klant, object en dienstafspraak in één flow aanmaakt — de bestaande automatische beurt-generatie (FR-020) start meteen na stap 3. Stap 2/3 hebben een "Later toevoegen"-ontsnapping voor een klant met meerdere/nog onbekende locaties; de losse pagina's (object/dienstafspraak toevoegen) blijven bestaan voor die gevallen.

### 1.5 Klant-detail `/klanten/[id]`
- **Doel:** alles van één klant: objecten, dienstafspraken, tijdlijn, facturen.
- **Primaire actie:** contextueel per tab.
- **Componenten:** Tabs (Objecten · Dienstafspraken · Tijdlijn · Facturen), ServiceAgreementForm, CustomerTimeline.
- **FR:** FR-003/004/005/007. **Rollen:** idem klanten.
- **Beurten (2026-07-17):** boven de tabs toont een regel "Volgende beurt: …" (eerstvolgende niet-geannuleerde beurt, over alle objecten van de klant). De tab-lijst heeft een gerichte tab "Beurten": datum/adres/dienst/status van alle beurten (voorgesteld → uitgevoerd), met een vink bij `completed`. Dit is een eerste, afgebakende bouwsteen richting de volledige FR-007-Tijdlijn hierboven (die ook facturen/communicatie combineert) — nog geen vervanging ervan.

### 1.6 Object-detail `/klanten/[id]/objecten/[objectId]`
- **Doel:** adres, locatie, toegangsinstructies, dienstafspraken van één object.
- **Componenten:** MapView (pin/handmatig plaatsen), ServiceAgreementForm.
- **FR:** FR-002/003. **Rollen:** idem.

### 1.7 Facturen `/facturen`
- **Doel:** concept → definitief, verzenden, debiteuren.
- **Primaire actie:** "Finaliseren" (bulk mogelijk).
- **Componenten:** DataTable, FilterBar (status/periode), InvoicePreview.
- **FR:** FR-060…068. **Rollen:** Eigenaar/Admin/Administratie (C/U), Planner (R).

### 1.8 Factuur-detail `/facturen/[id]`
- **Doel:** één factuur bekijken/bewerken/crediteren.
- **Componenten:** InvoicePreview, betaalstatus, creditfactuur-actie.
- **FR:** FR-062/063/067/068. **Rollen:** idem facturen.

### 1.9 Rapportage `/rapportage`
- **Doel:** omzet, routes, productiviteit (V1).
- **Componenten:** grafieken, DateRangePicker, DataTable.
- **FR:** PRD § 5.2 (rapportage). **Rollen:** Eigenaar/Admin (volledig), overige beperkt.

### 1.10 Instellingen `/instellingen`
- **Doel:** bedrijf inrichten.
- **Subpagina's:** Bedrijf · Diensten · Prijzen · Medewerkers & rollen · Berichttemplates · Notificaties · Facturatie-instellingen.
- **FR:** FR-100/081. **Rollen:** Eigenaar (alles incl. billing), Admin (excl. billing).

### 1.11 Onboarding `/onboarding`
- **Doel:** in 3 stappen starten (< 15 min).
- **Componenten:** wizard-stappen, Form, MapView.
- **FR:** FR-101. **Rollen:** Eigenaar (eerste login).

### 1.12 Auth-pagina's `/login`, `/wachtwoord-vergeten`, `/uitnodiging/[token]`
- **Doel:** in-/uitloggen, reset, medewerker-uitnodiging accepteren.
- **FR:** 22_Authenticatie.md. **Rollen:** publiek/uitgenodigd.

---

## 2. Mobiele PWA (medewerker)

### 2.1 Dagroute `/m` (home)
- **Doel:** de route van vandaag in volgorde.
- **Primaire actie:** "Start route".
- **Componenten:** RouteStopList, JobCard (mobiel), MapView.
- **FR:** FR-040. **Rollen:** Medewerker (eigen route).

### 2.2 Beurt-detail `/m/beurt/[id]`
- **Doel:** één stop uitvoeren.
- **Primaire actie:** "Gereed".
- **Componenten:** adres + navigatieknop, CompleteJobSheet, PhotoCapture, "Niet thuis".
- **FR:** FR-041/042/043/044. **Rollen:** Medewerker.

### 2.3 Profiel/beschikbaarheid `/m/profiel`
- **Doel:** eigen gegevens, ziekmelding, uitloggen.
- **FR:** FR-024 (ziekmelding, BR-802). **Rollen:** Medewerker.

---

## 3. Globale overlays (alle pagina's)

| Overlay | Doel | Ref |
|---|---|---|
| Command Palette (⌘K) | Navigatie + acties | FR-008, 30 |
| Notificatie-inbox | Interne meldingen | FR-082, 21 |
| Toaster | Feedback + undo | 24 § 2 |

---

## 4. Paginastaten

Elke datagedreven pagina implementeert loading/empty/error/loaded (26 § 5). Lege staten per pagina zijn gespecificeerd in 24_UI_UX.md § 4.

---

## 5. Sitemap (boom)

```
/(desktop)
├── /                       Dashboard
├── /planning
│   └── /wachtrij           Herplan-wachtrij
├── /klanten
│   └── /[id]
│       └── /objecten/[id]
├── /facturen/[id]
├── /rapportage
├── /instellingen/*
├── /onboarding
└── /login · /wachtwoord-vergeten · /uitnodiging/[token]

/m (PWA)
├── /m                      Dagroute
├── /m/beurt/[id]
└── /m/profiel
```

---

## Changelog

| Datum | Versie | Wijziging |
|---|---|---|
| 2026-07-06 | 1.0 | Placeholder met 5 pagina's |
| 2026-07-07 | 2.0 | Volledige sitemap: 12 desktop-pagina's + 3 PWA-schermen + globale overlays, elk met doel/primaire actie/componenten/FR/rollen; boomstructuur |
| 2026-07-12 | 2.1 | § 1.1 Dashboard aangevuld met FR-900 (Morning Briefing, ADR-011) — geen wijziging aan componenten/rollen, alleen de architecturale herkomst expliciet gemaakt. |
| 2026-07-17 | 2.2 | § 1.2 Planning: ZZP-weekgrid (WeekBoard, alleen bij 1 actieve medewerker) en AI-voorstellen (ProposalList, gefilterd tot de zichtbare week/dag) toegevoegd — voortvloeiend uit gebruikersverzoek, geen PRD-conflict (FR-020…028 blijven ongewijzigd van toepassing). |
| 2026-07-17 | 2.3 | § 1.4 Klanten: FilterBar (zoeken op naam/e-mail/telefoon, filter op type en plaats, actieve-filter-chips) en paginering nu daadwerkelijk gebouwd — dit was al onderdeel van FR-001/006/008 en 26_ComponentLibrary.md § 3, alleen nog niet geïmplementeerd. Kolommen Adres/Plaats tonen het adres van het eerste object van de klant (adres leeft op Object, niet op Klant — 12_Entiteiten.md § 3/4); "wijk" bestaat nergens als datamodel-veld en wordt hier vervangen door het wél bestaande `objects.city`. Geen FR-hernummering. |
| 2026-07-17 | 2.4 | § 1.4 "Nieuwe klant" is nu een 3-stappen-wizard (klant→object→dienstafspraak in één flow, automatische beurt-generatie aan het eind — hergebruikt bestaande FR-001/003/004/020-mechanismen, geen nieuwe Server Actions). § 1.5 Klant-detail: "Volgende beurt"-regel + tab "Beurten" (geschiedenis met voltooid-vink) toegevoegd als gerichte eerste bouwsteen richting de bredere FR-007-Tijdlijn. Geen FR-hernummering. |
