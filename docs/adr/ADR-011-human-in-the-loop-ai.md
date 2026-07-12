# ADR-011: Human-in-the-Loop AI — Agent-orchestratie & Morning Briefing

- **Status:** Accepted
- **Datum:** 2026-07-12
- **Beslisser:** Chief Software Architect (RouteFlow)
- **Bron van waarheid:** `00_PRD.md` § 8.1/§ 8.5 (mens als eindredacteur, transparantie/vertrouwen) — deze ADR spreekt dat niet tegen, maar formaliseert en verbreedt het van "één AI Planner met drie lagen" naar een expliciete **meervoudige agent-architectuur**.
- **Gerelateerd:** ADR-010 (AI Planner drielagen-architectuur — dit ADR generaliseert die architectuur, vervangt hem niet), ADR-007 (Provider Adapter Pattern), ADR-008 (Edge Functions), **ADR-012** (AI Execution Pipeline — de technische runtime-mechaniek waarmee de agents uit dit ADR daadwerkelijk uitvoeren); `15_AIPlanner.md`, `43_AI_Agents.md` (operationele uitwerking per agent), `10_BusinessRules.md` (BR-700/701, nieuw BR-702/703)

---

## Context

Traditionele planningssoftware vereist dat planners dagelijks handmatig routes samenstellen en bijwerken: een leeg scherm bij het inloggen, en zelf op zoek naar wat er die dag geregeld moet worden. RouteFlow kiest een andere filosofie, al vastgelegd op PRD-niveau (§ 8.1: *"volautomatisch, met de mens als eindredacteur"*) maar tot nu toe uitgewerkt als één samenhangende "AI Planner" met drie lagen (ADR-010): horizon, dag, reactief.

Naarmate meer domeinen AI-ondersteuning krijgen (weer, capaciteit, communicatie, facturatie, omzetanalyse — niet alleen routeplanning) wordt "één AI Planner" een te grove eenheid: elk domein heeft eigen triggers, eigen input/output, en eigen risicoprofiel voor autonomie (een route-optimalisatie-voorstel is laag-risico; het versturen van een factuur is dat niet). Tegelijk moet de gebruiker niet met acht losse AI-schermen te maken krijgen — het geheel moet als één samenhangend, uitlegbaar systeem aanvoelen.

**Kernprincipe (ongewijzigd, hier geformaliseerd tot architectuur):**

> "AI doet het denkwerk, de gebruiker neemt de beslissing."

## Probleem

Hoe structureren we meerdere gespecialiseerde AI-verantwoordelijkheden (planning, herplanning, weer, communicatie, facturatie, capaciteit, omzet, routeoptimalisatie) zodat (a) elke agent onafhankelijk ontwikkeld/getest kan worden, (b) hun output samenkomt tot één samenhangend dagbeeld voor de gebruiker in plaats van acht losse meldingen, (c) er een harde, expliciete grens is tussen wat AI zelfstandig mag en wat altijd menselijke goedkeuring vereist, en (d) elke beslissing reproduceerbaar en uitlegbaar blijft — zonder de bestaande architectuur (Edge Functions, Provider Pattern, RLS-multitenancy, Event/diff-model van ADR-010) te vervangen door iets fundamenteel nieuws?

## Gekozen oplossing

**RouteFlow is een AI-first Operations Platform**: gespecialiseerde AI Agents werken continu op de achtergrond, de gebruiker opent de applicatie niet in een leeg scherm maar in een **Morning Briefing** — een dagelijks, vooraf samengesteld overzicht van voorstellen, waarschuwingen en analyses die de gebruiker beoordeelt, aanpast of goedkeurt. Planners worden daarmee steeds meer **supervisors** van AI-voorstellen dan handmatige planners: hun tijd gaat naar beoordelen en bijsturen, niet naar het vanaf nul samenstellen van een dagplanning.

Dit bouwt bewust **op** de bestaande architectuur, niet ernaast:

- Elke agent is een **Supabase Edge Function** (ADR-008) — geen nieuw runtime-platform.
- Elke agent die een externe dienst nodig heeft (weer, WhatsApp, Mollie) gaat via de bestaande **Provider Adapter Pattern** (ADR-007) — geen agent praat rechtstreeks tegen een externe API.
- Agents communiceren via **events** binnen de bestaande Edge-Function/cron-orkestratie (ADR-008) — niet via een nieuwe message queue of los "agent framework".
- De reactieve laag van ADR-010 (diff-voorstellen, nooit stille mutatie) is het **patroon** dat alle agents volgen, niet alleen de Replanning Agent.

