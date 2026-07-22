# 10 — Business Rules

**Status:** DONE
**Versie:** 1.9
**Bron van waarheid:** `00_PRD.md` § 15 — dit document mag het PRD niet tegenspreken.
**Werkinstructie:** zie `MASTER_PROMPT.md`.

---

## Doel van dit document

Dit document formuleert de **operationele regels** die de domeinlogica bepalen. Regels zijn:
- **Harde regels (must):** nooit schenden (afdwingend in code/database)
- **Zachte regels (should):** voorstel/waarschuwing, maar gebruiker kan afwijken
- Genummerd **BR-xxx** (stabiel, niet hergebruiken)

---

## 1. Conventies

- **BR-### (Hard):** afdwingend; database-constraints of applicatielogica wijst invoer af
- **BR-###-S (Soft):** voorstel; planner kan negeren met bewuste override
- Alle regels hebben trigger-voorwaarde, actie en exception-criteria

---

## 2. Statusmachine Beurt (Domeinregel BR-050 t/m BR-065)

### 2.1 Diagram: staatstransities

```
┌─────────────────────────────────────────────────────────┐
│   voorgesteld ──┐                                       │
│      ↓          │                                       │
│    gepland ─────┼──→ onderweg ──→ uitgevoerd ──→ gefactureerd
│      │          │        ↓            ↓
│      │          └────────┴─→ niet_thuis
│      │                        ↓
│      └───────────────→ geannuleerd
│                        ↓
└─────────────────────────────────────────────────────────
Eindstaat: gefactureerd | geannuleerd | niet_thuis
```

### 2.2 Statusdefinities

| Status | Betekenis | Verantwoordelijk | Kan wijzigen naar |
|---|---|---|---|
| `voorgesteld` | AI Planner heeft beurt gegenereerd; nog niet in route | Systeem | `gepland` |
| `gepland` | Beurt is toegewezen aan route; medewerker weet ervan | Planner | `onderweg`, `geannuleerd` |
| `onderweg` | Medewerker is ter plaatse of in transit | Medewerker (PWA) | `uitgevoerd`, `niet_thuis` |
| `uitgevoerd` | Werk klaar, conceptfactuur gegenereerd | Medewerker | `gefactureerd`, `herplan` (correction) |
| `gefactureerd` | Definitieve factuur gegenereerd & nummerd | Systeem/Planner | `retract` (creditfactuur) |
| `niet_thuis` | Klant niet aanwezig; frequentie-teller niet verhoogd | Medewerker | `herpland` (next cycle) |
| `geannuleerd` | Beurt is verwijderd (pauzering, klant-verzoek) | Planner | *immutable* |
| `herplan` | In wachtrij voor herplanning (bij niet-thuis, ziekte, etc.) | Systeem | `gepland` (na herplanning) |

### 2.3 Transitieregels (hard)

| Van | Naar | Voorwaarde | Acties |
|---|---|---|---|
| `voorgesteld` | `gepland` | Planner sleept beurt in route | Route herberekent; beurten naast- en nadagen shifted |
| `gepland` | `onderweg` | Medewerker start navigatie naar adres | Timestamp `started_at` vastgelegd |
| `onderweg` | `uitgevoerd` | Medewerker tikt "Gereed" in PWA | Timestamp `completed_at`; optioneel foto/notitie opgeslagen; concept-factuur getriggerd |
| `onderweg` | `niet_thuis` | Medewerker tikt "Niet thuis" | Bericht naar klant; beurt → `herplan`; frequentie-teller NOT incremented |
| `uitgevoerd` | `gefactureerd` | Planner klikt "Finaliseer factuur" OR auto-finalisering (24u) | Factuurnummer toegekend; PDF gegenereerd; status update |
| `gefactureerd` | *creditfactuur* | Planner voert correctie in | Creditfactuur aangemaakt; origineel gelinkt; balans bijgewerkt |
| `gepland` | `geannuleerd` | Planner annuleert; dienstafspraak pauzering; klant-verzoek | Klant notified; slot in route-planning vrijgemaakt |
| Alle | `herplan` | Ziekte medewerker, slechtweer-voorspelling, niet-thuis | Beurt in herplan-wachtrij; prioriteit ingesteld |

### 2.4 Kernregels statusmachine (canoniek, PRD §15)

- **BR-010 (Hard):** Een beurt kan alleen naar `gefactureerd` vanuit `uitgevoerd`. Geen enkele andere status gaat rechtstreeks naar `gefactureerd`.
- **BR-015 (Hard):** `niet_thuis` telt **niet** als uitvoering: de frequentieteller loopt niet door (ideale datum blijft gebaseerd op laatste `uitgevoerd`, BR-001) en de beurt gaat naar de herplan-wachtrij met prioriteit.

### 2.5 Immutable Transitieregels (hard)

