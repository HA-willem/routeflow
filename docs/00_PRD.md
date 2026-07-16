# 00_PRD.md — Product Requirements Document

**Product:** RouteFlow
**Versie:** 1.0 (Concept)
**Datum:** 6 juli 2026
**Status:** Enige bron van waarheid (Single Source of Truth) voor de ontwikkeling van RouteFlow
**Doelgroep van dit document:** Product managers, software architecten, UX designers, engineers en AI-agents die op basis van deze documentatie de software gaan bouwen.

---

## Inhoudsopgave

1. [Executive Summary](#1-executive-summary)
2. [Probleemstelling](#2-probleemstelling)
3. [Productvisie & Positionering](#3-productvisie--positionering)
4. [Doelgroep & Markt](#4-doelgroep--markt)
5. [Scope: MVP, V1, V2](#5-scope-mvp-v1-v2)
6. [Kernconcepten & Domeinmodel](#6-kernconcepten--domeinmodel)
7. [Functionele Requirements (overzicht)](#7-functionele-requirements)
8. [De AI Planner (kernfeature)](#8-de-ai-planner)
9. [Facturatie & Betalingen](#9-facturatie--betalingen)
10. [Communicatie: WhatsApp, e-mail & notificaties](#10-communicatie)
11. [UX-principes & Design-uitgangspunten](#11-ux-principes)
12. [Technische Architectuur](#12-technische-architectuur)
13. [Niet-functionele Requirements](#13-niet-functionele-requirements)
14. [Gebruikersrollen & Autorisatie](#14-gebruikersrollen--autorisatie)
15. [Business Rules (kernregels)](#15-business-rules)
16. [Edge Cases & Uitzonderingen](#16-edge-cases--uitzonderingen)
17. [Succes-metrics & KPI's](#17-succes-metrics--kpis)
18. [Risico's & Mitigaties](#18-risicos--mitigaties)
19. [Aannames & Expliciete Beslissingen](#19-aannames)
20. [Verwijzingen naar deeldocumenten](#20-verwijzingen)

---

## 1. Executive Summary

RouteFlow is een moderne, Nederlandstalige SaaS-oplossing voor servicebedrijven die **periodiek terugkerende werkzaamheden** uitvoeren op klantlocaties. De eerste doelgroep is **glazenwassers**; de architectuur is vanaf dag één ontworpen als **verticaal-agnostisch platform** dat later uitbreidbaar is naar schoonmaakbedrijven, hoveniers, ongediertebestrijding, dakgootreinigers, installateurs, CV/airco-onderhoud en vastgoedonderhoud.

Het hart van RouteFlow is de **AI Planner**: een planningsengine die op basis van frequentie-afspraken, geografische clustering, reistijd, beschikbaarheid van medewerkers, weer en klantvoorkeuren automatisch een optimale werkplanning genereert — en deze **automatisch herplant** bij verstoringen (ziekte, regen, uitloop).

Daaromheen levert RouteFlow de complete operationele keten:

| Pijler | Samenvatting |
|---|---|
| **Klanten & objecten** | Klantbeheer met meerdere adressen/objecten, prijsafspraken en frequenties per object |
| **Planning** | AI-gedreven route- en dagplanning, drag-and-drop correcties, automatisch herplannen |
| **Uitvoering** | Mobiele PWA voor medewerkers: dagroute, afvinken, foto's, notities, "niet thuis"-flows |
| **Facturatie** | Automatische facturen (per beurt, per maand, abonnement), PDF met QR-code en betaallink, BTW-correct, herinneringen |
| **Communicatie** | WhatsApp- en e-mailnotificaties naar klanten ("morgen komen wij langs"), betaalverzoeken, herinneringen |
| **Inzicht** | Dashboard met omzet, openstaande facturen, planningsdruk en routestatistieken |

**Businessmodel:** SaaS-abonnement per bedrijf, gestaffeld op aantal medewerkers/gebruikers (zie 33_Roadmap.md en 39_Toekomstvisie.md voor pricing-verkenning).

**Techstack (vastgesteld):** Next.js (frontend, App Router), Supabase (backend, PostgreSQL, Auth, Storage), Vercel (hosting), Tailwind CSS (styling). PWA-first voor mobiel gebruik.

**Design-DNA:** minimalistisch, premium, snel, veel witruimte, rustige interface — geïnspireerd op Apple, Linear, Notion, Stripe en Raycast. Nadrukkelijk géén ouderwetse ERP-uitstraling.

---

## 2. Probleemstelling

### 2.1 De huidige situatie bij de doelgroep

Een gemiddeld glazenwassersbedrijf in Nederland (1–15 medewerkers) werkt vandaag met een combinatie van:

- **Papieren "wijkboekjes"** of Excel-lijsten met adressen per wijk en frequenties ("elke 6 weken", "1x per kwartaal");
- **Losse agenda's** (Google Calendar, papier) zonder koppeling met klantdata;
- **Handmatige facturatie** achteraf, vaak wekelijks in de avonduren, via Word/Excel of een los boekhoudpakket;
- **WhatsApp en telefoon** als ongestructureerd communicatiekanaal met klanten;
- **Hoofdrekenen** voor routes: de eigenaar "kent zijn wijken" en plant op gevoel.

### 2.2 De pijnpunten

| # | Pijnpunt | Gevolg |
|---|---|---|
| P1 | Frequenties worden handmatig bijgehouden | Klanten worden vergeten of te vroeg bezocht; omzetlek en irritatie |
| P2 | Routes zijn niet geoptimaliseerd | Onnodige reistijd (vaak 15–25% van de werkdag), hogere brandstofkosten |
| P3 | Herplannen bij regen/ziekte is handwerk | Uren puzzelwerk; klanten worden niet geïnformeerd |
| P4 | Facturatie is een avondklus | Facturen worden te laat of niet verstuurd; cashflow-problemen |
| P5 | Geen overzicht van openstaande betalingen | Debiteurenbeheer gebeurt ad hoc of niet |
| P6 | Kennis zit in het hoofd van de eigenaar | Bedrijf is niet schaalbaar en niet overdraagbaar |
| P7 | Bestaande software is verouderd of te complex | ERP-achtige pakketten met steile leercurve worden niet geadopteerd |

### 2.3 Waarom bestaande oplossingen tekortschieten

Bestaande pakketten in dit segment (zie 04_Concurrentieanalyse.md) zijn functioneel vaak compleet maar:

- ogen gedateerd (desktop-first, Windows-erfgoed);
- vereisen training en configuratie;
- hebben geen of primitieve route-optimalisatie;
- hebben geen automatisch herplannen;
- integreren WhatsApp niet of alleen via omwegen;
- zijn niet ontworpen als premium consumer-grade ervaring.

**De kans:** een product dat de operationele diepgang van gespecialiseerde vakpakketten combineert met de UX-kwaliteit van Linear/Notion en de intelligentie van moderne AI-planning.

---

## 3. Productvisie & Positionering

### 3.1 Visie

> **RouteFlow wordt de mooiste, snelste en slimste bedrijfssoftware voor servicebedrijven met terugkerende werkzaamheden.**

De eigenaar opent 's ochtends RouteFlow en ziet in één oogopslag: wie werkt vandaag waar, welke routes rijden er, wat is er gefactureerd en wat staat open. De software denkt vooruit: zij stelt de planning voor, herplant bij verstoringen en factureert automatisch. De ondernemer houdt regie; RouteFlow doet het denkwerk.

### 3.2 Productprincipes

1. **Planning is het hart.** Alles draait om de vraag: *wie doet wat, waar, wanneer?* Elke feature versterkt dit.
2. **Automatisch, tenzij.** Het systeem stelt voor en voert uit; de gebruiker corrigeert alleen bij uitzonderingen.
3. **Mobile first, desktop krachtig.** De medewerker leeft in de PWA op zijn telefoon; de planner/eigenaar werkt op desktop.
4. **Nul-training-adoptie.** Een nieuwe gebruiker moet zonder handleiding binnen 15 minuten zijn eerste route kunnen plannen.
5. **Verticaal-agnostische kern.** "Glazenwassen" is configuratie, geen hardcoded aanname. Diensttypen, frequenties en terminologie zijn instelbaar per bedrijf (zie §6.7).
6. **Nederlands eerst.** Taal, BTW-regels, betaalcultuur (iDEAL/QR), adresformaten (postcode+huisnummer) zijn Nederlands. i18n-architectuur vanaf dag één, vertaling later.
7. **Premium in elk detail.** Animaties, lege-staten, foutmeldingen, laadtijden: alles voelt verzorgd.

### 3.3 Positionering (one-liner)

*"RouteFlow plant, rijdt en factureert je terugkerende klussen — automatisch."*

### 3.4 Wat RouteFlow expliciet NIET is (v1)

- Geen boekhoudpakket (wel export/koppeling naar boekhouding, zie roadmap);
- Geen urenregistratie-/salarissysteem;
- Geen marketplace tussen klanten en bedrijven;
- Geen voorraadbeheersysteem (wel simpele productcatalogus voor facturatie);
- Geen offline-first synchronisatie-engine in MVP (wel offline-tolerante PWA, zie §13 en 20_PWA.md).

---

## 4. Doelgroep & Markt

### 4.1 Primaire doelgroep (launch)

**Nederlandse glazenwassersbedrijven, 1–15 medewerkers.**

Segmenten:

| Segment | Omvang team | Kenmerken | RouteFlow-fit |
|---|---|---|---|
| ZZP'er | 1 | Eigenaar = uitvoerder = planner = facturist | Hoog: alles-in-één op telefoon |
| Klein bedrijf | 2–5 | Eigenaar werkt mee, partner doet administratie | Zeer hoog: kern-doelgroep |
| Middelgroot | 6–15 | Eigenaar plant, teams rijden routes | Hoog: multi-medewerker planning cruciaal |
| Groot (>15) | 15+ | Vaak al ERP; complexe wensen | Later (V2+) |

### 4.2 Secundaire doelgroepen (uitbreiding, zie 39_Toekomstvisie.md)

Schoonmaakbedrijven, hoveniers, ongediertebestrijding, dakgootreinigers, installateurs, CV-onderhoud, airco-onderhoud, vastgoedonderhoud. Gemeenschappelijke noemer: **terugkerende afspraken op locatie met route-component**.

### 4.3 Gebruikersrollen binnen een klantbedrijf

| Rol | Primair device | Kerntaken |
|---|---|---|
| **Eigenaar/Admin** | Desktop + mobiel | Alles: instellingen, planning, facturatie, rapportage |
| **Planner** | Desktop | Planning maken/corrigeren, klanten beheren |
| **Medewerker** | Mobiel (PWA) | Dagroute uitvoeren, afvinken, foto's, notities |
| **Administratie** | Desktop | Facturatie, debiteuren, klantgegevens |
| **Klant (eindklant)** | Mobiel/e-mail | Ontvangt notificaties, betaalt, beheert (V2) eigen voorkeuren via klantportaal |

Volledige uitwerking met rechtenmatrix: 23_Gebruikersrollen.md.

---

## 5. Scope: MVP, V1, V2

### 5.1 Faseringsprincipe

We bouwen in drie ringen. **MVP** = kleinste set waarmee een glazenwasser zijn papieren boekje weggooit. **V1** = commercieel verkoopbaar product. **V2** = marktleiderschaps-features.

### 5.2 Scopetabel

| Domein | MVP | V1 | V2 |
|---|---|---|---|
| Klanten & objecten | CRUD, adressen met geocoding, frequenties | Import (CSV), labels, klantnotities met historie | Klantportaal, self-service |
| Planning | Automatische periodieke planning + dagroutes, handmatige correctie | AI Planner volledig (weer, herplannen, clustering, voorkeuren) | Voorspellende capaciteitsplanning, multi-dag optimalisatie |
| Uitvoering (PWA) | Dagroute, afvinken, "niet thuis", notitie | Foto's, handtekening, navigatie-deeplinks, offline-tolerantie | Spraaknotities, materiaalregistratie |
| Facturatie | Factuur per beurt/periode, PDF, BTW, e-mail | QR/betaallink (Mollie), abonnementen, automatische herinneringen, WhatsApp-verzending | Automatische incasso (SEPA), boekhoudkoppelingen (e-Boekhouden, Moneybird, Exact) |
| Communicatie | E-mailnotificatie "wij komen morgen" | WhatsApp Business API, templates, tweeweg (klant kan antwoorden: "overslaan") | Chatbot-afhandeling, review-verzoeken |
| Rapportage | Dashboard basis (omzet, open facturen, planning vandaag) | Route-statistieken, omzet per wijk/klant, medewerkerproductiviteit | Prognoses, churn-signalen bij eindklanten |
| Multi-verticaal | Terminologie-config verborgen (glazenwasser default) | Diensttype-templates per branche | Volledige verticaal-onboarding flows |

### 5.3 Expliciet buiten scope (alle fasen tot nader order)

- Salarisadministratie, HR;
- Voorraad/inkoop;
- Internationale BTW (alleen NL 21%/9%/0%/verlegd);
- Native apps (PWA volstaat; heroverweging bij V2).

---

## 6. Kernconcepten & Domeinmodel

Dit hoofdstuk definieert de taal van het systeem. Alle documenten en code gebruiken **exact deze termen**.

### 6.1 Bedrijf (Tenant)

Elke klant van RouteFlow is een **Bedrijf** (tenant). Alle data is strikt gescheiden per bedrijf via row-level security (RLS) in PostgreSQL/Supabase. Een gebruiker kan lid zijn van meerdere bedrijven (edge case: franchise), maar werkt altijd in de context van één actief bedrijf.

### 6.2 Klant

Een **Klant** is de eindklant van het bedrijf (particulier of zakelijk). Eigenschappen: naam, type (particulier/zakelijk), contactgegevens, facturatievoorkeuren (e-mail/WhatsApp/post), betaaltermijn, KVK/BTW-nummer (zakelijk), notities.

### 6.3 Object (Werkadres)

Een **Object** is een fysieke locatie waar werk plaatsvindt. Eén klant kan meerdere objecten hebben (bijv. VvE met 3 panden, particulier met woning + bedrijfspand). Een object heeft: adres (postcode + huisnummer → geocoded lat/lng), objecttype (woning, bedrijfspand, appartementencomplex…), toegangsinstructies, foto's, en één of meer **Dienstafspraken**.

### 6.4 Dienstafspraak (kernconcept!)

Een **Dienstafspraak** koppelt een **Dienst** (bijv. "Glasbewassing buitenzijde") aan een **Object** met:

- **Frequentie**: interval in weken (bijv. elke 6 weken), of vaste maandpatronen ("1e week van elk kwartaal"), of eenmalig;
- **Prijsafspraak**: vast bedrag per beurt, uurtarief, of abonnementsprijs per maand (zie 18_Prijsafspraken.md);
- **Voorkeuren**: voorkeursdag(deel), "niet op maandag", "alleen na 9:00", "bel vooraf";
- **Flexibiliteitsvenster**: hoeveel dagen mag de planner afwijken van de ideale datum (default ±3 werkdagen, instelbaar);
- **Status**: actief / gepauzeerd (bijv. wintersluiting) / beëindigd.

De AI Planner genereert uit dienstafspraken automatisch **Geplande Beurten**.

### 6.5 Beurt (Job)

Een **Beurt** is één concrete uitvoering van een dienstafspraak op een datum, toegewezen aan een **Route**. Statussen: `voorgesteld → gepland → onderweg → uitgevoerd → gefactureerd` plus uitzonderingsstatussen `overgeslagen`, `niet_thuis`, `geannuleerd`, `herplannen`. De volledige statusmachine met transitieregels staat in 10_BusinessRules.md.

### 6.6 Route

Een **Route** is een geordende lijst beurten voor één **Medewerker(team)** op één **Datum**, met berekende rijvolgorde, reistijden en verwachte start-/eindtijden per stop.

### 6.7 Diensttype & Verticaal-configuratie

Een **Dienst** (bijv. "Glasbewassing binnen", "Dakgoot reinigen") behoort tot het bedrijf en heeft: naam, standaardduur, standaardprijs, BTW-tarief, weersgevoeligheid (ja/nee + type: regen/vorst/wind). Branche-templates (V1) leveren voorgedefinieerde dienstensets per verticaal. **Nergens in datamodel of code komt het woord "glazenwasser" als aanname voor.**

### 6.8 Overige entiteiten (samenvatting)

Medewerker, Team, Beschikbaarheid, Verlof, Factuur, Factuurregel, Product, Betaling, Herinnering, Notificatie, WhatsAppBericht, Weerdata-cache. Volledig ERD: 11_DatabaseConcept.md en 12_Entiteiten.md.

---

## 7. Functionele Requirements (overzicht)

Genummerd als FR-xxx. Volledige uitwerking met acceptatiecriteria per requirement: 08_FunctioneleEisen.md en 32_Acceptatiecriteria.md. Prioriteit volgens MoSCoW.

### 7.1 Klanten & Objecten

| ID | Requirement | Prio | Fase |
|---|---|---|---|
| FR-001 | Gebruiker kan klant aanmaken met naam, type, contactgegevens | Must | MVP |
| FR-002 | Adresinvoer via postcode + huisnummer met automatische straat/plaats-aanvulling en geocoding (lat/lng) | Must | MVP |
| FR-003 | Klant kan meerdere objecten hebben; object kan meerdere dienstafspraken hebben | Must | MVP |
| FR-004 | Dienstafspraak met frequentie, prijsafspraak, voorkeuren en flexibiliteitsvenster | Must | MVP |
| FR-005 | Dienstafspraak pauzeren/hervatten met ingangsdatum | Must | MVP |
| FR-006 | CSV-import van klanten/objecten met mapping-wizard en foutrapport | Should | V1 |
| FR-007 | Klant-tijdlijn: alle beurten, facturen, berichten chronologisch | Should | V1 |
| FR-008 | Zoeken (cmd+K) over klanten, objecten, facturen, beurten | Must | MVP |

### 7.2 Planning & AI Planner

| ID | Requirement | Prio | Fase |
|---|---|---|---|
| FR-020 | Systeem genereert automatisch voorgestelde beurten o.b.v. frequenties | Must | MVP |
| FR-021 | Dagplanning per medewerker met geoptimaliseerde rijvolgorde | Must | MVP |
| FR-022 | Planner kan beurten verslepen (drag-and-drop) tussen dagen/medewerkers; route herberekent live | Must | MVP |
| FR-023 | Weersgevoelige diensten: waarschuwing + herplanvoorstel bij slechtweer-voorspelling | Must | V1 |
| FR-024 | Automatisch herplannen bij ziekte/verlof medewerker: systeem verdeelt beurten en toont diff ter goedkeuring | Must | V1 |
| FR-025 | Geografische clustering: beurten in dezelfde buurt worden in dezelfde week/dag geclusterd | Must | V1 |
| FR-026 | Vergrendelde beurten ("klant verwacht ons dinsdag 10:00") worden nooit automatisch verplaatst | Must | MVP |
| FR-027 | Capaciteitswaarschuwing: planning toont overboeking per dag/medewerker | Should | V1 |
| FR-028 | "Plan opnieuw"-knop: hergenereer week met respect voor vergrendelingen | Must | V1 |

### 7.3 Uitvoering (mobiele PWA)

| ID | Requirement | Prio | Fase |
|---|---|---|---|
| FR-040 | Medewerker ziet dagroute in volgorde, met adres, dienst, notities, verwachte tijd | Must | MVP |
| FR-041 | Eén-tik navigatie naar Google/Apple Maps | Must | MVP |
| FR-042 | Beurt afronden met één tik; optioneel notitie/foto | Must | MVP |
| FR-043 | "Niet thuis"-flow: markeren, klant krijgt automatisch bericht, beurt naar herplan-wachtrij | Must | V1 |
| FR-044 | Foto's vastleggen (voor/na), opgeslagen bij beurt (Supabase Storage) | Should | V1 |
| FR-045 | Werkt door bij kort netwerkverlies (optimistic UI + retry-queue) | Should | V1 |

### 7.4 Facturatie

| ID | Requirement | Prio | Fase |
|---|---|---|---|
| FR-060 | Automatische conceptfactuur bij status `uitgevoerd` (per beurt of verzameld per periode, instelbaar per klant) | Must | MVP |
| FR-061 | Correcte NL BTW (21%/9%/0%/verlegd), factuurnummering doorlopend en instelbaar | Must | MVP |
| FR-062 | PDF-factuur in huisstijl (logo, kleuren) | Must | MVP |
| FR-063 | Betaallink + QR (Mollie/iDEAL) op factuur | Must | V1 |
| FR-064 | Verzending per e-mail en/of WhatsApp, per klant instelbaar | Must | V1 (e-mail MVP) |
| FR-065 | Automatische herinneringen (instelbaar schema, bijv. +7/+14/+21 dagen) | Must | V1 |
| FR-066 | Abonnementsfacturatie: vast maandbedrag ongeacht aantal beurten | Should | V1 |
| FR-067 | Betaalstatus automatisch bijgewerkt via Mollie-webhook | Must | V1 |
| FR-068 | Creditfactuur en correcties met audit trail | Must | V1 |

### 7.5 Communicatie & Notificaties

| ID | Requirement | Prio | Fase |
|---|---|---|---|
| FR-080 | Automatisch klantbericht "morgen komen wij langs" (e-mail MVP, WhatsApp V1), per klant/dienst uitschakelbaar | Must | MVP |
| FR-081 | Berichttemplates met variabelen ({{voornaam}}, {{datum}}, {{dienst}}) | Must | V1 |
| FR-082 | Interne notificaties (planner): herplan-voorstellen, mislukte betalingen, niet-thuis-meldingen | Must | V1 |
| FR-083 | Tweeweg WhatsApp: klant antwoordt "overslaan" → beurt naar volgende cyclus + bevestiging | Could | V2 |

---

## 8. De AI Planner (kernfeature)

*Dit is een samenvatting op PRD-niveau; het volledige conceptuele algoritme, alle parameters, scoringsfuncties en edge cases staan in 14_RoutingEngine.md en 15_AIPlanner.md.*

### 8.1 Doel

Minimaliseer reistijd en planningswerk, maximaliseer frequentie-trouw en klanttevredenheid — volautomatisch, met de mens als eindredacteur.

### 8.2 Drie lagen

1. **Horizon-laag (weken vooruit):** vertaalt dienstafspraken naar *ideale datums* (laatste uitvoering + interval) en clustert deze geografisch per week. Output: voorgestelde beurten per week.
2. **Dag-laag (routes):** verdeelt beurten van een dag over medewerkers en bepaalt per medewerker de optimale rijvolgorde (VRP-benadering: startlocatie, reistijd via afstandsmatrix, dienstduur, tijdvensters, pauze).
3. **Reactieve laag (herplannen):** luistert naar events (verlofaanvraag, ziekmelding, slechtweer-forecast voor weersgevoelige diensten, niet-thuis, uitloop) en genereert een **herplan-voorstel** als diff ("12 beurten van wo → do/vr") dat de planner met één klik accepteert of aanpast.

### 8.3 Scoringsmodel (conceptueel)

Elke kandidaat-planning krijgt een score op gewogen criteria:

| Criterium | Richting | Gewicht (default) |
|---|---|---|
| Afwijking t.o.v. ideale datum | minimaliseren | hoog |
| Totale reistijd | minimaliseren | hoog |
| Geografische clustering (zelfde buurt zelfde dag) | maximaliseren | middel |
| Respect voorkeursdag/-dagdeel klant | maximaliseren | middel |
| Werkdrukbalans tussen medewerkers | balanceren | middel |
| Weerrisico op weersgevoelige diensten | minimaliseren | middel |
| Aantal wijzigingen t.o.v. bestaande planning (stabiliteit) | minimaliseren | hoog bij herplannen |

Gewichten zijn per bedrijf instelbaar via eenvoudige sliders ("reistijd vs. stiptheid").

### 8.4 Harde regels (nooit schenden)

- Vergrendelde beurten verplaatsen niet;
- Beschikbaarheid/verlof medewerker is absoluut;
- Flexibiliteitsvenster van de dienstafspraak wordt niet overschreden zonder expliciete gebruikersactie;
- Maximale werkdaglengte per medewerker (instelbaar, default 8,5u incl. reistijd).

### 8.5 Transparantie & vertrouwen (UX-eis)

De planner is geen black box. Bij elke voorgestelde beurt is een "waarom?"-uitleg beschikbaar ("Gepland op di 14/7: 2 dagen vóór ideale datum, geclusterd met 4 adressen in Wijk Noord, ma uitgesloten door klantvoorkeur"). Elke automatische wijziging verschijnt als voorstel, nooit als stille mutatie — behalve waar de gebruiker "volautomatisch" expliciet heeft aangezet.

**Architectuurgeneralisatie (§ 19 A-15):** dit principe geldt sinds ADR-011 niet alleen voor routeplanning, maar voor alle acht AI Agents (`43_AI_Agents.md`) — met een dagelijkse Morning Briefing als samengesteld overzicht en een harde Human-Approval-grens (BR-702) die nooit per bedrijf uitgeschakeld kan worden.

---

## 9. Facturatie & Betalingen

*Volledige uitwerking: 16_Facturatie.md, 17_Producten.md, 18_Prijsafspraken.md.*

### 9.1 Prijsafspraak-typen

| Type | Werking | Facturatiemoment |
|---|---|---|
| Per beurt (vast) | Vast bedrag per uitvoering | Direct na beurt of verzameld per periode |
| Uurtarief | Tarief × geregistreerde duur | Na beurt |
| Abonnement | Vast bedrag per maand/kwartaal, beurten inbegrepen | Vooraf of achteraf per periode |
| Strippenkaart (V2) | Bundel vooruitbetaalde beurten | Bij aankoop |

### 9.2 Factuurflow

`Beurt uitgevoerd → conceptfactuur (of regel op verzamelfactuur) → [automatisch of handmatig] definitief → nummer toegekend → PDF gegenereerd → verzonden (e-mail/WhatsApp) → betaallink actief → webhook betaling → status betaald` — met herinneringsschema bij uitblijven betaling en escalatiestatus na laatste herinnering.

### 9.3 NL-specifiek

- BTW: glasbewassing particulier woningen = **9%** kan van toepassing zijn onder schoonmaakregeling — dit is een fiscale nuance; RouteFlow maakt BTW-tarief instelbaar **per dienst** met default 21% en waarschuwt de gebruiker eigen fiscale verantwoordelijkheid te nemen (disclaimer in UI). *(Expliciete aanname A-07, zie §19.)*
- Factuurvereisten Belastingdienst (nummer, datum, KVK, BTW-nr, specificatie) zijn afgedwongen in het PDF-template;
- Betalingen via **Mollie** (iDEAL, betaalverzoek-link, QR); architectuur payment-provider-agnostisch.

---

## 10. Communicatie: WhatsApp, e-mail & notificaties

*Volledige uitwerking: 19_WhatsApp.md, 21_Notificaties.md.*

- **Kanaalstrategie:** e-mail is altijd beschikbaar (Resend of vergelijkbaar via Supabase/edge functions); WhatsApp via de officiële **WhatsApp Business API** (BSP zoals MessageBird/Twilio/360dialog — keuze in 19_WhatsApp.md) met goedgekeurde message-templates.
- **Berichttypen klant:** aankondiging (T-1 dag), "wij zijn onderweg" (optioneel), niet-thuis-melding, factuur + betaallink, betaalherinnering, betaalbevestiging.
- **Opt-in & AVG:** WhatsApp-verzending vereist geregistreerde opt-in per klant; alle berichten gelogd; verwerkersgrondslag gedocumenteerd (36_Security.md).
- **Interne notificaties:** in-app inbox + optioneel push (PWA web-push): herplanvoorstellen, weerwaarschuwingen, mislukte verzendingen, betalingen.

---

## 11. UX-principes & Design-uitgangspunten

*Volledige uitwerking: 24_UI_UX.md, 25_DesignSystem.md, 26_ComponentLibrary.md, 27_PaginaOverzicht.md.*

1. **Rust door reductie:** max. één primaire actie per scherm; secundaire acties in overflow-menu's.
2. **Witruimte is feature:** ruime spacing-schaal (4/8/12/16/24/32/48/64), nooit dichte datagrids als default.
3. **Snelheid als beleving:** optimistic UI overal; skeleton-states < 100ms; paginanavigatie voelt instant (prefetching).
4. **Command-first:** ⌘K-palette voor navigatie en acties ("nieuwe klant", "factuur zoeken"), Raycast/Linear-stijl.
5. **Motion met betekenis:** subtiele micro-animaties (150–250ms, ease-out) bij statuswissels; geen decoratieve animatie.
6. **Lege staten verkopen het product:** elke lege lijst legt uit wat hier komt en biedt de eerste actie aan.
7. **Foutmeldingen zijn menselijk:** oorzaak + oplossing + actieknop; nooit codes zonder context.
8. **Mobiel = uitvoering, desktop = regie:** de PWA-medewerkerservaring is een eigen, geoptimaliseerde flow (grote tap-targets, duimzone, één-hand-bediening), geen geschaalde desktop.
9. **Toegankelijkheid:** WCAG 2.1 AA-doelstelling; volledige toetsenbordbediening op desktop.
10. **Donkere modus:** vanaf V1, systeemvoorkeur-volgend.

---

## 12. Technische Architectuur

*Alleen architectuur, geen implementatie. Detail: 35_Deployment.md, 36_Security.md, 37_Performance.md, 38_Schaalbaarheid.md.*

### 12.1 Stack (vastgesteld)

| Laag | Keuze | Motivatie |
|---|---|---|
| Frontend | Next.js (App Router, React Server Components) | Performance, Vercel-synergie, PWA-support |
| Styling | Tailwind CSS + design tokens | Consistent design system, snelheid |
| Backend | Supabase (PostgreSQL, Auth, Storage, Edge Functions, Realtime) | Snelle ontwikkeling, RLS-multitenancy, realtime planning-updates |
| Database | PostgreSQL (via Supabase) + PostGIS-extensie voor geodata | Geoqueries voor clustering |
| Hosting | Vercel | Edge-first, preview deployments |
| Betalingen | Mollie | NL-standaard, iDEAL |
| Kaart/route | Extern: geocoding + afstandsmatrix-provider (keuze in 14_RoutingEngine.md: Google Routes API vs. OpenRouteService/OSRM) | Reistijden en kaartweergave |
| Weer | Externe weer-API met NL-dekking (bijv. Open-Meteo/KNMI-data) | Weerlaag AI Planner |
| E-mail | Transactionele mailprovider (Resend of vergelijkbaar) | Facturen/notificaties |
| WhatsApp | WhatsApp Business API via BSP | Klantcommunicatie |

### 12.2 Architectuurprincipes

- **Multi-tenant via RLS:** elke tabel heeft `bedrijf_id`; RLS-policies afdwingend op databaseniveau; geen tenant-filtering in applicatiecode als enige verdediging.
- **Domeinlogica in de database + edge functions:** planningsgeneratie en factuurjobs draaien server-side (scheduled edge functions / pg_cron), nooit in de client.
- **Event-gedreven herplannen:** mutaties (verlof, weer-update, niet-thuis) publiceren domein-events; de reactieve planner consumeert deze en schrijft voorstellen.
- **API-first:** alle functionaliteit via gedocumenteerde API (13_API_Specificatie.md) zodat toekomstige integraties en native apps mogelijk zijn.
- **Provider-agnostische adapters:** betalingen, WhatsApp, routing en weer achter interfaces; leverancier vervangbaar zonder domeinwijziging.

---

## 13. Niet-functionele Requirements (samenvatting)

*Volledig: 09_NietFunctioneleEisen.md, 36–38.*

| Categorie | Eis |
|---|---|
| Performance | TTI kernpagina's < 2s op 4G; interacties < 100ms feedback; routeberekening dag < 3s voor 60 stops |
| Beschikbaarheid | 99,5% (SaaS-tier van Vercel/Supabase); statuspagina |
| Schaal | Ontwerp voor 10.000 bedrijven, 50 medewerkers/bedrijf, 5.000 objecten/bedrijf |
| Security | RLS, 2FA (optioneel), OWASP ASVS L2-richtlijn, secrets in Vercel/Supabase vault |
| Privacy/AVG | Datalocatie EU, verwerkersovereenkomst, dataexport & verwijderrecht, retentiebeleid |
| Backups | Point-in-time recovery; dagelijkse backups, hersteltest per kwartaal |
| Browser-support | Laatste 2 versies Chrome/Safari/Edge/Firefox; iOS/Android PWA |
| Observability | Gestructureerde logging, error tracking (Sentry), planning-job-monitoring |

---

## 14. Gebruikersrollen & Autorisatie (samenvatting)

Rollen: **Eigenaar, Admin, Planner, Medewerker, Administratie** (zie §4.3). Kernregels: medewerkers zien uitsluitend eigen routes en gekoppelde klantinfo (naam, adres, instructies — géén prijzen/facturen); alleen Eigenaar/Admin bij instellingen en gebruikersbeheer; Administratie geen toegang tot planning-mutaties. Volledige matrix per resource × actie: 23_Gebruikersrollen.md; technische afdwinging via Supabase Auth + RLS: 22_Authenticatie.md.

## 15. Business Rules (kernregels)

Selectie; volledige set met nummering BR-xxx in 10_BusinessRules.md:

- **BR-001** Ideale datum volgende beurt = datum laatste `uitgevoerd` + interval (niet: geplande datum).
- **BR-010** Een beurt kan alleen naar `gefactureerd` vanuit `uitgevoerd`.
- **BR-015** `niet_thuis` telt niet als uitvoering; frequentieteller loopt niet door; beurt gaat naar herplan-wachtrij met prioriteit.
- **BR-020** Factuurnummers zijn doorlopend, gap-loos per bedrijf per jaar; definitieve facturen zijn immutabel (correctie = creditfactuur).
- **BR-030** Pauzeren van een dienstafspraak annuleert alle toekomstige niet-vergrendelde beurten van die afspraak.
- **BR-040** Verwijderen van een klant met facturen is verboden; alleen anonimiseren (AVG) of archiveren.

## 16. Edge Cases & Uitzonderingen (selectie)

| # | Case | Gedrag |
|---|---|---|
| E-01 | Adres niet geocodeerbaar | Object opslaan met vlag "handmatige locatie vereist"; planner toont pin-plaats-kaartje; beurt niet routeerbaar tot opgelost |
| E-02 | Twee dienstafspraken zelfde object zelfde week | Planner combineert op dezelfde stop; duur = som; één reistijd |
| E-03 | Medewerker meldt zich 's ochtends ziek | Reactieve laag verdeelt dagroute over collega's binnen venster; onplaatsbare beurten naar wachtrij; klanten automatisch geïnformeerd |
| E-04 | Klant zegt af nadat "morgen"-bericht is verstuurd | Beurt → `overgeslagen` of herplan; route herberekent; gat-opvulling stelt kandidaat uit wachtrij voor |
| E-05 | Uitvoering duurt 2× langer dan gepland | Live-uitloopdetectie (V2); MVP: resterende beurten handmatig doorschuiven met één actie "rest van dag verplaatsen" |
| E-06 | Dubbel betaalde factuur | Betaling geregistreerd als overschot; UI biedt terugbetalen (Mollie refund) of verrekenen |
| E-07 | WhatsApp-template geweigerd/nummer geen WhatsApp | Automatische fallback naar e-mail; gelogd; klantkanaal-vlag bijgewerkt |
| E-08 | Zomertijd/wintertijd op routedag | Alle tijden in Europe/Amsterdam; opslag UTC; DST-transities getest (31_Testplan.md) |
| E-09 | Bedrijf overschrijdt abonnementslimiet medewerkers | Soft-block: uitnodigen geblokkeerd met upgrade-prompt; bestaande gebruikers blijven werken |

## 17. Succes-metrics & KPI's

| Metric | Doel (12 mnd na launch) |
|---|---|
| Activatie: eerste automatisch geplande week | < 24u na aanmelding, ≥ 60% van signups |
| Wekelijks actieve bedrijven / betaalde bedrijven | ≥ 85% |
| Reductie reistijd (zelfgerapporteerd + berekend) | ≥ 15% |
| Facturen verstuurd binnen 24u na uitvoering | ≥ 90% |
| Churn (maandelijks, betaald) | < 2% |
| NPS | ≥ 50 |

## 18. Risico's & Mitigaties

| Risico | Impact | Mitigatie |
|---|---|---|
| WhatsApp Business API-kosten/complexiteit | Middel | E-mail-first MVP; BSP-keuze met NL-support; kosten doorbelasten in duurdere tier |
| Route-API-kosten bij schaal | Middel | Afstandsmatrix cachen; open-source OSRM als fallback-optie |
| Vertrouwen in automatische planning | Hoog | Voorstel-diff-model, "waarom"-uitleg, geleidelijke automatiseringsniveaus |
| Fiscale nuances BTW per branche | Middel | Instelbaar per dienst + disclaimer; content/kennisbank |
| Vendor lock-in Supabase | Laag/middel | Standaard PostgreSQL, portable schema, adapters |

## 19. Aannames & Expliciete Beslissingen

| # | Aanname/Beslissing | Status |
|---|---|---|
| A-01 | Taal UI: Nederlands; i18n-keys vanaf start | Vastgesteld |
| A-02 | Valuta: EUR, prijzen incl. én excl. BTW toonbaar | Vastgesteld |
| A-03 | Tijdzone: Europe/Amsterdam, opslag UTC | Vastgesteld |
| A-04 | Payment provider: Mollie | Vastgesteld, adapter-patroon |
| A-05 | PWA i.p.v. native apps t/m V1 | Vastgesteld |
| A-06 | Routing-provider: **Mapbox** (geocoding + Matrix + Directions) voor MVP/V1, achter routing-adapter; **OSRM self-hosted** als schaal-/fallback-optie later | Vastgesteld (2026-07-07), adapter-patroon; uitwerking 14_RoutingEngine.md |
| A-07 | BTW-default 21%, per dienst instelbaar, fiscale verantwoordelijkheid bij gebruiker | Vastgesteld |
| A-08 | WhatsApp BSP: **360dialog** (flat fee, EU/GDPR-hosting, directe Meta Cloud API = lage lock-in) voor V1, achter messaging-adapter; Twilio als alternatief bij kanaal-consolidatie | Vastgesteld (2026-07-07), adapter-patroon; uitwerking 19_WhatsApp.md |
| A-09 | Boekhoudkoppelingen pas V2 | Vastgesteld |
| A-10 | Sprint 2 (Klanten/Objecten/Diensten/Dienstafspraken): `objects.location` (PostGIS-geometry) wordt **nullable** i.p.v. de NOT NULL uit 11_DatabaseConcept.md § 3.2. Reden: Sprint 2 bouwt bewust geen kaart-UI en geen Mapbox-geocoding-adapter (die landen in een latere sprint samen met Planning/Routes) — objecten worden dit sprint alleen adres-only aangemaakt (postcode/huisnummer/straat/plaats), zonder lat/lng. `location_status` default `manual`. Expand/contract (41_CodingStandards.md § 9): kolom blijft nullable tot de geocoding-adapter er is, dan pas eventueel NOT NULL. | Vastgesteld (2026-07-08), Sprint 2-kickoff |
| A-11 | Sprint 3 (horizon-laag, BR-001/BR-101/BR-102/BR-103, FR-020): drie hiaten in 10_BusinessRules.md ingevuld voor de implementatie van `lib/planning/horizon.ts`. (1) **Eerste beurt zonder voorgaande `uitgevoerd`-beurt** (BR-001 veronderstelt er al één): ideale datum = eerstvolgende voorkeursdag (`preferred_day`) op/na vandaag; zonder voorkeursdag = vandaag. (2) **BR-103 (maand-patronen) gegeneraliseerd naar `monthly`/`yearly`**, die zelf geen formule hebben: `monthly` = 1e voorkeursdag (default donderdag) van de eerstvolgende maand na de laatste (ideale) datum; `yearly` = 1e voorkeursdag van dezelfde maand, één jaar later. `quarterly` volgt de expliciete BR-103-regel (1e donderdag van het kwartaal). (3) **Weekdag-nummering `preferred_day`**: 0 = maandag … 6 = zondag (Nederlandse weekstart), consistent met FR-004 "voorkeurdag ma-zo". | Vastgesteld (2026-07-10), Sprint 3-kickoff |
| A-12 | Sprint 4 (routing-engine, 14_RoutingEngine.md § 4.4): het per-stop routeresultaat (`sequence`, `arrival_time`, `service_start`, `service_end`, `drive_time_from_prev_sec`, `distance_from_prev_m`) heeft geen eigen `route_stops`-tabel in 11_DatabaseConcept.md — alleen `routes` (route-totalen) en `jobs.route_id` (koppeling) zijn gespecificeerd. Omdat elke Beurt aan hoogstens één Route hangt (1:N, geen aparte stop-entiteit nodig), zijn deze zes velden als kolommen aan `jobs` toegevoegd i.p.v. een nieuwe tabel — consistent met het bestaande `jobs.route_id`-ontwerp, geen extra join nodig voor de RouteBoard/RouteStopList-query. | Vastgesteld (2026-07-10), Sprint 4-kickoff |
| A-13 | Sprint 4 (`route-optimize`-Edge-Function, 14_RoutingEngine.md § 4.2 "Startlocatie (bedrijfsadres)"): `companies` heeft geen eigen adres-/coördinaatkolommen in 11_DatabaseConcept.md § 3.1. De startlocatie (depot) wordt daarom opgeslagen als `config_json.depot_location: { lat, lng }` (het bestaande, generieke settings-veld) i.p.v. een nieuwe migratie voor twee kolommen op `companies`. Ontbreekt dit veld, dan weigert `route-optimize` met een duidelijke fout i.p.v. te gokken — het instellen van de depotlocatie zelf (UI) is geen Sprint 4-scope, alleen de routing-engine die het consumeert. | Vastgesteld (2026-07-11), Sprint 4 |
| A-14 | Sprint 4 Frontend (RouteBoard drag-and-drop, 26_ComponentLibrary.md, 27_PaginaOverzicht.md § 1.1): geen van de vastgestelde documenten (ADR's, 41_CodingStandards.md) benoemt een concrete drag-and-drop-library — dit is een UI-implementatiedetail, geen architectuurbeslissing (geen ADR). Gekozen: **`@dnd-kit`** (`core`/`sortable`/`utilities`) — actief onderhouden, toegankelijk (keyboard/screen-reader-drag, 25_DesignSystem.md § 1.2 a11y-eis), en zonder legacy-afhankelheden (i.t.t. `react-beautiful-dnd`, niet meer onderhouden). Geïsoleerd achter `components/domain/RouteBoard` — een latere wissel raakt geen andere lagen (41_CodingStandards.md § 1). | Vastgesteld (2026-07-11), Sprint 4 Frontend |
| A-15 | Architectuurwijziging (ADR-011, Human-in-the-Loop AI): de "AI Planner" (§ 8, ADR-010) wordt architecturaal gegeneraliseerd van één drielagen-systeem naar een expliciete **meervoudige agent-architectuur** (acht agents: Planning, Replanning, Weather, Communication, Invoice, Capacity, Revenue, Optimization — `43_AI_Agents.md`), gecoördineerd door een Agent Orchestrator en samenkomend in een dagelijkse **Morning Briefing** (nieuw, FR-900) — vastgelegd als het **primaire startscherm** van RouteFlow (vervalt samen met de bestaande dashboard-route `/`, FR-102; geen los overzicht ernaast). Dit is een **uitbreiding**, geen vervanging: ADR-010's drielagen-architectuur (horizon/dag/reactief) blijft het interne fundament van de Planning/Replanning/Optimization-agents; `15_AIPlanner.md` blijft de bron van waarheid voor die algoritmische details. Nieuw vastgelegd: een harde, niet per-bedrijf-uitschakelbare Human-Approval-grens (facturen versturen, betalingen uitvoeren, prijsafspraken wijzigen, klanten/medewerkers verwijderen, definitieve planningen overschrijven — nooit zonder expliciete goedkeuring, BR-702) en een verplicht confidence/why/bronnen/alternatieven-outputcontract per agent-beslissing (BR-703). Geen nieuwe infrastructuur: agents zijn Edge Functions (ADR-008) via het bestaande Provider Adapter Pattern (ADR-007). | Vastgesteld (2026-07-12), architectuurwijziging |
| A-16 | Prijsafspraken (18_Prijsafspraken.md § 7): klant-specifieke prijs-overrides toegevoegd bovenop het bestaande 1:1-Dienstafspraak-prijsmodel (§ 1). Nieuwe prioriteitsketen bij samenloop: **Job > Klant > Dienstafspraak > Dienst** (specifiekste niveau wint, nieuwe harde BR-306) — dit gat bestond niet eerder in PRD § 9.1, dat alleen de vier prijstypen zelf beschreef, niet hoe een klant-brede korting zich verhoudt tot een dienstafspraak-specifieke prijs. Puur conceptueel vastgelegd (business rule + datamodel-velden in 18_Prijsafspraken.md § 7.2); nog niet gemigreerd naar `11_DatabaseConcept.md`/`12_Entiteiten.md` en niet toegewezen aan een sprint in `40_Implementatieplan.md` — dat is werk voor de sprint die dit daadwerkelijk bouwt. | Vastgesteld (2026-07-12), conceptuele uitbreiding |
| A-17 | Architectuurwijziging (ADR-012, AI Execution Pipeline): technische runtime-specificatie bovenop ADR-011's agent-architectuur. Twee keuzes die nergens anders in het docset stonden: (1) **confidence score is intern 0–1** (float), UI/BR-703/`43_AI_Agents.md` § 13 tonen dit als 0–100 (`score × 100`) — één bron van waarheid, twee weergaven, geen tegenspraak. (2) **Confidence-drempel (default 0,7, bedrijf-instelbaar) als niet-overrulebare veiligheidslaag** boven op het bestaande automatiseringsniveau-model (15_AIPlanner.md § 8): een lage-confidence-kandidaat degradeert altijd naar "toon als voorstel", ongeacht het geconfigureerde Semi-/Volautomatisch-niveau. Verder: gedeelde Conflict Detector-pipelinestap (BR-200–203-toetsing, hergebruikt bestaande `route-optimize`/`route-move-job`-logica, geen nieuwe regel-implementatie), en drie graceful-degradation-niveaus (volledig/verminderd/handmatig-fallback naar de bestaande Sprint 4 Planning-UI). Geen nieuwe infrastructuur. | Vastgesteld (2026-07-12), architectuurwijziging |
| A-18 | Architectuuruitbreiding (`45_AgentMemory.md`, Organizational Memory): AI Agents (ADR-011) krijgen een gecontroleerde geheugenlaag — vijf scopes (Planner/Customer/Object/Employee/Company Memory) die leren van historische beslissingen en feedback (👍/👎/✏️ per voorstel), expliciet **afgebakend** van bestaande harde schemavelden (`service_agreements.preferred_day`/`preferred_daypart`, `objects.access_notes` blijven de directe, door de gebruiker ingevulde velden; het geheugen is voor wat daarbuiten valt en voor zelf-herkende patronen). Vier confidence-niveaus (nieuw/waarschijnlijk/bevestigd/zeer sterk patroon) bepalen wanneer een impliciet geleerd patroon zichtbaar/bruikbaar wordt — nooit een directe sprong naar volledig vertrouwen. Nieuw vastgelegd: een geleerde voorkeur overschrijft nooit een harde business rule (BR-200–205), alleen de zachte scoringsmodel-afwegingen; volledige Human Control (bekijken/aanpassen/uitschakelen/verwijderen/resetten, BR-704) en expliciete privacy-uitsluitingen (wachtwoorden, betaalgegevens, medische info, privécommunicatie — BR-705). Geen nieuwe infrastructuur: één generieke, RLS-gescoped geheugentabel per de vijf scopes, gelezen/geschreven door de bestaande agent-Edge-Functions (ADR-008). | Vastgesteld (2026-07-12), architectuuruitbreiding |
| A-19 | Sprint 5 (MVP-facturatie, 019_invoicing_mvp.sql): `invoices.status` is een vereenvoudigd 3-statusmodel (`draft`/`sent`/`paid`) i.p.v. het volledige 5-statusmodel uit 11_DatabaseConcept.md § 3.6 (`draft`/`finalized`/`sent`/`overdue`/`cancelled` + los `payment_status`) en zonder losse `payments`-tabel. Reden: de opdracht voor Sprint 5 sluit Mollie, herinneringen, incasso en creditfacturen expliciet uit — er is geen "finalized vóór sent"-moment (nummering en verzenden gebeuren in dezelfde actie) en geen reden voor een aparte betalingen-tabel zolang "betaald" alleen een handmatige markering is (`mark_invoice_paid()`). Nummering (BR-020, gap-loze teller) volgt wél de volledige, verplichte implementatie. Uitbreiding naar het volledige model is werk voor de sprint die Mollie/creditfacturen bouwt (40_Implementatieplan.md Sprint 6/9). | Vastgesteld (2026-07-12), Sprint 5 |
| A-20 | Sprint 5 (MVP-facturatie, PDF § "Bedrijf KVK, BTW-nr … IBAN, BIC"): deze bedrijfsgegevens hebben geen eigen kolommen op `companies` (alleen `config_json`, 11_DatabaseConcept.md § 3.1). Analoog aan PRD § 19 A-13 (depot-locatie): opgeslagen als `config_json.invoicing: { company_code, kvk_number, vat_number, iban, bic }`. Ontbreekt dit, dan weigert het verzenden van een factuur met een duidelijke fout i.p.v. een onvolledige PDF te genereren — instellingen-UI hiervoor is geen Sprint 5-scope. | Vastgesteld (2026-07-12), Sprint 5 |
| A-21 | AI-first frontend vóór Sprint 7 (Morning Briefing-UI + Command Bar): de **UI-laag** van de Morning Briefing (`44_MorningBriefing_UX.md`, ADR-011 § 1) is gebouwd vóórdat de Sprint 7-agents bestaan. Consequenties: (1) `/` is nu de Morning Briefing (navigatielabel "Vandaag"); het KPI-dashboard (FR-102, `28_Dashboard.md`) verhuist naar `/dashboard` — conform A-15 ("vervalt samen met de bestaande dashboard-route"). (2) Dagfeiten, waarschuwingen en KPI's op de briefing komen **live uit de database**; de AI-onderdelen (samenvatting, voorstellen, weer-tijdlijn, confidence) zijn **voorbeeldcontent** (`lib/briefing/demo.ts`, deterministisch per datum, afgeleid van echte dagdata) en worden in de UI expliciet gemarkeerd als "Voorbeeldweergave" — er wordt geen AI gesuggereerd die er niet is (ADR-011-vertrouwensmodel); voorstel-acties werken lokaal en voeren niets uit tot Sprint 7. Het datacontract (`lib/briefing/types.ts`) volgt exact het ADR-012 § 6-Explanation-Generator-schema zodat Sprint 7 alleen de databron hoeft te vervangen. (3) Nieuwe ⌘K Command Bar (globaal, `cmdk`-library): navigatie + klantzoeken (live, RLS) + AI-voorbeeldcommando's (interface-only, gemarkeerd "Voorbeeld"). (4) Nieuwe UI-dependencies: `cmdk` (command palette) en `tw-animate-css` (dev; activeert de al overal gebruikte maar tot nu toe niet-geregistreerde `animate-in`-utilities). | Vastgesteld (2026-07-13), frontend vóór Sprint 7 |
| A-22 | Sprint 7 (AI wordt echt — Capacity/Optimization/Weather Agent + Execution Pipeline): een strategische review (2026-07-13) beoordeelde de oorspronkelijke Sprint 7-scope in `40_Implementatieplan.md` (Replanning/Weather/Capacity Agent) en paste hem aan vóór de bouw. Vastgesteld: (1) **Optimization Agent vervangt Replanning Agent** in dit sprint — de bestaande `route-optimize`/`route-move-job`-Edge-Functions (Sprint 4) worden geformaliseerd i.p.v. de veel grotere, event-driven Replanning Agent (multi-job-diff-UI, BR-802-wiring) te bouwen; Replanning Agent is een expliciete, bewuste deferral naar een vervolgsprint. (2) De **gedeelde Execution Pipeline** (Conflict Detector/Suggestion Generator/Explanation Generator/Approval Handler, ADR-012 § 2) is als herbruikbare `lib/agents/`-modules gebouwd — niet per-agent gedupliceerd, conform ADR-012's eigen afwijzing van "elke agent implementeert zijn eigen explainability-logica". (3) `route-optimize` kreeg een optioneel `dry_run`-veld (default `false`, bestaand gedrag ongewijzigd) + een service-rol-auth-pad dat uitsluitend in combinatie met `dry_run:true` werkt (nooit een schrijfpad buiten RLS om) — zodat de nachtcyclus (geen ingelogde gebruiker) een kandidaat kan berekenen zonder de bewezen Edge Function te dupliceren. (4) **Weather Agent cachet uitsluitend het dagaggregaat** in de al-gespecificeerde `weerdata_cache`-tabel (11_DatabaseConcept.md § 3.9, ongewijzigd schema) — geen eigen, rijkere urencache (ADR-012 § 3: "geen agent bouwt een eigen, parallelle cache-laag"); de bestaande `WeatherTimeline`-UI (uur-voor-uur) blijft daarom voorbeeldweergave tot een latere sprint een urencache toevoegt, ook wanneer de weer-gerelateerde AI-*voorstellen* zelf al echt zijn. (5) Nieuwe tabellen `agent_runs`/`agent_proposals` (migratie `022_agent_pipeline.sql`) — de in `40_Implementatieplan.md` geplande migratienummers voor Sprint 6/7 (`016_payments.sql`…`021_leave_periods.sql`) waren inmiddels bezet door Sprint 5 (`017`…`021`); Sprint 7 vervolgt vanaf `022`. (6) **`auto_expose_new_tables` staat uit** (`supabase/config.toml`) — dit betekent dat zelfs de service-rol geen tabeltoegang heeft zonder expliciete `GRANT`, ook voor tabellen die vóór Sprint 7 al bestonden (`companies`/`employees`/`jobs`/`routes`/`availability`/`service_agreements`/`services`); migratie `024_agent_service_role_reads.sql` voegt de ontbrekende, uitsluitend-lezende grants toe die de nieuwe agent-Edge-Functions nodig hebben (ontdekt en gefixt tijdens lokale end-to-end-verificatie, geen bestaand Sprint 1-5-pad gebruikte eerder service-rol-leestoegang op deze schaal). (7) De Organizational Memory-**leeskant** (`45_AgentMemory.md`) is expliciet buiten scope — agents gebruiken dit sprint nog geen geleerde voorkeuren als input, alleen het schrijfpad ligt klaar voor een latere sprint. | Vastgesteld (2026-07-13), Sprint 7 |
| A-23 | Architectuuruitbreiding (ADR-013, Platform Admin & Product Agent): een nieuw domein, **buiten** de bestaande Bedrijf-tenant-scope (§ 4.3/23_Gebruikersrollen.md) en **buiten** de MVP/V1/V2-scopetabel (§ 5.2, die uitsluitend klant-gerichte functionaliteit beschrijft) — volledig uitgewerkt in `46_PlatformAdmin.md`. Twee onderdelen: (1) een **platform-admin-autorisatiedimensie**, orthogonaal aan `company_id`-RLS (een expliciete allowlist, geen Bedrijfsrol erft ooit platform-toegang), met een eigen portal voor cross-tenant operationeel overzicht en goedkeuring van Product Agent-voorstellen. (2) een **Product Agent** die tenant-ingediende feature requests (nieuwe tenant-scoped tabel `feature_requests`, RLS ongewijzigd-standaard, geen cross-tenant zichtbaarheid — BR-904) en bestaande operationele signalen (`agent_runs`-foutpatronen) trieert/clustert tot concrete codewijzigingsvoorstellen (branch + Pull Request). Draait als geplande Claude Code-agent, geen nieuwe Edge-Function-infrastructuur. **Strengere Human-Approval-grens dan BR-702** (nieuw BR-900–904, `10_BusinessRules.md` § 12): de Product Agent mag nooit zelf mergen/deployen; PR's die migraties, RLS, auth, betalingen of secrets raken zijn verplicht high-risk-gelabeld en worden nooit automatisch getriggerd, uitsluitend on-demand door de platform-eigenaar. Nieuwe FR-serie 950+ (`08_FunctioneleEisen.md` § 9) dekt zowel de tenant-zijde (feature request indienen) als de platform-zijde (portal, triage). Nog niet gemigreerd naar `11_DatabaseConcept.md`/`12_Entiteiten.md` en niet toegewezen aan een sprint in `40_Implementatieplan.md` (zelfde precedent als A-16) — dat is werk voor de sprint die dit daadwerkelijk bouwt. | Vastgesteld (2026-07-15), architectuuruitbreiding |

## 20. Verwijzingen naar deeldocumenten

Dit PRD is de paraplu. Elk genummerd document (01–39) werkt één domein uit en mag dit PRD niet tegenspreken; bij conflict wint het PRD totdat het PRD expliciet is aangepast. MASTER_PROMPT.md bevat de werkinstructie voor AI-agents die op deze documentatie bouwen.

---

*Einde 00_PRD.md — v1.0. Wijzigingen alleen via expliciete revisie met versienummer en changelog.*
