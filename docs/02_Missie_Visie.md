# 02 — Missie & Visie

**Status:** DONE
**Versie:** 2.0
**Bron van waarheid:** `00_PRD.md` § 3 (Productvisie & Positionering) — dit document mag het PRD niet tegenspreken.
**Werkinstructie:** zie `MASTER_PROMPT.md`.

---

## Doel van dit document

Dit document articuleert de **missie, visie, kernwaarden en merkbelofte** van RouteFlow als organisatie (niet enkel product — zie 01_Productvisie.md voor product-missie).

---

## 1. Missie

> **RouteFlow stelt servicebedrijven in staat om zonder stress aan hun belofte tegen klanten te voldoen: werk op tijd, goed uitgevoerd, en eerlijk gefactureerd.**

### Uitleg

- **Servicebedrijven:** glazenwassers, schoonmakers, hoveniers, e.d. — 1–50 medewerkers
- **Zonder stress:** automation haalt administratie-zware werk weg
- **Belofte tegen klanten:** "We komen volgende week dinsdag" + "Factuur volgt snel"
- **Op tijd:** routing + AI planning
- **Goed uitgevoerd:** medewerker ziet duidelijke instructies; geen chaos
- **Eerlijk gefactureerd:** automatische, correcte facturen

---

## 2. Visie (organisatie, 5 jaar)

> **RouteFlow is de vertrouwde business-partner van Nederlandse servicebedrijven — zij zetten ons in om beter te groeien en te concurreren met grotere spelers.**

### Wat betekent dit?

- **Vertrouwd:** best-in-class security, AVG-compliance, betrouwbare uptime
- **Business-partner:** we geven advies (benchmarks, best-practices), niet alleen tools
- **Nederlandse focus:** nl-taal, iDEAL, PostNL-integratie, lokale support
- **Beter groeien:** bedrijf groeit van 5 naar 10 medewerkers zonder chaos; RouteFlow schaalt mee
- **Concurreren:** kleine bedrijven hebben dezelfde tech als TUI/DPD, niet alleen papier vs. software

---

## 3. Kernwaarden

| Waarde | Betekenis | In praktijk |
|---|---|---|
| **Efficientie** | Elke minuut telt; automatisering is geen luxe, maar noodzaak | Design voor 1-click, niet 5-staps formulieren |
| **Transparantie** | Gebruiker begrijpt waarom | "Waarom"-button op elke planning-suggestie |
| **Lokaal eerst** | Nederland niet als launch-pad, maar kern | Nederlands support, iDEAL, KNMI-weer, NL-adressen |
| **Betrouwbaarheid** | Wanneer RouteFlow niet beschikbaar is, staat werk stil | 99,5% uptime, GDPR-certified, backups getest |
| **Groeien samen** | Je groei is onze groei | Pricing gestaffeld, geen hoge switching-costs |

---

## 4. Merkbelofte

### Voor eigenaren/planners:

> **RouteFlow plan je werkweek in de tijd van een koffie. Je weet wat je verdient. Je hoeft niet meer in het hoofd van je eigenaar te wonen.**

- Automatische planning, niet handmatig puzzelen
- Facturen volgen automatisch
- Inzicht in realtime

### Voor medewerkers:

> **RouteFlow weet waar je heen moet, hoe lang het duurt, en geeft je een seintje als je achtert.**

- Duidelijke dagroute op telefoon
- Realtime updates van wijzigingen
- Geen papier, geen telefoon-chaos

### Voor klanten (eindklanten):

> **RouteFlow zorgt dat je bedrijf ons nooit vergeet, dat we stipt zijn, en dat je snel je geld krijgt.**

- "Morgen-bericht" punctueel (via WhatsApp/e-mail)
- Betaallink in factuur
- Niet herhaalde vragen over open rekeningen

---

## 5. Toon & taal van het merk

