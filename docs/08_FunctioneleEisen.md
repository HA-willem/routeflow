# 08 — Functionele Eisen

**Status:** DONE
**Versie:** 1.13
**Bron van waarheid:** `00_PRD.md` § 7 — dit document mag het PRD niet tegenspreken.
**Werkinstructie:** zie `MASTER_PROMPT.md`.

---

## Doel van dit document

Dit document bevat de **volledige gespecificeerde functionele requirements (FR-xxx)** voor ServOps. Elk requirement bevat:
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
- Postcode-format: 4 cijfers + 2 letters (regex: `^[1-9][0-9]{3}\s?[A-Z]{2}$`; NL-postcodes beginnen nooit met een 0)
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
   - Frequentie: keuzes = "wekelijks" | "elke 2 weken" | "elke 4 weken" | "maandelijks" | "elk kwartaal" | "halfjaarlijks" | "jaarlijks" | "eenmalig" | "custom" (aangepast interval in **weken**, bijv. "elke 8 weken"/"elke 12 weken" — UI vraagt weken, intern opgeslagen als dagen; geen dag-patroon-builder)
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
4. Waarschuwing: "Route overschrijdt max 8,5u werkdag; 2 beurten kunnen niet geplaatst"

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
1. ✅ **Gebouwd** (Sprint 7-vervolg, 2026-07-18): `lib/planning/clustering.ts` bepaalt "buurt" als een straight-line afstand ≤1km (Haversine, hergebruikt `lib/routing/haversine.ts` i.p.v. een aparte PostGIS-query — functioneel gelijkwaardig aan `ST_DWithin(location, $punt, 1000m)` uit `15_AIPlanner.md` § 3, wel puur/unit-testbaar zonder DB). `planning-generate` past dit toe: een nieuw te genereren datumreeks schuift naar een al-bestaande nabije beurt van een ándere dienstafspraak als dat binnen het flexibiliteitsvenster (BR-101) past. Bestaande beurten worden hierbij nooit gewijzigd (alleen nieuw te plannen datums sluiten aan).
2. **Niet gebouwd — bewust uitgesteld.** Een gewogen scoringsmodel (§4 uit `15_AIPlanner.md`) bestaat nog voor geen van de 4 BR-701-criteria; dit AC vereist een nieuw instellingen-/scoring-subsysteem, niet alleen clustering. Losstaand vervolgwerk.
3. ✅ **Gebouwd**, in aangepaste vorm: geen losse "ga je ze samenplannen?"-hint-UI, maar een zin in de bestaande Planning Agent-samenvatting (`lib/agents/planning.ts`, zichtbaar via de al bestaande `ProposalList` op de Morning Briefing/Planning-pagina) die meldt hoeveel dienstafspraken geclusterd zijn. Geen aparte goedkeuringsstap nodig (het aanmaken van voorgestelde beurten is al de toegestane autonome actie, ADR-011 § 4).
4. **Niet gebouwd — bewust uitgesteld**, zelfde reden als AC2 (geen bestaande slider-infrastructuur voor welk scoringscriterium dan ook).

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
1. Planning-week: per dag, per medewerker: geplande uren vs. max 8,5u
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

### FR-029: Handmatige beurt-toevoeging op dag/tijdstip
**Fase:** V1 | **Prio:** Must

De AI Planner genereert beurten automatisch o.b.v. interval + flexibiliteitsvenster (FR-020, BR-101-Soft) — dat volstaat voor periodiek werk, maar niet voor klanten die uitsluitend op een vaste dag/tijdstip bereikbaar/beschikbaar zijn (bijv. een kantoor dat alleen dinsdagochtend open is, of een CV-onderhoudsafspraak op een exact tijdstip). Voor deze gevallen kan de planner een beurt direct en handmatig op een specifieke dag + tijdstip in het planning-board zetten, zonder af te wachten of de automatische generatie daar toevallig op uitkomt.

**Acceptatiecriteria:**
1. Planning-board (week-/dagview): knop "Beurt toevoegen" opent formulier: klant/object, dienst, datum, exact tijdstip (niet alleen dagdeel), medewerker (optioneel — leeg = "nog toewijzen")
2. Een handmatig toegevoegde beurt is altijd gekoppeld aan een dienstafspraak — bij ontbreken daarvan maakt het formulier in dezelfde stap een eenmalige dienstafspraak (`frequency='once'`) aan; er bestaat geen "kale" beurt zonder dienstafspraak (bestaand domeinmodel, FR-003)
3. Nieuwe beurt wordt direct `locked=true` met `locked_reason` = het ingevoerde tijdstip/toelichting (FR-026, `12_Entiteiten.md` § 1.4) — een expliciet vastgezet tijdstip mag niet automatisch verschuiven bij een volgende herplanning (FR-024/028)
4. Validatie hergebruikt bestaande conflict-checks: geen dubbele beurt zelfde medewerker/tijdslot (BR-203), max 8,5u werkdag (BR-202)
5. Na toevoegen: dagroute van de betrokken medewerker herberekent (zelfde gedrag als drag-and-drop, FR-022)

