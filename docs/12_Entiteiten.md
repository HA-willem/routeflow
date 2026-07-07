# 12 — Entiteiten

**Status:** DONE
**Versie:** 1.0
**Bron van waarheid:** `00_PRD.md` § 6 (Kernconcepten & Domeinmodel) — dit document mag het PRD niet tegenspreken.
**Werkinstructie:** zie `MASTER_PROMPT.md`.

---

## Doel van dit document

Dit document mappt **Nederlandse domeintermen** (PRD §6) naar **database-tabelen en API-modellen**. Elke entiteit wordt volledig gespecificeerd: attributen, types, validaties, relaties, voorbeeldwaarden.

---

## 1. NL-EN Terminology Mapping

| NL Domeinterm | EN Tabelnaam | EN Type-name | Beschrijving |
|---|---|---|---|
| Bedrijf | companies | Company | SaaS-tenant |
| Gebruiker | users | User | App-gebruiker (planner, admin, medewerker) |
| Klant | customers | Customer | Eindklant (particulier/zakelijk) |
| Object | objects | WorkLocation | Fysieke locatie waar werk plaatsvindt |
| Dienst | services | Service | Type werk (bijv. "Glasbewassing buiten") |
| Dienstafspraak | service_agreements | ServiceAgreement | Contract: dienst @ object, met frequentie & prijs |
| Prijsafspraak | pricings | Pricing | Bedrag-regel voor dienstafspraak |
| Beurt | jobs | Job | Één concrete uitvoering van dienstafspraak |
| Route | routes | Route | Dag-schedule medewerker; bevat meerdere beurten |
| Medewerker | employees | Employee | Personeelslid dat routes uitvoert |
| Team | teams | Team | Groep medewerkers (optioneel, V2) |
| Beschikbaarheid | availability | Availability | Dag-status medewerker (beschikbaar/ziek/verlof) |
| Verlof | leave_periods | LeavePeriod | Meerdaags verlof |
| Factuur | invoices | Invoice | Biljet naar klant |
| Factuurregel | invoice_lines | InvoiceLine | Regel op factuur (één dienst) |
| Betaling | payments | Payment | Betaalde bedrag (iDEAL, SEPA) |
| Herinnering | reminders | Reminder | Betalings-reminder (e-mail/WhatsApp) |
| Notificatie | notifications | Notification | Systeem-bericht (intern/extern) |
| Bericht | messages | Message | WhatsApp/e-mail-log |

---

## 2. Entiteit: Bedrijf (Company)

**Rollen:** Eigenaar (tenant)  
**Primaire use-case:** Multi-tenancy; RLS-anchor  
**Tabel:** `companies`

### Attributen

| Attribuut | Type | Verplicht | Uniek | Opmerkingen |
|---|---|---|---|---|
| `id` | UUID | ✓ | ✓ | PK |
| `name` | VARCHAR(255) | ✓ | ✗ | "Bakkerij Jansen" |
| `slug` | VARCHAR(100) | ✓ | ✓ | "bakkerij-jansen" (URL-friendly) |
| `industry` | ENUM(glazenier, schoonmaak, hoveniers, etc.) | ✗ | ✗ | Verticaal (V2) |
| `billing_address` | VARCHAR(500) | ✗ | ✗ | KVK-adres |
| `kvk_number` | VARCHAR(8) | ✗ | ✗ | Uitzonderingen |
| `vat_number` | VARCHAR(14) | ✗ | ✗ | |
| `iban` | VARCHAR(34) | ✗ | ✗ | Bankrekening |
| `subscription_tier` | ENUM(starter, pro, enterprise) | ✓ | ✗ | Prijsplan |
| `max_employees` | INT | ✓ | ✗ | Limiet per tier |
| `max_customers` | INT | ✓ | ✗ | Limiet per tier |
| `config` | JSONB | ✓ | ✗ | {default_vat: 21, reminder_days: [7,14,21], ...} |
| `created_at` | TIMESTAMP | ✓ | ✗ | UTC |
| `updated_at` | TIMESTAMP | ✓ | ✗ | UTC |
| `archived_at` | TIMESTAMP | ✗ | ✗ | Soft-delete |

### Validaties

- `name`: 1–255 chars; verplicht
- `slug`: lowercase, dashes, 1–100 chars; UNIQUE
- `kvk_number`: optioneel; als gegeven, exact 8 digits
- `subscription_tier`: 'starter' = 5 medewerkers; 'pro' = 25; 'enterprise' = unlimited

### Voorbeeldwaarde

