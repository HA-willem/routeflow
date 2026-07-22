# ADR-014: Command Bar Intent Routing via LLM (taalmodel routeert, beslist niet)

- **Status:** Accepted
- **Datum:** 2026-07-16
- **Beslisser:** Chief Software Architect (ServOps) i.o.v. platform-eigenaar
- **Bron van waarheid:** `00_PRD.md` § 19 A-24 — deze ADR formaliseert die aanname tot architectuur.
- **Gerelateerd:** ADR-010 (AI Planner drielagen-architectuur — expliciete afwijzing van "black-box ML-first", dit ADR bakent af waarom dat hier niet wordt losgelaten), ADR-007 (Provider Adapter Pattern — de LLM-aanroep volgt hetzelfde vervangbare-provider-patroon als Mapbox/Mollie/360dialog), ADR-011 § 1 (Command Bar, `44_MorningBriefing_UX.md`), PRD § 19 A-21 (Command Bar geïntroduceerd als interface-only).

---

## Context

De ⌘K Command Bar (A-21) heeft sinds de bouw vier vaste "AI-voorbeeldcommando's" (bv. *"Wie kan er vandaag nog een beurt bij hebben?"*) die uitsluitend navigeerden en een toast toonden — expliciet gemarkeerd "Voorbeeld", met de tekst *"AI-commando's komen beschikbaar met de AI Planner (Sprint 7)"*. Sprint 7(-vervolg) is nu gebouwd (Planning/Weather/Capacity/Optimization/Replanning/Invoice Agent, allemaal deterministische regel-/heuristiek-logica, geen taalmodel) — de belofte in de toast is daarmee achterhaald.

Twee, aanvankelijk losse verzoeken kwamen samen: (1) laat de vier voorbeeldcommando's daadwerkelijk iets doen (opgelost door ze te koppelen aan echte, bestaande queries — geen ADR nodig, standaard Server-Action-werk); (2) laat de gebruiker **vrije tekst** typen die het systeem zelf naar de juiste actie vertaalt — dát vereist een taalmodel, en dat is nieuw in dit project.

## Probleem

Geen enkele bestaande agent (43_AI_Agents.md) gebruikt een taalmodel — ADR-010 wees "Volledig automatische black-box (ML-first) planner" expliciet af ten gunste van reproduceerbare, overschrijfbare heuristieken. Hoe introduceren we vrije-tekst-interpretatie in de Command Bar zonder dat principe te breken, zonder een nieuwe, ondoorzichtige beslissingslaag te creëren, en met een expliciete grens die voorkomt dat "het is toch al een taalmodel, laten we het ook voor X gebruiken" ongemerkt verder kruipt?

## Gekozen oplossing

**Het taalmodel routeert, het beslist niet.** Concreet: vrije tekst in de Command Bar gaat naar Claude (Anthropic API) met een **gesloten set** van bekende commando's (op dit moment de vier bestaande, elk met een vaste, deterministische onderliggende actie — capaciteitsquery, medewerkerslijst, navigatie naar wachtrij/planning). Het model kiest uitsluitend **welke van deze vooraf-goedgekeurde acties** het beste bij de tekst past (structured output/tool-use — een enum van commando-ID's, geen vrije tekst-respons, geen gegenereerde code, geen directe database-toegang voor het model). De uitvoering van de gekozen actie is en blijft de bestaande, deterministische logica — het model genereert nooit zelf een antwoord, een voorstel, of een schrijfactie.

Dit is expliciet **geen** uitbreiding van ADR-010: geen enkele agent (Planning/Weather/Capacity/Optimization/Replanning/Invoice) gebruikt hierdoor een taalmodel voor zijn eigen redenering. De grens ligt hard bij de Command Bar-invoerlaag; een toekomstige wens om een agent zélf met een taalmodel te laten redeneren vereist een aparte, nieuwe ADR (analoog aan hoe ADR-013 zijn eigen grenzen expliciet afbakende om scope-kruip te voorkomen).

### Architectuur

