# Seed Report — Demo-omgeving Glashelder Nijmegen B.V. (2026-07-12)

**Doel:** een realistische, uitsluitend-lokale testomgeving voor huidige én toekomstige functionaliteit (planning, routes, PWA, facturatie; AI/weer/WhatsApp waar de architectuur dat al toelaat).
**Script:** `scripts/seed-demo.ts` — `npx dotenv -e .env.local -- npx tsx scripts/seed-demo.ts`.

---

## 1. Wat is gezaaid

| Onderdeel | Aantal | Toelichting |
|---|---|---|
| Bedrijf | 1 | "Glashelder Nijmegen B.V.", eigenaar `demo@servops.nl` / `DemoWachtwoord123` |
| Klanten | 50 | Verdeeld over 7 wijken exact volgens opdracht (Noord/Oost/Zuid 10, Bottendaal/Lent/Hatert/Dukenburg 5), mix particulier/zakelijk, realistische NL namen/straten/postcodes/telefoon/e-mail |
| Objecten | 101 | 1–3 per klant, type woning/complex/kantoor, opmerkingenveld gevuld |
| Diensten | 5 | Glasbewassing buiten/binnen, Gevelreiniging, Dakgootreiniging, Zonnepanelen reinigen — met duur, prijs, BTW, weersgevoeligheid |
| Dienstafspraken | 101 | Frequenties 4-/6-/8-/12-wekelijks, voorkeursdag ma–vr, flexvenster ±2 dagen |
| Prijzen | — | Variatie over €18–€95, gekoppeld per dienstafspraak (per beurt) |
| Medewerkers | 6 | Jan, Pieter, Tom, Kevin, Rick, Bas — elk met een eigen, werkend login (`<voornaam>@glashelder-demo.nl` / `DemoWachtwoord123`), regio-toewijzing, één ingeplande ziekmelding (BR-802-scenario) |
| Jobs | 151 | Komende 8 weken, 21 bewust ongeroute (wachtrij), de helft van de geroute jobs zonder `sequence` (werk voor route-optimize) |
| Routes | 59 | 3–6 per werkdag, medewerkers regionaal geclusterd |
| Facturen | 50 | 20 concept, 15 verzonden, 12 betaald, 3 "achterstallig" (zie § 3) |

## 2. Idempotentie — geverifieerd

Twee keer achter elkaar gedraaid:
- 1e run: 50 klanten/101 objecten/101 afspraken **nieuw**, 151 jobs, 59 routes, 50 facturen.
- 2e run: 50/101/101 **"0 nieuw"** (hergebruikt via natuurlijke sleutel: e-mail/adres+postcode/object+dienst), jobs/routes/facturen opnieuw exact 151/59/50 (schoon herbouwd, geen dubbele rijen — geverifieerd met directe COUNT-queries per tabel).

Alle klant-/object-/dienstafspraak-/medewerker-data blijft dus stabiel over herhaalde runs; alleen de tijdgebonden horizon (jobs/routes/facturen) wordt bij elke run voor dit ene bedrijf gewist en opnieuw opgebouwd.

## 3. Bewuste afwijkingen/vereenvoudigingen

- **"Achterstallig"-facturen** bestaan niet als apart statusveld in het Sprint 5 MVP-factuurmodel (`draft`/`sent`/`paid`, PRD § 19 A-19 — geen Mollie/overdue-tracking dit sprint). Gesimuleerd als 3 facturen met `status='sent'` en een `due_date` ver in het verleden — functioneel identiek voor demo-/UI-doeleinden, geen schema-wijziging nodig.
- **Weerdata** en **WhatsApp-voorbeeldberichten** zijn **niet gezaaid**: `weather_cache` en `messages`/`notifications` hebben nog geen migratie (Sprint 7/8-scope, `40_Implementatieplan.md`). Deze nu toevoegen had een nieuwe, ongeplande migratie vereist — expliciet buiten de opdracht ("bouw geen testdata die vooruitloopt op niet-bestaande architectuur").
- **Eén depotlocatie per bedrijf**, niet per medewerker — het schema ondersteunt alleen `companies.config_json.depot_location` (PRD § 19 A-13), geen per-medewerker-startlocatie.
- **Lokale `service_role`-grants vereist.** Omdat `auto_expose_new_tables` uitstaat, heeft `service_role` standaard nul tabeltoegang. Het script documenteert welke grants lokaal nodig zijn (zelfde aanpak als `tests/integration/helpers.ts`); dit is **niet** als migratie gecommitteerd — production heeft geen legitieme reden voor `service_role` om rechtstreeks in `customers`/`jobs`/`invoices` te schrijven.

## 4. Automatisch uitgevoerd & gecontroleerd

- Script tweemaal gedraaid (zie § 2).
- Rijtellingen per tabel geverifieerd via directe SQL-query tegen de lokale database (geen dubbele data).
- `npm run lint` / `npm run typecheck` / `npm run test` (141/141) / `npm run build` — allemaal schoon ná toevoeging van dit script.

## 5. Hoe te gebruiken

```
npx supabase start          # lokale Supabase-instantie
npx dotenv -e .env.local -- npx tsx scripts/seed-demo.ts
npm run dev
# Inloggen: demo@servops.nl / DemoWachtwoord123 (desktop/eigenaar)
#           jan@glashelder-demo.nl / DemoWachtwoord123 (PWA, /m)
```

**Uitsluitend voor lokale development/demo** — het script weigert expliciet te draaien tegen een niet-lokale `SUPABASE_URL`.

---

## Changelog

| Datum | Versie | Wijziging |
|---|---|---|
| 2026-07-12 | 1.0 | Demo-seedscript opgeleverd en geverifieerd (idempotent, 50 klanten/101 objecten/101 afspraken/6 medewerkers/151 jobs/59 routes/50 facturen). |