```json
{
  "id": "uuid-1",
  "name": "Glaswasserij De Haan",
  "slug": "glaswasserij-haan",
  "kvk_number": "12345678",
  "subscription_tier": "pro",
  "max_employees": 25,
  "config": {
    "default_vat_rate": 21,
    "reminder_days": [7, 14, 21],
    "timezone": "Europe/Amsterdam",
    "currency": "EUR"
  },
  "created_at": "2026-01-15T10:00:00Z"
}
```

---

## 3. Entiteit: Klant (Customer)

**Primaire use-case:** Beheer eindklanten  
**Relaties:** N Objekts, N Fakturen, 1 Bedrijf  
**Tabel:** `customers`

### Attributen

| Attribuut | Type | Verplicht | Opmerkingen |
|---|---|---|---|
| `id` | UUID | ✓ | PK |
| `company_id` | UUID | ✓ | FK → companies (RLS) |
| `name` | VARCHAR(255) | ✓ | Persoon/bedrijfsnaam |
| `type` | ENUM(person, business) | ✓ | |
| `email` | VARCHAR(255) | ✗ | Uniek per company |
| `phone` | VARCHAR(20) | ✗ | |
| `whatsapp_number` | VARCHAR(20) | ✗ | Zonder +31, bijv. "612345678" |
| `whatsapp_opt_in` | BOOLEAN | ✓ | default FALSE (AVG) |
| `email_opt_in` | BOOLEAN | ✓ | default TRUE |
| `billing_preference` | ENUM(email, whatsapp, post) | ✓ | default email |
| `kvk_number` | VARCHAR(8) | ✗ | Only if type=business |
| `vat_number` | VARCHAR(14) | ✗ | EU-format |
| `payment_terms_days` | INT | ✓ | default 14 |
| `notes` | TEXT | ✗ | "Altijd bellen voor 9:00" |
| `created_at` | TIMESTAMP | ✓ | |
| `updated_at` | TIMESTAMP | ✓ | |
| `archived_at` | TIMESTAMP | ✗ | Soft-delete |

### Validaties

- `email`: moet geldig RFC5322-format zijn (indien gegeven)
- `whatsapp_number`: moet NL-nummer zijn of lege string
- `type='business'` ⟹ `kvk_number` vereist (validation-regel)
- `payment_terms_days`: 1–90 (range-check)

### Voorbeeldwaarde

```json
{
  "id": "uuid-c1",
  "company_id": "uuid-1",
  "name": "Bakkerij Jansen BV",
  "type": "business",
  "email": "info@bakkerij-jansen.nl",
  "whatsapp_number": "641234567",
  "whatsapp_opt_in": true,
  "kvk_number": "87654321",
  "billing_preference": "whatsapp",
  "payment_terms_days": 30,
  "notes": "Eigenaar zei: bel vooraf"
}
```

---

## 4. Entiteit: Object (WorkLocation)

**Primaire use-case:** Locatie waar werk plaats vindt  
**Relaties:** 1 Klant, N Dienstafspraken, N Beurten  
**Tabel:** `objects`

### Attributen

| Attribuut | Type | Verplicht | Opmerkingen |
|---|---|---|---|
| `id` | UUID | ✓ | PK |
| `company_id` | UUID | ✓ | FK (RLS) |
| `customer_id` | UUID | ✓ | FK → customers |
| `address_line1` | VARCHAR(255) | ✓ | "Kerkstraat 42" |
| `postal_code` | VARCHAR(10) | ✓ | NL-format: "1234 AB" |
| `city` | VARCHAR(100) | ✓ | "Amsterdam" |
| `country_code` | VARCHAR(2) | ✓ | default "NL" |
| `location` | geometry(Point,4326) | ✓ | PostGIS: {type: "Point", coordinates: [lng, lat]} |
| `location_status` | ENUM(geocoded, manual, failed) | ✓ | |
| `type` | ENUM(residence, commercial, complex, other) | ✓ | |
| `access_notes` | TEXT | ✗ | "3x bellen", "Deur rechts" |
| `created_at` | TIMESTAMP | ✓ | |
| `updated_at` | TIMESTAMP | ✓ | |
| `archived_at` | TIMESTAMP | ✗ | |

### Validaties

- `postal_code`: regex `^[A-Z]{2}\d{2}\s?[A-Z]{2}$`
- `location_status='failed'` ⟹ planner moet handmatig locatie zetten
- `address_line1 + postal_code`: moet uniek per klant (geen dubbele adressen)

