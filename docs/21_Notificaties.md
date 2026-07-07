# 21 — Notificaties & Alerts

**Status:** DONE
**Versie:** 2.0
**Bron van waarheid:** `00_PRD.md` § 10 (Communicatie), § 7.5 (FR-080…083) — dit document mag het PRD niet tegenspreken.
**Werkinstructie:** zie `MASTER_PROMPT.md`.
**Relaties:** 19_WhatsApp.md (WhatsApp-kanaal), 16_Facturatie.md (factuur/herinnering), 20_PWA.md (web-push), 12_Entiteiten.md (`notifications`), 10_BusinessRules.md (BR-600/601).

---

## Doel van dit document

Dit document beschrijft het **notificatiesysteem**: welke gebeurtenissen leiden tot welke berichten, via welk kanaal, naar wie, wanneer, en hoe de kanaalkeuze en fallbacks werken. Het onderscheidt **externe** notificaties (naar de eindklant) en **interne** notificaties (naar planner/eigenaar).

Kanaalstrategie (PRD § 10): **e-mail altijd beschikbaar**; **WhatsApp** in V1 (19); **in-app inbox** + optioneel **web-push** voor interne meldingen.

---

## 1. Notificatiemodel

Elke notificatie (`notifications`, 12_Entiteiten.md) heeft: ontvanger (klant/medewerker), type, kanaal, template, referentie (beurt/factuur), status (`pending/sent/failed/delivered/read`) en tijdstippen. Alles wordt gelogd (audit-trail, klant-tijdlijn FR-007).

**Kanaalkeuze-logica (per ontvanger):**
```
kies kanaal:
  als type = intern → in-app (+ optioneel web-push)
  als type = extern:
     voorkeur = klant.billing/communicatie-voorkeur
     als voorkeur = whatsapp EN opt-in EN template approved → WhatsApp
        anders → e-mail (indien opt-in)
        anders → geen kanaal → planner-signaal
```
Fallback WhatsApp→e-mail is centraal geregeld (19 § 8, WA-E1/E2).

---

## 2. Externe notificaties (naar klant)

| # | Type | Trigger | Kanaal | Moment | FR |
|---|---|---|---|---|---|
| EXT-1 | Aankondiging "morgen komen wij langs" | Cron T-1 | E-mail (MVP) / WhatsApp (V1) | 18:00 daags ervoor | FR-080 |
| EXT-2 | "Wij zijn onderweg" (optioneel, default uit) | Medewerker start route | E-mail/WhatsApp | Bij start | FR-040/19 |
| EXT-3 | Niet-thuis-melding | Beurt → `niet_thuis` | E-mail/WhatsApp | Direct | FR-043 |
| EXT-4 | Factuur + betaallink | Factuur gefinaliseerd | E-mail (MVP)/WhatsApp (V1) | Bij finaliseren | FR-064 |
| EXT-5 | Betaalherinnering | Herinneringsschema | E-mail/WhatsApp | +7/+14/+21 dgn | FR-065 |
| EXT-6 | Betaalbevestiging | Mollie-webhook `paid` | E-mail/WhatsApp | Direct | FR-067 |

Alle externe berichten: template-gebaseerd met variabelen (FR-081), respecteren opt-in/opt-out (BR-600/601), per klant/dienst uitschakelbaar (FR-080).

---

## 3. Interne notificaties (naar planner/eigenaar)

| # | Type | Trigger | Kanaal | FR |
|---|---|---|---|---|
| INT-1 | Herplan-voorstel klaar | Ziekte/verlof/weer/niet-thuis | In-app (+ push) | FR-024/082 |
| INT-2 | Weerwaarschuwing | Slechtweer-forecast weersgevoelige diensten | In-app + dashboard-banner | FR-023 |
| INT-3 | Capaciteitswaarschuwing | Overboeking dag/medewerker | In-app + dashboard | FR-027 |
| INT-4 | Mislukte betaling | Mollie `failed`/expired | In-app | FR-082 |
| INT-5 | Mislukte verzending | E-mail/WhatsApp bounce/fail | In-app | FR-082 |
| INT-6 | Niet-thuis-melding | Medewerker markeert niet-thuis | In-app | FR-043 |

### 3.1 In-app inbox
- Belletje (🔔) in de bovenbalk met ongelezen-teller.
- Lijst met per item: type-icoon, korte tekst, tijd, **actieknop** (deep link: "Herplan bekijken", "Betaling oplossen").
- Read/unread-status; archiveren; filter op type.

### 3.2 Web-push (optioneel)
- Voor urgente interne meldingen (herplan klaar, mislukte betaling) — PWA web-push (20 § 4), na expliciete toestemming.

---

## 4. Timing & bundeling

- **Cron-jobs** (server-side, pg_cron/Edge Functions): EXT-1 (18:00), EXT-5 (dagelijkse check herinneringen).
- **Event-driven**: EXT-3/4/6, alle interne meldingen.
- **Bundeling**: meerdere gebeurtenissen voor dezelfde klant binnen een venster worden waar mogelijk gecombineerd (kostenbeheersing WhatsApp, 19 § 9; e-mail-hygiëne).
- **Stille uren**: geen niet-urgente klantberichten buiten redelijke tijden (bijv. niet 's nachts); EXT-1 om 18:00 is bewust gekozen.

---

## 5. Voorkeuren & AVG

- Per **klant**: kanaalvoorkeur, opt-in WhatsApp, opt-out per kanaal, uitschakelen aankondigingen (FR-080).
- Per **bedrijf**: standaardschema herinneringen, aan/uit optionele berichten (EXT-2), templates (FR-081).
- Per **medewerker/planner**: web-push aan/uit, welke interne types.
- Opt-in/opt-out gelogd (BR-600, NFR-406); AVG-grondslag in 36_Security.md.

---

## 6. Foutafhandeling

| Situatie | Gedrag |
|---|---|
| WhatsApp faalt/geen opt-in | Fallback e-mail (19 § 8); indien ook onmogelijk → INT-5 naar planner |
| E-mail bounce | Markeer kanaal; INT-5 met "controleer e-mailadres klant" |
| Push-toestemming ontbreekt | Val terug op in-app inbox (altijd beschikbaar) |
| Cron-job mislukt | Monitoring-alert (NFR-703); retry; geen stille mislukking |
| Template niet approved (WhatsApp) | Fallback e-mail; planner ziet melding (19 WA-E2) |

**Principe:** een functioneel noodzakelijke notificatie (factuur, herinnering) faalt nooit stil — er is altijd een fallback of een interne melding.

---

## 7. Lege staten

- Inbox leeg: "Geen nieuwe meldingen. We laten het je weten zodra er iets speelt."
- Nog nooit een klantbericht verzonden: klant-tijdlijn toont "Nog geen communicatie."

---

## Changelog

| Datum | Versie | Wijziging |
|---|---|---|
| 2026-07-06 | 1.0 | Placeholder-tabel met 4 typen |
| 2026-07-07 | 2.0 | Volledige uitwerking: notificatiemodel + kanaalkeuze-logica, 6 externe + 6 interne typen, in-app inbox & web-push, timing/bundeling/stille uren, voorkeuren/AVG, foutafhandeling met fallbacks, lege staten |
