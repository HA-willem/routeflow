# 43 — AI Agents

**Status:** DONE
**Versie:** 1.6
**Bron van waarheid:** `ADR-011` (Human-in-the-Loop AI — Agent-orchestratie & Morning Briefing) en `00_PRD.md` § 8. Dit document mag geen van beide tegenspreken; het is de **operationele uitwerking** van ADR-011 (analoog aan hoe `15_AIPlanner.md` de gedetailleerde uitwerking is van ADR-010).
**Werkinstructie:** zie `MASTER_PROMPT.md`.
**Relaties:** `docs/adr/ADR-011-human-in-the-loop-ai.md` (architectuurbeslissing), `docs/adr/ADR-012-ai-execution-pipeline.md` (technische runtime-mechaniek: orchestratie-volgorde, execution pipeline, agent-contract, kosten, failure handling — zie § 3), `45_AgentMemory.md` (Organizational Memory — hoe agents leren van historische beslissingen, zie § 7 hieronder), `docs/adr/ADR-010-ai-planner-architecture.md` (routing/replan-fundament), `15_AIPlanner.md` (horizon-/dag-/reactieve-laag-detail, blijft leidend voor Planning/Replanning/Weather-agent-logica), `14_RoutingEngine.md` (Optimization Agent), `16_Facturatie.md` (Invoice Agent), `19_WhatsApp.md` (Communication Agent), `21_Notificaties.md`, `10_BusinessRules.md` § 9 (BR-700–705), `08_FunctioneleEisen.md` FR-serie 900+, `40_Implementatieplan.md` (sprintplaatsing).

---

## Doel van dit document

RouteFlow is ontworpen als een **AI-first Operations Platform** voor servicebedrijven: AI Agents voeren het operationele denkwerk uit, de gebruiker beoordeelt en keurt goed (ADR-011). Dit document beschrijft **uitsluitend architectuur en verantwoordelijkheden** per agent — geen code, geen implementatiedetails die niet architectuurrelevant zijn. Voor de *waarom*-vraag (waarom meerdere agents, waarom deze Human-Approval-grens) zie ADR-011; dit document beantwoordt de *wat*-vraag per agent.

---

## 1. Visie

RouteFlow bestaat om servicebedrijven (glazenwassers, schoonmaakbedrijven, hovenierders — PRD § 3) te bevrijden van het dagelijkse, repetitieve plan- en coördinatiewerk. De kernbelofte (PRD § 8.1) is niet "software die planning *makkelijker* maakt" maar software die planning **grotendeels overneemt**, met de mens als eindredacteur.

**Waarom RouteFlow AI-first is:** elke handmatige planningsactie (een route samenstellen, een ziekmelding verwerken, een weerswaarschuwing beoordelen, een conceptfactuur checken) is in essentie een **patroon-herkennings- en afwegingstaak** — precies het soort werk dat gespecialiseerde, regelgedreven AI-agents kunnen automatiseren zonder de betrouwbaarheid te verliezen die een servicebedrijf nodig heeft (BR-200/201/202/203 zijn harde regels, geen suggesties). Door dit vanaf de architectuur consequent door te voeren — niet als losse "AI-features" toegevoegd aan een verder handmatig systeem — schaalt RouteFlow naar bedrijven met veel medewerkers/klanten zonder dat de planner-rol evenredig meegroeit.

**Waarom planners steeds meer supervisors worden:** naarmate het aantal agents en hun betrouwbaarheid groeit (`15_AIPlanner.md` § 8, automatiseringsniveaus), verschuift de planner-taak van *zelf plannen* naar *voorstellen beoordelen*. Dit is geen verlies van controle (§ 12, Human Approval blijft hard) maar een verschuiving van *uitvoerend* naar *toezichthoudend* werk — vergelijkbaar met hoe een piloot een autopilot superviseert in plaats van elke stuurbeweging zelf te maken, met een expliciete, niet-onderhandelbare grens rond welke acties nooit worden overgenomen (§ 12).

