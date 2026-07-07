# 24 — UI/UX Richtlijnen

**Status:** DONE
**Versie:** 2.0
**Bron van waarheid:** `00_PRD.md` § 11 (UX-principes & Design-uitgangspunten) — dit document mag het PRD niet tegenspreken.
**Werkinstructie:** zie `MASTER_PROMPT.md`.
**Relaties:** 25_DesignSystem.md (tokens), 26_ComponentLibrary.md (componenten), 27_PaginaOverzicht.md, 29_MobieleApp.md, 30_Navigatie.md, 09_NietFunctioneleEisen.md (NFR-6xx).

---

## Doel van dit document

Dit document vertaalt de tien UX-principes uit PRD § 11 naar **concrete, toetsbare richtlijnen**: hoe voelt RouteFlow, hoe gedragen interacties zich, en welke regels gelden voor lege staten, foutmeldingen, laadstatussen en motion. Het is de brug tussen productvisie (01) en het design system (25).

Design-DNA (PRD § 1): minimalistisch, premium, snel, veel witruimte — geïnspireerd op Apple, Linear, Notion, Stripe, Raycast. Nadrukkelijk géén ouderwetse ERP-uitstraling.

---

## 1. De tien principes → richtlijnen

### 1.1 Rust door reductie
- **Max. één primaire actie per scherm** (één gevulde knop). Secundaire acties zijn tekstknoppen of in een overflow-menu (`⋯`).
- Geen dichte datagrids als default; toon wat nodig is, detail on-demand.
- Regel: als een scherm twee "belangrijkste" knoppen lijkt te hebben, is het scherm te vol.

### 1.2 Witruimte is feature
- Spacing-schaal 4/8/12/16/24/32/48/64 (25_DesignSystem.md). Nooit ad-hoc pixelwaarden.
- Ademruimte rond primaire content; lijsten met royale rijhoogte (≥ 44px, ook i.v.m. NFR-604).

### 1.3 Snelheid als beleving
- **Optimistic UI overal**: mutatie toont direct resultaat, server bevestigt async; bij fout → rollback + toast.
- Skeleton-states < 100 ms; nooit een blanco witte flash.
- Prefetch bij hover/intent; navigatie voelt instant (NFR-105).

### 1.4 Command-first
- **⌘K/Ctrl+K palette** voor navigatie én acties ("nieuwe klant", "factuur zoeken") — Raycast/Linear-stijl (FR-008, 30_Navigatie.md).
- Elke veelgebruikte actie is bereikbaar via het palette.

### 1.5 Motion met betekenis
- Micro-animaties 150–250 ms, `ease-out`, bij statuswissels en transitions.
- Geen decoratieve animatie. Toets: "heeft dit doel of siert het alleen?" — alleen het eerste komt in code (PRD § 3.2 / 01 § 4.7).
- Respecteer `prefers-reduced-motion`: animaties uit/gereduceerd.

### 1.6 Lege staten verkopen het product
- Elke lege lijst legt uit **wat hier komt** + biedt de **eerste actie** aan (§ 4).

### 1.7 Foutmeldingen zijn menselijk
- Structuur: **oorzaak + oplossing + actieknop**. Nooit kale codes (§ 5).

### 1.8 Mobiel = uitvoering, desktop = regie
- PWA-medewerkersflow is een eigen, geoptimaliseerde ervaring (grote tap-targets, duimzone, één-hand) — geen geschaalde desktop (29_MobieleApp.md).
- Desktop = planning/regie: meerdere kolommen, drag-and-drop, sneltoetsen.

### 1.9 Toegankelijkheid
- WCAG 2.1 AA-doel; volledige toetsenbordbediening desktop (NFR-601/602).
- Focus-states zichtbaar; contrast ≥ 4,5:1; geen kleur als enige informatiedrager.

### 1.10 Donkere modus
- Vanaf V1, systeemvoorkeur-volgend; beide thema's getest (25_DesignSystem.md).

---

## 2. Interactiepatronen

| Patroon | Regel |
|---|---|
| Bevestigen vs. undo | Voorkeur voor **undo** boven bevestigingsdialoog ("Automatisch, tenzij", 01 § 4.2). Alleen destructieve, onomkeerbare acties (klant anonimiseren, factuur crediteren) vragen expliciete bevestiging. |
| Opslaan | Autosave waar veilig; anders duidelijke primaire "Opslaan" met dirty-state-indicatie. |
| Drag-and-drop | Directe visuele feedback (schaduw/lift), live herberekening, undo na drop (FR-022). Vergrendelde items niet sleepbaar (anker-icoon). |
| Inline validatie | Valideer bij blur, niet bij elke toetsaanslag; toon fout onder het veld met oplossing. |
| Bulk-acties | Selectie + één actiebalk; toon aantal ("3 facturen finaliseren"). |
| Realtime updates | Wijziging door collega verschijnt live (WebSocket) met subtiele highlight, niet met een storende sprong. |

