# 04 — Concurrentieanalyse

**Status:** DONE
**Versie:** 1.0
**Bron van waarheid:** `00_PRD.md` § 2.3 (Waarom bestaande oplossingen tekortschieten) — dit document mag het PRD niet tegenspreken.
**Werkinstructie:** zie `MASTER_PROMPT.md`.

---

## Doel van dit document

Dit document analyseer de **directe en indirecte concurrenten**, hun sterke en zwakke punten, en RouteFlow's differentiatie.

---

## 1. Directe Concurrenten (Vakpakketten NL)

### 1.1 BeePlanning

- **Markt:** Glazenwassers, schoonmakers
- **Sterken:** Gevestigd, multi-tenant, Nederlands
- **Zwakken:** Gedateerd UI, desktop-first, limited mobile, basisplanning (geen AI), geen WhatsApp
- **Prijs:** €50–80/maand per bedrijf

**RouteFlow voordeel:** UI/UX, AI planning, WhatsApp, PWA, premium feel

### 1.2 Jobmanager

- **Markt:** Timmerwerk, schilderwerk, onderaannemers
- **Sterken:** Robuust, time-tracking, urenregistratie
- **Zwakken:** Complex, enterprise-heavy, overkill voor klein bedrijf, geen geografische clustering, moeilijk onboard
- **Prijs:** €100+/maand

**RouteFlow voordeel:** Lightweight, nul-training, geografische optimalisatie

### 1.3 Fieldwork (import-tool)

- **Markt:** Maintenance, installation services
- **Sterken:** GPS-tracking, asset-management, internationale dekking
- **Zwakken:** Duur, Engelse software, geen automatische planning
- **Prijs:** Custom (€500+/maand)

**RouteFlow voordeel:** Betaalbaarder, Nederlands, auto-planning

---

## 2. Indirecte Concurrenten

| Type | Voorbeelden | Waarom verliest tegen RouteFlow |
|---|---|---|
| **Papier/Excel** | Wijkboekjes, Excel-sheets | Geen scalability, fouten, handmatig werk |
| **Generieke kalenders** | Google Calendar, Outlook | Geen route-aware, geen facturatie, geen cluster |
| **General HR-SaaS** | Monday, Asana | Overkill, niet-domein-specifiek, geen mobile-first |
| **Generieke planners** | Topdesk, Jira Service | Enterprise-prijs, steep learn-curve, overkill |

---

## 3. Feature-Vergelijkingsmatrix

| Feature | BeePlanning | Jobmanager | RouteFlow |
|---|---|---|---|
| **UI-kwaliteit (modern)** | ⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Mobile PWA** | Basis | Beperkt | Uitstekend |
| **Automatische planning** | Basaal | Handmatig | Intelligent (AI) |
| **Geografische clustering** | Nee | Nee | Ja |
| **WhatsApp-integratie** | Nee | Nee | Ja |
| **Facturatie e-mail + betaallink** | Email | Email + integratie | Email + WhatsApp + Mollie QR |
| **Weersgevoelighied + herplan** | Nee | Nee | Ja (V1) |
| **Nul-training-onboarding** | Nee (setup-heavy) | Nee | Ja (15 min) |
| **Prijs klein bedrijf** | €50–80 | €100+ | €49/maand (MVP-plan) |

---

## 4. Markt-Strategische Voordelen

1. **Eerste-mover in Nederlandse AI-planning voor klein bedrijf** (niet general HR)
2. **Verticaal-gespecialiseerd maar agnostisch** (kan naar schoonmaak, hoveniers)
3. **Premium UX als differentiatie** (niet alleen features)
4. **Betaalbaar vs. Jobmanager, beter dan BeePlanning**

---

## Relaties met andere documenten

- **00_PRD.md**: § 2.3 (concurrentie-context)
- **01_Productvisie.md**: hoe onderscheiden we ons

---

## Changelog

| Datum | Versie | Wijziging |
|---|---|---|
| 2026-07-06 | 1.0 | Volledig: directe/indirecte concurrenten, feature-matrix, strategische voordelen |
