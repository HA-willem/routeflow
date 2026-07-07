# 08 — Functionele Eisen

**Status:** DONE
**Versie:** 1.0
**Bron van waarheid:** `00_PRD.md` § 7 — dit document mag het PRD niet tegenspreken.
**Werkinstructie:** zie `MASTER_PROMPT.md`.

---

## Doel van dit document

Dit document bevat de **volledige gespecificeerde functionele requirements (FR-xxx)** voor RouteFlow. Elk requirement bevat:
- **Beschrijving:** wat doet de feature?
- **Acceptatiecriteria:** wanneer is het klaar?
- **Validaties:** wat moet ingecheckt?
- **Foutmeldingen:** waar kan het misgaan?
- **Edge cases:** bijzondere situaties.

Nummering is stabiel (nooit hergebruiken).

---

## 1. Conventies

- **FR-###:** Functionele Requirement, genummerd per categorie (001-099).
- **MoSCoW:** Must | Should | Could | Won't (fase: MVP | V1 | V2 | Later).
- Elke FR is gekoppeld aan één of meer user stories (zie 07_UserStories.md) en acceptatiecriteria (zie 32_Acceptatiecriteria.md).

---

## 2. FR-serie 001–019: Klanten & Objecten

### FR-001: Klant aanmaken
**Fase:** MVP | **Prio:** Must

Een gebruiker kan een nieuwe klant toevoegen met:
- Naam (verplicht, max 255 chars)
- Type: particulier | zakelijk (verplicht)
- Contactgegevens: e-mailadres, mobiel/WhatsApp-nummer
- Notities (vrij veld)
- Facturatievoorkeuren: e-mail | WhatsApp | post

**Acceptatiecriteria:**
1. UI-form met verplichte velden gemarkeerd; nieuw record in `customers`
2. Validatie: e-mail = valide format; mobiel = NL-nummer (06x of +31-6x)
3. Na opslaan: UI springt naar klant-detail-pagina; bevestigings-toast "Klant aangemaakt"
4. Foutmelding bij duplicate e-mailadres: "Deze e-mail is al in gebruik"

**Edge cases:**
- Klant zonder e-mail/mobiel: warschuwing ("klant kan geen meldingen ontvangen"), maar opslaan toegestaan
- Zakelijke klant: optioneel KVK/BTW-nummer-veld (validatie: 8 cijfers KVK | 14 chars BTW)

---

### FR-002: Adresinvoer met postcode & geocoding
**Fase:** MVP | **Prio:** Must

User voert adres in als **postcode + huisnummer** (NL-specifiek); systeem vulde straat/plaats automatisch aan en bepaald lat/lng via geocoding-API.

**Acceptatiecriteria:**
1. Invoerveld: "1234 AB" + huisnummer "42"; invulhulp bij typen (autocomplete postcode-huisnummer-combinaties)
2. Na blur/enter: API-call (Google Maps / OpenRoute) → straat, plaats, lat/lng automatisch ingevuld
3. Geocoding slaagt: formulier compleet ingevuld; geo-markerpin op kaartje zichtbaar
4. Geocoding mislukt: rode border om invoer; "Dit adres kan niet worden gevonden. Voer straat & plaats handmatig in?"
5. User klikt "handmatig invoeren": toont straat/plaats-velden; lat/lng = null tot user op kaart klikt

**Validatie:**
- Postcode-format: 4 letters + 2 cijfers (regex: `^[A-Z]{2}\d{2}\s?[A-Z]{2}$`)
- Huisnummer: 1–5 cijfers, optioneel suffix (23a, 23-1, etc.)

---

### FR-003: Klant kan meerdere objecten hebben
**Fase:** MVP | **Prio:** Must

Eén klant ↔ veel objecten (N:1). Per object een aparte dienstafspraak.

**Acceptatiecriteria:**
1. Klant-detail-pagina toont tab "Objecten"; knop "Object toevoegen"
2. Object-formulier: adres, objecttype (woning/bedrijfspand/appartementencomplex/overig), toegangsinstructies (optioneel, bijv. "3x bellen")
3. Opslaan → object-record in `objects`; route reëvalueerd als deze klant al geplande beurten heeft
4. Verwijdering object: check op geplande beurten; "Dit object heeft 5 toekomstige beurten. Verwijderen?"

---

