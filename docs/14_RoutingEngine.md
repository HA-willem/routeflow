# 14 — Routing Engine

**Status:** DONE
**Versie:** 2.0
**Bron van waarheid:** `00_PRD.md` § 8.2 (dag-laag), § 12.1 (stack), § 13 (performance), A-06 — dit document mag het PRD niet tegenspreken.
**Werkinstructie:** zie `MASTER_PROMPT.md`.
**Relaties:** 15_AIPlanner.md (aanroeper), 11_DatabaseConcept.md (`distance_cache`), 13_API_Specificatie.md (endpoints), 37_Performance.md (budget), 10_BusinessRules.md (BR-200/202/800).

---

## Doel & scope van dit document

Dit document beschrijft de **routing-engine**: de component die voor een gegeven set beurten (Beurten) op één dag, voor één Medewerker, de **optimale rijvolgorde, reistijden en verwachte start-/eindtijden per stop** berekent. Dit is de *dag-laag* uit PRD § 8.2.

**Wél in scope:** afstandsmatrix-provider, geocoding, VRP-formulering, optimalisatie-heuristiek, live herberekening bij drag-and-drop, caching, performancebudget, foutafhandeling.

**Niet in scope:** de *horizon-laag* (welke beurt in welke week — zie 15_AIPlanner.md § 1.1), de *reactieve laag* (herplannen bij verstoring — 15_AIPlanner.md § 1.3), en de visuele kaartweergave (24_UI_UX.md).

De routing-engine is een **pure, stateless service**: input = stops + parameters, output = geordende route. Ze wordt aangeroepen door de AI Planner (dag-laag) en door de drag-and-drop-handler (FR-022).

---

## 1. Providerkeuze (beslissing A-06)

### 1.1 Vastgestelde keuze

> **Mapbox** voor MVP/V1 (Geocoding + Matrix + Directions), achter een provider-agnostische adapter. **OSRM self-hosted** is de gedocumenteerde schaal-/fallback-optie voor later (V2), inzetbaar zonder domeinwijziging.