### Voorbeeldwaarde

```json
{
  "id": "uuid-o1",
  "company_id": "uuid-1",
  "customer_id": "uuid-c1",
  "address_line1": "Bakkerij Jansen, Kerkstraat 42",
  "postal_code": "1234 AB",
  "city": "Amsterdam",
  "location": {
    "type": "Point",
    "coordinates": [4.9041, 52.3676]
  },
  "location_status": "geocoded",
  "type": "commercial",
  "access_notes": "Bel aan voorkant; sleutel onder mat"
}
```

---

## 5. Entiteit: Dienst (Service)

**Primaire use-case:** Type werk-aanbod per bedrijf  
**Relaties:** N Dienstafspraken, N Beurten  
**Tabel:** `services`

### Attributen

| Attribuut | Type | Verplicht | Opmerkingen |
|---|---|---|---|
| `id` | UUID | ✓ | PK |
| `company_id` | UUID | ✓ | FK (RLS) |
| `name` | VARCHAR(255) | ✓ | "Glasbewassing buiten" |
| `description` | TEXT | ✗ | |
| `standard_duration_minutes` | INT | ✓ | Geschatte duur (30–120) |
| `standard_price_cents` | INT | ✓ | In centen; bijv. 2500 = €25.00 |
| `vat_rate` | DECIMAL(3,1) | ✓ | default 21.0 (%) |
| `is_weather_sensitive` | BOOLEAN | ✓ | default FALSE |
| `weather_sensitivity_type` | ENUM(rain, frost, wind) | ✗ | If weather_sensitive |
| `icon` | VARCHAR(50) | ✗ | Emoji bijv. "🪟" of icon-code "glass" |
| `color_hex` | VARCHAR(7) | ✗ | "#1A73E8" (UI-kleur) |
| `created_at` | TIMESTAMP | ✓ | |
| `archived_at` | TIMESTAMP | ✗ | |

### Validaties

- `standard_duration_minutes`: 15–480
- `standard_price_cents`: ≥ 0
- `vat_rate`: 0, 9, 21 (alleen geldige NL-tarieven)
- `is_weather_sensitive=true` ⟹ `weather_sensitivity_type` required

### Voorbeeldwaarde

```json
{
  "id": "uuid-s1",
  "company_id": "uuid-1",
  "name": "Glasbewassing buiten",
  "standard_duration_minutes": 45,
  "standard_price_cents": 5000,
  "vat_rate": 9.0,
  "is_weather_sensitive": true,
  "weather_sensitivity_type": "rain",
  "icon": "🪟",
  "color_hex": "#4285F4"
}
```

---

## 6. Entiteit: Dienstafspraak (ServiceAgreement)

**Kernmodel!** Frequentie + duur + prijs per dienst @ object  
**Relaties:** 1 Service, 1 Object, 1 Pricing, N Jobs  
**Tabel:** `service_agreements`

### Attributen

| Attribuut | Type | Verplicht | Opmerkingen |
|---|---|---|---|
| `id` | UUID | ✓ | PK |
| `company_id` | UUID | ✓ | FK (RLS) |
| `object_id` | UUID | ✓ | FK → objects |
| `service_id` | UUID | ✓ | FK → services |
| `frequency_type` | ENUM(weekly, biweekly, monthly, quarterly, yearly, once, custom) | ✓ | |
| `frequency_interval_days` | INT | ✗ | If frequency_type=custom (bijv. 14 = elke 14 dagen) |
| `pricing_id` | UUID | ✓ | FK → pricings |
| `preferred_day` | INT | ✗ | 0=Ma–6=Zo |
| `preferred_daypart` | ENUM(morning, afternoon) | ✗ | Voor 12:00 of na 12:00 |
| `flexibility_window_days` | INT | ✓ | default 3 (±3 werkdagen) |
| `call_ahead_required` | BOOLEAN | ✓ | default FALSE |
| `exclude_dates` | DATE[] | ✗ | Feestdagen, bijv. [2026-12-25, ...] |
| `status` | ENUM(active, paused, ended) | ✓ | default active |
| `paused_until` | DATE | ✗ | If status=paused |
| `ended_at` | TIMESTAMP | ✗ | If status=ended |
| `last_completed_job_id` | UUID | ✗ | Optimization: latest completed beurt |
| `next_ideal_date` | DATE | ✗ | Cache: computed ideale datum volgende beurt |
| `created_at` | TIMESTAMP | ✓ | |
| `updated_at` | TIMESTAMP | ✓ | |

### Validaties

