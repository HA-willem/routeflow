# 36 — Security & Privacy

**Status:** DONE
**Versie:** 2.2
**Bron van waarheid:** `00_PRD.md` § 12.2, § 13 (Security/Privacy), § 10 (AVG WhatsApp) — dit document mag het PRD niet tegenspreken.
**Werkinstructie:** zie `MASTER_PROMPT.md`.
**Relaties:** 22_Authenticatie.md, 23_Gebruikersrollen.md, 11_DatabaseConcept.md (RLS), 09_NietFunctioneleEisen.md (NFR-3xx/4xx), 35_Deployment.md.

---

## Doel van dit document

Dit document beschrijft het **security- en privacybeleid**: multi-tenant isolatie, authenticatie/autorisatie, transport/opslag, secrets, AVG-verplichtingen, verwerkers en incidentrespons. Doelniveau: OWASP **ASVS L2** (NFR-302). Security is **defense-in-depth**: database (RLS) dwingt af, API weigert, UI verbergt.

---

## 1. Multi-tenant isolatie (fundament)

- Elke tabel heeft `company_id`; **RLS-policies** filteren op `company_id = current_company_id()` (11 § 1). Dit is de primaire verdediging — geen tenant-filtering in applicatiecode als enige laag (PRD § 12.2).
- `current_company_id()` leest de tenant uit de JWT-claim (22 § 6).
- **Verificatie:** per tabel negatieve tests dat bedrijf A geen data van B kan benaderen (NFR-301, 31 § 4).
- Realtime-abonnementen respecteren RLS (geen lek via WebSocket).

---

## 2. Authenticatie

- Supabase Auth (e-mail/wachtwoord, magic link; OAuth optioneel) — detail 22.
- Wachtwoordbeleid (min. 8, complexiteit), reset-link 24u geldig.
- **2FA (TOTP)** optioneel (V1); aanbevolen voor Eigenaar/Admin.
- Sessies: kortlevende access-tokens (1u) + refresh; tokens in secure, httpOnly cookies.
- Brute-force-bescherming: rate-limit + tijdelijke lockout na herhaalde mislukte pogingen.

---

## 3. Autorisatie

- Rolgebaseerd (23): permissies per resource × actie, afgedwongen op DB (RLS/grants), API (Edge-Function-guards) en UI.
- **Financiële scheiding (23 P1):** prijs-/factuurvelden server-side uitgesloten voor Medewerker/Planner — niet slechts client-side verborgen.
- Least privilege: nieuwe features default geen toegang tot ze expliciet is toegekend.

---

## 4. Transport & opslag

| Aspect | Maatregel |
|---|---|
| Transport | TLS 1.2+ overal, HSTS (NFR-303) |
| Opslag | Encryptie at-rest (Supabase/Postgres, Storage) |
| Wachtwoorden | Gehasht door Supabase Auth (bcrypt/scrypt) |
| Foto's/PDF's | Storage met toegangscontrole per tenant; getekende URL's met vervaltijd |
| Backups | Versleuteld, EU (NFR-802) |

---

## 5. Secrets & sleutels

- Secrets in Vercel/Supabase vault; nooit in repo (NFR-304); `.env*` in `.gitignore`.
- Secret-scan in CI (35 § 3). Provider-keys per omgeving gescheiden; rotatiebeleid.
- Webhook-secrets (Mollie, 360dialog/Meta) voor signature-verificatie (NFR-307).

---

## 6. Applicatiebeveiliging (ASVS L2-richtlijn)

- Input-validatie server-side (niet alleen client); parameterized queries (geen SQL-injectie — PostgREST/SDK).
- XSS: React-escaping + geen `dangerouslySetInnerHTML` met ongevalideerde input; CSP-headers.
- CSRF: SameSite-cookies + tokenpatroon waar van toepassing.
- Dependency-scan + updates in CI (NFR-302).
- Rate limiting op zware/gevoelige endpoints (13 § 7).
- Geen PII in logs; gestructureerde logging met correlatie-id (NFR-701).

---

## 7. AVG / privacy

### 7.1 Grondslagen
- **Uitvoering overeenkomst / gerechtvaardigd belang** voor operationele verwerking (klantbeheer, planning, facturatie).
- **Toestemming** voor het WhatsApp-kanaal (opt-in per klant, BR-600, 19 § 7).