- **BR-051 (Hard):** Beurt in status `gefactureerd` kan NIET terug naar `onderweg` of `gepland`. Correcties via creditfactuur.
- **BR-052 (Hard):** Beurt in status `geannuleerd` is finaal; geen wijzigingen meer.

---

## 3. Frequentie- en Datumregels

### BR-001 (Hard): Ideale datum volgende beurt

> **Ideale datum = datum LAATSTE `uitgevoerd`-beurt + interval**

Niet: geplande datum.

**Rationale:** frequentie-trouw gemeten aan werkelijke uitvoering, niet plannen.

**Voorbeeld:**
- Dienstafspraak: "elke 4 weken"
- Beurt #1 geplanned op ma 24/6, werkelijk uitgevoerd wo 26/6
- Ideale datum beurt #2 = 26/6 + 28 dagen = do 24/7 (niet: 24+28=22/7)

**Implementatie:**
```sql
ideal_date = LAST(job WHERE status='completed').completed_at + interval
```

---

### BR-101 (Soft): Flexibiliteitsvenster

> Planner mag beurt tot ±N werkdagen afwijken van ideale datum.

Default: ±3 werkdagen. Per dienstafspraak instelbaar.

**Soft-warning (BR-101-S):** Beurt buiten venster → UI badge "Afwijking [+5 dagen]"
**Hard-limit override:** Planner kan expliciet "Negeer venster" klikken (audit-logged)

---

### BR-102 (Hard): Geen gaten in frequentieverloop

> Eenmaalbeurten (`frequency='once'`) krijgen geen opvolgingsbeurt.

---

### BR-103 (Soft): Maand-patronen

> Frequentie "elk kwartaal" = eerste donderdag van elk 3-maandelijkse periode (instelbaar per dienstafspraak).

**Voorbeeld:** Q1 = 1-31 jan, Q2 = 1-30 apr, Q3 = 1-30 jul.
Ideale datum = 1e donderdag van Q-maand.

---

## 4. Planningsregels (BR-200 t/m BR-220)

### BR-200 (Hard): Vergrendelde beurten verplaatsen niet

> Een beurt met `locked=true` en `locked_until >= today` wordt NOOIT automatisch verplaatst (herplannen, AI-optimalisatie).

**Acties die zijn NIET toegestaan:**
- Automatische dag-verschuiving (ziekte-herplannen)
- Geografische clustering
- AI-voorstel

**Acties die WEL:
- Planner sleept handmatig (expliciete actie)
- Datumaanpassing als user "unlock" geklikt heeft

**Implementatie:** AI-algoritme-query filtert `WHERE locked=false OR locked_until < today`.

---

### BR-201 (Hard): Beschikbaarheid medewerker absoluut

> Beurt kan NIET gepland op dag/uur waarvoor medewerker `unavailable=true` of verlof heeft.

**Edge case:** Medewerker voegt verlof in; alle beurten van die dag → auto-herplan-wachtrij; planner reviewed voorstel.

---

### BR-202 (Hard): Maximale werkdaglengte

> Medewerker mag max 8,5 uur per dag (incl. reistijd) werken.

**Trigger:** Planning-algoritme weigert beurt toe te voegen if totaal-duur > 8,5u.

**UI:** Capaciteits-waarschuwing (FR-027).

---

### BR-203 (Hard): Geen dubbele dienstafspraken zelfde dag

> Eenzelfde dienstafspraak kan niet 2× op dezelfde dag geplanned worden.

**Implementatie:** Uniek-constraint `UNIQUE(service_agreement_id, route_date)`.

**Exception:** Twee VERSCHILLENDE dienstafspraken (bijv. "Glasbewassing buiten" EN "Glasbewassing ramen") op zelfde object = allowed, worden gecombineerd in één stop.

---

### BR-204 (Soft): Geografische clustering

> Adressen in dezelfde buurt (bijv. 1km² PostGIS-buffer) worden voorkeur dezelfde dag geclusterd.

**Soft:** wijging in scoring-model (gewicht instelbaar door planner).

---

### BR-205 (Hard): Respect klant-voorkeur dagdeel

> Dienstafspraak met `preferred_daypart='ochtend'` plant beurt voor 12:00 of voorstel ±1 dag.

---

## 5. Facturatie- en Nummeringsregels

### BR-020 (Hard): Factuurnummers doorlopend en gap-loos

> Factuurnummers per bedrijf, per jaar: sequentieel zonder gaten.

**Format:** {BedrijfsCode}-{Jaar}-{Seq}
**Voorbeeld:** ABC-2026-00001, ABC-2026-00002 (geen ABC-2026-00003 slaan over).