---

## 2. Agent-architectuur

```
                              Gebruiker
                                  ↑
                          Morning Briefing
                                  ↑
                        Agent Orchestrator
       ┌──────────┬──────────┬───────────┬──────────┬──────────┬──────────┬──────────────┐
       ↓          ↓          ↓           ↓          ↓          ↓          ↓              ↓
   Planning   Replanning  Weather   Communication  Invoice   Capacity   Revenue    Optimization
    Agent       Agent      Agent       Agent        Agent     Agent      Agent        Agent
```

Agents werken nooit rechtstreeks met elkaar — de Orchestrator regisseert volgorde en doorgifte van output naar input (ADR-011 § "Gekozen oplossing" punt 2/3). Elke agent is een Supabase Edge Function (ADR-008), praat met externe diensten uitsluitend via de bestaande Provider Adapter Pattern-interfaces (ADR-007: `RoutingProvider`, `WeatherProvider`, `MessagingProvider`, `PaymentProvider`), en werkt binnen de RLS-tenantgrens van de company die hij verwerkt (ADR-003/004) — geen van deze mechanismen is nieuw t.o.v. de bestaande architectuur.

**Samenwerking via events:** de dagelijkse cyclus (ADR-011 § "Event Flow") is de primaire orkestratie; een user-actie tijdens de dag (ziekmelding, annulering) triggert een gerichte, op zichzelf staande agent-aanroep buiten die cyclus om — hetzelfde patroon als de bestaande `route-move-job` die alléén de betrokken route herberekent (14_RoutingEngine.md § 6.1), niet de hele keten opnieuw doorloopt.

---

## 3. Agent Orchestrator

Zie ADR-011 § "Gekozen oplossing" punt 3 voor de volledige onderbouwing, en **ADR-012** voor de volledige technische uitwerking (dependency graph, parallel-vs-sequentieel per agent, per-agent timeout/retry/cache-contract, cost management, drie graceful-degradation-niveaus, en het Mermaid sequence diagram van de volledige pipeline). Samengevat, operationeel:

| Aspect | Gedrag |
|---|---|
| Taakverdeling | Eén domein per agent (§ 4–11); Orchestrator bevat zelf geen domeinlogica |
| Prioriteiten | Harde-regel-verstoringen (ziekmelding, BR-802) vóór optimalisatie-verfijning |
| Event-driven afhandeling | Dagelijkse cron-cyclus + tussentijdse gerichte triggers bij user-acties |
| Retries | Gefaalde stap wordt overgeslagen (gelogde waarschuwing), blokkeert de rest van de keten niet (analoog AP-04, `15_AIPlanner.md` § 11) |
| Logging | Elke agent-aanroep: start + eind + resultaat-samenvatting, correlatie-id door de hele keten (`41_CodingStandards.md` § 11) |
| Audittrail | § 14 |
| Conflictresolutie | Hardere regel wint; twee zachte voorstellen worden beide getoond met een "conflicterend"-markering, nooit stil gekozen |
| Human approval | § 12 (harde grens, niet-onderhandelbaar per agent) |

Vanaf `45_AgentMemory.md` krijgt elke agent hieronder ook een extra, optionele input: relevante geleerde voorkeuren (Organizational Memory) voor de scope die hij verwerkt — zie `45_AgentMemory.md` § 7 voor precies wat elke agent leert en gebruikt. Dit is een uitbreiding van de bestaande input (tabel hieronder per agent), geen wijziging aan de kernverantwoordelijkheid.

---

## 3a. Implementatiestatus (Sprint 7, PRD § 19 A-22)

Dit document beschrijft de doelarchitectuur voor alle acht agents; onderstaande tabel houdt bij welke daadwerkelijk gebouwd zijn (`40_Implementatieplan.md`). Geen van de secties § 4–11 hieronder is met deze aantekening inhoudelijk gewijzigd — een "nog niet gebouwd"-agent is architecturaal al volledig vastgelegd, alleen nog niet geïmplementeerd.

