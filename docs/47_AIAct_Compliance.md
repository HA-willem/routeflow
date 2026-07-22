# 47 — EU AI Act-compliance

**Status:** DONE
**Versie:** 1.1
**Bron van waarheid:** Verordening (EU) 2024/1689 (AI Act) zoals gewijzigd door het Digital Omnibus inzake AI (definitief aangenomen: Europees Parlement 16 juni 2026, Raad 29 juni 2026; in werking juli 2026). Binnen de docset: `00_PRD.md` § 19 A-26 registreert de aannames; dit document mag het PRD niet tegenspreken.
**Werkinstructie:** zie `MASTER_PROMPT.md`.
**Relaties:** `docs/adr/ADR-010` (deterministische planner — de kern van de classificatie), `docs/adr/ADR-011`/`ADR-012` (Human Approval/Explainability — de kern van het toezichtmodel), `docs/adr/ADR-013`/`46_PlatformAdmin.md` (Product Agent), `docs/adr/ADR-014` (Command Bar-LLM — het enige AI-systeem in productie), `43_AI_Agents.md` (agent-inventaris), `45_AgentMemory.md` (Organizational Memory — grensgeval, § 5.3), `10_BusinessRules.md` § 9 (BR-700–707), `36_Security.md` § 8 (verwerkers/DPA).

> **Juridische status van dit document:** dit is een door engineering opgestelde compliance-analyse en -inrichting, geen juridisch advies. De classificaties in § 4/§ 5 zijn zorgvuldig onderbouwd maar vereisen bevestiging door een jurist gespecialiseerd in de AI Act vóór de eerste betalende klant (actiepunt § 8, aansluitend op `QA_PRODUCTION_READINESS_2026-07-16.md` § 6).

---

## Doel van dit document

Vastleggen (1) welke onderdelen van ServOps wel en niet onder de AI Act vallen en waarom, (2) welke verplichtingen daaruit volgen en hoe die zijn geïmplementeerd, en (3) welke architectuurgrenzen bewaakt moeten worden zodat ServOps niet **stilzwijgend** in een zwaardere risicocategorie groeit. Dat laatste is het belangrijkste: de huidige classificatie is gunstig *omdat* de architectuur bewuste keuzes maakte (deterministische agents, human approval, geen gedragsprofilering) — die keuzes zijn nu ook compliance-grenzen.

---

## 1. Wettelijk kader & tijdlijn (na Digital Omnibus, stand juli 2026)

| Verplichting | Van kracht | Relevantie voor ServOps |
|---|---|---|
| Verboden praktijken (Art. 5) | 2 feb 2025 (van kracht) | Geen enkele ServOps-functie raakt een verboden praktijk (§ 4) |
| AI-geletterdheid (Art. 4) | 2 feb 2025 (van kracht) | Actiepunt: instructiemateriaal (§ 8) |
| GPAI-modelverplichtingen (Art. 53 e.v.) | 2 aug 2025 (van kracht) | Liggen bij Anthropic als modelaanbieder; ServOps is afnemer |
| **Transparantie (Art. 50)** | **2 aug 2026** | **Direct relevant — geïmplementeerd, § 6.1** |
| Hoog-risico Annex III (Art. 8–27) | **2 dec 2027** (uitgesteld door Omnibus; was 2 aug 2026) | ServOps classificeert als niet-hoog-risico (§ 5), maar de herbeoordelingsplicht (§ 7) loopt tot die datum extra scherp |
| Hoog-risico Annex I (embedded in gereguleerde producten) | 2 aug 2028 | N.v.t. |

