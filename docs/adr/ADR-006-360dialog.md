# ADR-006: 360dialog als WhatsApp Business Solution Provider

- **Status:** Accepted
- **Datum:** 2026-07-07
- **Beslisser:** Chief Software Architect (RouteFlow) — bekrachtigd door productbeslissing A-08
- **Bron van waarheid:** `00_PRD.md` § 19 (A-08)
- **Gerelateerd:** ADR-007 (Provider Adapter Pattern); 19_WhatsApp.md, 21_Notificaties.md, 36_Security.md

---

## Context

WhatsApp is het communicatiekanaal waarmee RouteFlow zich onderscheidt van vakpakketten (PRD § 2.3, § 10). Het gaat live in **V1** (e-mail is MVP-first). Berichten (aankondiging, niet-thuis, factuur, herinnering, bevestiging) lopen via de officiële **WhatsApp Business Cloud API**, altijd via een erkende BSP (Business Solution Provider). AVG/EU-hosting is vereist (NFR-401/402).

## Probleem

Welke BSP geeft ons **directe, laag-lock-in-toegang** tot de Meta Cloud API tegen voorspelbare kosten, met EU-hosting en Nederlandse/EU-support, passend bij een klein, kostenbewust team?

## Gekozen oplossing

**360dialog** als BSP voor V1, achter de **messaging-adapter** (ADR-007). Praktisch betekent dit: 360dialog provisioneert het WhatsApp-nummer en de goedkeuring, terwijl RouteFlow rechtstreeks tegen de **Meta Cloud API** praat (19 § 1.3).

- Flat-fee-abonnement (~€49/mnd) zonder per-bericht-markup + Meta-tarief pass-through.
- EU-hosting, GDPR-first bedrijfsvoering (Duitsland).
- Templates/nummer zijn Meta-eigendom → portabel bij BSP-wissel.

## Alternatieven

| Alternatief | Voordeel | Waarom niet (nu) |
|---|---|---|
| **Twilio** | Zeer volwassen, kan e-mail/SMS/WhatsApp consolideren | Duurder per bericht (opslag bovenop Meta-fee); meer lock-in via Twilio-abstractielaag; Engelstalige support |
| **MessageBird (Bird)** | NL/Amsterdam HQ, lokale support | Markup per bericht; recente "Bird"-rebrand gaf API-onduidelijkheid/churn |
| **Rechtstreeks bij Meta (geen BSP)** | Geen tussenpartij | Meta vereist doorgaans een BSP voor onboarding/nummerbeheer op onze schaal; hogere zelfbouw-last |

## Consequenties

**Positief**
- Voorspelbare, lage vaste kosten passend bij kleine servicebedrijven als doelgroep (PRD § 4).
- Laagste lock-in van de opties: we spreken de *native* Cloud API, niet een BSP-specifieke abstractie.
- EU/GDPR-fit sluit aan bij AVG-eisen (36 § 8).

**Negatief / risico's**
- WhatsApp-only (geen gebundelde SMS/e-mail zoals Twilio) — geen probleem, want e-mail loopt via een eigen provider (Resend, 21).
- Business-verificatie bij Meta kost doorlooptijd (operationele onboarding, niet architecturaal).

**Mitigaties**
- Alle verzending via `MessagingProvider`-interface (ADR-007); BSP-wissel raakt alleen de adapter-implementatie.
- E-mail-fallback bij elke WhatsApp-fout (19 § 8) — functionele continuïteit nooit afhankelijk van één kanaal.
- Opt-in/opt-out en audit-logging afgedwongen ongeacht BSP (BR-600/601).

## Waarom deze keuze toekomstbestendig is

Omdat we tegen de **native Meta Cloud API** praten en 360dialog vooral het nummer/de goedkeuring faciliteert, zijn templates en het WhatsApp-nummer Meta-eigendom en dus portabel. Een latere overstap naar Twilio of een andere BSP (bijvoorbeeld bij internationale expansie, ADR-010/39_Toekomstvisie) is een adapter-vervanging, geen herbouw van de communicatielaag. De flat-fee-structuur schaalt bovendien voorspelbaar mee met berichtvolume, wat aansluit op het expliciete kostenrisico uit PRD § 18. Dit maakt 360dialog een lage-lock-in, kostenbewuste keuze die meegroeit van MVP-achtige volumes tot duizenden bedrijven.

## Referenties

- PRD § 10, § 18, § 19 (A-08)
- 19_WhatsApp.md, 21_Notificaties.md, 36_Security.md
