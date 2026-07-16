# 46 — Platform Admin & Product Agent

**Status:** DONE
**Versie:** 1.0
**Bron van waarheid:** `ADR-013` (Platform Admin & Product Agent) en `00_PRD.md` § 19 A-23. Dit document mag geen van beide tegenspreken; het is de **operationele uitwerking** van ADR-013 (analoog aan hoe `43_AI_Agents.md` de uitwerking is van ADR-011).
**Werkinstructie:** zie `MASTER_PROMPT.md`.
**Relaties:** `docs/adr/ADR-013-platform-admin-product-agent.md` (architectuurbeslissing), `docs/adr/ADR-011-human-in-the-loop-ai.md` (Human-Approval-principe, hier hergebruikt en verstrengd), `docs/adr/ADR-012-ai-execution-pipeline.md` (Explainability-contract hergebruikt), `43_AI_Agents.md` (bestaande domein-agents — Product Agent is er bewust géén negende), `23_Gebruikersrollen.md` (platform-admin staat expliciet buiten de tenant-rollenmatrix), `10_BusinessRules.md` § 12 (BR-900–904), `08_FunctioneleEisen.md` FR-serie 950+, `41_CodingStandards.md` (Git Safety Protocol waar de Product Agent aan gebonden is), `40_Implementatieplan.md` (sprintplaatsing).

---

## Doel van dit document

Dit document beschrijft twee samenhangende, nieuwe onderdelen die **buiten** de tenant-scope van RouteFlow vallen: (1) het **Platform Admin-portal**, uitsluitend voor de platform-eigenaar, met overzicht over alle bedrijven; (2) de **Product Agent**, die het product zelf structureel beter maakt — op basis van door tenants ingediende feature requests én operationele signalen — door concrete code-voorstellen (Pull Requests) te doen, altijd ter goedkeuring van de platform-eigenaar. Dit is geen negende domein-agent naast de acht uit `43_AI_Agents.md` (die werken allemaal **binnen** een Bedrijf); de Product Agent werkt op de **codebase**.

---

## 1. Platform Admin-portal

### 1.1 Toegang

Platform-admin is geen Bedrijfsrol (23_Gebruikersrollen.md § 1 blijft ongewijzigd voor tenants). Toegang wordt bepaald door een expliciete allowlist (`platform_admins`, `user_id`-only, geen `company_id`) — een gebruiker die Eigenaar is van het grootste tenant-account heeft **geen** platform-toegang tenzij zijn `user_id` hier expliciet aan toegevoegd is. Mutaties op deze tabel gebeuren uitsluitend handmatig via de Supabase SQL Editor/Dashboard (zelfde behandeling als een secret — analoog aan het `vault`-precedent in `026_agent_orchestrator_cron.sql`), nooit via een applicatie-endpoint met eigen schrijfrechten hierop.

### 1.2 Locatie & afscherming

Eigen routegroep, los van de bestaande `(app)`-tenant-routegroep (bv. `/platform-admin`) — geen `company_id` in de request-context, wel een guard die de platform-admin-vlag controleert op elke laag (database-RLS, Server Action/Edge-Function-guard, UI-routing) — defense-in-depth, zelfde principe als 23_Gebruikersrollen.md § 4, nu toegepast op een andere autorisatiedimensie.

### 1.3 Inhoud van het portal

| Onderdeel | Doel |
|---|---|
| Cross-tenant operationeel overzicht | Agent-rungezondheid (`agent_runs`-foutpercentages), per bedrijf en geaggregeerd — bestaande data (Sprint 7), nieuw hergebruikt voor platform-monitoring. Voorkomt dat een probleem zoals de service-role-key-mismatch (2026-07-15) pas opvalt wanneer een tenant klaagt. |
| Feature requests-inbox | Alle binnengekomen tenant-feature requests, met Product Agent-triage-status (§ 3) en clustering ("4 bedrijven vroegen hierom"). |
| Product Agent-voorstellen | Lijst van open/goedgekeurde/afgewezen/gemergede voorstellen (§ 3), met PR-link, diff-samenvatting, risicoclassificatie (§ 4) en het volledige why/trigger/bronnen-contract (analoog BR-703). |
| Goedkeuringsactie | Eén voorstel goedkeuren/afwijzen — goedkeuring betekent uitsluitend "deze PR mag gemerged worden"; de merge zelf blijft een losse, handmatige actie (§ 4). |