Vastgelegd in PRD § 19 (A-06). Motivatie samengevat: ~2× goedkoper dan Google, caching-voorwaarden botsen niet met onze 30-daagse afstandsmatrix-cache (bij Google's ToS wél een risico), NL-adreskwaliteit ruim voldoende, en de adapter houdt de exit naar OSRM open bij kostendruk (PRD-risico § 18).

### 1.2 Afweging (referentie)

| Criterium | Mapbox (gekozen) | Google Maps Platform | OSRM (fallback, self-host) |
|---|---|---|---|
| NL-adreskwaliteit | Goed (OSM + commercieel) | Beste (huisnr + verkeer) | Routing top; geocoder apart nodig |
| Kosten @ schaal | ~€0,50–2 / 1000 elements | ~€5–10 / 1000 elements | Alleen infra (~€30–80/mnd VPS) |
| Cache-voorwaarden | Opslag toegestaan (betaald plan) | ToS beperkt cachen geocoding | Vrij (open data, ODbL-attributie) |
| Live verkeer | Ja (Directions traffic profile) | Ja | Nee |
| Lock-in | Middel (adapter mitigeert) | Hoog | Geen |

### 1.3 Gebruikte Mapbox-API's

| Functie | Mapbox-API | Gebruik in ServOps |
|---|---|---|
| Adres → lat/lng | **Geocoding v6** (of Search Box API voor autocomplete) | FR-002 objectinvoer |
| N×N reistijdmatrix | **Matrix API** (`/directions-matrix/v1`) | Kern van VRP-kostenmatrix |
| Route-geometrie + turn-by-turn | **Directions API** (`/directions/v5`) | Kaartlijn, verwachte reistijd tussen 2 stops |

**Belangrijke limiet:** de Matrix API accepteert **max. 25 coördinaten per request** (profiel `driving`). Voor dagen met meer stops tegelijk bouwen we de volledige matrix uit **tegels** (zie § 3.3). Voor een normale dag (≤ 24 stops + 1 startlocatie = 25) volstaat één request.

---

## 2. Provider-adapter (contract)

De engine praat nooit rechtstreeks met Mapbox, maar via een interface. Dit maakt de OSRM-swap en tests mogelijk (PRD § 12.2).

```typescript
// Conceptueel contract — implementatiedetails in codefase
interface RoutingProvider {
  // Geocoding: adres → coördinaat + betrouwbaarheid
  geocode(input: {
    postalCode: string;      // "1234 AB"
    houseNumber: string;     // "42a"
    countryCode: string;     // "NL"
  }): Promise<GeocodeResult>;

  // Reistijdmatrix tussen alle punten (seconden + meters)
  distanceMatrix(points: LatLng[], profile: 'driving'): Promise<{
    durations: number[][];   // [i][j] reistijd in seconden
    distances: number[][];   // [i][j] afstand in meters
  }>;

  // Route-geometrie tussen geordende stops (voor kaart)
  directions(orderedPoints: LatLng[]): Promise<{
    geometry: GeoJSONLineString;
    totalDurationSec: number;
    totalDistanceM: number;
  }>;
}

interface GeocodeResult {
  status: 'ok' | 'ambiguous' | 'not_found';
  location?: LatLng;         // aanwezig bij status 'ok'
  confidence?: number;       // 0..1
  matchedAddress?: string;   // ter verificatie in UI
}
```

Implementaties: `MapboxProvider` (MVP/V1) en `OsrmProvider` + `PeliasGeocoder` (V2, self-hosted). Keuze per bedrijf of globaal via env-config; default Mapbox.

---

## 3. Afstandsmatrix & caching-strategie

### 3.1 Waarom cachen

De afstandsmatrix is de duurste en meest herhaalde operatie. Twee objecten verplaatsen niet; de reistijd ertussen is dagen–weken stabiel. Zonder cache betaalt elke (her)berekening opnieuw per element (N² per dag). Caching is dé mitigatie voor PRD-risico § 18 (route-API-kosten).

### 3.2 Cache-schema

Zie 11_DatabaseConcept.md (`distance_cache`). Kern:

| Kolom | Type | Opmerking |
|---|---|---|
| `from_object_id` | UUID | PK-deel |
| `to_object_id` | UUID | PK-deel |
| `distance_meters` | INT | |
| `drive_time_seconds` | INT | |
| `profile` | ENUM(`driving`) | ruimte voor toekomstige profielen |
| `provider` | VARCHAR | `mapbox` / `osrm` — cache is provider-specifiek |
| `cached_at` | TIMESTAMP | TTL-anker |

**TTL: 30 dagen.** Na verval → lazy refresh bij volgende query. Startlocatie (bedrijfsadres) krijgt een pseudo-object-id zodat ook start↔stop gecachet wordt.

### 3.3 Matrix-opbouw-algoritme

```
functie bouwMatrix(objecten[], startlocatie):
  punten = [startlocatie] + objecten
  cache = haalGecacheteParen(punten)          # één query op distance_cache
  ontbrekend = paren zonder verse cache-hit
  als ontbrekend niet leeg:
      # groepeer in tegels van max 25 punten (Mapbox-limiet)
      voor elke tegel in splitsInTegels(betrokkenPunten, 25):
          resultaat = provider.distanceMatrix(tegel, 'driving')
          schrijfNaarCache(resultaat)          # bulk upsert
  retourneer volledige N×N matrix uit cache
```

`splitsInTegels` overlapt tegels zo dat élk benodigd paar (i,j) in minstens één tegel valt. Voor N ≤ 24 is er precies één tegel. Voor grotere N wordt de matrix blok-gewijs opgebouwd; in de praktijk komt de dag-laag zelden boven ~30 stops per medewerker per dag door de 8,5u-limiet (BR-202).

### 3.4 Cache-invalidatie

- Object-adres gewijzigd of opnieuw gegeocodeerd → alle rijen met dat `object_id` (als from óf to) verwijderd.
- Provider-wissel (Mapbox→OSRM) → cache blijft geldig per `provider`-kolom; nieuwe provider vult eigen rijen.

---

## 4. VRP-formulering (Vehicle Routing Problem)

### 4.1 Probleemklasse

Per medewerker per dag lossen we een **single-vehicle VRP met tijdvensters en vaste startlocatie** op — feitelijk een **TSP met soft/hard tijdvensters en een dagduur-plafond**. De verdeling van beurten *over* medewerkers gebeurt in de dag-laag van de AI Planner (15_AIPlanner.md § 1.2) vóór aanroep hiervan; deze engine optimaliseert één voertuig.

### 4.2 Input

| Element | Bron | Rol |
|---|---|---|
| Stops (Beurten) | dag-laag | te bezoeken punten |
| Locatie per stop | Object (`location`) | matrix-coördinaat |
| Dienstduur per stop | Dienst.`standard_duration_minutes` (of som bij gecombineerde stop, E-02/BR-801) | tijdverbruik ter plaatse |
| Tijdvenster per stop | Dienstafspraak.`preferred_daypart` | soft: ochtend `[07:00–12:00]`, middag `[12:00–17:00]` |
| Vergrendeling | Beurt.`locked`/`locked_until` | positie/dag vast (BR-200) |
| Startlocatie | Bedrijf-instelling (bedrijfsadres) | begin- én eindpunt (retour) |
| Werkvenster | Bedrijf-instelling (default 08:00) + max 8,5u (BR-202) | hard plafond |
| Pauze | Bedrijf-instelling (default 30 min rond 12:00) | vaste onderbreking |

### 4.3 Constraints

**Hard (nooit schenden):**
- H1 — Totale duur (reistijd + dienstduur + pauze) ≤ max werkdag (default 8,5u; BR-202).
- H2 — Vergrendelde stop behoudt zijn relatieve positie/tijd (BR-200); de optimalisatie mag deze niet verplaatsen.
- H3 — Startlocatie is de eerste en (retour) laatste knoop.

**Soft (score-straf bij schending, § 5):**
- S1 — Voorkeursdagdeel gerespecteerd.
- S2 — "Bel vooraf"-stops (Dienstafspraak.`call_ahead_required`) bij voorkeur niet als allereerste stop (geen tijd om te bellen).
- S3 — Gebalanceerde eindtijd (niet onnodig laat).

### 4.4 Output

Een `Route`-record (11_DatabaseConcept.md) plus per stop:

```json
{
  "sequence": 3,
  "job_id": "uuid",
  "arrival_time": "2026-07-14T10:12:00Z",
  "service_start": "2026-07-14T10:12:00Z",
  "service_end": "2026-07-14T10:57:00Z",
  "drive_time_from_prev_sec": 480,
  "distance_from_prev_m": 3200
}
```

Plus route-totalen: `total_drive_time`, `total_work_time`, `total_distance`, `optimization_score`, `sequence_version` (increment bij elke herberekening — 11_DatabaseConcept.md).

---

## 5. Optimalisatie-heuristiek

Exacte VRP-oplossing is NP-hard; met het performancebudget (§ 7) kiezen we een **constructie-heuristiek + lokale verbetering**.

### 5.1 Fase 1 — Constructie (nearest-neighbor, tijdvenster-bewust)

```
functie construeer(matrix, stops, start):
  route = [start]
  onbezocht = stops
  huidigeTijd = werkdagStart
  zolang onbezocht niet leeg:
    kandidaten = onbezocht gefilterd op: past binnen tijdvenster & H1 niet geschonden
    als kandidaten leeg:
        markeer resterende onbezocht als ONPLAATSBAAR   # → wachtrij (§ 8)
        stop
    volgende = kandidaat met laagste (reistijd + tijdvenster-straf)
    voeg volgende toe; update huidigeTijd (+reistijd, +pauze indien 12:00 gepasseerd, +dienstduur)
    verwijder volgende uit onbezocht
  voeg retour naar start toe
  retourneer route
```

Vergrendelde stops (H2) worden vóóraf op hun vaste positie gepind; de constructie plaatst de overige stops eromheen.

### 5.2 Fase 2 — Verbetering (2-opt / or-opt)

Iteratieve lokale search die de sequentie verbetert zonder harde constraints te schenden:

- **2-opt:** draai een deelsegment om als dat de totale reistijd verlaagt.
- **or-opt:** verplaats een keten van 1–3 opeenvolgende stops naar een betere positie.

Stopcriterium: geen verbetering meer, of tijdsbudget (§ 7) bereikt. Vergrendelde stops zijn *fixed points* — swaps die deze verplaatsen worden verworpen.

### 5.3 Scorefunctie

De AI Planner levert gewichten (15_AIPlanner.md § 4). De engine minimaliseert:

```
kost = w_reistijd · totaleReistijd
     + w_dagdeel  · Σ dagdeel-overtredingen (S1)
     + w_laat     · max(0, eindtijd − streefeindtijd) (S3)
     + straf_belvooraf (S2)
```

`optimization_score` = genormaliseerde 0–100 (100 = geen straf, minimale reistijd), opgeslagen op de Route voor transparantie (BR-700).

---

## 6. Live herberekening bij drag-and-drop (FR-022)

Wanneer de planner een beurt versleept tussen dagen/medewerkers, herberekent de engine **alleen de betrokken route(s)** — niet de hele week.

### 6.1 Flow

1. Drop-event levert: `job_id`, `van_route`, `naar_route`, `doelpositie`.
2. Voor `van_route` én `naar_route`: haal stops op, herbouw matrix (grotendeels cache-hit), draai § 5.
3. Verschil-detectie: nieuwe start-/eindtijden per stop.
4. Optimistic UI: tijden schuiven direct; server bevestigt < 2s (PRD § 13).
5. `sequence_version++` op beide routes; **undo** beschikbaar (FR-022).

### 6.2 Regels

- Een **vergrendelde** beurt is niet sleepbaar (BR-200) → UI toont ankericoon, drop geweigerd.
- Past de beurt niet binnen H1 op de doeldag → UI-waarschuwing *"Deze beurt past niet op [dag]: werkdag zou 9u10 worden (max 8u30)."* + drop teruggedraaid.
- Doelmedewerker onbeschikbaar op die dag (BR-201) → drop geweigerd met melding.

---

## 7. Limieten & performancebudget

PRD § 13: *routeberekening dag < 3s voor 60 stops.*

| Stap | Budget | Toelichting |
|---|---|---|
| Matrix uit cache (warme cache) | < 150 ms | Eén indexed query op `distance_cache` |
| Matrix-aanvulling (koude cache, 60 stops) | < 1,5 s | Getegelde Mapbox Matrix-calls, parallel |
| Constructie (§ 5.1) | < 50 ms | O(n²), n ≤ 60 |
| Verbetering (§ 5.2) | < 800 ms | Tijd-gebudgetteerd; stopt bij budget |
| Serialisatie + persist | < 200 ms | Bulk-insert route-stops |
| **Totaal koud** | **< 3 s** | Voldoet aan PRD § 13 |
| **Totaal warm (drag-drop, 2 routes)** | **< 2 s** | PRD § 13 interactie-eis |

Uitvoering: Supabase **Edge Function** (Deno/Node), server-side (PRD § 12.2 — nooit in de client). Bij overschrijding budget levert Fase 2 de beste-tot-nu-toe sequentie (anytime-algoritme).

---

## 8. Edge cases & foutafhandeling

| # | Case | Detectie | Gedrag | Melding |
|---|---|---|---|---|
| RE-01 | Adres niet geocodeerbaar (BR-800, E-01) | `geocode` → `not_found` | Object krijgt `location_status='failed'`; beurt **niet routeerbaar**, uitgesloten van matrix | Planner: *"Object [X] heeft geen locatie. Zet de speld handmatig op de kaart om te kunnen plannen."* |
| RE-02 | Ambigue geocoding (meerdere matches) | `geocode` → `ambiguous` | Object opgeslagen, planner kiest juiste match | *"Meerdere adressen gevonden — kies de juiste."* |
| RE-03 | Onplaatsbare stop (dag vol, H1) | Constructie § 5.1 | Stop → herplan-wachtrij met prioriteit; overige route blijft geldig | *"3 beurten passen niet op [dag] en staan in de wachtrij."* |
| RE-04 | Medewerker hele dag onbeschikbaar (BR-201) | Beschikbaarheidscheck vóór aanroep | Route niet gegenereerd; beurten → wachtrij (reactieve laag) | Zie 15_AIPlanner.md § 7 |
| RE-05 | Onbereikbaar punt (geen route mogelijk, bijv. eiland zonder verbinding) | Matrix-cel = `null`/`∞` | Stop gemarkeerd `unroutable`; uitgesloten; planner ziet vlag | *"[Object] is niet per auto bereikbaar vanaf de andere stops. Controleer het adres."* |
| RE-06 | Mapbox API-outage / timeout | HTTP-fout of timeout > 5s | **Fallback 1:** verse cache waar mogelijk; **Fallback 2:** Haversine-schatting × wegfactor 1,3 voor ontbrekende paren; route gemarkeerd `approximate` | Banner: *"Reistijden zijn geschat (kaartdienst tijdelijk niet bereikbaar)."* |
| RE-07 | Matrix-tegel > 25 punten | Vóór call | Auto-tegeling (§ 3.3); transparant voor gebruiker | — |
| RE-08 | Rate-limit Mapbox (HTTP 429) | Response-status | Exponential backoff (max 3 pogingen); daarna RE-06-fallback | Logged; geen gebruikersmelding tenzij fallback |
| RE-09 | Zomer-/wintertijd op routedag (E-08) | Altijd | Rekenen in UTC; renderen in Europe/Amsterdam; DST-transitie getest (31_Testplan.md) | — |
| RE-10 | Gecombineerde stop (2 diensten zelfde object, E-02/BR-801) | Vóór matrix | Eén matrix-knoop; dienstduur = som; één reistijd | — |

**Foutmeldingsprincipe (PRD § 11.7):** oorzaak + oplossing + actieknop; nooit een kale foutcode. `approximate`/`unroutable`-vlaggen zijn zichtbaar in de UI zodat de planner weet wanneer cijfers geschat zijn.

---

## 9. Attributie & juridisch

- **Mapbox:** toont vereiste attributie op kaartcomponenten (24_UI_UX.md).
- **OSRM/OSM (V2):** ODbL-attributie ("© OpenStreetMap contributors") verplicht bij kaartweergave en afgeleide data.
- Geocoding-resultaten worden gecachet conform de licentievoorwaarden van de actieve provider (§ 1.1 — reden dat Mapbox boven Google is gekozen).

---

## 10. Openstaande punten

Geen open beslissingen. A-06 is vastgesteld (Mapbox + OSRM-fallback). De OSRM-self-host-uitrol wordt pas een concreet infra-werkpakket in V2 (zie 33_Roadmap.md / 38_Schaalbaarheid.md) en vergt dan een aparte beslissing over hosting (managed VPS vs. container op bestaande infra) — te nemen wanneer route-API-kosten daadwerkelijk knellen.

---

## Changelog

| Datum | Versie | Wijziging |
|---|---|---|
| 2026-07-06 | 1.0 | Eerste (placeholder-)versie met Google als voorlopige default |
| 2026-07-07 | 2.0 | Volledige uitwerking; A-06 verwerkt (Mapbox + OSRM-fallback), provider-adapter, matrix-tegeling & caching, VRP-formulering met hard/soft constraints, 2-opt/or-opt-heuristiek, scorefunctie, live drag-drop-herberekening, performancebudget (60 stops < 3s), 10 edge cases met foutafhandeling, attributie. Conflict met A-06 opgelost. |
