# ADR-009: PWA-architectuur voor de medewerker-uitvoering

- **Status:** Accepted
- **Datum:** 2026-07-07
- **Beslisser:** Chief Software Architect (RouteFlow) — bekrachtigd door productbeslissing A-05
- **Bron van waarheid:** `00_PRD.md` § 19 (A-05: PWA i.p.v. native apps t/m V1), § 11.8
- **Gerelateerd:** ADR-001 (Next.js), ADR-002 (Supabase); 20_PWA.md, 29_MobieleApp.md, 09_NietFunctioneleEisen.md (NFR-9xx)

---

## Context

Medewerkers voeren hun dagroute uit op de mobiele telefoon: navigeren, afvinken, foto's, "niet thuis" (PRD § 7.3, § 11.8). Dit moet **mobile-first**, met grote tap-targets en duimzone-bediening (29), en robuust zijn tegen kortstondig netwerkverlies (FR-045). RouteFlow bouwt met een klein team en wil niet vanaf dag één twee losse native-codebases (iOS + Android) onderhouden.

## Probleem

Hoe leveren we een medewerkerservaring die aanvoelt als een geïnstalleerde app, offline-tolerant is, en push-achtige signalen kan geven — zonder de ontwikkel- en releasecomplexiteit van native apps, in een fase waarin snelheid van iteratie cruciaal is?

## Gekozen oplossing

**Progressive Web App (PWA)** bovenop de bestaande Next.js-codebase (ADR-001), geïnstalleerd via "Add to Home Screen", met:

- **Service worker** met gedifferentieerde caching-strategie: app-shell (stale-while-revalidate), statische assets (cache-first), API-data (network-first met cache-fallback) (20 § 2).
- **Offline-tolerante mutaties**: optimistic UI + IndexedDB-**retry-queue** die app-herstart overleeft (20 § 3, FR-045) — expliciet géén volledige offline-first sync-engine in MVP/V1 (PRD § 3.4).
- **Web Push** voor urgente meldingen, met in-app inbox als altijd-beschikbare fallback (20 § 4, iOS-beperkingen erkend).
- Eigen, mobiel-specifieke schermen/componenten (29), geen geschaalde desktop-UI (PRD § 11.8).

## Alternatieven

| Alternatief | Waarom niet (nu) |
|---|---|
| **Native apps (Swift/Kotlin of React Native)** | Twee (of een hybride) codebases, appstore-review-cycli, hogere kosten — disproportioneel voor MVP/V1; expliciet uitgesteld (A-05) |
| **Reguliere responsive website (geen PWA)** | Geen installeerbaarheid, geen offline-tolerantie, voelt niet als "eigen app" — schendt PRD § 11.8 |
| **Volledige offline-first sync-engine (V1 al)** | Grote engineering-investering or conflict-resolutie; PRD scopet dit bewust naar V2 (§ 3.4) |
| **Hybride shell (Capacitor/Cordova om de PWA)** | Voegt appstore-overhead toe zonder nu aantoonbare meerwaarde; blijft optie bij heroverweging (A-05, BL-009) |

## Consequenties

**Positief**
- Eén codebase (Next.js) voor desktop én mobiele uitvoering; snelle iteratie zonder appstore-review.
- Installeerbaar, full-screen, met offline-tolerantie — dekt de kernbehoefte van de medewerker (Persona Jeroen, 05).
- Web Push geeft appachtige signalering zonder native ontwikkelkosten.

**Negatief / risico's**
- iOS heeft beperkingen (web-push vereist iOS 16.4+ én installatie; geen `beforeinstallprompt`).
- Geen toegang tot sommige native hardware-API's (diepere GPS-achtergrondtracking, native camera-integraties) t.o.v. native apps.
- Geen offline-first sync: medewerker heeft minimaal 1×/dag connectiviteit nodig (20 § 3.3, expliciete MVP-grens).

**Mitigaties**
- iOS-specifieke installatie-hint en in-app-inbox-fallback (20 § 1/§ 4).
- Grenzen expliciet gedocumenteerd i.p.v. stilzwijgend aangenomen (20 § 3.3, FR-045 scope).
- Heroverweging native apps is een expliciet backlog-item (A-05, BL-009) na V1-evaluatie, geen gesloten deur.

## Waarom deze keuze toekomstbestendig is

De PWA-keuze is expliciet **tijdelijk en herzienbaar** gemaakt (A-05: "t/m V1"): het product wordt zo gebouwd dat het bewijs van waarde (adoptie, retentie, NPS — 01 § 6) eerst geleverd wordt met de goedkoopste, snelst itereerbare mobiele aanpak. Omdat de PWA op dezelfde Next.js-codebase en design system (25/26) draait als de desktop-app, blijft de investering in componenten en domeinlogica behouden als later alsnog native apps worden overwogen (Capacitor-wrap of volledige native herbouw) — de UI-laag is vervangbaar, de business-logica (Edge Functions, RLS, adapters) niet. Dit past bij de bredere architectuurfilosofie: bewijs eerst met de lichtste aanpak, houd de zwaardere opties open zonder ze nu te bouwen.

## Referenties

- PRD § 3.4, § 11.8, § 19 (A-05)
- 20_PWA.md, 29_MobieleApp.md, 09_NietFunctioneleEisen.md (NFR-902/904)
