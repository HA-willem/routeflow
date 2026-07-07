# 19 — WhatsApp Integratie

**Status:** DONE
**Versie:** 2.0
**Bron van waarheid:** `00_PRD.md` § 10 (Communicatie), § 13 (AVG), A-08 — dit document mag het PRD niet tegenspreken.
**Werkinstructie:** zie `MASTER_PROMPT.md`.
**Relaties:** 21_Notificaties.md (kanaal-orkestratie), 16_Facturatie.md (factuur/herinnering-verzending), 10_BusinessRules.md (BR-600/601/602), 12_Entiteiten.md (`notifications`, `messages`), 36_Security.md (AVG-grondslag).

---

## Doel van dit document

Dit document beschrijft de **WhatsApp-integratie**: de vastgestelde BSP-keuze, de berichttypen, template-beheer, de opt-in/AVG-grondslag, de tweeweg-afhandeling, en alle fallbacks en foutscenario's.

**Fasering (PRD § 5.2):** MVP is **e-mail-first**; WhatsApp komt in **V1**. Tweeweg-WhatsApp (klant antwoordt "OVERSLAAN") is **V2** (FR-083). Dit document specificeert de volledige V1-scope plus het V2-concept, zodat de architectuur er nu al op voorbereid is.

---

## 1. BSP-keuze (beslissing A-08)

### 1.1 Vastgestelde keuze

> **360dialog** als WhatsApp Business Solution Provider voor V1, achter de provider-agnostische **messaging-adapter**. **Twilio** blijft het gedocumenteerde alternatief indien we later e-mail + SMS + WhatsApp onder één leverancier willen consolideren.

Vastgelegd in PRD § 19 (A-08). Motivatie: flat fee zonder per-bericht-markup (beste unit-economics bij schaal), EU-hosting/GDPR-first, officiële Meta-BSP, en — doorslaggevend — **directe toegang tot de Meta WhatsApp Cloud API**, wat de lock-in minimaliseert (past bij PRD § 12.2). Bij een latere migratie zijn nummer en templates via Meta portabel.

### 1.2 Afweging (referentie)

| Criterium | 360dialog (gekozen) | Twilio (alternatief) | MessageBird/Bird |
|---|---|---|---|
| Kostenmodel | Flat fee (~€49/mnd) + Meta pass-through | Meta-fee + opslag/bericht | Meta-fee + markup |
| EU/AVG | EU-hosting, GDPR-first | EU-opties, US-bedrijf | NL/Amsterdam HQ |
| API | Directe Meta Cloud API | Twilio-abstractie (ook SMS/e-mail/voice) | Eigen abstractie |
| Lock-in | Laag (native Cloud API) | Middel | Middel |
| Aandachtspunt | WhatsApp-only (geen SMS/voice) | Duurder per bericht | Recente rebrand-churn |

### 1.3 Consequentie van "directe Cloud API"

Omdat 360dialog het WhatsApp-nummer provisioneert maar we tegen Meta's **Cloud API** praten, is onze `MessagingProvider`-implementatie feitelijk een Cloud-API-client met 360dialog-credentials. Een swap naar Twilio betekent een andere adapter-implementatie, niet een ander domeinmodel.

---

## 2. Messaging-adapter (contract)

WhatsApp loopt via dezelfde abstractie als e-mail (21_Notificaties.md), zodat kanaalkeuze en fallback centraal geregeld zijn.

```typescript
interface MessagingProvider {
  channel: 'whatsapp' | 'email';

  sendTemplate(input: {
    to: string;                 // E.164, bv. "+31612345678"
    templateName: string;       // goedgekeurde Meta-template
    languageCode: 'nl';
    variables: Record<string, string>;  // {{1}}, {{2}}, ...
    mediaUrl?: string;          // bv. factuur-PDF (document-header)
  }): Promise<SendResult>;

  // Alleen binnen 24u-servicevenster (§ 5) toegestaan voor vrije tekst
  sendFreeText(input: { to: string; body: string }): Promise<SendResult>;
}

interface SendResult {
  status: 'queued' | 'sent' | 'failed';
  providerMessageId?: string;
  errorCode?: string;          // gemapt op interne foutklasse (§ 8)
}
```

Elke verzending wordt gelogd in `messages` (12_Entiteiten.md) met provider-id, status en tijdstip — vereist voor de audit-trail (BR-600) en statusopvolging.

---

## 3. Berichttypen (klant)