De merkstem is de consistente persoonlijkheid achter elke tekst — van knoplabels tot foutmeldingen tot marketing. Ze operationaliseert het design-DNA (PRD § 1: premium, rustig) en "Nederlands eerst" (PRD § 3.2 / 01 § 4.6).

### 5.1 Merkpersoonlijkheid

RouteFlow klinkt als een **capabele, rustige collega die het overzicht heeft** — niet als een corporate ERP-handleiding en niet als een schreeuwerige start-up.

| Wel | Niet |
|---|---|
| Rustig, zelfverzekerd | Schreeuwerig, hypey ("Revolutionair!!!") |
| Helder en concreet | Jargon, ambtelijk |
| Behulpzaam, mensgericht | Betuttelend of neerbuigend |
| Kort | Omslachtig |
| Warm-professioneel | Klef of overdreven grappig |

### 5.2 Aanspreekvorm & taal

- **Nederlands eerst**, informeel **"je/jij"** — past bij de ZZP-/klein-bedrijf-doelgroep (03, 05). Consistent in de hele UI via i18n-keys (24 § 6).
- Actief en werkwoord-gedreven: knoppen zijn acties ("Plannen", "Versturen", "Archiveren"), nooit "OK".
- NL-notatie voor getal/valuta/datum (€ 1.250,00 · 14-07-2026).
- Domeintermen exact volgens PRD § 6 (Bedrijf, Klant, Object, Dienstafspraak, Beurt, Route, Dienst) — nooit synoniemen door elkaar.

### 5.3 Toon per context

| Context | Toon | Voorbeeld |
|---|---|---|
| Succes | Kort, bevestigend, gunnend | "Klaar! 6 beurten afgerond." |
| Fout | Menselijk: oorzaak + oplossing + actie (24 § 5) | "Dit adres kunnen we niet vinden. Zet de locatie handmatig op de kaart." |
| Lege staat | Uitnodigend, verkoopt de volgende stap (24 § 4) | "Nog geen klanten. Voeg je eerste klant toe — daarna plant RouteFlow automatisch." |
| Klantbericht | Beleefd, namens het bedrijf, aanpasbaar per template (19/FR-081) | "Hallo {{voornaam}}, morgen komen wij langs voor {{dienst}}." |
| Waarschuwing | Rustig, feitelijk, met keuze | "Deze beurt past niet op woensdag. Kies een andere dag." |

### 5.4 Merknaam & schrijfwijze

- Productnaam: **RouteFlow** (één woord, hoofdletters R en F). Nooit "Routeflow" of "Route Flow".
- Klantberichten spreken namens het **Bedrijf** (de RouteFlow-klant), niet namens "RouteFlow" — de eindklant kent RouteFlow niet noodzakelijk. Templates zijn per bedrijf aanpasbaar (FR-081).

### 5.5 Consistentie & governance

- Alle UI-copy via i18n-keys; geen hardcoded strings (24 § 6, A-01).
- Bij twijfel over toon: toets aan § 5.1-tabel ("wel/niet").
- Copy-wijzigingen die de merkstem raken → korte review, net als design (24 § 8).

---

## Relaties met andere documenten

- **00_PRD.md**: § 1 (design-DNA), § 3 (product-visie), § 6 (domeintermen)
- **01_Productvisie.md**: product-specifieke principes (o.a. 4.6 Nederlands eerst, 4.7 premium in detail)
- **24_UI_UX.md**: § 5 (foutmeldingen), § 6 (toon & copy) — operationalisering van deze merkstem
- **19_WhatsApp.md**: klant-berichttemplates

---

## Changelog

| Datum | Versie | Wijziging |
|---|---|---|
| 2026-07-06 | 1.0 | Missie, visie, kernwaarden, merkbelofte per stakeholder |
| 2026-07-07 | 2.0 | Ontbrekende sectie 5 "Toon & taal van het merk" toegevoegd (merkpersoonlijkheid, aanspreekvorm, toon per context, naamschrijfwijze, governance); relaties uitgebreid |
