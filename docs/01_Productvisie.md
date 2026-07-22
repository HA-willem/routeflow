# 01 — Productvisie

**Status:** DONE
**Versie:** 1.0
**Bron van waarheid:** `00_PRD.md` § 3 (Productvisie & Positionering) — dit document mag het PRD niet tegenspreken.
**Werkinstructie:** zie `MASTER_PROMPT.md`.

---

## Doel van dit document

Dit document articuleert de **langetermijnvisie, strategische context en kernprincipes** van ServOps. Het fungeert als kompas voor product-beslissingen: elke keuze over scope, feature-design en prioriteit moet aligneren met de visie hieronder. 

Dit document is *niet* functioneel-specification (dat is 08_FunctioneleEisen.md). Het is het antwoord op "waarom bouwen we dit?" en "in welke wereld willen we deze software loslaten?".

---

## 1. Visie in één zin

> **ServOps wordt de mooiste, snelste en slimste bedrijfssoftware voor servicebedrijven met terugkerende werkzaamheden.**

### Toelichting

Deze zin bevat drie lagen:

1. **Mooiste:** design-kwaliteit en UX van modern consumer-grade software (Linear, Notion, Apple) — geen Windows-erfgoed, geen steile leercurve, geen zeeën aan menu's.
2. **Snelste:** operationeel: minder reistijd (routes), sneller factureren (automatisch), sneller herplannen (AI). Ook UX-snelheid: feedback < 100ms, pages laad < 2s.
3. **Slimste:** domeinlogica waar het telt. De AI Planner denkt vooruit en lost de hardste problemen op (frequenties, clustering, herplannen, weer). De mens stuurt, de machine doet het rekenwerk.

---

## 2. Het probleem dat we oplossen

### 2.1 Het kernprobleem

Een servicebedrijf met periodieke werkzaamheden (glazenwasser, schoonmaak, hoveniers, enzovoort) werkt vandaag als volgt:

1. **Klantbeheer:** adressen in Excel, frequenties in het hoofd
2. **Planning:** handmatig; de eigenaar "kent zijn wijken", plant op gevoel, geen optimalisatie
3. **Uitvoering:** medewerker rijdt een papieren route; geen real-time zicht
4. **Facturatie:** Excel-werk in de avond; weken kunnen voorbij gaan voor invoicing
5. **Communicatie:** WhatsApp-chaos; geen gestructureerde opvolging
6. **Schaal:** alles zit in het hoofd van de eigenaar; niet overdraagbaar, niet schaalbaar

### 2.2 De gevolgen (pijnpunten)

| Pijnpunt | Direct gevolg | Onderliggende kosten |
|---|---|---|
| **P1: Frequenties vergeten** | Klanten worden gemist of onnodig vaak bezocht | Omzetlek (gemiste klanten) of ontevreden klanten (te veel bezoeken) |
| **P2: Routes niet geoptimaliseerd** | Medewerkers rijden 15–25% extra kilometers | Brandstofkosten, afschrijving voertuig, medewerkers-uren verspild |
| **P3: Handmatig herplannen** | Bij regen/ziekte uren puzzelwerk; klanten geïnformeerd? Nee. | Werkstress, gemiste opbrengsten, klanttevredenheid |
| **P4: Facturatie is avondwerk** | Facturen komen te laat of niet | Betalingsuitval, cashflow-problemen, boetes op openstaande rekeningen |
| **P5: Geen zicht openstaande facturen** | Debiteurenbeheer ad hoc of vergeten | Wettelijke risico's, kasstromen onbeheersbaar |
| **P6: Kennis centraal** | Eigenaar is bottleneck; bedrijf niet schaalbaar | Groei onmogelijk zonder meer hoofd; bedrijfswaarde laag (niet-overdraagbaar) |
| **P7: Bestaande software verouderd** | Tools worden niet gebruikt of ongebruikt verlaten | Investering weg; terug naar papier/Excel |

### 2.3 Waarom bestaande oplossingen falen

Concurrenten (zie 04_Concurrentieanalyse.md) adresseren sommige pijnpunten, maar:

