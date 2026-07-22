# ADR-010: AI Planner — drielagen-architectuur (horizon / dag / reactief)

- **Status:** Accepted
- **Datum:** 2026-07-07
- **Beslisser:** Chief Software Architect (ServOps)
- **Bron van waarheid:** `00_PRD.md` § 8 (De AI Planner)
- **Gerelateerd:** ADR-005 (Mapbox), ADR-007 (Provider Adapter Pattern), ADR-008 (Edge Functions); 14_RoutingEngine.md, 15_AIPlanner.md, 10_BusinessRules.md (BR-001/101/200-205/700)

---

## Context

De AI Planner is het kernonderscheid van ServOps (PRD § 8): hij vertaalt terugkerende dienstafspraken naar concrete beurten, optimaliseert routes, en herplant automatisch bij verstoringen (ziekte, weer, niet-thuis). De planner moet **transparant** zijn ("waarom"-uitleg, BR-700), **nooit stilzwijgend muteren** (PRD § 8.5), en werken binnen strikte performancebudgetten (< 3s voor 60 stops, NFR-103). Tegelijk moet hij evolueren: van simpele heuristieken (MVP) naar geleerde voorkeuren (V2, 15 § 10).

## Probleem

Hoe structureren we een planningsalgoritme dat (a) drie fundamenteel verschillende tijdshorizons bedient (weken vooruit, dagindeling, realtime verstoring), (b) harde regels nooit schendt maar zachte regels afweegt, en (c) uitlegbaar en incrementeel verbeterbaar blijft — zonder één monolithisch, ondoorzichtig algoritme te bouwen?

## Gekozen oplossing

**Drielagen-architectuur**, met een strikte scheiding van verantwoordelijkheid (PRD § 8.2, 15 § 1):

1. **Horizon-laag** — vertaalt Dienstafspraken naar ideale datums (BR-001, ±flexvenster BR-101) en clustert geografisch per week (15 § 1.1). Output: `voorgesteld`-beurten, 12 weken vooruit.
2. **Dag-laag** — verdeelt weekbeurten over medewerkers en roept de **routing-engine** (ADR-005, 14) aan voor volgorde/tijden binnen harde grenzen (BR-200/201/202/203). Output: routes + sequenties.
3. **Reactieve laag** — luistert naar events (ziekte, weer, niet-thuis, uitloop) en genereert een **diff-voorstel** dat de planner expliciet accepteert (15 § 7) — nooit een stille mutatie.

Elke laag heeft een eigen **scoringsmodel** met instelbare gewichten (15 § 4) en logt de reden per beslissing (BR-700, "waarom"-uitleg). Automatisering is **niveau-gestuurd** (Voorstel → Semi-automatisch → Volautomatisch, 15 § 8), zodat vertrouwen geleidelijk kan groeien.

## Alternatieven

| Alternatief | Waarom niet |
|---|---|
| **Eén monolithisch optimalisatie-algoritme (alles-in-één VRP over weken)** | Onbeheersbaar rekencomplex, moeilijk uitlegbaar, moeilijk te testen per verantwoordelijkheid |
| **Volledig extern optimalisatie-platform (bv. Google OR-Tools als centrale dienst)** | Krachtig maar zware infrastructuur-/leercurve voor MVP; overwogen als V1+-upgrade van de dag-laag heuristiek (14 § 2.2), niet als startpunt |
| **Volledig automatische black-box (ML-first) planner** | Strijdig met PRD § 8.5 (transparantie/vertrouwen); geen "waarom"-uitleg mogelijk; risico op onvoorspelbaar gedrag |
| **Puur handmatige planning met alleen suggesties** | Levert niet de kernbelofte (automatische planning, P1/P2 uit PRD § 2.2) |

## Consequenties

**Positief**
- Elke laag is onafhankelijk testbaar (31 § 2–3: horizon-datumlogica, dag-laag-routing, reactieve diff-generatie).
- Transparantie is ingebouwd, niet achteraf toegevoegd (BR-700 als architectuurvereiste, niet een UI-extraatje).
- Harde regels (BR-200/201/202/203) zijn expliciete constraints in de dag-laag, geen impliciete aannames — voorkomt "de AI negeert een vergrendelde beurt"-bugs.
- Automatiseringsniveaus (15 § 8) geven een ingebouwd vertrouwens-mitigatiepad (PRD-risico § 18).

**Negatief / risico's**
- Drie lagen betekent meer coördinatie (welke laag triggert welke herberekening) dan één simpel algoritme.
- Scoringsgewichten per bedrijf instelbaar (15 § 4) kan tot moeilijk reproduceerbare edge-cases leiden bij support.

**Mitigaties**
- Elke laag-overgang heeft een gedocumenteerd contract (input/output, 15 § 1) en eigen edge-case-tabel (15 § 11).
- Reden-object (BR-700) wordt altijd gelogd, ook bij automatische niveaus, voor reproduceerbaarheid en support.
- "Leren van correcties" (15 § 10) is bewust V2 en bouwt op de reeds gelogde reden-/scoredata — geen architectuurbreuk nodig om er later naartoe te groeien.

## Waarom deze keuze toekomstbestendig is

De scheiding in horizon/dag/reactief volgt de **natuurlijke tijdschalen van het domein**, niet een implementatiedetail — dit blijft dus geldig ongeacht welk optimalisatie-algoritme achter de dag-laag zit. De dag-laag kan bijvoorbeeld opgewaardeerd worden van nearest-neighbor+2-opt (MVP, 14 § 5) naar Google OR-Tools (V2) zonder de horizon- of reactieve laag te raken, omdat de contracten tussen lagen stabiel zijn. Het BR-700-transparantiemechanisme legt vanaf dag één de datafundering (reden, score, delta) die nodig is voor het V2-concept "leren van correcties" (15 § 10) — de architectuur is dus al voorbereid op haar eigen volgende evolutiestap. Door harde regels als expliciete constraints te modelleren (in plaats van ze te "hopen" dat een algoritme respecteert), blijft de planner betrouwbaar uitbreidbaar naar nieuwe verticalen (PRD § 6.7) met eigen regels, zonder het kernontwerp te herzien.

## Referenties

- PRD § 8 (volledig), § 18 (vertrouwens-risico)
- 14_RoutingEngine.md, 15_AIPlanner.md, 10_BusinessRules.md (BR-001/101/200-205/700-701)
