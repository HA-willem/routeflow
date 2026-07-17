# 45 — Agent Memory (Organizational Memory)

**Status:** DONE
**Versie:** 1.1
**Bron van waarheid:** `docs/adr/ADR-011-human-in-the-loop-ai.md` (Human-in-the-Loop AI), `docs/adr/ADR-012-ai-execution-pipeline.md` § 6 (Explanation Generator) — dit document mag geen van beide tegenspreken; het breidt de agent-architectuur uit met een geheugenlaag, zonder de bestaande Human-Approval-grens (BR-702) of het explainability-contract (BR-703) te verzwakken.
**Werkinstructie:** zie `MASTER_PROMPT.md`.
**Relaties:** `43_AI_Agents.md` (agents die het geheugen lezen/schrijven), `44_MorningBriefing_UX.md` (waar geleerde voorkeuren zichtbaar worden — § 8 Explainable AI), `10_BusinessRules.md` § 9 (BR-700–705), `08_FunctioneleEisen.md` FR-serie 900+ (FR-901/902), `36_Security.md` § 7 (AVG-kader waarbinnen dit geheugen moet blijven), `12_Entiteiten.md`/`11_DatabaseConcept.md` (bestaande expliciete voorkeurvelden die dit document expliciet niet dupliceert — zie § 2), `23_Gebruikersrollen.md` (wie voorkeuren mag beheren, § 10).

---

## Doel van dit document

RouteFlow's agents (`43_AI_Agents.md`) analyseren vandaag elke cyclus **stateless** — elke ochtend opnieuw, zonder te onthouden wat er gisteren, vorige week of vorig jaar is besloten. Dit document ontwerpt de **Organizational Memory**: een gecontroleerde, transparante geheugenlaag waarmee agents leren van historische beslissingen, klantvoorkeuren en bedrijfskennis, zodat voorstellen na verloop van tijd beter aansluiten bij hoe dit specifieke bedrijf werkt — zonder ooit de Human-in-the-Loop-garanties van ADR-011 te ondermijnen.

**Uitgangspunt (letterlijk, niet-onderhandelbaar):** agents onthouden geen willekeurige informatie. Het geheugen is een **gecontroleerd** bedrijfsgeheugen — elke opgeslagen voorkeur is gescoped, herkomstig, confidence-gewaardeerd en te allen tijde door de gebruiker te bekijken, aan te passen of te verwijderen (§ 6).

---

## 1. Visie

RouteFlow wordt niet beter door "meer GPT" — een groter of duurder taalmodel maakt een voorstel niet relevanter als het model niets weet over *dit specifieke bedrijf*: welke medewerker bij welke klant hoort, welke route de planner altijd zelf aanpast, welk object een lastige parkeerplek heeft. Die kennis zit vandaag alleen in de hoofden van de planner en de medewerkers, en gaat verloren zodra iemand met vakantie is, vertrekt, of het simpelweg vergeet.

Organizational Memory is RouteFlow's antwoord: **de AI wordt slimmer doordat het bedrijf steeds beter begrepen wordt**, niet doordat het onderliggende model groter wordt. Dit is dezelfde filosofie als ADR-010's expliciete afwijzing van "black-box ML" (Alternatieven-tabel) — leren gebeurt via **transparante, herleidbare patronen** (§ 3–5), niet via een ondoorzichtig model dat stilzwijgend gedrag aanpast.

Het geheugen ondersteunt drie doelgroepen tegelijk:

- **Medewerkers:** minder herhaalde uitleg nodig ("de hond is lief maar blijft binnen als je aanbelt") — eenmaal vastgelegd, altijd zichtbaar bij die stop.
- **Planners:** minder herhaalde correcties — als de planner een voorstel voor Route Noord al zes keer op dezelfde manier aanpast, hoeft de AI dat een zevende keer niet meer fout voor te stellen.
- **AI Agents:** rijkere input dan alleen de harde databasevelden (`service_agreements`, `objects`, …) — een extra, expliciet gescheiden kennislaag die voorstellen (ADR-012 § 2, Suggestion Generator) beter maakt zonder de onderliggende algoritmes (routing-engine, scoringsmodel, `15_AIPlanner.md`) te wijzigen.