### FR-004: Dienstafspraak met frequentie & prijsafspraak
**Fase:** MVP | **Prio:** Must

Een object heeft één of meer **dienstafspraken** (Service Agreement), elk met frequentie + prijs.

**Acceptatiecriteria:**
1. Object-detail: tab "Dienstafspraken"; knop "Afspraak toevoegen"
2. Formulier:
   - Dienst: dropdown (per bedrijf ingesteld, bijv. "Glasbewassing binnen", "Dakgoot reiniging")
   - Frequentie: keuzes = "wekelijks" | "elke 2 weken" | "elke 4 weken" | "maandelijks" | "elk kwartaal" | "halfjaarlijks" | "jaarlijks" | "eenmalig" | "custom" (dagpatroon)
   - Prijsafspraak: vast bedrag (€) | uurtarief (€/u) | maandabonnement (€/mnd)
   - Voorkeuren: "voorkeurdag" (ma-zo) | "voorkeursdagdeel" (ochtend/middag) | "bel vooraf" | "niet op [feestdag]"
   - Flexibiliteitsvenster: ±# werkdagen (default ±3)
   - Status: actief | gepauzeerd | beëindigd
3. Opslaan → record in `service_agreements`; eerste beurt automatisch gegenereerd (zie FR-020)

**Validatie:**
- Frequentie + prijsafspraak: niet-lege combinatie
- Datum-veld "gepauzeerd tot": niet in het verleden

---

### FR-005: Dienstafspraak pauzeren/hervatten
**Fase:** MVP | **Prio:** Must

Gebruiker kan een actieve dienstafspraak **pauzeren** (status → `paused`, datum "tot") en later **hervatten**.

**Acceptatiecriteria:**
1. Dienstafspraak-detail: knop "Pauzeren"; dialoog "Tot en met welke datum? (default morgen)"
2. Pauzeren → status = `paused`, kolom `paused_until` = datum
3. Alle toekomstige niet-vergrendelde beurten van deze afspraak → geannuleerd (BR-030)
4. Planner ziet in week-view: grijze beurten "Pauzering loopt" met datum-bereik
5. Hervatten: knop "Hervatten"; status → `active`, `paused_until` = null; volgende beurt wordt gegenereerd

**Edge case:**
- Pauzering tijdens cyclus (bijv. elke 4 weken; pauzering in week 2 van 4): volgende beurt-datum berekend van stop-datum + interval

---

### FR-006: CSV-import klanten/objecten met mapping
**Fase:** V1 | **Prio:** Should

Gebruiker importeert een CSV met klanten + adressen; systeem toont mapping-wizard en foutrapport.

**Acceptatiecriteria:**
1. Menu → "Klanten importeren"; dialoog "CSV kiezen"
2. Upload → preview: tabel met eerste 5 rijen; user kiest welke kolom = naam/e-mail/adres/etc.
3. Validatie stap: bijv. "10 adressen niet geocodeerbaar; 2 e-mails duplicate; 145 OK"
4. Bevestiging → import; rapport: "145 klanten + 145 adressen aangemaakt, 5 fouten (log-download beschikbaar)"

---

### FR-007: Klant-tijdlijn
**Fase:** V1 | **Prio:** Should

Klant-detail-pagina bevat tab "Tijdlijn": alle gerelateerde events chronologisch.

**Acceptatiecriteria:**
1. Tijdlijn toont: geplande beurten, uitgevoerde beurten, facturen, betalingen, "Niet thuis"-meldingen, communicatie (WhatsApp/e-mail verzonden)
2. Per event: timestamp, actie-naam, gebruiker (wie heeft dit gedaan), details
3. Filterknoppen: "Alles" | "Beurten" | "Facturen" | "Communicatie"
4. Zoeken in tijdlijn (cmd+K)

---

### FR-008: Zoeken (cmd+K) globaal
**Fase:** MVP | **Prio:** Must

Snelzoekpalette (Raycast/Linear-style) over alle domeinen.

**Acceptatiecriteria:**
1. Sneltoets: Cmd+K (macOS) | Ctrl+K (Windows/Linux) → palette opent
2. Zoekresultaten per categorie: Klanten | Objecten | Beurten | Facturen | Diensten
3. Resultaat met preview: "Bakkerij Jansen • 3 objecten • 12 toekomstige beurten"
4. Enter → springt naar resource-detail-pagina
5. Fuzzy-match; case-insensitive