**Implementatie (concurrency-veilig, verplicht):** een `SELECT MAX(number_seq)+1`-query **zonder locking** is niet gap-loos-veilig: twee gelijktijdige finaliseringen (bijv. bulk-finaliseren, 40_Implementatieplan.md Sprint 5) kunnen hetzelfde MAX lezen en hetzelfde volgnummer berekenen — een race condition die de wettelijk verplichte gaploze reeks breekt. Verplicht patroon: een per-bedrijf-per-jaar tellerrij (`invoice_number_counters`, 11_DatabaseConcept.md § 3.6) die met een rij-lock wordt opgehoogd **binnen dezelfde transactie** als de finalisering:

```sql
-- tabel: invoice_number_counters (company_id, year, last_seq) — PK (company_id, year)
BEGIN;
  INSERT INTO invoice_number_counters (company_id, year, last_seq)
    VALUES (:company_id, :year, 0)
    ON CONFLICT (company_id, year) DO NOTHING;
  SELECT last_seq FROM invoice_number_counters
    WHERE company_id = :company_id AND year = :year
    FOR UPDATE;                                   -- rij-lock, blokkeert gelijktijdige finalisering
  UPDATE invoice_number_counters
    SET last_seq = last_seq + 1
    WHERE company_id = :company_id AND year = :year
    RETURNING last_seq;                           -- dit is het toe te kennen volgnummer
COMMIT;
```

Het teruggegeven volgnummer wordt in dezelfde transactie op de factuur vastgelegd. Dit voorkomt zowel duplicaten als gaten onder gelijktijdige `invoice-finalize`-aanroepen (13_API_Specificatie.md § 4) — een losstaande `UNIQUE`-constraint op `invoice_number` voorkomt wél duplicaten maar **niet** de race an sich (de transactie die verliest rolt terug/wacht, in plaats van gewoon een ander nummer te proberen).

**Immutabiliteit (BR-020-Hard):** Factuurnummer eenmaal toegekend = NOOIT wijzigen. Correctie = creditfactuur.

---

### BR-302 (Hard): Conceptfactuur → definitief

> Conceptfactuur (status `draft`) kan ENKEL definitief (status `finalized`) via expliciete actie.

**Automatisch** (V1): concept → definitief na 24 uur (instelbaar).

**Manual:** Planner klikt "Finaliseer" in dashboard.

**Actions bij finalisering:**
1. Factuurnummer toekennen (volgende in reeks)
2. PDF genereren
3. Status → `finalized`
4. Verzending-job queued (e-mail/WhatsApp per klant-voorkeur)

---

### BR-303 (Hard): BTW correct per dienst

> Elke factuurregel berekent BTW volgens dienst-instelling (21% / 9% / 0% / Verlegd).

**Disclaimer (BR-303-Soft):** UI waarschuwt bij 9% of 0%: "Controleer zelf of je recht hebt op deze tarieven (schoonmaakregeling, etc.)"

---

### BR-304 (Soft): Abonnement dekt inbegrepen beurten

> Abonnementsprijs per maand dekt max N beurten (instelbaar per dienstafspraak).

**Overage:** Beurt N+1 → aparte regel op factuur "Overage: €50".

---

### BR-306 (Hard): Prioriteit klant-specifieke prijs-overrides

> Bij het bepalen van de prijs van een beurt geldt de specifiekste override: **Job > Klant > Dienstafspraak > Dienst**. De eerste geldige (binnen zijn geldigheidsperiode) match in die volgorde bepaalt de prijs; ontbrekende niveaus vallen door naar het eerstvolgende.

**Voorbeeld:** een klant heeft een lopende 10%-korting-override (Klant-niveau); één specifieke beurt heeft daarnaast een eenmalige Job-override (vast bedrag, bv. een spoedopdracht met meerprijs). De Job-override wint voor die ene beurt; alle andere beurten van diezelfde klant volgen de 10%-korting.

**Implementatie:** 18_Prijsafspraken.md § 7 (volledige uitwerking: instelbare velden, geldigheidsperiode, edge cases PA-06 t/m PA-09).

---

## 6. Betalings- en Herinneringsregels (BR-400 t/m BR-420)

### BR-400 (Hard): Betaling-status via Mollie-webhook

> Factuur-status `betaald` gepresenteerd UITSLUITEND NA Mollie-webhook-bevestiging.

**Local status tracking:**
```
open → (klant betaald iDEAL) → webhook gefierd → status='betaald'
```

**Security:** Webhook-signature moet gevalideerd (HMAC-secret).

---

### BR-401 (Soft): Automatische herinneringsplanning

> Factuur-status `open` (niet betaald) → reminders op +7, +14, +21 dagen (instelbaar per bedrijf).

**Job:** Dagelijks cron: check alle `open` facturen; trigger reminder als:
```
date_now >= (created_at + reminder_days[i])
AND (not reminder_sent_at[i] OR date_now - reminder_sent_at[i] > 1 dag)
```

---

### BR-402 (Soft): Escalatie na laatste herinnering

> Na laatste reminder (bijv. +21 dagen) → status `overdue` (UI-indicator).