---

## 2. Soorten geheugen

Vijf scopes, elk gekoppeld aan een bestaande entiteit (`12_Entiteiten.md`) — Organizational Memory introduceert **geen** nieuwe hoofdentiteiten, alleen een geheugenlaag die aan bestaande entiteiten hangt (§ 12, Architectuur).

**Belangrijke afbakening t.o.v. bestaande expliciete velden:** `service_agreements` heeft al `preferred_day`, `preferred_daypart`, `call_ahead_required`, `flexibility_window_days` (12_Entiteiten.md); `objects` heeft al `access_notes` (vrije tekst). Deze **blijven de harde, door de gebruiker zelf ingevulde velden** — Organizational Memory dupliceert ze niet. Het geheugen is er voor alles wat **niet** in een vast schemaveld past, en voor patronen die de AI zelf herkent zonder dat iemand ze ooit expliciet heeft ingetypt (§ 3).

### Planner Memory
Gekoppeld aan een `users`-rij (rol planner/eigenaar). Voorbeelden:
- Accepteert vaak bepaalde typen voorstellen (bv. altijd reistijd-optimalisaties, zelden clustering-voorstellen).
- Wijzigt Route Noord structureel na een AI-voorstel (signaal dat het huidige scoringsmodel voor die route iets systematisch mist).
- Plant liever medewerker A op route B, ook wanneer medewerker C beschikbaar en dichterbij is.

### Customer Memory
Gekoppeld aan een `customers`-rij. Voorbeelden:
- Alleen bereikbaar tussen 09:00–12:00 (contactmoment, niet hetzelfde als `preferred_daypart` — dat is wanneer de dienst *uitgevoerd* wordt, dit is wanneer de klant *telefonisch bereikbaar* is).
- Voorkeur voor WhatsApp boven e-mail (aanvullend op de bestaande, harde opt-in-vlaggen, BR-600/601).
- Wil altijd dezelfde medewerker (zachte voorkeur, geen harde toewijzingsregel).
- Accepteert regenuitstel zonder klacht (verlaagt de drempel voor de Weather Agent om bij deze klant een verplaatsing voor te stellen).
- Prijsgevoelig (relevant voor de Revenue/Invoice Agent bij het overwegen van een prijs-override-voorstel, 18_Prijsafspraken.md § 7).

