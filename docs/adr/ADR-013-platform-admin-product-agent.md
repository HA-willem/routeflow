# ADR-013: Platform Admin & Product Agent (zelfverbeterend product, met menselijke goedkeuring)

- **Status:** Accepted
- **Datum:** 2026-07-15
- **Beslisser:** Chief Software Architect (RouteFlow) i.o.v. platform-eigenaar
- **Bron van waarheid:** `00_PRD.md` § 19 A-23 — deze ADR formaliseert die aanname tot architectuur.
- **Gerelateerd:** ADR-011 (Human-in-the-Loop AI — hetzelfde Human-Approval-principe, hier toegepast op de *codebase* i.p.v. de *planning*), ADR-012 (AI Execution Pipeline — Explainability-patroon hergebruikt), ADR-008 (Edge Functions), ADR-004 (Multi-tenancy/RLS — dit ADR introduceert de eerste autorisatiegrens die daar bewust *buiten* valt); `46_PlatformAdmin.md` (operationele uitwerking), `10_BusinessRules.md` § 12 (nieuw BR-900–904), `08_FunctioneleEisen.md` FR-serie 950+ (nieuw), `23_Gebruikersrollen.md` (platform-admin expliciet buiten de tenant-rollenmatrix).

---

## Context

RouteFlow's bestaande AI-architectuur (ADR-011/012) laat agents voorstellen doen **binnen** een Bedrijf: een route herplannen, een factuur voorbereiden, een capaciteitsprobleem signaleren. Al die agents werken binnen de RLS-tenantgrens (`company_id`) en raken nooit de RouteFlow-codebase zelf.

De platform-eigenaar (niet een tenant-gebruiker) wil twee dingen die buiten dat model vallen:

1. Een **eigen beheeromgeving**, los van enige Bedrijf, met overzicht over het hele platform (alle tenants).
2. Een **Product Agent**: een AI-agent die de RouteFlow-*codebase* zelf mag analyseren en verbetervoorstellen mag doen — inclusief daadwerkelijke code-wijzigingen — op basis van (a) operationele signalen (foutpatronen, agent-run-gezondheid) en (b) **feature requests die tenants zelf indienen** vanuit hun eigen bedrijfsomgeving.

Dit is een fundamenteel ander risicoprofiel dan alle bestaande agents: een voorstel om een route te verplaatsen raakt één bedrijf, foutief; een voorstel om code te wijzigen raakt **alle tenants tegelijk** zodra het gemerged wordt. De bestaande Human-Approval-grens (BR-702) is hiervoor niet automatisch toereikend — die gaat over *domeindata-acties*, niet over *codewijzigingen*.

## Probleem

Hoe ontwerpen we (a) een autorisatiegrens voor platform-brede toegang die principieel losstaat van de bestaande `company_id`-RLS (ADR-003/004), zodat geen enkele tenant-rol ooit per ongeluk platform-toegang erft; (b) een kanaal waarmee tenants feature requests indienen die het product structureel beter maken, zonder dat dit een cross-tenant-zichtbare "roadmap-voting" wordt; (c) een Product Agent die daadwerkelijk code mag voorstellen zonder ooit zelfstandig iets te mergen/deployen — een **strengere**, niet gelijke, Human-Approval-grens dan BR-702; en (d) dit alles zonder nieuwe, aparte agent-infrastructuur naast wat al bestaat (Edge Functions, cron, en — specifiek voor dit ADR — de Claude Code-omgeving waarin ontwikkeld wordt)?

## Gekozen oplossing

### 1. Platform-admin: een autorisatiedimensie, geen rol

