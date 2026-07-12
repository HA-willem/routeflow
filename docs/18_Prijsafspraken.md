# 18 — Prijsafspraken

**Status:** DONE
**Versie:** 3.0
**Bron van waarheid:** `00_PRD.md` § 9.1 (Prijsafspraak-typen), § 6.4 — dit document mag het PRD niet tegenspreken.
**Werkinstructie:** zie `MASTER_PROMPT.md`.
**Relaties:** 12_Entiteiten.md (`pricings`, `service_agreements`), 16_Facturatie.md (facturatiemoment), 17_Producten.md (diensten), 10_BusinessRules.md (BR-304, BR-306).

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

## 7. Klant-specifieke prijsafspraken (prijs-overrides)

Naast de prijsafspraak die 1:1 aan een Dienstafspraak hangt (§ 1–2), kan een Klant **losse prijs-overrides** hebben die de standaardprijs van een Dienstafspraak (of van meerdere Dienstafspraken tegelijk) overschrijven — bijvoorbeeld een vaste korting voor een grote klant, of een eenmalige opslag voor een lastig bereikbaar object. Dit is een **aanvullend** mechanisme bovenop § 1's prijstypen, geen vervanging: een Dienstafspraak heeft nog steeds precies één prijsafspraak-type (§ 1); een override past dát bedrag aan, zonder het type te wijzigen.

### 7.1 Prioriteit bij samenloop

Wanneer meerdere overrides tegelijk op een beurt van toepassing zouden kunnen zijn, geldt de **specifiekste wint**:

| Prioriteit | Niveau | Voorbeeld |
|---|---|---|
| 1 (hoogst) | **Job** | Eenmalige aanpassing voor precies deze ene beurt |
| 2 | **Klant** | Geldt voor alle dienstafspraken van deze klant |
| 3 | **Dienstafspraak** | Geldt voor deze ene dienstafspraak (alle toekomstige beurten eronder) |
| 4 (laagst) | **Dienst** | De dienst-standaardprijs zelf (17_Producten.md) — geen override, de basiswaarde waar alles vanaf overschrijft |

Bij het bepalen van de daadwerkelijke prijs van een beurt doorloopt het systeem deze volgorde van hoog naar laag en past de **eerste match** toe — een Job-niveau-override (indien aanwezig en binnen zijn geldigheidsperiode, § 7.3) wint altijd, ongeacht wat er op Klant- of Dienstafspraak-niveau is ingesteld. Is er geen Job-override, dan Klant; is er geen Klant-override, dan de gewone Dienstafspraak-prijsafspraak (§ 1); is er geen van alle, dan de Dienst-standaardprijs.

Dit is vastgelegd als nieuwe **harde business rule BR-306** (zie `10_BusinessRules.md`-wijziging).

### 7.2 Instelbare velden per override

| Veld | Type | Opmerking |
|---|---|---|
| `id` | UUID | PK |
| `company_id` | UUID | RLS |
| `scope` | ENUM(job, customer, service_agreement) | bepaalt het niveau (§ 7.1); dienst-niveau heeft geen override-rij — dat is de bestaande dienst-standaardprijs |
| `scope_id` | UUID | verwijst naar `jobs.id` / `customers.id` / `service_agreements.id`, afhankelijk van `scope` |
| **vast bedrag** (`fixed_amount_cents`) | INT, nullable | vervangt `amount_cents`/`hourly_rate_cents` volledig indien gezet |
| **uurtarief** (`hourly_rate_cents`) | INT, nullable | alternatief voor vast bedrag; onderling exclusief |
| **korting %** (`discount_percent`) | DECIMAL, nullable | procentuele verlaging t.o.v. de onderliggende prijs (§ 7.1 volgende niveau) |
| **opslag %** (`surcharge_percent`) | DECIMAL, nullable | procentuele verhoging; onderling exclusief met korting % |
| **geldig vanaf** (`valid_from`) | DATE | verplicht |
| **geldig tot** (`valid_until`) | DATE, nullable | leeg = voor onbepaalde tijd |
| **opmerking** (`note`) | TEXT, nullable | intern, niet op de factuur (tenzij expliciet overgenomen in een factuurregel-toelichting) |

**Validatie:** exact één van {vast bedrag, uurtarief, korting %, opslag %} is gezet per override — een override die zowel een vast bedrag als een korting % specificeert is ambigu (welke geldt eerst?) en wordt geweigerd. `geldig tot` (indien gezet) ligt na `geldig vanaf`.

### 7.3 Geldigheidsperiode

Een override buiten zijn `[geldig vanaf, geldig tot]`-venster telt niet mee — het systeem valt dan terug op het eerstvolgende niveau in de prioriteitsketen (§ 7.1), niet op een foutmelding. Dit maakt tijdelijke acties (bijv. "20% korting in december") mogelijk zonder de override daarna handmatig te hoeven verwijderen.

### 7.4 Edge cases

| # | Case | Gedrag |
|---|---|---|
| PA-06 | Klant-override én Dienstafspraak-eigen prijsafspraak beide aanwezig | Klant-override wint (hogere prioriteit, § 7.1) — de Dienstafspraak-prijsafspraak (§ 1) blijft ongewijzigd zichtbaar in de instellingen, wordt alleen niet gebruikt zolang de override geldig is |
| PA-07 | Twee Klant-overrides die elkaar in tijd overlappen | Niet toegestaan — validatiefout bij aanmaken ("Er loopt al een prijsafspraak voor deze klant in deze periode"), voorkomt ambiguïteit over welke van de twee zou moeten winnen |
| PA-08 | Job-override op een beurt die al gefactureerd is | Override heeft geen effect met terugwerkende kracht (BR-020, immutable facturen) — alleen van toepassing als de beurt nog niet gefactureerd is |
| PA-09 | Korting % zou de prijs negatief maken (bij een klein basisbedrag en korting >100%, foutieve invoer) | Geweigerd bij aanmaken: "Korting kan de prijs niet onder €0 brengen." |

---

## 8. Openstaande punten

Geen open beslissingen. Strippenkaart is expliciet V2 (PRD § 9.1) en hier conceptueel voorbereid zodat het datamodel en de facturatie-flow er nu al rekening mee houden. Klant-specifieke prijsafspraken (§ 7) zijn hier volledig conceptueel uitgewerkt (business rule, datamodel, edge cases); de bijbehorende database-migratie en entiteit-registratie in `11_DatabaseConcept.md`/`12_Entiteiten.md` is werk voor de sprint die dit daadwerkelijk bouwt (nog niet ingepland — geen bestaande FR/sprint-toewijzing in `40_Implementatieplan.md` dekt dit vandaag), niet van dit document zelf.

---

## Changelog

| Datum | Versie | Wijziging |
|---|---|---|
| 2026-07-06 | 1.0 | Placeholder-tabel met 4 typen |
| 2026-07-07 | 2.0 | Volledige uitwerking: 4 prijstypen met facturatiemoment, datamodel (`pricings`), facturatie-koppeling, validaties/foutmeldingen, 5 edge cases |
| 2026-07-12 | 3.0 | § 7 toegevoegd: klant-specifieke prijsafspraken (prijs-overrides) — prioriteitsketen Job > Klant > Dienstafspraak > Dienst (nieuwe BR-306), instelbare velden (vast bedrag/uurtarief/korting %/opslag %/geldigheidsperiode/opmerking), 4 nieuwe edge cases (PA-06 t/m PA-09). Nog niet in `11_DatabaseConcept.md`/`12_Entiteiten.md` gemigreerd (geen sprint-toewijzing vandaag) — puur conceptuele documentatie. |