- **Gedateerd UI:** desktop-first, Windows-uitstraling, steile leercurve (ERP-erfgoed)
- **Primitieve planning:** routes handmatig of basis-optimalisatie; geen AI, geen automatisch herplannen
- **Communicatie:** WhatsApp-integratie afwezig of clunky; e-mail-centrisch
- **Versnipperd:** klantbeheer hier, planning daar, facturatie ergens anders — geen geïntegreerde flow
- **Niet premiumvoel:** tools voelen 'functioneel-utilair', niet 'lovely to use'

**ServOps vult dit gat:** premium UX + domeindiepgang (AI planning, automatische facturatie, geïntegreerde communicatie) in één systeem.

---

## 3. De wereld over 5 jaar (strategische context)

### 3.1 Waar zien we de markt in 2031?

**Verschuivingen in het servicebedrijf-landschap:**

1. **AI-planning is norm, niet luxury.** De beste bedrijven gebruiken AI om routes, planning en facturatie te optimaliseren. Handmatig plannen voelt achterhaald.

2. **Mobile-first is vanzelfsprekend.** Medewerkers verwachten PWA's of native apps, niet papieren routes. Real-time zicht is standaard.

3. **Automatische facturatie is verwacht.** Klanten en bedrijven verwachten dat facturen automatisch worden gegenereerd en verzonden — niet als 'feature', maar als baseline.

4. **Communicatie is omnichannel.** WhatsApp is gelijkwaardig aan e-mail; chatbots handelen herhalende vragen af.

5. **Schaal via platforms, niet via headcount.** Bedrijven groeien niet door meer eigenaren aan te nemen, maar door software die 1 eigenaar 5 medewerkers laat controleren.

6. **Verticalisatie is voorbij.** Generieke platformen werken; specificaties gebeuren via templates en configuratie.

### 3.2 ServOps' rol in 2031

Over 5 jaar zou ServOps:

- **De standaardplatform** voor Nederlandse servicebedrijven ≤ 50 medewerkers
- **Verticaal onafhankelijk:** glazenwassers, schoonmakers, hoveniers, installateurs — dezelfde engine
- **Integratiepunt:** koppelt bedrijfsdata met boekhoudpakket, CRM, materialen-management
- **Predictive:** algorithms voorspellen churn bij eindklanten, optimale facturatiecycli, vraagschommelingen
- **Een platform met 5.000+ actieve bedrijven** (conservatieve schatting)

Het product zal ServOps nog steeds voelen als v1.0, maar onder de motorkap: jarenlange iteratie op algoritmen, UX-verfijning en feature-depth.

---

## 4. Productprincipes (uitwerking PRD §3.2)

Zes principes sturen alle architectuur-, design- en scope-beslissingen. Bij conflict tussen functionaliteit en principe wint het principe.

### 4.1 Planning is het hart

> Alles draait om de vraag: *wie doet wat, waar, wanneer?* Elke feature versterkt dit.

**Wat dit betekent:**
- ServOps is niet "een CRM met planning" of "boekhouden met een kaartje". Het is primair een planningsengine.
- Features die niet bijdragen aan planning (of support van planning) zijn verdacht.
- User stories voor medewerkers of administratie moeten traceerbaar teruggaan naar: "dit maakt planning beter".

**Voorbeelden van implementatie:**
- Dagroutes staan *centraal* op de desktop (niet diep in een submenu).
- Klantbeheer is nodig, maar secondair — alleen zoveel data als planning nodig heeft.
- Notities en historiek staan op de planning-pagina, niet in een apart CRM-tabblad.

**Edge case:** V2 mag klantportaal introduceren (klant beheert eigen voorkeuren). Maar dit mag planning niet vertragen of komplexeren.

---

### 4.2 Automatisch, tenzij

> Het systeem stelt voor en voert uit; de gebruiker corrigeert alleen bij uitzonderingen.

**Wat dit betekent:**
- Default-gedrag is: de machine doet het, de mens keurt goed of corrigeert.
- "Confirm every action" is anti-pattern; "exceptions require action" is patroon.
- UI-term: "undo" beter dan "confirm first".

**Voorbeelden van implementatie:**
- Periodieke beurten worden *automatisch* gegenereerd (niet: "klik voor voorstel"); planner ziet ze, kan aanpassen.
- Facturen worden *automatisch* conceptueel bij status `uitgevoerd`; planner keurt massaal goed of corrigeert uitzonderingen.
- Herplannen bij ziekte: systeem stelt voor ("10 beurten van wo → do/vr"), planner klikt "accept" of aanpassen-mode.