---

## 2. Feature requests (tenant-zijde)

### 2.1 Indienen

Vanuit de eigen bedrijfsomgeving (niet het Platform Admin-portal) kan een tenant-gebruiker een feature request indienen: titel, beschrijving, optioneel context (welke pagina/flow). Rolrechten: zie `23_Gebruikersrollen.md` § 2 (nieuwe rij "Feature requests").

### 2.2 Zichtbaarheid

Een feature request is uitsluitend zichtbaar voor het eigen bedrijf (RLS op `company_id`, zelfde model als elke andere tenant-tabel) en voor de platform-eigenaar (platform-admin-bypass). **Geen** cross-tenant zichtbaarheid — geen publiek roadmap-bord in deze scope (BR-904; zie ADR-013 § "Alternatieven" voor de bewuste afweging tegen een Canny/UserVoice-achtig model).

### 2.3 Status

Een ingediend request doorloopt: `nieuw → getrieerd (door Product Agent) → voorgesteld (gekoppeld aan een platform-voorstel) → afgewezen / gepland / gebouwd`. De tenant-gebruiker ziet deze status terug in de eigen omgeving (transparantie, zonder de onderliggende platform-brede clustering of andere bedrijven te tonen).

---

## 3. Product Agent — triage & voorstellen

### 3.1 Twee inputstromen

- **Reactief:** nieuwe feature requests (§ 2), geclusterd over tenants heen — een verzoek dat door meerdere bedrijven onafhankelijk wordt ingediend weegt zwaarder dan een eenmalig verzoek.
- **Proactief:** bestaande operationele signalen (`agent_runs`-foutpatronen, herhaalde `error_message`-clusters) — geen nieuwe telemetrie, hergebruik van wat Sprint 7 al wegschrijft.

### 3.2 Uitvoeringsmodel — geen nieuwe infrastructuur

De Product Agent draait **niet** als Edge Function met een eigen LLM-integratie, maar als een geplande Claude Code-agent (bestaande `schedule`-capaciteit van de ontwikkelomgeving), op een cadans (voorstel: wekelijks, instelbaar) — geen aparte code-generatie-stack (ADR-013 § "Alternatieven"). Bij een gerechtvaardigd voorstel opent de agent een branch + Pull Request via de bestaande, altijd-geldende Git Safety Protocol: nooit direct naar `main`, nooit `--force`/`--no-verify`, altijd een nieuwe commit.

### 3.3 Voorstel-contract (analoog BR-703 Explainability)

Elk voorstel (`platform_proposals`) bevat verplicht:

| Veld | Inhoud |
|---|---|
| Titel + PR-link | Wat verandert er, waar te reviewen |
| Trigger/waarom | Welke feature request(s) en/of welk operationeel signaal |
| Gekoppelde feature requests | Zichtbaar aantal bedrijven, indien van toepassing |
| Risicoclassificatie | Normaal / high-risk (§ 4) |
| Overwogen alternatieven | Zelfde principe als BR-703, nu toegepast op een codewijziging i.p.v. een planningsbeslissing |

### 3.4 Wat de Product Agent **niet** doet

- Geen enkele merge, geen deploy, geen directe wijziging op `main`/productie (BR-901).
- Geen high-risk-PR (migraties, RLS, auth, betalingen, secrets/Vault) zonder expliciete, on-demand trigger door de platform-eigenaar (BR-902) — nooit op de automatische cadans.
- Geen wijziging aan de platform-admin-allowlist of enige Vault/secret-waarde (§ 1.1) — dat blijft altijd een handmatige actie van de platform-eigenaar zelf, buiten elke agent om.

---

## 4. Human Approval — de harde grens (codebase-niveau)