**Optional:** bedrijf kan "vervolg-acties" instellen (bijv. incasso-aanmaning).

---

### BR-403 (Hard): Dubbele betaling-handling

> Factuur betaald; tweede betaling binnenkomst → Mollie-webhook filtert duplicaten (idempotentie).

**Fallback:** Handmatige overschot-detectie: "Factuur #123: betaald €150, ontvangen €300 → overschot €150"

**Actions:** Terugbetalen (Mollie refund) OR verrekenen tegen volgende factuur (user-keuze).

---

## 7. Klant/Object-Lifecycleregels

### BR-040 (Hard): Klant verwijderen met facturen verboden

> Klant met `invoices` of `open_jobs` kan NIET verwijderd.

**Alternatieven:**
- **Archiveren:** klant → `archived=true` (lees-only, niet zichtbaar in planning)
- **Anonimisering (AVG):** klant-gegevens → generieke waarden; relaties behouden voor rapportage

**Implementatie:** DB-trigger weigert DELETE.

---

### BR-030 (Hard): Pauzering annuleert toekomstige beurten

> Dienstafspraak pauzeren (status → `paused`, `paused_until` = datum) → alle toekomstige NIET-VERGRENDELDE beurten van deze afspraak → `geannuleerd`.

**Vergrendelde beurten:** planner moet handmatig behandelen.

**Klant-notificatie:** "Je dienst is gepauzeerd tot en met [datum]. We nemen contact op om weer te starten."

---

### BR-502 (Soft): Archiveren soft-delete

> Klant archiveren (niet verwijderen) → `archived_at` timestamp; niet zichtbaar in normale UI.

**Behoud:** historische rapportage, audit-trail, betaalbewijs.

---

## 8. Communicatie-regels (BR-600 t/m BR-620)

### BR-600 (Hard): Opt-in voor WhatsApp vereist

> WhatsApp-berichten (notificaties, herinneringen, facturen) mogen ENKEL als klant `whatsapp_opt_in=true`.

**Implementatie:** Klant-setup verplicht opt-in-checkbox; audit-log per opt-in-moment.

---

### BR-601 (Hard): Opt-out gerespecteerd

> Klant met `email_opt_out=true` of `whatsapp_opt_out=true` ontvangt geen berichten op die kanaal.

**Exception:** Transactionele berichten (factuur-PDF) mogen via ander kanaal als user dat heeft gekozen.

---

### BR-602 (Soft): Bericht-template variabele-validatie

> Template bevat `{{variable}}` die moet bestaan in beurt/klant-context.

**Soft:** warning als `{{unknown_var}}` in template (niet fataal, var = lege string in output).

---

## 9. AI-Planner-regels (BR-700 t/m BR-720)

### BR-700 (Hard): Transparantie per beurt

> Elke voorgestelde of hergeplande beurt bevat "Waarom?"-uitleg in logs.

**Voorbeeld:** "Beurt #456 op di 14/7 (2 dagen vóór ideale datum 16/7): geclusterd met 4 adressen in Wijk Noord; ma niet beschikbaar per klant-voorkeur."

**Implementatie:** Logging-object per beurt-generatie:
```json
{
  "job_id": 456,
  "reason": "clustering",
  "date_delta_days": -2,
  "clustering_cluster_id": "Noord-42",
  "locked_dates": ["2026-07-14"],
  "score": 87.5
}
```

---

### BR-701 (Soft): Scoring-transparantie

> Planner kan scoring-gewichten aanpassen (sliders) en het voorstel direct zien wijzigen.

**Gewichten (canoniek — identiek aan 15_AIPlanner.md § 4; geen tweede bron van waarheid):**
- Afwijking ideale datum: default 40% (minimaliseren)
- Totale reistijd: default 30% (minimaliseren)
- Geografische clustering: default 20% (maximaliseren)
- Werkdrukbalans tussen medewerkers: default 10% (balanceren)

Deze vier gewichten zijn relatief aan elkaar en worden bij wijziging door het systeem genormaliseerd tot 100% (sliders tonen een onderlinge verhouding, geen onafhankelijke 0–100%-waarden). Weerrisico en stabiliteit-bij-herplannen wegen apart mee in de reactieve laag (15_AIPlanner.md § 6–7) en maken geen deel uit van deze vier hoofdgewichten.

---

### BR-702 (Hard): Human Approval — geen enkele AI Agent voert deze acties zelfstandig uit

> Facturen versturen, betalingen uitvoeren, prijsafspraken wijzigen, klanten verwijderen, medewerkers verwijderen, of een definitieve planning overschrijven vereist altijd expliciete menselijke goedkeuring — nooit een automatische AI Agent-actie, ook niet op het "Volautomatisch"-automatiseringsniveau (15_AIPlanner.md § 8).

