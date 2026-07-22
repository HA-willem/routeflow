# Handmatige Acceptatietest — ServOps (lokaal, vóór GitHub/Vercel-push)

**Datum:** 2026-07-13
**Rollen bij het opstellen:** Senior QA Engineer, Product Owner, Principal Software Tester
**Scope:** volledige lokale acceptatietest van Sprint 1 t/m Sprint 7 (AI Agents), vóór push naar GitHub/Vercel.
**Bronnen (gelezen als waarheid):** `00_PRD.md`, `08_FunctioneleEisen.md`, `10_BusinessRules.md`, `40_Implementatieplan.md`, `41_CodingStandards.md`, `42_DesignSystem.md`, `43_AI_Agents.md`, `44_MorningBriefing_UX.md`, `45_AgentMemory.md`, `docs/adr/ADR-011-human-in-the-loop-ai.md`, `docs/adr/ADR-012-ai-execution-pipeline.md`, plus verificatie tegen de daadwerkelijke codebase (`app/`, `components/`, `lib/`, `supabase/functions/`, `scripts/seed-demo.ts`, `README.md`).
**Karakter van dit document:** uitsluitend een testprocedure. Geen code, geen wijzigingen aan het project.

---

## 0. Belangrijke constateringen vooraf (lees dit eerst)

Bij het voorbereiden van deze testhandleiding is de codebase gecontroleerd tegen de documentatie. Drie dingen zijn belangrijk om te weten vóórdat je gaat testen — dit voorkomt dat je een niet-gebouwde feature als "fout" rapporteert:

1. **Sprint 6 (Mollie/betaallink/herinneringen) is niet in de codebase aangetroffen.** Er is geen `mollie`-dependency, geen `/pay`-route, geen `lib/payments/`, geen webhook-Edge-Function. Facturatie werkt dit sprint uitsluitend volgens het vereenvoudigde 3-statusmodel uit PRD § 19 A-19 (`draft`/`sent`/`paid`, handmatig gemarkeerd betaald — geen Mollie/QR/herinneringen). Sectie 11 hieronder test daarom **alleen** wat A-19 daadwerkelijk beschrijft; FR-063/065/067-gerelateerde stappen zijn gemarkeerd als "n.v.t. — nog niet gebouwd".
2. **Replanning Agent is expliciet uitgesteld** (PRD § 19 A-22, `43_AI_Agents.md` § 3a). Dit betekent: een ziekmelding of capaciteitstekort levert een **waarschuwing/signaal** van de Capacity/Weather Agent op, maar **geen automatische herverdeling van beurten**. Test dit dus niet als bug als er geen diff-voorstel met "12 beurten verplaatst" verschijnt — dat is FR-024/BR-802-scope die nog niet gebouwd is.
3. **Automatiseringsniveau-instellingen (Voorstel/Semi-/Volautomatisch, confidence-drempel-UI, `44_MorningBriefing_UX.md` § 2.2) zijn niet in de instellingen-UI aangetroffen.** Elk voorstel loopt dit sprint dus altijd via het "Voorstel"-pad van de Approval Handler (ADR-012 § 7) — er is geen `auto_executed`-pad te testen via de UI. Dit is verwacht gedrag, geen bug.

Rapporteer deze drie punten **niet** als individuele testfouten — ze zijn hier al vastgelegd als bekende scope-grens. Gebruik ze wel om je verwachtingen bij te stellen tijdens het testen.

---

## 1. Voorbereiding — testomgeving opzetten

1. Start de lokale Supabase-instantie:
   ```
   npx supabase start
   ```
2. Zaai de demo-data (idempotent, uitsluitend lokaal):
   ```
   npx dotenv -e .env.local -- npx tsx scripts/seed-demo.ts
   ```
   Dit levert: bedrijf "Glashelder Nijmegen B.V.", 50 klanten/101 objecten/101 dienstafspraken, 6 medewerkers, 151 beurten (8 weken vooruit, 21 bewust in de wachtrij), 59 routes, 50 facturen (20 concept/15 verzonden/12 betaald/3 "achterstallig"), en één ingeplande ziekmelding (medewerker Jan, over 10 dagen).
3. Start de applicatie:
   ```
   npm run dev
   ```
   → `http://localhost:3000`
4. Supabase Studio (voor sectie 12, Database): `http://127.0.0.1:54323`
5. **Testaccounts:**
   | Rol | E-mail | Wachtwoord | Toegang |
   |---|---|---|---|
   | Eigenaar (desktop) | `demo@servops.nl` | `DemoWachtwoord123` | Volledige Morning Briefing, instellingen, facturen |
   | Medewerker (PWA) | `jan@glashelder-demo.nl` | `DemoWachtwoord123` | `/m` — eigen dagroute |
   | Medewerker (PWA, alternatief) | `pieter@glashelder-demo.nl` / `tom@glashelder-demo.nl` / etc. | `DemoWachtwoord123` | idem |
6. **De AI-agents draaien in productie nachtelijk (00:00–06:00, cron) — lokaal is er geen cron.** Om de Sprint 7-agents (Weather/Optimization/Capacity) te testen, roep je de orchestrator handmatig aan:
   - Open een aparte terminal en start de lokale Edge Functions: `npx supabase functions serve` (de CLI toont de exacte lokale URL, doorgaans `http://127.0.0.1:54321/functions/v1/...`).
   - Zoek het `company_id` van "Glashelder Nijmegen B.V." op via Supabase Studio (tabel `companies`) of SQL: `select id from companies where name = 'Glashelder Nijmegen B.V.';`
   - Haal `SUPABASE_SERVICE_ROLE_KEY` uit je lokale `.env.local` (deel deze sleutel nooit, ook niet lokaal, buiten je eigen machine).
   - Roep de orchestrator aan:
     ```
     curl -X POST http://127.0.0.1:54321/functions/v1/agent-orchestrator \
       -H "Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>" \
       -H "Content-Type: application/json" \
       -d '{"company_id": "<company-id>"}'
     ```
   - Dit draait Weather → Optimization → Capacity Agent sequentieel (ADR-012 § 1) voor dat bedrijf en schrijft naar `agent_runs`/`agent_proposals`.

---

## Ernst-classificatie (gebruik dit bij elke gefaalde test)

| Niveau | Betekenis | Voorbeeld |
|---|---|---|
| **P1 — Blocker** | Security-lek, dataverlies, RLS-doorbraak (bedrijf A ziet bedrijf B), crash, BR-702 geschonden (AI voert een verboden actie zonder goedkeuring uit) | Kruistenant-data zichtbaar; factuur automatisch verstuurd zonder goedkeuring |
| **P2 — Major** | Kernfunctionaliteit werkt niet zoals gespecificeerd, geen workaround | Conceptfactuur wordt niet aangemaakt bij afronden beurt |
| **P3 — Minor** | Functioneel probleem mét workaround, of duidelijke afwijking van UX-specificatie | Confidence-balk toont fout percentage; copy wijkt af van doc |
| **P4 — Cosmetisch** | Visuele afwijking zonder functionele impact | Icoon verkeerd uitgelijnd |

**Rapportagesjabloon bij een gefaalde test:**
```
Testnummer: ___
Wat ging fout (exact): ___
Vermoedelijke oorzaak: ___
Ernst: P1 / P2 / P3 / P4
Aanbevolen oplossing: ___
```

---

## 1. Login & Onboarding

### TC-1.1 — Nieuw bedrijf registreren en onboarding-wizard doorlopen
**Doel:** FR-101 — een nieuwe gebruiker kan binnen de wizard een bedrijf opzetten.
**Voorwaarden:** uitgelogd, `/registreren` bereikbaar.
**Teststappen:**
1. Ga naar `/registreren`, vul e-mail/wachtwoord/bedrijfsnaam in.
2. Bevestig (indien e-mailbevestiging vereist, controleer de lokale mail-inbox/Supabase Studio `auth`-logs).
3. Doorloop de onboarding: bedrijfsnaam → eerste klant (met adres/geocoding) → eerste dienst (naam + frequentie).
4. Rond de wizard af.
**Verwachte uitkomst:** na afronden land je op de Morning Briefing (`/`); nieuw bedrijf/klant/dienst zijn aangemaakt; wizard duurt < 15 minuten (AC-101).
**Resultaat:** ☐ Geslaagd ☐ Niet geslaagd — Opmerkingen: __________

### TC-1.2 — Inloggen als Eigenaar (bestaand demo-account)
**Doel:** basisauthenticatie werkt.
**Voorwaarden:** seed gedraaid.
**Teststappen:**
1. Ga naar `/login`.
2. Log in met `demo@servops.nl` / `DemoWachtwoord123`.
**Verwachte uitkomst:** redirect naar `/` (Morning Briefing, titel "Vandaag — ServOps"), begroeting toont voornaam.
**Resultaat:** ☐ Geslaagd ☐ Niet geslaagd — Opmerkingen: __________

