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

**Gaploze reeks:** DB-constraint afdwingend.

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
- QR-code: Mollie payment-link via `https://routeflow.nl/pay/{payment_id}`
- Tekst: "Betaal via iDEAL met QR of link"

---

## 6. Verzending (FR-064)

**Kanaal per klant:** E-mail | WhatsApp | Post (configured in customer settings)

**E-mail (MVP):**
- Subject: "Factuur #ABC-2026-00001 van RouteFlow"
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
  "redirectUrl": "https://routeflow.nl/invoice/{invoice_id}",
  "webhookUrl": "https://routeflow.nl/webhooks/mollie"
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
1. Gefinaliseerde factuur: knop "Correctie"
2. Dialog: "Bedrag €50"? Creditfactuur aanmaken?"
3. Creditfactuur gegenereerd: bedrag negatief, gekoppeld via `parent_invoice_id`
4. Factuur-detail toon: "Betaald €100 | Credit -€50 | Saldo €50"

**Immutabiliteit:** Origineel-factuur ongewijzigd; correctie = aparte record.

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
