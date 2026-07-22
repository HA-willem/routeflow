# 16 — Facturatie

**Status:** DONE
**Versie:** 1.0
**Bron van waarheid:** `00_PRD.md` § 9 (Facturatie & Betalingen) — dit document mag het PRD niet tegenspreken.
**Werkinstructie:** zie `MASTER_PROMPT.md`.

---

## Doel van dit document

Dit document beschrijft het **complete facturatieproces**: hoe genereren, verzenden, herinneringen, betalingen, en correcties?

---

## 1. Factuurflow End-to-End

```
Beurt completed → Conceptfactuur (status draft) 
  → [24h] Auto-finalisering optioneel
  → Planner klikt "Finaliseer" → Factuurnummer toekennen → PDF genereren
  → Verzending (e-mail/WhatsApp per klant-voorkeur)
  → Betaallink actief (Mollie iDEAL)
  → [Klant betaalt] → Mollie webhook → Status betaald
  → [Geen betaling] → +7/+14/+21 dagen herinneringen
  → [Overdue] → Escalatie (optioneel incasso-aanmaning V2)
```

---

## 2. Factuurtypen

| Type | Trigger | Voorbeeld |
|---|---|---|
| **Per beurt** | Elke beurt apart factuur | 5 beurten = 5 facturen |
| **Verzamelfactuur** | Wekelijks/maandelijks | Week: 10 beurten op 1 factuur |
| **Abonnement** | Vast bedrag/mnd ongeacht beurten | €150/mnd (incl. 4 beurten) |
| **Credit** | Correctie op gefinaliseerde factuur | Terugboeking €50 voor dubbele betaling |

**Instellingen:** Per klant configureerbaar (klant-detail tab "Facturatie").

---

## 3. Nummering (BR-020)

**Format:** `{BedrijfCode}-{Jaar}-{Seq}`
**Voorbeeld:** `ABC-2026-00001`, `ABC-2026-00002`

**Gaploze reeks:** afgedwongen via een concurrency-veilige, rij-vergrendelde teller per bedrijf/jaar (`invoice_number_counters`) — niet via een simpele `MAX+1`-query, die onder gelijktijdige finalisering een race condition zou geven. Volledige implementatie: BR-020 (10_BusinessRules.md § 5).

**Immutabiliteit (BR-020):** Eenmaal nummerd = NOOIT wijzigen. Correcties via creditfactuur.

---

## 4. BTW-Logica (FR-061)

**Tarieven (per dienst instelbaar):**
- 21% (standaard; meeste diensten)
- 9% (schoonmaking, mogelijk)
- 0% (uitzonderingen)
- "Verlegd" (EU B2B)

**Disclaimer:** UI waarschuwing bij 9%/0%: "Controleer zelf of je recht hebt op dit tarief."

**Berekening:**
```
bedrag_excl = (unit_price × qty)
bedrag_incl = bedrag_excl × (1 + vat_rate / 100)
vat_bedrag = bedrag_incl - bedrag_excl
```

---

## 5. PDF-Template

**Verplichte velden (Belastingdienst):**
- Factuurnummer, datum
- Bedrijf KVK, BTW-nr
- Klant naam
- Tabel: dienst | duur | bedrag | BTW | totaal
- Betaaltermijn, IBAN, BIC

**Huisstijl (bedrijf-instellingen):**
- Logo (PNG/SVG), upload in settings
- Primaire kleur (HEX)
- Footer-text (optioneel)

**QR + Betaallink (V1):**
- QR-code: Mollie payment-link via `https://servops.nl/pay/{payment_id}`
- Tekst: "Betaal via iDEAL met QR of link"

---

## 6. Verzending (FR-064)

**Kanaal per klant:** E-mail | WhatsApp | Post (configured in customer settings)

**E-mail (MVP):**
- Subject: "Factuur #ABC-2026-00001 van ServOps"
- Body: "Factuur bijgesloten. Betaal vóór [due_date]. [betaallink]"
- Attachment: PDF

**WhatsApp (V1):**
- Template-bericht (goedgekeurd via Business API)
- Variabelen: {{voornaam}}, {{bedrag}}, {{betaallink}}

**Logging:** `notifications` tabel; status = sent | failed | delivered

---

## 7. Herinneringsschema (FR-065)

**Default:** +7, +14, +21 dagen na invoice_date

**Instelbaar:** Bedrijf-settings (Reminder days: [7, 14, 21])

**Job:** Dagelijks cron; check `invoices.payment_status='open'` AND `now >= due_date + reminder_day[i]` → bericht.

**Escalatie:** Na laatste reminder → status `overdue`; V2 optie: incasso-procedure.

---

## 8. Mollie-integratie (FR-063, FR-067)

### 8.1 Payment Intent creatie

Bij finalisering:
```
POST https://api.mollie.com/v2/payments
{
  "amount": {
    "value": "150.00",
    "currency": "EUR"
  },
  "description": "Factuur ABC-2026-00001",
  "redirectUrl": "https://servops.nl/invoice/{invoice_id}",
  "webhookUrl": "https://servops.nl/webhooks/mollie"
}
```

