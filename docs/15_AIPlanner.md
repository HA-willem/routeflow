# 15 — AI Planner

**Status:** DONE
**Versie:** 2.0
**Bron van waarheid:** `00_PRD.md` § 8 (De AI Planner) — dit document mag het PRD niet tegenspreken.
**Werkinstructie:** zie `MASTER_PROMPT.md`.
**Relaties:** 14_RoutingEngine.md (dag-laag/routes), 10_BusinessRules.md (BR-001/101/200–205/700), 21_Notificaties.md (herplan-meldingen), 19_WhatsApp.md (klantberichten), 11_DatabaseConcept.md (jobs/routes).

---

## Doel van dit document

Dit document beschrijft het **kernalgoritme** van RouteFlow: hoe genereert de AI Planner automatisch voorgestelde beurten, verdeelt die over dagen/medewerkers, en herplant bij verstoringen — met de mens als eindredacteur (PRD § 8.1). De AI Planner is *conceptueel*; de concrete routeberekening delegeert hij aan de routing-engine (14).

---

## 1. Architectuur: drie lagen (PRD § 8.2)

### 1.1 Horizon-laag (weken vooruit)
**Doel:** vertaal dienstafspraken naar *ideale datums* en cluster geografisch per week.

**Stappen:**
1. Voor elke actieve `service_agreement`: bereken ideale datum `last_completed + interval` (BR-001); respecteer `exclude_dates`, `paused_until`.
2. Toets flexibiliteitsvenster (±N werkdagen, BR-101).
3. Groepeer per week; geografische clustering (§ 3) trekt buurt-genoten naar dezelfde week.

**Output:** `jobs` met status `voorgesteld` voor de komende 12 weken.

### 1.2 Dag-laag (routes)
**Doel:** verdeel weekbeurten over dagen én medewerkers en bepaal de optimale volgorde.

**Stappen:**
1. Neem beurten van week W.
2. Wijs toe aan medewerkers (beschikbaarheid, BR-201; werkdrukbalans).
3. Roep per medewerker/dag de **routing-engine** aan (14 § 4–5) voor volgorde en tijden.
4. Valideer dagduur ≤ 8,5u (BR-202); onplaatsbare beurten → wachtrij.

**Output:** routes + job-sequenties met start-/eindtijden.

### 1.3 Reactieve laag (herplannen)
**Doel:** reageer op verstoringen met een herplan-*voorstel* (diff), nooit een stille mutatie (PRD § 8.5).

Zie § 7 voor triggers, logica en diff-UX.

---

## 2. Ideale-datumberekening & vensters

- **BR-001:** ideale datum = datum laatste `uitgevoerd` + interval (niet de geplande datum). Voorbeeld: "elke 6 weken", laatst voltooid 1/7 → ideaal 12/8.
- **BR-101 (soft):** voorstel mag ±3 werkdagen afwijken (default, per afspraak instelbaar). Buiten venster → soft-warning "Afwijking +2 dagen"; planner accepteert of negeert.
- **Eerste beurt** (nog geen `uitgevoerd`): ideale datum = ingangsdatum dienstafspraak + interval, of direct plannen bij eenmalig.
- **Maandpatronen** (BR-103): "elk kwartaal" = 1e voorkeursdag van de Q-maand.

---

## 3. Geografische clustering

- `ST_DWithin(location, $punt, 1000m)` bepaalt de "buurt" (1 km², instelbaar), PostGIS (11 § 4).
- Beurten in dezelfde buurt krijgen voorkeur voor dezelfde week/dag (BR-204, soft).
- Effect: reistijd ↓, frequentie-trouw ↑. Weegt mee in de score (§ 4), niet als harde regel.

---

## 4. Scoringsmodel

Elke kandidaat-planning krijgt een score 0–100 (100 = optimaal). Gewichten per bedrijf instelbaar via sliders ("reistijd ↔ stiptheid", PRD § 8.3).

| Criterium | Richting | Gewicht (default) |
|---|---|---|
| Afwijking t.o.v. ideale datum | minimaliseren | 40% |
| Totale reistijd | minimaliseren | 30% |
| Geografische clustering | maximaliseren | 20% |
| Werkdrukbalans tussen medewerkers | balanceren | 10% |
| Weerrisico (weersgevoelige diensten) | minimaliseren | meegewogen in reactieve laag |
| Stabiliteit (aantal wijzigingen) | minimaliseren | **hoog bij herplannen** (§ 7.3) |

De dag-laag geeft de reistijd-/clustergewichten door aan de routing-engine (14 § 5.3). Sliderwijziging → live herberekening van het voorstel.

