# 15 — AI Planner

**Status:** DONE
**Versie:** 1.0
**Bron van waarheid:** `00_PRD.md` § 8 (De AI Planner) — dit document mag het PRD niet tegenspreken.
**Werkinstructie:** zie `MASTER_PROMPT.md`.

---

## Doel van dit document

Dit document beschrijft het **kernalgoritme** van RouteFlow: hoe genereert de AI Planner automatisch voorgestelde beurten en herplant bij verstoringen?

---

## 1. Architectuur: Drie Lagen

### 1.1 Horizon-laag (weken vooruit)

**Doel:** Genereer ideale datums beurten komende 12 weken.

**Stappen:**
1. Voor elke aktieve `service_agreement`:
   - Bereken ideale datum: `last_completed + interval` (BR-100)
   - Controleer flexibiliteitsvenster (±N werkdagen)
2. Groepeer beurten per week
3. Geografische clustering: adressen zelfde buurt → zelfde week (voorkeur)

**Output:** `jobs` tabel status `proposed` voor komende 12 weken.

### 1.2 Dag-laag (routes)

**Doel:** Verdeelde weekbeurten over dagen & medewerkers + optimale volgorde per dag.

**Stappen:**
1. Neem beurten van week W
2. Groepeer per medewerker (beschikbaarheid check)
3. Per medewerker, per dag: routing-engine bepaalt rijvolgorde
4. Validatie: totaal duur ≤ 8.5u per dag

**Output:** Routes + job-sequenties met start-/eindtijden.

### 1.3 Reactieve laag (herplannen)

**Triggers:** Verlof-aanvraag, ziekmelding, slechtweer, niet-thuis, uitloop.

**Flow:**
1. Event gefired → domein-event gepubliceerd
2. Herplan-engine haalt betrokken beurten
3. Genereert alt-routes (< 2s)
4. Toon planner: "X beurten verplaatst" diff
5. Planner klikt "Accept" of past aan

---

## 2. Ideale-datumberekening

**Regel BR-100:** Ideale datum = `last_completed_at + interval`

Voorbeeld: "elke 6 weken", laatste voltooid op 1/7 → ideale 12/8.

**Flexibiliteitsvenster (BR-101):** Voorstel mag ±3 werkdagen afwijken (default, instelbaar).

Beurt buiten venster: soft-warning "Afwijking +2 dagen" (planner kan accepteren of negeren).

---

## 3. Geografische Clustering

PostGIS `ST_DWithin(location, $point, 1000m)` bepaalt "buurt" (1km² radius, instelbaar).

**Algoritme:** Groepeer adressen per buurt; toewijz buurt aan dag/week.

**Voordeel:** Reistijd ↓, frequentie-trouw ↑.

---

## 4. Scoringsmodel

Elke kandidaat-planning krijgt score (0–100). Planner kiest beste.

| Criterium | Richting | Gewicht default |
|---|---|---|
| Afwijking ideale datum | min | 40% |
| Totale reistijd | min | 30% |
| Geografische clustering | max | 20% |
| Werkdruk-balans | max | 10% |

**Sliders:** Planner kan gewichten live aanpassen. Voorstel herberekend.

---

## 5. Harde Regels

- BR-200: Vergrendelde beurten verplaatsen niet
- BR-201: Beschikbaarheid medewerker absoluut
- BR-202: Max 8.5u/dag
- BR-203: Geen dubbele dienstafspraken zelfde dag

---

## 6. Weerslaag (V1+)

**Forecast:** KNMI/Open-Meteo API haalt voorspelling op (komende 10 dagen).

**Dienst-gevoeligheid:** Service heeft `is_weather_sensitive=true` + type (regen/vorst).

**Logica:** IF forecast[datum][type] = YES → voorstel herplan.

---

## 7. Herplan-Events & Diff-Voorstellen

**Event → Herplan-generatie:**
- Verlof aanvraag: systeem verdeelt dagroute
- Ziekmelding: route → andere medewerkers
- Niet-thuis: beurt → wachtrij + herplan-voorstel
- Slechtweer: regen-gevoelige diensten → alt-dag

**UX Diff:** "10 beurten verplaatst van wo 15/7 → do 16/7 | vr 17/7" met tabel.

---

## 8. Automatiseringsniveaus

| Niveau | Gedrag | Use-case |
|---|---|---|
| Voorstel | AI genereert; planner keurt goed of wijzigt | Default |
| Semi-automatisch | AI voert uit; planner kan undo binnen 1u | Optional setting |
| Volautomatisch | AI voert stilzwijgend uit; log alleen | Risk; niet MVP |

---

## 9. Transparantie ("Waarom?")

Elke voorgestelde beurt bevat logging (BR-700):

```json
{
  "job_id": 456,
  "reason": "ideale_datum + geografische_clustering",
  "date_delta_days": -2,
  "score": 87.5
}
```

Planner klikt "?" → dialog: "Gepland op di 14/7 (2 dagen vóór ideaal 16/7) geclusterd met 4 adressen Wijk Noord; ma niet beschikbaar."

---

## Relaties met andere documenten

- **14_RoutingEngine.md**: dag-laag gebruikt routing-engine
- **10_BusinessRules.md**: BR-100 t/m BR-105 (planning-regels)

---

## Changelog

| Datum | Versie | Wijziging |
|---|---|---|
| 2026-07-06 | 1.0 | Volledig: drie lagen, ideale-datum, clustering, scoring, weer, herplannen, transparantie |
