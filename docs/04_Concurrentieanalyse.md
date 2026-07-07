# 04 — Concurrentieanalyse

**Status:** DONE
**Versie:** 2.0
**Bron van waarheid:** `00_PRD.md` § 2.3 (Waarom bestaande oplossingen tekortschieten) — dit document mag het PRD niet tegenspreken.
**Werkinstructie:** zie `MASTER_PROMPT.md`.
**Relaties:** 01_Productvisie.md (differentiatie), 03_Doelgroep.md (markt), 33_Roadmap.md (positionering per fase).

---

## ⚠️ Statusnotitie over de brondata

> De hieronder genoemde concurrentnamen, prijzen en scores zijn **illustratief/indicatief**, opgesteld op basis van algemene marktkennis van het segment — **niet** geverifieerd met actuele, primaire marktdata. Ze dienen om de *structuur en criteria* van de analyse vast te leggen (het raamwerk), zodat echte namen/cijfers later ingevuld kunnen worden. **Vóór extern gebruik (pitch, investering, marketing) moeten de concrete concurrenten en prijzen met desk-research worden gevalideerd.** Genoteerd als openstaand punt (§ 7). Deze aanpak is afgestemd met de opdrachtgever.

---

## Doel van dit document

Dit document biedt het **analyseraamwerk** voor de concurrentiepositie: welke categorieën concurrenten bestaan, op welke criteria we vergelijken, waar RouteFlow zich onderscheidt, en welke risico's daaruit volgen. Het raamwerk is stabiel; de ingevulde waarden zijn te valideren (zie statusnotitie).

---

## 1. Concurrentielandschap — categorieën

| Categorie | Wat | Voorbeeld (illustratief) | Bedreiging |
|---|---|---|---|
| **A. NL-vakpakketten** | Branchesoftware voor glazenwassers/schoonmaak | "BeePlanning"-type | Direct — zelfde doelgroep |
| **B. Generieke field-service (FSM)** | Internationale field-service management | "Jobber/Housecall"-type, "Fieldwork"-type | Middel — breder, minder NL-fit |
| **C. Jobmanagement/urenregistratie** | Klus-/urensoftware bouw/installatie | "Jobmanager"-type | Laag/middel — ander primair gebruik |
| **D. Generieke tools** | Kalender, spreadsheet, project-SaaS | Excel, Google Calendar, Monday | Hoog qua *inertie* (status quo) |
| **E. Niets / papier** | Wijkboekje, hoofdrekenen | — | Hoog — de werkelijke "concurrent" bij de doelgroep |

**Belangrijk:** de grootste concurrent is doorgaans niet ander softwarepakket maar **categorie E (papier/Excel)** — de status quo. RouteFlow's eerste gevecht is adoptie, niet vervanging (03 § 1.4 adoptiebarrières).

---

## 2. Directe concurrenten (categorie A/B — illustratief)

### 2.1 "BeePlanning"-type (NL-vakpakket)
- **Markt:** glazenwassers, schoonmakers (NL).
- **Sterk:** gevestigd, multi-tenant, Nederlands, functioneel compleet.
- **Zwak:** gedateerd/desktop-first UI, beperkte mobiel, basale planning (geen AI/herplannen), geen WhatsApp.
- **Prijsindicatie:** ~€50–80/mnd.
- **RouteFlow-voordeel:** UX, AI-planning + herplannen, WhatsApp, PWA, premium gevoel.

### 2.2 "Fieldwork/FSM"-type (internationaal)
- **Markt:** onderhoud/installatie, breed.
- **Sterk:** GPS-tracking, asset-management, internationale dekking, integraties.
- **Zwak:** duur, Engelstalig, geen NL-fiscale/betaal-fit (iDEAL/BTW), geen automatische frequentie-planning.
- **Prijsindicatie:** hoog/custom.
- **RouteFlow-voordeel:** NL-diepte, betaalbaar, automatische periodieke planning.

### 2.3 "Jobmanager"-type (klus/uren)
- **Markt:** bouw/schilder/installatie, onderaannemers.
- **Sterk:** robuust, urenregistratie, offertes/facturen.
- **Zwak:** complex, enterprise-heavy, overkill voor 1–15-persoons servicebedrijf, geen geo-clustering, steile onboarding.
- **Prijsindicatie:** ~€100+/mnd.
- **RouteFlow-voordeel:** lichtgewicht, nul-training, route-/frequentie-optimalisatie.

---

## 3. Indirecte concurrenten (categorie D/E)

