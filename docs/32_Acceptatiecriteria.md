# 32 — Acceptatiecriteria

**Status:** DONE
**Versie:** 2.0
**Bron van waarheid:** `00_PRD.md` § 7 — dit document mag het PRD niet tegenspreken.
**Werkinstructie:** zie `MASTER_PROMPT.md`.
**Relaties:** 08_FunctioneleEisen.md (FR's), 07_UserStories.md (US's), 31_Testplan.md (verificatie), 10_BusinessRules.md (BR's).

---

## Doel van dit document

Dit document bevat de **toetsbare acceptatiecriteria (AC)** per functionele requirement, in **Gherkin-stijl** (Gegeven/Wanneer/Dan). Een feature is "klaar" wanneer al zijn AC's aantoonbaar slagen (koppeling naar tests in 31_Testplan.md). Waar 08 de requirement beschrijft, maakt dit document elke conditie expliciet, inclusief validaties, foutpaden en edge cases.

**Conventie:** AC-\<FR\>.\<n\>. Nummering stabiel.

---

## 1. Klanten & Objecten

### FR-001 — Klant aanmaken
- **AC-001.1** — Gegeven ingevulde verplichte velden (naam, type), wanneer ik opsla, dan wordt de klant aangemaakt en zie ik zijn detailpagina + toast "Klant aangemaakt".
- **AC-001.2** — Gegeven een ongeldig e-mailformaat, wanneer ik opsla, dan toont het e-mailveld inline "Voer een geldig e-mailadres in" en wordt niet opgeslagen.
- **AC-001.3** — Gegeven een e-mail die al bestaat binnen mijn bedrijf, wanneer ik opsla, dan verschijnt "Deze e-mail is al in gebruik".
- **AC-001.4** — Gegeven type = zakelijk zonder KVK, wanneer ik opsla, dan wordt KVK gevraagd (of toegestaan met waarschuwing, per instelling).
- **AC-001.5** — Gegeven een klant zonder e-mail én zonder mobiel, wanneer ik opsla, dan waarschuwt het systeem "klant kan geen meldingen ontvangen" maar staat opslaan toe.

### FR-002 — Adres + geocoding
- **AC-002.1** — Gegeven postcode "1234 AB" + huisnummer "42", wanneer ik het veld verlaat, dan worden straat/plaats en lat/lng automatisch ingevuld en verschijnt een pin op de kaart.
- **AC-002.2** — Gegeven een niet-vindbaar adres, wanneer geocoding faalt, dan toont het veld "Dit adres kunnen we niet vinden…" met knop "Handmatig plaatsen".
- **AC-002.3** — Gegeven ongeldige postcode-notatie, wanneer ik het veld verlaat, dan inline-fout met verwacht formaat.
- **AC-002.4** — Gegeven handmatig geplaatste pin, wanneer ik opsla, dan `location_status='manual'` en het object is routeerbaar.

### FR-004 — Dienstafspraak
- **AC-004.1** — Gegeven dienst + frequentie + prijsafspraak, wanneer ik opsla, dan wordt de dienstafspraak actief en wordt de eerste beurt gegenereerd.
- **AC-004.2** — Gegeven een lege verplichte combinatie (bv. frequentie zonder prijs), wanneer ik opsla, dan wordt de ontbrekende invoer aangewezen.
- **AC-004.3** — Gegeven flexibiliteitsvenster leeg, wanneer ik opsla, dan wordt default ±3 werkdagen toegepast.

### FR-005 — Pauzeren/hervatten
- **AC-005.1** — Gegeven een actieve afspraak, wanneer ik pauzeer tot datum X, dan worden alle toekomstige niet-vergrendelde beurten geannuleerd (BR-030/501).
- **AC-005.2** — Gegeven een gepauzeerde afspraak, wanneer ik hervat, dan wordt de volgende beurt opnieuw gegenereerd vanaf stopdatum + interval.

### FR-008 — Zoeken (⌘K)
- **AC-008.1** — Wanneer ik ⌘K indruk, dan opent het palette met focus op het zoekveld.
- **AC-008.2** — Gegeven een zoekterm, dan verschijnen resultaten per categorie met preview binnen ~1s.
- **AC-008.3** — Gegeven ik geen recht heb op facturen, dan verschijnen factuur-resultaten niet.

---

## 2. Planning & AI Planner

### FR-020 — Automatische beurt-generatie
- **AC-020.1** — Gegeven actieve dienstafspraken, wanneer generatie draait, dan bestaan er voorgestelde beurten voor de komende 12 weken met status `voorgesteld`.
- **AC-020.2** — Ideale datum = laatste `uitgevoerd` + interval (BR-100), niet de geplande datum.

### FR-022 — Drag-and-drop
- **AC-022.1** — Wanneer ik een beurt naar een andere dag sleep, dan herberekenen beide routes binnen 2s en schuiven de tijden zichtbaar.
- **AC-022.2** — Gegeven een vergrendelde beurt, dan is deze niet sleepbaar (anker-icoon).
- **AC-022.3** — Gegeven de doeldag zou > 8,5u worden, dan wordt de drop geweigerd met uitleg en teruggedraaid.
- **AC-022.4** — Na een drop is "Ongedaan maken" beschikbaar.

### FR-026 — Vergrendelen
- **AC-026.1** — Gegeven een vergrendelde beurt, wanneer ik "plan opnieuw"/herplan draai, dan blijft die beurt op zijn plaats (BR-200).

### FR-023 — Weer
- **AC-023.1** — Gegeven regen-voorspelling op een dag met regen-gevoelige diensten, dan verschijnt een weerwaarschuwing met aantal getroffen beurten.
- **AC-023.2** — Wanneer ik het herplanvoorstel accepteer, dan worden de betrokken beurten verplaatst en klanten geïnformeerd.

---

## 3. Uitvoering (PWA)

### FR-040 — Dagroute
- **AC-040.1** — Gegeven ik ben medewerker met beurten vandaag, wanneer ik de PWA open, dan zie ik mijn beurten in geoptimaliseerde volgorde met adres/dienst/verwachte tijd.
- **AC-040.2** — Gegeven de planner wijzigt mijn route, dan wordt mijn scherm live bijgewerkt.

### FR-042 — Afronden
- **AC-042.1** — Wanneer ik "Gereed" tik, dan wordt de status `uitgevoerd` met timestamp en verschijnt een conceptfactuur.
- **AC-042.2** — Optioneel toegevoegde notitie/foto wordt opgeslagen bij de beurt.

### FR-043 — Niet thuis
- **AC-043.1** — Wanneer ik "Niet thuis" markeer, dan wordt de status `niet_thuis`, loopt de frequentieteller niet door (BR-015) en gaat de beurt naar de herplan-wachtrij.
- **AC-043.2** — Gegeven de klant heeft opt-in, dan ontvangt hij automatisch een bericht.

### FR-045 — Offline
- **AC-045.1** — Gegeven geen netwerk, wanneer ik een beurt afvink, dan toont de UI optimistisch "gereed" en staat de mutatie in de retry-queue.
- **AC-045.2** — Wanneer verbinding terugkeert, dan wordt de queue automatisch verwerkt; de queue overleeft app-herstart.

---

## 4. Facturatie

### FR-060/061 — Conceptfactuur & BTW
- **AC-060.1** — Gegeven een beurt `uitgevoerd`, dan bestaat een conceptfactuur (of regel op verzamelfactuur) volgens klant-instelling.
- **AC-061.1** — BTW wordt correct per dienst berekend (21/9/0/verlegd); bedragen excl./BTW/incl. kloppen.
- **AC-061.2** — Factuurnummers zijn doorlopend en gap-loos per bedrijf per jaar (BR-300).

### FR-062/063 — PDF & betaling
- **AC-062.1** — De PDF bevat alle Belastingdienst-verplichte velden en de huisstijl (logo/kleur).
- **AC-063.1** — Gegeven finalisering, dan bevat de factuur een werkende iDEAL-betaallink + QR.

### FR-067 — Webhook
- **AC-067.1** — Gegeven een geslaagde betaling, wanneer de Mollie-webhook binnenkomt (geverifieerd), dan wordt de status `betaald` en de planner genotificeerd.
- **AC-067.2** — Een webhook met ongeldige signature wordt afgewezen; duplicaten zijn idempotent.

### FR-068 — Creditfactuur
- **AC-068.1** — Gegeven een gefinaliseerde factuur, wanneer ik crediteer, dan ontstaat een gekoppelde creditfactuur en blijft het origineel ongewijzigd (BR-301).

---

## 5. Communicatie

### FR-080 — Aankondiging
- **AC-080.1** — Gegeven beurten gepland voor morgen, wanneer de cron om 18:00 draait, dan ontvangen de betrokken klanten (met opt-in) een aankondiging via hun voorkeurskanaal.
- **AC-080.2** — Gegeven een klant heeft aankondigingen uitgeschakeld, dan ontvangt hij niets.

### FR-064 — Verzendkanaal & fallback
- **AC-064.1** — Gegeven kanaal WhatsApp maar geen opt-in/approved template, dan valt de verzending terug op e-mail (19 § 8) en wordt dit gelogd.

---

## 6. Instellingen & Onboarding

### FR-101 — Onboarding
- **AC-101.1** — Een nieuwe eigenaar kan zonder handleiding binnen 15 minuten via 3 stappen zijn eerste route plannen.
- **AC-101.2** — Na afronden laadt de planning met een voorstel voor de eerste week.

### FR-100 — Diensten (verticaal-agnostisch)
- **AC-100.1** — Een bedrijf kan eigen diensttypen definiëren; nergens is "glazenwasser" een verplichte aanname (PRD § 6.7).

---

## 7. Dekking & onderhoud

Elke Must-FR heeft ≥ 1 AC; elke AC is herleidbaar naar een test in 31_Testplan.md. Nieuwe/aangepaste FR's vereisen bijgewerkte AC's vóór "klaar". Ontbrekende AC-dekking blokkeert de Definition of Done van de betreffende feature.

---

## Changelog

| Datum | Versie | Wijziging |
|---|---|---|
| 2026-07-06 | 1.0 | Placeholder met één voorbeeld-FR |
| 2026-07-07 | 2.0 | Volledige uitwerking: Gherkin-AC's voor de kern-FR's over 6 domeinen (incl. validaties, foutpaden, edge cases), dekking/onderhoudsregel |