---

## 3. FR-serie 020–039: Planning & AI Planner

### FR-020: Automatische beurt-generatie
**Fase:** MVP | **Prio:** Must

Systeem genereert automatisch voorgestelde beurten o.b.v. dienstafspraken.

**Acceptatiecriteria:**
1. Bij instellingen dienstafspraak "actief" zetten: AI Planner genereert beurten voor komende 12 weken
2. Generatie o.b.v.: "ideale datum = laatste `uitgevoerd`-beurt + interval"
3. Status beurten: `voorgesteld` (nog niet in route-planning)
4. Planner ziet wekelijks overzicht: "volgende week: 12 voorgestelde beurten (8 geclusterd, 4 kunnen niet auto-plaatsen)"
5. Opnieuw genereren: knop "Plan volgende 4 weken opnieuw"; algoritme herberekent met actuele data

---

### FR-021: Dagplanning per medewerker met geoptimaliseerde rijvolgorde
**Fase:** MVP | **Prio:** Must

Voor een gegeven dag: systeem bepaalt rijvolgorde beurten per medewerker om reistijd te minimaliseren.

**Acceptatiecriteria:**
1. Planning-view week: kolommen per medewerker; rijen = uren. Beurten ingetoond met adres + duur
2. Geoptimaliseerde rijvolgorde: voertuigroute berekend via afstandsmatrix (Google Routes API / OpenRoute Service)
3. Start-/eindtijden per beurt: gegenereerd uit duur + reistijd
4. Waarschuwing: "Route overschrijdt max 8.5u werkdag; 2 beurten kunnen niet geplaatst"

---

### FR-022: Drag-and-drop tussen dagen/medewerkers
**Fase:** MVP | **Prio:** Must

Planner sleept beurt tussen dagen/medewerkers; route herberekent live.

**Acceptatiecriteria:**
1. Ui: Gantt-achtige rooster; beurt = draggable kaart
2. Drag-feedback: beurt = transparant; doeldag = geaccentueerd
3. Drop → route voor beide dagen herberekend (< 2s); animatie toon start-/eindtijd-verschuiving
4. Undo beschikbaar na drop
5. Vergrendelde beurten (FR-026): niet draggable; grijze overlay "Vergrendeld"

---

### FR-023: Weersgevoelige diensten & herplanvoorstel
**Fase:** V1 | **Prio:** Must

Diensten kunnen "weersgevoelig" zijn (bijv. Glasbewassing); voorspelling regen → waarschuwing + herplan-voorstel.

**Acceptatiecriteria:**
1. Dienst-instelling: checkbox "Weersgevoelig" + type (regen | vorst | wind)
2. Planner opent planning; API haalt voorspelling op (KNMI/Open-Meteo)
3. Komende 10 dagen regen op gepland gebied: badge "Weerwaarschuwing: 5 regen-gevoelige diensten"
4. Click → dialog: "Herpland de volgende beurten?" + checkbox per beurt
5. Accept → AI Planner genereert alt-routes (andere dag/week); planner keurt goed

---

### FR-024: Automatisch herplannen bij ziekte/verlof
**Fase:** V1 | **Prio:** Must

Medewerker ziek of verlof → systeem verdeelt dagroute automatisch; toont diff ter goedkeuring.

**Acceptatiecriteria:**
1. Medewerker mark zichzelf "ziek" (PWA) of planner voert in → event getriggerd
2. Systeem: verzamelt alle niet-vergrendelde beurten van die dag; zoekt alternatieve plaatsing volgende dagen
3. Voorstel toont: "12 beurten verplaatst" + tabel: beurt | van | naar | verplaatsingskost (in minuten reistijd)
4. Planner klikt "Akkoord"; if niet alle beurten geplaatst → "2 beurten kunnen niet geplaatst (wachtrij); klanten krijgen berichten"
5. Niet-geplaatste beurten → `herplan-wachtrij` (prioriteit)

---

### FR-025: Geografische clustering
**Fase:** V1 | **Prio:** Must

AI Planner clustert beurten geografisch: adressen in dezelfde buurt worden zelfde dag/week ingepland.

