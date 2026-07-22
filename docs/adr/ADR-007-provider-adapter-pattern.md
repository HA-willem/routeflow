# ADR-007: Provider Adapter Pattern voor externe integraties

- **Status:** Accepted
- **Datum:** 2026-07-07
- **Beslisser:** Chief Software Architect (ServOps)
- **Bron van waarheid:** `00_PRD.md` § 12.2 (provider-agnostische adapters)
- **Gerelateerd:** ADR-005 (Mapbox), ADR-006 (360dialog), ADR-002 (Supabase); 14_RoutingEngine.md § 2, 19_WhatsApp.md § 2, 16_Facturatie.md, 13_API_Specificatie.md

---

## Context

ServOps leunt op meerdere **vervangbare** externe diensten: betalingen (Mollie, A-04), routing/geocoding (Mapbox, ADR-005), WhatsApp (360dialog, ADR-006), weer (Open-Meteo/KNMI) en e-mail (Resend). PRD § 18 benoemt expliciet risico's rond providerkosten en -lock-in. Tegelijk moet domeinlogica (facturatie, planning, communicatie) testbaar zijn zonder echte externe calls.

## Probleem

Hoe voorkomen we dat domeinlogica direct tegen providerspecifieke SDK's/API's praat, zodat (a) een providerwissel geen herbouw van de business-logica vereist, en (b) unit-/integratietests providers kunnen mocken?

## Gekozen oplossing

**Provider Adapter Pattern**: voor elke externe categorie een **stabiele, domeingerichte interface**, met één of meer concrete implementaties erachter.

```
Domeinlogica (planning, facturatie, communicatie)
        │  praat uitsluitend tegen interfaces
        ▼
  RoutingProvider · PaymentProvider · MessagingProvider · WeatherProvider · EmailProvider
        │  concrete implementatie geselecteerd via config
        ▼
  MapboxProvider/OsrmProvider · MollieProvider · ThreeSixtyDialogProvider · ...
```

- Interfaces leven in `/lib/<domein>/provider.ts`; implementaties in aparte modules (40_Implementatieplan.md, sprint-indeling).
- Voorbeeld-contract: `RoutingProvider.geocode()/distanceMatrix()/directions()` (14 § 2); `MessagingProvider.sendTemplate()/sendFreeText()` (19 § 2).
- Providerkeuze is **configuratie** (env/instelling), niet een code-tak door de domeinlogica.
- Mocks/fakes implementeren dezelfde interface t.b.v. tests (31_Testplan.md § 7).

## Alternatieven

| Alternatief | Waarom niet |
|---|---|
| **Direct SDK-gebruik in domeinlogica** | Elke providerwissel raakt de business-logica; moeilijk te unit-testen |
| **Generieke "plugin-architectuur" met dynamic loading** | Overengineering voor de huidige schaal; onnodige complexiteit |
| **Losse microservice per provider** | Operationele overhead (deploys, monitoring) niet in verhouding tot MVP/V1-schaal |

## Consequenties

**Positief**
- Providerwissels (Mapbox→OSRM, Mollie→alternatief) zijn lokale, geïsoleerde wijzigingen.
- Domeinlogica is unit-testbaar met fakes, zonder netwerkafhankelijkheid.
- Nieuwe providers (bv. tweede e-mail-provider als fallback) sluiten aan op hetzelfde contract.

**Negatief / risico's**
- Interfaces moeten breed genoeg zijn om providerverschillen te dekken zonder lekken van providerspecifieke details ("leaky abstraction").
- Kleine overhead: één indirectie-laag per integratie.

**Mitigaties**
- Interfaces expliciet ontworpen op domeinbehoefte (wat de planner/facturatie nodig heeft), niet op één providers API-vorm (14 § 2, 19 § 2 als referentie-contracten).
- Foutmodel per adapter genormaliseerd naar interne foutklassen (19 § 8 als voorbeeld) zodat domeinlogica providerneutraal blijft.

## Waarom deze keuze toekomstbestendig is

Dit patroon is de directe operationalisering van het PRD-principe "provider-agnostische adapters" (§ 12.2) en het expliciete risicobeleid rond leverancierskosten/-lock-in (§ 18). Het maakt elke leveranciersbeslissing (ADR-005, ADR-006, en toekomstige) **omkeerbaar tegen lage kosten**: een providerwissel is een implementatie-swap achter een stabiel contract, nooit een architectuurwijziging. Dit is precies wat ServOps nodig heeft om mee te bewegen met kostenschommelingen, nieuwe markten (ADR-010/39) en leveranciersrisico, zonder de kernlogica ooit opnieuw te hoeven bouwen.

## Referenties

- PRD § 12.2, § 18
- 14_RoutingEngine.md § 2, 19_WhatsApp.md § 2, 16_Facturatie.md, 13_API_Specificatie.md