Platform-admin is **geen rol binnen een Bedrijf** (23_Gebruikersrollen.md § 1: "een gebruiker heeft één rol per bedrijf" blijft ongewijzigd voor tenant-rollen). Het is een orthogonale vlag op het Supabase Auth-account zelf: een expliciete allowlist (nieuwe tabel `platform_admins`, `user_id` prim. sleutel, geen RLS op `company_id` — dit is de eerste plek in RouteFlow die bewust **buiten** het tenant-RLS-model valt en dus een eigen, even strenge autorisatiecontrole nodig heeft op elke laag: database (RLS-policy die uitsluitend eigen rij mag lezen, geen "alle bedrijven"-query zonder deze vlag), Edge-Function-guards, én UI-routing).

Consequenties:
- Geen enkele bestaande tenant-rol (Eigenaar incluis) krijgt hierdoor platform-toegang — expliciet loskoppelen voorkomt de meest voor de hand liggende fout ("Eigenaar van het grootste account is toch wel vertrouwd?").
- De portal (`46_PlatformAdmin.md` § 1) leeft op een eigen routegroep, buiten de bestaande `(app)`-tenant-routegroep, met een eigen guard die uitsluitend de platform-admin-vlag checkt — nooit `company_id`-context.

### 2. Feature requests: tenant-zijde indienen, platform-zijde trieert

Tenants dienen feature requests in vanuit hun **eigen** bedrijfsomgeving (nieuwe, tenant-scoped tabel `feature_requests`, gewoon RLS op `company_id` — dit deel volgt het bestaande model, geen uitzondering). Dit is een **schrijfkanaal naar boven**, geen cross-tenant zichtbaar bord: bedrijf A ziet nooit dat bedrijf B iets heeft ingediend (BR-904) — geen publieke roadmap-stemming, wel interne clustering door de Product Agent (§ 3).

### 3. Product Agent: analyseert, clustert, stelt voor — merged nooit

De Product Agent combineert twee inputstromen:
- **Reactief:** binnengekomen feature requests, geclusterd over tenants heen (meerdere bedrijven die iets vergelijkbaars vragen wegen zwaarder).
- **Proactief:** operationele signalen die al bestaan (agent-run-foutpercentages uit `agent_runs`, herhaalde patronen) — geen nieuwe telemetrie-infrastructuur, hergebruik van wat Sprint 7 al schrijft.

**Geen nieuwe agent-runtime.** In lijn met het terugkerende principe van ADR-011/A-15/A-17/A-18 ("geen nieuwe infrastructuur") draait de Product Agent **niet** als een aparte Edge Function met een eigen code-generatiemechanisme, maar als een **geplande Claude Code-agent** (de bestaande `schedule`-capaciteit van de ontwikkelomgeving zelf) die op een cadans (bv. wekelijks) de twee inputstromen leest en, waar een concreet voorstel gerechtvaardigd is, een **branch + Pull Request** opent via de bestaande git-workflow — exact dezelfde Git Safety Protocol die nu al voor elke sessie geldt (nooit direct naar `main`, nooit `--force`/`--no-verify`, altijd een nieuwe commit/branch). Er is dus geen nieuw "code-generatie-platform" nodig: de Product Agent is een gestructureerde, terugkerende toepassing van de agent-omgeving waarin dit project al gebouwd wordt.

Elk voorstel (nieuwe tabel `platform_proposals`) bevat, analoog aan het bestaande Explainability-contract (BR-703):
- **wat** het voorstel doet (samenvatting + PR-link)
- **waarom** (trigger: welke feature request(s)/welk foutpatroon)
- **risico-classificatie** (§ 4)
- **gekoppelde feature requests**, indien van toepassing, incl. aantal bedrijven

### 4. Human-Approval-grens — strenger dan BR-702, niet gelijk

BR-702 (ADR-011 § 4) regelt *domeindata*-acties binnen een bedrijf. Codewijzigingen aan het product zelf krijgen een **eigen, strengere** grens (nieuwe harde regels, `10_BusinessRules.md` § 12):