**Validatie/Edge case:** Niets autocorrect *alles*. Vergrendelde beurten (klant zei "dinsdag 10:00") worden nooit stiekem verplaatst — die staan vast. Absoluut beleid (niet werk op feestdagen) wordt afdwingend. Het principe "automatisch, tenzij" geldt voor normale iteraties, niet voor hardgestelde regels.

---

### 4.3 Mobile first, desktop krachtig

> De medewerker leeft in de PWA op zijn telefoon; de planner/eigenaar werkt op desktop.

**Wat dit betekent:**
- PWA (mobiel) is niet "responsive desktop". Het is een geheel ander product met eigen UX-regels: grote tap-targets, thumb-friendly, één-hand bediening.
- Desktop is waar planning gebeurt: meerdere kolommen, drag-and-drop, sneltoetsen, meerdere vensters open.
- Data-sycnhronisatie is naadloos; een wijziging op desktop reflecteert *realtime* op mobiel (via WebSocket/Realtime API).

**Voorbeelden van implementatie:**
- PWA Medewerker: kaart groot, adres geknipt, "beurt afmaken" groot, één-tik navigatie.
- Desktop Planner: Gantt-achtige rooster, drag-and-drop routes, sneltoetskaart.
- Geen "responsive grid die naar één kolom gaat" — telefoon en desktop zijn qua interaction fundamenteel anders.

