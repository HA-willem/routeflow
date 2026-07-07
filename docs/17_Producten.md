# 17 — Producten & Diensten

**Status:** DONE
**Versie:** 2.0
**Bron van waarheid:** `00_PRD.md` § 6.7 (Diensttype & Verticaal-configuratie) — dit document mag het PRD niet tegenspreken.
**Werkinstructie:** zie `MASTER_PROMPT.md`.
**Relaties:** 12_Entiteiten.md (`services`, `products`), 18_Prijsafspraken.md (prijzen), 16_Facturatie.md (factuurregels/BTW), 15_AIPlanner.md (duur/weersgevoeligheid).

---

## Doel van dit document

Dit document beschrijft twee gerelateerde catalogi per Bedrijf:
1. **Diensten** (`services`) — het werk dat wordt uitgevoerd (bijv. "Glasbewassing buiten"). Dit is het planbare, factureerbare kernobject.
2. **Producten** (`products`) — optionele losse posten voor op een factuur (bijv. "Voorrijkosten", "Materiaal"), niet planbaar.

Kernprincipe (PRD § 6.7): **verticaal-agnostisch**. "Glazenwassen" is configuratie, geen hardcoded aanname. Diensten worden per bedrijf gedefinieerd; nergens in datamodel of code staat "glazenwasser" als aanname.

---

## 1. Dienst (Service)

Een **Dienst** behoort tot het Bedrijf en beschrijft één type werk. Attributen (volledig in 12_Entiteiten.md § 5):

| Veld | Betekenis | Gebruik |
|---|---|---|
| `name` | Naam, bijv. "Glasbewassing buiten" | UI, factuurregel |
| `description` | Toelichting/instructie | Medewerker-PWA |
| `standard_duration_minutes` | Standaardduur | AI Planner (dag-laag, routeduur) |
| `standard_price_cents` | Standaardprijs (excl. BTW) | Default voor prijsafspraak |
| `vat_rate` | BTW-tarief (21/9/0/verlegd) | Facturatie (16) |
| `is_weather_sensitive` + `weather_sensitivity_type` | Weersgevoeligheid | AI Planner (weerslaag, 15 § 6) |
| `icon`, `color_hex` | Visuele identiteit | Planning-/kaartweergave |

### 1.1 Branche-templates (V1)

Bij onboarding kan een bedrijf een **branche-template** kiezen (glazenwasser, schoonmaak, hovenier, …) die een set voorgedefinieerde diensten vult. Alles blijft **volledig bewerkbaar** — de template is een startpunt, geen keurslijf.

Voorbeeld glazenwasser-template:
| Dienst | Duur | Prijs (excl.) | BTW | Weer |
|---|---|---|---|---|
| Glasbewassing buiten | 45 min | €25,00 | 9%¹ | Regen |
| Glasbewassing binnen | 60 min | €35,00 | 21% | — |
| Dakgoot reinigen | 30 min | €40,00 | 21% | Vorst |

¹ 9% alléén als de schoonmaakregeling van toepassing is; UI toont disclaimer (A-07, 16_Facturatie.md § 4).

### 1.2 Validaties

- `name` verplicht, uniek per bedrijf (case-insensitief).
- `standard_duration_minutes`: 15–480.
- `standard_price_cents` ≥ 0.
- `vat_rate` ∈ {0, 9, 21} of "verlegd".
- `is_weather_sensitive = true` ⟹ `weather_sensitivity_type` verplicht.

### 1.3 Foutmeldingen

| Situatie | Melding |
|---|---|
| Dubbele naam | "Er bestaat al een dienst met deze naam." |
| Duur buiten bereik | "Kies een duur tussen 15 en 480 minuten." |
| Weersgevoelig zonder type | "Kies waar de dienst gevoelig voor is (regen/vorst/wind)." |

### 1.4 Lifecycle & edge cases

- **Archiveren i.p.v. verwijderen:** een dienst met historische beurten/facturen kan niet hard verwijderd worden (analoog BR-500). Archiveren (`archived_at`) verbergt 'm voor nieuwe dienstafspraken; bestaande blijven intact.
- **Prijswijziging:** wijzigt `standard_price_cents` niet met terugwerkende kracht. Bestaande dienstafspraken houden hun eigen prijsafspraak (18); alleen nieuwe afspraken erven de nieuwe standaard.
- **Duurwijziging:** beïnvloedt alleen nog te genereren beurten, niet reeds geplande (die hebben hun eigen `estimated_duration_minutes`).

---

## 2. Product (losse factuurpost)

Een **Product** is een niet-planbare post die als factuurregel kan worden toegevoegd (16_Facturatie.md).

| Veld | Betekenis |
|---|---|
| `name` | "Voorrijkosten", "Vervanging rubber" |
| `unit_price_cents` | Prijs per eenheid (excl. BTW) |
| `unit` | "stuk", "meter", "keer" |
| `vat_rate` | BTW-tarief |

### 2.1 Gebruik

- Handmatig toegevoegd aan een (concept)factuur naast beurt-regels.
- Voorbeeld: verzamelfactuur met 4 beurten + 1× "Voorrijkosten" (€7,50).
- Producten sturen géén planning aan (geen duur, geen route).

### 2.2 Validaties & foutmeldingen

- `unit_price_cents` ≥ 0; `name` verplicht.
- Verwijderen product dat op een gefinaliseerde factuur staat: niet toegestaan (factuur immutable, BR-301) — de factuurregel is een momentopname en blijft bestaan.

---

## 3. Verhouding Dienst ↔ Dienstafspraak ↔ Factuurregel

```
Dienst (catalogus)  ──erft standaardduur/prijs/BTW──▶  Dienstafspraak (per object)
                                                          │ genereert
                                                          ▼
                                                        Beurt ──bij 'uitgevoerd'──▶ Factuurregel
```

- De **Dienst** levert defaults.
- De **Dienstafspraak** (16/18) legt de concrete prijs per object vast (kan afwijken van standaard).
- De **Factuurregel** is de momentopname bij facturatie (naam, prijs, BTW bevroren).

---

## 4. Lege staten

- Geen diensten: onboarding toont "Voeg je eerste dienst toe" met branche-template-suggestie (nul-training, PRD § 3.2).
- Geen producten: "Producten zijn optionele losse posten voor op facturen — voeg er een toe wanneer je die nodig hebt."

---

## Changelog

| Datum | Versie | Wijziging |
|---|---|---|
| 2026-07-06 | 1.0 | Placeholder met voorbeeldlijst |
| 2026-07-07 | 2.0 | Volledige uitwerking: Dienst vs. Product, branche-templates, validaties/foutmeldingen, lifecycle-edge-cases (archiveren, prijs-/duurwijziging), relatie dienst↔afspraak↔factuurregel, lege staten |