| Type | Voorbeelden | Waarom het tekortschiet |
|---|---|---|
| Papier/Excel | Wijkboekjes, sheets | Niet schaalbaar, foutgevoelig, geen routes/facturatie, kennis in hoofd eigenaar (PRD § 2.2, P1/P6) |
| Generieke kalenders | Google/Outlook Calendar | Niet route-aware, geen frequentie-logica, geen facturatie |
| Project-/HR-SaaS | Monday, Asana, Trello | Overkill, niet-domein-specifiek, geen mobiel-uitvoeringsmodel |
| Enterprise service-desk | Topdesk, Jira SM | Enterprise-prijs/complexiteit, steile leercurve |

---

## 4. Vergelijkingscriteria (raamwerk)

De criteria waarop RouteFlow zich meet — stabiel, ongeacht welke concurrent:

1. UI/UX-kwaliteit (modern, premium)
2. Mobiele uitvoering (PWA voor medewerkers)
3. Automatische periodieke planning (frequenties → beurten)
4. Route-optimalisatie & geografische clustering
5. Automatisch herplannen (ziekte/weer)
6. Geïntegreerde communicatie (e-mail + WhatsApp)
7. NL-facturatie (BTW, iDEAL/Mollie, betaallink/QR)
8. Onboarding/adoptiegemak (nul-training, 15 min)
9. Prijs/waarde voor 1–15-persoons bedrijf
10. Verticaal-agnostische uitbreidbaarheid

### 4.1 Feature-matrix (illustratieve invulling)

| Criterium | A: vakpakket | B: FSM | C: klus/uren | **RouteFlow** |
|---|---|---|---|---|
| UI/UX-kwaliteit | ⭐⭐ | ⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐⭐ |
| Mobiele uitvoering | Basis | Goed | Beperkt | Uitstekend (PWA) |
| Automatische planning | Basaal | Deels | Handmatig | Intelligent (AI) |
| Geo-clustering | Nee | Deels | Nee | Ja |
| Automatisch herplannen | Nee | Deels | Nee | Ja (V1) |
| WhatsApp | Nee | Zelden | Nee | Ja (V1) |
| NL-facturatie + iDEAL | Deels | Zwak | Ja | Ja (Mollie/QR) |
| Nul-training-onboarding | Nee | Nee | Nee | Ja (15 min) |
| Prijs klein bedrijf | ~€50–80 | Hoog | ~€100+ | Positioneren ~€49 (indicatief) |
| Verticaal-agnostisch | Beperkt | Ja | Nee | Ja (config) |

---

## 5. RouteFlow's differentiatie (kern)

1. **AI-planning + automatisch herplannen** voor het *kleine* servicebedrijf — de meeste concurrenten bieden dit niet of alleen enterprise.
2. **Premium UX als wapen** — niet "meer features", maar prettiger, sneller, nul-training (PRD § 1, 01 § 4.7).
3. **NL-diepte** — iDEAL/Mollie, BTW, WhatsApp, adres/postcode, taal — als toetredingsdrempel voor buitenlandse FSM-spelers.
4. **Verticaal-agnostische kern** — verbreedt zonder herbouw (PRD § 6.7), terwijl vakpakketten aan één branche vastzitten.
5. **Geïntegreerde keten** — planning → uitvoering → facturatie → communicatie in één, i.p.v. losse tools.

---

## 6. Risico's vanuit concurrentie

| Risico | Toelichting | Mitigatie |
|---|---|---|
| Gevestigde vakpakketten verbeteren UX | Kunnen opschuiven | Snelheid + AI-voorsprong + premium-merk (02) |
| Internationale FSM betreedt NL met lokalisatie | Kapitaalkrachtig | NL-diepte + community + prijs |
| Status quo (papier/Excel) blijft plakken | Adoptiedrempel | Nul-training, gratis proef, import (FR-006) |
| Prijzenslag | Marge-erosie | Waarde-differentiatie, niet goedkoopste willen zijn |

---

## 7. Openstaande punten

- **Validatie brondata (zie statusnotitie):** echte concurrentnamen, actuele prijzen en feature-checks vergen desk-research vóór extern gebruik. Dit is een marketing-/researchtaak, geen productbeslissing — genoteerd voor de commerciële voorbereiding (33 V1). Er is géén open *product*-beslissing in dit document.

---

## Changelog

| Datum | Versie | Wijziging |
|---|---|---|
| 2026-07-06 | 1.0 | Directe/indirecte concurrenten, feature-matrix, strategische voordelen |
| 2026-07-07 | 2.0 | Verdieping + expliciete statusnotitie (data illustratief); 5 concurrentcategorieën incl. status quo als hoofdconcurrent, 10 vergelijkingscriteria als stabiel raamwerk, differentiatie, concurrentierisico's met mitigatie, validatie-openstaand-punt |