### Object Memory
Gekoppeld aan een `objects`-rij. Voorbeelden:
- Achterom via de poort (kan een gestructureerde, agent-leesbare aanvulling zijn op de vrije tekst in `access_notes`, nooit een vervanging).
- Hond aanwezig.
- Ladder noodzakelijk (relevant voor Weather Agent's windadvies — hoogwerk bij een object dat toch al een ladder vereist weegt zwaarder mee dan bij een gelijkvloers object).
- Parkeerplaats lastig (relevant voor geschatte reistijd/buffertijd, Optimization Agent).
- Sleutelkluis aanwezig (relevant voor planning zonder dat de klant thuis hoeft te zijn).

### Employee Memory
Gekoppeld aan een `employees`-rij. Voorbeelden:
- Voorkeur voor bepaalde routes/wijken.
- Certificeringen (bv. hoogwerkcertificaat — relevant voor welke beurten deze medewerker mag krijgen).
- Ervaring (aantal jaar, aantal uitgevoerde beurten van een dienst-type).
- Gemiddelde snelheid per dienst-type (afwijking t.o.v. `estimated_duration_minutes` — leert de Optimization Agent realistischere tijdsinschattingen per medewerker).
- Klantfeedback (geaggregeerd, nooit een los, individueel klantcitaat — § 9 Privacy).

> **AI Act-grens (BR-706/707, `47_AIAct_Compliance.md` § 5.3):** per-medewerker-gedragsafgeleide gegevens (m.n. de gemiddelde snelheid) mogen uitsluitend dienen als stille schattingscorrectie van beurt-duur — nooit als allocatiecriterium, prestatiebeoordeling, monitoring of ranglijst. De sprint die de leeskant van dit geheugen bouwt is gebonden aan een voorafgaande, gedocumenteerde AI Act-pre-check; zonder die check wordt deze data niet gelezen.

### Company Memory
Gekoppeld aan `companies` (bedrijfsbreed, geen sub-scope). Voorbeelden:
- Start altijd vanuit depot A (ook als er meerdere adressen zijn ingesteld).
- Vrijdag structureel minder capaciteit (halve dagen, geen aparte `availability`-rij per medewerker per week nodig om dit patroon te herkennen).
- Maximale reistijd per beurt die het bedrijf acceptabel vindt (bedrijfsspecifieke norm, kan afwijken van het BR-202-werkdaglimiet).
- Overige bedrijfsspecifieke voorkeuren die niet in `companies.config_json` (bestaand, generiek instellingenveld, PRD § 19 A-13-precedent) horen omdat ze **geleerd** zijn, niet **ingesteld**.

---

## 3. Explicit vs Implicit Learning

Twee fundamenteel verschillende manieren waarop een geheugenrecord ontstaat — het onderscheid bepaalt het startpunt op de confidence-schaal (§ 4):

**Expliciet:** de gebruiker voert zelf een voorkeur in (bv. via een "Voeg voorkeur toe"-actie bij een klant/object/medewerker, of door direct op een AI-uitleg te reageren met "onthoud dit"). Start altijd op **"bevestigd"** (§ 4) — een mens heeft het letterlijk gezegd, geen inferentie nodig.

**Impliciet:** een agent herkent een patroon in gedrag over tijd, zonder dat de gebruiker het ooit expliciet heeft ingevoerd. Voorbeeld: *"Planner accepteert 95% van de tijd dezelfde wijziging voor Route Noord."* Start op **"nieuw"** en klimt naar hogere confidence-niveaus naarmate het patroon zich herhaalt (§ 4) — nooit een directe sprong naar "bevestigd" zonder herhaling, en nooit zonder dat de gebruiker het ontstane patroon te zien krijgt (§ 5/§ 6).

Impliciete patronen worden **nooit stilzwijgend** een actief geheugenrecord — pas zodra een patroon een minimale confidence-drempel bereikt (§ 4, "waarschijnlijk") wordt het aan de gebruiker getoond ter bevestiging; pas na expliciete bevestiging (of voldoende herhaling zonder afwijzing) telt het volwaardig mee in toekomstige voorstellen. Dit voorkomt dat een toevallige samenloop (twee keer hetzelfde per toeval) al als "geleerd gedrag" wordt behandeld.

---

## 4. Confidence

Vier niveaus, oplopend — dezelfde 0–1-technische schaal als ADR-012 § 3 (UI toont een leesbaar label, geen kaal getal, consistent met `44_MorningBriefing_UX.md` § 3.4):

| Niveau | Technische drempel | Betekenis |
|---|---|---|
| **Nieuw** | < 0,4 | Eén enkele waarneming (implicit) of net aangemaakt — te vroeg om op te vertrouwen, nog niet zichtbaar in voorstellen, wel intern gelogd. |
| **Waarschijnlijk** | 0,4–0,69 | Patroon herhaalt zich (meerdere waarnemingen, geen tegenvoorbeelden) — nu zichtbaar voor de gebruiker ter bevestiging (§ 6), nog niet automatisch toegepast in een voorstel. |
| **Bevestigd** | 0,7–0,89 | Expliciet door de gebruiker bevestigd, óf een implicit patroon dat consistent stand hield over voldoende herhalingen zonder tegenvoorbeeld — wordt nu meegewogen in voorstellen (als input voor het scoringsmodel, niet als harde regel). |
| **Zeer sterk patroon** | ≥ 0,9 | Lange, consistente geschiedenis zonder uitzondering — weegt zwaar mee, maar overschrijft nooit een harde business rule (BR-200–205 blijven te allen tijde leidend, § 12). |

Confidence daalt automatisch bij een tegenvoorbeeld (de gebruiker wijst een voorstel af dat op deze voorkeur gebaseerd was, of geeft expliciet 👎-feedback, § 8) — nooit een vast, permanent niveau zodra bereikt.

---

## 5. Explainability

Elke geleerde voorkeur is **verplicht** uitlegbaar, zelfde principe als elk agent-voorstel (BR-700/703, ADR-012 § 6) — een voorkeur zonder herkomst wordt niet opgeslagen:

> *"Deze voorkeur is ontstaan doordat de planner de afgelopen 6 maanden 92% van de tijd dezelfde keuze maakte."*

Verplichte velden per geheugenrecord (rechtstreeks analoog aan ADR-012 § 6's explainability-schema, hier toegepast op een voorkeur i.p.v. een voorstel):

| Veld | Inhoud |
|---|---|
| `reasoning` | Mens-leesbare toelichting (bovenstaand voorbeeld) |
| `evidence` | De onderliggende waarnemingen (bv. "18 van de 20 keer geaccepteerd, periode jan–jun 2026") — nooit alleen een percentage zonder de telling erachter |
| `confidence` | § 4 |
| `source` | `explicit` of `implicit` (§ 3) |
| `first_observed` / `last_confirmed` | Wanneer het patroon begon en wanneer het voor het laatst is bevestigd/herbevestigd |

Dit maakt een geleerde voorkeur net zo navolgbaar als een AI-voorstel — een gebruiker die "waarom doet de AI dit?" vraagt, krijgt bij een op-geheugen-gebaseerd voorstel dus ook "waarom denkt de AI dit over jou/deze klant/dit object?" als antwoord, niet alleen "omdat de data het zegt."

---

## 6. Human Control

Niets in de Organizational Memory is permanent zonder menselijke controle — de gebruiker (rolafhankelijk, § 10) kan per voorkeur:

- **Bekijken** — elke voorkeur inzichtelijk vanuit de plek waar hij relevant is (klantdetail, objectdetail, medewerkerdetail, of een centraal geheugen-overzicht) mét de volledige uitleg (§ 5).
- **Aanpassen** — de inhoud corrigeren (bv. "niet 09:00–12:00, maar 10:00–13:00") zonder de geschiedenis kwijt te raken (§ 10, versiebeheer).
- **Uitschakelen** — tijdelijk buiten werking stellen zonder te verwijderen (bv. een medewerker-voorkeur die tijdelijk niet geldt door een projectmatige uitzondering) — telt niet meer mee in voorstellen, blijft wel zichtbaar als uitgeschakeld.
- **Verwijderen** — permanent weghalen (AVG-conform, § 9).
- **Resetten** — een implicit-geleerde voorkeur terugzetten naar "nieuw" (bv. na een reorganisatie is een oud patroon niet meer relevant, maar de gebruiker wil niet dat de AI blijft doorleren vanaf het oude, nu-irrelevante niveau).

Dit is de operationalisatie van BR-704 (nieuw, zie `10_BusinessRules.md`-wijziging) — een directe uitbreiding van BR-702's Human-Approval-principe naar de geheugenlaag: zoals AI nooit een definitieve planningsactie zonder goedkeuring uitvoert, mag AI ook nooit een blijvende voorkeur vastleggen zonder dat de mens die kan zien en corrigeren.

---

## 7. Agent Learning

Per agent, wat hij leert (aanvullend op zijn bestaande verantwoordelijkheid, `43_AI_Agents.md` § 4–11 — dit document introduceert geen nieuwe agents):

| Agent | Leert |
|---|---|
| **Planning Agent** | Volgorde-voorkeuren per route, medewerker-klant-affiniteit (Planner/Employee/Customer Memory), planningstijl van de planner (bv. voorzichtig met flexvenster-verschuivingen vs. agressief optimaliserend) |
| **Replanning Agent** | Welke herplan-voorstellen de planner doorgaans accepteert vs. altijd zelf aanpast (Planner Memory) — voedt de stabiliteitsafweging (15_AIPlanner.md § 7.3) |
| **Weather Agent** | Wanneer de planner een weersgedreven voorstel accepteert vs. negeert; welke klanten regenuitstel probleemloos accepteren (Customer Memory) — verfijnt de vaste drempels (15_AIPlanner.md § 6.3) met een bedrijfs-/klantspecifieke correctiefactor, zonder de drempels zelf te wijzigen |
| **Communication Agent** | Voorkeurskanaal per klant (Customer Memory), boven op de bestaande harde opt-in-vlaggen |
| **Invoice Agent** | Terugkerende uitzonderingen (bv. een klant die altijd een aangepaste betaaltermijn krijgt, met menselijke goedkeuring elke keer — het geheugen versnelt het *voorstellen* van de uitzondering, niet het automatisch toepassen ervan, BR-702) |
| **Capacity Agent** | Bedrijfsspecifieke capaciteitspatronen (Company Memory: "vrijdag structureel minder capaciteit") |
| **Revenue Agent** | Prijsgevoeligheid per klant (Customer Memory) — relevant bij het signaleren van commerciële kansen/risico's, nooit bij het zelfstandig wijzigen van een prijsafspraak (BR-702) |
| **Optimization Agent** | Realistische duur-afwijkingen per medewerker/object (Employee/Object Memory: gemiddelde snelheid, lastige parkeerplek) — verfijnt de tijdsinschatting binnen de bestaande routing-engine (14_RoutingEngine.md), wijzigt het algoritme zelf niet |

---

## 8. Feedback Loop

Elk voorstel (`44_MorningBriefing_UX.md` § 5) krijgt een expliciete feedback-actie, direct naast (niet in plaats van) accepteren/bewerken/afwijzen:

- **👍 Goed voorstel** — versterkt de onderliggende voorkeur(en) die tot dit voorstel leidden (confidence omhoog, § 4).
- **👎 Niet handig** — verzwakt de onderliggende voorkeur(en) (confidence omlaag); bij herhaalde 👎 op dezelfde voorkeur: automatisch gedegradeerd naar "waarschijnlijk" of lager, nooit stil verwijderd (de gebruiker ziet dat het patroon aan het afbrokkelen is, § 6).
- **✏️ Aangepast** — de gebruiker paste het voorstel aan in plaats van te accepteren/afwijzen; dit is zelf een **nieuwe** impliciete waarneming (wat is er aangepast, en past dat bij een bestaande of een nieuwe voorkeur?) — voedt zowel de bestaande voorkeur (indien relevant) als potentieel een nieuw patroon.

Feedback is altijd gekoppeld aan het specifieke voorstel én de specifieke onderliggende voorkeur(en) — nooit een losse, contextloze duim-omhoog die "ergens" invloed heeft. Dit sluit aan op de audittrail-eis (§ 10): elke confidence-wijziging is herleidbaar tot een concrete feedback-gebeurtenis.

---

## 9. Privacy

### 9.1 Wat nooit wordt geleerd

Organizational Memory leert uitsluitend **operationele planningspatronen** — expliciet buiten scope, ongeacht confidence-niveau of bron:

- Wachtwoorden, sessietokens, of andere authenticatiegegevens.
- Betaalgegevens (kaartnummers, IBAN — deze lopen sowieso al buiten RouteFlow's eigen opslag via Mollie, ADR-... Mollie-adapter).
- Medische informatie (een ziekmelding triggert de Replanning Agent, § 7, maar de **reden** van de ziekmelding wordt nooit opgeslagen of geleerd — alleen "afwezig", nooit "waarom").
- Privécommunicatie (de inhoud van WhatsApp/e-mail-berichten tussen medewerker/klant/planner wordt niet in het geheugen opgenomen — alleen het **afgeleide, geaggregeerde signaal**, bv. "klant reageert doorgaans binnen een uur op WhatsApp", nooit de berichttekst zelf).

Dit is een harde grens, vastgelegd als BR-705 (nieuw, zie `10_BusinessRules.md`-wijziging) — geen agent-implementatie mag hier omheen, ongeacht hoe nuttig het patroon zou lijken.

Aanvullend geldt sinds de AI Act-inrichting (2026-07-17): geleerde per-medewerker-gegevens worden nooit gebruikt voor prestatiebeoordeling, monitoring of HR-besluiten (BR-707, `47_AIAct_Compliance.md` § 5.3) — een gebruiks-, niet alleen een opslagbeperking.

### 9.2 Bewaartermijnen

Consistent met het bestaande AVG-kader (`36_Security.md` § 7.3, NFR-405):

- **Implicit-geleerde patronen zonder bevestiging** ("nieuw"/"waarschijnlijk", § 4): automatisch verwijderd na 12 maanden zonder nieuwe waarneming die het patroon versterkt — een niet-bevestigd signaal dat nooit is doorgegroeid, is waarschijnlijk toeval geweest of niet meer relevant.
- **Bevestigde voorkeuren** ("bevestigd"/"zeer sterk patroon"): blijven bestaan zolang de onderliggende entiteit (klant/object/medewerker) actief is; bij archivering van die entiteit (bestaand `archived_at`-patroon, 41_CodingStandards.md § 9) archiveert het gekoppelde geheugenrecord automatisch mee — geen los verwijderproces nodig.
- **Feedback-events** (§ 8, ruwe 👍/👎/✏️-logs): bewaard zolang nodig voor de audittrail (§ 10), maximaal even lang als de reguliere audittrail-retentie (35_Deployment.md-precedent, exacte termijn is implementatiedetail voor de bouwende sprint, niet dit document).
- **Volledige verwijdering op verzoek** (§ 6, AVG-recht op verwijdering): direct uitgevoerd, geen vertraagde soft-delete voor geheugendata specifiek (in tegenstelling tot bv. klanten met facturen, BR-040 — een geheugenrecord heeft geen wettelijke bewaarplicht zoals een factuur).

---

## 10. Governance

- **Audittrail:** elke wijziging aan een geheugenrecord (aanmaak, confidence-wijziging, aanpassing, uitschakeling, verwijdering, reset) wordt gelogd conform het bestaande `41_CodingStandards.md` § 11-beleid (correlatie-id, geen PII in het logbericht zelf — de log verwijst naar het record-ID, niet naar de inhoud).
- **Versiebeheer:** een aanpassing (§ 6) overschrijft niet stil de vorige waarde — de vorige versie blijft herleidbaar (analoog aan hoe `routes.sequence_version` een historie van herberekeningen bijhoudt, 11_DatabaseConcept.md-precedent) zodat een gebruiker kan zien hoe een voorkeur zich over tijd heeft ontwikkeld.
- **Wie mag aanpassen:** volgt de bestaande rechtenmatrix (`23_Gebruikersrollen.md` § 2) per scope — Planner Memory is alleen door de betreffende planner zelf en Eigenaar/Admin aan te passen (niemand wijzigt "andermans" geleerde planningstijl); Customer/Object Memory door Planner/Eigenaar/Admin (zelfde rechten als de onderliggende klant/object-data); Employee Memory door Eigenaar/Admin (zelfde als medewerkerbeheer) en de medewerker zelf voor zijn eigen voorkeuren (route-/wijkvoorkeur); Company Memory door Eigenaar/Admin (zelfde als bedrijfsinstellingen).
- **Exporteren:** machineleesbare export per bedrijf, consistent met het bestaande AVG-inzage-/exportrecht (`36_Security.md` § 7.2, NFR-403) — geen apart exportmechanisme, hergebruik van de bestaande bedrijfsdata-export.
- **Verwijderen:** zie § 9.2 — direct op verzoek, automatisch bij archivering van de onderliggende entiteit, of automatisch na de bewaartermijn voor niet-bevestigde patronen.

---

## 11. Toekomst

Organizational Memory is de kennisbron die de al-geplande toekomstige agents (`43_AI_Agents.md` § 15) direct kunnen hergebruiken zonder een eigen, parallelle geheugenlaag te bouwen:

| Toekomstige agent | Gebruik van Organizational Memory |
|---|---|
| **Voice Agent** | Spreekt Customer/Employee Memory uit als context ("Let op: bij deze klant is er een hond, en ze is alleen 's ochtends bereikbaar") zonder dat de gebruiker het opnieuw hoeft te vertellen. |
| **Sales Agent** | Revenue Agent's prijsgevoeligheid-signalen (Customer Memory) en Company Memory-capaciteitspatronen samen gebruiken om te bepalen welke klanten open zouden staan voor een extra dienst. |
| **CRM Agent** | Customer Memory is in essentie al een lichte CRM-laag — een volwaardige CRM Agent zou hierop verder bouwen (interactiegeschiedenis, voorkeuren) i.p.v. een nieuwe klant-kennislaag te introduceren. |
| **Forecast Agent** | Company Memory-patronen (bv. "vrijdag structureel minder capaciteit") als directe input voor langetermijnvoorspelling, naast de bestaande Revenue Agent-data. |
| **Maintenance Agent** | Object Memory ("ladder noodzakelijk", toegangs-bijzonderheden) en Employee Memory (certificeringen) samen gebruiken om onderhoudsplanning af te stemmen op wie waar mag/kan komen. |

Geen van deze toekomstige agents vereist een aanpassing aan de geheugenarchitectuur zelf (§ 12) — ze zijn nieuwe **lezers** (en mogelijk schrijvers) van dezelfde vijf geheugensoorten (§ 2), binnen hetzelfde confidence/explainability/Human-Control-contract (§ 4–6).

---

## 12. Architectuur

**Geen nieuwe infrastructuur** — Organizational Memory is een geheugenlaag bovenop exact de bestaande bouwstenen:

- **AI Agents (`43_AI_Agents.md`):** elke agent krijgt relevante geheugenrecords als extra input naast zijn bestaande databronnen (ADR-012 § 3, input-envelope uitgebreid met een `memory`-veld: de relevante, actieve — niet-uitgeschakelde — voorkeuren voor de scope die de agent verwerkt). Agents *schrijven* nieuwe implicit-waarnemingen terug via dezelfde envelope-conventie, nooit via een apart schrijfpad.
- **Morning Briefing (`44_MorningBriefing_UX.md`):** waar geleerde voorkeuren zichtbaar worden — de "Waarom?"-uitklap (§ 8 van dat document) toont voortaan ook of en welke geheugenrecords hebben meegewogen, als onderdeel van "welke gegevens?" (bestaande vraag, uitgebreid antwoord).
- **Event Bus (het bestaande cron/event/diff-patroon, ADR-011 § 7, ADR-012 § 1):** een confidence-wijziging of nieuwe waarneming is een event zoals elk ander agent-resultaat — geen apart geheugen-specifiek event-mechanisme.
- **Edge Functions (ADR-008):** lezen/schrijven van geheugenrecords gebeurt binnen dezelfde Edge Functions die de agents al draaien (of een klein aantal gedeelde helper-functies, bv. `memory-record-feedback` voor § 8) — geen apart "memory service".
- **Business Rules (`10_BusinessRules.md`):** een geheugenrecord is **nooit** een vervanging van een harde business rule — BR-200–205 (vergrendelde beurten, beschikbaarheid, werkdaglimiet, etc.) blijven onvoorwaardelijk leidend; Organizational Memory beïnvloedt uitsluitend de **zachte** afwegingen (scoringsmodel-input, 15_AIPlanner.md § 4), nooit de harde grenzen.
- **RLS (ADR-003/004):** elk geheugenrecord is `company_id`-gescoped, exact zoals elke andere tabel — geen enkele voorkeur is ooit zichtbaar of bruikbaar over tenant-grenzen heen, ook niet voor patroonherkenning ("andere bedrijven doen dit ook" bestaat expliciet niet — leren gebeurt uitsluitend binnen het eigen bedrijf).
- **Explanation Generator (ADR-012 § 2/§ 6):** consumeert geheugenrecords als extra `evidence`-bron naast de bestaande databronnen (weerdata, business rules) wanneer hij een voorstel opbouwt dat mede op een geleerde voorkeur is gebaseerd — geen apart uitlegmechanisme naast wat er al is, één samenhangend contract.

Concreet datamodel (conceptueel, geen migratie — werk voor de bouwende sprint): één generieke geheugentabel per de vijf scopes (§ 2), met minimaal `company_id` (RLS), `scope_type` (planner/customer/object/employee/company), `scope_id`, `key` (wat voor voorkeur), `value`, `confidence` (§ 4), `source` (§ 3), `reasoning`/`evidence` (§ 5), `disabled_at` (§ 6), `created_at`/`updated_at` — dezelfde JSONB/reden-object-conventie als het bestaande BR-700-mechanisme (`020_planning_reasons.sql`-precedent, `40_Implementatieplan.md` Sprint 7), geen nieuw opslagparadigma.

---

## 13. Gevolgen

**Positief**
- **Betere planning:** voorstellen houden rekening met wat dit specifieke bedrijf al weet, niet alleen met generieke regels.
- **Minder handmatig werk:** patronen die de planner nu elke keer zelf corrigeert, worden na verloop van tijd al correct voorgesteld.
- **Persoonlijkere AI:** de AI voelt aan als "onze planner", niet als een generieke tool — Customer/Object/Employee Memory maakt elk voorstel context-bewust.
- **Reproduceerbare beslissingen:** elke geleerde voorkeur is herleidbaar (§ 5/§ 10) — geen "de AI deed dit zomaar."
- **Hogere kwaliteit:** Optimization/Weather/Capacity Agent-voorstellen worden nauwkeuriger naarmate Employee/Object/Company Memory rijker wordt (realistischere tijden, betere weersadviezen, kloppende capaciteitsverwachtingen).
- **Explainable AI:** rechtstreekse voortzetting van BR-700/703 — geen nieuw, apart uitlegmodel voor geheugen versus voorstellen.
- **Schaalbaarheid:** elke toekomstige agent (§ 11) hergebruikt dezelfde geheugenlaag zonder eigen kennisopslag te hoeven bouwen.

---

## Changelog

| Datum | Versie | Wijziging |
|---|---|---|
| 2026-07-17 | 1.1 | AI Act-grens toegevoegd (BR-706/707, `47_AIAct_Compliance.md` § 5.3): Employee Memory-gedragsdata uitsluitend als stille duur-schattingscorrectie, nooit voor allocatie/beoordeling/monitoring; leeskant-sprint gebonden aan verplichte AI Act-pre-check. |
| 2026-07-12 | 1.0 | Eerste volledige versie: visie, vijf geheugensoorten (Planner/Customer/Object/Employee/Company — expliciet afgebakend t.o.v. bestaande schemavelden zoals `preferred_day`/`access_notes`), expliciet-vs-impliciet leren, vier confidence-niveaus, explainability-schema, Human Control (BR-704), agent-learning-tabel voor alle acht bestaande agents, feedback-loop (👍/👎/✏️), privacy-uitsluitingen (BR-705) en bewaartermijnen, governance (audittrail/versiebeheer/rollen/export/verwijdering), koppeling aan toekomstige agents, architectuur (geen nieuwe infrastructuur — hergebruik van Edge Functions/Event Bus/RLS/Explanation Generator), gevolgen. Geschreven als uitbreiding op `ADR-011`/`ADR-012`, voorafgaand aan verdere implementatie. |