**Acceptatiecriteria:**
1. PostGIS-queries bepalen "buurt" (bijv. 1km2 cluster)
2. Scoringsmodel (FR-023 van PRD): geografische clustering = gewogen criterium (default gewicht: middel)
3. Planning-view: hints "8 beurten in buurt Wijk Noord, 3 ma/3 di; ga je ze samenplannen?"
4. Planner kan clustering-gewicht aanpassen (slider "reistijd vs. frequentie-trouw")

---

### FR-026: Vergrendelde beurten
**Fase:** MVP | **Prio:** Must

Beurten kunnen "vergrendeld" worden (klant zei "dinsdag 10:00"); deze verplaatsen niet automatisch.

**Acceptatiecriteria:**
1. Beurt-detail: checkbox "Vergrendelen tot [datum]"; toelichting-veld "klant voorkeursdag"
2. Vergrendeld = status `locked`; AI Planner negeert deze bij herplannen
3. UI-hint in week-view: anker-icoon bij vergrendelde beurt
4. Unlocken: planner kan date-range instellen ("vergrendel tot 31/7"); daarna auto-unlocken

---

### FR-027: Capaciteitswaarschuwing
**Fase:** V1 | **Prio:** Should

Planning toont waarschuwing bij overboking medewerker-uur.

**Acceptatiecriteria:**
1. Planning-week: per dag, per medewerker: geplande uren vs. max 8.5u
2. Red-indicatie: "Overboeking: 2.5 uur op woensdag"
3. Click → suggestie: "Kies 3 kandidaat-beurten om te verplaatsen"

---

### FR-028: "Plan opnieuw" op week-niveau
**Fase:** V1 | **Prio:** Must

Knop "Week opnieuw plannen" hergeneert routes onder respect vergrendelingen.

**Acceptatiecriteria:**
1. Week-view: knop "Plan deze week opnieuw"
2. Dialog: "Herplandatum: [komende 7 dagen]"; "Respecteer vergrendelingen": checkbox (default aan)
3. Execute → algoritme ran; toon diff "10 beurten verplaatst, 2 nieuwe adressen geoptimaliseerd"
4. Undo beschikbaar

---

## 4. FR-serie 040–059: Uitvoering (mobiele PWA)

### FR-040: Dagroute in volgorde
**Fase:** MVP | **Prio:** Must

Medewerker opent PWA; ziet dagroute in geoptimaliseerde volgorde.

**Acceptatiecriteria:**
1. PWA-homescreen: "Goedemorgen, Piet! Vandaag 12 beurten" + kaart met geordende pins
2. Beurt-listitem: #(1/12) | adres | dienst | verwachte tijd (08:15–08:45) | notities
3. Scroll: list of kaart-view
4. Auto-refresh bij planningswijzigingen (realtime via WebSocket)

---

### FR-041: Eén-tik navigatie
**Fase:** MVP | **Prio:** Must

Beurt → knop "Navigeren" → opent Google Maps / Apple Maps directe route.

**Acceptatiecriteria:**
1. Deep-link: `comgooglemaps://...` (Apple Maps) of `https://maps.google.com?...`
2. Terugkomst in PWA (back-button)
3. Fallback als Maps niet geïnstalleerd: web-kaartje ingebed

---

### FR-042: Beurt afronden met optioneel notitie/foto
**Fase:** MVP | **Prio:** Must

Medewerker markt beurt als afgerond; optioneel foto + notitie.

**Acceptatiecriteria:**
1. Beurt-detail: grote knop "Gereed ✓"
2. Dialog: "Notitie (optioneel)" + camera-knop "Foto"
3. Notitie opslaan; foto upload naar Supabase Storage (blob → `job_photos` folder)
4. Status beurt: `onderweg` → `uitgevoerd`; timestamp vastgelegd
5. Bevestiging: confetti-animatie (licht) + success-toast

---

### FR-043: "Niet thuis"-flow
**Fase:** V1 | **Prio:** Must

Medewerker markt "klant niet thuis"; systeem stuurt klant-bericht; beurt in herplan-wachtrij.

**Acceptatiecriteria:**
1. Beurt-dialog, knop "Niet thuis"
2. Optional: "Gesloten" vs "Geen antwoord" vs "Uitgesteld" (radio-buttons)
3. Opslaan → status beurt `niet_thuis`; frequentie-teller loopt niet; beurt → `herplan-wachtrij` met prioriteit
4. Klant krijgt SMS/WhatsApp: "Jammer! We waren vandaag langs, maar je was niet thuis. Wanneer kun je ons?" (if opt-in)
5. Planner ziet next morning: herplan-wachtrij met 3 items; knop "Auto-herplan"

