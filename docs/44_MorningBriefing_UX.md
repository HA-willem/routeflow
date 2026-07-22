# 44 — Morning Briefing UX

**Status:** DONE
**Versie:** 1.2
**Bron van waarheid:** `docs/adr/ADR-011-human-in-the-loop-ai.md` § 1 (Morning Briefing, primair startscherm) — dit document mag ADR-011 niet tegenspreken; het is de **UX-uitwerking** van wat ADR-011 op architectuurniveau vastlegt (analoog aan hoe `24_UI_UX.md`/`42_DesignSystem.md` de UX-uitwerking zijn van de bredere productbeslissingen).
**Werkinstructie:** zie `MASTER_PROMPT.md`.
**Relaties:** `docs/adr/ADR-011-human-in-the-loop-ai.md`, `docs/adr/ADR-012-ai-execution-pipeline.md` (Explanation Generator-schema achter § 5/§ 8), `45_AgentMemory.md` (Organizational Memory — geleerde voorkeuren zichtbaar in § 8 Explainable AI, feedback-loop achter § 5's kaartacties), `43_AI_Agents.md` (agents achter elk onderdeel), `42_DesignSystem.md` (visuele taal, Housapp/Linear-inspiratieprincipe — hier toegepast, niet herhaald), `24_UI_UX.md` (toon & copy, lege-staat-conventies), `28_Dashboard.md` (bestaande layout-precedent dat dit document verdiept), `29_MobieleApp.md` (Medewerker-variant), `23_Gebruikersrollen.md` (rollen/rechtenmatrix), `10_BusinessRules.md` (BR-200–205, BR-700–705), `08_FunctioneleEisen.md` FR-900–902.

---

## Doel van dit document

ADR-011 legt vast **dat** de Morning Briefing het primaire startscherm is en **welke** informatie/acties hij bevat op architectuurniveau. Dit document werkt dat uit tot een volledige gebruikerservaring: per rol, per pagina-onderdeel, met concrete voorbeeldteksten, exacte interactieflows en alle randgevallen — de blauwdruk waar een toekomstige Sprint 7-implementatie (`40_Implementatieplan.md`) direct tegen kan bouwen, zonder nieuwe UX-beslissingen te hoeven nemen tijdens de bouw zelf.

**Ontwerprichting:** een premium SaaS-ervaring — de rust, witruimte en informatiehiërarchie van tools als Housapp en Linear als *principe*-inspiratie (dichtheid zonder rommeligheid, één scan-pad, één accentkleur, stille motion), zoals al vastgelegd in `42_DesignSystem.md` § 12. Dit document kopieert geen layouts of visuele elementen van die producten — het past hetzelfde ontwerpprincipe toe op een nieuw scherm.

---

## 1. Doel

**Waarom de Morning Briefing het eerste scherm van ServOps is.** Traditionele planningssoftware opent op een leeg of grotendeels leeg rooster: de planner moet zelf ontdekken wat er die dag speelt, wat er 's nachts veranderd is, en wat er moet gebeuren. Dat is precies het werk dat ServOps overneemt (ADR-011 § Context: *"AI doet het denkwerk. De gebruiker neemt de beslissing."*). Als de applicatie zou openen op een leeg rooster of een generiek dashboard, zou de gebruiker alsnog zelf op zoek moeten naar wat er die dag toe doet — de kernbelofte van een AI-first platform zou dan alleen in de motor zitten, niet in de eerste seconde ervaring. De Morning Briefing is daarom geen los "extra"-scherm maar de plek waar ServOps zijn belangrijkste waarde toont vóórdat de gebruiker ook maar één klik heeft gedaan.

**Waarom planners niet meer starten met een leeg rooster, maar met AI-voorstellen.** Acht agents (`43_AI_Agents.md`) hebben tussen 00:00–06:00 (ADR-011 § 6) de nacht al gebruikt om te analyseren, te optimaliseren en te signaleren. Het resultaat van die nacht — niet de rauwe planning-tools zelf — is wat de gebruiker als eerste ziet. Dit verschuift de rol van de planner van *bouwer* naar *supervisor*: in plaats van "wat moet ik vandaag plannen?" wordt de eerste vraag "welke van deze voorstellen keur ik goed?". Een lege planning is voor ServOps een **uitzonderingssituatie** (nieuw bedrijf, geen dienstafspraken — zie § 10), nooit het startpunt van een normale werkdag.

---

## 2. Gebruikersrollen

De Morning Briefing is niet één-op-één hetzelfde scherm voor iedereen — de rechtenmatrix (`23_Gebruikersrollen.md` § 2) en het device-onderscheid (desktop vs. PWA) bepalen wat zichtbaar is.

### 2.1 Planner (desktop)

| | |
|---|---|
| **Zichtbare informatie** | Volledige bedrijfsbrede briefing: medewerkers, routes, weer, capaciteit, voorstellen, waarschuwingen. **Geen** omzetprognose/marge-detail (23 rechtenmatrix: Planner heeft geen Rapportage-volledig-toegang) — de Revenue Agent-tegel toont voor deze rol alleen een neutrale samenvatting ("Planning dekt de week", geen bedragen), geen financiële cijfers. |
| **Actieve agents** | Planning, Replanning, Weather, Optimization, Capacity, Communication (concept) — volledig zichtbaar en behandelbaar. Revenue Agent en Invoice Agent draaien wel (voor de Eigenaar-briefing), maar hun output is voor deze rol niet zichtbaar of alleen als neutrale statusregel. |
| **Mogelijke acties** | Voorstellen accepteren (alles/individueel), aanpassen, afwijzen, doorklikken naar `/planning`. Geen toegang tot automatiseringsniveau-instellingen (dat is Eigenaar/Admin, § 2.2) en geen factuur-finalisatie (Administratie-domein, 23 rechtenmatrix). |

### 2.2 Eigenaar (desktop)

| | |
|---|---|
| **Zichtbare informatie** | Alles wat de Planner ziet, **plus** volledige Revenue Agent-output (omzetprognose, marge-signalen, verlieslatende routes) en Invoice Agent-waarschuwingen (openstaande/verlopen conceptfacturen) — de enige rol met het complete acht-agent-beeld. |
| **Actieve agents** | Alle acht, volledig zichtbaar. |
| **Mogelijke acties** | Alles wat de Planner kan, **plus**: automatiseringsniveau per agent/actietype configureren (15_AIPlanner.md § 8 — Voorstel/Semi-automatisch/Volautomatisch, altijd binnen de BR-702-grens), confidence-drempel aanpassen (ADR-012 § 7, default 0,7). Dit is de enige plek waar de "hoeveel autonomie geef ik de AI"-knop zit. |

### 2.3 Medewerker (mobiel, PWA)

De Medewerker heeft **geen** bedrijfsbrede Morning Briefing — dat zou P1/P2 (`23_Gebruikersrollen.md` § 3: geen prijzen/facturen/omzet, alleen eigen route) direct schenden. In plaats daarvan is de bestaande PWA-startpagina (`/m`, `29_MobieleApp.md` § 2.1, "Dagroute") de Medewerker-variant van hetzelfde principe — een kleine, persoonlijke briefing in plaats van een lege dagstart:

| | |
|---|---|
| **Zichtbare informatie** | Uitsluitend eigen route van vandaag: aantal beurten, volgorde, verwachte tijden, weer-impact op *zijn eigen* stops (bv. "Regen vanaf 15:00 — je laatste twee stops kunnen nat worden"). Geen bedrijfsbrede KPI's, geen collega's, geen omzet. |
| **Actieve agents** | Weather Agent (vertaald naar eigen route), Replanning Agent (alleen als een wijziging zíjn route raakt — dan een korte, realtime highlight, `29_MobieleApp.md` § 2.1). Optimization/Capacity/Revenue/Invoice Agent zijn voor deze rol niet zichtbaar — hun output is nooit voor de Medewerker bedoeld. |
| **Mogelijke acties** | Route starten, navigeren, beurt afronden/niet-thuis melden (bestaand, `29_MobieleApp.md` § 2.2–2.4). **Geen** accepteren/afwijzen van AI-voorstellen — die beslissing ligt bij Planner/Eigenaar; de Medewerker voert uit wat al goedgekeurd is. |

---

## 3. Pagina-opbouw

Volgorde volgt het scan-pad-principe (`42_DesignSystem.md` § 12.2): eerst het menselijke ("goedemorgen"), dan het samengevatte ("wat moet ik weten"), dan het gedetailleerde ("wat moet ik beslissen"), dan het ondersteunende (KPI's, snelle acties). Onderstaande is de vaste volgorde voor Planner/Eigenaar (desktop); de Medewerker-variant (§ 2.3) is een apart, veel kleiner scherm dat dit volgorde-principe niet nodig heeft.

### 3.1 Welkomstblok

- **Doel:** de menselijke opening — bevestigt dat de gebruiker op de juiste plek is, zet de toon (rustig, geen alarm).
- **Inhoud:** naam-gebaseerde begroeting (ochtend/middag/avond-variant, bestaand patroon uit `app/(app)/page.tsx`), datum, en de **Morning Mode**-indicator (🟢/🟡/🔴, § 6) als enige kleur-accent in dit blok.
- **Interactie:** geen — puur informatief. Geen knoppen in dit blok (voorkomt dat de eerste blik al een beslissing vraagt).

### 3.2 Dagoverzicht

- **Doel:** de feitelijke basis in één oogopslag — hoeveel, wie, waar.
- **Inhoud:** aantal beurten vandaag, aantal actieve routes, aantal beschikbare/afwezige medewerkers, wachtrij-omvang.
- **Interactie:** elk getal is klikbaar en springt naar het relevante detail (bv. "12 beurten" → `/planning?view=dag`).

### 3.3 Weer

- **Doel:** context die de rest van de briefing verklaart — een weersgedreven voorstel is pas logisch als het weer zelf al zichtbaar is.
- **Inhoud:** zie § 7 (volledige uitwerking).
- **Interactie:** uitklapbaar naar de volledige dagtijdlijn (§ 7); standaard samengevouwen tot de kernregel ("Regen vanaf 15:00, 4 beurten geraakt").

### 3.4 AI Confidence

- **Doel:** in één blik weten hoe zeker de AI is over de dag als geheel — niet per voorstel (dat zit in § 3.6), maar een geaggregeerd vertrouwenssignaal.
- **Inhoud:** een samengevoegde confidence-indicator (gemiddelde/laagste van de dag-kritieke voorstellen, ADR-012 § 3) — getoond als korte tekst + subtiele visuele indicator, nooit als kaal percentage zonder context ("Hoog vertrouwen — de planning van vandaag is stabiel" i.p.v. "94%").
- **Interactie:** klik toont welke voorstellen de score het meest beïnvloeden (koppelt door naar § 3.6).

### 3.5 AI Samenvatting

- **Doel:** de kern van de briefing — één alinea die vervangt wat een planner vroeger zelf moest uitzoeken.
- **Inhoud:** zie § 4 (volledige uitwerking, 10+ voorbeeldscenario's).
- **Interactie:** platte tekst, geen knoppen erin — verwijst naar de voorstellen eronder (§ 3.6) voor actie.

### 3.6 Voorstellen

- **Doel:** de daadwerkelijke beslispunten van de dag.
- **Inhoud:** zie § 5 (volledige uitwerking: kaart-structuur, velden, acties).
- **Interactie:** accepteren/bewerken/afwijzen per kaart, plus "alles accepteren" bovenaan de lijst (ADR-011 § 1).

### 3.7 Waarschuwingen

- **Doel:** dingen die *aandacht* vragen maar geen "voorstel met een knop" zijn — bv. een openstaande factuur die morgen vervalt, of een medewerker zonder ingevulde beschikbaarheid voor volgende week.
- **Inhoud:** korte lijst, elk item met ernst-indicator (informatief/aandacht/urgent — nooit puur kleur, 42_DesignSystem.md § 1) en een directe link naar waar het opgelost wordt (nooit opgelost *in* de briefing zelf — de briefing is een overzicht, geen los formulier per waarschuwing).
- **Interactie:** klik → navigeert naar het relevante scherm (facturen, instellingen-medewerkers, etc.).

### 3.8 KPI's

- **Doel:** het rustige, niet-actiegerichte cijferbeeld — voortzetting van het bestaande dashboard-concept (`28_Dashboard.md` § 1), nu ondergeschikt aan de AI-inhoud erboven in plaats van de hoofdmoot van het scherm.
- **Inhoud:** omzet deze maand, openstaande facturen, beurten deze week, plandruk (bestaande KPICard-set, alleen zichtbaar voor rollen met rapportage-toegang, § 2).
- **Interactie:** elke KPICard klikbaar naar het bijbehorende detailscherm (bestaand gedrag).

### 3.9 Snelle acties

- **Doel:** de expliciete uitgang van de briefing voor wie liever zelf verder werkt dan voorstellen te reviewen.
- **Inhoud:** "Naar planner", "Herplan-wachtrij bekijken", "Nieuwe klant" (bestaande primaire acties, `27_PaginaOverzicht.md` § 1.1).
- **Interactie:** directe navigatie, geen tussenstap.

---

## 4. AI Samenvatting

De samenvatting spreekt de gebruiker **direct, persoonlijk en informeel** aan ("je", `24_UI_UX.md` § 6) — een compacte alinea, geen opsomming, alsof een collega net de nacht heeft doorgenomen. Vaste opbouw: begroeting → wat is gecontroleerd → belangrijkste bevinding(en) → grootste concrete winst/risico → (indien van toepassing) een specifiek advies. Onderstaand tien scenario's die samen de bandbreedte dekken (rustige dag tot meerdere risico's):

**1. Meerdere optimalisaties (het gegeven voorbeeld):**
> Goedemorgen Willem. Ik heb vannacht de planning gecontroleerd. Ik heb drie optimalisaties gevonden. De grootste besparing bedraagt 31 minuten. Door regen vanaf 15:00 adviseer ik Route Zuid naar de ochtend te verplaatsen.

**2. Rustige dag (🟢 Green Day):**
> Goedemorgen Willem. Ik heb vannacht alles gecontroleerd — geen wijzigingen nodig. Alle 14 beurten staan gepland, iedereen is beschikbaar, en het weer werkt vandaag mee. Fijne dag.

**3. Ziekmelding, automatisch herverdeeld:**
> Goedemorgen Willem. Marieke heeft zich vanochtend ziekgemeld. Ik heb haar 5 beurten verdeeld over Jan en Sanne — beiden blijven ruim binnen hun werkdag. Eén beurt kon ik niet plaatsen; die staat in de wachtrij.

**4. Capaciteitswaarschuwing:**
> Goedemorgen Willem. Vandaag is het krap: 18 beurten voor 3 medewerkers, dat past net. Woensdag wordt het lastiger — dan heb je 22 beurten en maar 2 medewerkers beschikbaar. Wil je daar nu al naar kijken?

**5. Meerdere risico's tegelijk (🔴 Red Day):**
> Goedemorgen Willem. Vandaag vraagt wat extra aandacht: Piet is ziek, er is code-oranje-wind vanaf de middag, en Route Noord zit al aan de werkdaglimiet. Ik heb twee voorstellen klaarstaan, maar drie beurten kan ik niet automatisch oplossen — die wil ik graag met je doornemen.

**6. Reistijdbesparing zonder verstoring:**
> Goedemorgen Willem. Ik heb Route Oost lichtjes herschikt — dezelfde beurten, andere volgorde. Dat scheelt 12 minuten rijden zonder dat er iets verschuift voor je klanten.

**7. Weersgevoelige diensten, geen verplaatsing nodig:**
> Goedemorgen Willem. Het regent vandaag, maar geen van de geplande diensten is weersgevoelig — de planning blijft ongewijzigd.

**8. Nieuwe klant geclusterd:**
> Goedemorgen Willem. De nieuwe klant in de Vogelbuurt (toegevoegd gisteren) heb ik ingepland bij de bestaande ronde van donderdag — dezelfde straat als twee andere klanten, dus geen extra reistijd.

**9. Flexvenster-optimalisatie:**
> Goedemorgen Willem. Twee klanten met een ruim flexvenster heb ik een dag naar voren gehaald — dat maakt donderdag rustiger en voorkomt dat je dan boven de werkdaglimiet uitkomt.

**10. Facturatie-signaal (Eigenaar-variant):**
> Goedemorgen Willem. Naast de planning: 3 conceptfacturen staan klaar voor controle, en 1 factuur van vorige maand is nog niet betaald. Verder een rustige planningsdag.

**11. AI heeft niets te optimaliseren, wel een waarschuwing:**
> Goedemorgen Willem. De planning zelf is optimaal — niets te verbeteren. Wel zie ik dat Sanne volgende week nog geen beschikbaarheid heeft doorgegeven; misschien iets voor een berichtje.

---

## 5. AI Voorstellen

Elk voorstel is een kaart met een vaste structuur — rechtstreeks gevoed door het Explanation Generator-outputschema (ADR-012 § 6), nooit een los, ad-hoc tekstblok per agent:

| Veld | Voorbeeld |
|---|---|
| **Titel** | "Route Zuid verplaatsen naar de ochtend" |
| **Samenvatting** | "3 beurten van Route Zuid verschuiven van 14:00–17:00 naar 09:00–12:00." |
| **Waarom** | "Regen vanaf 15:00 (neerslagkans 85%) raakt 2 weersgevoelige diensten op deze route." |
| **Business rules** | BR-101 (flexvenster gerespecteerd), 15_AIPlanner.md § 6.3 (regen-drempel overschreden) |
| **Confidence** | Hoog (0,88 → getoond als 88, ADR-012 § 3) |
| **Impact** | 3 beurten, 1 medewerker (Jan) |
| **Verwachte winst** | Voorkomt uitstel/klacht bij 2 weersgevoelige diensten; 0 extra reistijd |
| **Alternatieven** | "Overwogen: verplaatsen naar morgen — afgewezen, morgen is Jan al vol (BR-202)." |

**Acties per kaart:**
- **Accepteren** — voert direct uit (via de bestaande Edge Functions, `route-move-job`/`route-optimize`), toont een bevestiging + "ongedaan maken" (consistent met `42_DesignSystem.md` § 20). Registreert impliciet 👍 (FR-902, `45_AgentMemory.md` § 8) op de onderliggende voorkeur(en), indien het voorstel er één gebruikte.
- **Bewerken** — opent de planner (`/planning`) met dit voorstel al toegepast als uitgangspunt, niet als los bewerkformulier in de briefing zelf (§ 9). Registreert automatisch ✏️ (FR-902) — geen aparte feedback-stap nodig.
- **Afwijzen** — voorstel verdwijnt, gelogd (ADR-012 § 8, `approval_status: rejected`). Toont een korte vervolgvraag *"Was dit voorstel niet handig?"* (👎, optioneel, FR-902) — verzwakt de onderliggende voorkeur zonder de gebruiker te verplichten een reden te geven.

Naast accepteren/bewerken/afwijzen heeft elke kaart een expliciete, kleine 👍/👎-feedbackknop (FR-902, `45_AgentMemory.md` § 8) — onafhankelijk van de hoofdactie bruikbaar (een gebruiker kan een voorstel accepteren én toch 👎 geven, bv. "correct maar ik had het liever anders zien onderbouwd").

"Alles accepteren" bovenaan de lijst accepteert elke kaart in de huidige weergave in één keer — met dezelfde individuele logging per kaart eronder (geen verzamelde, ondoorzichtige batch-actie).

---

## 6. Morning Modes

De modus is een **afgeleide**, geen los ingesteld veld — bepaald door het aantal en de ernst van openstaande voorstellen/waarschuwingen bij het samenstellen van de Briefing (ADR-012, Orchestrator-assemblagestap):

### 🟢 Green Day
**Wanneer actief:** geen enkel voorstel vereist menselijke aandacht (alles auto-uitgevoerd op een geconfigureerd niveau, of er zijn simpelweg geen wijzigingen) én geen waarschuwingen boven de informatieve ernst-drempel én geen BR-702-conflicten in de wachtrij.
**Ervaring:** het Welkomstblok (§ 3.1) toont een rustige, groene indicator; AI Samenvatting is kort (scenario 2/6/7, § 4); Voorstellen-sectie (§ 3.6) is leeg of toont alleen al-uitgevoerde, informatieve items.

### 🟡 Yellow Day
**Wanneer actief:** één of meer voorstellen wachten op beoordeling, maar geen daarvan raakt een BR-702-actie of een acuut risico (bv. een routineoptimalisatie, een niet-urgente weerswaarschuwing).
**Ervaring:** indicator geel; AI Samenvatting noemt het aantal voorstellen expliciet (scenario 1/3/8/9); Voorstellen-sectie toont de kaarten, geen extra visuele nadruk nodig — dit is de meest voorkomende, "normale" modus.

### 🔴 Red Day
**Wanneer actief:** meerdere gelijktijdige risico's (bv. ziekmelding + capaciteitstekort + weerswaarschuwing), of één voorstel dat een BR-702-grens raakt en dus per definitie niet automatisch kan, of onplaatsbare beurten boven een drempel (AP-01/AP-02, `15_AIPlanner.md` § 11).
**Ervaring:** indicator rood — nooit alarmerend fel, consistent met `42_DesignSystem.md` § 1 (kleur is uitzondering, geen paniekvlak); AI Samenvatting benoemt expliciet dat menselijke aandacht nodig is (scenario 5, § 4); Voorstellen-sectie toont de risicovolle items bovenaan, vóór routine-optimalisaties.

---

## 7. Weer

De Weather Agent (`43_AI_Agents.md` § 6) levert meer dan een huidige-temperatuur-widget — de briefing toont de **werkdag als tijdlijn**, omdat weer een tijdsgebonden risico is (regen om 15:00 is niet hetzelfde als regen om 08:00):

| Onderdeel | Inhoud |
|---|---|
| **Regenlijn** | Uur-voor-uur neerslagkans over het werkvenster (bv. 08:00–17:00), visueel als een dunne, rustige lijn/staafjes-tijdlijn — geen drukke grafiek, één signaal (regenkans) per uur. |
| **Temperatuur** | Min/max voor de dag, met een korte notitie bij extremen (vorst/hitte) die diensten raken (`weather_sensitivity_type`, 12_Entiteiten.md § 5). |
| **Wind** | Windkracht (Bft), met markering vanaf de bestaande drempel (≥8 Bft, 15_AIPlanner.md § 6.3) — relevant voor hoogwerk/ladderwerk. |
| **UV** | Alleen getoond wanneer relevant voor buitenwerk in de zomerperiode — geen jaarrond-vast onderdeel. |
| **Tijdlijn van de dag** | De regenlijn/wind/temperatuur samengevoegd op één horizontale as, met de geplande routes/stops als markers erop — zo is in één oogopslag te zien *welke* stop op *welk* moment risico loopt. |
| **Impact op routes** | Per geraakte route/beurt een expliciete koppeling naar het bijbehorende voorstel (§ 5) — het weer-blok toont nooit een risico zonder dat er een concrete vervolgstap (voorstel of "geen actie nodig", scenario 7) aan hangt. |

**Hoe de Weather Agent dit gebruikt:** dezelfde drempellogica als vandaag al gespecificeerd (`15_AIPlanner.md` § 6.3: regen ≥70%/≥2mm/u, vorst <0°C, wind ≥8 Bft) bepaalt *welke* beurten worden gemarkeerd; de tijdlijn-weergave hierboven is een UI-verrijking van diezelfde output, geen nieuwe beslislogica. Bij API-onbereikbaarheid (AP-04) toont dit blok een neutrale melding ("Weersdata tijdelijk niet beschikbaar") in plaats van te verdwijnen — consistent met ADR-012 § 4's degradatieprincipe.

---

## 8. Explainable AI

Elk voorstel (§ 5) heeft een uitklapbare "Waarom?" — dezelfde vier vragen, altijd in deze volgorde, rechtstreeks gevoed door BR-700/703 en het ADR-012 § 6-schema:

1. **Waarom?** — de mens-leesbare reden (het `reasoning`-veld), één tot twee zinnen, geen jargon.
2. **Welke gegevens?** — de gebruikte bronnen (bv. "KNMI-weerdata, opgehaald 06:03", "reistijd-cache, bijgewerkt gisteren"), inclusief eventuele geleerde voorkeuren die meewogen (bv. "Deze klant accepteert regenuitstel doorgaans probleemloos — Organizational Memory, bevestigd", `45_AgentMemory.md` § 5) — maakt de AI navolgbaar, niet alleen "vertrouw me".
3. **Welke regels?** — de toegepaste business rules met leesbare naam, niet alleen een code (bv. "Werkdaglimiet (max. 8,5 uur)" i.p.v. kaal "BR-202").
4. **Waarom niet alternatief B?** — het `possible_drawbacks`/alternatieven-veld, expliciet: wat is er nog meer overwogen en waarom won dit voorstel het (bv. "Overwogen: verplaatsen naar morgen — afgewezen, morgen is Jan al vol").

Dit uitklappatroon is een verrijking van het bestaande `WhyExplanation`-component (`26_ComponentLibrary.md` § 4) — zelfde interactieprincipe (klik "?", inline toelichting, geen aparte pagina), nu met de twee nieuwe velden (gegevens, alternatieven) die BR-703 boven op het bestaande BR-700 toevoegt.

---

## 9. Interactieflow

```
Gebruiker opent ServOps
        ↓
Morning Briefing (§ 3.1–3.2: welkom + dagoverzicht, direct zichtbaar, geen laadvertraging — ADR-011 § 1)
        ↓
AI Samenvatting (§ 3.5/§ 4: de kern in één alinea)
        ↓
Voorstellen bekijken (§ 3.6/§ 5: kaarten met wat/waarom/regels/confidence/impact/winst/alternatieven)
        ↓
Accepteren / aanpassen / afwijzen (per kaart, of "alles accepteren" — § 5)
        ↓
Planning bijgewerkt (uitvoering via bestaande Edge Functions, BR-702-grens gerespecteerd)
        ↓
Planner openen (optioneel — wie klaar is met de briefing, of wie liever zelf verder plant, § 3.9)
```

Deze flow is de UX-vertaling van ADR-011 § 6 (Event Flow) en ADR-012 § 9 (sequence diagram) — geen nieuwe stappen, dezelfde onderliggende cyclus nu vanuit gebruikersperspectief beschreven.

---

## 10. Empty States

Volgens `24_UI_UX.md` § 4: nooit een kaal "niets"-scherm, altijd een expliciete, mens-leesbare bevestiging + waar relevant een actie.

| Situatie | Copy | Actie |
|---|---|---|
| **Geen wijzigingen** (Green Day, alles al optimaal) | "Alles gepland, geen wijzigingen nodig. Fijne dag, {voornaam}." | Geen — puur geruststellend (evt. "Naar planner" als secundaire link) |
| **Geen planning** (nieuw bedrijf, nog geen dienstafspraken — de enige *echte* lege staat) | "Nog niets gepland. Voeg klanten met dienstafspraken toe; wij stellen de eerste week voor." (bestaande copy, `42_DesignSystem.md` § 22) | "Naar klanten" |
| **Slecht weer** (weer geraakt, geen weersgevoelige diensten getroffen) | "Het weer werkt vandaag niet mee, maar geen van je diensten is hier gevoelig voor — planning blijft ongewijzigd." | Geen |
| **Medewerker ziek, geen herverdeling mogelijk** | "Marieke heeft zich ziekgemeld. Ik kon haar beurten niet automatisch herverdelen — iedereen zit al vol. Wil je dit handmatig bekijken?" | "Naar herplan-wachtrij" |
| **AI heeft geen voorstel** (analyse gedraaid, niets te verbeteren — onderscheiden van "geen wijzigingen": hier heeft de AI wél gezocht en expliciet niets gevonden) | "Ik heb de planning doorgenomen en zie geen verbetering — je huidige planning is al optimaal." (AP-05-precedent, `15_AIPlanner.md` § 11) | Geen |

---

## 11. Toekomstvisie

De Morning Briefing is het natuurlijke landingspunt voor elke toekomstige agent uit `43_AI_Agents.md` § 15 (Toekomstige Agents) — geen van onderstaande vereist een nieuw startscherm, alleen een nieuwe tegel/sectie binnen de bestaande opbouw (§ 3):

| Toekomstige uitbreiding | Koppeling aan bestaande roadmap |
|---|---|
| **Voice Assistant** | Voice Agent (`43_AI_Agents.md` § 15) — de Briefing zelf hardop laten voorlezen/bevragen ("Wat staat er vandaag?"), zelfde onderliggende AI Samenvatting (§ 4) als bron. |
| **Chat met AI** | Geen apart chatvenster nodig als eerste stap — de "Waarom?"-uitklap (§ 8) is al een vraag-antwoord-patroon; een vrije-tekst-vervolgvraag ("En als ik dit combineer met morgen?") is de logische volgende stap op dezelfde databron. |
| **Dagelijkse briefing** | Al de kern van dit document — toekomstige uitbreiding is een **geschiedenis/trend-weergave** ("deze week bespaarde de AI gemiddeld 22 minuten per dag") bovenop de dagelijkse briefing, geen vervanging ervan. |
| **Financiële inzichten** | Uitbreiding van de Revenue Agent-tegel (§ 2.2, Eigenaar-only) — marge-trends, klant-winstgevendheid over tijd. |
| **Capaciteitsvoorspellingen** | Uitbreiding van de Capacity Agent (§ 3.2/§ 6) van "vandaag/morgen" naar een meerdere-weken-vooruitblik. |
| **Verkoopkansen** | Sales Agent (`43_AI_Agents.md` § 15) — bv. "3 klanten in Wijk Noord hebben nog geen dienstafspraak voor het najaar", als nieuwe waarschuwingen-categorie (§ 3.7). |
| **Onderhoudswaarschuwingen** | Maintenance Agent (`43_AI_Agents.md` § 15) — voertuig-/materieelonderhoud als nieuwe waarschuwingen-categorie (§ 3.7), zelfde patroon als een openstaande factuur-waarschuwing. |

Elke uitbreiding volgt hetzelfde contract als de acht bestaande agents (ADR-012 § 3/§ 6): confidence, uitlegbaarheid, en de Human-Approval-grens (BR-702) gelden onverkort — de Morning Briefing groeit in *inhoud*, nooit in *vertrouwensmodel*.

---

## Changelog

| Datum | Versie | Wijziging |
|---|---|---|
| 2026-07-12 | 1.0 | Eerste volledige versie: doel, drie rolvarianten (Planner/Eigenaar/Medewerker — Medewerker expliciet gekoppeld aan de bestaande PWA-Dagroute i.p.v. een nieuw scherm), volledige pagina-opbouw (9 onderdelen met doel/inhoud/interactie), 11 AI-samenvatting-scenario's, voorstel-kaartstructuur gekoppeld aan ADR-012's Explanation Generator-schema, drie Morning Modes met exacte triggers, uitgebreide weer-tijdlijn-uitwerking, Explainable-AI-uitklappatroon (4 vragen), volledige interactieflow, 5 empty states, toekomstvisie gekoppeld aan de bestaande Toekomstige-Agents-roadmap (43_AI_Agents.md § 15). Geschreven als UX-uitwerking van `ADR-011` § 1, voorafgaand aan verdere Planning-UI-bouw. |
| 2026-07-12 | 1.1 | § 5 (AI Voorstellen) en § 8 (Explainable AI) uitgebreid met de Organizational Memory-feedback-loop (👍/👎/✏️, FR-902) en geleerde voorkeuren als expliciete "welke gegevens?"-bron, voortvloeiend uit `45_AgentMemory.md`. Geen wijziging aan de overige secties. |
| 2026-07-13 | 1.2 | UI-laag geïmplementeerd als startscherm `/` (PRD § 19 A-21): § 3-opbouw volledig, § 5-kaarten, § 6-modes, § 7-weer-tijdlijn, § 8-uitklap (4 vragen). Dagfeiten/waarschuwingen/KPI's live; AI-onderdelen tot Sprint 7 als expliciet gemarkeerde "Voorbeeldweergave" (`lib/briefing/demo.ts`); datacontract in `lib/briefing/types.ts` volgt ADR-012 § 6. |