**Reden:** deze zes acties zijn stuk voor stuk moeilijk of onmogelijk terug te draaien (een verstuurde factuur, een uitgevoerde betaling, een verwijderde klant) of raken direct de commerciële relatie met de klant (prijsafspraken) — precies de categorie waar PRD § 8.5's "mens als eindredacteur"-principe hard moet zijn, niet zacht/instelbaar.

**Implementatie:** ADR-011 (Human-in-the-Loop AI), `43_AI_Agents.md` § 12. Geen enkele agent-Edge-Function heeft schrijftoegang tot facturen-verzendstatus, betalingsuitvoering, prijsafspraken, of hard-delete van klanten/medewerkers — die schrijfpaden bestaan uitsluitend als door-de-gebruiker-geïnitieerde Server Actions/RPC's (analoog aan hoe `onboard_company()` het enige schrijfpad is naar `companies`/`users`, 002_companies_users.sql).

**Uitzondering:** een bedrijf kan een *reeds bestaand*, expliciet geconfigureerd automatiseringsniveau activeren voor routine-taken die **niet** in de lijst hierboven staan (bv. automatische "morgen"-berichten, FR-080) — dat is een bestaande, begrensde uitzondering (15_AIPlanner.md § 8 "Volautomatisch"), geen verzwakking van BR-702 zelf. Geen configuratie kan BR-702's zes genoemde acties automatiseren.

---

### BR-703 (Hard): AI Explainability — confidence, bronnen en alternatieven verplicht

> Elke AI Agent-beslissing (voorstel, waarschuwing, conceptactie) bevat een confidence score (0–100), de gebruikte databronnen, de toegepaste business rules, en de overwogen-maar-niet-gekozen alternatieven — niet alleen de "waarom"-uitleg van BR-700.

**Reden:** BR-700 legt vast *dat* er een reden getoond wordt bij de gekozen uitkomst; BR-703 breidt dit uit met *hoe zeker* het systeem is en *wat er nog meer overwogen is* — nodig zodra meerdere agents (43_AI_Agents.md) onafhankelijk voorstellen genereren die soms conflicteren (ADR-011 § "Conflictresolutie") en de gebruiker moet kunnen beoordelen welk voorstel te vertrouwen.

**Implementatie:** verplicht outputcontract voor alle acht agents (43_AI_Agents.md § 13) — geen agent-implementatie is compleet zonder deze vier velden in zijn voorstel/waarschuwing-output. Persistent opgeslagen (niet alleen getoond en weggegooid) t.b.v. de audittrail (43_AI_Agents.md § 14).

---

### BR-704 (Hard): Human Control over geleerde voorkeuren (Organizational Memory)

> Elke door AI Agents geleerde voorkeur (Planner/Customer/Object/Employee/Company Memory, `45_AgentMemory.md` § 2) is te allen tijde door de gebruiker te bekijken, aan te passen, uit te schakelen, te verwijderen en te resetten. Geen enkele voorkeur wordt permanent zonder deze menselijke controlemogelijkheid.

**Reden:** directe uitbreiding van BR-702 (Human Approval) naar de geheugenlaag — zoals AI nooit een definitieve planningsactie zonder goedkeuring uitvoert, mag AI ook nooit stilzwijgend een blijvend gedragspatroon over een klant, object, medewerker of het bedrijf vastleggen. Zonder deze regel zou Organizational Memory een ondoorzichtige, steeds verder groeiende black box kunnen worden — precies wat ADR-010/011 al expliciet afwijzen voor de planningsalgoritmes zelf.

**Implementatie:** `45_AgentMemory.md` § 6 (Human Control), § 10 (Governance — audittrail, versiebeheer, rolgebonden beheerrecht).

---

### BR-705 (Hard): Privacy-uitsluitingen Organizational Memory

> Organizational Memory leert nooit: wachtwoorden/authenticatiegegevens, betaalgegevens, medische informatie (een ziekmelding registreert alleen "afwezig", nooit de reden), of de inhoud van privécommunicatie (WhatsApp/e-mail-berichttekst) — ongeacht confidence-niveau of hoe nuttig het patroon zou lijken.

**Reden:** Organizational Memory leert uitsluitend **operationele planningspatronen** (AVG-grondslag: uitvoering overeenkomst/gerechtvaardigd belang, 36_Security.md § 7.1) — de vier uitgesloten categorieën vallen daar per definitie buiten en vereisen op zijn minst een aparte grondslag die dit systeem niet heeft.

**Implementatie:** `45_AgentMemory.md` § 9.1 (uitsluitingen) en § 9.2 (bewaartermijnen, aansluitend op 36_Security.md § 7.3/NFR-405).

---

### BR-706 (Hard): Taakallocatie nooit op individueel gedrag of persoonskenmerken