- De Product Agent mag **nooit** zelf mergen, deployen, of naar `main`/productie pushen — uitsluitend een branch + PR openen (BR-901).
- PR's die migraties, RLS-policies, authenticatie, betalingen (Mollie) of secrets/Vault raken krijgen verplicht een **high-risk**-label en worden **nooit automatisch** (op de cron-cadans) getriggerd — uitsluitend on-demand, expliciet gestart door de platform-eigenaar (BR-902). Dit is bewust strenger dan het bestaande "hard/soft"-onderscheid van de domein-agents (ADR-010): daar mag een harde regel een voorstel blokkeren; hier blokkeert een risicoclassificatie **de trigger zelf**, niet alleen het voorstel.
- Goedkeuring in het Platform Admin-portal (§ 3, `46_PlatformAdmin.md`) betekent uitsluitend "deze PR mag gemerged worden" — de merge-actie zelf blijft een aparte, handmatige stap (dezelfde scheiding als "voorstel accepteren" vs. "planning definitief" in ADR-011 § 1, nu toegepast op code i.p.v. planning).

### 5. Verhouding tot MVP/V1/V2-scope (PRD § 5.2)

Dit is **geen** klant-gerichte feature en staat daarom los van de MVP/V1/V2-scopetabel (die uitsluitend het tenant-product beschrijft) — vergelijkbaar met hoe `41_CodingStandards.md`/`40_Implementatieplan.md` ook geen scopetabel-fase hebben. De tenant-zijde (feature request indienen, FR-950) is wél een klant-gerichte UI-toevoeging en verdient een expliciete sprint-plaatsing in `40_Implementatieplan.md` (volgende stap, zie onderaan `46_PlatformAdmin.md`).

## Alternatieven

| Alternatief | Waarom niet |
|---|---|
| **Platform-admin als extra waarde op de bestaande `role`-kolom (`platform_admin` naast Eigenaar/Admin/…)** | Vermengt twee orthogonale concepten (tenant-rol vs. platform-toegang) in één kolom; een bug in tenant-rol-logica zou dan per ongeluk platform-toegang kunnen raken. Een aparte allowlist-tabel maakt de scheiding expliciet en makkelijk te auditen (één query: "wie heeft platform-toegang"). |
| **Publiek zichtbaar feature-request-bord (cross-tenant, zoals Canny/UserVoice)** | Introduceert een geheel nieuwe cross-tenant zichtbaarheidsklasse die nergens anders in RouteFlow bestaat (ADR-004: RLS-tenantisolatie is absoluut) en vereist eigen moderatie/spam-afweging — buiten de huidige scope; kan als latere, bewuste uitbreiding op `feature_requests` (zelfde tabel, extra `is_public`-kolom) zonder herontwerp. |
| **Product Agent als aparte Edge Function met eigen LLM-integratie/code-generatie-SDK** | Herhaalt exact het patroon dat ADR-011 § "Alternatieven" al afwees voor domein-agents ("extern agent framework... breekt met ADR-008's 'één samenhangend backend-platform'-keuze") — hier zou het bovendien een tweede, parallelle code-generatie-stack naast de bestaande ontwikkelomgeving betekenen. De geplande Claude Code-agent (§ 3) hergebruikt wat er al is. |
| **Product Agent mag direct naar `main` mergen bij hoge confidence (analoog aan het "Volautomatisch"-niveau van de domein-agents)** | Het "Volautomatisch"-niveau (15_AIPlanner.md § 8) is zelf al begrensd door de zes BR-702-uitzonderingen; code die alle tenants tegelijk raakt hoort per definitie tot een hoger risiconiveau dan zelfs de zwaarste BR-702-actie (die raakt één bedrijf). Nooit-automatisch-mergen is hier bewust geen tijdelijke voorzichtigheid maar een permanent ontwerpprincipe. |

## Consequenties

