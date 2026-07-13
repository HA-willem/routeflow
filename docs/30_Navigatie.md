# 30 — Navigatie & Informatiearchitectuur

**Status:** DONE
**Versie:** 2.1
**Bron van waarheid:** `00_PRD.md` § 11.4 (command-first), § 11.8 (mobiel/desktop) — dit document mag het PRD niet tegenspreken.
**Werkinstructie:** zie `MASTER_PROMPT.md`.
**Relaties:** 27_PaginaOverzicht.md (sitemap), 26_ComponentLibrary.md (CommandPalette), 23_Gebruikersrollen.md (rol-afhankelijke nav), 29_MobieleApp.md.

---

## Doel van dit document

Dit document definieert de **informatiearchitectuur (IA)** en **navigatie**: de primaire structuur op desktop en mobiel, de ⌘K-command-palette, breadcrumbs, deep links, en hoe navigatie zich per rol gedraagt. Command-first (PRD § 11.4) is leidend: elke veelgebruikte navigatie/actie is via het palette bereikbaar.

---

## 1. Primaire navigatie — desktop

**Zijbalk (persistent, links):**

| Item | Route | Icoon | Rollen (23) |
|---|---|---|---|
| Vandaag (Morning Briefing) | `/` | zon | Allen (inhoud verschilt per rol, 44 § 2) |
| Planning | `/planning` | kalender | Eigenaar/Admin/Planner |
| Klanten | `/klanten` | mensen | Eigenaar/Admin/Planner/Administratie(R) |
| Facturen | `/facturen` | document | Eigenaar/Admin/Administratie/Planner(R) |
| Dashboard | `/dashboard` | grafiek | Eigenaar/Admin |
| Rapportage | `/rapportage` | grafiek | Eigenaar/Admin (overige beperkt) |
| Instellingen | `/instellingen` | tandwiel | Eigenaar/Admin |

> Sinds ADR-011/PRD § 19 A-21 is `/` de **Morning Briefing** ("Vandaag") — het primaire
> startscherm (44_MorningBriefing_UX.md). Het KPI-dashboard (28_Dashboard.md) leeft op
> `/dashboard`.

- Items waarvoor een rol geen toegang heeft, worden **verborgen** (niet gedisabled).
- Actieve sectie gemarkeerd; zijbalk inklapbaar (icon-only) voor meer werkruimte.
- **Bovenbalk:** ⌘K-zoek, notificatie-inbox (🔔), account/tenant-switch.

---

## 2. Primaire navigatie — mobiel (PWA-medewerker)

Geen zijbalk. De medewerker heeft een **taakgerichte** structuur (29_MobieleApp.md):

- Home = dagroute (`/m`).
- **Bottom-bar** (duimzone), maximaal 3 items: **Route** · **Vandaag/Agenda** · **Profiel**.
- Diepere schermen (beurt-detail) via push-navigatie met terug-knop.

Eigenaren die mobiel het desktop-deel gebruiken, krijgen een compacte variant van de desktop-IA (§ 1) — gescheiden van de medewerkersflow.

---

## 3. Command Palette (⌘K / Ctrl+K)

De kern van command-first (FR-008, 26 CommandPalette).

### 3.1 Inhoud
| Categorie | Voorbeelden |
|---|---|
| Navigatie | "Ga naar Planning", "Open Facturen" |
| Zoeken | Klanten, objecten, beurten, facturen (fuzzy, resultaat met preview) |
| Acties | "Nieuwe klant", "Plan deze week opnieuw", "Factuur zoeken", "Herplan-wachtrij" |
| Recent | Laatst bezochte klanten/facturen |

### 3.2 Gedrag
- Sneltoets ⌘K (mac) / Ctrl+K (win/linux); ook via zoekveld in bovenbalk.
- Fuzzy, case-insensitief; toetsenbord-navigeerbaar (↑↓, Enter).
- Resultaten gegroepeerd per categorie; toont context ("Bakkerij Jansen · 3 objecten").
- Rol-bewust: acties/resources waarvoor geen recht bestaat, verschijnen niet.

---

## 4. Secundaire navigatie

- **Tabs** binnen detailpagina's (klant: Objecten · Dienstafspraken · Tijdlijn · Facturen).
- **Breadcrumbs** op geneste pagina's: `Klanten / Bakkerij Jansen / Kerkstraat 42`.
- **Filters & chips** in lijsten (facturen op status/periode) — deel van de pagina, niet de globale nav.

---

## 5. Deep links & URL-structuur

- Alle resources hebben een deelbare, bookmarkbare URL (27_PaginaOverzicht.md § 5).
- Deep link naar een resource buiten je rol → 403 met nette melding (23 RB-04), geen lek van bestaan/inhoud.
- Deep link naar andere tenant → behandeld als niet-bestaand (RLS, tenant-isolatie).
- PWA `start_url = /m` voor medewerkers.

---

## 6. Navigatiestatus & feedback

- Actieve route gemarkeerd in zijbalk/bottom-bar.
- Paginaovergangen: prefetch + skeleton, voelt instant (NFR-105).
- Terug-gedrag: browser-back werkt logisch; op mobiel push/pop met terug-knop.
- Ongomen wijzigingen: waarschuwing bij weg-navigeren van een dirty formulier.

---

## 7. Toegankelijkheid

- Volledige toetsenbordbediening desktop, incl. skip-to-content en ⌘K (NFR-602).
- Zichtbare focus-states; nav-landmarks (`<nav aria-label>`).
- Bottom-bar mobiel met labels (niet alleen iconen) voor duidelijkheid.

---

## 8. IA-boom (samenvatting)

```
Desktop (zijbalk)
  Dashboard · Planning (→ Wachtrij) · Klanten (→ detail → object) ·
  Facturen (→ detail) · Rapportage · Instellingen (→ subpagina's)
  Overlays: ⌘K · Notificatie-inbox · Toaster

Mobiel (bottom-bar)
  Route (/m) → Beurt-detail · Agenda · Profiel
```

Volledige mapping met FR's en rollen: 27_PaginaOverzicht.md.

---

## Changelog

| Datum | Versie | Wijziging |
|---|---|---|
| 2026-07-06 | 1.0 | Placeholder met boomschets |
| 2026-07-07 | 2.0 | Volledige uitwerking: desktop-zijbalk + mobiele bottom-bar (rol-bewust), ⌘K-palette (inhoud/gedrag), tabs/breadcrumbs, deep links & 403-gedrag, navigatiefeedback, toegankelijkheid, IA-boom |
| 2026-07-13 | 2.1 | § 1 bijgewerkt aan PRD § 19 A-21: `/` is de Morning Briefing ("Vandaag", 44_MorningBriefing_UX.md); KPI-dashboard verhuisd naar `/dashboard` (Eigenaar/Admin). ⌘K-palette uit § 1/§ 3 nu daadwerkelijk gebouwd (CommandBar, cmdk). |