- `frequency_type='weekly'` ⟹ `frequency_interval_days` = 7
- `frequency_type='custom'` ⟹ `frequency_interval_days` required (7–365)
- `flexibility_window_days`: 0–21
- Status-machine: active → paused → active → ended (geen teruggaan)

### Voorbeeldwaarde

```json
{
  "id": "uuid-sa1",
  "company_id": "uuid-1",
  "object_id": "uuid-o1",
  "service_id": "uuid-s1",
  "frequency_type": "weekly",
  "frequency_interval_days": 7,
  "pricing_id": "uuid-p1",
  "preferred_day": 2,
  "preferred_daypart": "morning",
  "flexibility_window_days": 3,
  "call_ahead_required": false,
  "status": "active",
  "next_ideal_date": "2026-07-14"
}
```

---

## 7. Entiteit: Beurt (Job)

**Primaire use-case:** Operationeel: één concrete uitvoering  
**Relaties:** 1 ServiceAgreement, 1 Route, N InvoiceLines, N JobPhotos  
**Tabel:** `jobs`

### Attributen

| Attribuut | Type | Verplicht | Opmerkingen |
|---|---|---|---|
| `id` | UUID | ✓ | PK |
| `company_id` | UUID | ✓ | FK (RLS) |
| `service_agreement_id` | UUID | ✓ | FK → service_agreements |
| `route_id` | UUID | ✗ | FK → routes (null = proposed) |
| `scheduled_date` | DATE | ✓ | |
| `status` | ENUM (proposed,planned,en_route,completed,not_home,cancelled,rescheduling) | ✓ | BR-050 machine |
| `started_at` | TIMESTAMP | ✗ | Medewerker startte |
| `completed_at` | TIMESTAMP | ✗ | Medewerker klaar |
| `locked` | BOOLEAN | ✓ | default FALSE |
| `locked_until` | DATE | ✗ | Vergrendeld tot (BR-200) |
| `locked_reason` | VARCHAR(255) | ✗ | "Klant zei dinsdag" |
| `notes` | TEXT | ✗ | |
| `estimated_duration_minutes` | INT | ✓ | |
| `actual_duration_minutes` | INT | ✗ | `completed_at - started_at` |
| `created_at` | TIMESTAMP | ✓ | |
| `updated_at` | TIMESTAMP | ✓ | |

### Validaties

- `scheduled_date`: niet in verleden (warning is ok)
- `locked_until`: >= scheduled_date (indien gegeven)
- Status-machine: zie BR-050 t/m BR-065

### Voorbeeldwaarde

```json
{
  "id": "uuid-j1",
  "company_id": "uuid-1",
  "service_agreement_id": "uuid-sa1",
  "route_id": "uuid-r1",
  "scheduled_date": "2026-07-14",
  "status": "completed",
  "started_at": "2026-07-14T09:15:00Z",
  "completed_at": "2026-07-14T09:52:00Z",
  "estimated_duration_minutes": 45,
  "actual_duration_minutes": 37,
  "locked": true,
  "locked_until": "2026-07-15",
  "locked_reason": "Klant dinsdag 09:00 verwacht"
}
```

---

## 8. Entiteit: Route (dagplanningrecord)

**Primaire use-case:** Samenvattend: één medewerker op één dag  
**Relaties:** 1 Employee, N Jobs  
**Tabel:** `routes`

### Attributen

| Attribuut | Type | Verplicht | Opmerkingen |
|---|---|---|---|
| `id` | UUID | ✓ | PK |
| `company_id` | UUID | ✓ | FK |
| `employee_id` | UUID | ✓ | FK → employees |
| `route_date` | DATE | ✓ | |
| `total_distance_meters` | INT | ✗ | Som alle stops |
| `total_drive_time_minutes` | INT | ✗ | Reistijd |
| `total_work_time_minutes` | INT | ✗ | Som `estimated_duration_minutes` van jobs |
| `sequence_version` | INT | ✓ | default 0; increment bij re-optimize |
| `optimization_score` | DECIMAL(5,2) | ✗ | 0–100 (reistijd/frequentie balance) |
| `created_at` | TIMESTAMP | ✓ | |
| `updated_at` | TIMESTAMP | ✓ | |

### Validaties

- `total_work_time_minutes + total_drive_time_minutes ≤ 510` (8.5 uur) — soft warning

---

## 9. Entiteit: Factuur (Invoice)

**Primaire use-case:** Biljet naar klant  
**Relaties:** 1 Customer, N InvoiceLines, N Payments, N Reminders  
**Tabel:** `invoices`