### 7.2 Rechten van betrokkenen
| Recht | Implementatie |
|---|---|
| Inzage/export | Machineleesbare export per bedrijf/klant (NFR-403) |
| Verwijdering | Anonimiseren/archiveren i.p.v. hard delete waar facturen bestaan (BR-040, NFR-404) |
| Rectificatie | Bewerkbare klant-/objectgegevens |
| Bezwaar/opt-out | Per kanaal (BR-601), gelogd (NFR-406) |

### 7.3 Datalocatie & retentie
- Alle data EU (NFR-401). Retentiebeleid per datatype; berichtlogs niet langer dan nodig (NFR-405).
- Backups met gedefinieerde bewaartermijn (PITR ≤ 30 dgn).

---

## 8. Verwerkers (subverwerkers) & DPA's

| Verwerker | Doel | DPA / locatie |
|---|---|---|
| Supabase | DB/Auth/Storage | DPA, EU |
| Vercel | Hosting/CDN | DPA, EU-first |
| Mollie | Betalingen | DPA, NL/EU |
| Mapbox | Geocoding/routing | DPA; adresdata gecachet conform voorwaarden (14 § 9) |
| 360dialog | WhatsApp BSP | DPA, EU-hosting |
| E-mailprovider (Resend o.g.) | Transactionele e-mail | DPA, EU |
| Weer-API | Forecast | Geen PII |
| Anthropic (Claude API) | Command Bar intent-routing (ADR-014) — vrije tekst uit de Command Bar + de vaste commandolijst, geen klant-/bedrijfsdata nodig in de prompt | DPA nog te regelen vóór productiegebruik |

Register bijgehouden (NFR-402); nieuwe verwerker → DPA vóór ingebruikname.

**EU AI Act:** de AI Act-classificatie van alle RouteFlow-onderdelen (incl. de Anthropic-keten en de Annex III 4(b)-grenzen rond taakallocatie/werknemersdata) is vastgelegd in `47_AIAct_Compliance.md` — het compliance-zusterdocument van dit securitydocument. BR-706/707 zijn de bijbehorende harde regels.

---

## 9. Incidentrespons

- **Detectie:** Sentry-alerts, log-anomalieën, uptime-monitor (35 § 6).
- **Procedure:** runbook met rollen, communicatielijn, RTO < 4u (NFR-205).
- **Datalek:** beoordelings- en meldprocedure conform AVG (melding AP binnen 72u indien vereist); betrokkenen informeren waar nodig.
- **Post-mortem:** blameless, met actiepunten (kan BL-items genereren).

---

## 10. Security-testing

- RLS-/autorisatie-negatieve tests (31 § 4).
- Dependency-/secret-scan in CI.
- Periodieke ASVS L2-checklistreview; pentest overwegen vóór/na V1-launch.
- Webhook-signature- en idempotentietests (NFR-307).

---

## 11. Openstaande punten

Geen open beslissingen. Een externe pentest en formele ISO/SOC-certificering zijn groeistappen (V1+/V2), genoteerd in 34_Backlog.md-sfeer; niet vereist voor MVP maar aanbevolen richting commerciële V1.

---

## Changelog

| Datum | Versie | Wijziging |
|---|---|---|
| 2026-07-06 | 1.0 | Placeholder met 5 maatregelen |
| 2026-07-07 | 2.0 | Volledige uitwerking: tenant-isolatie, auth/autorisatie, transport/opslag, secrets, ASVS L2-appbeveiliging, AVG-grondslagen/rechten/retentie, verwerkersregister met DPA's, incidentrespons, security-testing |
| 2026-07-16 | 2.1 | § 8 (Verwerkers) aangevuld met Anthropic (Claude API) — nieuwe verwerker voor Command Bar intent-routing (ADR-014). DPA nog te regelen vóór productiegebruik. |
| 2026-07-17 | 2.2 | § 8: verwijzing naar `47_AIAct_Compliance.md` (nieuw) — de volledige EU AI Act-classificatie en de BR-706/707-grenzen rond taakallocatie/werknemersdata. |