Analoog aan ADR-011 § 4 (BR-702, domeindata) maar **strenger**, omdat een codewijziging per definitie alle tenants tegelijk raakt zodra gemerged:

| Actie | Wie |
|---|---|
| Voorstel doen (branch + PR) | Product Agent, autonoom binnen § 3.4-grenzen |
| High-risk-PR triggeren | Uitsluitend platform-eigenaar, expliciet, nooit automatisch |
| PR goedkeuren in portal | Platform-eigenaar |
| PR daadwerkelijk mergen | Platform-eigenaar, losse handmatige actie — "goedgekeurd" ≠ "gemerged" |
| Deploy naar productie | Platform-eigenaar (bestaande deploy-workflow, ongewijzigd) |

---

## 5. Edge cases

| # | Case | Gedrag |
|---|---|---|
| PA-01 | Twee bedrijven dienen (bijna) identieke feature requests in | Product Agent clustert tot één voorstel, koppelt beide requests; beide tenants zien "voorgesteld" in hun eigen status |
| PA-02 | Een goedgekeurd voorstel blijkt bij het mergen conflicten te hebben met inmiddels gewijzigde code | Platform-eigenaar lost dit op als reguliere git-merge-conflict (geen agent-automatisering hiervoor) — status blijft "goedgekeurd, nog niet gemerged" |
| PA-03 | Een high-risk-PR wordt per ongeluk niet als zodanig herkend | Conservatief ontwerpprincipe (ADR-013 "Mitigaties"): bij twijfel geldt high-risk; menselijke code review door de platform-eigenaar blijft sowieso de laatste linie vóór elke merge, ongeacht classificatie |
| PA-04 | Tenant dient een feature request in die al bestaat als product-instelling | Platform-eigenaar wijst af met toelichting "bestaat al, zie instellingen X" — status `afgewezen`, zichtbaar voor indiener |
| PA-05 | Platform-admin-allowlist per ongeluk leeg (nieuw environment) | Portal toont expliciete lege staat "geen platform-admins geconfigureerd" i.p.v. onterecht toegang te geven aan niemand-of-iedereen; toevoegen kan uitsluitend via SQL Editor (§ 1.1) |

---

## 6. Openstaande punten

- Exacte cadans van de geplande Product Agent-run (wekelijks voorgesteld, § 3.2) — definitief te bepalen bij sprintplaatsing.
- Formele datamodellering (`feature_requests`, `platform_proposals`, `platform_admins`) volgt in `11_DatabaseConcept.md`/`12_Entiteiten.md` zodra dit ingepland wordt — conceptueel hier al vastgelegd, analoog aan het precedent van PRD § 19 A-16.
- Publiek/cross-tenant zichtbare roadmap (ADR-013 § "Alternatieven") is bewust niet meegenomen — mogelijke latere, aparte uitbreiding op `feature_requests` (`is_public`-kolom), geen herontwerp nodig indien gewenst.

---

## Changelog

| Datum | Versie | Wijziging |
|---|---|---|
| 2026-07-15 | 1.0 | Nieuw document: Platform Admin-portal en Product Agent (feature-request-triage, code-voorstellen via PR, strengere Human-Approval-grens dan BR-702), voortvloeiend uit ADR-013/PRD § 19 A-23. |

---

## Volgende stap

`40_Implementatieplan.md` uitbreiden met een nieuwe sprint (na de eerstvolgende geplande sprint) die dit bouwt: (1) migraties voor `platform_admins`/`feature_requests`/`platform_proposals` (RLS zoals hierboven), (2) de tenant-zijde "Feature request indienen"-UI (FR-950), (3) het Platform Admin-portal (FR-952/953) met alleen de goedkeuringsactie (nog geen geautomatiseerde Product Agent-run), (4) pas ná die twee stabiel zijn: de geplande Product Agent-triage zelf (FR-951) inschakelen. Begin pas met code zodra deze sprint-toewijzing in `40_Implementatieplan.md` staat — dit document alleen legt de architectuur vast, niet de bouwvolgorde.
