# 39 — Toekomstvisie

**Status:** DONE
**Versie:** 2.0
**Bron van waarheid:** `00_PRD.md` § 1, § 3 (visie), § 4.2 (secundaire doelgroepen), § 5 (scope) — dit document mag het PRD niet tegenspreken.
**Werkinstructie:** zie `MASTER_PROMPT.md`.
**Relaties:** 01_Productvisie.md, 33_Roadmap.md, 34_Backlog.md, 03_Doelgroep.md.

---

## Doel van dit document

Dit document schetst de **lange-termijnvisie** (3–5 jaar) voorbij de V2-roadmap: waar RouteFlow naartoe groeit, welke verticalen en markten, welke productrichtingen, en welke kansen/risico's daarbij horen. Het is richtinggevend, geen commitment — concrete inplanning gebeurt via 33/34. Het mag de scope-fasering (PRD § 5, MASTER_PROMPT § 3) niet vervroegen.

---

## 1. Horizon-model

We denken in drie horizonten (McKinsey-stijl):

| Horizon | Focus | Termijn |
|---|---|---|
| **H1 — Kern** | MVP→V1→V2 uitmuntend maken voor glazenwassers (33) | 0–18 mnd |
| **H2 — Verbreding** | Meer verticalen + integraties + grotere bedrijven | 18–36 mnd |
| **H3 — Platform** | RouteFlow als platform/ecosysteem, evt. internationaal | 36–60 mnd |

---

## 2. H2 — Verticale verbreding

Gemeenschappelijke noemer (PRD § 4.2): *terugkerende afspraken op locatie met route-component*. Uitrolvolgorde op basis van gelijkenis met glazenwassers:

1. **Schoonmaakbedrijven** — hoogste overlap (frequentie, routes, abonnementen).
2. **Hoveniers / groenonderhoud** — seizoensgevoelig, weerslaag past goed.
3. **Dakgoot-/gevelreiniging** — dicht bij glazenwassen.
4. **Ongediertebestrijding** — inspectie-cycli, rapportageplicht.
5. **Installatie/onderhoud (CV, airco)** — service-abonnementen, materiaal.

Enabler: branche-templates (17 § 1.1) + verticaal-onboarding (BL-020). De **verticaal-agnostische kern** (PRD § 6.7) maakt dit configuratie, geen herbouw.

---

## 3. H2 — Product-uitbreidingen

- **Integraties:** boekhouden (e-Boekhouden/Moneybird/Exact), SEPA-incasso, CRM-koppelingen (BL-003/004).
- **Klantportaal & self-service** (BL-001) — verlaagt communicatielast, verhoogt binding.
- **Diepere AI:** leren van planner-correcties, voorspellende capaciteit, multi-dag-optimalisatie (BL-005), dynamische herplanning bij live-uitloop (BL-006).
- **Grotere bedrijven (15–50+):** teamplanning, meerdere vestigingen, rollen/rechten fijnmaziger.

---

## 4. H3 — Platform & ecosysteem

- **API/marketplace voor integraties** (API-first is er al, PRD § 12.2): derden bouwen koppelingen.
- **Data-inzichten/benchmarks:** geanonimiseerde branche-benchmarks als waarde voor ondernemers ("jouw reistijd vs. vergelijkbare bedrijven") — strikt AVG-conform.
- **Internationalisering:** i18n-architectuur ligt klaar (A-01); logische eerste stap België (NL-talig) daarna Duitsland — vergt lokale betaalmethoden, BTW-regels, adresformaten en taal.
- **Native apps:** heroverweging na V1-PWA-evaluatie (A-05, BL-009) indien hardware-toegang/appstore-aanwezigheid dat rechtvaardigt.
- **Marketplace klanten↔bedrijven:** verkennenswaardig maar expliciet *niet* in de kern-scope (PRD § 3.4 zegt: geen marktplaats in V1) — een aparte strategische keuze met eigen risico's.

---

## 5. Noordster op lange termijn

Consistent met 01 § 6: succes = **activatie × retentie × aantoonbare impact** (reistijdreductie, snellere facturatie). Groei in tenants en ARR zijn *lagging* indicatoren daarvan, niet het doel op zich. Marktleiderschap in NL voor service-bedrijven ≤ 50 medewerkers is de ambitie (01 § 3.2), met verbreding naar meerdere verticalen als motor.

---

## 6. Kansen & risico's op lange termijn

| Kans | Toelichting |
|---|---|
| Verticale verbreding zonder herbouw | Agnostische kern = lage marginale kosten per verticaal |
| AI als moat | Data-vliegwiel: meer planningen → betere modellen |
| NL-diepte als vertrouwen | Lokale fiscale/betaal/taal-fit als toetredingsdrempel voor buitenlandse spelers |

| Risico | Mitigatie |
|---|---|
| Scope-creep / te snel verbreden | Horizon-discipline; kern eerst uitmuntend (H1) |
| Afhankelijkheid externe providers | Adapter-patroon + open-source-fallbacks (Mollie/Mapbox/360dialog vervangbaar) |
| Internationalisering onderschat | Per land eigen fiscale/betaal-implementatie; niet "even vertalen" |
| Datagedreven benchmarks vs. AVG | Strikte anonimisering/aggregatie; juridische toetsing |

---

## 7. Wat NIET verandert

Ongeacht groei blijven de kernprincipes (01 § 4) leidend: planning is het hart, automatisch-tenzij, mobiel/desktop-scheiding, nul-training-adoptie, verticaal-agnostisch, Nederlands-eerst, premium in elk detail. De visie verbreedt de *reikwijdte*, niet de *identiteit* van het product.

---

## Changelog

| Datum | Versie | Wijziging |
|---|---|---|
| 2026-07-06 | 1.0 | Placeholder met V2–V5-lijstje |
| 2026-07-07 | 2.0 | Volledige uitwerking: 3-horizonmodel, verticale verbredingsvolgorde, product-uitbreidingen, platform/internationalisering, lange-termijn-noordster, kansen/risico's met mitigatie, "wat niet verandert" |