Alle klant-berichten zijn **template-gebaseerd** (Meta-vereiste voor bedrijf-geïnitieerd contact buiten het 24u-venster). Variabelen conform FR-081.

| # | Bericht | Trigger | Template-categorie (Meta) | Fase |
|---|---|---|---|---|
| WA-1 | Aankondiging "morgen komen wij langs" | Cron T-1 dag, 18:00 (FR-080) | Utility | V1 |
| WA-2 | "Wij zijn onderweg" (optioneel) | Medewerker start route (FR-040) | Utility | V1 |
| WA-3 | Niet-thuis-melding | Beurt → `niet_thuis` (FR-043) | Utility | V1 |
| WA-4 | Factuur + betaallink | Factuur gefinaliseerd (FR-064) | Utility | V1 |
| WA-5 | Betaalherinnering | Herinneringsschema (FR-065) | Utility | V1 |
| WA-6 | Betaalbevestiging | Mollie-webhook `paid` (FR-067) | Utility | V1 |
| WA-7 | Tweeweg: "OVERSLAAN"-afhandeling | Klant-antwoord (FR-083) | Utility + service-reply | V2 |

**Voorbeeld WA-1 (nl):**
> Hallo {{1}}, morgen ({{2}}) komen wij langs voor {{3}}, verwacht tussen {{4}}. Niet gelegen? Antwoord op dit bericht. — {{5}}

Variabelen: {{1}} voornaam, {{2}} datum, {{3}} dienst, {{4}} tijdvak, {{5}} bedrijfsnaam.

---

## 4. Template-beheer & goedkeuring

### 4.1 Levenscyclus

1. Bedrijf stelt template-tekst samen in RouteFlow (FR-081) met variabele-placeholders.
2. RouteFlow dient de template via 360dialog in bij Meta ter **goedkeuring** (`PENDING`).
3. Meta keurt goed (`APPROVED`) of af (`REJECTED`, met reden).
4. Alleen `APPROVED`-templates zijn selecteerbaar voor verzending.

### 4.2 Statussen in RouteFlow

| Status | Betekenis | UI |
|---|---|---|
| `draft` | Nog niet ingediend | Bewerkbaar |
| `pending` | In review bij Meta | Alleen-lezen, badge "In beoordeling" |
| `approved` | Bruikbaar | Groen, selecteerbaar |
| `rejected` | Afgewezen | Rood + reden + "Aanpassen & opnieuw indienen" |
| `paused` | Door Meta gepauzeerd (kwaliteit) | Waarschuwing; fallback e-mail actief |

### 4.3 Standaard-templates (meegeleverd)

RouteFlow levert vooraf-opgestelde NL-templates voor WA-1 t/m WA-6 die het bedrijf kan overnemen of aanpassen. Dit versnelt onboarding (nul-training, PRD § 3.2).

---

## 5. Meta-conversatiemodel & servicevenster

- **Bedrijf-geïnitieerd** (onze cron/trigger-berichten): vereist een **goedgekeurde template**. Opent een *utility*-conversatie.
- **Klant-geïnitieerd**: als de klant ántwoordt, opent een **24-uurs servicevenster** waarin RouteFlow met vrije tekst (`sendFreeText`) mag reageren zonder template.
- Na 24u zonder klantinteractie: alleen weer template-berichten.

Dit model bepaalt de tweeweg-flow (§ 6) en de kosten (elke utility-conversatie kent een Meta-tarief; flat-fee-BSP 360dialog rekent dat pass-through door).

---

## 6. Tweeweg-WhatsApp (FR-083, V2)

### 6.1 Flow "OVERSLAAN"

1. WA-1 nodigt uit: *"Niet gelegen? Antwoord OVERSLAAN."*
2. Klant antwoordt → 360dialog/Meta stuurt **inbound webhook** naar RouteFlow.
3. RouteFlow parseert de intent (case-insensitief, trefwoord `OVERSLAAN`/`SKIP`).
4. Match → Beurt → `overgeslagen` (BR-803); beurt naar herplan-wachtrij; planner-notificatie.
5. Binnen het 24u-venster: bevestiging via `sendFreeText`: *"Oké! We plannen je volgende keer opnieuw in."*
6. Geen match (vrije tekst) → doorgezet naar planner-inbox als klantbericht; geen automatische actie.

### 6.2 Inbound webhook

Endpoint `POST /webhooks/whatsapp` (13_API_Specificatie.md): signature-verificatie (Meta/360dialog), idempotentie op `providerMessageId`, alle inbound berichten gelogd in `messages`.