---

### FR-030: "Vul de dag" — capaciteit opvullen op een net vrijgekomen dag
**Fase:** V1 | **Prio:** Should

Spiegelbeeld van FR-024 (Replanning Agent): waar FR-024 draait bij capaciteit-*verlies* (ziekte/verlof) en beurten wegverdeelt, draait FR-030 bij capaciteit-*winst* — een medewerker (met name relevant voor de eenmanszaak/ZZP'er-weekweergave, PRD § 19 A-21) die besluit een normaal vrije dag (bijv. zaterdag) toch te werken, en die dag gevuld wil zien met beurten die anders pas later in de week aan de beurt waren.

**Acceptatiecriteria:**
1. "Vul de dag"-knop per dag/medewerker-kolom, zowel op de RouteBoard-dagweergave als de WeekBoard-weekgrid (eenmanszaken)
2. Klik toont kandidaat-beurten: niet-vergrendelde, nog niet-geroute beurten (`status='proposed'`, `route_id is null`) waarvan de huidige geplande datum binnen het flexibiliteitsvenster (BR-101) van de gekozen dag valt — met klant, adres, dienst en oorspronkelijke datum per kandidaat
3. Planner/medewerker vinkt kandidaten aan (default: alle aangevinkt) en bevestigt expliciet — geen automatische uitvoering zonder deze stap (zelfde human-in-the-loop-patroon als de Replanning/Capacity Agent, ADR-011)
4. Na bevestigen: gekozen beurten krijgen de nieuwe datum; de dagroute herberekent (hergebruikt route-optimize, FR-022). Een beurt die alsnog niet past (BR-202) blijft zichtbaar met een waarschuwing i.p.v. stil te falen
5. De dag wordt vastgelegd als `available` in `availability` (bestaande, tot dusver ongebruikte statuswaarde) — audit-trail dat dit een bewuste keuze was, geen automatisch gegenereerde planning

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
2. QR-code in PDF: `https://servops.nl/pay/{payment_id}`; opener opent betaalpagina (mobile-optimized)
3. Betaalpagina: bedrag, klantgegevens, "Betaal nu iDEAL" (geen andere betaalmethoden, NL-optimized)
4. Webhook: Mollie POST naar ServOps bij payment-status-wijziging

---

### FR-064: Verzending per e-mail / WhatsApp
**Fase:** V1 (e-mail MVP) | **Prio:** Must

Factuur verzonden per klantkanaal-voorkeur (e-mail of WhatsApp).

**Acceptatiecriteria:**
1. Klant-settings: "Hoe wil je facturen ontvangen?" = E-mail | WhatsApp
2. Definitieve factuur → e-mail (MVP): "Factuur #12345 van ServOps" + PDF-bijlage + betaallink
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
5. Na laatste herinnering: status `overdue` of `escalation` (zie BR-402, statusmachine 10_BusinessRules.md)

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

### FR-069: Direct factureren bij afronden (ZZP-versnelling)
**Fase:** V2 | **Prio:** Should — ✅ **gebouwd** (Sprint 12, 2026-07-21)

Nieuw (PRD § 19 A-33, 2026-07-21): een per-bedrijf instelbare optie waarmee het afronden van een beurt niet alleen een conceptfactuur aanmaakt (bestaand, `complete_job()`), maar in één stap ook direct verstuurt — voor een ZZP'er die zelf zowel uitvoert als factureert is "conceptfactuur later apart versturen" een overbodige extra stap. **Blijft binnen BR-702** (versturen is en blijft een menselijke actie): dit is geen automatisering zonder mens in de lus, het is dezelfde mens (de medewerker/eigenaar) die met één tap in plaats van twee schermen dezelfde actie uitvoert. Standaard **uit** voor MKB-bedrijven (financiële scheiding tussen uitvoering en administratie, 28_Dashboard.md § 3, blijft de default); standaard **aan** te zetten tijdens ZZP-onboarding, maar altijd een bewuste, zichtbare instelling — nooit stil verschillend gedrag o.b.v. `company_type` alleen.

**Acceptatiecriteria:**
1. Nieuwe instelling in Bedrijfsinstellingen (FR-100-uitbreiding): "Factuur direct versturen na afronden beurt" (aan/uit), met korte uitleg van het verschil met de standaardflow
2. ~~Indien aan: `/m/beurt/[id]`'s "Gereed"-knop toont bevestiging "Beurt afronden én factuur versturen aan {klant}?" i.p.v. alleen "Gereed"~~ — **bij de bouw bewust vereenvoudigd**: geen tweede bevestigingsstap (dat zou precies de friction terugbrengen die deze FR probeert weg te nemen); de al-bestaande "Gereed"-bevestigingssheet (foto/notitie) blijft de enige stap, de vervolg-toast meldt achteraf "Factuur is verstuurd" i.p.v. "Conceptfactuur aangemaakt"
3. Indien uit (default): ongewijzigd bestaand gedrag — conceptfactuur, apart te versturen
4. Alleen beschikbaar voor gebruikers met een rol die al facturen mag versturen (Eigenaar/Admin/Administratie, 23_Gebruikersrollen.md § 2) — een Medewerker-rol zonder factuurrechten ziet deze versnelling niet, ook niet als de instelling aan staat — **gebouwd**
5. Best-effort: als versturen mislukt (bv. ontbrekende factuurgegevens of Resend niet geconfigureerd, dezelfde `sendInvoice()`-foutafhandeling als PRD § 19 A-20), blijft de beurt gewoon afgerond en de factuur een concept — geen foutmelding die de succesvolle afronding zelf overschaduwt — **gebouwd**, browser-geverifieerd

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
**Fase:** MVP | **Prio:** Must — ✅ **gebouwd** (Sprint 12, 2026-07-21), met één scope-cut

Admin kan bedrijfs-metadata instellingen. Stond al sinds v1.0 in MVP-scope maar was nooit gebouwd tot Sprint 12 (PRD § 19 A-33) — `config_json.invoicing` (bedrijfscode/KVK/BTW-nr/IBAN/BIC, PRD § 19 A-20) had tot dan toe geen UI en vereiste directe DB-invoer.

**Acceptatiecriteria:**
1. ~~Instellingen-pagina (admin-only): tabs "Bedrijf" | "Diensttypen" | "Medewerkers" | "Notificaties" | "Facturatie"~~ — **gebouwd als aparte `/instellingen/bedrijf`-pagina** i.p.v. tabs, consistent met hoe Diensten/Medewerkers al eigen pagina's zijn i.p.v. tabs binnen één scherm (26_ComponentLibrary.md-conventie); "Notificaties" bestaat nog niet als aparte sectie (Sprint 8/WhatsApp-scope)
2. Bedrijf-tab: naam, ~~logo, primaire kleur~~, adres (KVK), BTW-nummer, IBAN — **logo/primaire kleur bewust niet gebouwd**: white-label-branding (file-upload/kleurkiezer, raakt PDF-/e-mail-templates) is een materieel andere, grotere feature dan de rest van dit sprint; blijft open. Naam/KVK/BTW-nummer/IBAN + BIC (niet expliciet in de oorspronkelijke AC maar wel al in `config_json.invoicing`) **gebouwd**. "Adres" niet gebouwd — bestond nergens in het schema (alleen depot-locatie, PRD § 19 A-13, een ander veld met een ander doel)
3. Opslaan; validatie per veld — **gebouwd**
4. **(A-33)** Bedrijf-tab: bedrijfstype "ZZP" of "MKB" — stuurt uitsluitend standaardwaarden/onboarding-vragen (bv. FR-069's default), **nooit** welke pagina's/UI-onderdelen zichtbaar zijn; het bestaande, betrouwbaardere "1 actieve medewerker → weekweergave"-gedrag (27_PaginaOverzicht.md § 1.2) blijft ongewijzigd en leidt niet af van dit veld — **gebouwd**
5. **(A-33)** Bedrijf-tab: branche-keuze uit een vaste lijst (glazenwassers/schoonmaak/hovenier/dakgoot-en-gevelreiniging/ongediertebestrijding/installatie-cv-airco/overig, volgorde per 39_Toekomstvisie.md § 2) — koppelt aan FR-104's dienstensjabloon-import, verandert verder geen terminologie elders in de app (§ 6.7-principe) — **gebouwd**

---

### FR-103: Medewerker-uitnodiging (eigen inlogaccount)
**Fase:** V1 | **Prio:** Must — ✅ **gebouwd** (Sprint 12, 2026-07-21)

Nieuw (PRD § 19 A-33). Sloot een kritiek gat: 22_Authenticatie.md § 8 documenteerde deze flow al sinds een eerdere sessie, maar de `invites`-tabel bestond niet en `createEmployee()` maakte uitsluitend een `employees`-rij aan zonder `user_id`/inlogaccount. Zonder deze flow kon een medewerker in de praktijk niet zelf inloggen om beurten af te vinken.

**Acceptatiecriteria:**
1. ~~Bij het aanmaken/bewerken van een Medewerker: veld "E-mailadres" + knop "Uitnodigen"~~ — **gebouwd als eigen `/instellingen/medewerkers/[id]/uitnodigen`-pagina** i.p.v. een inline veld, met een link vanaf de Medewerkers-lijst; uitnodigen is idempotent (een bestaande, niet-geaccepteerde uitnodiging wordt vervangen, niet gestapeld — dekt zowel "eerste keer" als "opnieuw uitnodigen" met één actie)
2. Uitnodiging: token in nieuwe `invites`-tabel (`040_employee_invites.sql`, met `accepted_at` i.p.v. verwijderen — audit-spoor), verloopt na 7 dagen; e-mail via bestaande Resend-integratie — **gebouwd**
3. Medewerker klikt link → wachtwoord instellen → `users`-rij aangemaakt met `role='employee'` → `employees.user_id` gekoppeld → redirect naar `/m` — **gebouwd**, incl. de tussenstap via Supabase's eigen e-mailbevestiging (`enable_confirmations=true`) die dit vereist; browser-E2E-geverifieerd
4. Status zichtbaar op de Medewerkers-lijst: ~~"Uitgenodigd (verloopt over X dagen)"~~ / "Actief" / "Verlopen — opnieuw uitnodigen" — **gebouwd zonder de dagen-aftelling** (vereenvoudiging; "Uitgenodigd"/"Verlopen"/"Actief"/"Nog niet uitgenodigd")
5. Alleen Eigenaar/Admin mag uitnodigen (23_Gebruikersrollen.md § 2) — **gebouwd**, zowel als vroege Server-Action-check als RLS
6. RLS: `invites` volgt het standaard tenant-model; een verlopen/gebruikt token is nooit opnieuw bruikbaar — **gebouwd**, negatief getest (`tests/integration/employee-invites-rls.test.ts`)

---

### FR-104: Branche-dienstensjabloon
**Fase:** V1 | **Prio:** Should — ✅ **gebouwd** (Sprint 12, 2026-07-21)

Nieuw (PRD § 19 A-33) — het al sinds PRD v1.0 geplande "Diensttype-templates per branche" (§ 5.2/§ 6.7), tot dan toe nooit gebouwd. Een voorgedefinieerde, optioneel-toe-te-passen set Diensten per branche — geen automatische, dwingende actie en geen terminologie-vervanging elders in de app; de gebruiker kan na import nog vrij aanpassen/verwijderen (bestaande Diensten-CRUD, ongewijzigd).

**Acceptatiecriteria:**
1. ~~Tijdens onboarding of later vanaf Instellingen → Diensten~~ — **gebouwd als aparte `/instellingen/diensten/sjabloon`-pagina**, bereikbaar vanaf de Diensten-lijst (knop + lege-staat-actie); **niet** in de onboarding-wizard geïntegreerd (FR-101 ongewijzigd) — kleinere, bewuste scope-cut, de instellingen-route is altijd beschikbaar
2. Sjabloon-data als statische seed-set per branche (`lib/branche-templates/data.ts`, geen nieuwe tabel — insert in de bestaande `services`-tabel); glazenwassers als volledig referentiesjabloon — **gebouwd**
3. Import toont een preview-lijst met checkboxes vóór het daadwerkelijk aanmaken — **gebouwd**, browser-geverifieerd
4. Overige branches starten met een kleinere sjabloon-set dan glazenwassers — **gebouwd** ("Overig" heeft bewust een lege set)

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

## 8. FR-serie 900+: AI Agents & Morning Briefing

Nieuwe serie (ADR-011, Human-in-the-Loop AI — `docs/adr/ADR-011-human-in-the-loop-ai.md`, `43_AI_Agents.md`). Genummerd vanaf 900 om duidelijk te scheiden van de bestaande, per-domein-gegroepeerde series (020–102) — dit is een cross-cutting requirement die meerdere agents/domeinen samenbrengt, geen los domein.

### FR-900: Morning Briefing
**Fase:** V1 (Sprint 7+, `40_Implementatieplan.md`) | **Prio:** Must

De Morning Briefing is het **primaire startscherm** van ServOps (ADR-011 § 1) — bij het openen van de applicatie krijgt de gebruiker automatisch, direct, een samengesteld dagoverzicht van AI Agent-output te zien, niet een los dashboard of een leeg planningsscherm. Technisch valt dit samen met de bestaande dashboard-route (`/`, FR-102).

**Acceptatiecriteria:**
1. Overzicht toont: beschikbare medewerkers vandaag, aantal geplande routes, aantal opdrachten (incl. wachtrij-omvang), weersverwachting van vandaag + getroffen beurten, verkeerssituatie, capaciteit, omzetprognose, openstaande waarschuwingen, AI-voorstellen (elk met AI-confidence score), belangrijkste wijzigingen sinds gisteren.
2. Overzicht is al samengesteld vóórdat de gebruiker inlogt (achtergrondproces, dagelijkse cyclus 00:00–06:00) — geen zichtbare laadvertraging voor de samenstelling zelf.
3. Elke wijziging/elk voorstel toont expliciet: wat is gewijzigd, waarom dit is gewijzigd, welke business rules zijn toegepast, wat het verwachte voordeel is, en welke impact dit heeft op de planning — plus confidence score + gebruikte databronnen + overwogen alternatieven (BR-703).
4. Vanuit de Briefing kan de gebruiker: alle voorstellen in één keer accepteren, voorstellen individueel accepteren, een voorstel aanpassen (opent de planner met het voorstel als uitgangspunt), een voorstel afwijzen, of direct doorklikken naar de planner (`/planning`).
5. Lege staat (rustige dag, weinig te melden) toont nooit een kaal "niets"-scherm maar een expliciete, geruststellende samenvatting (consistent met 24_UI_UX.md § 4) — bijv. "Alles gepland, geen waarschuwingen."
6. Geen enkele actie in de Briefing wordt zonder expliciete goedkeuring uitgevoerd (BR-702) — pas ná goedkeuring is de planning definitief en wordt de wijziging uitgevoerd; de Briefing is uitsluitend een overzicht + review-startpunt, geen uitvoeringsscherm.

### FR-901: Organizational Memory (bekijken/beheren)
**Fase:** V1 (Sprint 7+, `40_Implementatieplan.md`) | **Prio:** Should

De gebruiker kan de door AI Agents geleerde voorkeuren (`45_AgentMemory.md`) per klant, object, medewerker en bedrijfsbreed bekijken en beheren — nooit een verborgen, alleen-intern-gebruikte kennislaag.

**Acceptatiecriteria:**
1. Elke geleerde voorkeur toont: inhoud, confidence-niveau (nieuw/waarschijnlijk/bevestigd/zeer sterk patroon), herkomst (expliciet/impliciet) en de volledige uitleg (waarom is dit ontstaan, welke waarnemingen liggen eraan ten grondslag) — `45_AgentMemory.md` § 4/§ 5.
2. Gebruiker kan per voorkeur: bekijken, aanpassen, uitschakelen, verwijderen, resetten (`45_AgentMemory.md` § 6) — elke actie direct effectief, geen wachttijd.
3. Alleen impliciete voorkeuren op "waarschijnlijk"-niveau of hoger zijn zichtbaar in het reguliere overzicht (niet elk "nieuw"-niveau ruwe signaal) — voorkomt ruis (`45_AgentMemory.md` § 3).
4. Rolgebonden zichtbaarheid/beheerrecht volgt `23_Gebruikersrollen.md` § 2, uitgewerkt per geheugensoort in `45_AgentMemory.md` § 10.
5. Geen voorkeur beïnvloedt ooit een harde business rule (BR-200–205) — uitsluitend de zachte, scoringsmodel-afwegingen (`45_AgentMemory.md` § 12).

### FR-902: AI-feedback per voorstel
**Fase:** V1 (Sprint 7+, `40_Implementatieplan.md`) | **Prio:** Should

Elk AI-voorstel in de Morning Briefing (FR-900) heeft een feedback-actie naast accepteren/bewerken/afwijzen, die de Organizational Memory voedt (`45_AgentMemory.md` § 8).

**Acceptatiecriteria:**
1. Drie feedback-opties per voorstel: 👍 Goed voorstel, 👎 Niet handig, ✏️ Aangepast (laatste wordt automatisch geregistreerd bij de "Bewerken"-actie, geen aparte stap).
2. 👍 verhoogt de confidence van de onderliggende voorkeur(en); 👎 verlaagt hem; herhaalde 👎 op dezelfde voorkeur degradeert het niveau, verwijdert de voorkeur niet automatisch.
3. Feedback is altijd gekoppeld aan het specifieke voorstel én de specifieke onderliggende voorkeur(en) — nooit een contextloze, losse beoordeling.
4. Elke feedback-gebeurtenis wordt gelogd (audittrail, `45_AgentMemory.md` § 10).

### FR-903: AI-transparantie & -geletterdheid

**Fase:** los van MVP/V1/V2 (compliance-fundament, sprintplaatsing via `40_Implementatieplan.md`) | **Prio:** Must

De gebruiker kan op elk moment in begrijpelijke taal nalezen welke onderdelen van ServOps een taalmodel gebruiken en welke niet, wie uiteindelijk beslist, en wat AI bij ServOps nooit doet — EU AI Act Art. 4 (AI-geletterdheid) en Art. 50(1) (transparantie bij AI-interactie), `47_AIAct_Compliance.md` § 6.1/6.2.

**Acceptatiecriteria:**
1. Een vaste, vindbare pagina (`/instellingen/over-ai`) legt uit: welk onderdeel echt een taalmodel gebruikt (Command Bar-vrije-tekst, ADR-014) en welke data daarbij wel/niet meegaat; dat de overige "AI Agents" deterministische regels zijn, geen lerend model; dat geen enkel voorstel zonder menselijke goedkeuring wordt uitgevoerd (BR-702); en een expliciete lijst van wat AI bij ServOps nooit doet (incl. BR-706/707: nooit taakallocatie op gedrag/persoonskenmerken, nooit prestatiebeoordeling).
2. Elke interactie met het taalmodel in de UI is expliciet gelabeld (bestaand: "Vraag AI" in de Command Bar, ADR-014) — geen verborgen of impliciete AI-interactie.
3. De pagina-inhoud volgt de architectuur (ADR-014, `43_AI_Agents.md`-implementatiestatus) — wijzigingen daaraan die de classificatie raken (`47_AIAct_Compliance.md` § 7) vereisen een bijwerking van deze pagina in dezelfde wijziging, niet later.

### FR-904: Automatiseringsniveau/confidence-drempel per agent (AI-assistent)
**Fase:** V1 (Sprint 7-vervolg) | **Prio:** Should — ✅ **gebouwd** (2026-07-21)

15_AIPlanner.md § 8 specificeerde dit al als "per bedrijf instelbaar" sinds Sprint 7, maar `decideApproval()` (lib/agents/approval-handler.ts) werd tot nu toe altijd met de hardcoded default aangeroepen (`automationLevel: 'proposal'`, confidence-drempel 0,7) — de "AI-assistent"-tegel op `/instellingen` stond sindsdien als niet-klikbare "Binnenkort"-placeholder. Alleen de zes daadwerkelijk gebouwde agents (Planning/Replanning/Weather/Capacity/Optimization/Invoice, Sprint 7/7-vervolg) worden getoond — `communication` (Sprint 8) en `revenue` (nooit gebouwd) bestaan alleen als toekomstige enum-waarden.

**Acceptatiecriteria:**
1. `/instellingen/ai-assistent` (Eigenaar/Admin, zelfde rechten als Bedrijfsinstellingen): per agent een automatiseringsniveau (Voorstel/Semi-automatisch/Volautomatisch) en confidence-drempel (0–1)
2. `agent-orchestrator`/`agent-replanning` (Edge Functions) lezen deze instellingen per bedrijf en geven ze door aan de al-bestaande `decideApproval()`-beslisboom (ADR-012 § 7) — geen wijziging aan die beslisboom zelf, alleen aan de input
3. Ontbrekende instelling voor een agent = de bestaande default (Voorstel/0,7) — geen migratie-eis om alle zes rijen vooraf te vullen
4. Blijft binnen BR-702: agents met alleen informatieve voorstellen (Capacity/Weather/Invoice, geen `payload`) hebben sowieso geen uitvoerbare actie, ongeacht het gekozen niveau; een confidence-score onder de drempel valt altijd terug op "Voorstel"
5. RLS: alleen Eigenaar/Admin schrijft, Planner leest mee, Administratie/Medewerker geen toegang — cross-tenant nooit zichtbaar

---

## 9. FR-serie 950+: Platform Administration & Product Agent

Nieuwe serie (ADR-013, Platform Admin & Product Agent — `docs/adr/ADR-013-platform-admin-product-agent.md`, `46_PlatformAdmin.md`). Genummerd vanaf 950, direct volgend op de AI Agents-serie (900+) waar dit conceptueel bij aansluit (Human-Approval-principe, Explainability-contract), maar staat — net als de architectuur zelf — **buiten** de tenant-Bedrijf-scope en buiten de MVP/V1/V2-scopetabel (00_PRD.md § 5.2). FR-950 is tenant-zijde (klant-gerichte UI); FR-951–953 zijn platform-zijde (uitsluitend platform-eigenaar).

### FR-950: Feature request indienen (tenant-zijde)
**Fase:** los van MVP/V1/V2 (platformbrede tooling, sprintplaatsing via `40_Implementatieplan.md`) | **Prio:** Should

Een tenant-gebruiker kan vanuit de eigen bedrijfsomgeving een feature request indienen: titel, beschrijving, optioneel context (pagina/flow).

**Acceptatiecriteria:**
1. Rolrechten volgens `23_Gebruikersrollen.md` § 2 ("Feature requests"-rij).
2. Request is uitsluitend zichtbaar voor het eigen bedrijf en de platform-eigenaar — nooit voor andere tenants (BR-904).
3. Indiener ziet de status van het eigen request terugkomen: `nieuw → getrieerd → voorgesteld → afgewezen/gepland/gebouwd` (`46_PlatformAdmin.md` § 2.3), zonder platformbrede clustering-details (bv. andere bedrijven) te tonen.
4. Lege staat (nog geen requests ingediend) toont een uitnodigende call-to-action, geen kaal scherm (consistent met 24_UI_UX.md § 4).

### FR-951: Product Agent-triage & voorstellen (platform-zijde)
**Fase:** los van MVP/V1/V2 | **Prio:** Could

De Product Agent trieert binnengekomen feature requests (geclusterd over tenants) en operationele signalen (`agent_runs`-foutpatronen) tot concrete codewijzigingsvoorstellen (branch + Pull Request) — `46_PlatformAdmin.md` § 3.

**Acceptatiecriteria:**
1. Elk voorstel bevat het verplichte contract: titel + PR-link, trigger/waarom, gekoppelde feature requests (incl. aantal bedrijven), risicoclassificatie, overwogen alternatieven (analoog BR-703).
2. Draait als geplande agent-run (geen nieuwe Edge-Function-infrastructuur), nooit op verzoek van een tenant rechtstreeks.
3. Genereert **nooit** automatisch een high-risk-PR (migraties/RLS/auth/betalingen/secrets) — die vereisen een expliciete, on-demand trigger door de platform-eigenaar (BR-902).
4. De Product Agent mergt, deployt of pusht nooit zelf naar `main`/productie (BR-901) — uitsluitend het openen van de branch/PR.

### FR-952: Platform Admin-portal — overzicht & goedkeuring
**Fase:** los van MVP/V1/V2 | **Prio:** Must (voorwaarde voor FR-951 productiegebruik)

De platform-eigenaar ziet in een eigen portal alle Product Agent-voorstellen en feature requests, en keurt voorstellen goed of af.

**Acceptatiecriteria:**
1. Toegang uitsluitend via de platform-admin-allowlist (`46_PlatformAdmin.md` § 1.1) — geen enkele tenant-rol (Eigenaar incluis) heeft hier automatisch toegang.
2. Overzicht toont per voorstel het volledige contract uit FR-951 §1, plus status (open/goedgekeurd/afgewezen/gemerged).
3. "Goedkeuren" registreert uitsluitend dat de PR gemerged mag worden — de merge zelf is een aparte, handmatige actie buiten het portal (BR-901; § 4 `46_PlatformAdmin.md`).
4. Lege allowlist toont een expliciete waarschuwing ("geen platform-admins geconfigureerd"), nooit stilzwijgend open of stilzwijgend dicht (PA-05, `46_PlatformAdmin.md` § 5).

### FR-953: Cross-tenant operationeel overzicht (platform-zijde)
**Fase:** los van MVP/V1/V2 | **Prio:** Should

De platform-eigenaar ziet agent-rungezondheid (`agent_runs`-foutpercentages) geaggregeerd over alle bedrijven, om problemen zoals een verlopen service-role-secret proactief te signaleren in plaats van pas bij een tenant-melding.

**Acceptatiecriteria:**
1. Overzicht hergebruikt bestaande `agent_runs`-data (Sprint 7) — geen nieuwe telemetrie-infrastructuur.
2. Weergave per bedrijf én geaggregeerd platformbreed.
3. Uitsluitend zichtbaar binnen het platform-admin-portal (FR-952-toegangseis).

---

## Relaties met andere documenten

- **00_PRD.md**: § 7 (functional requirements overzicht), § 19 A-15 (ADR-011), § 19 A-23 (ADR-013)
- **07_UserStories.md**: user stories per FR
- **32_Acceptatiecriteria.md**: uitgebreide acceptatie-scenario's
- **10_BusinessRules.md**: domeinregels ondersteunend aan FR's, incl. BR-702/703, BR-900–904
- **31_Testplan.md**: test-cases per FR
- **43_AI_Agents.md**, **docs/adr/ADR-011-human-in-the-loop-ai.md**: architectuur/agents achter FR-900
- **45_AgentMemory.md**: architectuur achter FR-901/902 (Organizational Memory, feedback-loop)
- **46_PlatformAdmin.md**, **docs/adr/ADR-013-platform-admin-product-agent.md**: architectuur achter FR-950–953 (Platform Admin, Product Agent)

---

## Changelog

| Datum | Versie | Wijziging |
|---|---|---|
| 2026-07-06 | 1.0 | Volledig uitgewerkt: alle FR-001 t/m FR-102, acceptatiecriteria, validaties, edge cases |
| 2026-07-10 | 1.1 | Sprint 2-fix: FR-002-postcoderegex gecorrigeerd van `^[A-Z]{2}\d{2}\s?[A-Z]{2}$` (2 letters+2 cijfers+2 letters — matcht niet met de eigen voorbeeldwaarden "1234 AB" elders in het docset) naar `^[1-9][0-9]{3}\s?[A-Z]{2}$` (4 cijfers + 2 letters, correcte NL-postcode-vorm). 12_Entiteiten.md § 4 in dezelfde commit meegecorrigeerd. |
| 2026-07-12 | 1.2 | FR-serie 900+ toegevoegd: FR-900 (Morning Briefing), voortvloeiend uit ADR-011 (Human-in-the-Loop AI). |
| 2026-07-12 | 1.3 | FR-900 uitgebreid: Morning Briefing expliciet vastgelegd als primair startscherm (niet los overzicht); acceptatiecriteria aangevuld met de per-wijziging wat/waarom/regels/voordeel/impact-structuur en de volledige actieset (alles/individueel accepteren, aanpassen, afwijzen, doorklikken naar planner), conform de uitgebreide ADR-011 § 1. |
| 2026-07-12 | 1.4 | FR-901 (Organizational Memory bekijken/beheren) en FR-902 (AI-feedback per voorstel) toegevoegd aan FR-serie 900+, voortvloeiend uit `45_AgentMemory.md`. |
| 2026-07-16 | 1.5 | FR-serie 950+ toegevoegd: FR-950 (feature request indienen, tenant-zijde), FR-951 (Product Agent-triage & voorstellen), FR-952 (Platform Admin-portal), FR-953 (cross-tenant operationeel overzicht), voortvloeiend uit ADR-013/`46_PlatformAdmin.md`/PRD § 19 A-23. |
| 2026-07-17 | 1.6 | FR-903 toegevoegd aan § 8: AI-transparantie & -geletterdheid (`/instellingen/over-ai`), voortvloeiend uit `47_AIAct_Compliance.md` § 6.1/6.2 (EU AI Act Art. 4/50). Gebouwd. |
| 2026-07-17 | 1.7 | FR-004 AC2 verduidelijkt: "custom"-frequentie vraagt in de UI een interval in **weken** (bijv. "elke 8/12 weken"), intern nog steeds opgeslagen als dagen — corrigeert de oorspronkelijke formulering "dagpatroon", die nooit als een dag-van-de-week-patroon-builder is gebouwd. Geen schema-/DB-wijziging, geen FR-hernummering. |
| 2026-07-18 | 1.8 | FR-025 (geografische clustering, Sprint 7-vervolg): AC1/AC3 gebouwd (`lib/planning/clustering.ts` + `planning-generate`-integratie + Briefing-samenvatting), AC2/AC4 (scoringsmodel + slider) expliciet als apart, nog niet gebouwd vervolgwerk gemarkeerd — geen van de 4 BR-701-gewichten heeft nu instelbare UI. Geen FR-hernummering. |
| 2026-07-18 | 1.9 | FR-029 toegevoegd aan FR-serie 020–039: handmatige beurt-toevoeging op dag/tijdstip. Aanleiding: de automatische generatie (FR-020) dekt uitsluitend periodiek werk binnen een flexibiliteitsvenster (BR-101-Soft) — verticalen buiten glazenwassers (PRD § 5 principe 5, § 6.7) hebben vaak klanten die uitsluitend op een vaste dag/tijdstip bereikbaar zijn. Nog niet gebouwd; zie PRD § 19 A-27. |
| 2026-07-19 | 1.10 | FR-030 toegevoegd aan FR-serie 020–039: "Vul de dag" (capaciteit opvullen op een net vrijgekomen dag, spiegelbeeld van FR-024/Replanning Agent). Aanleiding: een ZZP'er die besluit een normaal vrije dag toch te werken, kan die dag nu niet laten vullen met later-geplande flexibele beurten. Zie PRD § 19 A-28. |
| 2026-07-21 | 1.11 | Strategische analyse "modulair MKB/ZZP/branche-pakket" (PRD § 19 A-33): FR-069 (direct factureren bij afronden, ZZP-versnelling) toegevoegd aan FR-serie 060–079; FR-103 (medewerker-uitnodiging/eigen inlogaccount — kritiek gat, gedocumenteerd in 22_Authenticatie.md § 8 maar nooit gebouwd) en FR-104 (branche-dienstensjabloon, al sinds PRD v1.0 gepland maar nooit gebouwd) toegevoegd aan FR-serie 100+. FR-100 (Bedrijf-instellingen) AC4/AC5 uitgebreid met bedrijfstype (MKB/ZZP) en branche-veld; FR-100 zelf blijkt nooit gebouwd (geen "Bedrijf"-tab bestaat vandaag). Geen FR-hernummering. Volledige, sprintklare uitwerking: `40_Implementatieplan.md` § Sprint 12 (nog te bouwen, wacht op gebruikersbevestiging op de module-/branche-indeling). |
| 2026-07-21 | 1.12 | Sprint 12 gebouwd: FR-069/100/103/104 gemarkeerd als ✅ gebouwd, met per-FR aantekening van de scope-cuts t.o.v. de oorspronkelijke ACs (FR-100: geen logo/primaire kleur; FR-103: eigen uitnodigen-pagina i.p.v. inline veld, geen dagen-aftelling in de statustekst; FR-104: geen onboarding-integratie, alleen vanaf Instellingen; FR-069: geen aparte bevestigingsstap, alleen een andere afrondingstoast). Geen FR-hernummering, geen AC-nummerwijziging (doorgestreepte tekst markeert wat niet zo gebouwd is, niet verwijderd). |
| 2026-07-21 | 1.13 | FR-904 toegevoegd aan FR-serie 900+ en direct gebouwd: automatiseringsniveau/confidence-drempel per agent, instelbaar op `/instellingen/ai-assistent` — sloot de "Binnenkort"-placeholder die sinds Sprint 7 op `/instellingen` stond. `decideApproval()` (lib/agents/approval-handler.ts, al sinds Sprint 7 met de volledige beslisboom) kreeg voor het eerst echte, per-bedrijf-instelbare input i.p.v. de hardcoded default. |