---

### FR-044: Foto's opslaan per beurt
**Fase:** V1 | **Prio:** Should

Medewerker kan voor/na-foto's vastleggen; opgeslagen bij beurt.

**Acceptatiecriteria:**
1. Beurt-detail: knop "Foto toevoegen"; camera-interface (native camera app of web)
2. Foto → upload naar Supabase Storage (`storage/job_photos/{bedrijf_id}/{beurt_id}/`)
3. Miniatuur in beurt-detail; link naar full res
4. Planner kan foto's zien bij klant-review of in rapportage

---

### FR-045: Offline-tolerante PWA met retry-queue
**Fase:** V1 | **Prio:** Should

PWA werkt bij korte netwerkverlies (optimistic UI, lokale opslag, auto-retry).

**Acceptatiecriteria:**
1. Offline-check: indien geen connectie, badge "Offline" in header
2. Beurt afronden offline → opslaan lokaal; UI toont "Wacht op verbinding..."
3. Verbinding terug → auto-retry (max 3×); fout → toast "Controleer je verbinding"
4. Retry-queue persistent in IndexedDB; blijft na app-restart
5. Sync-indicator: "Synchroniseert 2/5 wijzigingen..." in header

---

## 5. FR-serie 060–079: Facturatie

### FR-060: Automatische conceptfactuur
**Fase:** MVP | **Prio:** Must

Bij status `uitgevoerd`: systeem genereert automatisch conceptfactuur.

**Acceptatiecriteria:**
1. Trigger: beurt status → `uitgevoerd`
2. Conceptfactuur: tabel in database; niet-nummerd
3. Groepering: instelbaar per klant = "per beurt" | "per week" | "per maand" | "abonnement"
4. Planner ziet dashboard: "15 concept-facturen (€245 totaal); klaar om te finaliseren?"
5. Klant ziet in klant-detail: "Openstaande concept-factuur: €180 (dit maand)"

---

### FR-061: NL BTW (21%/9%/0%/verlegd)
**Fase:** MVP | **Prio:** Must

Factuurregels berekenen correct NL-BTW per dienst; instelbaar per dienst.

**Acceptatiecriteria:**
1. Dienst-instellingen: dropdown "BTW-tarief" = 21% | 9% | 0% | "Verlegd" (EU-rules)
2. Glasrein (9% mogelijk) = dialog: "Schoonmaakregeling van toepassing? Hier past 9% BTW" + link naar Belastingdienst-info (disclaimer)
3. Factuur-PDF: bedrag excl. | BTW-bedrag | bedrag incl. correct berekend
4. Exporteur kan factuurtabel zien: "bedrag excl. 21%: €100 | 9%: €20 | Totaal: €120"

---

### FR-062: PDF-factuur in huisstijl
**Fase:** MVP | **Prio:** Must

Factuur exporteert als PDF met bedrijfs-logo, kleuren, contactgegevens.

**Acceptatiecriteria:**
1. Bedrijf-instellingen: upload logo (PNG/SVG); primaire kleur
2. Factuur-template: logo links bovenaan; bedrijf-header (naam, adres, KVK, BTW-nr)
3. Klant-gegevens, tabel met diensten/bedragen, totaal, vervaldatum, bankrekening
4. "Betaal via QR": QR-code voor iDEAL-betaallink (V1 met FR-063)
5. PDF-naam: `factuur_{nummer}.pdf`; downloadable en e-mailable

---

### FR-063: Betaallink + QR (Mollie/iDEAL)
**Fase:** V1 | **Prio:** Must

Factuur bevat QR-code + betaallink via Mollie; klant betaalt met één tik.

**Acceptatiecriteria:**
1. Concept-factuur → definitief: systeem maakt Mollie Payment Intent (iDEAL)
2. QR-code in PDF: `https://routeflow.nl/pay/{payment_id}`; opener opent betaalpagina (mobile-optimized)
3. Betaalpagina: bedrag, klantgegevens, "Betaal nu iDEAL" (geen andere betaalmethoden, NL-optimized)
4. Webhook: Mollie POST naar RouteFlow bij payment-status-wijziging

