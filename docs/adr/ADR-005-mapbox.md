# ADR-005: Mapbox als routing-/geocoding-provider

- **Status:** Accepted
- **Datum:** 2026-07-07
- **Beslisser:** Chief Software Architect (RouteFlow) — bekrachtigd door productbeslissing A-06
- **Bron van waarheid:** `00_PRD.md` § 19 (A-06)
- **Gerelateerd:** ADR-007 (Provider Adapter Pattern), ADR-010 (AI Planner); 14_RoutingEngine.md, 11_DatabaseConcept.md, 37_Performance.md

---

## Context

De AI Planner heeft geocoding (adres → lat/lng), een **afstands-/reistijdmatrix** (N×N) en route-geometrie nodig (PRD § 8.2, 14_RoutingEngine.md). Deze matrix is de duurste en meest herhaalde operatie en wordt **30 dagen gecachet** (`distance_cache`, 14 § 3). Caching-voorwaarden en kosten zijn daarmee even bepalend als nauwkeurigheid. NL-adreskwaliteit is belangrijk maar hoeft niet absoluut beste-in-klasse.

## Probleem

Welke routing-/geocoding-provider levert voldoende NL-kwaliteit tegen beheersbare kosten, met **licentievoorwaarden die het cachen van de afstandsmatrix toestaan** en een vervangbare integratie (geen lock-in)?

## Gekozen oplossing

**Mapbox** (Geocoding + Matrix + Directions) voor MVP/V1, **achter de routing-adapter** (ADR-007), met **OSRM self-hosted** als gedocumenteerde schaal-/fallback-optie voor later (14 § 1, BL-040).

- Matrix API voor de kostenmatrix (tegeling bij > 25 punten, 14 § 3.3).
- Geocoding voor objectinvoer (FR-002); handmatige pin-fallback (BR-800).
- Directions voor kaart-/reistijd tussen stops.

## Alternatieven

| Alternatief | Voordeel | Waarom niet (nu) |
|---|---|---|
| **Google Maps Platform** | Beste NL-precisie + live verkeer | ~2× duurder; ToS beperkt cachen van geocoding → botst met `distance_cache`; hoogste lock-in |
| **OSRM (self-host)** | Geen licentiekosten, geen lock-in | Ops-last vanaf dag 1; aparte geocoder nodig; gekozen als latere fallback |
| **OpenRouteService** | Open, self-hostbaar | Zwakkere NL-geocoding; hosting-overhead in MVP |

## Consequenties

**Positief**
- Lagere kosten dan Google; **caching toegestaan** → sluit aan op `distance_cache` (kostenmitigatie PRD § 18).
- Volwassen API's, goede NL-dekking, live-verkeerprofiel beschikbaar.

**Negatief / risico's**
- Matrix API-limiet van 25 coördinaten/verzoek → tegeling nodig (14 § 3.3).
- Nog steeds een externe, betaalde afhankelijkheid (kosten schalen met gebruik).

**Mitigaties**
- Alle calls via `RoutingProvider`-interface (ADR-007) → OSRM-swap zonder domeinwijziging.
- 30-daagse cache met doel-hitratio > 90% (NFR-505); Haversine-fallback bij outage (14 RE-06).
- Attributie conform licentie op kaartcomponenten (14 § 9).

## Waarom deze keuze toekomstbestendig is

De keuze is bewust **omkeerbaar** gemaakt: doordat routing volledig achter een adapter zit (ADR-007), is Mapbox een implementatiedetail, niet een architectuurpijler. Wanneer kosten bij schaal knellen, activeren we OSRM self-hosted zonder de planner of het datamodel te raken — de afweging en het migratiepad zijn nu al vastgelegd (14 § 1/§ 10). Zo profiteren we vandaag van een snelle, betaalbare, caching-vriendelijke managed service en behouden we morgen volledige kostencontrole. Dit past bij het provider-agnostische principe (PRD § 12.2) en het expliciete route-API-kostenrisico (PRD § 18).

## Referenties

- PRD § 8.2, § 12.2, § 18, § 19 (A-06)
- 14_RoutingEngine.md, 11_DatabaseConcept.md (`distance_cache`), 37_Performance.md