Bronnen: [Consilium-persbericht 7 mei 2026](https://www.consilium.europa.eu/en/press/press-releases/2026/05/07/artificial-intelligence-council-and-parliament-agree-to-simplify-and-streamline-rules/), [Gibson Dunn — omnibus-analyse](https://www.gibsondunn.com/eu-ai-act-omnibus-agreement-postponed-high-risk-deadlines-and-other-key-changes/), [Freshfields — final Digital Omnibus on AI](https://www.freshfields.com/en/our-thinking/blogs/technology-quotient/eu-ai-act-unpacked-34-the-final-digital-omnibus-on-ai-key-amendments-to-the-a-102nber). Art. 50 is door het Omnibus **niet** uitgesteld.

---

## 2. Rolverdeling

| Partij | AI Act-rol | Gevolg |
|---|---|---|
| ServOps (platform-eigenaar) | **Aanbieder** (provider) van het platform richting Bedrijven; tevens **gebruiksverantwoordelijke** (deployer) van Claude (Anthropic API) voor de Command Bar | Draagt de Art. 50-transparantieplicht en de classificatieverantwoordelijkheid van dit document |
| Bedrijf (tenant) | Gebruiksverantwoordelijke van ServOps; tevens **werkgever** van de Medewerkers | Zolang niets hoog-risico is: geen aanvullende AI Act-plichten. Zou een onderdeel ooit hoog-risico worden, dan geldt o.a. de werknemers-informatieplicht (Art. 26(7)) — reden te meer voor de grenzen in § 5.2 |
| Anthropic | Aanbieder van een GPAI-model | Draagt de Art. 53-modelverplichtingen; ServOps' afspraken lopen via de DPA (36 § 8 — **nog te sluiten**, § 8) |

---

## 3. Systeeminventaris

| # | Onderdeel | Techniek | AI-systeem (Art. 3(1))? |
|---|---|---|---|
| S1 | Zes domein-agents (Planning, Replanning, Weather, Capacity, Optimization, Invoice) | Deterministische regels/heuristieken (ADR-010, ADR-012); geen ML, geen LLM | **Nee** (§ 4.1) |
| S2 | Command Bar intent-routing (ADR-014) | LLM (Claude Haiku) kiest uit gesloten commandolijst | **Ja** — beperkt risico (§ 4.2) |
| S3 | Organizational Memory (45_AgentMemory.md) | Tellers/confidence-niveaus; leeskant nog niet gebouwd | Grensgeval (§ 5.3) — guardrails vóór de bouw vastgelegd |
| S4 | Product Agent (FR-951, nog niet actief) | Geplande Claude Code-agent, intern ontwikkelgereedschap | Ja, maar intern; geen besluiten over personen (§ 4.3) |
| S5 | Routing (Mapbox), geocoding, weerdata (Open-Meteo) | Externe API's / berekeningen | Nee (rekendiensten, geen inferentie in Act-zin binnen ServOps) |

---

## 4. Classificatie per systeem

### 4.1 S1 — de zes domein-agents zijn géén AI-systemen in de zin van de Act

De Commissie-richtsnoeren over de AI-systeemdefinitie (feb 2025) zonderen systemen uit die uitsluitend werken volgens **door mensen vastgestelde regels** en die niet zelfstandig uit input *afleiden* hoe output gegenereerd moet worden. Precies dat is de door ADR-010 vastgelegde en door ADR-012 uitgewerkte architectuur: elke agent past uitsluitend expliciete business rules (BR-001, BR-101–103, BR-200–205) en vaste heuristieken toe, reproduceerbaar en zonder leren of inferentie. ADR-010 wees "black-box ML-first" expliciet af; ADR-014 bevestigde die grens opnieuw ("het taalmodel routeert, het beslist niet" — de agents zelf blijven deterministisch).

**Consequentie:** de AI Act is op S1 niet van toepassing. De bestaande transparantie (BR-700 why-explanations, BR-703 explainability-contract, confidence-weergave) blijft als **vrijwillige, productinhoudelijke** keuze bestaan — en vormt tegelijk de voorbereiding van § 7.

**Bewaakte voorwaarde:** deze classificatie vervalt zodra een agent een taalmodel of ander lerend/inferentieel mechanisme voor zijn eigen redenering krijgt. Dat vereist per ADR-014 al een nieuwe ADR; die nieuwe ADR **moet** een herclassificatie onder dit document bevatten (§ 7).

### 4.2 S2 — Command Bar intent-routing: AI-systeem, beperkt risico

De vrije-tekst-routing gebruikt een LLM en is dus een AI-systeem. Toetsing:

- **Verboden praktijken (Art. 5):** geen — geen manipulatie, social scoring, emotieherkenning, biometrie of CSAM-raakvlak.
- **Annex III (hoog-risico):** geen match. Het systeem vertaalt een getypte zin naar één van vier vooraf gedefinieerde UI-acties (capaciteitsquery, medewerkerslijst, navigatie). Het neemt of onderbouwt geen besluiten over personen, arbeidsrelaties, essentiële diensten o.i.d.; de uitgevoerde actie is dezelfde deterministische, RLS-gebonden query als een handmatige klik (ADR-014).
- **Resterend: Art. 50(1)-transparantie** — natuurlijke personen die met een AI-systeem interacteren moeten daarvan op de hoogte zijn. Implementatie: § 6.1.

### 4.3 S4 — Product Agent: intern gereedschap

De (nog niet geactiveerde) Product Agent genereert codewijzigingsvoorstellen voor de platform-eigenaar zelf. Hij interacteert niet met tenants of Medewerkers, neemt geen besluiten over personen en al zijn output passeert verplicht menselijke review en handmatige merge (BR-901/902, `46_PlatformAdmin.md` § 4). Geen Annex III-raakvlak; de enige gebruiker (platform-eigenaar) weet per definitie dat hij met AI werkt. Geen aanvullende verplichtingen naast de al vastgelegde governance.

---

## 5. Het kernrisico: Annex III 4(b) — taakallocatie en werknemersmonitoring

Annex III punt 4(b) merkt als hoog-risico aan: AI-systemen voor besluiten over arbeidsvoorwaarden/-relaties, voor **taakallocatie op basis van individueel gedrag of persoonlijke eigenschappen**, of voor het **monitoren/evalueren van prestaties en gedrag** van werkenden. ServOps wijst beurten aan Medewerkers toe — dit is dus hét artikel waarlangs ServOps beoordeeld moet worden.

### 5.1 Waarom de huidige inrichting er niet onder valt

Drie onafhankelijke, elk op zichzelf voldoende argumenten:

1. **De allocerende systemen zijn geen AI-systemen** (§ 4.1) — Annex III veronderstelt een AI-systeem; deterministische regellogica valt buiten de Act.
2. **Allocatie gebeurt niet op individueel gedrag of persoonskenmerken.** De criteria zijn uitsluitend objectief-operationeel: geografie/wijk, beschikbaarheid (BR-201), werkdaglimiet (BR-202), clustering (BR-204), klantvoorkeuren (BR-205) en harde bevoegdheidseisen (certificering). Geen gedragsprofielen, geen persoonlijkheidskenmerken, geen prestatiescores.
3. **De mens beslist.** Elk voorstel vereist expliciete menselijke goedkeuring (BR-702, ADR-011 § 4); het automatiseringsniveau staat vast op "Voorstel" (15_AIPlanner.md § 8).

### 5.2 Nieuwe harde grenzen (BR-706/BR-707)

Om te voorkomen dat een toekomstige feature deze classificatie stilzwijgend ondergraaft, zijn twee business rules toegevoegd (`10_BusinessRules.md` § 9):

- **BR-706 (Hard):** taakallocatie gebruikt nooit individueel gedrag, persoonlijkheidskenmerken of prestatiescores van Medewerkers als criterium — uitsluitend objectief-operationele criteria en harde bevoegdheidseisen.
- **BR-707 (Hard):** door Organizational Memory geleerde per-medewerker-gegevens worden nooit gebruikt voor prestatiebeoordeling, monitoring of enig HR-besluit, en worden nooit als zodanig aan wie dan ook gepresenteerd.

### 5.3 Organizational Memory — het grensgeval

`45_AgentMemory.md` § 2 voorziet in Employee Memory met o.a. **"gemiddelde snelheid per dienst-type per medewerker"**. Dat is individueel-gedragsafgeleide data; gebruik ervan voor allocatie of beoordeling zou rechtstreeks in het Annex III 4(b)-vaarwater komen, en het lerende karakter maakt de "geen AI-systeem"-redenering van § 4.1 hier niet zonder meer toepasbaar.

Vastgelegde randvoorwaarden (bindend voor de sprint die de Memory-leeskant bouwt):

1. Duur-kalibratie ("deze beurt duurt bij deze medewerker realistisch 40 i.p.v. 30 min") is uitsluitend toegestaan als **schattingscorrectie**, nooit als allocatie- of beoordelingscriterium (BR-706/707).
2. Vóór de bouw van de leeskant is een **gedocumenteerde AI Act-pre-check** tegen dit document verplicht (herclassificatie § 7); zonder die check wordt de per-medewerker-snelheidsdata simpelweg niet gelezen.
3. De bestaande BR-704/705-grenzen (Human Control, privacy-uitsluitingen) blijven onverkort gelden.

---

## 6. Verplichtingen & implementatie

### 6.1 Art. 50(1) — transparantie bij AI-interactie (deadline 2 aug 2026) — ✅

De enige plek waar een gebruiker met een AI-systeem interacteert is de Command Bar-vrije-tekst-invoer. Implementatie: de AI-optie is expliciet gelabeld — de gebruiker kiest actief een regel met het label **"Vraag AI: '…'"** in een groep met kop **"Vraag AI"** (`components/composed/CommandBar.tsx`). Er is geen verborgen of impliciete AI-interactie: alle overige Command Bar-functies (navigatie, klantzoeken) zijn conventionele queries, en de briefing-inhoud komt van S1-systemen (geen AI-systemen, § 4.1; bovendien gelabeld met agent-badges en `aria-label="AI-samenvatting"` als vrijwillige transparantie).

### 6.2 Art. 4 — AI-geletterdheid — ⏳ actiepunt

Verplicht sinds feb 2025 voor aanbieders én gebruiksverantwoordelijken. Voor een eenmansplatform met tenants betekent dit praktisch: (1) de platform-eigenaar onderhoudt aantoonbare basiskennis (dit document is daar onderdeel van), (2) tenant-gerichte uitleg over wat de AI-onderdelen wel/niet doen — de bestaande why-explanations en het ADR-011-vertrouwensmodel dekken dit inhoudelijk al grotendeels; een korte, vindbare hulptekst ("Hoe ServOps AI gebruikt") is het resterende actiepunt (§ 8).

### 6.3 Logging & verantwoording — ✅ (bestaand, nu ook compliance-functie)

- `agent_runs`/`agent_proposals` (ADR-012 § 14): volledige audittrail van elk voorstel incl. reasoning, confidence, data_sources, business_rules en de menselijke beslissing (wie/wanneer).
- `ai_usage_events` (ADR-014/PRD A-25): elke LLM-aanroep gelogd met model en tokenverbruik, per Bedrijf inzichtelijk in het Platform Admin-portal.
- Deze bestaande voorzieningen worden hierbij aangemerkt als de documentatie-/loggingbasis voor de AI Act; wijzigingen eraan vereisen een changelog-vermelding hier.

### 6.4 GPAI-keten (Anthropic) — ⏳ DPA open

De modelverplichtingen liggen bij Anthropic. ServOps' kant: (1) DPA sluiten vóór productiegebruik (reeds geregistreerd open punt, 36 § 8 en QA-rapport § 6), (2) geen klant-/bedrijfsdata in prompts (ADR-014-ontwerp: alleen de getypte zin + vaste commandolijst — geverifieerd in `lib/ai/anthropic-provider.ts`), (3) provider vervangbaar via het adapterpatroon (ADR-007) zodat een keten-/DPA-probleem nooit een architectuurprobleem wordt.

### 6.5 Verboden praktijken (Art. 5) — ✅ n.v.t.

Doorlopen: geen subliminale/manipulatieve technieken, geen kwetsbaarheids-uitbuiting, geen social scoring, geen predictive policing, geen biometrie/emotieherkenning (ook niet op de werkvloer — relevant gezien Medewerker-context), geen CSAM-raakvlak (nieuw Omnibus-verbod). De WhatsApp-communicatie (toekomstig, Sprint 8) verstuurt operationele berichten met opt-in (BR-600/601) — geen manipulatierisico in Act-zin.

---

## 7. Voorbereid op strengere classificatie ("what if")

Zou S1 of S3 ooit tóch als hoog-risico (her)geclassificeerd worden — door featurewijziging, jurisprudentie of richtsnoeren — dan is de afstand tot de Art. 8–15-eisen bewust klein gehouden:

| Hoog-risico-eis (indicatief) | Bestaand equivalent |
|---|---|
| Risicobeheersysteem (Art. 9) | ADR-012 § 4 (failure handling, graceful degradation), QA-auditcyclus |
| Data-governance (Art. 10) | RLS-multitenancy, BR-705-uitsluitingen, 36 § 7 AVG-kader |
| Technische documentatie (Art. 11) | Deze docset (ADR's, 43/45/46, dit document) |
| Logging (Art. 12) | agent_runs/agent_proposals/ai_usage_events (§ 6.3) |
| Transparantie richting gebruiker (Art. 13) | BR-700/703 why-explanations, confidence-weergave |
| Menselijk toezicht (Art. 14) | BR-702 Human Approval, automatiseringsniveau "Voorstel" |
| Nauwkeurigheid/robuustheid (Art. 15) | Deterministische regels, confidence-drempels (ADR-012 § 7), testsuites |

**Niet** aanwezig (alleen nodig indien daadwerkelijk hoog-risico): conformiteitsbeoordeling, CE-markering, registratie in de EU-databank, kwaliteitsmanagementsysteem conform Art. 17. Bewust niet gebouwd — wel is de route ernaartoe hiermee gedocumenteerd.

**Herclassificatie is verplicht bij elk van deze triggers:** (1) een agent krijgt LLM-/lerende redenering (nieuwe ADR vereist, § 4.1); (2) de Memory-leeskant wordt gebouwd (§ 5.3); (3) het automatiseringsniveau gaat voorbij "Voorstel" (15_AIPlanner § 8); (4) allocatiecriteria wijzigen (BR-706-wijziging = per definitie een PRD-revisie); (5) een nieuwe AI-feature raakt communicatie met klanten of Medewerkers; (6) jaarlijkse herbeoordeling, uiterlijk juli 2027 (vóór de Annex III-deadline van 2 dec 2027).

---

## 8. Openstaande acties

| # | Actie | Deadline | Eigenaar |
|---|---|---|---|
| 1 | DPA met Anthropic sluiten (36 § 8) | Vóór productiegebruik Command Bar-AI | Platform-eigenaar |
| 2 | Juridische review van § 4/§ 5-classificaties | Vóór eerste betalende klant (QA-rapport § 6) | Platform-eigenaar + externe jurist |
| 3 | ~~Hulptekst "Hoe ServOps AI gebruikt" (Art. 4, § 6.2)~~ | ✅ Gebouwd 2026-07-17 (`/instellingen/over-ai`, FR-903, `08_FunctioneleEisen.md` § 8) | Product |
| 4 | AI Act-pre-check bij bouw Memory-leeskant (§ 5.3) | Bij die sprint | Bouwende sessie (bindend) |
| 5 | Herclassificatie-triggers naleven (§ 7) | Doorlopend; jaarlijkse review ≤ juli 2027 | Platform-eigenaar |

---

## 9. Edge cases

| # | Case | Gedrag |
|---|---|---|
| AIA-01 | Tenant vraagt "is jullie planning-AI hoog-risico onder de AI Act?" | Antwoord volgt § 4.1/§ 5.1: deterministisch, objectieve criteria, mens beslist — met dit document als onderbouwing |
| AIA-02 | Anthropic wijzigt modelgedrag/voorwaarden | Adapterpatroon (ADR-007) maakt providerwissel geïsoleerd; DPA-hernieuwing via § 8.1-proces |
| AIA-03 | Een toekomstige feature wil "beste medewerker voor deze klus" op historische prestaties | Geblokkeerd door BR-706 tot expliciete PRD-revisie + herclassificatie (§ 7) + juridische toets — nooit stilzwijgend |
| AIA-04 | Art. 50-label per ongeluk verwijderd bij een UI-refactor | "Vraag AI"-labeling is compliance-kritisch; wijziging vereist changelog-vermelding hier (zelfde bescherming als BR-nummers) |

---

## Changelog

| Datum | Versie | Wijziging |
|---|---|---|
| 2026-07-17 | 1.0 | Eerste volledige versie: tijdlijn na Digital Omnibus (hoog-risico → 2 dec 2027, Art. 50 blijft 2 aug 2026), rolverdeling, systeeminventaris, classificatie per systeem (agents geen AI-systeem; Command Bar beperkt risico; Memory grensgeval met bindende randvoorwaarden; Product Agent intern), Annex III 4(b)-analyse met nieuwe BR-706/707, verplichtingen-matrix met implementatiestatus, what-if-tabel Art. 8–15, openstaande acties, edge cases. |
| 2026-07-17 | 1.1 | Actiepunt § 8.3 gebouwd: AI-transparantiepagina `/instellingen/over-ai` (FR-903, `08_FunctioneleEisen.md` § 8) — legt Art. 4/50-conform uit welk onderdeel echt een taalmodel gebruikt, dat de "AI Agents" deterministisch zijn, en wat AI bij ServOps nooit doet (incl. BR-706/707). |

---

## Volgende stap

De openstaande acties uit § 8 zijn belegd; de eerstvolgende concrete bouwtaak die uit dit document volgt is actiepunt 3 (hulptekst "Hoe ServOps AI gebruikt") — klein genoeg om mee te nemen in de sprint die de instellingen-UI voor depot/facturatie bouwt (QA-rapport § 6-blocker), zodat beide klantgerichte go-live-voorwaarden in één sprint landen.