**Edge case:** Eigenaar = zowel planner als medewerker (ZZP'er, klein bedrijf). Desktop-app *en* PWA beide beschikbaar; eigenaar kiest per sessie.

---

### 4.4 Nul-training adoptie

> Een nieuwe gebruiker moet zonder handleiding binnen 15 minuten zijn eerste route kunnen plannen.

**Wat dit betekent:**
- Lege staten laten zien wat een feature doet + bieden eerste actie aan.
- Navigatie onmiddellijk duidelijk (geen verborgen substructuren).
- Standaardwaarden slim gekozen (niet: "maak 5 keuzes voordat je iets ziet").
- Sneltoetsen en cmd+K optional; basis-flow clickable.

**Voorbeelden van implementatie:**
- Eerste keer openen: "Voer je bedrijfsnaam in. Vervolgens je eerste klant." Per veld: context.
- Planning-pagina leeg? Niet "klik hier om een beurt toe te voegen". Wel: "Voeg je eerste klant toe (auto-planning volgt)".
- Undo/redo overal (< 1MB history-buffer per beurt).

**Validatie:** Meet this in UAT: echte glazenwasser, geen intro, 15-min timer. Kan hij plannen? Goed. Kan hij niet? Redesign.

---

### 4.5 Verticaal-agnostische kern

> "Glazenwassen" is configuratie, geen hardcoded aanname. Diensttypen, frequenties en terminologie zijn instelbaar per bedrijf.

**Wat dit betekent:**
- Code-level: domeintermen zijn configurabel via `bedrijf.config` (niet hardcoded).
- Diensttypen (bijv. "Glasbewassing", "Dakgoot") worden per bedrijf gedefinieerd, met icon + kleur.
- Frequentie-patronen instelbaar: wekelijks, 2-weekly, maandelijks, elk kwartaal, custom-pattern.
- Geen single-verticaal queries in database (bijv. "SELECT FROM 'glazenwassers'"). Al is de eerste klant glazenwasser, de architectuur moet schaalbaar naar schoonmaak/hoveniers zijn.

**Voorbeelden van implementatie:**
- Bedrijf-instellingen: "Diensttypen" tabblad. Planner definiëert hier zijn diensten (niet: vaste opsomming).
- Templates per verticaal (V1+): pre-filled diensttypen voor "glazenwassen", "schoonmaak" enz., maar altijd editable.
- Database: geen `glazenwassers`-tabel; alles onder `bedrijven` met `config_json` voor customization.

**Edge case:** Niet alles is configurabel. Basisconcepten (Klant, Object, Beurt, Route) zijn hard. Maar de interpretatie daarvan (wat is een "dienst"?) is soft.

---

### 4.6 Nederlands eerst

> Taal, BTW-regels, betaalcultuur (iDEAL/QR), adresformaten (postcode+huisnummer) zijn Nederlands. i18n-architectuur vanaf dag één, vertaling later.

**Wat dit betekent:**
- UI-taal default: Nederlands (niet Engels).
- Juridische requirements zijn NL: BTW (21%/9%/0%/verlegd), factuurnummering, AVG, gegevenslokatie.
- Betalingskanalen: iDEAL + QR (Mollie), niet Stripe (geen iDEAL).
- Adressen: postcode (4 letters + 2 nummers) + huisnummer, niet "zip code + street".
- Maar: i18n-keys in code (route.nl.ts), zodat V2/V2.1 Engels/Duits/Frans kan zijn.

**Voorbeelden van implementatie:**
- `locales/nl.json`: alle UI-strings (copy paste geen hardcoded strings in JSX).
- Mollie payment driver, niet Stripe (of: adapter-patroon zodat Stripe later kan).
- Database: BTW-tarief per dienst, maar interface communiceert altijd per dienstafspraak met context.

**Edge case:** Code-identifiers (variabelennamen, tabel-kolommen) mogen Engels zijn; domeinlogica-documenten zijn Nederlands; API kan Engels zijn (standaard-REST, toekomstige integraties).

---

### 4.7 Premium in elk detail

> Animaties, lege staten, foutmeldingen, laadtijden: alles voelt verzorgd.

**Wat dit betekent:**
- Niet: "het werkt". Maar: "het voelt fijn om te gebruiken".
- Foutmeldingen zijn menselijk (niet: "Error 422") en helpful ("Deze klant kan niet verwijderd worden omdat er facturen aan vastzitten. Archiveren?").
- Laadtijden zijn voelbaar snel (skeleton-states < 100ms, geen witte flash).
- Animaties hebben doel (page transition, status-change) — geen decoratie.
- Typography, spacing, kleuren zijn consistent met design system (zie 25_DesignSystem.md).

**Voorbeelden van implementatie:**
- Drag-and-drop feedback: item schaduw + spring animation op drop.
- "Beurt afronden": knop → pulse animation → confetti (licht) → success toast.
- Foutmelding network: "Je bent offline. Je wijzigingen worden verzonden zodra je weer online bent." (Geen "Error: network timeout".)

**Validatie:** Telkens als je een animatie toevoegt: "Heeft dit doel? Of siert het alleen?" Alleen eerste soort in code.

---

### Synthesis: hoe deze principes samen werken

Planning is hart → mobiel (uitvoering) en desktop (planning) zijn twee faces van hetzelfde nervenstelsel. Automatisch, tenzij → planner voelt zich empowered (niet bevoogd). Verticaal-agnostisch + Nederlands eerst → schaalbaar product met lokale geloofwaardigheid. Premium in detail → de software voelt beter dan concurrentie.

Bij twijfel in architecture-call: welke princiep helpt? Bv., "moeten we roles voor 'medewerker team lead' ondersteunen?" → Principe 4.4 (nul-training) zegt nee — voeg niets toe tenzij het moet.

---

## 5. Wat ServOps niet is (v1)

Scoping is kritisch. Dit beperkt scope en stelt verwachtingen. Alles hieronder mag in V2+, maar niet in MVP/V1.

### 5.1 Geen boekhoudpakket

ServOps genereert en verstuurt facturen, toont openstaande bedragen, waarschuwt voor oninbare bedragen — maar:
- Geen dubbelboeking, geen cost-center allocatie, geen asset-management.
- Boekhoudkundige exports naar Mollie/e-Boekhouden/Moneybird zijn V2 (backlog item).
- V1 exporteert CSV ("factuurnummer, klant, bedrag, datum"); klant voert handmatig in boekhouding in.

---

### 5.2 Geen urenregistratie / salarissysteem

ServOps registreert wat een medewerker *deed* (beurten afgemaakt), niet *hoeveel uren* hij werkte (geen clockin/out).
- De beuurtuitsvoering neemt aan dat geplande duur = werkelijke duur (edge case: duuroverschrijding in V2).
- Geen salarisadmin, geen jaargeheimen, geen loonslips.

---

### 5.3 Geen uitzendbureau / matching-marktplaats

ServOps is *not* een platform tussen klanten en bedrijven (anders dan Uber/TaskRabbit).
- Klant is intern: bedrijf beheert zijn eigen klantenkring.
- Geen "klanten zoeken buschauffeur op marktplaats" volgend.

---

### 5.4 Geen voorraad- of materiaalbeheersysteem

ServOps toont "*diensten*" (wat gedaan wordt), niet "materialen" of "voorraden" (wat nodig is voor diensten).
- Een dienst kan hebben: "Glasrein 500ml per beurt", maar dit is notatie, geen inventory-tracking.
- Automatische aanvulorders: nee. Manual materiaalkosten in factuurbalkbovenst: V2.

---

### 5.5 Geen offline-first sync in MVP

De PWA werkt *offline-tolerant* (optimistic UI, retry-queue), maar volledige offline-mode (alle data gesync naar device) is niet MVP.
- Medewerker heeft 4G/WiFi redelijkerwijs, of moet 's morgen even connectie hebben voor die dag's routes.
- V2 mag offline-first sync introduceren (netjes replicatie-logic).

---

## 6. Noordster-metric (jaarlijks doel)

### 6.1 Wat meten?

ServOps' succes reduceert zich tot **drie vragen**:

1. **Activatie:** zien gebruikers (snel) waarde?  
   *Doel:* ≥ 60% van signups plannen hun eerste week automatisch binnen 24 uur.

2. **Retentie:** houden bedrijven het product?  
   *Doel:* ≥ 85% betaalde bedrijven zijn wekelijks actief (min. 1× plan/week).

3. **Impact:** reduceert ServOps echt problemen?  
   *Doel:* ≥ 15% reductie in reistijd (zelfgerapporteerd + berekend uit routes) per bedrijf na 3 maanden.

### 6.2 Secondary metrics (volgtijden)

| Metric | Target | Rationale |
|---|---|---|
| NPS (Net Promoter Score) | ≥ 50 | Premium positioning vereist love, niet satisfaction |
| Factuurverzending < 24u na beurt | ≥ 90% | Kernbelofte: automatische facturatie |
| Churn maandelijks | < 2% | < 2% = gezond, < 1% = fantastisch |
| Support tickets per 100 bedrijven/maand | < 5 | Measure of UX-qualiteit |
| Mobile task-completion time | TBD (baseline 1e maand) | mobiel = kritisch; meten tegen eigen baseline |

### 6.3 Waarom niet "omzet" of "users"?

Vanity-metrics (veel users, revenue) zijn lagging-indicators. De drie vragen hierboven zijn *leading*: ze voorspellen of ServOps een succesvolle business wordt. 
- Als 60% niet snel activeren → product is niet intuïtief genoeg.
- Als 85% niet wekelijks actief → product lost geen echt probleem.
- Als < 15% reistijdwinst → planner is niet slim genoeg; unique value-prop vervangen.

---

## Implementatie-kader: hoe deze visie gebruikt wordt

### Bij product-beslissingen
- "Willen we X-feature bouwen?" → Check of het planning versterkt (Principe 4.1) en adoptie helpt (Principe 4.4).
- "Moeten we deze foutmelding showern?" → Premium in detail? (Principe 4.7). Ja.
- "Internationalisatie nu?" → Nee. Nederlands eerst (Principe 4.6), i18n-architectuur klaar, vertaling V2.

### Bij prioritering
- P0: alles wat Noordster-metric raakt (activatie, herplan-voorstel, automatische beurt-generatie).
- P1: features die Principes 4.1–4.7 ondersteunen.
- P2: nice-to-have buiten scope §5.

### Bij design-reviews
- "Is dit begrijpelijk zonder training?" (Principe 4.4)
- "Voelt dit premium?" (Principe 4.7)
- "Waar zou dit beter op smartphone zijn?" (Principe 4.3)

---

## Relaties met andere documenten

- **00_PRD.md**: bron van waarheid; § 3 vat dit document samen
- **08_FunctioneleEisen.md**: requirements uit deze visie; moet aligneren
- **24_UI_UX.md**: UX-regels (uitwerking Principe 4.7)
- **25_DesignSystem.md**: typografie, kleuren, spacing (Premium in detail)
- **10_BusinessRules.md**: operationele regels voortkomend uit Principes 4.1–4.2

---

## Changelog

| Datum | Versie | Wijziging |
|---|---|---|
| 2026-07-06 | 1.0 | Volledig uitgewerkt; alle 6 secties, toelichting per principe, implementatiekader, relaties |