> Het toewijzen van beurten aan Medewerkers (door welke agent of welk algoritme dan ook) gebruikt uitsluitend objectief-operationele criteria — geografie/wijk, beschikbaarheid (BR-201), werkdaglimiet (BR-202), clustering (BR-204), klantvoorkeuren (BR-205) en harde bevoegdheidseisen (certificering) — en nooit individueel gedrag, persoonlijkheidskenmerken of prestatiescores van een Medewerker.

**Reden:** EU AI Act Annex III 4(b) merkt taakallocatie op basis van individueel gedrag of persoonskenmerken aan als hoog-risico-AI. ServOps' huidige niet-hoog-risico-classificatie (`47_AIAct_Compliance.md` § 5) steunt mede op deze grens; een feature die haar doorbreekt verandert stilzwijgend de wettelijke categorie van het hele platform. Wijziging van deze regel vereist daarom altijd een PRD-revisie mét herclassificatie en juridische toets (47 § 7).

**Implementatie:** `47_AIAct_Compliance.md` § 5.1/5.2; bestaande allocatielogica (15_AIPlanner.md, agent-replanning) voldoet al — deze regel bevriest dat.

---

### BR-707 (Hard): Geleerde per-medewerker-gegevens nooit voor beoordeling of monitoring

> Door Organizational Memory geleerde gegevens over een individuele Medewerker (waaronder de in `45_AgentMemory.md` § 2 voorziene "gemiddelde snelheid per dienst-type") worden nooit gebruikt voor prestatiebeoordeling, gedragsmonitoring of enig HR-besluit, en nooit als beoordeling of ranglijst gepresenteerd — het enige toegestane gebruik is stille schattingscorrectie van beurt-duur, en ook dat pas na de verplichte AI Act-pre-check (`47_AIAct_Compliance.md` § 5.3).

**Reden:** het monitoren/evalueren van prestaties en gedrag van werkenden is de tweede poot van Annex III 4(b) (zie BR-706). Duur-kalibratie is operationeel waardevol en verdedigbaar; alles daarbuiten maakt Employee Memory een werknemersmonitoringssysteem — een categorie waar ServOps bewust buiten blijft.

**Implementatie:** `47_AIAct_Compliance.md` § 5.3 (bindende randvoorwaarden voor de Memory-leeskant-sprint); `45_AgentMemory.md` § 2 (Employee Memory) en § 9.1 verwijzen hiernaar.

---

## 10. Edge Cases & Uitzonderingen (BR-800+)

### BR-800: Adres niet geocodeerbaar (E-01 PRD)

**Scenario:** User voert postcode in; API zegt "niet gevonden"

**Regel:** Object opslaan met `geocoding_status='failed'` vlag.

**Gevolgen:**
- Beurt op dit object NIET routeerbaar (geen lat/lng)
- Planning: badge "Handmatige locatie vereist op [object]"
- Planner: kaartje met "Klik om locatie handmatig in te stellen" (user klikt op kaart, lat/lng manueel ingesteld)

**Handeling:** Zodra lat/lng ingesteld → routes herberekend

---

### BR-801: Twee dienstafspraken, zelfde object, zelfde week (E-02 PRD)

**Scenario:** Glazenwasser heeft "Glasbewassing buiten" EN "Glasbewassing ramen", beide elke 6 weken, zelfde object.

**Regel:** AI Planner combineert op dezelfde stop (één adres, twee diensten).

**Facturatie:** Twee regels op factuur (één per dienst), maar één reistijd.

---

### BR-802: Medewerker ziek, dagroute vervangen (E-03 PRD)

**Scenario:** Medewerker meldt zich ziek via PWA (status `unavailable`, `unavailable_until=eod`)

**Regel (BR-200 uitvoering):** 
1. Alle `gepland` beurten van vandaag → auto-wachtrij
2. AI-herplan-voorstel: "Verdeel 12 beurten over [Piet, Maria]; 2 kunnen niet geplaatst"
3. Planner klikt "Accepteer voorstel"
4. Beurten verschoven; klanten notified ("Medewerker is ziek; we komen anders langs")

---

### BR-803: Klant zegt af na "morgen"-bericht (E-04 PRD)

**Scenario:** "Morgen"-bericht verstuurd; klant zegt "Kun je volgende week?" (WhatsApp-reply V2)

**Regel:** Beurt → `skipped` (niet: `not_thuis`; klant zei van te voren af); wachtrij-prioriteit.

---

### BR-804: Beurt duurt veel langer (E-05 PRD)

**MVP:** Medewerker kan in PWA "Verlengen" klikken; resterende beurten van dag → wachtrij (handmatig herplannen).

**V2 (live-uitloop):** Algoritme detecteert realtime-overschrijding; stelt auto-herplan voor.

---

### BR-805: Zomertijd/wintertijd-transities (E-08 PRD)

**Regel:** Alle timestamps opgeslagen UTC in database.

