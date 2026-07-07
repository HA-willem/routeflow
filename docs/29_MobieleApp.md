# 29 — Mobiele App (PWA-Medewerker)

**Status:** DONE
**Versie:** 2.0
**Bron van waarheid:** `00_PRD.md` § 7.3 (FR-040…045), § 11.8 (mobiel = uitvoering) — dit document mag het PRD niet tegenspreken.
**Werkinstructie:** zie `MASTER_PROMPT.md`.
**Relaties:** 20_PWA.md (platform), 27_PaginaOverzicht.md (§ 2), 26_ComponentLibrary.md (mobiele varianten), 30_Navigatie.md, 08_FunctioneleEisen.md.

---

## Doel van dit document

Dit document specificeert de **mobiele medewerkerservaring**: de schermen, flows en interactieregels van de PWA waarin de Medewerker zijn dagroute uitvoert. Kernprincipe (PRD § 11.8): **mobiel = uitvoering, geen geschaalde desktop** — eigen UX met grote tap-targets, duimzone-bediening en één-hand-gebruik.

Doelpersona: Jeroen (05_UserPersonas.md, Persona 4) — hoge tech-affiniteit, 100% mobiel tijdens werkdag, wil helderheid en snelheid.

---

## 1. Ontwerpprincipes (mobiel-specifiek)

1. **Duimzone-first:** primaire acties onderin het scherm (bottom-sheet/bottom-bar), bereikbaar met één duim.
2. **Grote tap-targets:** ≥ 44×44 px (NFR-604); royale afstand tussen acties (geen mis-taps).
3. **Eén taak per scherm:** de medewerker doet één ding tegelijk (rijden → aankomen → afronden).
4. **Minimale invoer:** afvinken met één tik; typen optioneel.
5. **Glanceable:** in een oogopslag "waar nu heen, hoe lang".
6. **Robuust offline:** werkt door bij netwerkverlies (20_PWA.md § 3).

---

## 2. Schermen

### 2.1 Dagroute `/m` (home)
- **Kop:** "Goedemorgen, {voornaam}! Vandaag {n} beurten." + sync-indicator.
- **Weergave:** geordende stoplijst (RouteStopList) met per stop: volgnummer, klant/adres, dienst, verwachte tijd, status. Toggle naar kaartweergave (speldjes in volgorde).
- **Primaire actie (onderin):** "Start route".
- **Realtime:** planningswijziging (herplan, extra beurt) verschijnt live met subtiele highlight (FR-040).

### 2.2 Beurt-detail `/m/beurt/[id]`
- **Inhoud:** klant, adres, toegangsinstructies, dienst(en), verwachte duur, notities. **Geen prijzen** (23 P1).
- **Acties (duimzone):**
  - **"Navigeren"** → één-tik deep-link naar Google/Apple Maps (FR-041).
  - **"Start"** → status `onderweg` (timestamp).
  - **"Gereed"** → CompleteJobSheet (§ 2.3).
  - **"Niet thuis"** → niet-thuis-flow (§ 2.4).

### 2.3 Beurt afronden (CompleteJobSheet)
- Bottom-sheet: grote **"Gereed ✓"**-knop.
- Optioneel: notitie (tekst), **foto** (voor/na, PhotoCapture, FR-044).
- Bevestiging: subtiele succes-animatie (respecteert reduced-motion) + toast; auto-door naar volgende stop.
- Status: `onderweg → uitgevoerd`; conceptfactuur getriggerd (FR-042/060).

### 2.4 Niet-thuis-flow
- Knop "Niet thuis" → keuze: "Geen gehoor" / "Gesloten" / "Uitgesteld".
- Effect: status `niet_thuis`, frequentie-teller loopt niet (BR-015), beurt → herplan-wachtrij; klant krijgt automatisch bericht indien opt-in (FR-043, 19).
- Melding: "Genoteerd. De klant is geïnformeerd." (of: "Klant heeft geen berichtvoorkeur.")

### 2.5 Profiel/beschikbaarheid `/m/profiel`
- Eigen naam/contact, **ziekmelding vandaag** (triggert reactieve herplanning, BR-802), uitloggen (leegt lokale cache/queue).

---

## 3. Dagverloop (happy path)

```
07:30  Open app → dagroute (6 beurten)          [Start route]
08:00  Start → "Volgende: Bakkerij Jansen, 5 min" [Navigeren]
08:05  Aangekomen → [Start] dienst
08:52  Klaar → [Gereed] (+ foto/notitie) → confetti → volgende stop
 …     herhaal
17:30  Laatste stop klaar → "Top werk! 6 beurten afgerond."
```

Zie 06_UserJourneys.md (Journey 3) voor de volledige belevingsbeschrijving.

---

## 4. Staten & foutafhandeling

| Situatie | Gedrag |
|---|---|
| Geen route vandaag | "Je hebt vandaag geen beurten. Geniet van je dag!" |
| Offline | Badge "Offline"; lezen uit cache; mutaties in queue (20 § 3) |
| Foto-upload mislukt | Blijft in queue; retry bij verbinding; medewerker niet geblokkeerd |
| Beurt gewijzigd door planner tijdens route | Live update + korte melding "Je route is aangepast" |
| GPS/navigatie-app ontbreekt | Fallback: ingebedde kaart met adres + kopieer-knop |
| Ziekmelding | Bevestiging + "Je planner is op de hoogte en herplant je route" |

---

## 5. Toegankelijkheid & ergonomie

- Tap-targets ≥ 44px (NFR-604); contrast via tokens (25).
- Werkbaar met handschoenen/natte handen: grote knoppen, geen precisie-gestures vereist.
- Leesbaar in fel zonlicht: hoog contrast, donkere-modus-optie.
- Geen essentiële functie achter hover (touch heeft geen hover).

---

## 6. Wat de medewerker NIET ziet (grenzen)

- Geen prijzen, facturen, betalingen, omzet (23 P1).
- Geen routes van collega's (alleen eigen route, 23 P2).
- Geen instellingen/klantbeheer/planning-mutaties (behalve eigen beurt-status en ziekmelding).

---

## Changelog

| Datum | Versie | Wijziging |
|---|---|---|
| 2026-07-06 | 1.0 | Placeholder met 4 schermen |
| 2026-07-07 | 2.0 | Volledige uitwerking: mobiel-specifieke ontwerpprincipes, 5 schermen met acties, dagverloop, staten/foutafhandeling, toegankelijkheid/ergonomie, expliciete grenzen (geen prijzen/collega-routes) |
