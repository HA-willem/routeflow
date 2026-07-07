# 27 — Pagina-Overzicht

**Status:** DONE
**Versie:** 2.0
**Bron van waarheid:** `00_PRD.md` § 7, § 11 — dit document mag het PRD niet tegenspreken.
**Werkinstructie:** zie `MASTER_PROMPT.md`.
**Relaties:** 30_Navigatie.md (routes/IA), 26_ComponentLibrary.md (componenten), 28_Dashboard.md, 29_MobieleApp.md, 08_FunctioneleEisen.md (FR per pagina), 23_Gebruikersrollen.md (toegang).

---

## Doel van dit document

Dit document geeft de **volledige sitemap**: elke pagina/scherm met doel, primaire actie, belangrijkste componenten, gekoppelde FR's en toegestane rollen. Het is de kaart die 08 (wat), 26 (waarmee) en 30 (navigatie) samenbrengt.

Splitsing volgt PRD § 11.8: **desktop = regie**, **mobiel (PWA) = uitvoering**. Sommige pagina's bestaan alleen desktop, andere alleen mobiel.

---

## 1. Desktop-applicatie (planner/eigenaar/administratie)

### 1.1 Dashboard `/`
- **Doel:** in één blik weten hoe het bedrijf ervoor staat (28_Dashboard.md).
- **Primaire actie:** contextafhankelijk ("Plan deze week", "Herplan-wachtrij bekijken").
- **Componenten:** KPICard, WeatherBanner, ReplanDiff-teaser, omzetgrafiek.
- **FR:** FR-102. **Rollen:** Eigenaar/Admin (volledig), Planner/Administratie (beperkt, 23 voetnoot 10).

### 1.2 Planning `/planning`
- **Doel:** week-/dagplanning maken en corrigeren.
- **Primaire actie:** "Plan (opnieuw)".
- **Componenten:** RouteBoard (drag-and-drop), JobCard, MapView, capaciteitsindicatie, WhyExplanation.
- **Subweergaven:** Week (default), Dag, Kaart.
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

### 1.5 Klant-detail `/klanten/[id]`
- **Doel:** alles van één klant: objecten, dienstafspraken, tijdlijn, facturen.
- **Primaire actie:** contextueel per tab.
- **Componenten:** Tabs (Objecten · Dienstafspraken · Tijdlijn · Facturen), ServiceAgreementForm, CustomerTimeline.
- **FR:** FR-003/004/005/007. **Rollen:** idem klanten.

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