### Attributen

| Attribuut | Type | Verplicht | Opmerkingen |
|---|---|---|---|
| `id` | UUID | ✓ | PK |
| `company_id` | UUID | ✓ | FK (RLS) |
| `customer_id` | UUID | ✓ | FK → customers |
| `invoice_number` | VARCHAR(50) | ✗ | Format: ABC-2026-00001 (null = draft) |
| `status` | ENUM(draft, finalized, sent, overdue, cancelled) | ✓ | default draft |
| `invoice_date` | DATE | ✓ | |
| `due_date` | DATE | ✓ | |
| `total_amount_cents` | INT | ✓ | Incl. BTW |
| `total_tax_cents` | INT | ✓ | |
| `currency` | VARCHAR(3) | ✓ | "EUR" |
| `payment_status` | ENUM(open, paid, partial, overdue) | ✓ | default open |
| `payment_id` | VARCHAR(255) | ✗ | Mollie payment ID |
| `notes` | TEXT | ✗ | |
| `created_at` | TIMESTAMP | ✓ | |
| `updated_at` | TIMESTAMP | ✓ | |
| `sent_at` | TIMESTAMP | ✗ | |

### Validaties

- `total_amount_cents` = SUM(invoice_lines.total_amount_cents)
- `invoice_number` uniek per company per jaar
- `status=finalized` ⟹ immutable (correcties via creditfactuur)

---

## 10. Entiteit: Betaling (Payment)

**Primaire use-case:** Payment record from Mollie webhook  
**Relaties:** 1 Invoice  
**Tabel:** `payments`

### Attributen

| Attribuut | Type | Verplicht | Opmerkingen |
|---|---|---|---|
| `id` | UUID | ✓ | PK |
| `invoice_id` | UUID | ✓ | FK → invoices |
| `payment_method` | ENUM(ideal, sepa, manual) | ✓ | |
| `amount_cents` | INT | ✓ | |
| `payment_date` | DATE | ✓ | |
| `mollie_payment_id` | VARCHAR(255) | ✗ | |
| `status` | ENUM(pending, completed, failed, refunded) | ✓ | |
| `webhook_verified` | BOOLEAN | ✓ | Mollie-handshake |
| `notes` | TEXT | ✗ | |
| `created_at` | TIMESTAMP | ✓ | |

---

## 11. Entiteit: Medewerker (Employee)

**Primaire use-case:** Personeelslid; routes toewijzen  
**Relaties:** 1 Company, N Routes, N Availability  
**Tabel:** `employees`

### Attributen

| Attribuut | Type | Verplicht | Opmerkingen |
|---|---|---|---|
| `id` | UUID | ✓ | PK |
| `company_id` | UUID | ✓ | FK (RLS) |
| `user_id` | UUID | ✗ | FK → users (if app-user) |
| `first_name` | VARCHAR(100) | ✓ | |
| `last_name` | VARCHAR(100) | ✓ | |
| `phone` | VARCHAR(20) | ✓ | Contact |
| `is_active` | BOOLEAN | ✓ | default TRUE |
| `created_at` | TIMESTAMP | ✓ | |
| `archived_at` | TIMESTAMP | ✗ | |

---

## 12. Entiteit: Beschikbaarheid (Availability)

**Primaire use-case:** Dag-status (beschikbaar/ziek/verlof)  
**Relaties:** 1 Employee  
**Tabel:** `availability`

### Attributen

| Attribuut | Type | Verplicht | Opmerkingen |
|---|---|---|---|
| `id` | UUID | ✓ | PK |
| `company_id` | UUID | ✓ | FK |
| `employee_id` | UUID | ✓ | FK → employees |
| `date` | DATE | ✓ | |
| `status` | ENUM(available, sick, leave) | ✓ | |
| `reason` | VARCHAR(255) | ✗ | "Griep", "Jaarlijks verlof" |
| `created_at` | TIMESTAMP | ✓ | |

### Validaties

- (`company_id`, `employee_id`, `date`) uniek

---

## Relaties met andere documenten

- **11_DatabaseConcept.md**: tabel-DDL basis deze entiteiten
- **10_BusinessRules.md**: validatie-regels per entiteit
- **08_FunctioneleEisen.md**: CRUD-requirements per entiteit

---

## Changelog

| Datum | Versie | Wijziging |
|---|---|---|
| 2026-07-06 | 1.0 | Volledig: 12 entiteiten, attributen, validaties, voorbeeldwaarden, NL-EN mapping |
