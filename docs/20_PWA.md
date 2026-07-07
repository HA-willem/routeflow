# 20 — PWA (Progressive Web App)

**Status:** DONE
**Versie:** 2.0
**Bron van waarheid:** `00_PRD.md` § 3.4, § 5, § 13, A-05 (PWA i.p.v. native t/m V1) — dit document mag het PRD niet tegenspreken.
**Werkinstructie:** zie `MASTER_PROMPT.md`.
**Relaties:** 29_MobieleApp.md (schermen), 21_Notificaties.md (web-push), 08_FunctioneleEisen.md (FR-045 offline), 09_NietFunctioneleEisen.md (NFR-902/904).

---

## Doel van dit document

Dit document beschrijft de **PWA-strategie**: installatie, offline-tolerantie, caching, web-push en updates. RouteFlow is **PWA-first voor mobiel** (A-05); native apps zijn expliciet buiten scope t/m V1 (heroverweging bij V2). De PWA is de leefomgeving van de Medewerker (PRD § 3.2).

**Belangrijk onderscheid (PRD § 3.4 / § 13):** MVP levert een **offline-tolerante** PWA (optimistic UI + retry-queue), **geen** volledige offline-first synchronisatie-engine. Dat laatste is V2.

---

## 1. Installatie (Add to Home Screen)

- **Manifest** (`manifest.webmanifest`): naam, iconen (maskable), `display: standalone`, thema-/achtergrondkleur (tokens uit 25), `start_url: /m`.
- **Installatie-prompt:** proactief aangeboden aan Medewerkers na eerste succesvolle login (custom "Installeer RouteFlow"-hint, niet de rauwe browserprompt).
- **iOS:** Safari "Zet op beginscherm" (geen `beforeinstallprompt`); instructiehint tonen op iOS.
- **Resultaat:** full-screen app zonder adresbalk, eigen icoon op homescreen.

---

## 2. Service Worker & caching

Strategie per resource-type:

| Resource | Strategie | Reden |
|---|---|---|
| App-shell (HTML/CSS/JS) | Precache + **stale-while-revalidate** | Snel starten, achtergrond-update |
| Statische assets (iconen, fonts) | Cache-first | Zelden gewijzigd |
| API-data (routes, beurten) | **Network-first met cache-fallback** | Verse data indien online; laatst bekende offline |
| Mutaties (afvinken, foto) | **Background sync / retry-queue** (§ 3) | Mogen niet verloren gaan |
| Kaarttegels (Mapbox) | Beperkte cache (licentie/opslaggrens) | Kosten/voorwaarden |

Tooling: Workbox-achtige service worker (via Next.js PWA-setup). App-shell < 2s TTI op 4G (NFR-101).

---

## 3. Offline-tolerantie (FR-045)

### 3.1 Gedrag
- **Lezen offline:** laatst gesynchroniseerde dagroute blijft zichtbaar (network-first fallback naar cache).
- **Schrijven offline:** een beurt afvinken/notitie/foto wordt lokaal opgeslagen (IndexedDB) en in een **retry-queue** gezet; UI toont optimistic "gereed" met sync-indicator.
- **Herverbinden:** queue wordt automatisch verwerkt (background sync), max 3 pogingen met backoff; bij falen → duidelijke melding.
- **Persistentie:** queue overleeft app-herstart (IndexedDB), niet alleen geheugen.

### 3.2 Sync-indicator
Header toont: `Online` · `Offline` · `Synchroniseert 2/5…`. Bij conflict (server nieuwer) → last-write-wins met notificatie; complexe merge is expliciet V2 (geen offline-first-engine in MVP).

### 3.3 Grenzen (MVP)
- Geen volledige dataset-sync naar device; de Medewerker heeft ≥ 1× per dag verbinding nodig om de dagroute op te halen.
- Foto's uploaden bij herverbinding (kunnen groot zijn) → geknepen/gecomprimeerd vóór upload.

---

## 4. Web-push notificaties

- **Kanaal:** Web Push (PWA), optioneel (PRD § 10). Gebruikt voor: nieuwe/gewijzigde dagroute, herplan geaccepteerd, urgente planner→medewerker-melding.
- **Toestemming:** expliciet gevraagd op een logisch moment (niet direct bij eerste load).
- **iOS:** web-push vereist een geïnstalleerde PWA (iOS 16.4+); fallback = in-app inbox (21).
- Detail van notificatietypen: 21_Notificaties.md.

---

## 5. Updates & versiebeheer

- Nieuwe deploy → service worker detecteert update → **stille update**, geactiveerd bij volgende koude start, of een subtiele "Nieuwe versie beschikbaar — vernieuwen"-hint.
- Geen harde geforceerde reload tijdens een actieve route (zou werk kunnen onderbreken).
- Backwards-compatibele API's zodat een iets oudere client blijft werken tot update.

---

## 6. Beveiliging & privacy

- Alleen via HTTPS (vereiste voor service workers).
- Lokale data (IndexedDB) bevat alleen wat nodig is voor de dagtaak; geen prijzen/facturen (23 P1) op het medewerker-device.
- Bij uitloggen: lokale caches/queue geleegd.

---

## 7. Testscenario's (→ 31_Testplan.md)

| # | Scenario | Verwacht |
|---|---|---|
| PWA-01 | Installeren op Android + iOS | Homescreen-icoon, standalone launch |
| PWA-02 | Beurt afvinken in vliegtuigmodus | Optimistic gereed; queue; sync bij herverbinding |
| PWA-03 | App killen na offline-mutatie | Queue persisteert; sync na herstart |
| PWA-04 | Foto offline maken | Lokaal opgeslagen; upload + compressie bij online |
| PWA-05 | Nieuwe deploy tijdens gebruik | Geen onderbreking; update bij volgende start |
| PWA-06 | Web-push op geïnstalleerde iOS-PWA | Notificatie ontvangen |

---

## 8. Openstaande punten

Geen open beslissingen. Volledige offline-first synchronisatie en heroverweging van native apps zijn expliciet V2 (PRD § 3.4, § 5.3) en staan in 34_Backlog.md.

---

## Changelog

| Datum | Versie | Wijziging |
|---|---|---|
| 2026-07-06 | 1.0 | Placeholder met 3 features |
| 2026-07-07 | 2.0 | Volledige uitwerking: installatie (incl. iOS), service-worker-cachingstrategieën, offline-tolerantie met retry-queue en grenzen, web-push, updatebeleid, security, 6 testscenario's |