Deze tabel is de **enige bron van waarheid** voor de default-gewichten (10_BusinessRules.md BR-701 verwijst hierheen in plaats van eigen getallen te dupliceren, om toekomstige inconsistentie te voorkomen).

---

## 5. Harde regels (nooit schenden, PRD § 8.4)

- **BR-200** Vergrendelde beurten verplaatsen niet.
- **BR-201** Beschikbaarheid/verlof medewerker is absoluut.
- **BR-202** Max werkdag (default 8,5u incl. reistijd).
- **BR-203** Geen dubbele dienstafspraak zelfde dag (gecombineerde stop bij verschillende diensten, BR-801).
- Flexibiliteitsvenster wordt niet overschreden zonder expliciete gebruikersactie.

---

## 6. Weerslaag (V1+)

### 6.1 Bron & cache
Externe weer-API met NL-dekking (Open-Meteo/KNMI). Forecast komende 10 dagen, gecachet per gebied/dag (weerdata-cache) om API-druk te beperken.

### 6.2 Gevoeligheid per dienst
Dienst heeft `is_weather_sensitive` + `weather_sensitivity_type` (regen/vorst/wind) (12 § 5).

### 6.3 Beslislogica met drempels
Per type een drempel (bedrijf-instelbaar, met defaults):

| Type | Voorbeelddrempel (default) | Actie bij overschrijding |
|---|---|---|
| Regen | Neerslagkans ≥ 70% of ≥ 2 mm/u tijdens werkvenster | Herplanvoorstel voor regen-gevoelige beurten van die dag |
| Vorst | Min. temp < 0 °C tijdens werkvenster | Herplanvoorstel voor vorst-gevoelige beurten |
| Wind | Windstoten ≥ 8 Bft | Herplanvoorstel (o.a. i.v.m. hoogwerk/ladder) |

Logica: `als forecast[datum][type] ≥ drempel → markeer betrokken beurten → genereer herplanvoorstel` (§ 7). Onder de drempel: geen actie (geen vals alarm). De planner houdt eindregie; niets wordt stil verplaatst.

---

## 7. Herplan-events & diff-voorstellen

### 7.1 Triggers → actie
| Trigger | Reactie |
|---|---|
| Ziekmelding/verlof medewerker (BR-802) | Verdeel dagroute over collega's binnen venster; onplaatsbaar → wachtrij |
| Slechtweer-forecast (§ 6) | Verplaats weersgevoelige beurten naar geschikte dag |
| Niet-thuis (BR-015/803) | Beurt → wachtrij met prioriteit; herplan in volgende geschikte slot |
| Uitloop (V2, E-05) | Live-detectie; stel resterende beurten door |
| Klant zegt af (E-04) | Beurt → `overgeslagen`; gat-opvulling stelt wachtrij-kandidaat voor |

### 7.2 Diff-UX
Het voorstel is een **diff**, geen stille mutatie:

```
Herplan-voorstel (ziekmelding Piet, wo 15/7)
┌───────────────┬────────┬────────┬──────────────┐
│ Beurt         │ Van    │ Naar   │ Extra reistijd│
├───────────────┼────────┼────────┼──────────────┤
│ Bakkerij J.   │ wo 15/7│ do 16/7│ +6 min       │
│ VvE Kerkstr.  │ wo 15/7│ vr 17/7│ +3 min       │
│ …             │        │        │              │
│ 2 beurten     │ wo 15/7│ wachtrij (onplaatsbaar) │
└───────────────┴────────┴────────┴──────────────┘
[Accepteren]  [Aanpassen]  [Annuleren]
```

Bij accepteren: routes bijgewerkt, klanten geïnformeerd (21/19), medewerkers genotificeerd.

### 7.3 Stabiliteit bij herplannen
Bij herplannen weegt "aantal wijzigingen t.o.v. bestaande planning" **zwaar** (PRD § 8.3): het systeem verkiest een oplossing die zo min mogelijk reeds-bevestigde beurten verstoort, ook al is die iets minder reistijd-optimaal — voorspelbaarheid boven micro-optimalisatie.

---

## 8. Automatiseringsniveaus (per bedrijf instelbaar)

| Niveau | Gedrag | Use-case |
|---|---|---|
| **Voorstel** (default) | AI genereert; planner keurt goed of wijzigt | Vertrouwen opbouwen |
| **Semi-automatisch** | AI voert uit; planner kan binnen venster ongedaan maken; notificatie | Routine-herplanningen |
| **Volautomatisch** | AI voert stil uit; alleen loggen | Alleen na expliciete opt-in; niet MVP |