- **Provider Adapter Pattern (ADR-007), niet een nieuw patroon:** `lib/ai/provider.ts` (interface `IntentRouterProvider`) + `lib/ai/anthropic.ts` (Claude-implementatie) — zelfde vorm als `RoutingProvider`/`WeatherProvider`/`MollieProvider`. Vervangbaar, mockbaar voor tests (geen echte API-calls in de testsuite).
- **Gesloten commando-set:** het model krijgt per aanroep exact de lijst beschikbare commando's mee (geen open-eindige "doe wat de gebruiker vraagt") — nieuwe commando's vereisen een expliciete toevoeging aan die lijst in code, niet een prompt-wijziging die het model meer vrijheid geeft.
- **Geen schrijftoegang voor het model:** de gekozen actie is een Server Action die exact dezelfde RLS-gebonden queries uitvoert als een handmatig geklikte knop — het model ziet nooit ruwe database-resultaten, geeft nooit zelf SQL of code terug.
- **Secret:** `ANTHROPIC_API_KEY`, uitsluitend server-side (Server Action), nooit client-exposed — zelfde behandeling als `MOLLIE_API_KEY`/`SUPABASE_SERVICE_ROLE_KEY`.
- **Graceful degradation:** ontbrekende/foutieve API-key of een onbereikbare Anthropic-API resulteert in "kon je verzoek niet herkennen, probeer een van de commando's hieronder" — nooit een crash, nooit een stille verkeerde actie (analoog aan AP-04's bestaande "weerdata tijdelijk niet beschikbaar, planning gaat door"-patroon).

## Alternatieven

| Alternatief | Waarom niet |
|---|---|
| **Taalmodel genereert zelf het antwoord/de actie (vrije tekst/code-generatie)** | Precies het "ondoorzichtige model"-risico dat ADR-010 al afwees; onvoorspelbaar, niet reproduceerbaar, potentieel een schrijfpad buiten de bestaande RLS/Server-Action-grenzen om. |
| **Taalmodel krijgt directe database/tool-toegang (bv. eigen SQL-queries)** | Zelfde risicoklasse als een ongecontroleerd schrijfpad — de Command Bar zou dan een nieuwe, moeilijk te auditen autorisatiegrens worden naast RLS. |
| **Regex/keyword-matching i.p.v. een taalmodel** | Simpeler en zonder externe afhankelijkheid, maar expliciet niet wat gevraagd is (échte natuurlijke-taal-herkenning, niet alleen de vier exacte voorbeeldzinnen); blijft een mogelijke toekomstige degradatie-fallback, geen vervanging. |
| **Agents zelf laten redeneren met het taalmodel** | Expliciet afgewezen voor déze stap (platform-eigenaar koos bewust de kleinere, ADR-010-conforme variant) — apart traject, aparte ADR, mocht dat ooit gewenst zijn. |

## Consequenties

**Positief**
- Vrije-tekst-commando's worden mogelijk zonder een van de bestaande architectuurprincipes (RLS, deterministische agents, Human Approval) te doorbreken.
- Vervangbaar (ADR-007-patroon) — een providerwissel (bv. later een ander model) is een geïsoleerde wijziging.
- Expliciete grens (routeren, niet beslissen) is nu vastgelegd vóórdat er code is, precies zoals ADR-013 dat deed — voorkomt latere "het is toch al een taalmodel"-scope-kruip.

**Negatief / risico's**
- Nieuwe externe afhankelijkheid + kosten per aanroep (Anthropic API) — voor een functie (4 commando's routeren) die ook zonder taalmodel had gekund.
- Vrije tekst van de gebruiker gaat naar een derde partij (Anthropic) — geen klant-/bedrijfsdata in de prompt nodig (alleen de getypte zin + de commandolijst), maar wel een nieuw datastroom-punt om te documenteren (36_Security.md-relevant, nog niet bijgewerkt).
- ~~Live niet te verifiëren in de ontwikkelomgeving van vandaag: geen `ANTHROPIC_API_KEY` beschikbaar tijdens de bouw~~ — opgelost 2026-07-16: key ingesteld, live geverifieerd (echte Anthropic-aanroep, Command Bar → `routeAiCommand()` → correcte commando-match).

**Mitigaties**
- Gesloten commando-set + geen model-schrijftoegang (zie Architectuur) beperkt de blast radius tot "verkeerde navigatie", nooit een verkeerde mutatie.
- Graceful degradation zorgt dat een API-storing de Command Bar nooit onbruikbaar maakt — de bestaande klantzoeken/navigatie blijven altijd werken.
- Kosten-risico is geadresseerd met observabiliteit: elke aanroep logt tokengebruik naar `ai_usage_events` (`032_ai_usage_tracking.sql`), zichtbaar in het platform-admin-portal per Bedrijf (`46_PlatformAdmin.md` § 1.4) — geen budgetlimiet, wel zichtbaarheid vóórdat kosten materieel worden.

## Referenties

- `00_PRD.md` § 19 A-21 (Command Bar), A-24 (nieuw, dit ADR)
- ADR-010 (AI Planner — grens die dit ADR expliciet niet doorbreekt)
- ADR-007 (Provider Adapter Pattern — hergebruikt patroon)
- ADR-011 § 1, `44_MorningBriefing_UX.md` (Command Bar-context)