**Positief**
- Het product krijgt een structureel kanaal om te leren van échte gebruikersvragen (feature requests) i.p.v. alleen aannames van de platform-eigenaar.
- Hergebruik van de bestaande Explainability- en Human-Approval-patronen (ADR-011/012) houdt het mentale model consistent: "AI stelt voor, mens beslist" geldt nu op twee niveaus (planning én product).
- Geen nieuwe infrastructuur: de Product Agent leunt op de al-bestaande geplande-agent-capaciteit en de bestaande, al-afgedwongen Git Safety Protocol.
- Cross-tenant clustering van feature requests voorkomt dat de platform-eigenaar losse, ongewogen verzoeken één voor één moet beoordelen.

**Negatief / risico's**
- Een tweede autorisatiedimensie (naast RLS) is een nieuw soort fout-oppervlak: een lek in de platform-admin-guard zou in potentie alle tenants raken (i.t.t. een RLS-bug, die doorgaans tot één bedrijf beperkt blijft). Dit weegt zwaar genoeg om als apart, expliciet ADR vast te leggen i.p.v. "even" toe te voegen aan bestaande auth-code.
- Product Agent-PR's die niet als high-risk herkend worden (§ 4) maar het toch zijn (bv. een schijnbaar onschuldige refactor die een RLS-policy subtiel verzwakt) zijn een reëel restrisico — code review door de platform-eigenaar blijft de laatste linie, geen enkele classificatie vervangt dat.
- Feature-request-volume kan groeien zonder dat de Product Agent evenredig meegroeit in kwaliteit — een slecht getrieerd voorstel kost de platform-eigenaar meer tijd dan het bespaart.

**Mitigaties**
- Platform-admin-allowlist wordt net zo behandeld als een secret: alleen via de Supabase SQL Editor/Dashboard gemuteerd, nooit via een Edge-Function-endpoint dat zelf schrijfrechten op die tabel heeft (analoog aan hoe Vault-secrets nooit via een migratiebestand lopen, zie `026_agent_orchestrator_cron.sql`-precedent).
- High-risk-classificatie (BR-902) is bewust **grof en conservatief**: bij twijfel geldt high-risk (nooit automatisch getriggerd), niet andersom.
- Feature requests worden nooit automatisch tot PR — er zit altijd een expliciete triage-/clusterstap (§ 3) tussen "binnengekomen verzoek" en "voorstel in het portal", zodat ruis wordt gefilterd vóór het bij de platform-eigenaar landt.

## Waarom deze keuze toekomstbestendig is

Door platform-admin als orthogonale autorisatiedimensie te ontwerpen (§ 1) in plaats van een uitbreiding van het bestaande rollenmodel, kan het tenant-rollenmodel (23_Gebruikersrollen.md) vrij evolueren zonder ooit per ongeluk platform-toegang te beïnvloeden — en omgekeerd. Door de Product Agent te beperken tot "branch + PR, nooit merge" (§ 4) als **permanent** principe (niet een tijdelijke voorzichtigheidsmaatregel die later "opgeschaald" wordt), blijft de architectuur bruikbaar ongeacht hoe capabel toekomstige modellen worden: de grens ligt bij *wie mag beslissen*, niet bij *hoe goed de AI is* — exact hetzelfde onderliggende principe als BR-702 in ADR-011, nu consistent doorgetrokken naar de codebase zelf.

## Referenties

- `00_PRD.md` § 19 A-23 (nieuw)
- ADR-011 (Human-in-the-Loop AI — het Human-Approval-principe dat dit ADR overneemt en verstrengt)
- ADR-012 (AI Execution Pipeline — Explainability-contract hergebruikt voor Product Agent-voorstellen)
- `46_PlatformAdmin.md` (nieuw, operationele uitwerking: portal, feature-request-flow, Product Agent-triage)
- `10_BusinessRules.md` § 12 (nieuw, BR-900–904)
- `08_FunctioneleEisen.md` FR-serie 950+ (nieuw)
- `23_Gebruikersrollen.md` (platform-admin expliciet buiten de tenant-rollenmatrix)