Geleidelijke automatisering is een vertrouwens-mitigatie (PRD § 18): begin bij Voorstel, schuif op naarmate de planner de kwaliteit vertrouwt.

---

## 9. Transparantie ("Waarom?", BR-700)

Elke voorgestelde/hergeplande beurt draagt een reden-object:

```json
{
  "job_id": 456,
  "reason": ["ideale_datum", "geografische_clustering"],
  "date_delta_days": -2,
  "cluster_id": "Noord-42",
  "excluded_days": ["ma (klantvoorkeur)"],
  "score": 87.5
}
```

Planner klikt "?" → *"Gepland op di 14/7 (2 dagen vóór ideaal 16/7), geclusterd met 4 adressen in Wijk Noord; maandag uitgesloten door klantvoorkeur."* Geen black box (PRD § 8.5).

---

## 10. Leren van correcties (V2-concept)

De AI Planner kan verbeteren door te leren van wat de planner **handmatig corrigeert** aan zijn voorstellen — een feedback-vliegwiel.

- **Signaal:** elke keer dat de planner een voorgestelde beurt verplaatst/vergrendelt/afwijst, wordt de correctie (met context) gelogd.
- **Patronen (V2):** terugkerende correcties onthullen impliciete voorkeuren, bijv. "klant X wil altijd vrijdagochtend", "medewerker Y niet naar wijk Z", "deze buurt liever niet op marktdag".
- **Toepassing:** voorgestelde defaults bijstellen (bijv. automatisch een voorkeursdag afleiden) of gewichten per bedrijf fijn-tunen — **altijd transparant en overschrijfbaar**, nooit een ondoorzichtig model dat de planner overruled.
- **Grenzen:** privacy/AVG-bewust (geen persoonsprofilering van eindklanten buiten operationele noodzaak); start als eenvoudige heuristieken/aggregaties, niet als zwaar ML-model. Expliciet V2 (BL-005), hier voorbereid zodat de correctie-logging nu al meegenomen kan worden in het datamodel.

---

## 11. Edge cases & foutafhandeling

| # | Case | Gedrag |
|---|---|---|
| AP-01 | Geen enkele geschikte dag binnen flexvenster | Beurt → wachtrij; soft-warning; planner kan venster verruimen of vergrendelen |
| AP-02 | Alle medewerkers vol / capaciteit tekort (FR-027) | Capaciteitswaarschuwing; overschot → wachtrij; suggestie welke beurten te verplaatsen |
| AP-03 | Ongeocodeerd adres in de set (BR-800) | Beurt niet routeerbaar; uitgesloten van optimalisatie; planner-actie vereist (14 RE-01) |
| AP-04 | Weer-API onbereikbaar | Weerslaag inactief; planner gewaarschuwd "weerdata tijdelijk niet beschikbaar"; planning gaat door zonder weer-herplan |
| AP-05 | Herplan-voorstel plaatst niets beter (alles al optimaal) | "Geen betere planning gevonden — huidige planning behouden" |
| AP-06 | Conflicterende harde regels (bv. alle dagen vergrendeld én dag vol) | Geen voorstel; heldere uitleg welke regel blokkeert; planner beslist |
| AP-07 | Zeer grote week (veel stops) overschrijdt rekentijd (14 § 7) | Anytime-heuristiek levert beste-tot-nu-toe; markeer "benaderd", planner kan verfijnen |
| AP-08 | Slechtweer-herplan verschuift naar dag die óók slecht weer heeft | Zoek volgende geschikte dag; als geen binnen horizon → wachtrij + melding |

**Principe:** de AI Planner faalt nooit stil. Kan hij niet optimaal plannen, dan levert hij het beste haalbare + een heldere uitleg en laat de beslissing aan de planner (PRD § 8.5, human-in-the-loop).

---

## Changelog

| Datum | Versie | Wijziging |
|---|---|---|
| 2026-07-06 | 1.0 | Drie lagen, ideale-datum, clustering, scoring, weer, herplannen, transparantie |
| 2026-07-07 | 2.0 | Verdieping: weer-beslislogica met drempels per type, herplan-diff-UX + stabiliteitsgewicht, automatiseringsniveaus toegelicht, sectie 10 "Leren van correcties" (V2) toegevoegd, sectie 11 "Edge cases & foutafhandeling" (8 cases) toegevoegd; relaties uitgebreid |
| 2026-07-08 | 2.1 | Production Readiness Review-fix: § 4 expliciet aangewezen als enige bron van waarheid voor de scoring-gewichten (was inconsistent met BR-701 in 10_BusinessRules.md, dat een ander, niet-op-100%-som-uitkomend gewichtenstel vermeldde) |
