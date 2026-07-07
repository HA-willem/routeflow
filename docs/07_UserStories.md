# 07 — User Stories

**Status:** DONE
**Versie:** 2.0
**Bron van waarheid:** `00_PRD.md` § 7 (Functionele Requirements) — dit document mag het PRD niet tegenspreken.
**Werkinstructie:** zie `MASTER_PROMPT.md`.
**Relaties:** 05_UserPersonas.md (rollen), 08_FunctioneleEisen.md (FR-koppeling), 32_Acceptatiecriteria.md (uitgewerkte AC's), 23_Gebruikersrollen.md (autorisatie).

---

## Doel van dit document

Dit document vertaalt de functionele requirements naar **user stories** vanuit het perspectief van de personas (05_UserPersonas.md). Elke story koppelt aan één of meer FR-nummers en een MoSCoW-prioriteit, en verwijst naar de gedetailleerde acceptatiecriteria in 32_Acceptatiecriteria.md.

Stories zijn de "waarom/voor wie" van een requirement; de FR is het "wat". Bij conflict wint het PRD, daarna de FR.

---

## 1. Conventies

**Format:**
> **US-###:** Als **\<rol\>** wil ik **\<doel\>** zodat **\<waarde\>**.
> *FR: FR-xxx · Prio: Must/Should/Could · Fase: MVP/V1/V2 · AC: → 32_Acceptatiecriteria.md*

**Rollen** (uit 05_UserPersonas.md / PRD § 4.3): Eigenaar, Planner, Administratie, Medewerker, Klant (eindklant).

**Nummering:** US-### is stabiel en volgt grofweg de FR-reeks (US-0xx klant/object, US-1xx planning, US-2xx uitvoering, US-3xx facturatie, US-4xx communicatie, US-5xx instellingen/overig). Nooit hergebruiken.

---

## 2. Epics-overzicht

| Epic | Omschrijving | Stories | Kern-FR |
|---|---|---|---|
| E1 — Klanten & Objecten | Beheer klantenkring, adressen, dienstafspraken | US-001…015 | FR-001…008 |
| E2 — Planning & AI Planner | Automatische planning, routes, herplannen | US-101…118 | FR-020…028 |
| E3 — Uitvoering (PWA) | Dagroute uitvoeren op mobiel | US-201…212 | FR-040…045 |
| E4 — Facturatie | Facturen, BTW, betalingen, herinneringen | US-301…316 | FR-060…068 |
| E5 — Communicatie | Klantberichten, notificaties | US-401…410 | FR-080…083 |
| E6 — Instellingen & Onboarding | Bedrijf inrichten, diensten, rollen | US-501…512 | FR-100…102 |

---

## 3. E1 — Klanten & Objecten

- **US-001:** Als **Eigenaar** wil ik een **klant aanmaken met naam, type en contactgegevens** zodat ik werk aan een persoon/bedrijf kan koppelen.
  *FR-001 · Must · MVP*
- **US-002:** Als **Planner** wil ik een **adres invoeren met postcode + huisnummer dat automatisch wordt aangevuld en gegeocodeerd** zodat ik het object op de route kan plannen zonder handmatig coördinaten te zoeken.
  *FR-002 · Must · MVP*
- **US-003:** Als **Planner** wil ik **meerdere objecten aan één klant koppelen** zodat een VvE of ondernemer met meerdere panden correct wordt beheerd.
  *FR-003 · Must · MVP*
- **US-004:** Als **Eigenaar** wil ik per object een **dienstafspraak met frequentie, prijs, voorkeuren en flexibiliteitsvenster** vastleggen zodat de AI Planner weet wat, hoe vaak en tegen welke prijs.
  *FR-004 · Must · MVP*
- **US-005:** Als **Eigenaar** wil ik een **dienstafspraak pauzeren en hervatten** zodat ik wintersluiting of tijdelijke stops kan verwerken zonder de klant te verwijderen.
  *FR-005 · Must · MVP*
- **US-006:** Als **Eigenaar** wil ik **klanten en objecten via CSV importeren met mapping en foutrapport** zodat ik mijn bestaande wijkboekje in één keer overzet.
  *FR-006 · Should · V1*
- **US-007:** Als **Administratie** wil ik een **klant-tijdlijn met alle beurten, facturen en berichten** zodat ik de historie in één oogopslag zie.
  *FR-007 · Should · V1*
- **US-008:** Als **Planner** wil ik **snel zoeken (⌘K) over klanten, objecten, beurten en facturen** zodat ik alles binnen twee seconden vind.
  *FR-008 · Must · MVP*

---

## 4. E2 — Planning & AI Planner

- **US-101:** Als **Planner** wil ik dat het systeem **automatisch voorgestelde beurten genereert op basis van frequenties** zodat ik nooit een klant vergeet.
  *FR-020 · Must · MVP*
- **US-102:** Als **Planner** wil ik een **dagplanning per medewerker met geoptimaliseerde rijvolgorde** zodat reistijd minimaal is.
  *FR-021 · Must · MVP*
- **US-103:** Als **Planner** wil ik **beurten verslepen tussen dagen/medewerkers met live herberekening** zodat correcties direct kloppen.
  *FR-022 · Must · MVP*
- **US-104:** Als **Planner** wil ik dat **weersgevoelige diensten een waarschuwing + herplanvoorstel** krijgen zodat ik glaswerk niet in de regen laat doen.
  *FR-023 · Must · V1*
- **US-105:** Als **Planner** wil ik dat het systeem **bij ziekte/verlof automatisch de dagroute herverdeelt en mij een diff toont** zodat ik met één klik akkoord geef.
  *FR-024 · Must · V1*
- **US-106:** Als **Planner** wil ik **geografische clustering** zodat beurten in dezelfde buurt op dezelfde dag vallen.
  *FR-025 · Must · V1*
- **US-107:** Als **Planner** wil ik **beurten kunnen vergrendelen** zodat een afspraak "klant verwacht ons dinsdag 10:00" nooit automatisch verschuift.
  *FR-026 · Must · MVP*
- **US-108:** Als **Planner** wil ik een **capaciteitswaarschuwing bij overboeking** zodat ik niet meer werk inplan dan haalbaar is.
  *FR-027 · Should · V1*
- **US-109:** Als **Planner** wil ik een **"plan week opnieuw"-knop die vergrendelingen respecteert** zodat ik na wijzigingen snel opnieuw optimaliseer.
  *FR-028 · Must · V1*
- **US-110:** Als **Planner** wil ik per voorgestelde beurt een **"waarom?"-uitleg** zodat ik de planning vertrouw en kan uitleggen.
  *FR-020/PRD § 8.5 · Must · V1*

---

## 5. E3 — Uitvoering (PWA)

- **US-201:** Als **Medewerker** wil ik mijn **dagroute in volgorde met adres, dienst, notities en verwachte tijd** zien zodat ik weet waar ik heen moet.
  *FR-040 · Must · MVP*
- **US-202:** Als **Medewerker** wil ik **met één tik navigeren naar Google/Apple Maps** zodat ik geen adres hoef over te typen.
  *FR-041 · Must · MVP*
- **US-203:** Als **Medewerker** wil ik een **beurt met één tik afronden, optioneel met notitie/foto** zodat administratie geen extra werk is.
  *FR-042 · Must · MVP*
- **US-204:** Als **Medewerker** wil ik **"niet thuis" markeren waarna de klant automatisch bericht krijgt** en de beurt naar de herplan-wachtrij gaat.
  *FR-043 · Must · V1*
- **US-205:** Als **Medewerker** wil ik **voor/na-foto's vastleggen bij de beurt** zodat er bewijs van uitvoering is.
  *FR-044 · Should · V1*
- **US-206:** Als **Medewerker** wil ik dat de app **doorwerkt bij kort netwerkverlies** zodat ik in een parkeergarage of kelder niet vastloop.
  *FR-045 · Should · V1*

---

## 6. E4 — Facturatie

- **US-301:** Als **Administratie** wil ik dat bij status `uitgevoerd` **automatisch een conceptfactuur** ontstaat zodat ik niet meer 's avonds factureer.
  *FR-060 · Must · MVP*
- **US-302:** Als **Administratie** wil ik **correcte NL-BTW en doorlopende factuurnummering** zodat ik voldoe aan de Belastingdienst.
  *FR-061 · Must · MVP*
- **US-303:** Als **Administratie** wil ik een **PDF-factuur in huisstijl** zodat het er professioneel uitziet.
  *FR-062 · Must · MVP*
- **US-304:** Als **Klant** wil ik een **betaallink + QR (iDEAL)** op de factuur zodat ik met één tik betaal.
  *FR-063 · Must · V1*
- **US-305:** Als **Administratie** wil ik facturen **per e-mail en/of WhatsApp** kunnen versturen, per klant instelbaar.
  *FR-064 · Must · V1 (e-mail MVP)*
- **US-306:** Als **Administratie** wil ik **automatische herinneringen op een instelbaar schema** zodat ik geen debiteuren mis.
  *FR-065 · Must · V1*
- **US-307:** Als **Eigenaar** wil ik **abonnementsfacturatie** zodat ik een vast maandbedrag kan hanteren.
  *FR-066 · Should · V1*
- **US-308:** Als **Administratie** wil ik dat **betaalstatus automatisch via de Mollie-webhook** wordt bijgewerkt zodat ik niets handmatig hoef af te vinken.
  *FR-067 · Must · V1*
- **US-309:** Als **Administratie** wil ik **creditfacturen en correcties met audit trail** zodat fouten netjes en controleerbaar worden hersteld.
  *FR-068 · Must · V1*

---

## 7. E5 — Communicatie

- **US-401:** Als **Klant** wil ik een **"morgen komen wij langs"-bericht** zodat ik weet dat ik iets moet vrijhouden.
  *FR-080 · Must · MVP (e-mail)*
- **US-402:** Als **Eigenaar** wil ik **berichttemplates met variabelen** aanpassen zodat de toon bij mijn bedrijf past.
  *FR-081 · Must · V1*
- **US-403:** Als **Planner** wil ik **interne notificaties** voor herplanvoorstellen, mislukte betalingen en niet-thuis-meldingen zodat ik proactief handel.
  *FR-082 · Must · V1*
- **US-404:** Als **Klant** wil ik kunnen **antwoorden "OVERSLAAN"** zodat een beurt naar de volgende cyclus schuift zonder telefoontje.
  *FR-083 · Could · V2*

---

## 8. E6 — Instellingen & Onboarding

- **US-501:** Als **Eigenaar** wil ik **mijn bedrijf inrichten** (naam, logo, kleur, KVK, BTW, IBAN) zodat facturen en berichten kloppen.
  *FR-100 · Must · MVP*
- **US-502:** Als **Eigenaar** wil ik **eigen diensttypen definiëren** (naam, duur, prijs, BTW, weersgevoeligheid) zodat het systeem bij mijn vak past — of ik nu glazenwasser of hovenier ben.
  *FR-100 / PRD § 6.7 · Must · MVP*
- **US-503:** Als **nieuwe Eigenaar** wil ik een **onboarding in 3 stappen** zodat ik binnen 15 minuten mijn eerste route plan.
  *FR-101 · Must · MVP*
- **US-504:** Als **Eigenaar** wil ik een **dashboard met omzet, openstaande facturen en planning** zodat ik in één blik weet hoe het bedrijf ervoor staat.
  *FR-102 · Must · MVP*
- **US-505:** Als **Eigenaar** wil ik **medewerkers uitnodigen met een rol** zodat ieder de juiste toegang heeft.
  *FR-100 / 22_Authenticatie.md § 8 · Must · MVP*

---

## 9. Traceerbaarheid (dekkingscheck)

Elke Must/Should-FR uit 08_FunctioneleEisen.md is gedekt door ≥ 1 story:

| FR-reeks | Gedekt door |
|---|---|
| FR-001…008 | US-001…008 |
| FR-020…028 | US-101…110 |
| FR-040…045 | US-201…206 |
| FR-060…068 | US-301…309 |
| FR-080…083 | US-401…404 |
| FR-100…102 | US-501…505 |

Ontbrekende dekking is een signaal voor 08/32 — bij nieuwe FR's hoort een nieuwe US.

---

## Changelog

| Datum | Versie | Wijziging |
|---|---|---|
| 2026-07-06 | 1.0 | Placeholder met enkele losse stories |
| 2026-07-07 | 2.0 | Volledige uitwerking: conventies, 6 epics, ~40 stories met rol/waarde/FR/prio/fase, traceerbaarheidsmatrix |