---

## 3. Laadstatussen

| Situatie | Patroon |
|---|---|
| Eerste paginalading | Skeleton die de layout nabootst (< 100 ms zichtbaar) |
| Actie in uitvoering | Knop → spinner-in-knop + gedisabled; rest van UI blijft bruikbaar |
| Lange server-taak (planning, PDF) | Voortgangsindicator + "je kunt doorwerken"; notificatie bij klaar |
| Offline (PWA) | Badge "Offline"; wijzigingen in retry-queue met sync-indicator (20_PWA.md) |

---

## 4. Lege staten (specificaties)

| Scherm | Lege-staat-copy | Eerste actie |
|---|---|---|
| Klanten (geen) | "Nog geen klanten. Voeg je eerste klant toe — daarna plant RouteFlow automatisch." | "Klant toevoegen" |
| Planning-week (geen beurten) | "Nog niets gepland. Voeg klanten met dienstafspraken toe; wij stellen de eerste week voor." | "Naar klanten" |
| Facturen (geen) | "Zodra je een beurt afrondt, verschijnt hier automatisch een conceptfactuur." | — (informatief) |
| Herplan-wachtrij (leeg) | "Alles gepland — niets in de wachtrij. Mooi." | — |
| Diensten (geen) | "Voeg je eerste dienst toe of kies een branche-template." | "Dienst toevoegen" |
| Zoekresultaat (leeg) | "Niets gevonden voor '{query}'. Probeer een andere term." | — |

Lege staten zijn nooit een kale "geen data" — ze verkopen de volgende stap (PRD § 11.6).

---

## 5. Foutmeldingen (patroon & voorbeelden)

**Patroon:** *[Oorzaak]. [Oplossing]. [Actieknop]* — menselijk, Nederlands, nooit een technische code zonder context.

| Situatie | Melding |
|---|---|
| Klant verwijderen met facturen | "Deze klant heeft facturen en kan niet worden verwijderd. Archiveer de klant om de historie te bewaren." → knop "Archiveren" |
| Adres niet gevonden | "Dit adres kunnen we niet vinden. Controleer postcode en huisnummer, of zet de locatie handmatig op de kaart." → knop "Handmatig plaatsen" |
| Netwerk weg | "Je bent offline. Je wijzigingen worden verzonden zodra je weer verbinding hebt." |
| Route te vol | "Deze beurt past niet op woensdag — de werkdag zou 9u10 worden (max 8u30). Kies een andere dag." |
| Betaling mislukt | "De betaling is niet gelukt. De klant heeft een nieuwe betaallink ontvangen." → knop "Opnieuw sturen" |

Toon technische details (foutcode/correlatie-id) hooguit ingeklapt onder "Details" voor support.

---

## 6. Toon & copy

- **Nederlands eerst** (PRD § 3.2 / 01 § 4.6): alle UI-strings via i18n-keys, geen hardcoded tekst.
- Aanspreekvorm: informeel "je/jij" (past bij ZZP/klein-bedrijf-doelgroep).
- Kort, actief, concreet. Knoppen zijn werkwoorden ("Plannen", "Versturen", "Archiveren"), geen "OK".
- Getallen/valuta/datums in NL-notatie (€ 1.250,00 · 14-07-2026).

---

## 7. Responsiviteit & breekpunten

| Breekpunt | Gebruik |
|---|---|
| < 640px | Mobiel (PWA-medewerker primair; desktop-schermen in compacte vorm) |
| 640–1024px | Tablet (planning leesbaar, beperkte drag-drop) |
| > 1024px | Desktop-regie (volledige planning, meerdere kolommen) |

Mobiel en desktop zijn qua interactie **fundamenteel anders** (§ 1.8), geen simpele grid-collapse.

---

## 8. Acceptatie (hoe getoetst)

- Design-review per scherm tegen § 1–7.
- Toegankelijkheid: axe-scan + toetsenbordtest (NFR-601/602).
- "15-minuten-test": nieuwe gebruiker plant zonder handleiding een eerste route (01 § 4.4).
- Motion-audit: elke animatie heeft aantoonbaar doel.

---

## Changelog

| Datum | Versie | Wijziging |
|---|---|---|
| 2026-07-06 | 1.0 | Placeholder met 7 losse principes |
| 2026-07-07 | 2.0 | Volledige uitwerking: 10 principes→richtlijnen, interactiepatronen, laadstatussen, lege-staat-specificaties, foutmeldingspatroon met voorbeelden, toon/copy, responsiviteit, acceptatie |