**UI-rendering:** tijdzone Europe/Amsterdam; DST-omschakeling transparant

**Test:** Beurten rond 26 maart en 29 oktober getest op correcte tijd-shift.

---

## 11. Platform Administration & Product Agent-regels (BR-900 t/m BR-904)

Nieuwe serie (ADR-013, Platform Admin & Product Agent — `docs/adr/ADR-013-platform-admin-product-agent.md`, `46_PlatformAdmin.md`). Deze regels gelden **buiten** de tenant-Bedrijf-scope (§ 1 Conventies blijft voor alle andere series ongewijzigd van toepassing binnen een Bedrijf) — het gaat hier om de autorisatiegrens tussen platform en tenants, en om de codebase zelf.

### BR-900 (Hard): Platform-admin-autorisatie staat los van tenant-rollen

> Platform-brede toegang (het Platform Admin-portal, `46_PlatformAdmin.md` § 1) wordt uitsluitend bepaald door een expliciete allowlist (`platform_admins`, op `user_id`) — nooit door een Bedrijfsrol, ook niet Eigenaar van het grootste of oudste account.

**Reden:** een orthogonale autorisatiedimensie naast `company_id`-RLS (ADR-003/004) voorkomt dat een wijziging in het tenant-rollenmodel (23_Gebruikersrollen.md) ooit per ongeluk platform-toegang meebrengt, en omgekeerd.

**Implementatie:** ADR-013 § 1; mutaties op `platform_admins` uitsluitend handmatig via Supabase SQL Editor/Dashboard, nooit via een applicatie-endpoint met eigen schrijfrechten hierop (zelfde behandeling als een secret).

---

### BR-901 (Hard): Product Agent mergt, deployt of pusht nooit zelf naar productie

> De Product Agent (`46_PlatformAdmin.md` § 3) mag uitsluitend een branch openen en een Pull Request aanmaken. Mergen naar `main`, deployen naar productie, of rechtstreeks pushen zonder PR is nooit toegestaan, ongeacht confidence of hoe triviaal de wijziging lijkt.

**Reden:** directe toepassing van het BR-702-principe (Human Approval) op de codebase, bewust **strenger**: een codewijziging raakt bij het mergen per definitie alle tenants tegelijk, in tegenstelling tot zelfs de zwaarste BR-702-actie (die raakt één bedrijf). Dit is een permanent ontwerpprincipe, geen tijdelijke voorzichtigheidsmaatregel die later "opschaalt" naarmate het model beter wordt (ADR-013 "Waarom deze keuze toekomstbestendig is").

**Implementatie:** ADR-013 § 4; de Product Agent draait onder dezelfde Git Safety Protocol die al voor elke sessie geldt (nooit `--force`/`--no-verify`, altijd een nieuwe commit/branch).

---

### BR-902 (Hard): High-risk-codewijzigingen nooit automatisch getriggerd

> Een Product Agent-voorstel dat migraties, RLS-policies, authenticatie, betalingen (Mollie) of secrets/Vault raakt, is verplicht "high-risk"-gelabeld en wordt nooit op de automatische (geplande) cadans getriggerd — uitsluitend on-demand, expliciet gestart door de platform-eigenaar.

**Reden:** deze categorieën zijn precies de plekken waar een subtiele fout het grootste, moeilijkst te detecteren schadepotentieel heeft (bv. een verzwakte RLS-policy) — een classificatiefout hier weegt zwaarder dan bij een gewone feature-PR. Bij twijfel geldt high-risk, nooit andersom (ADR-013 "Mitigaties").

**Implementatie:** ADR-013 § 4, `46_PlatformAdmin.md` § 3.4/§ 4; concrete, toetsbare bestandspaden/SQL-patronen per categorie in `46_PlatformAdmin.md` § 3.5 (nieuw, 2026-07-16).

---

### BR-903 (Soft): Elk Product Agent-voorstel bevat het volledige why/trigger/risico-contract

> Analoog aan BR-703 (AI Explainability): elk Product Agent-voorstel bevat een titel + PR-link, de trigger (welke feature request(s)/welk operationeel signaal), gekoppelde feature requests (incl. aantal bedrijven indien van toepassing), risicoclassificatie, en overwogen alternatieven.

**Reden:** zonder dit contract kan de platform-eigenaar een voorstel niet verantwoord beoordelen — zelfde onderliggende motivatie als BR-703, nu toegepast op codewijzigingen i.p.v. planningsvoorstellen.

**Implementatie:** `46_PlatformAdmin.md` § 3.3.

---

### BR-904 (Hard): Feature requests zijn nooit cross-tenant zichtbaar

> Een door een tenant ingediende feature request (`feature_requests`, RLS op `company_id`, standaard tenant-model ongewijzigd) is uitsluitend zichtbaar voor het eigen bedrijf en de platform-eigenaar (platform-admin-bypass) — nooit voor andere tenants. Clustering van vergelijkbare requests door de Product Agent (§ BR-903) gebeurt platform-zijdig; een tenant ziet nooit dát of wélke andere bedrijven een vergelijkbaar verzoek indienden.