### 1. Morning Briefing (primair startscherm)

**De Morning Briefing is het standaard startscherm van RouteFlow** — geen los, optioneel overzicht bovenop een dashboard, maar de plek waar de gebruiker **altijd** landt bij het openen van de applicatie. De gebruiker komt dus niet eerst op een los dashboard of de planner terecht en klikt zich vandaar naar een briefing; de Morning Briefing ís het commandocentrum van de dag, elke dag. Technisch valt dit samen met de bestaande dashboard-route (`/`, FR-102) — geen nieuwe route, wel een architecturaal andere rol: `28_Dashboard.md` beschrijft vanaf nu de Morning Briefing, geen los KPI-schermpje ernaast (zie § 0 van dat document).

Bij het openen van RouteFlow (of het eerste bezoek van de dag) krijgt de gebruiker automatisch — niet op aanvraag — een samengesteld overzicht:

| Onderdeel | Bron-agent |
|---|---|
| Beschikbare medewerkers vandaag | Capacity Agent |
| Aantal geplande routes | Planning Agent / Optimization Agent |
| Aantal opdrachten (beurten) vandaag, incl. wachtrij-omvang | Planning Agent |
| Weersverwachting van vandaag + getroffen beurten | Weather Agent |
| Verkeerssituatie (indien relevant voor vandaag's routes) | Optimization Agent (via `RoutingProvider`, ADR-005/007) |
| Capaciteit (over-/ondercapaciteit) | Capacity Agent |
| Omzetprognose (dag/week) | Revenue Agent |
| Openstaande waarschuwingen (facturen, herinneringen, onbevestigde voorstellen) | Invoice Agent, Communication Agent |
| AI-voorstellen (met AI-confidence score per voorstel) | alle agents die deze cyclus kandidaten genereerden |
| Belangrijkste wijzigingen sinds gisteren | Replanning Agent |

**Per wijziging/voorstel** toont de Briefing altijd, niet optioneel (operationalisatie van BR-700/703, ADR-012 § 6):

- **wat** is gewijzigd
- **waarom** dit is gewijzigd
- **welke business rules** zijn toegepast
- **wat het verwachte voordeel** is
- **welke impact** dit heeft op de planning (geraakte beurten/medewerkers)

**Voorbeelden** (illustratief, exacte copy is UI-uitwerking):
- *"Route Noord aangepast wegens regen."*
- *"Medewerker Jan toegevoegd vanwege ziekte van collega."*
- *"Route Zuid bespaart 18 minuten reistijd."*
- *"Twee klanten verplaatst binnen het flexvenster."*

**Acties vanuit de Morning Briefing:**

- Alle voorstellen in één keer accepteren.
- Voorstellen individueel accepteren.
- Een voorstel aanpassen (opent de betreffende route/beurt in de planner met het voorstel als uitgangspunt, geen los bewerkscherm).
- Een voorstel afwijzen.
- Direct doorklikken naar de planner (`/planning`, Sprint 4 Frontend) voor wie liever zelf verder plant.

**Pas na goedkeuring worden wijzigingen definitief uitgevoerd** (BR-702, § 4 hieronder) — de Briefing zelf voert nooit iets uit, hij is uitsluitend het review-startpunt.

De Morning Briefing is **samengesteld vóórdat de gebruiker inlogt** (§ 6, Event Flow) — geen los "laad nu alles"-scherm, maar direct beschikbaar. Dit ADR legt vast **dát** het bestaat, **dat** het het primaire startscherm is, en **wat** erin zit; de pixelindeling is UI-scope voor `28_Dashboard.md`/latere Sprint 7-uitwerking.

### 2. Agent-architectuur (overzicht — volledige per-agent-uitwerking in `43_AI_Agents.md`)

```
                    Gebruiker
                        ↑
                Morning Briefing
                        ↑
              Agent Orchestrator
        ┌───────┬───────┼───────┬────────┬─────────┬────────┬──────────────┐
        ↓       ↓       ↓       ↓        ↓         ↓        ↓              ↓
    Planning  Replan  Weather Communi-  Invoice  Capacity  Revenue   Optimization
     Agent    Agent    Agent   cation    Agent    Agent     Agent       Agent
                               Agent
```

De **Agent Orchestrator** (§ 3) is geen nieuwe centrale runtime maar een **coördinatiepatroon** bovenop de bestaande cron/Edge-Function-infrastructuur (ADR-008): een geplande cron-taak (§ 5, Event Flow) roept de agents in vaste volgorde aan, elke agent schrijft zijn resultaat weg (voorstellen, waarschuwingen, `jobs.status`-wijzigingen als concept) en publiceert een event dat de volgende agent (of de Morning Briefing-samensteller) consumeert.

Agents werken **nooit rechtstreeks op elkaars domein** — de Optimization Agent roept bijvoorbeeld niet de Communication Agent aan; de Orchestrator regisseert de volgorde en geeft output van de ene agent door als input aan de volgende, exact zoals de bestaande dag-laag (ADR-010 § "Gekozen oplossing") de routing-engine aanroept zonder zelf routing-logica te bevatten.

### 3. Agent Orchestrator — verantwoordelijkheden

- **Taakverdeling:** elke agent heeft één domein (§ 2/`43_AI_Agents.md`); de Orchestrator kent geen domeinlogica zelf, alleen volgorde en doorgifte.
- **Prioriteiten:** harde-regel-verstoringen (ziekmelding, BR-802) krijgen voorrang boven optimalisatie-verfijning (bv. clustering) — consistent met de bestaande prioritering in `15_AIPlanner.md` § 7.1.
- **Event-driven afhandeling:** naast de dagelijkse cron-cyclus (§ 5) kan een user-actie (klant zegt af, medewerker meldt zich ziek) een tussentijdse, gerichte agent-aanroep triggeren (bv. alleen Replanning Agent, niet de volledige keten) — hetzelfde patroon als de bestaande `route-move-job` (herberekent alléén de betrokken route(s), niet de hele week, 14_RoutingEngine.md § 6.1).
- **Retries:** een gefaalde agent-stap (bv. Weather Agent kan de externe API niet bereiken) blokkeert de rest van de keten niet — de Orchestrator slaat de stap over met een gelogde waarschuwing (analoog aan het bestaande AP-04-gedrag in `15_AIPlanner.md` § 11: "weerdata tijdelijk niet beschikbaar, planning gaat door").
- **Logging:** elke agent-aanroep (start, eind, resultaat-samenvatting) wordt gelogd volgens het bestaande `41_CodingStandards.md` § 11-patroon (correlatie-id door de hele keten, nooit PII in logregels).
- **Audittrail:** zie § 4 (Confidence & Explainability) — elke voorgestelde/uitgevoerde actie is achteraf herleidbaar naar welke agent, welke input, welke business rules en welke score tot de beslissing leidden.
- **Conflictresolutie:** als twee agents tegenstrijdige voorstellen genereren voor dezelfde beurt (bv. Weather Agent wil verplaatsen naar donderdag, Capacity Agent signaleert dat donderdag al vol is), wint de agent met de **hardere regel** (harde BR's, ADR-010 § "hard/soft"-onderscheid) — bij twee zachte voorstellen krijgt de gebruiker beide te zien in de Morning Briefing met een expliciete "conflicterend voorstel"-markering, nooit een stille auto-keuze.
- **Human approval:** zie § 3 hieronder (apart uitgewerkt, is de kern van dit ADR).

### 4. Human Approval — de harde grens

**Nooit zonder expliciete menselijke goedkeuring** (tenzij een bedrijf zelf, per BR-720-precedent uit `15_AIPlanner.md` § 8 "Volautomatisch"-niveau, uitdrukkelijk opt-in heeft gegeven voor een specifieke, laag-risico actieklasse):

- Facturen versturen
- Betalingen uitvoeren
- Prijsafspraken wijzigen
- Klanten verwijderen
- Medewerkers verwijderen
- Definitieve planningen overschrijven

**Mag AI wél zelfstandig, zonder per-actie-goedkeuring:**

- Voorstellen maken (planning, herplanning, weer-gedreven aanpassingen)
- Analyses uitvoeren (capaciteit, omzet, patronen)
- Routes optimaliseren (routevolgorde binnen een reeds toegewezen route — geen wijziging van *welke* beurten aan *welke* medewerker/dag hangen zonder voorstel)
- Conceptberichten voorbereiden (nog niet verzonden)
- Conceptfacturen maken (nog niet gefinaliseerd/verstuurd)
- Waarschuwingen genereren

Dit is een **verscherping** van het bestaande automatiseringsniveau-model (`15_AIPlanner.md` § 8: Voorstel/Semi-automatisch/Volautomatisch) tot een expliciete, harde whitelist/blacklist — de zes "nooit"-acties hierboven zijn ook op het "Volautomatisch"-niveau nog steeds **niet** automatiseerbaar; dat niveau gaat over routine-herplanningen (bv. een niet-thuis-beurt automatisch doorschuiven), nooit over de zes genoemde acties. Dit wordt vastgelegd als een nieuwe **harde business rule** (BR-702, zie `10_BusinessRules.md`-wijziging hieronder).

### 5. Confidence & Explainability

Iedere AI-beslissing (elk voorstel, elke waarschuwing, elke conceptactie) draagt, in aanvulling op het bestaande reden-object (BR-700, `15_AIPlanner.md` § 9):

- **Confidence score** (0–100): hoe zeker de agent is van dit voorstel, geen momentopname-getal maar afgeleid van dezelfde scoringslogica als `15_AIPlanner.md` § 4 (hoge afwijking t.o.v. ideale datum + veel harde-regel-nabijheid → lagere confidence).
- **Gebruikte bronnen:** welke data is geraadpleegd (bv. "weerdata KNMI, opgehaald 06:03", "historische reistijd-cache, laatst bijgewerkt gisteren").
- **Gebruikte business rules:** welke BR's/FR's het voorstel vormgaven (bv. BR-202, BR-204).
- **Waarom deze keuze:** mens-leesbare toelichting, zelfde principe/patroon als het bestaande "Waarom?"-mechanisme (BR-700, `WhyExplanation`-component, 26_ComponentLibrary.md § 4) — dit ADR breidt dat component conceptueel uit van "één beurt" naar "elke agent-beslissing", geen nieuw toelichtingsmechanisme.
- **Overwogen alternatieven:** welke andere opties zijn afgewogen en waarom niet gekozen (nieuw t.o.v. het bestaande BR-700, dat alleen de gekozen optie toelicht) — dit wordt vastgelegd als nieuwe **harde business rule** (BR-703, zie hieronder).

Dit is expliciet **geen black-box ML-systeem**: net als de bestaande AI Planner (ADR-010, "Alternatieven"-tabel: "Volledig automatische black-box (ML-first) planner" is daar al afgewezen) blijven de agents op heuristieken/scoringsmodellen/regels gebaseerd, reproduceerbaar en overschrijfbaar — consistent met `15_AIPlanner.md` § 10's grens ("altijd transparant en overschrijfbaar, nooit een ondoorzichtig model").

### 6. Event Flow (dagelijkse cyclus)

```
00:00–06:00  Nachtelijk venster (laagste systeembelasting, cron-gespreid per tenant — 38_Schaalbaarheid.md § 3)
      ↓
Planning Agent        — vertaalt dienstafspraken naar voorgestelde/bijgewerkte beurten (horizon-laag, ADR-010)
      ↓
Weather Agent         — controleert forecast, markeert weersgevoelige beurten (15 § 6)
      ↓
Optimization Agent    — routevolgorde per medewerker/dag (routing-engine, 14_RoutingEngine.md — ongewijzigd)
      ↓
Capacity Agent        — signaleert over-/ondercapaciteit, stelt herverdeling voor
      ↓
Communication Agent   — bereidt conceptberichten voor (nog niet verzonden — § 4 "Human Approval")
      ↓
Morning Briefing opgebouwd (samenvatting van alle bovenstaande output)
      ↓
Gebruiker opent RouteFlow (komt direct op de Morning Briefing terecht, § 1)
      ↓
Morning Briefing bekijken (elk voorstel met wat/waarom/regels/voordeel/impact + confidence, § 1/§ 4/§ 5)
      ↓
Voorstellen accepteren (alles of individueel) / aanpassen / afwijzen  ← mens beslist, altijd
      ↓
Planning definitief
      ↓
Uitvoering (route-move-job/route-optimize zoals nu al, geen wijziging aan die Edge Functions)
```

Buiten dit venster genereert een **user-actie tijdens de dag** (ziekmelding, klant belt af) een gerichte tussentijdse Replanning Agent-aanroep — de dagelijkse cyclus hierboven is het ritme, geen exclusieve trigger.

### 7. Architectuur-integratie (expliciet: geen nieuwe infrastructuur)

- Agents = Edge Functions (ADR-008), genaamd volgens het bestaande `41_CodingStandards.md` § 3-patroon (kebab-case, werkwoord-eerst waar toepasselijk, bv. `agent-planning`, `agent-replanning`, `agent-weather` — exacte namen zijn implementatiedetail voor `43_AI_Agents.md`/sprint-uitwerking, niet architectuur).
- Externe diensten (weer, WhatsApp, Mollie) uitsluitend via bestaande providers (ADR-005/006/007) — geen agent krijgt een eigen, parallelle integratie.
- Orkestratie via bestaande cron-mechanismen (ADR-008, pg_cron) + het bestaande event/diff-patroon (ADR-010 § 3 reactieve laag) als "Event Bus" — een gelogde rij per agent-run/event (§ 3, ADR-012 § 1), geen aparte message-broker-infrastructuur, geen nieuw "agent framework"-pakket.
- RLS-multitenancy (ADR-003/004) blijft ongewijzigd de autorisatiegrens: elke agent-Edge-Function werkt binnen de tenant-context van de company die hij verwerkt, exact zoals `route-optimize`/`route-move-job` nu al doen.
- Confidence/reden/alternatieven-data wordt opgeslagen analoog aan het bestaande BR-700-mechanisme (`020_planning_reasons.sql`, gepland in Sprint 7, `40_Implementatieplan.md`) — geen nieuw opslagparadigma, wel mogelijk uitgebreide kolommen/velden (implementatiedetail voor de sprint die dit bouwt, niet dit ADR).

## Alternatieven

| Alternatief | Waarom niet |
|---|---|
| **Eén monolithische "SuperAgent" die alle domeinen bedient** | Herhaalt het probleem dat ADR-010 al oploste voor routeplanning alleen (onbeheersbaar, moeilijk uitlegbaar) — nu op een nog groter schaal over acht domeinen; onmogelijk onafhankelijk te testen/deployen per domein |
| **Losse, ongecoördineerde AI-features per module (facturatie-AI, planning-AI, los van elkaar)** | Geen samenhangend dagbeeld voor de gebruiker (acht losse meldingen i.p.v. één Morning Briefing); geen gedeeld Human Approval-model, risico op inconsistente autonomiegrenzen per module |
| **Volledig autonome uitvoering met achteraf-notificatie ("AI deed dit, hier is het log")** | Strijdig met PRD § 8.5 en het bestaande diff-voorstel-patroon (ADR-010); verhoogt risico op onomkeerbare fouten (verkeerd verstuurde factuur, verwijderde klant) zonder voorafgaande controle |
| **Extern "agent framework" (bv. LangGraph/AutoGPT-achtige oplossing) als aparte laag** | Introduceert een nieuwe runtime/afhankelijkheid naast Supabase Edge Functions, breekt met ADR-008's "één samenhangend backend-platform"-keuze zonder aantoonbare meerwaarde t.o.v. het bestaande cron/event-patroon |

## Consequenties

**Positief**
- **Minder handmatig plannen:** de gebruiker beoordeelt voorstellen i.p.v. vanaf nul te plannen — rechtstreekse voortzetting van PRD § 8.1's kernbelofte, nu over acht domeinen i.p.v. alleen routing.
- **Hogere kwaliteit:** gespecialiseerde agents per domein (i.p.v. één generieke laag) kunnen dieper op hun eigen domein geoptimaliseerd worden.
- **Reproduceerbare beslissingen:** confidence/bronnen/regels/alternatieven per beslissing (§ 5) maakt elk voorstel achteraf navolgbaar — geen "waarom deed het systeem dit"-mysteries.
- **Volledige audittrail:** iedere agent-actie gelogd (§ 3), consistent met het bestaande `41_CodingStandards.md` § 11-logbeleid.
- **Explainable AI:** uitbreiding van het al-bestaande BR-700/`WhyExplanation`-mechanisme, geen nieuw concept — lage introductie-drempel voor gebruikers die het bestaande "Waarom?"-patroon al kennen.
- **Schaalbaarheid:** elke agent is een onafhankelijk deploybare/testbare Edge Function; nieuwe agents (§ Toekomstige Agents, `43_AI_Agents.md` § 15) sluiten aan zonder de Orchestrator-architectuur te wijzigen.
- **Gebruiker blijft altijd in control:** de zes Human-Approval-acties (§ 4) zijn een harde, niet-per-bedrijf-uitschakelbare grens (in tegenstelling tot de bestaande automatiseringsniveaus, die wél per bedrijf instelbaar zijn binnen de niet-verboden actieruimte).

**Negatief / risico's**
- Acht agents betekent meer coördinatie-oppervlak dan de bestaande drie AI-Planner-lagen (ADR-010) — meer stappen die kunnen falen, meer volgorde-afhankelijkheden.
- Conflicterende voorstellen tussen agents (§ 3, conflictresolutie) zijn een nieuwe klasse UX-probleem die de bestaande enkelvoudige-diff-UX (`15_AIPlanner.md` § 7.2) niet dekt.
- Morning Briefing die "leeg" of weinig informatief aanvoelt bij een rustige dag kan het vertrouwen in het systeem juist ondermijnen ("doet de AI wel iets?") — vraagt zorgvuldige lege-staat-copy (consistent met `24_UI_UX.md` § 4's bestaande principe: nooit een kale lege staat).

**Mitigaties**
- Orchestrator-volgorde en retry-gedrag (§ 3) is expliciet gespecificeerd hier, niet impliciet per agent verschillend geïmplementeerd.
- Conflictresolutie-regel (§ 3: harde regel wint, anders beide tonen) voorkomt stille willekeur.
- Morning Briefing-lege-staat-copy is scope voor de UI-uitwerking (Sprint 7+, `43_AI_Agents.md`/toekomstig Dashboard-werk), maar het principe ("nooit kaal") is hier al vastgelegd zodat de latere UI-bouw er niet omheen kan ontwerpen.

## Waarom deze keuze toekomstbestendig is

Door agents te beperken tot **Edge Functions + Provider Pattern + het bestaande diff/event-model** (ADR-007/008/010), in plaats van een apart "agent-platform" te introduceren, blijft elke toekomstige uitbreiding (§ Toekomstige Agents, `43_AI_Agents.md` § 15: Voice, Sales, CRM, Inventory, Maintenance, Forecast) een **incrementele toevoeging** aan een al bestaand patroon, geen architectuurbreuk. De Human Approval-grens (§ 4) is bewust **niet** een technische beperking maar een expliciete productbeslissing, vastgelegd op ADR-niveau zodat een toekomstige engineer die "gewoon even" automatisch-facturen-versturen wil toevoegen, eerst tegen dit document aan moet — precies zoals `41_CodingStandards.md`'s eigen governance-regel voorschrijft (afwijken vereist een voorgestelde wijziging van het document, geen stille uitzondering). De confidence/explainability-eis (§ 5) legt vanaf het begin de datafundering die nodig is voor toekomstige verfijning (bv. `15_AIPlanner.md` § 10's "leren van correcties", V2) zonder dat een latere ML-uitbreiding het huidige, transparante model hoeft te vervangen.

## Referenties

- `00_PRD.md` § 8.1/§ 8.5, nieuw § 19 A-15
- ADR-010 (AI Planner drielagen-architectuur — blijft geldig, dit ADR generaliseert het patroon)
- `15_AIPlanner.md` (blijft de gedetailleerde uitwerking van Planning/Replanning/Weather-agent-logica)
- `43_AI_Agents.md` (nieuw, operationele uitwerking per agent: input/output/triggers voor alle acht)
- `10_BusinessRules.md` § 9 (BR-700/701 bestaand, BR-702/703 nieuw)
- `08_FunctioneleEisen.md` FR-serie 900+ (nieuw, FR-900 Morning Briefing)
- **ADR-012** (nieuw, AI Execution Pipeline — technische uitwerking van hoe de Orchestrator/agents uit dit ADR runtime samenwerken: volgorde, timeouts, retries, kosten, failure handling)