**Response:** payment_id (opgeslagen in `invoices.payment_id`)

### 8.2 Webhook-handler

Mollie POST → signature-verify → status update:
```
IF status='paid' → invoices.payment_status = 'paid'
   → payment-record created
   → planner notification
```

---

## 9. Correcties & Creditfactuur (FR-068)

**Flow:**
1. Gefinaliseerde factuur (status `sent`/`paid`): knop "Correctie"
2. Dialog: planner selecteert bestaande factuurregel(en) om volledig te crediteren en/of vult een vrije correctieregel (omschrijving + bedrag excl. BTW + BTW-tarief) in
3. Creditfactuur gegenereerd: bedrag negatief, gekoppeld via `parent_invoice_id`
4. Factuur-detail toon: "Correctie via creditfactuur #X op [datum]" + saldo ("Origineel €100 | Credit -€50 | Saldo €50")

**Immutabiliteit:** Origineel-factuur ongewijzigd; correctie = aparte record.

**Implementatie (Sprint 9):** `create_credit_invoice()` (`035_invoice_credit_notes.sql`, `SECURITY DEFINER`, Admin/Administratie) maakt de nieuwe factuur aan als `draft` — versturen (nummeren/PDF/e-mail) hergebruikt de bestaande `sendInvoice()`-actie, geen nieuwe verzendlogica. Een creditfactuur (`parent_invoice_id` gezet) kan zelf niet nogmaals gecrediteerd worden (geen keten). `components/domain/CreditInvoiceDialog.tsx` + nieuwe factuur-detailpagina (`app/(app)/facturen/[id]/page.tsx` — bestond nog niet, alleen een lijst).

---

## 9.1 Abonnementsfacturatie — implementatie (FR-066/BR-304)

Aanvullend op § 2's typenoverzicht: de generatie zelf is een maandelijkse `pg_cron`-taak (`034_subscription_billing.sql`), geen Edge Function — er is geen externe aanroep nodig (in tegenstelling tot bv. de Agent Orchestrator), dus een `SECURITY DEFINER`-SQL-functie volstaat, analoog aan `complete_job()`.

**`generate_subscription_invoices()`** draait elke 1e van de maand (02:00 UTC): per actieve dienstafspraak met prijstype Abonnement en maandelijkse facturatieperiode, telt voltooide beurten in de zojuist afgesloten kalendermaand, maakt één conceptfactuur (basisregel + evt. overage-regel bij meer beurten dan inbegrepen, BR-304) en registreert de periode in `subscription_invoice_periods` (voorkomt dubbele facturatie bij een herstart van de cron).

**Vereenvoudiging (PRD § 19 A-29):** de cron factureert altijd "achteraf" (voor de zojuist afgesloten maand), ongeacht de `billing_timing`-instelling (vooraf/achteraf) — een vóóraf-gefactureerde stroom kan geen overage van een nog niet uitgevoerde periode kennen. `billing_timing` blijft opgeslagen voor toekomstig gebruik.

`complete_job()` maakt voor een subscription-beurt bewust **geen** eigen conceptfactuur meer aan (was tot Sprint 9 een Sprint 5-fallback op de dienst-standaardprijs) — anders zou dezelfde beurt zowel per-beurt als via de maandelijkse cron gefactureerd worden.

---

## 10. Edge Cases & Foutmeldingen

| Case | Handeling |
|---|---|
| Klant zonder e-mail/WhatsApp | Warning "Klant kan geen meldingen ontvangen"; factuur in dashboard beschikbaar |
| Mollie-API down | Webhook-retry; notif in inbox "Betaal-verwerking vertraagd" |
| Dubbele betaling | Detectie: overschot > 0. Optie terugbetalen of verrekenen |
| Factuur-nummering gap | DB-constraint weigert; ALWARN: "Nummering onderbroken; admin contact" |

---

## Relaties met andere documenten

- **10_BusinessRules.md**: BR-020 t/m BR-403 (facturatie/betalings-regels)
- **12_Entiteiten.md**: `invoices`, `invoice_lines`, `payments`
- **19_WhatsApp.md**: WhatsApp-template-handling

---

## Changelog

| Datum | Versie | Wijziging |
|---|---|---|
| 2026-07-06 | 1.0 | Volledig: factuurflow, typen, nummering, BTW, PDF, verzending, herinneringen, Mollie, correcties |
| 2026-07-20 | 1.1 | Sprint 9 afgerond: § 9 (creditfactuur) aangevuld met de daadwerkelijke implementatie (`create_credit_invoice()`, regel-selectie i.p.v. vrij bedrag, hergebruik van `sendInvoice()`); nieuwe § 9.1 (abonnementsfacturatie-implementatie, `generate_subscription_invoices()`-cron, geen Edge Function, "altijd achteraf"-vereenvoudiging — PRD § 19 A-29). |
| 2026-07-08 | 1.1 | Production Readiness Review-fix: § 3 (nummering) verwijst nu naar de concurrency-veilige tellerimplementatie (BR-020) i.p.v. de onjuiste/onvolledige bewering "DB-constraint afdwingend" |