---

## 7. Opt-in, opt-out & AVG

- **BR-600 (hard):** WhatsApp-verzending alléén als klant `whatsapp_opt_in = true`. Opt-in-moment + kanaal gelogd (bewijs).
- **BR-601 (hard):** `whatsapp_opt_out = true` → geen WhatsApp meer; kanaal valt terug op e-mail indien beschikbaar.
- **Grondslag (AVG):** uitvoering van de overeenkomst / gerechtvaardigd belang voor operationele berichten; expliciete toestemming voor het WhatsApp-kanaal zelf. Verwerkersovereenkomst met 360dialog; EU-dataverwerking (PRD § 13, 36_Security.md).
- **Bewaartermijn:** berichtlogs conform retentiebeleid (36_Security.md); inhoud niet langer dan nodig.
- **Afmelden:** elke conversatie respecteert een stop-intentie ("STOP"/"AFMELDEN") → zet `whatsapp_opt_out`.

---

## 8. Foutafhandeling & fallbacks

| # | Scenario | Detectie | Gedrag | Melding |
|---|---|---|---|---|
| WA-E1 | Nummer heeft geen WhatsApp (E-07) | Send → error `not_on_whatsapp` | **Auto-fallback naar e-mail**; klant `whatsapp_capable=false` gezet | Log; planner ziet kanaalvlag bijgewerkt |
| WA-E2 | Template afgewezen/gepauzeerd (E-07) | Template-status ≠ `approved` | Verzending via dit kanaal geblokkeerd; fallback e-mail | *"WhatsApp-template niet beschikbaar — verzonden per e-mail."* |
| WA-E3 | Klant geen opt-in (BR-600) | Vóór verzending | WhatsApp overgeslagen; e-mail indien opt-in, anders niets | Planner: *"Klant heeft geen WhatsApp-toestemming."* |
| WA-E4 | 360dialog/Meta API-outage | HTTP-fout/timeout | Retry met backoff (3×); daarna queue + fallback e-mail | Interne notificatie bij structurele uitval |
| WA-E5 | Rate-limit (Meta messaging tier) | HTTP 429 / tier-limiet | Throttle + spreiding; niet-urgente berichten uitgesteld | Log; geen klantimpact |
| WA-E6 | Media (PDF) te groot / verlopen link | Send-error op media | Verstuur zonder bijlage + betaal-/downloadlink als tekst | — |
| WA-E7 | Ongeldig/onbekend template-variabele (BR-602) | Rendering | Ontbrekende var = lege string; waarschuwing bij opslaan template | Soft-warning in editor |
| WA-E8 | Inbound van onbekend nummer | Webhook | Gelogd; als geen klantmatch → planner-inbox "onbekende afzender" | — |

**Fallback-principe:** e-mail is altijd het vangnet (PRD § 10). Elke mislukte WhatsApp-verzending die functioneel noodzakelijk is (factuur, herinnering) valt automatisch terug op e-mail; puur optionele berichten (WA-2 "onderweg") worden simpelweg overgeslagen.

---

## 9. Kostenbeheersing

- **Utility-conversaties** worden per 24u gebundeld: meerdere berichten aan dezelfde klant binnen één venster tellen als één conversatie (Meta-model).
- Optionele berichten (WA-2) staan **default uit** per bedrijf.
- Flat-fee-BSP (360dialog) → voorspelbare vaste kosten; Meta-conversatietarief pass-through. Bij schaal doorbelastbaar in duurdere abonnement-tier (PRD § 18).

---

## 10. Openstaande punten

Geen open beslissingen. A-08 vastgesteld (360dialog, Twilio als alternatief). De WhatsApp Business-account-verificatie (Meta Business Manager, groen vinkje) is een **operationele onboarding-stap** per bedrijf, geen productbeslissing; beschreven als taak in 33_Roadmap.md (V1-fase).

---

## Changelog

| Datum | Versie | Wijziging |
|---|---|---|
| 2026-07-06 | 1.0 | Placeholder (provider "in backlog") |
| 2026-07-07 | 2.0 | Volledige uitwerking; A-08 verwerkt (360dialog + Twilio-alternatief), messaging-adapter, 7 berichttypen, template-levenscyclus, Meta 24u-servicevenster, tweeweg-flow (V2), opt-in/AVG-grondslag, 8 foutscenario's met e-mail-fallback, kostenbeheersing. Placeholder-conflict opgelost. |