| Agent | Status | Sprint |
|---|---|---|
| Capacity Agent (§ 9) | ✅ Gebouwd | 7 |
| Optimization Agent (§ 11) | ✅ Gebouwd (formalisering van bestaande Sprint 4-Edge-Functions) | 7 |
| Weather Agent (§ 6) | ✅ Gebouwd (informatief — het herplan-voorstel-deel gebruikt nu de Replanning Agent) | 7 |
| Replanning Agent (§ 5) | ✅ Gebouwd (Sprint 7-vervolg, scope: ziekmelding/verlof één medewerker één dag — spoedopdracht/niet-thuis/weersgedreven volgen later dezelfde vorm) | 7-vervolg |
| Planning Agent (§ 4) | ✅ Gebouwd (Sprint 7-vervolg, formaliseert de bestaande horizon-laag/`planning-generate` uit Sprint 3 — geen nieuwe datumlogica, alleen de informatieve Briefing-samenvatting + orchestrator-koppeling) | 7-vervolg |
| Communication Agent (§ 7) | ⏳ Wacht op de WhatsApp/360dialog-adapter (Sprint 8) | 8 (gepland) |
| Invoice Agent (§ 8) | ✅ Gebouwd (Sprint 7-vervolg, uitsluitend signalering — conceptfactuur-aanmaak was al `complete_job()`, Sprint 5) | 7-vervolg |
| Revenue Agent (§ 10) | ⏳ Nog niet gebouwd | Nog niet gepland |

---

## 4. Planning Agent

**Verantwoordelijkheid:** vertaalt actieve dienstafspraken naar voorgestelde beurten en verdeelt weekbeurten over dagen/medewerkers — de operationele uitvoering van de horizon- en (het toewijzingsdeel van de) dag-laag uit `15_AIPlanner.md` § 1.1/§ 1.2, nu als losstaande, herbruikbare agent i.p.v. inline logica.

| | |
|---|---|
| **Input** | Actieve dienstafspraken (frequentie, laatste uitvoering, flexvenster, klantvoorkeuren — `12_Entiteiten.md` § service_agreements), medewerker-beschikbaarheid (`availability`), depotlocatie, prijsafspraken (voor prioritering bij capaciteitsconflicten — welke beurt weegt zwaarder bij een schaarse dag) |
| **Output** | `jobs` met status `voorgesteld`, geclusterd per week (12 weken vooruit, `15_AIPlanner.md` § 1.1), plus een voorlopige medewerker-toewijzing per dag |
| **Business rules** | BR-001 (ideale datum), BR-101 (flexvenster, soft), BR-102 (geen gaten), BR-103 (maandpatronen), BR-201 (beschikbaarheid absoluut), BR-202 (max. werkdag), BR-204 (geografische clustering, soft), BR-205 (klant-dagdeelvoorkeur) |
| **Confidence score** | Hoog bij ideale-datum-match binnen flexvenster + succesvolle clustering; lager naarmate de voorgestelde datum verder van het ideaal afwijkt of capaciteit krap is (§ 13) |
| **Why explanation** | Bestaand mechanisme (BR-700, `15_AIPlanner.md` § 9) — ongewijzigd, nu als output van deze specifieke agent i.p.v. "de AI Planner" in het algemeen |
| **Triggers** | Dagelijkse cyclus (00:00–06:00, ADR-011 § "Event Flow"); direct na het aanmaken/wijzigen van een dienstafspraak (nieuwe klant, nieuwe frequentie) |

