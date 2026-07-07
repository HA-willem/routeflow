# 18 — Prijsafspraken

**Status:** DONE
**Versie:** 2.0
**Bron van waarheid:** `00_PRD.md` § 9.1 (Prijsafspraak-typen), § 6.4 — dit document mag het PRD niet tegenspreken.
**Werkinstructie:** zie `MASTER_PROMPT.md`.
**Relaties:** 12_Entiteiten.md (`pricings`, `service_agreements`), 16_Facturatie.md (facturatiemoment), 17_Producten.md (diensten), 10_BusinessRules.md (BR-304).

---

## Doel van dit document

Dit document specificeert de **prijsafspraak**: het bedrag en de facturatielogica die aan een Dienstafspraak hangt. Waar de Dienst (17) een standaardprijs levert, legt de prijsafspraak de concrete, per-object afgesproken prijs én het *hoe* van factureren vast.

Eén Dienstafspraak heeft precies **één** prijsafspraak-type. De prijs kan afwijken van de dienst-standaard (individuele klantafspraak).

---

## 1. Prijsafspraak-typen

| Type | Werking | Facturatiemoment | Fase |
|---|---|---|---|
| **Per beurt (vast)** | Vast bedrag per uitvoering | Direct na beurt óf verzameld per periode | MVP |
| **Uurtarief** | Tarief × geregistreerde/afgesproken duur | Na beurt | MVP |
| **Abonnement** | Vast bedrag per maand/kwartaal; beurten inbegrepen | Vooraf of achteraf per periode | V1 |
| **Strippenkaart** | Bundel vooruitbetaalde beurten | Bij aankoop; verbruik per beurt | V2 |

### 1.1 Per beurt (vast)

- `amount_cents` (excl. BTW) per uitvoering.
- Facturatie per klant instelbaar: **per beurt** (elke uitvoering = regel/factuur) of **verzameld** (week/maand).
- Voorbeeld: €25,00 per glasbewassing; 4× per maand → verzamelfactuur €100,00 + BTW.

### 1.2 Uurtarief

- `hourly_rate_cents` × duur.
- MVP: duur = geplande dienstduur (`estimated_duration_minutes`). Werkelijke-duur-registratie is V2 (PRD § 5.3, geen urenregistratie in MVP).
- Voorbeeld: €35,00/uur × 45 min = €26,25 excl. BTW.

### 1.3 Abonnement

- `monthly_amount_cents` ongeacht aantal beurten.
- **Inbegrepen beurten** (`included_jobs_per_period`): boven dat aantal → overage-regel (BR-304).
- Facturatie: vooraf of achteraf per periode (maand/kwartaal), instelbaar.
- Voorbeeld: €150,00/maand incl. 4 beurten; 5e beurt in de maand → +€50,00 overage.

### 1.4 Strippenkaart (V2)

- Klant koopt bundel (bijv. 10 beurten voor €450,00), gefactureerd bij aankoop.
- Elke uitvoering verbruikt één strip; saldo zichtbaar.
- Bij saldo 0 → melding "strippenkaart op"; nieuwe kaart of ander prijstype.

---

## 2. Datamodel

`pricings` (12_Entiteiten.md) — gekoppeld 1:1 aan een Dienstafspraak:

| Veld | Type | Opmerking |
|---|---|---|
| `id` | UUID | PK |
| `company_id` | UUID | RLS |
| `type` | ENUM(per_job, hourly, subscription, punch_card) | |
| `amount_cents` | INT | per_job: bedrag; subscription: maandbedrag |
| `hourly_rate_cents` | INT | alleen hourly |
| `included_jobs_per_period` | INT | alleen subscription |
| `overage_amount_cents` | INT | alleen subscription |
| `billing_period` | ENUM(per_job, weekly, monthly, quarterly) | verzamelmoment |
| `billing_timing` | ENUM(advance, arrears) | vooraf/achteraf (subscription) |
| `punch_card_total` / `punch_card_remaining` | INT | alleen punch_card |
| `vat_rate` | DECIMAL | erft van dienst, overschrijfbaar |

---

## 3. Facturatie-koppeling

Zie 16_Facturatie.md voor de volledige flow. Kern per type:

| Type | Wat komt op de factuur | Wanneer |
|---|---|---|
| Per beurt | Regel per uitvoering | Bij `uitgevoerd` of periodiek verzameld |
| Uurtarief | Regel met duur × tarief | Na `uitgevoerd` |
| Abonnement | Vaste maandregel (+ evt. overage) | Begin/eind periode (cron) |
| Strippenkaart | Bundelbedrag bij aankoop | Bij aankoop; beurten zelf €0 |

---

## 4. Validaties

- Exact één type per dienstafspraak; verplichte velden per type (bijv. `hourly` ⟹ `hourly_rate_cents`).
- Alle bedragen ≥ 0.
- `subscription` ⟹ `included_jobs_per_period` ≥ 0 en `overage_amount_cents` ≥ 0.
- `billing_timing` alleen relevant bij `subscription`.
- BTW-tarief geldig (0/9/21/verlegd).

---

## 5. Foutmeldingen

| Situatie | Melding |
|---|---|
| Type gekozen, verplicht veld leeg | "Vul het [uurtarief/maandbedrag] in voor dit prijstype." |
| Negatief bedrag | "Bedrag kan niet negatief zijn." |
| Abonnement zonder inbegrepen aantal | "Geef aan hoeveel beurten in het abonnement zitten (0 = ongelimiteerd)." |
| Strippenkaart-saldo 0 bij inplannen | "De strippenkaart van deze klant is op. Kies een ander prijstype of verkoop een nieuwe kaart." |

---

## 6. Edge cases

| # | Case | Gedrag |
|---|---|---|
| PA-01 | Prijswijziging tijdens lopende afspraak | Nieuwe prijs geldt vanaf wijzigingsdatum; reeds gefactureerde beurten ongewijzigd (immutable, BR-020) |
| PA-02 | Abonnement + extra losse dienst | Losse dienst als apart product/dienstafspraak → aparte regel, niet in abonnement verrekend |
| PA-03 | Gepauzeerde dienstafspraak (abonnement) | Facturatie pauzeert mee tijdens `paused`; instelbaar of periode wordt doorbelast of niet (default: niet) |
| PA-04 | Twee diensten zelfde object, gecombineerde beurt (BR-801) | Elk zijn eigen prijsafspraak → twee factuurregels, één reistijd |
| PA-05 | BTW-afwijking per object | `vat_rate` overschrijfbaar op prijsafspraak-niveau met disclaimer (A-07) |

---

## 7. Openstaande punten

Geen open beslissingen. Strippenkaart is expliciet V2 (PRD § 9.1) en hier conceptueel voorbereid zodat het datamodel en de facturatie-flow er nu al rekening mee houden.

---

## Changelog

| Datum | Versie | Wijziging |
|---|---|---|
| 2026-07-06 | 1.0 | Placeholder-tabel met 4 typen |
| 2026-07-07 | 2.0 | Volledige uitwerking: 4 prijstypen met facturatiemoment, datamodel (`pricings`), facturatie-koppeling, validaties/foutmeldingen, 5 edge cases |