### TC-1.3 — Inloggen als Medewerker → automatische redirect naar PWA
**Doel:** 44 § 2.3 — een medewerker heeft geen bedrijfsbrede briefing.
**Voorwaarden:** account `jan@glashelder-demo.nl`.
**Teststappen:**
1. Log in met het medewerker-account.
**Verwachte uitkomst:** automatische redirect naar `/m` (geen toegang tot `/`, geen bedrijfsbrede KPI's/voorstellen zichtbaar).
**Resultaat:** ☐ Geslaagd ☐ Niet geslaagd — Opmerkingen: __________

### TC-1.4 — Wachtwoord vergeten
**Doel:** herstelflow werkt.
**Teststappen:**
1. Ga naar `/wachtwoord-vergeten`, vul een bestaand e-mailadres in.
2. Volg de link (lokaal via Supabase Studio → Auth → logs, of Inbucket indien geconfigureerd) naar `/wachtwoord-vergeten/nieuw`.
3. Stel een nieuw wachtwoord in en log in.
**Verwachte uitkomst:** wachtwoord succesvol gewijzigd, inloggen met nieuw wachtwoord werkt.
**Resultaat:** ☐ Geslaagd ☐ Niet geslaagd — Opmerkingen: __________

### TC-1.5 — Uitloggen en opnieuw inloggen
**Teststappen:**
1. Klik uitloggen (topbar).
2. Probeer een beveiligde route direct te openen (bv. `/planning`).
3. Log opnieuw in.
**Verwachte uitkomst:** na uitloggen redirect naar login bij elke beveiligde route; na opnieuw inloggen normale toegang hersteld.
**Resultaat:** ☐ Geslaagd ☐ Niet geslaagd — Opmerkingen: __________

### TC-1.6 — RLS-tenantscheiding (NFR-301)
**Doel:** bedrijf A ziet nooit data van bedrijf B.
**Voorwaarden:** registreer een tweede, nieuw bedrijf via TC-1.1 (bv. "Testbedrijf B").
**Teststappen:**
1. Log in als het nieuwe Testbedrijf B.
2. Open ⌘K en zoek op een klantnaam die alleen in Glashelder Nijmegen bestaat (bv. een naam uit de seed).
3. Navigeer naar `/klanten`, `/planning`, `/facturen`.
**Verwachte uitkomst:** geen enkel resultaat/record van Glashelder Nijmegen zichtbaar voor Testbedrijf B. Bij een afwijking: **P1**.
**Resultaat:** ☐ Geslaagd ☐ Niet geslaagd — Opmerkingen: __________

---

## 2. Morning Briefing (`/`)

### TC-2.1 — Welkomstblok
**Doel:** 44 § 3.1.
**Teststappen:**
1. Log in als Eigenaar, open `/`.
**Verwachte uitkomst:** "Goedemorgen/-middag/-avond, {voornaam}." + datum + bedrijfsnaam; Morning Mode-indicator (stip + label: "Rustige dag"/"Voorstellen te beoordelen"/"Vraagt je aandacht") rechts; **geen knoppen** in dit blok.
**Resultaat:** ☐ Geslaagd ☐ Niet geslaagd — Opmerkingen: __________

### TC-2.2 — Dagoverzicht klopt met de database
**Doel:** 44 § 3.2 — cijfers zijn live, geen voorbeelddata.
**Teststappen:**
1. Noteer op de briefing: "X beurten vandaag", "X actieve routes", "X medewerkers beschikbaar", "X in de wachtrij".
2. Controleer in Supabase Studio: `SELECT count(*) FROM jobs WHERE scheduled_date = current_date AND status != 'cancelled';` en vergelijkbare queries voor routes/wachtrij/medewerkers.
**Verwachte uitkomst:** getallen op het scherm komen exact overeen met de query-resultaten. Elk getal is klikbaar en springt naar het juiste scherm (`/planning?view=dag`, `/instellingen/medewerkers`, `/planning/wachtrij`).
**Resultaat:** ☐ Geslaagd ☐ Niet geslaagd — Opmerkingen: __________

### TC-2.3 — "Voorbeeldweergave" vóór een agent-run
**Doel:** A-21 — vóór Sprint 7-agent-run zijn AI-onderdelen expliciet gemarkeerd, geen verzonnen AI als echt gepresenteerd.
**Voorwaarden:** nog geen `agent_runs`-rij van vandaag met `result='success'` voor dit bedrijf (verse seed, orchestrator nog niet aangeroepen).
**Teststappen:**
1. Bekijk het blok "Vannacht doorgenomen" (AI Samenvatting).
2. Bekijk het weer-blok en de Voorstellen-sectie.
**Verwachte uitkomst:** een gestippelde "Voorbeeldweergave"-badge is zichtbaar bij AI Samenvatting, Weer en (indien voorstellen getoond worden) Voorstellen-sectie.
**Resultaat:** ☐ Geslaagd ☐ Niet geslaagd — Opmerkingen: __________

### TC-2.4 — Weer-blok: samengevouwen + uitklapbaar
**Doel:** 44 § 3.3/§ 7.
**Teststappen:**
1. Controleer de samengevouwen kernregel (icoon + korte tekst + min/max-temp + windkracht).
2. Klik om uit te klappen.
**Verwachte uitkomst:** uitgeklapt toont een uur-voor-uur regenkans-tijdlijn (staafjes), temperatuur- en windregel, en (indien van toepassing) "X beurten geraakt — zie voorstellen".
**Resultaat:** ☐ Geslaagd ☐ Niet geslaagd — Opmerkingen: __________

### TC-2.5 — AI Confidence: leesbaar label, geen kaal percentage
**Doel:** 44 § 3.4.
**Teststappen:**
1. Bekijk de confidence-balk onder de AI-samenvatting.
**Verwachte uitkomst:** tekst als "Hoog vertrouwen — de planning van vandaag is stabiel." (niet "94%" zonder context); balkbreedte correspondeert visueel met het achterliggende percentage.
**Resultaat:** ☐ Geslaagd ☐ Niet geslaagd — Opmerkingen: __________

### TC-2.6 — Voorstel-kaartstructuur volledig
**Doel:** BR-703/ADR-012 § 6 — elk voorstel heeft het volledige contract.
**Voorwaarden:** minstens één voorstel zichtbaar (voorbeeldweergave of echt na agent-run).
**Teststappen:**
1. Controleer per kaart: agent-badge (NL-label: Weer/Capaciteit/Optimalisatie/…), titel, samenvatting, confidence (%), Impact-veld, Winst-veld.
2. Klik "Waarom dit voorstel?".
**Verwachte uitkomst:** uitklap toont in vaste volgorde: "Waarom?", "Welke gegevens?", "Welke regels?" (leesbare naam + code, niet kale BR-code), "Waarom niet anders?" — alle vier gevuld, geen lege velden.
**Resultaat:** ☐ Geslaagd ☐ Niet geslaagd — Opmerkingen: __________

### TC-2.7 — "Alles accepteren"
**Voorwaarden:** ≥ 2 zichtbare voorstellen.
**Teststappen:**
1. Klik "Alles accepteren".
**Verwachte uitkomst:** alle kaarten verdwijnen tegelijk; toast bevestigt aantal; bij voorbeeldweergave: "Ongedaan maken"-actie in de toast herstelt alle kaarten.
**Resultaat:** ☐ Geslaagd ☐ Niet geslaagd — Opmerkingen: __________

### TC-2.8 — Individueel accepteren / bewerken / afwijzen + 👍👎-feedback
**Doel:** FR-902.
**Teststappen:**
1. Klik "Accepteren" op één kaart → kaart verdwijnt, toast.
2. Klik bij een andere kaart "Bewerken" → navigeert naar `/planning` met het voorstel als uitgangspunt.
3. Klik bij een derde kaart "Afwijzen" → kaart verdwijnt, toast "Was dit voorstel niet handig?"-achtige feedback mogelijk.
4. Klik 👍 en 👎 los van de hoofdactie op een kaart.
**Verwachte uitkomst:** elke actie werkt onafhankelijk; feedback-knoppen geven een bevestigingstoast ("Bedankt — dit helpt de AI leren." / "Bedankt voor je feedback.").
**Resultaat:** ☐ Geslaagd ☐ Niet geslaagd — Opmerkingen: __________

### TC-2.9 — Waarschuwingen-sectie
**Doel:** 44 § 3.7 — live feiten, geen voorbeelddata.
**Teststappen:**
1. Controleer of de seed-data (3 "achterstallige" facturen, 20 conceptfacturen) resulteert in waarschuwingen: "3 verzonden facturen zijn over de vervaldatum." (link → `/facturen`) en "20 conceptfacturen staan klaar voor controle." (link → `/facturen`).
**Verwachte uitkomst:** waarschuwingen tonen exacte, actuele aantallen; klik navigeert correct.
**Resultaat:** ☐ Geslaagd ☐ Niet geslaagd — Opmerkingen: __________

### TC-2.10 — KPI-sectie alleen voor Eigenaar/Admin
**Doel:** rechtenmatrix (44 § 2.1 vs § 2.2).
**Voorwaarden:** een Planner-account (indien aanwezig in seed; anders via instellingen een gebruiker met rol Planner aanmaken).
**Teststappen:**
1. Vergelijk de briefing als Eigenaar (KPI-sectie "Kerncijfers" met 4 kaarten: Omzet deze maand/Openstaande facturen/Beurten deze week/Uitgevoerd vandaag) met dezelfde pagina als Planner.
**Verwachte uitkomst:** Planner ziet geen "Kerncijfers"-sectie/omzetcijfers.
**Resultaat:** ☐ Geslaagd ☐ Niet geslaagd — Opmerkingen: __________

### TC-2.11 — Snelle acties
**Teststappen:**
1. Klik "Naar planner", "Herplan-wachtrij bekijken", "Nieuwe klant" (elk los, terugnavigeren tussendoor).
**Verwachte uitkomst:** navigeert direct naar `/planning`, `/planning/wachtrij`, `/klanten/nieuw`.
**Resultaat:** ☐ Geslaagd ☐ Niet geslaagd — Opmerkingen: __________

### TC-2.12 — Lege staat: rustige dag
**Doel:** 44 § 10 — nooit een kaal "niets"-scherm.
**Voorwaarden:** een dag/bedrijf zonder openstaande voorstellen.
**Verwachte uitkomst:** "Alle voorstellen behandeld. Mooi." of "Ik heb de planning doorgenomen en zie geen verbetering — je huidige planning is al optimaal." (nooit een lege witruimte).
**Resultaat:** ☐ Geslaagd ☐ Niet geslaagd — Opmerkingen: __________

### TC-2.13 — Na een succesvolle agent-run: geen voorbeeldweergave meer voor samenvatting/voorstellen
**Doel:** PRD § 19 A-22 — zodra de orchestrator gedraaid heeft, komt de data uit `agent_proposals`.
**Voorwaarden:** voer de handmatige orchestrator-aanroep uit (§ 1, stap 6).
**Teststappen:**
1. Ververs `/`.
2. Controleer de AI-samenvatting en Voorstellen-sectie.
**Verwachte uitkomst:** géén "Voorbeeldweergave"-badge meer bij AI Samenvatting/Voorstellen; voorstellen komen nu uit echte `agent_proposals`-rijen (vergelijk titel/inhoud met Supabase Studio).
**Resultaat:** ☐ Geslaagd ☐ Niet geslaagd — Opmerkingen: __________

---

## 3. Weather Agent

### TC-3.1 — Weeranalyse na agent-run
**Voorwaarden:** orchestrator gedraaid (§ 1, stap 6).
**Teststappen:**
1. Controleer in Supabase Studio de tabel `weerdata_cache` (of `weather_cache`, exacte naam per migratie `023_weerdata_cache.sql`) op een nieuwe rij voor vandaag/dit bedrijf.
**Verwachte uitkomst:** dagaggregaat (min/max temp, neerslag, windkracht) aanwezig en gekoppeld aan `company_id` + datum.
**Resultaat:** ☐ Geslaagd ☐ Niet geslaagd — Opmerkingen: __________

### TC-3.2 — Weersgevoelige dienst + regendrempel → voorstel/waarschuwing
**Doel:** 15 § 6.3-drempels (regen ≥70%/≥2mm/u, vorst <0°C, wind ≥8 Bft), 43 § 6.
**Teststappen:**
1. Controleer of er (afhankelijk van de actuele Open-Meteo-voorspelling voor Nijmegen) een Weather-voorstel/waarschuwing verschijnt wanneer een drempel wordt overschreden.
2. Indien het weer op testmoment geen drempel overschrijdt: controleer via Supabase Studio dat `weerdata_cache` de daadwerkelijke actuele waarden bevat (test is dan "geslaagd, geen voorstel te verwachten" — noteer dit expliciet, geen fout).
**Verwachte uitkomst:** bij drempeloverschrijding: agent-badge "Weer", titel/samenvatting benoemt het weer en het aantal geraakte beurten; "Waarom?"-uitleg noemt de exacte drempel (bv. "neerslagkans ≥70%").
**Resultaat:** ☐ Geslaagd ☐ Niet geslaagd — Opmerkingen: __________

### TC-3.3 — "Waarom?"-bronnen tonen tijdstip van ophalen
**Teststappen:**
1. Open een Weather-voorstel (indien aanwezig) en klik "Waarom dit voorstel?".
**Verwachte uitkomst:** "Welke gegevens?" toont een concrete bron (bv. Open-Meteo) — bij voorkeur met tijdstip van ophalen.
**Resultaat:** ☐ Geslaagd ☐ Niet geslaagd — Opmerkingen: __________

### TC-3.4 — Geen weersgevoelige diensten geraakt ondanks regen
**Doel:** 44 § 10 empty-state.
**Verwachte uitkomst (indien van toepassing):** "Het weer werkt vandaag niet mee, maar geen van je diensten is hier gevoelig voor — planning blijft ongewijzigd." — of gelijkwaardige copy, geen misleidend "actie vereist"-signaal.
**Resultaat:** ☐ Geslaagd ☐ Niet geslaagd ☐ N.v.t. — Opmerkingen: __________

### TC-3.5 — Architectuur-conformiteitscheck: WeatherTimeline blijft "Voorbeeldweergave" ná een agent-run
**Doel:** PRD § 19 A-22 punt 4 — expliciet vastgelegd dat de uur-tijdlijn **altijd** voorbeeldweergave blijft (geen eigen urencache gebouwd), óók wanneer de weer-gerelateerde voorstellen zelf al echt zijn.
**Voorwaarden:** orchestrator gedraaid (TC-2.13-situatie: geen "Voorbeeldweergave" meer bij AI Samenvatting/Voorstellen).
**Teststappen:**
1. Ververs `/` na de orchestrator-run.
2. Bekijk het weer-blok specifiek (niet de AI-samenvatting).
**Verwachte uitkomst (per documentatie):** de "Voorbeeldweergave"-badge blijft zichtbaar in het weer-blok, ook al is de rest van de briefing niet langer voorbeeldweergave.
**Bevestigd (2026-07-13, geautomatiseerde browserverificatie tegen lokale seed-data, bedrijf "Glashelder Nijmegen B.V."):** vóór de agent-run toonde het weer-blok de badge + uurwaarden `11/6/9/16/7/14/59/70/81/90%` (08:00–17:00, "Regen vanaf 14:00", 14–17 °C, 4 Bft). Ná een succesvolle `agent-orchestrator`-aanroep (`agent_runs`: weather/optimization/capacity alle `result=success`) verdween de "Voorbeeldweergave"-badge overal, **inclusief** het weer-blok — terwijl de uurwaarden exact identiek bleven (zelfde 10 percentages, zelfde tijden, zelfde temperatuur/wind). Dit bewijst dat `WeatherTimeline` nog steeds `buildDemoWeather()`-nepdata toont, nu zonder de verplichte markering.
**Resultaat:** ☑ Niet geslaagd (bevestigd)
**Bevinding (rapportagesjabloon):**
```
Testnummer: TC-3.5
Wat ging fout (exact): components/domain/briefing/WeatherTimeline.tsx ontvangt dezelfde
  `aiPreview`-prop als de rest van de briefing (briefing.aiPreview = !hasRealAiToday, in
  lib/briefing/get-briefing.ts). Zodra er vandaag een succesvolle agent_runs-rij bestaat,
  wordt aiPreview false voor de HELE pagina — ook voor het weer-blok, terwijl get-briefing.ts
  zelf in een commentaar bevestigt dat de weer-tijdlijn altijd buildDemoWeather() blijft
  gebruiken (geen eigen urencache, ADR-012 §3). Reproductie: hourly-percentages vóór en na de
  agent-run zijn bit-voor-bit identiek (11/6/9/16/7/14/59/70/81/90%).
Vermoedelijke oorzaak: get-briefing.ts geeft één gedeelde `aiPreview`-boolean door aan zowel
  AiSummary/ProposalList (waar hij terecht hoort) als WeatherTimeline (waar hij dat niet zou
  moeten, want de onderliggende weather-data wordt door geen van beide paden echt gemaakt).
Ernst: P3 — geen dataverlies/security-issue, maar een expliciet vastgelegde, bewuste
  architectuurbeslissing (PRD §19 A-22 punt 4) die niet klopt: een gebruiker kan straks
  gesimuleerde regen-cijfers voor waar aannemen zodra de AI-agents één keer gedraaid hebben.
Aanbevolen oplossing: geef WeatherTimeline een eigen, altijd-true preview-vlag totdat een
  toekomstige sprint een echte urencache bouwt, i.p.v. de gedeelde `briefing.aiPreview` te
  hergebruiken — bv. `<WeatherTimeline weather={briefing.weather} aiPreview={true} />` in
  app/(app)/(vandaag)/page.tsx, met een code-comment die verwijst naar PRD §19 A-22 punt 4.
```

### TC-3.6 — Weer-API onbereikbaar (AP-04-gedrag)
**Doel:** ADR-012 § 4 — een gefaalde provider-call blokkeert de rest van de keten niet.
**Teststappen:**
1. Verbreek tijdelijk internettoegang (of blokkeer `open-meteo.com` lokaal) en roep de orchestrator opnieuw aan.
**Verwachte uitkomst:** Weather Agent-stap wordt overgeslagen met een gelogde waarschuwing (`agent_runs`); Optimization/Capacity Agent draaien gewoon door; de briefing crasht niet en toont geen misleidende "alles compleet"-indruk.
**Resultaat:** ☐ Geslaagd ☐ Niet geslaagd — Opmerkingen: __________

---

## 4. Capacity Agent

### TC-4.1 — Capaciteitstekort forceren en signaleren
**Doel:** 43 § 9 — signalering, 7 dagen vooruit (`CAPACITY_HORIZON_DAYS`).
**Voorwaarden:** er bestaat (nog) geen UI om beschikbaarheid te bewerken; forceer daarom via Supabase Studio.
**Teststappen:**
1. Kies een datum binnen 7 dagen met veel geplande beurten (query `jobs` op `scheduled_date`/`company_id`, groepeer op datum).
2. Voeg in Supabase Studio, tabel `availability`, rijen toe voor 4–5 van de 6 medewerkers op die datum met `status='sick'` of `'leave'` (zodat nog maar 1–2 medewerkers beschikbaar zijn).
3. Roep de orchestrator opnieuw aan (§ 1, stap 6).
4. Ververs `/`.
**Verwachte uitkomst:** een Capacity-voorstel/waarschuwing verschijnt met titel "Capaciteitstekort op {datum}" (of "Geen beschikbare medewerker op {datum}" als 0 medewerkers over zijn), met correct aantal beurten/medewerkers in het Impact-veld.
**Resultaat:** ☐ Geslaagd ☐ Niet geslaagd — Opmerkingen: __________

### TC-4.2 — Confidence en ernst kloppen met de mate van overboeking
**Teststappen:**
1. Vergelijk twee scenario's: een lichte overboeking (ratio net > 1) en een zware (0 medewerkers beschikbaar).
**Verwachte uitkomst:** 0-medewerkers-scenario toont `urgent`-ernst en hoge confidence (≈0,95); lichte overboeking toont `attention`-ernst en een lagere confidence.
**Resultaat:** ☐ Geslaagd ☐ Niet geslaagd — Opmerkingen: __________

### TC-4.3 — "Waarom?"-uitleg noemt BR-201/BR-202
**Teststappen:**
1. Klik "Waarom dit voorstel?" op een Capacity-kaart.
**Verwachte uitkomst:** "Welke regels?" toont leesbare namen zoals "Beschikbaarheid medewerker is absoluut (BR-201)" en "Werkdaglimiet (max. 8,5 uur) (BR-202)".
**Resultaat:** ☐ Geslaagd ☐ Niet geslaagd — Opmerkingen: __________

### TC-4.1b — Bevinding: toekomstige capaciteitswaarschuwingen verschijnen niet in de briefing van vandaag
**Bevestigd (2026-07-13):** twee kandidaten geforceerd (07-14 "attention", 07-15 "urgent, 0 medewerkers") — beide correct aangemaakt in `agent_proposals` met exacte confidence/severity conform `lib/agents/capacity.ts` (0,656 resp. 0,95). Geen van beide verscheen echter in de Voorstellen-sectie van de briefing van vandaag (13 juli): `lib/briefing/get-briefing.ts` filtert `agent_proposals` op `.eq('scheduled_date', today)`, terwijl Capacity Agent bewust tot `CAPACITY_HORIZON_DAYS=7` vooruitkijkt en kandidaten taggen met de datum waar de waarschuwing over gaat (niet de run-datum).
**Ernst:** P2 — tegenstrijdig met `44_MorningBriefing_UX.md` § 4 scenario 4, die letterlijk beschrijft dat een woensdag-tekort al maandag in de samenvatting moet verschijnen ("Woensdag wordt het lastiger... Wil je daar nu al naar kijken?"). Een planner mist hierdoor exact het vroegtijdige-signaal-voordeel dat Capacity Agent claimt te bieden (`impact`-veld: "Vroegtijdig zicht op een mogelijk te herverdelen dag, vóór het een crisis wordt").
**Aanbevolen oplossing:** briefing-query uitbreiden naar een horizon (`scheduled_date <= today + N dagen`) i.p.v. exact vandaag, of toekomstige capaciteitswaarschuwingen expliciet als aparte "vooruitblik"-sectie tonen.
**Resultaat:** ☑ Niet geslaagd (bevestigd)

### TC-4.4 — Capaciteitsvoorstel voert nooit automatisch iets uit
**Doel:** 43 § 9 — "signalering, geen automatische herverdeling"; BR-702.
**Teststappen:**
1. Klik "Accepteren" op een Capacity-voorstel.
2. Controleer in Supabase Studio of er een wijziging is aan `jobs`/`routes` als direct gevolg.
**Verwachte uitkomst:** alleen `agent_proposals.approval_status` wijzigt naar `approved`; **geen** enkele beurt/route wordt automatisch verplaatst (er is geen `payload` om uit te voeren — puur signalering). Als er wél een planningswijziging plaatsvindt zonder tussenkomst: **P1** (BR-702-schending).
**Resultaat:** ☐ Geslaagd ☐ Niet geslaagd — Opmerkingen: __________

### TC-4.5 — Geen overboeking → geen waarschuwing
**Voorwaarden:** verwijder/herstel de in TC-4.1 toegevoegde `availability`-rijen; draai de orchestrator opnieuw.
**Verwachte uitkomst:** geen Capacity-voorstel meer voor die datum.
**Resultaat:** ☐ Geslaagd ☐ Niet geslaagd — Opmerkingen: __________

---

## 0b. Update na Mapbox-token-configuratie (2026-07-13, later op de dag)

`MAPBOX_ACCESS_TOKEN` is toegevoegd aan `supabase/functions/.env` (niet `.env.local` — zie § 0 hierboven voor de reden). Tijdens de eerste live validatie kwam een **echte, onafhankelijke bug** aan het licht in `lib/routing/mapbox-provider.ts`'s `geocode()`: de code vroeg `limit=2` bij Mapbox op en bestempelde "meer dan 1 resultaat terug" als `'ambiguous'` (→ behandeld als mislukt) — maar Mapbox geeft bij een postcode-zoekopdracht vrijwel altijd een tweede, ongerelateerde buurpostcode mee, ook als de eerste match overduidelijk correct is. Empirisch bevestigd (zelfde query, alleen `limit` anders: 2 resultaten → onterecht "ambigu"; het eerste resultaat was zelf steeds correct). **Gefixt** (klein, gericht, geen refactor): de top-match telt nu als betrouwbaar zodra zijn eigen postcode exact overeenkomt met de gevraagde postcode, ongeacht welke ongerelateerde tweede kandidaat Mapbox meestuurt. Geverifieerd tegen een echte route (Rick, 2026-07-14, 9 beurten): vóór de fix 9/9 onplaatsbaar, ná de fix 8/9 succesvol geroute met realistische reistijden/aankomsttijden — de ene overgebleven onplaatsbare beurt heeft een postcode ("6535 BC") die daadwerkelijk niet bestaat in Mapbox's NL-postcode-data (terecht geweigerd). Lint/typecheck/202 unit-tests/64 integratietests/3 e2e-tests blijven groen na de wijziging.

**Gevolg voor dit document:** sectie 5 (Optimization Agent) en de routing-afhankelijke delen van sectie 9 (Planner) zijn niet langer geblokkeerd door ontbrekende Mapbox-configuratie. Blijf wel rekening houden met: een deel van de gesimuleerde seed-adressen (`scripts/seed-demo.ts`) is puur synthetisch (willekeurige straatnaam + willekeurige postcode uit een kleine pool, geen echte 1-op-1-koppeling) — een klein percentage onplaatsbare beurten door een niet-bestaande postcode is dus **verwacht gedrag van de demo-data**, geen bug, zolang de meerderheid wél routeert.

---

## 5. Optimization Agent

### TC-5.1 — Route-optimalisatievoorstel na agent-run
**Doel:** 43 § 11 — formalisering van bestaande `route-optimize`.
**Voorwaarden:** orchestrator gedraaid; kies een route met een suboptimale volgorde (bv. via `/planning` handmatig een JobCard tussen medewerkers verslepen zodat de volgorde inefficiënt wordt, vóór je de orchestrator draait).
**Verwachte uitkomst:** Optimization-voorstel verschijnt met titel/samenvatting die de tijdsbesparing benoemt (bv. "bespaart X minuten reistijd"); Winst-veld kwantitatief.
**Resultaat:** ☐ Geslaagd ☐ Niet geslaagd — Opmerkingen: __________

### TC-5.2 — Accepteren voert de route-optimalisatie daadwerkelijk uit
**Teststappen:**
1. Klik "Accepteren" op een Optimization-voorstel.
2. Controleer de toast en ververs `/planning` voor de betrokken medewerker/dag.
**Verwachte uitkomst:** toast "Uitgevoerd: {titel}" met "De route is bijgewerkt."; de route in `/planning` toont de nieuwe volgorde/tijden (route-optimize daadwerkelijk aangeroepen).
**Resultaat:** ☐ Geslaagd ☐ Niet geslaagd — Opmerkingen: __________

### TC-5.3 — Vergrendelde beurt blijft ongewijzigd (BR-200)
**Voorwaarden:** vergrendel een beurt in `/planning` (zie TC-9.3) op de route die je optimaliseert.
**Teststappen:**
1. Accepteer het Optimization-voorstel voor die route.
**Verwachte uitkomst:** de vergrendelde beurt behoudt exact zijn tijd/positie; alleen niet-vergrendelde beurten herschikken.
**Resultaat:** ☐ Geslaagd ☐ Niet geslaagd — Opmerkingen: __________

### TC-5.4 — Alternatieven-veld is concreet
**Teststappen:**
1. Klik "Waarom dit voorstel?" op een Optimization-kaart.
**Verwachte uitkomst:** "Waarom niet anders?" bevat een concrete, niet-lege toelichting (geen placeholder-tekst).
**Resultaat:** ☐ Geslaagd ☐ Niet geslaagd — Opmerkingen: __________

### TC-5.5 — Afwijzen voert niets uit
**Teststappen:**
1. Klik "Afwijzen" op een Optimization-voorstel.
2. Controleer `/planning` voor die route.
**Verwachte uitkomst:** route ongewijzigd; `agent_proposals.approval_status = 'rejected'`.
**Resultaat:** ☐ Geslaagd ☐ Niet geslaagd — Opmerkingen: __________

---

### TC-5.x — Live geverifieerd (2026-07-13, na Mapbox-fix)
TC-5.1 ✅: `agent-optimization` (rechtstreeks aangeroepen met `date=2026-07-14`, zie hieronder waarom) genereerde een correct kandidaat-voorstel voor Rick's route: "Route van Rick herschikken", 15 minuten besparing, confidence 0,85, BR-200/BR-202 correct gerefereerd, `payload: {type: 'route_optimize', employeeId, date}`.
TC-5.2 ✅ (indirect bevestigd): een echte (niet-dry-run) `route-optimize`-aanroep als Eigenaar persisteerde de route daadwerkelijk (8/9 stops, realistische tijden or `/planning?date=2026-07-14` zichtbaar in de UI — zie screenshot, Rick-kolom toont 08:07–11:53 met correcte adressen).

**Bevinding TC-5.1b:** de `agent-orchestrator` roept `agent-optimization` en `agent-weather` **uitsluitend met `date: today`** aan (`supabase/functions/agent-orchestrator/index.ts` — `AGENT_CALLS`); alleen Capacity Agent krijgt een 7-daagse horizon (`capacityDates`). Op een dag zonder geplande beurten (zoals 13 juli in deze demo) genereert Optimization Agent daardoor via de normale orchestrator-cyclus **nooit** een voorstel, ook al bestaat er morgen een aantoonbaar suboptimale route — pas wanneer die dag zelf aanbreekt. Dit ondermijnt het "vroegtijdig zicht"-voordeel dat wél voor Capacity Agent geldt.
**Ernst:** P3 — geen dataverlies, wel een gemiste-kans t.o.v. de eigen productbelofte (vergelijk 44_MorningBriefing_UX.md § 4 scenario 4, dat expliciet vooruitkijken beschrijft).
**Resultaat:** ☑ Opgelost (2026-07-14, Sprint 7-vervolg) — `agent-orchestrator` roept Weather en Optimization nu, net als Capacity, één keer per dag over dezelfde `capacityDates`-horizon (7 dagen) aan i.p.v. alleen `today`; `agent_run_id` per kandidaat wordt nu per dag-specifieke run meegedragen i.p.v. per agent-naam opgezocht (was anders fout gegaan zodra een agent meerdere runs per cyclus kreeg). Live geverifieerd: 7 Weather- + 7 Optimization-runs + 1 Capacity-run per cyclus, geen fouten. Aanvullend ontdekt tijdens deze verificatie en meegefixed: `lib/briefing/get-briefing.ts` filterde `agent_proposals` op `scheduled_date = today`, waardoor zowel deze horizon-uitbreiding als een Replanning-voorstel voor een toekomstige datum (bv. een ziekmelding voor morgen) nooit op de Briefing verscheen — nu `scheduled_date >= today`.

---

### TC-7.x — Replanning Agent (Sprint 7-vervolg, BR-802) — live geverifieerd (2026-07-14)
Volledige flow via de browser + DB-controle (Playwright, demo-data): ziek/verlof melden op `/planning` (Rick/Bas, dialoog met BR-702-toelichting) → `agent-replanning` genereert direct een `replan_jobs`-voorstel (geen wachttijd op de nachtcyclus) → voorstel zichtbaar op de Morning Briefing met correcte titel/confidence/severity → "Waarom?"-uitklap toont alle vier de vaste vragen → `ReplanDiff`-tabel toont Van/Naar per beurt → "Accepteren" roept `decideProposal` aan, die per move `route-move-job` uitvoert → DB bevestigt dat alle beurten daadwerkelijk naar de route van de juiste collega zijn verplaatst (`jobs.route_id` gewijzigd, geen wijziging aan vergrendelde beurten). Lokale omgevingsgaten die tijdens verificatie zijn tegengekomen (geen product-defecten): `config_json.depot_location` en objectgeocoding staan niet in `scripts/seed-demo.ts` en gaan verloren bij een `supabase db reset` — na eenmalig lokaal instellen werkte de volledige keten zonder verdere aanpassing.
**Resultaat:** ☑ Geslaagd.

---

### TC-8.x — Planning Agent (Sprint 7-vervolg) — live geverifieerd (2026-07-16)
End-to-end via de lokale Edge Runtime (`supabase functions serve`) + directe DB-controle, tegen de echte demo-data (`scripts/seed-demo.ts`, 101 dienstafspraken): `agent-planning` met een geldige service-rol-token + `company_id` → `planning-generate` genereerde 217 nieuwe `voorgesteld`-beurten over 101 dienstafspraken, correct gescoped (0 van 0 cross-tenant-controles faalden: elke aangemaakte `jobs`-rij hoort bij dezelfde `company_id` als zijn dienstafspraak). Kandidaat correct opgebouwd (titel/samenvatting/BR-001/101/102/103-referenties, confidence 0,95, `payload: null`). Bevinding tijdens verificatie: een tweede aanroep met dezelfde parameters bleef **hetzelfde** aantal "217 nieuwe beurten" rapporteren, terwijl er niets nieuws was bijgekomen (`generateHorizonDates` berekent altijd dezelfde datums; de oorspronkelijke upsert rapporteerde het berekende aantal, niet het daadwerkelijk ingevoegde aantal) — zou de Morning Briefing elke nacht een misleidend "vol" signaal hebben gegeven. **Gefixt:** `.select()` toegevoegd aan de `ON CONFLICT DO NOTHING`-upsert, die daardoor uitsluitend de echt-nieuw-ingevoegde rijen teruggeeft. Na de fix opnieuw geverifieerd: een herhaalde aanroep met identieke parameters gaf terecht `{"candidates":[]}`; na het gericht verwijderen van de beurten van één dienstafspraak gaf een volgende aanroep exact "1 nieuwe beurt, 1 dienstafspraak, 100 overgeslagen" — incrementele detectie werkt precies. Volledige `agent-orchestrator`-cyclus voor het demo-bedrijf bevestigd: Planning Agent draait als eerste stap en levert een `agent_proposals`-rij (`agent: 'planning'`, `severity: 'info'`).
**Resultaat:** ☑ Geslaagd (na fix).

---

### TC-9.x — Invoice Agent (Sprint 7-vervolg) — live geverifieerd (2026-07-16)
Bij het uitwerken bleek de veronderstelde scope (conceptfactuur aanmaken) al volledig gedekt door `complete_job()` (Sprint 5) — direct geverifieerd door de functie te lezen: prijsresolutie (per_job/hourly/dienst-fallback), BTW-berekening en `invoices`/`invoice_lines`-aanmaak gebeuren daar al synchroon bij het afronden van een beurt. Invoice Agent is daarom herscoped naar uitsluitend signalering. End-to-end via de lokale Edge Runtime tegen de demo-data: 20 bestaande conceptfacturen (uit `scripts/seed-demo.ts`, samen €1226,94) → `agent-invoice` gaf exact "20 conceptfacturen klaar om te versturen, samen €1226.94" terug, severity `attention` (geen enkel concept ≥3 dagen oud in de demo-data). Volledige `agent-orchestrator`-cyclus bevestigd: levert een `agent_proposals`-rij (`agent: 'invoice'`, `severity: 'attention'`). Geen Mollie/betaalverzoek-link in deze stap — expliciet aparte, latere uitbreiding op de bestaande `sendInvoice`-Server-Action (BR-702: versturen blijft menselijk, dus de link hoort bij dat al-menselijke moment, niet bij een autonome agent-actie).
**Resultaat:** ☑ Geslaagd.

---

## 6. Approval Handler

### TC-6.1 — Accepteren zet approval_status correct
**Teststappen:**
1. Accepteer een willekeurig echt voorstel (ná agent-run, niet voorbeeldweergave).
2. Controleer in Supabase Studio `agent_proposals`: `approval_status`, `decided_by`, `decided_at`.
**Verwachte uitkomst:** `approval_status = 'approved'`, `decided_by` = ingelogde gebruiker-ID, `decided_at` = huidig tijdstip.
**Resultaat:** ☐ Geslaagd ☐ Niet geslaagd — Opmerkingen: __________

### TC-6.2 — Afwijzen zet approval_status correct
**Verwachte uitkomst:** `approval_status = 'rejected'`, geen uitvoerende actie.
**Resultaat:** ☐ Geslaagd ☐ Niet geslaagd — Opmerkingen: __________

### TC-6.3 — Dubbele beslissing geweigerd (state-transition-guard)
**Doel:** `decide_agent_proposal()`-RPC mag een reeds-behandeld voorstel niet opnieuw wijzigen.
**Teststappen:**
1. Noteer een `proposal_id` die al `approved`/`rejected` is (TC-6.1/6.2).
2. Roep in Supabase Studio (SQL editor, als ingelogde/service-rol) opnieuw `select decide_agent_proposal('<proposal_id>', 'approved');` aan.
**Verwachte uitkomst:** de RPC weigert (foutmelding of no-op) — de eerste beslissing blijft leidend, geen overschrijving.
**Resultaat:** ☐ Geslaagd ☐ Niet geslaagd — Opmerkingen: __________

### TC-6.4 — Kolomgrendel: rechtstreekse wijziging van `confidence` geweigerd
**Doel:** migratie `022_agent_pipeline.sql` — alleen `approval_status`/`decided_by`/`decided_at` zijn door een gebruiker wijzigbaar.
**Teststappen:**
1. Probeer in Supabase Studio (als niet-service-rol, via de normale API/RLS-context) `confidence` van een bestaande `agent_proposals`-rij te wijzigen.
**Verwachte uitkomst:** wijziging geweigerd door de kolomgrendel-trigger.
**Resultaat:** ☐ Geslaagd ☐ Niet geslaagd — Opmerkingen: __________

### TC-6.5 — Undo alleen in voorbeeldweergave-modus
**Teststappen:**
1. Vóór een agent-run: accepteer een voorbeeldvoorstel → controleer "Ongedaan maken" in de toast werkt (kaart komt terug).
2. Ná een agent-run: accepteer een echt voorstel → controleer of er geen "Ongedaan maken"-actie in de toast staat (want al daadwerkelijk uitgevoerd via de Server Action).
**Verwachte uitkomst:** UX-verschil is bewust en consistent met bovenstaande.
**Resultaat:** ☐ Geslaagd ☐ Niet geslaagd — Opmerkingen: __________

### TC-6.6 — Lage confidence wordt nooit automatisch uitgevoerd
**Doel:** ADR-012 § 7 — confidence < 0,7 degradeert altijd naar "toon als voorstel".
**Teststappen:**
1. Zoek (of forceer, indien mogelijk via de test-scenario's in secties 3–5) een voorstel met confidence < 70%.
**Verwachte uitkomst:** dit voorstel verschijnt als gewoon voorstel in de briefing (nooit stilzwijgend uitgevoerd) — bevestig dat er geen enkel mechanisme in de huidige UI is om dit te omzeilen (§ 0, punt 3: automatiseringsniveau-instellingen ontbreken, dus dit is per definitie altijd het geval dit sprint).
**Resultaat:** ☐ Geslaagd ☐ Niet geslaagd — Opmerkingen: __________

### TC-6.7 — BR-702-acties verschijnen nooit als auto-uitgevoerd
**Teststappen:**
1. Doorloop alle zichtbare voorstellen na een agent-run.
**Verwachte uitkomst:** geen enkel voorstel betreft het versturen van een factuur, het uitvoeren van een betaling, het wijzigen van een prijsafspraak, of het verwijderen van een klant/medewerker zonder tussenkomst — dit soort acties zijn dit sprint sowieso niet aan een agent gekoppeld (43 § 12: "geen agent heeft hiertoe schrijftoegang"). Bevestig dat dit klopt.
**Resultaat:** ☐ Geslaagd ☐ Niet geslaagd — Opmerkingen: __________

---

## 7. AI Proposal Cards

### TC-7.1 — Verplichte velden altijd aanwezig
**Teststappen:**
1. Controleer over minstens 3 verschillende voorstellen (verschillende agents): titel, samenvatting, agent-badge, confidence%, Impact, Winst.
**Verwachte uitkomst:** geen enkel veld leeg of "undefined".
**Resultaat:** ☐ Geslaagd ☐ Niet geslaagd — Opmerkingen: __________

### TC-7.2 — Vaste volgorde van de 4 uitklap-vragen
**Verwachte uitkomst:** altijd exact "Waarom?" → "Welke gegevens?" → "Welke regels?" → "Waarom niet anders?", in deze volgorde, voor elk voorstel.
**Resultaat:** ☐ Geslaagd ☐ Niet geslaagd — Opmerkingen: __________

### TC-7.3 — Business rules leesbaar, niet kaal
**Verwachte uitkomst:** bv. "Werkdaglimiet (max. 8,5 uur) (BR-202)", nooit kaal "BR-202" zonder omschrijving.
**Resultaat:** ☐ Geslaagd ☐ Niet geslaagd — Opmerkingen: __________

### TC-7.4 — Confidence-balk correspondeert visueel
**Teststappen:**
1. Vergelijk het percentage-label met de breedte van de confidence-balk op de kaart.
**Verwachte uitkomst:** balkbreedte = percentage (bv. 88% → balk ~88% gevuld).
**Resultaat:** ☐ Geslaagd ☐ Niet geslaagd — Opmerkingen: __________

### TC-7.5 — Agent-badge NL-labels correct
**Verwachte uitkomst:** Weer, Capaciteit, Optimalisatie (de drie Sprint 7-agents) — geen Engelse/technische termen zichtbaar in de UI.
**Resultaat:** ☐ Geslaagd ☐ Niet geslaagd — Opmerkingen: __________

---

## 8. AI Command Bar (⌘K)

### TC-8.1 — Openen met sneltoets
**Teststappen:**
1. Druk `Cmd+K` (macOS) of `Ctrl+K` (Windows/Linux) vanaf een willekeurige pagina in de app.
**Verwachte uitkomst:** command bar opent direct, gecentreerd/top-uitgelijnd paneel.
**Resultaat:** ☐ Geslaagd ☐ Niet geslaagd — Opmerkingen: __________

### TC-8.2 — Zoeken op klantnaam
**Teststappen:**
1. Typ een bestaande klantnaam (deels).
2. Druk Enter op het eerste resultaat.
**Verwachte uitkomst:** resultaat met preview (bv. naam + aantal objecten/beurten); Enter navigeert naar klant-detail.
**Resultaat:** ☐ Geslaagd ☐ Niet geslaagd — Opmerkingen: __________

### TC-8.3 — Zoeken op medewerker
**Verwachte uitkomst:** medewerkerresultaten verschijnen, navigatie naar medewerker-detail werkt.
**Resultaat:** ☐ Geslaagd ☐ Niet geslaagd — Opmerkingen: __________

### TC-8.4 — Zoeken op route/beurt
**Verwachte uitkomst:** relevante route/beurt-resultaten, correcte navigatie.
**Resultaat:** ☐ Geslaagd ☐ Niet geslaagd — Opmerkingen: __________

### TC-8.5 — Volledige toetsenbordbediening
**Teststappen:**
1. Zonder muis: open de bar, navigeer met pijltjes-omlaag/-omhoog tussen resultaten, bevestig met Enter.
**Verwachte uitkomst:** volledig bruikbaar zonder muis (WCAG 2.1 AA, PRD § 11.9).
**Resultaat:** ☐ Geslaagd ☐ Niet geslaagd — Opmerkingen: __________

### TC-8.6 — Sluiten
**Teststappen:**
1. Sluit via `Esc`.
2. Open opnieuw, sluit via klik buiten het paneel.
**Verwachte uitkomst:** beide sluitmethoden werken.
**Resultaat:** ☐ Geslaagd ☐ Niet geslaagd — Opmerkingen: __________

### TC-8.7 — Heropenen: state gereset
**Teststappen:**
1. Zoek iets, sluit, heropen.
**Verwachte uitkomst:** zoekbalk is leeg bij heropenen (geen vorige zoekterm blijft hangen).
**Resultaat:** ☐ Geslaagd ☐ Niet geslaagd — Opmerkingen: __________

### TC-8.8 — Fuzzy/case-insensitive matching
**Teststappen:**
1. Typ een klantnaam in kleine letters met een tikfout/gedeeltelijke match.
**Verwachte uitkomst:** relevante resultaten verschijnen ondanks afwijkende hoofdletters/kleine typefout.
**Resultaat:** ☐ Geslaagd ☐ Niet geslaagd — Opmerkingen: __________

### TC-8.9 — AI-voorbeeldcommando's gemarkeerd als "Voorbeeld"
**Doel:** PRD § 19 A-21 punt 3 — interface-only, niet verward met echte functionaliteit.
**Verwachte uitkomst:** eventuele AI-gerelateerde commando's in de command bar zijn duidelijk als voorbeeld/interface-only gemarkeerd.
**Resultaat:** ☐ Geslaagd ☐ Niet geslaagd ☐ N.v.t. — Opmerkingen: __________

---

## 9. Planner (`/planning`)

### TC-9.1 — RouteBoard laadt correct
**Teststappen:**
1. Open `/planning`.
**Verwachte uitkomst:** kolommen per medewerker, JobCards met tijd/klantnaam/adres/dienst/statusbadge in vaste volgorde (42 § 13).
**Resultaat:** ☐ Geslaagd ☐ Niet geslaagd — Opmerkingen: __________

### TC-9.2 — Drag-and-drop tussen medewerkers
**Doel:** FR-022.
**Teststappen:**
1. Sleep een niet-vergrendelde JobCard van medewerker A naar medewerker B (zelfde dag).
**Verwachte uitkomst:** kaart verplaatst direct (optimistic UI); beide routes herberekenen (< 2s); toast met "Ongedaan maken"-actie.
**Resultaat:** ☐ Geslaagd ☐ Niet geslaagd — Opmerkingen: __________

### TC-9.3 — Vergrendelde beurt niet sleepbaar
**Doel:** BR-200, FR-026.
**Teststappen:**
1. Vergrendel een beurt (indien de UI dit toestaat in deze sprint) of gebruik een reeds vergrendelde seed-beurt.
2. Probeer te slepen.
**Verwachte uitkomst:** `Anchor`-icoon zichtbaar, kaart is niet sleepbaar.
**Resultaat:** ☐ Geslaagd ☐ Niet geslaagd — Opmerkingen: __________

### TC-9.4 — Werkdaglimiet-overschrijding geweigerd
**Doel:** BR-202.
**Teststappen:**
1. Sleep zoveel beurten naar één medewerker/dag dat de 8,5-uur-limiet wordt overschreden.
**Verwachte uitkomst:** drop wordt geweigerd met foutmelding (`workday_limit_exceeded`) via toast; kaart valt terug naar oorspronkelijke positie (rollback).
**Resultaat:** ☐ Geslaagd ☐ Niet geslaagd — Opmerkingen: __________

### TC-9.5 — Realtime-update tussen twee sessies
**Doel:** 42 § 15.
**Voorwaarden:** twee browservensters, beide ingelogd als Eigenaar/Planner van hetzelfde bedrijf.
**Teststappen:**
1. Sleep in venster A een beurt.
2. Observeer venster B.
**Verwachte uitkomst:** venster B toont een korte achtergrond-highlight-puls op de betrokken kaart/kolom, geen abrupte volledige herlaad/re-render.
**Resultaat:** ☐ Geslaagd ☐ Niet geslaagd — Opmerkingen: __________

### TC-9.6 — Route-details-paneel
**Teststappen:**
1. Klik op een JobCard (niet slepen) of kolomkop-overflow-menu.
**Verwachte uitkomst:** zijpaneel opent met medewerkernaam/datum, KPI's (rijtijd/afstand/werktijd), geordende stoplijst met tijden.
**Resultaat:** ☐ Geslaagd ☐ Niet geslaagd — Opmerkingen: __________

### TC-9.7 — Route optimaliseren-knop (handmatig, los van de agent)
**Teststappen:**
1. Klik het `Wand2`-icoon in een kolomkop.
**Verwachte uitkomst:** route herberekent, toast "Route bijgewerkt: N beurten gepland." (of warning-variant met "M niet plaatsbaar").
**Resultaat:** ☐ Geslaagd ☐ Niet geslaagd — Opmerkingen: __________

### TC-9.8 — Wachtrij-pagina
**Teststappen:**
1. Open `/planning/wachtrij`.
**Verwachte uitkomst:** de 21 seed-beurten zonder route zijn hier zichtbaar; medewerker-toewijzing per item mogelijk.
**Resultaat:** ☐ Geslaagd ☐ Niet geslaagd — Opmerkingen: __________

### TC-9.9 — Toetsenbord-drag-and-drop (a11y)
**Doel:** `@dnd-kit` keyboard-support (PRD § 19 A-14).
**Teststappen:**
1. Focus een JobCard met Tab, verplaats met toetsenbord (spatie om op te pakken, pijltjes, spatie om te droppen — exacte toetsen volgens dnd-kit-conventie).
**Verwachte uitkomst:** volledig bruikbaar zonder muis.
**Resultaat:** ☐ Geslaagd ☐ Niet geslaagd — Opmerkingen: __________

### TC-9.10 — Lege kolom
**Teststappen:**
1. Zoek een medewerker/dag-combinatie zonder beurten.
**Verwachte uitkomst:** "Geen beurten gepland." zonder actieknop (compacte in-kolom variant).
**Resultaat:** ☐ Geslaagd ☐ Niet geslaagd — Opmerkingen: __________

---

## 10. Employee PWA (`/m`)

### TC-10.1 — Dagroute in volgorde
**Doel:** FR-040.
**Voorwaarden:** ingelogd als `jan@glashelder-demo.nl`.
**Verwachte uitkomst:** genummerde lijst beurten met adres/dienst/verwachte tijd, in geoptimaliseerde volgorde.
**Resultaat:** ☐ Geslaagd ☐ Niet geslaagd — Opmerkingen: __________

### TC-10.2 — Eén-tik navigatie
**Doel:** FR-041.
**Teststappen:**
1. Tik "Navigeren" bij een beurt.
**Verwachte uitkomst:** opent Maps-deeplink (of ingebedde kaart als fallback).
**Resultaat:** ☐ Geslaagd ☐ Niet geslaagd — Opmerkingen: __________

### TC-10.3 — Beurt starten
**Teststappen:**
1. Tik op een geplande beurt om te starten.
**Verwachte uitkomst:** status → `onderweg`, `started_at`-timestamp vastgelegd.
**Resultaat:** ☐ Geslaagd ☐ Niet geslaagd — Opmerkingen: __________

### TC-10.4 — Pauzeren/hervatten
**Verwachte uitkomst:** indien deze functie bestaat in de huidige PWA-flow: status/tijd correct bijgewerkt bij pauzeren en hervatten. Noteer als "N.v.t." als deze knop niet aanwezig blijkt (mogelijk niet expliciet in Sprint 5-scope, geen apart FR-nummer gevonden).
**Resultaat:** ☐ Geslaagd ☐ Niet geslaagd ☐ N.v.t. — Opmerkingen: __________

### TC-10.5 — Beurt afronden met notitie + foto
**Doel:** FR-042/FR-044.
**Teststappen:**
1. Tik "Gereed", voeg een notitie toe, maak/upload een foto.
**Verwachte uitkomst:** status → `uitgevoerd`, `completed_at` vastgelegd, foto zichtbaar in beurt-detail (Supabase Storage), conceptfactuur automatisch getriggerd (zie TC-11.1).
**Resultaat:** ☐ Geslaagd ☐ Niet geslaagd — Opmerkingen: __________

### TC-10.6 — "Niet thuis"-flow
**Doel:** FR-043, BR-015.
**Teststappen:**
1. Tik "Niet thuis" bij een geplande beurt, kies reden.
2. Controleer in Supabase Studio: `jobs.status`, en of de eerstvolgende ideale datum ongewijzigd blijft (frequentieteller loopt niet door — BR-001/BR-015).
**Verwachte uitkomst:** status → `niet_thuis`, beurt naar herplan-wachtrij (zichtbaar op `/planning/wachtrij`). **Let op:** verwacht **geen** automatisch klantbericht (WhatsApp/e-mail) — de messaging-adapter (Sprint 8, `19_WhatsApp.md`) is niet gebouwd; dit is geen bug.
**Resultaat:** ☐ Geslaagd ☐ Niet geslaagd — Opmerkingen: __________

### TC-10.7 — Werkbon
**Teststappen:**
1. Open na afronden de werkbon (`/m/beurt/[id]/werkbon`).
**Verwachte uitkomst:** werkbon toont uitgevoerde beurt-details correct.
**Resultaat:** ☐ Geslaagd ☐ Niet geslaagd — Opmerkingen: __________

### TC-10.8 — Offline: beurt afronden zonder netwerk
**Doel:** FR-045.
**Teststappen:**
1. Schakel netwerk uit (DevTools → Network → Offline, of vliegtuigmodus op mobiel).
2. Rond een beurt af.
**Verwachte uitkomst:** UI toont "Offline"-badge en "Wacht op verbinding..."; actie lokaal opgeslagen (IndexedDB), geen crash.
**Resultaat:** ☐ Geslaagd ☐ Niet geslaagd — Opmerkingen: __________

### TC-10.9 — Sync na verbinding herstellen
**Teststappen:**
1. Schakel netwerk weer in.
**Verwachte uitkomst:** automatische sync, "Synchroniseert X/Y wijzigingen..."-indicator, uiteindelijk status correct in de database.
**Resultaat:** ☐ Geslaagd ☐ Niet geslaagd — Opmerkingen: __________

### TC-10.10 — Medewerker ziet geen prijzen/facturen
**Doel:** 23_Gebruikersrollen.md P1/P2-grens.
**Teststappen:**
1. Doorloop de volledige PWA als medewerker.
**Verwachte uitkomst:** nergens prijzen, factuurbedragen, omzetcijfers, of collega's-planning zichtbaar — uitsluitend eigen route.
**Resultaat:** ☐ Geslaagd ☐ Niet geslaagd — Opmerkingen: __________

### TC-10.11 — Uitloggen vanuit de PWA
**Doel:** een medewerker moet op een gedeeld/company-device kunnen uitloggen zodat een collega kan inloggen (basis-verwachting bij elke geauthenticeerde app; impliciet onderdeel van TC-1.5).
**Teststappen:**
1. Log in als medewerker (`jan@glashelder-demo.nl`), land op `/m`.
2. Zoek een uitlogmogelijkheid: header, menu, `/m/profiel`.
**Verwachte uitkomst:** een zichtbare "Uitloggen"-actie, bereikbaar zonder de URL handmatig te hoeven aanpassen.
**Resultaat:** ☑ Niet geslaagd — **bevestigd via codeonderzoek, geen verder handmatig testen nodig.**
**Bevinding (rapportagesjabloon):**
```
Testnummer: TC-10.11
Wat ging fout (exact): app/m/layout.tsx (PWA-shell) bevat in de header alleen "ServOps" +
  SyncIndicator — geen uitlogknop/menu. Er bestaat geen /m/profiel-route (wel genoemd in
  41_CodingStandards.md § 1 bestandsstructuur: "/m/profiel/**"). De signOut-actie bestaat wel
  (lib/auth/actions.ts) en wordt gebruikt door de desktop-topbar, maar is nergens in de
  PWA-shell aangesloten.
Vermoedelijke oorzaak: /m/profiel (en de uitlog-entry daarin) is kennelijk nog niet gebouwd
  binnen de huidige sprintscope, terwijl de bestandsstructuur-conventie het al aankondigt.
Ernst: P2 — kernfunctionaliteit (uitloggen) ontbreekt voor de PWA-rol zonder workaround binnen
  de app zelf (alleen te omzeilen door browserdata/cookies te wissen); relevant voor elk bedrijf
  waar meerdere medewerkers hetzelfde toestel gebruiken.
Aanbevolen oplossing: voeg een minimale uitlog-entry toe aan de PWA-header (bv. een menu-icoon
  naast de SyncIndicator dat de bestaande signOut-Server-Action aanroept), of bouw /m/profiel
  met daarin ten minste de uitlogknop.
```

---

## 11. Facturen

> **Scope-opmerking:** conform § 0 punt 1 test je hier uitsluitend het Sprint 5 MVP-model (`draft`/`sent`/`paid`, handmatig, geen Mollie). Markeer FR-063/FR-065/FR-067-stappen als "N.v.t. — nog niet gebouwd".

### TC-11.1 — Automatische conceptfactuur bij afronden
**Doel:** FR-060.
**Teststappen:**
1. Rond een beurt af in de PWA (TC-10.5).
2. Open `/facturen` als Eigenaar.
**Verwachte uitkomst:** nieuwe conceptfactuur (`status='draft'`) zichtbaar, gekoppeld aan de juiste klant/beurt.
**Resultaat:** ☐ Geslaagd ☐ Niet geslaagd — Opmerkingen: __________

### TC-11.2 — BTW correct berekend
**Doel:** FR-061/BR-303.
**Teststappen:**
1. Open een conceptfactuur, controleer bedrag excl./BTW/incl. tegen het BTW-tarief van de onderliggende dienst.
**Verwachte uitkomst:** rekenkundig correct voor 21%/9%/0%/verlegd (afhankelijk van seed-diensten).
**Resultaat:** ☐ Geslaagd ☐ Niet geslaagd — Opmerkingen: __________

### TC-11.3 — Finaliseren: gap-loos volgnummer
**Doel:** BR-020.
**Teststappen:**
1. Finaliseer twee conceptfacturen na elkaar.
2. Controleer de toegekende nummers in Supabase Studio (`invoices.invoice_number`, `invoice_number_counters`).
**Verwachte uitkomst:** opeenvolgend, geen gat, geen duplicaat; formaat `{BedrijfsCode}-{Jaar}-{Seq}`.
**Resultaat:** ☐ Geslaagd ☐ Niet geslaagd — Opmerkingen: __________

### TC-11.4 — PDF-preview
**Doel:** FR-062.
**Verwachte uitkomst:** logo, bedrijfsgegevens (KVK/BTW/IBAN uit `config_json.invoicing`, PRD A-20), klantgegevens, factuurregels, totaal, vervaldatum correct in de PDF.
**Resultaat:** ☐ Geslaagd ☐ Niet geslaagd — Opmerkingen: __________

### TC-11.5 — E-mailverzending
**Doel:** FR-064 (e-mail, MVP).
**Teststappen:**
1. Verstuur een factuur per e-mail (Resend).
**Verwachte uitkomst:** verzendlog toont tijdstip; bij ontbrekende `RESEND_API_KEY` lokaal: duidelijke foutmelding i.p.v. stille failure (zie README-opmerking hierover).
**Resultaat:** ☐ Geslaagd ☐ Niet geslaagd — Opmerkingen: __________

### TC-11.6 — Handmatig markeren als betaald
**Doel:** PRD § 19 A-19 (`mark_invoice_paid()`).
**Teststappen:**
1. Markeer een verzonden factuur als betaald.
**Verwachte uitkomst:** status → `paid`, zichtbaar in overzicht.
**Resultaat:** ☐ Geslaagd ☐ Niet geslaagd — Opmerkingen: __________

### TC-11.7 — Overzicht-aantallen kloppen
**Teststappen:**
1. Vergelijk `/facturen`-overzicht (concept/verzonden/betaald-aantallen) met seed-rapport (20/15/12) plus eventuele wijzigingen tijdens het testen.
**Verwachte uitkomst:** aantallen kloppen exact.
**Resultaat:** ☐ Geslaagd ☐ Niet geslaagd — Opmerkingen: __________

### TC-11.8 — Factuurnummer immutabel
**Teststappen:**
1. Probeer een gefinaliseerde factuur te bewerken/verwijderen.
**Verwachte uitkomst:** geen bewerkoptie voor het nummer/de regels; systeem staat dit niet toe (BR-020-immutabiliteit).
**Resultaat:** ☐ Geslaagd ☐ Niet geslaagd — Opmerkingen: __________

### TC-11.9 — Betaallink/QR/Mollie — N.v.t.
**Verwachte uitkomst:** bevestig dat er geen Mollie-betaalknop/QR-code in de PDF of UI zit (consistent met § 0 punt 1). Als je wél Mollie-functionaliteit aantreft, noteer dit als positieve afwijking (mogelijk alsnog gebouwd) i.p.v. fout.
**Resultaat:** ☐ Bevestigd N.v.t. ☐ Onverwacht aanwezig — Opmerkingen: __________

---

## 12. Database (Supabase Studio, `http://127.0.0.1:54323`)

### TC-12.1 — `agent_runs`
**Teststappen:**
1. Na een orchestrator-aanroep: open tabel `agent_runs`.
**Verwachte uitkomst:** rij(en) met `company_id`, `agent`, start/eind-tijd, `result` (`success`/`failed`/`partial`).
**Resultaat:** ☐ Geslaagd ☐ Niet geslaagd — Opmerkingen: __________

### TC-12.2 — `agent_proposals`
**Verwachte uitkomst:** rijen met `confidence` (0–1 float, niet 0–100), `reasoning`, `business_rules` (JSON), `data_sources`, `impact`, `expected_gain`, `alternatives`, `severity`, `approval_status`, correct `company_id`.
**Resultaat:** ☐ Geslaagd ☐ Niet geslaagd — Opmerkingen: __________

### TC-12.3 — `weerdata_cache`
**Verwachte uitkomst:** dagaggregaat-rij per bedrijf/datum na een Weather Agent-run, schema conform `11_DatabaseConcept.md` § 3.9.
**Resultaat:** ☐ Geslaagd ☐ Niet geslaagd — Opmerkingen: __________

### TC-12.4 — `jobs`-statustransities
**Teststappen:**
1. Volg één beurt door de hele levenscyclus (via UI-acties uit secties 9–11) en controleer elke statuswijziging in Studio.
**Verwachte uitkomst:** `voorgesteld → gepland → onderweg → uitgevoerd → gefactureerd`, geen ongeldige sprong (bv. rechtstreeks naar `gefactureerd` zonder `uitgevoerd` — BR-010).
**Resultaat:** ☐ Geslaagd ☐ Niet geslaagd — Opmerkingen: __________

### TC-12.5 — `routes`
**Verwachte uitkomst:** na optimalisatie (TC-5.2/TC-9.7) zijn `sequence`/tijden/afstanden per stop bijgewerkt.
**Resultaat:** ☐ Geslaagd ☐ Niet geslaagd — Opmerkingen: __________

### TC-12.6 — `invoices` / `invoice_number_counters`
**Verwachte uitkomst:** nieuwe conceptfactuur-rij bij afronden beurt; teller correct opgehoogd binnen dezelfde transactie als finaliseren (BR-020).
**Resultaat:** ☐ Geslaagd ☐ Niet geslaagd — Opmerkingen: __________

### TC-12.7 — RLS actief op nieuwe Sprint 7-tabellen
**Teststappen:**
1. Controleer in Studio (Database → Policies) of `agent_runs`/`agent_proposals` RLS-policies hebben (niet alleen "RLS enabled" zonder policy — dat zou alles blokkeren of, erger, niets).
**Verwachte uitkomst:** policies aanwezig, scoped op `company_id`.
**Resultaat:** ☐ Geslaagd ☐ Niet geslaagd — Opmerkingen: __________

---

## 13. Regressietest (bestaande functionaliteit)

### TC-13.1 — Klanten CRUD
**Verwachte uitkomst:** aanmaken/bewerken/bekijken van klanten (FR-001) werkt ongewijzigd.
**Resultaat:** ☐ Geslaagd ☐ Niet geslaagd — Opmerkingen: __________

### TC-13.2 — Objecten + geocoding
**Verwachte uitkomst:** object toevoegen aan klant, adres-geocoding via Mapbox werkt (FR-002/003).
**Resultaat:** ☐ Geslaagd ☐ Niet geslaagd — Opmerkingen: __________

### TC-13.3 — Diensten/instellingen
**Verwachte uitkomst:** `/instellingen/diensten` en `/instellingen/medewerkers` CRUD werkt.
**Resultaat:** ☐ Geslaagd ☐ Niet geslaagd — Opmerkingen: __________

### TC-13.4 — Planning drag-and-drop (Sprint 4, ongewijzigd)
**Verwachte uitkomst:** identiek gedrag aan TC-9.2, geen regressie door Sprint 7-toevoegingen.
**Resultaat:** ☐ Geslaagd ☐ Niet geslaagd — Opmerkingen: __________

### TC-13.5 — Dashboard (`/dashboard`) los van Morning Briefing
**Doel:** PRD § 19 A-21 punt 1 — KPI-dashboard verhuisde naar `/dashboard`, apart van `/`.
**Verwachte uitkomst:** `/dashboard` toont het bestaande KPI-dashboard (omzetgrafiek, etc.), functioneel gescheiden van de Morning Briefing op `/`.
**Resultaat:** ☐ Geslaagd ☐ Niet geslaagd — Opmerkingen: __________

### TC-13.6 — PWA golden path zonder AI-invloed
**Verwachte uitkomst:** login → dagroute → starten → foto's → afronden → conceptfactuur werkt exact zoals in Sprint 5, ongeacht of de Sprint 7-agents gedraaid hebben.
**Resultaat:** ☐ Geslaagd ☐ Niet geslaagd — Opmerkingen: __________

### TC-13.7 — Geautomatiseerde testsuite groen
**Teststappen:**
1. `npm run lint`
2. `npm run typecheck`
3. `npm run test`
4. `npm run test:integration` (vereist lokale Supabase)
5. `npm run build`
**Verwachte uitkomst:** alle commando's slagen zonder fouten (README claimt 141+ unit-tests, 56+ integratietests, plus 47 nieuwe Sprint 7-unit-tests en 8 nieuwe integratietests per `40_Implementatieplan.md`).
**Resultaat:** ☐ Geslaagd ☐ Niet geslaagd — Opmerkingen: __________

---

## 14. Edge Cases

### TC-14.1 — Geen voorstellen
**Verwachte uitkomst:** zie TC-2.12 — nooit een kaal scherm.
**Resultaat:** ☐ Geslaagd ☐ Niet geslaagd — Opmerkingen: __________

### TC-14.2 — Meerdere voorstellen tegelijk (>5)
**Teststappen:**
1. Forceer meerdere gelijktijdige signalen (bv. combineer TC-4.1 capaciteitstekort met een weersgevoelig scenario).
**Verwachte uitkomst:** lijst blijft leesbaar/scrollbaar, "Alles accepteren" verwerkt ze allemaal correct, Morning Mode springt naar 🔴 Red Day als een BR-702-grens of acuut risico wordt geraakt (44 § 6).
**Resultaat:** ☐ Geslaagd ☐ Niet geslaagd — Opmerkingen: __________

### TC-14.3 — Meerdere waarschuwingen tegelijk
**Verwachte uitkomst:** waarschuwingen tonen elk hun eigen ernst-indicator, urgentere items het meest opvallend (44 § 3.7).
**Resultaat:** ☐ Geslaagd ☐ Niet geslaagd — Opmerkingen: __________

### TC-14.4 — Geen weerdata beschikbaar
**Verwachte uitkomst:** zie TC-3.6 — neutrale melding, geen crash, rest van de briefing blijft werken.
**Resultaat:** ☐ Geslaagd ☐ Niet geslaagd — Opmerkingen: __________

### TC-14.5 — Medewerker zonder planning die dag
**Teststappen:**
1. Log in als een medewerker zonder beurten vandaag (of forceer via Studio).
**Verwachte uitkomst:** PWA toont een nette lege staat, geen crash.
**Resultaat:** ☐ Geslaagd ☐ Niet geslaagd — Opmerkingen: __________

### TC-14.6 — Planner zonder medewerkers
**Teststappen:**
1. Test in het TC-1.6-testbedrijf (nieuw, leeg) met beurten maar zonder actieve medewerker (of archiveer alle medewerkers tijdelijk in een kopie-scenario — niet in de hoofddemo doen).
**Verwachte uitkomst:** waarschuwing "Er staan beurten gepland maar er is geen actieve medewerker." met link naar `/instellingen/medewerkers` (bevestigd in `get-briefing.ts`).
**Resultaat:** ☐ Geslaagd ☐ Niet geslaagd — Opmerkingen: __________

### TC-14.7 — Route zonder jobs
**Verwachte uitkomst:** zie TC-9.10 — lege kolom, geen berekeningsfout, geen crash bij optimaliseren van een lege route.
**Resultaat:** ☐ Geslaagd ☐ Niet geslaagd — Opmerkingen: __________

### TC-14.8 — Conflicterende voorstellen tussen agents
**Doel:** ADR-011 § 3 — bij twee zachte, tegenstrijdige voorstellen worden beide getoond met een "conflicterend"-markering, nooit een stille auto-keuze.
**Teststappen:**
1. Probeer een scenario te forceren waarin Weather- en Capacity-Agent tegenstrijdig adviseren voor dezelfde route/dag.
**Verwachte uitkomst (per documentatie):** beide voorstellen zichtbaar met expliciete conflict-markering.
**Let op:** dit conflictresolutie-mechanisme is mogelijk nog niet volledig gebouwd binnen de Sprint 7-scope (de drie agents draaien vandaag logisch onafhankelijk van elkaar, per `agent-orchestrator/index.ts`-commentaar: "de drie agents zijn onderling logisch onafhankelijk"). Als er geen conflict-markering verschijnt maar simpelweg twee losse voorstellen: **rapporteer als bevinding, niet noodzakelijk als P1/P2-bug** — noteer het als openstaand punt voor een volgende sprint conform `43_AI_Agents.md` § 3a.
**Resultaat:** ☐ Geslaagd ☐ Niet geslaagd ☐ Bevinding genoteerd — Opmerkingen: __________

### TC-14.9 — Race condition: gelijktijdige acceptatie
**Teststappen:**
1. Open dezelfde briefing in twee vensters (zelfde gebruiker of twee Eigenaar/Planner-accounts), accepteer hetzelfde voorstel bijna gelijktijdig in beide.
**Verwachte uitkomst:** slechts één uitvoering, de tweede poging faalt netjes (guard uit TC-6.3) i.p.v. dubbele route-optimalisatie.
**Resultaat:** ☐ Geslaagd ☐ Niet geslaagd — Opmerkingen: __________

---

## 15. Performance

### TC-15.1 — Eerste load
**Teststappen:**
1. Hard-refresh `/` na login (cold cache), meet subjectief + via DevTools Network/Performance-tab.
**Verwachte uitkomst:** geen merkbare vertraging; skeleton (indien getoond) < 100ms zichtbaar vóór echte data (NFR-101/105).
**Resultaat:** ☐ Geslaagd ☐ Niet geslaagd — Opmerkingen: __________

### TC-15.2 — Morning Briefing-samenstelling
**Verwachte uitkomst:** de briefing is bij het openen van `/` direct compleet — geen zichtbare "nu AI-analyse uitvoeren"-laadstap in de UI (ADR-011 § 1: samengesteld vóórdat de gebruiker inlogt; assemblage gebeurt server-side in de RSC-data-fetch).
**Resultaat:** ☐ Geslaagd ☐ Niet geslaagd — Opmerkingen: __________

### TC-15.3 — Planning-board/optimalisatie
**Doel:** NFR-103 (<3s/60 stops).
**Teststappen:**
1. Meet de tijd tussen klikken op "Route optimaliseren" en het zichtbare resultaat, voor een route met een realistisch aantal stops (seed: routes met 3–6 beurten per werkdag — voor een zwaardere test, combineer meerdere wachtrij-beurten op één route).
**Verwachte uitkomst:** ruim binnen enkele seconden, geen waarneembare hang.
**Resultaat:** ☐ Geslaagd ☐ Niet geslaagd — Opmerkingen: __________

### TC-15.4 — Command bar reactietijd
**Verwachte uitkomst:** openen en typen in ⌘K voelt instant (<100ms interactie-feedback, PRD § 11.3).
**Resultaat:** ☐ Geslaagd ☐ Niet geslaagd — Opmerkingen: __________

### TC-15.5 — Drag-and-drop-herberekening
**Doel:** FR-022 (<2s).
**Verwachte uitkomst:** na een drop is de nieuwe route-tijdberekening binnen 2 seconden zichtbaar.
**Resultaat:** ☐ Geslaagd ☐ Niet geslaagd — Opmerkingen: __________

---

## 16. Eindcontrole — GO / NO-GO

### 16.1 Samenvattingstabel (in te vullen na afloop)

| Sectie | # Tests | Geslaagd | Niet geslaagd | P1 | P2 | P3 | P4 |
|---|---|---|---|---|---|---|---|
| 1. Login & Onboarding | 6 | | | | | | |
| 2. Morning Briefing | 13 | | | | | | |
| 3. Weather Agent | 6 | | | | | | |
| 4. Capacity Agent | 5 | | | | | | |
| 5. Optimization Agent | 5 | | | | | | |
| 6. Approval Handler | 7 | | | | | | |
| 7. AI Proposal Cards | 5 | | | | | | |
| 8. AI Command Bar | 9 | | | | | | |
| 9. Planner | 10 | | | | | | |
| 10. Employee PWA | 10 | | | | | | |
| 11. Facturen | 9 | | | | | | |
| 12. Database | 7 | | | | | | |
| 13. Regressietest | 7 | | | | | | |
| 14. Edge Cases | 9 | | | | | | |
| 15. Performance | 5 | | | | | | |
| **Totaal** | **113** | | | | | | |

### 16.2 GO/NO-GO-criteria

| Doel | Criterium voor GO |
|---|---|
| **GitHub push** | Geen open P1. `npm run lint`/`typecheck`/`test`/`build` groen (TC-13.7). Geen RLS-lek (TC-1.6, TC-12.7). |
| **Vercel deployment** | Bovenstaand, plus: geen open P2 op kernflows (login, planning, PWA-golden-path, facturatie-conceptflow). Bekende, reeds in `README.md` gedocumenteerde productie-configuratiegaten (Mapbox-token, Resend-key, `config_json.invoicing`/`depot_location`) zijn geen blokkade voor deployment zelf, mits vóór livegang alsnog ingesteld. |
| **Pilot (echte klant)** | Bovenstaand, plus: BR-702 aantoonbaar hard (TC-4.4, TC-6.6, TC-6.7 allemaal geslaagd — geen enkele AI-actie zonder goedkeuring). Alle Sprint 7-agent-tests (secties 3–6) geslaagd of afwijkingen zijn uitsluitend P3/P4. Geen dataverlies/security-bevindingen. |

### 16.3 Eindoordeel

```
GO voor GitHub push:       ☐ JA   ☐ NEE — reden: ___________
GO voor Vercel deployment: ☐ JA   ☐ NEE — reden: ___________
GO voor Pilot:              ☐ JA   ☐ NEE — reden: ___________

Openstaande P1's: ___
Openstaande P2's: ___
Getest door: ___________  Datum: ___________
```

### 16.4 Bekende, reeds gedocumenteerde beperkingen (geen blokkade, wél te communiceren)

Deze punten zijn al door het project zelf vastgelegd (`README.md`, PRD § 19) en horen niet als "verrassing" in een NO-GO-besluit terecht te komen — wel als expliciete aantekening bij een GO:

- `planning-generate` Edge Function nog niet naar Supabase Cloud gedeployed.
- Migraties 016–021 (en mogelijk 022–024 voor Sprint 7, verifiëren) nog niet naar Supabase Cloud productie gepusht.
- `MAPBOX_ACCESS_TOKEN` en `config_json.depot_location` nog niet ingesteld op productie → `route-optimize`/`route-move-job` geven `config_error`/`depot_location_missing` in productie.
- `RESEND_API_KEY`/`RESEND_FROM_EMAIL` en `config_json.invoicing` nog niet ingesteld op productie → facturen versturen geeft `config_error`.
- Custom SMTP voor Supabase Auth nog niet ingesteld vóór trafiek op schaal.
- Sprint 6 (Mollie/betaallink/herinneringen) ontbreekt in de codebase (§ 0 punt 1).
- Replanning Agent en automatiseringsniveau-instellingen-UI ontbreken nog (§ 0 punten 2–3).

---

*Einde testhandleiding. Dit document bevat geen code en er zijn geen wijzigingen aan het project doorgevoerd tijdens het opstellen ervan.*