**Implementatienotitie (Sprint 7-vervolg):** "medewerker-toewijzing per dag" (Output-rij hierboven) is bij de daadwerkelijke bouw bewust **niet** in deze agent geïmplementeerd — dat is al de verantwoordelijkheid van de Optimization Agent (§ 11, dag-laag-volgordebepaling), en zou hier dupliceren wat die agent al doet (zelfde motivatie als § 11's eigen "voegt geen nieuwe optimalisatielogica toe"). De gebouwde Planning Agent beperkt zich tot het horizon-laag-deel: `jobs` met status `voorgesteld` aanmaken (hergebruikt de bestaande `planning-generate`-Edge-Function/`lib/planning/horizon.ts`, Sprint 3, ongewijzigde datumlogica) en een informatieve Briefing-samenvatting (geen `payload`, zelfde rol als Capacity/Weather Agent — het aanmaken van `voorgesteld`-beurten is zelf al de door ADR-011 § 4 toegestane autonome actie, geen aparte goedkeuring nodig).

---

## 5. Replanning Agent

**Verantwoordelijkheid:** reageert op verstoringen (ziekte, spoed, weersverandering, voertuigproblemen, klant annuleert) met een herplan-**voorstel** — nooit een stille mutatie (PRD § 8.5, ADR-010 § "reactieve laag"). Dit is de bestaande reactieve laag (`15_AIPlanner.md` § 1.3/§ 7), hier als losstaande agent benoemd.

| | |
|---|---|
| **Triggers** | Ziekmelding/verlof medewerker (BR-802), spoedopdracht (nieuwe hoge-prioriteit beurt tussendoor), weersverandering (via Weather Agent-output, § 6), voertuigprobleem (medewerker tijdelijk niet inzetbaar, zelfde pad als ziekmelding), klant annuleert (BR-803) |
| **Input** | Getroffen beurten/route(s), resterende capaciteit die dag (medewerkers, tijdvensters), flexvensters van de getroffen dienstafspraken |
| **Output** | Een **diff-voorstel** (`15_AIPlanner.md` § 7.2-formaat: beurt · van → naar · extra reistijd, of → wachtrij als onplaatsbaar) — nooit een directe schrijfactie naar `jobs`/`routes` zonder goedkeuring (§ 12) |
| **Business rules** | BR-200 (vergrendelde beurten blijven fixed), BR-201, BR-202, stabiliteitsgewicht bij herplannen (`15_AIPlanner.md` § 7.3: zo min mogelijk reeds-bevestigde beurten verstoren, ook ten koste van reistijd-optimaliteit) |
| **Confidence score** | Lager naarmate meer beurten geraakt worden of geen enkele dag binnen het flexvenster past (AP-01, `15_AIPlanner.md` § 11) |

---

## 6. Weather Agent

**Verantwoordelijkheid:** controleert de weersverwachting tegen weersgevoelige diensten en genereert automatisch advies (herplanvoorstel via de Replanning Agent) bij drempeloverschrijding. Operationele agent-vorm van `15_AIPlanner.md` § 6.

| | |
|---|---|
| **Input** | 10-dagen-forecast (Open-Meteo/KNMI via `WeatherProvider`, ADR-007), `services.is_weather_sensitive` + `weather_sensitivity_type` (12 § 5), bedrijf-instelbare drempels |
| **Output** | Waarschuwing + (via Replanning Agent) herplanvoorstel voor getroffen beurten; bij API-onbereikbaarheid: gelogde waarschuwing, geen blokkade van de rest van de keten (AP-04) |
| **Business rules** | Drempeltabel `15_AIPlanner.md` § 6.3 (regen ≥70%/≥2mm/u, vorst <0°C, wind ≥8 Bft) — bron van waarheid blijft dat document, dit document dupliceert de getallen niet |
| **Triggers** | Dagelijkse cyclus, ná Planning Agent (moet weten wélke beurten die dag/week gepland zijn) en vóór Optimization Agent (een verplaatste beurt moet nog geoptimaliseerd worden op de nieuwe dag) |

---

## 7. Communication Agent

**Verantwoordelijkheid:** bereidt klant- en medewerkercommunicatie voor (WhatsApp/e-mail) — herinneringen, afspraakwijzigingen, planningupdates — als **concept**, nooit automatisch verzonden zonder de bestaande, al-geaccepteerde uitzonderingen (§ 12: reeds-geconfigureerde automatische "morgen"-berichten, FR-080, zijn een bestaand, expliciet geconfigureerd geval — geen nieuwe autonomie).

| | |
|---|---|
| **Input** | Geplande/hergeplande beurten, bericht-templates (19_WhatsApp.md § template-variabelen), klant-opt-in-status (BR-600/601) |
| **Output** | Conceptberichten (WhatsApp/e-mail), klaar voor verzending na goedkeuring of via het bestaande, al-geconfigureerde automatische pad (FR-080/FR-081) |
| **Business rules** | BR-600 (opt-in vereist), BR-601 (opt-out gerespecteerd), BR-602 (template-variabele-validatie) |
| **Triggers** | Na een herplan-acceptatie (§ 5), dagelijkse cyclus (voorbereiding "morgen"-berichten), of direct na een Replanning Agent-voorstel dat al is goedgekeurd |

---

## 8. Invoice Agent

**Verantwoordelijkheid:** controleert uitgevoerde werkzaamheden en stelt conceptfacturen op — nooit finaliseert of verstuurt zelfstandig (§ 12: "facturen versturen" is een harde Human-Approval-grens).

| | |
|---|---|
| **Input** | Voltooide beurten (`jobs.status = uitgevoerd`), geldende prijsafspraken (klant-/dienstafspraak-/dienstniveau — prioriteit Job > Klant > Dienstafspraak > Dienst, `18_Prijsafspraken.md`), abonnementsstatus, BTW-tarief per dienst |
| **Output** | Conceptfactuur (`16_Facturatie.md`-formaat), inclusief betaalherinneringen-planning als voorstel |
| **Business rules** | BR-302 (concept → definitief, blijft een expliciete menselijke stap), BR-303 (BTW correct per dienst), BR-304 (abonnement dekt inbegrepen beurten), BR-401/402 (herinneringsplanning) |
| **Triggers** | Na voltooiing van een beurt (directe conceptfactuur-suggestie bij per-job-facturatie), of periodiek (abonnementsfacturatie-cyclus, dagelijkse cyclus) |

**Implementatienotitie (Sprint 7-vervolg):** het aanmaken van de conceptfactuur zelf (Output-rij hierboven) bleek bij de bouw al **volledig geïmplementeerd** — `complete_job()` (020_job_completion.sql, Sprint 5) maakt synchroon een conceptfactuur + factuurregel aan zodra een beurt wordt afgerond, inclusief prijsresolutie (per_job/hourly/dienst-fallback) en BTW-berekening. Er was dus geen aparte "conceptfactuur aanmaken"-stap meer te bouwen. De gebouwde Invoice Agent doet in plaats daarvan uitsluitend **signalering**: welke conceptfacturen (`status = 'draft'`) al een tijd wachten op verzending, als persistente Briefing-waarschuwing (zelfde rol als Capacity Agent — blijft zichtbaar tot de mens 'm oplost, geen eenmalige melding). Abonnementsfacturatie-cyclus (periodieke batch-facturatie) en betaalherinneringen-planning zijn geen Sprint 7-vervolg-scope — blijven "nog te bouwen".

---

## 9. Capacity Agent

**Verantwoordelijkheid:** voorspelt capaciteitsknelpunten (piekbelasting, personeelstekort) en adviseert — geen uitvoerende bevoegdheid, uitsluitend signalering + advies dat in de Morning Briefing landt.

| | |
|---|---|
| **Input** | Geplande beurten (huidige + horizon), medewerker-beschikbaarheid (incl. geplande verlof/ziekte), gemiddelde beurtduur per dienst |
| **Output** | Capaciteitswaarschuwing (FR-027) met advies (welke beurten te verplaatsen, of wanneer een extra medewerker nodig is) — signalering, geen automatische herverdeling zonder dat de Replanning Agent (§ 5) daarna een expliciet diff-voorstel maakt |
| **Business rules** | Geen eigen harde regels; leunt op dezelfde BR-201/202 als Planning/Replanning Agent voor wat "vol" betekent |
| **Triggers** | Dagelijkse cyclus, na Planning Agent (moet de voorgestelde week kennen) |

---

## 10. Revenue Agent

**Verantwoordelijkheid:** analyseert winstgevendheid — reistijd-tot-omzet-verhouding, marge per klant/route, signaleert verlieslatende routes. Zuiver analytisch, geen enkele schrijfactie op planning/facturatie-data.

| | |
|---|---|
| **Input** | Voltooide/geplande beurten, prijsafspraken, gerealiseerde reistijd/afstand (14_RoutingEngine.md-output), personeelskosten (indien beschikbaar in bedrijfsinstellingen) |
| **Output** | Omzetprognose (Morning Briefing), marge-analyse per klant/route, waarschuwing bij structureel verlieslatende routes (hoge reistijd t.o.v. lage beurtwaarde) |
| **Business rules** | Geen eigen BR's — zuiver rapportage/analyse, geen mutaties |
| **Triggers** | Dagelijkse cyclus, of op aanvraag (Rapportage-scherm, 28_Dashboard.md-verwant) |

---

## 11. Optimization Agent

**Verantwoordelijkheid:** routeverbeteringen binnen een reeds toegewezen dagroute — de operationele agent-vorm van de bestaande **routing-engine** (`14_RoutingEngine.md`, ongewijzigd) en dag-laag-volgordebepaling (`15_AIPlanner.md` § 1.2 stap 3). Deze agent voegt geen nieuwe optimalisatielogica toe t.o.v. de bestaande, al-gedeployde `route-optimize`/`route-move-job` Edge Functions — hij is de architecturale naam voor wat die functies al doen binnen deze bredere agent-indeling.

| | |
|---|---|
| **Input** | Toegewezen beurten per medewerker/dag, afstandsmatrix (`lib/routing/matrix.ts`, met cache), vergrendelde stops (BR-200) |
| **Output** | Volgorde + tijden per stop (`RouteStopOutput`, 14 § 4.4), onplaatsbare beurten → wachtrij |
| **Business rules** | BR-200 (vergrendeld blijft fixed), BR-202 (werkdaglimiet), clustering (BR-204, soft) |
| **Triggers** | Na Planning Agent en Weather Agent in de dagelijkse cyclus; direct bij een drag-and-drop-actie (`route-move-job`, bestaand) |

---

## 12. Human Approval

De harde, niet per-bedrijf-uitschakelbare grens (ADR-011 § "Human Approval", hier herhaald als operationele checklist per agent). **ADR-012 § 7** specificeert de exacte, technische beslisboom (BR-702-check → automatiseringsniveau → confidence-drempel) die de Approval Handler hierop toepast per kandidaat-wijziging.

**AI mag NOOIT zonder expliciete goedkeuring:**

| Actie | Betrokken agent(s) |
|---|---|
| Facturen versturen | Invoice Agent |
| Prijsafspraken wijzigen | (geen agent heeft hiertoe schrijftoegang — prijsafspraken zijn uitsluitend een menselijke Instellingen-actie) |
| Betalingen uitvoeren | (geen agent — betalingen lopen uitsluitend via Mollie-webhook-bevestiging van een door de klant zelf geïnitieerde betaling, nooit AI-geïnitieerd) |
| Klanten verwijderen | (geen agent heeft hiertoe schrijftoegang) |
| Medewerkers verwijderen | (geen agent heeft hiertoe schrijftoegang) |
| Definitieve planningen overschrijven | Planning Agent, Replanning Agent, Optimization Agent — allen leveren voorstellen, geen directe schrijfactie op een reeds bevestigde route zonder acceptatie |

**AI mag wél zelfstandig:**

| Actie | Betrokken agent(s) |
|---|---|
| Voorstellen maken | Planning, Replanning, Weather, Capacity |
| Analyses uitvoeren | Capacity, Revenue |
| Routes optimaliseren (binnen een toegewezen route) | Optimization |
| Conceptberichten voorbereiden | Communication |
| Conceptfacturen maken | Invoice |
| Waarschuwingen genereren | Weather, Capacity, Revenue |

Dit wordt gehandhaafd als harde business rule **BR-702** (zie `10_BusinessRules.md`-wijziging).

---

## 13. AI Confidence Score

Elke agent-output (voorstel, waarschuwing, conceptactie) bevat (ADR-011 § "Confidence & Explainability", hier als verplicht outputcontract per agent). **ADR-012 § 3/§ 6** pint het technische schema: confidence is intern een 0–1 float; deze en andere weergaven (bv. hier, BR-703) tonen 0–100 als leesbaarheidsconventie (`score × 100`) — geen tweede bron van waarheid.

- **Confidence** (0–100)
- **Waarom** (mens-leesbare toelichting, bestaand BR-700-mechanisme)
- **Gebruikte data** (bronnen: welke tabellen/externe API's, met tijdstip van ophalen bij externe bronnen zoals weer)
- **Alternatieven** (welke andere opties overwogen zijn en waarom niet gekozen — nieuw t.o.v. bestaand BR-700, vastgelegd als **BR-703**)

Dit contract geldt voor **alle acht agents** gelijk — geen agent mag een voorstel doen zonder deze vier velden. Handhaving is architectuur-niveau (ADR-011), niet optioneel per agent-implementatie.

---

## 14. Logging & Audit

- **Iedere agent-actie wordt gelogd**: start, eind, resultaat-samenvatting (aantal voorstellen/waarschuwingen gegenereerd), consistent met het bestaande cron-/Edge-Function-logbeleid (`41_CodingStandards.md` § 11, NFR-703).
- **Beslissingen zijn reproduceerbaar**: confidence/bronnen/regels/alternatieven (§ 13) worden persistent opgeslagen (niet alleen getoond en weggegooid) zodat een support-vraag ("waarom stelde de AI dit voor op 14/7?") achteraf te beantwoorden is zonder de agent opnieuw te hoeven draaien.
- **Volledige audittrail**: elke uiteindelijk uitgevoerde actie (na menselijke goedkeuring, § 12) is te herleiden naar welke agent het voorstel deed, met welke confidence, en wie het goedkeurde — zelfde correlatie-id-principe als de rest van de backend (`41_CodingStandards.md` § 11: "één gebeurtenis in de logs te herleiden").
- **Nooit PII in logregels** (bestaande regel, `41_CodingStandards.md` § 11) — agent-logs verwijzen naar record-ID's, niet naar klantnamen/adressen/bedragen.

---

## 15. Toekomstige Agents (Roadmap)

Buiten scope van de huidige acht, gereserveerd voor latere sprints (niet gepland, geen commitment — ruimte voor toekomstige uitbreiding zonder architectuurwijziging, ADR-011 § "Waarom toekomstbestendig"):

- **Voice Agent** — telefonische klantinteractie (bevestigen/verzetten van afspraken via spraak).
- **Sales Agent** — lead-opvolging, offerte-voorbereiding voor nieuwe klanten.
- **CRM Agent** — klantrelatie-analyse buiten de operationele planning om (bv. terugkerende klachten signaleren).
- **Inventory Agent** — voorraadbeheer voor bedrijven die materialen/producten meenemen per beurt (V2-verwant, PRD § 6.7 nieuwe verticalen).
- **Maintenance Agent** — voertuig-/materieelonderhoud plannen rond de routeplanning.
- **Forecast Agent** — langetermijn-vraagvoorspelling (seizoenspatronen, groeitrends) los van de dagelijkse Revenue Agent-analyse.

Elke toekomstige agent volgt hetzelfde contract: Edge Function (ADR-008), Provider Pattern voor externe diensten (ADR-007), verplicht confidence/why/bronnen/alternatieven-outputcontract (§ 13), en dezelfde Human-Approval-toetsing (§ 12) vóór een nieuwe agent aan de "mag nooit zonder goedkeuring"-lijst geraakt kan worden — een nieuwe agent die bijvoorbeeld betalingen zou willen uitvoeren, vereist eerst een ADR-wijziging (ADR-011), niet een stille toevoeging.

---

## Changelog

| Datum | Versie | Wijziging |
|---|---|---|
| 2026-07-12 | 1.0 | Eerste volledige versie: visie, agent-architectuurdiagram, Orchestrator-verantwoordelijkheden, alle acht agents (verantwoordelijkheid/input/output/business rules/triggers), Human Approval-checklist, Confidence-Score-outputcontract, Logging & Audit, Toekomstige Agents-roadmap. Geschreven als operationele uitwerking van `ADR-011` (Human-in-the-Loop AI). |
| 2026-07-12 | 1.1 | Kruisverwijzingen naar `ADR-012` (AI Execution Pipeline) toegevoegd bij § 3 (Orchestrator), § 12 (Human Approval) en § 13 (Confidence Score) — ADR-012 pint de technische runtime-mechaniek (dependency graph, agent-contract, 0–1-confidence-conventie, kosten, failure handling) die dit document tot nu toe alleen op architectuurniveau (ADR-011) beschreef. Geen inhoudelijke wijziging aan de agent-beschrijvingen zelf. |
| 2026-07-12 | 1.2 | Kruisverwijzing naar `45_AgentMemory.md` toegevoegd (Organizational Memory — elke agent krijgt optioneel geleerde voorkeuren als extra input, § 7 van dat document beschrijft precies wat elke agent leert). Geen inhoudelijke wijziging aan de acht agent-beschrijvingen zelf. |
| 2026-07-13 | 1.3 | § 3a (Implementatiestatus) toegevoegd — Sprint 7 heeft Capacity/Optimization/Weather Agent daadwerkelijk gebouwd (PRD § 19 A-22, `40_Implementatieplan.md`); de overige vijf agents blijven architecturaal beschreven maar nog niet geïmplementeerd. Geen inhoudelijke wijziging aan de architectuurbeschrijvingen § 4–11 zelf. |
| 2026-07-16 | 1.4 | § 3a bijgewerkt: Replanning Agent (§ 5) gebouwd en live geverifieerd (Sprint 7-vervolg, `HANDMATIGE_ACCEPTATIETEST_2026-07-13.md` TC-7.x) — ziek/verlof melden op `/planning` genereert direct een `replan_jobs`-herplanvoorstel (`agent-replanning`-Edge-Function), zichtbaar op de Morning Briefing via de nieuwe `ReplanDiff`-tabel, geaccepteerd via de bestaande `decideProposal`/`route-move-job`-keten. Geen inhoudelijke wijziging aan § 5 zelf. |
| 2026-07-16 | 1.5 | § 3a/§ 4 bijgewerkt: Planning Agent gebouwd en live geverifieerd (Sprint 7-vervolg) — formaliseert de bestaande `planning-generate`-Edge-Function (Sprint 3) met een service-rol-pad + expliciete `company_id`-filter, en een nieuwe `agent-planning`-wrapper die een informatieve Briefing-kandidaat bouwt (geen `payload`, analoog Capacity/Weather). § 4 aangevuld met een implementatienotitie: "medewerker-toewijzing per dag" blijft bewust bij de Optimization Agent (§ 11), niet gedupliceerd. |
| 2026-07-16 | 1.6 | § 3a/§ 8 bijgewerkt: Invoice Agent gebouwd en live geverifieerd (Sprint 7-vervolg). Bij de bouw bleek conceptfactuur-aanmaak al volledig geïmplementeerd (`complete_job()`, Sprint 5) — de agent doet daarom uitsluitend signalering van openstaande concepten (persistente Briefing-waarschuwing, analoog Capacity Agent), geen aanmaak-of verzendlogica. § 8 aangevuld met implementatienotitie. |