---

### FR-064: Verzending per e-mail / WhatsApp
**Fase:** V1 (e-mail MVP) | **Prio:** Must

Factuur verzonden per klantkanaal-voorkeur (e-mail of WhatsApp).

**Acceptatiecriteria:**
1. Klant-settings: "Hoe wil je facturen ontvangen?" = E-mail | WhatsApp
2. Definitieve factuur → e-mail (MVP): "Factuur #12345 van RouteFlow" + PDF-bijlage + betaallink
3. WhatsApp (V1): template-bericht + link naar PDF + betaallink
4. Logs tonen: "Verzonden op 07-07-2026 09:15 per e-mail"
5. Foutmelding: "E-mail niet bereikt; probeer manueel" + herverzoek-knop

---

### FR-065: Automatische herinneringen
**Fase:** V1 | **Prio:** Must

Betaalherinnering gegenereerd op instelbare intervallen na factuurdatum.

**Acceptatiecriteria:**
1. Bedrijf-instellingen: "Herinnering verzenden op: +7 dagen | +14 dagen | +21 dagen"
2. Scheduler job (cron): per dag, check open facturen ouder dan [intervallen]; stuur herinnering
3. Reminder-bericht: "Nog niet betaald? Betaal nu: [link]" (per kanaal e-mail/WhatsApp)
4. Audit-log: "Herinnering #1 op 14/7, Herinnering #2 op 21/7"
5. Na laatste herinnering: status `overdue` of `escalation` (status machine FR-010)

---

### FR-066: Abonnementsfacturatie
**Fase:** V1 | **Prio:** Should

Prijsafspraak-type "abonnement": vast maanbedrag ongeacht aantal beurten.

**Acceptatiecriteria:**
1. Dienstafspraak-setup: "Prijstype" = Abonnement + "Bedrag/maand: €150"
2. Factuur gegenereerd per kalendermaand (vooruit of achteraf, instelbaar)
3. Abonnement dekt max aantal beurten; overage = extra regel op factuur
4. Voorbeeld: €150/maand → incl. 4 beurten; 6e beurt → €50 extra

---

### FR-067: Betaalstatus auto-update via webhook
**Fase:** V1 | **Prio:** Must

Mollie-webhook updatet factuurstatus automaatisch bij payment.

**Acceptatiecriteria:**
1. Edge Function of API-handler: `POST /webhooks/mollie`
2. Webhook-payload validatie (secret-key handshake)
3. Status-update: `open` → `betaald` + payment-record opgeslagen
4. Realtime-notificatie naar planner: "Factuur #12345 betaald"
5. Logs: alle webhook-events gelogd (audit trail)

---

### FR-068: Creditfactuur & correcties met audit trail
**Fase:** V1 | **Prio:** Must

Correcties op facturen via creditfactuur; audit trail toon mutaties.

**Acceptatiecriteria:**
1. Definitieve factuur: knop "Correctie/terugboeking"
2. Dialog: "Creditfactuur aanmaken voor: [bedrag/regel]?"
3. Creditfactuur gegenereerd: negatieve bedragen; gekoppeld aan origineel (veld `parent_invoice_id`)
4. Factuur-detail: "Correctie via creditfactuur #54321 op 08-07-2026"
5. Export-audit: tabel toont "Origineel #123 | Betaald €100 | Credit #54321 -€50 | Saldo €50"

---

## 6. FR-serie 080–099: Communicatie & Notificaties

### FR-080: Automatisch klantbericht "morgen"
**Fase:** MVP (e-mail) | **Prio:** Must

Dagelijks: systeem stuurt "morgen komen wij langs" naar klanten met geplande beurt morgen.

**Acceptatiecriteria:**
1. Scheduled job (cron, 18:00 dagelijks): verzamel alle beurten met status `gepland` voor tomorrow
2. Per klant: genereer bericht via template (variabelen: {{voornaam}}, {{date}}, {{service}}, {{time}})
3. Kanaal: e-mail MVP, WhatsApp V1; per klant instelbaar
4. Loggen: `customer_notifications` tabel → kan medewerker de histoire zien
5. Opt-out: checkbox in klant-settings "Geen vooraankondiging-berichten"

---

### FR-081: Berichttemplates met variabelen
**Fase:** V1 | **Prio:** Must

