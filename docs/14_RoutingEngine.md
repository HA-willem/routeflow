# 14 — Routing Engine

**Status:** DONE
**Versie:** 1.0
**Bron van waarheid:** `00_PRD.md` § 8.2 (dag-laag) — dit document mag het PRD niet tegenspreken.
**Werkinstructie:** zie `MASTER_PROMPT.md`.

---

## Doel van dit document

Dit document beschrijft de **routing-engine**: hoe berekent het systeem optimale routes met volgorde, reistijden en start-/eindtijden per beurt?

---

## 1. Afstandsmatrix-provider (beslissing A-06)

### Opties

| Provider | Voordelen | Nadelen | Kosten MVP |
|---|---|---|---|
| **Google Routes API** | Nauwkeurig, real-time, traffic-aware | Vendor lock-in, duur @ schaal | €2–5/1000 queries |
| **OpenRouteService** | Open-source, lokale installatie | Zelf hosten, ops-overhead | Free/eigen infra |
| **OSRM** | Zeer snel, lightweight | Basis-accuracy, geen traffic | Free/eigen infra |

**Aanbeveling MVP:** Google Routes API (eenvoudig, betrouwbaar, betaalbaar tot schaal).

### Caching

`distance_cache` tabel: lat1,lng1 → lat2,lng2 → distance_m, drive_time_min (TTL 30 dagen).

Trigger: eerste query → check cache → cache-miss → API → opslag.

### Fallback

API-outage: Haversine straight-line afstand (snel, minder nauwkeurig).

---

## 2. VRP-Model (Vehicle Routing Problem)

### 2.1 Formulering

**Input:** Medewerker E, dag D, N beurten

**Per beurt i:**
- Locatie (lat, lng)
- Duur (min)
- Voorkeur-dagdeel (ochtend/middag) ← tijdvenster
- Locked? (vaste plek)

**Constraints:**
- Max 8.5 uur werk + reistijd
- Locked beurten op vaste plek
- Start-locatie: bedrijfsadres

**Output:** Geordende seq (beurt1, beurt2, ..., beurtN) met start-/eindtijden

### 2.2 Algoritme (MVP)

**Nearest-Neighbor Heuristiek:**
1. Start: bedrijfsadres
2. Loop: kies onbezochte beurt met min reistijd
3. Repeat tot alle beurten bezocht
4. Maak route-record

Complexiteit: O(n²); < 100ms voor 60 stops.

### 2.3 Algoritme (V1+)

2-opt lokale search of Simulated Annealing: verbeter nearest-neighbor seq iteratief door paren stops te swappen. Beter resultaat, iets trager (200–500ms).

---

## 3. Edge Cases

| Case | Handeling |
|---|---|
| Adres niet geocodeerbaar (BR-800) | Beurt niet routeerbaar; planner moet handmatig plaats zetten op kaart |
| Medewerker onbeschikbaar hele dag | Beurt → herplan-wachtrij |
| Drag-and-drop → beurt past niet | UI warning "deze beurt past niet op [dag]"; undo |

---

## Relaties met andere documenten

- **15_AIPlanner.md**: AI Planner roept routing-engine aan
- **11_DatabaseConcept.md**: `distance_cache` tabel

---

## Changelog

| Datum | Versie | Wijziging |
|---|---|---|
| 2026-07-06 | 1.0 | Volledig: provider-opties, caching, VRP-model, nearest-neighbor, edge cases |
