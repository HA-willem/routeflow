# 10 — Business Rules

**Status:** DONE
**Versie:** 1.0
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

> Medewerker mag max 8.5 uur per dag (incl. reistijd) werken.

**Trigger:** Planning-algoritme weigert beurt toe te voegen if totaal-duur > 8.5u.

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

**Implementatie:**
```sql
SELECT MAX(number_seq) FROM invoices WHERE company_id=X AND year=2026
→ next = MAX+1
```

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

> Planner kan scoring-gewichten aanpassen (slider "Reistijd ↔ Frequentie-trouw") en voorstel zien wijzigen.

**Gewichten:**
- Afwijking ideale datum: 0–100% (default 60%)
- Reistijd totaal: 0–100% (default 50%)
- Geografische clustering: 0–100% (default 30%)
- Werkdruk-balans: 0–100% (default 20%)

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

## Relaties met andere documenten

- **00_PRD.md**: § 15 (business rules samenvatting) & § 8 (AI Planner scoring)
- **08_FunctioneleEisen.md**: FR-xxx implementeren deze regels
- **11_DatabaseConcept.md**: constraints die regels afdwingen
- **31_Testplan.md**: test-cases per regel

---

## Changelog

| Datum | Versie | Wijziging |
|---|---|---|
| 2026-07-06 | 1.0 | Volledig uitgewerkt: statusmachine, frequentie-regels, planning-logica, facturatie, communicatie, AI-transparantie, edge cases |
| 2026-07-07 | 1.1 | Consistentiefix: canonieke PRD §15-nummers hersteld (BR-001 ideale datum, BR-020 nummering/immutabiliteit, BR-030 pauzering, BR-040 klant verwijderen) i.p.v. afwijkende nummering; BR-010 en BR-015 expliciet toegevoegd; alle verwijzende documenten meegetrokken |