Bedrijf kan berichttemplates aanpassen met variabelen.

**Acceptatiecriteria:**
1. Bedrijf-instellingen: tab "Berichttemplates"
2. Templates: "Morgen-aankondiging", "Niet-thuis-melding", "Factuur-herinnering", "Betaal-bevestiging"
3. Editor: rich-text (bold, cursief) + variabelen-hints ({{voornaam}}, {{date}}, {{bedrijf_naam}})
4. Preview: "Hallo Jansen! Morgen 14/7 komen wij langs voor Glasbewassing (09:00–09:30)."
5. Opslaan → nieuwe template van toepassing op toekomstige berichten

---

### FR-082: Interne notificaties (herplan-voorstellen, fouten)
**Fase:** V1 | **Prio:** Must

Planner ontvangt in-app notificaties voor kritieke events.

**Acceptatiecriteria:**
1. In-app inbox (bell-icon in header): notificatie-lijst
2. Event-triggers: "Herplan-voorstel beschikbaar (3 opties)", "Medewerker ziek (5 beurten)", "Weerwaarschuwing (morgen regen)", "Betaling mislukt voor factuur #123"
3. Per notificatie: actiesleutel (knop "Review" → jump to planning, "Solve" → dialog)
4. Push-notifications (optioneel PWA web-push): "Herplan-voorstel klaar"
5. Read/unread-status; archiveren

---

### FR-083: Tweeweg WhatsApp
**Fase:** V2 | **Prio:** Could

Klant antwoordt "overslaan" op WhatsApp → beurt automatisch geannuleerd.

**Acceptatiecriteria:**
1. WhatsApp-bericht: "Kun je morgen 09:00 niet? Antwoord OVERSLAAN"
2. Klant-reply "OVERSLAAN" → webhook gefired
3. System: beurt → `skipped`; planner notified "Klant sloeg over"; beurt in herplan-wachtrij
4. Bevestiging naar klant: "Ok! We proberen je volgende week."

---

## 7. FR-serie 100+: Instellingen, Onboarding, Dashboard

### FR-100: Bedrijf-instellingen
**Fase:** MVP | **Prio:** Must

Admin kan bedrijfs-metadata instellingen.

**Acceptatiecriteria:**
1. Instellingen-pagina (admin-only): tabs "Bedrijf" | "Diensttypen" | "Medewerkers" | "Notificaties" | "Facturatie"
2. Bedrijf-tab: naam, logo, primaire kleur, adres (KVK), BTW-nummer, IBAN
3. Opslaan; validatie per veld

---

### FR-101: Onboarding-flow
**Fase:** MVP | **Prio:** Must

Eerste keer: wizard "Bedrijf opzetten" in 3 stappen (2 min).

**Acceptatiecriteria:**
1. Sign-up → redirect onboarding
2. Stap 1: "Bedrijfsnaam?" (text-field)
3. Stap 2: "Voeg je eerste klant toe" (klant-form, address-geocoding)
4. Stap 3: "Voeg je eerste dienst toe" (dienst-name, frequentie)
5. Finish → planning-page auto-loads eerste week met suggestie

---

### FR-102: Dashboard
**Fase:** MVP | **Prio:** Must

Home-pagina toont snelle KPI's en actie-hints.

**Acceptatiecriteria:**
1. Cards: "Omzet deze maand: €3.250" | "Openstaande facturen: €850" | "Volgende week: 47 beurten geplanned" | "Medewerker-druk: normaal"
2. Snelle acties: "Plan deze week opnieuw" | "Herplan-wachtrij bekijken" (2 items)
3. Graph: omzet per week (bar chart, 8 weken)
4. Notificatie-banner: "3 niet-thuis-meldingen vandaag"

---

## Relaties met andere documenten

- **00_PRD.md**: § 7 (functional requirements overzicht)
- **07_UserStories.md**: user stories per FR
- **32_Acceptatiecriteria.md**: uitgebreide acceptatie-scenario's
- **10_BusinessRules.md**: domeinregels ondersteunend aan FR's
- **31_Testplan.md**: test-cases per FR

---

## Changelog

| Datum | Versie | Wijziging |
|---|---|---|
| 2026-07-06 | 1.0 | Volledig uitgewerkt: alle FR-001 t/m FR-102, acceptatiecriteria, validaties, edge cases |