**Reden:** voorkomt dat dit een publiek, cross-tenant zichtbaar roadmap-bord wordt (bewust afgewezen alternatief, ADR-013 § "Alternatieven") — een expliciete keuze, geen impliciete beperking.

**Implementatie:** standaard RLS-model (ADR-003/004), geen uitzondering nodig; `46_PlatformAdmin.md` § 2.2.

---

## Relaties met andere documenten

- **00_PRD.md**: § 15 (business rules samenvatting) & § 8 (AI Planner scoring), § 19 A-15 (ADR-011), § 19 A-23 (ADR-013)
- **08_FunctioneleEisen.md**: FR-xxx implementeren deze regels, incl. FR-900 (Morning Briefing), FR-950–953 (Platform Admin/Product Agent)
- **11_DatabaseConcept.md**: constraints die regels afdwingen
- **31_Testplan.md**: test-cases per regel
- **43_AI_Agents.md**, **docs/adr/ADR-011-human-in-the-loop-ai.md**: BR-702/703 zijn de business-rule-vastlegging van ADR-011's Human Approval- en Explainability-eisen
- **45_AgentMemory.md**: BR-704/705 zijn de business-rule-vastlegging van de Organizational Memory Human-Control- en privacy-eisen
- **46_PlatformAdmin.md**, **docs/adr/ADR-013-platform-admin-product-agent.md**: BR-900–904 zijn de business-rule-vastlegging van ADR-013's platform-admin-autorisatie en Product Agent Human-Approval-grens

---

## Changelog

| Datum | Versie | Wijziging |
|---|---|---|
| 2026-07-06 | 1.0 | Volledig uitgewerkt: statusmachine, frequentie-regels, planning-logica, facturatie, communicatie, AI-transparantie, edge cases |
| 2026-07-07 | 1.1 | Consistentiefix: canonieke PRD §15-nummers hersteld (BR-001 ideale datum, BR-020 nummering/immutabiliteit, BR-030 pauzering, BR-040 klant verwijderen) i.p.v. afwijkende nummering; BR-010 en BR-015 expliciet toegevoegd; alle verwijzende documenten meegetrokken |
| 2026-07-08 | 1.2 | Production Readiness Review-fix: BR-701-gewichten uitgelijnd op 15_AIPlanner.md § 4 (was intern inconsistent met een tweede, afwijkend gewichtenstel dat niet optelde tot 100%) |
| 2026-07-08 | 1.3 | Production Readiness Review-fix: BR-020 uitgebreid met concurrency-veilige tellerimplementatie (rij-lock op `invoice_number_counters`) i.p.v. een race-condition-gevoelige `MAX+1`-query, om de wettelijke gap-loze-nummering-eis daadwerkelijk af te dwingen |
| 2026-07-12 | 1.4 | BR-702 (Human Approval) en BR-703 (AI Explainability) toegevoegd aan § 9, voortvloeiend uit ADR-011 (Human-in-the-Loop AI). |
| 2026-07-12 | 1.5 | BR-306 (Hard) toegevoegd aan § 5: prioriteitsketen Job > Klant > Dienstafspraak > Dienst voor klant-specifieke prijs-overrides, voortvloeiend uit 18_Prijsafspraken.md § 7. |
| 2026-07-12 | 1.6 | BR-704 (Human Control over geleerde voorkeuren) en BR-705 (privacy-uitsluitingen Organizational Memory) toegevoegd aan § 9, voortvloeiend uit `45_AgentMemory.md`. |
| 2026-07-16 | 1.7 | § 11 (BR-900 t/m BR-904) toegevoegd: platform-admin-autorisatie los van tenant-rollen, Product Agent Human-Approval-grens (nooit zelf mergen/deployen, high-risk-PR's nooit automatisch), voorstel-contract, cross-tenant zichtbaarheidsverbod voor feature requests — voortvloeiend uit ADR-013/`46_PlatformAdmin.md`/PRD § 19 A-23. |
| 2026-07-16 | 1.8 | BR-902-implementatieverwijzing uitgebreid met `46_PlatformAdmin.md` § 3.5 (nieuw) — de concrete, toetsbare bestandspaden/SQL-patronen per high-risk-categorie, voorwaarde vóór Sprint 11-vervolg (FR-951) gebouwd wordt. |
| 2026-07-17 | 1.9 | BR-706 (taakallocatie nooit op individueel gedrag/persoonskenmerken) en BR-707 (geleerde per-medewerker-gegevens nooit voor beoordeling/monitoring) toegevoegd aan § 9 — de AI Act Annex III 4(b)-grenzen uit `47_AIAct_Compliance.md` § 5. |
