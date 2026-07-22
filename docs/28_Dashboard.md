# 28 — Dashboard Design

**Status:** DONE
**Versie:** 2.2
**Bron van waarheid:** `00_PRD.md` § 3.1 (visie), § 7 (FR-102), § 17 (KPI's) — dit document mag het PRD niet tegenspreken.
**Werkinstructie:** zie `MASTER_PROMPT.md`.
**Relaties:** 27_PaginaOverzicht.md (§ 1.1), 26_ComponentLibrary.md (KPICard/WeatherBanner), 21_Notificaties.md, 23_Gebruikersrollen.md (rol-afhankelijke inhoud), `docs/adr/ADR-011-human-in-the-loop-ai.md` en `43_AI_Agents.md` (FR-900 Morning Briefing — zie § 0).

---

## 0. Relatie met de Morning Briefing (FR-900, ADR-011)

Dit dashboard **is** de Morning Briefing (FR-900, `08_FunctioneleEisen.md` § 8) — niet een los overzicht ernaast. ADR-011 § 1 legt vast dat de Morning Briefing het **primaire startscherm** van ServOps is: de gebruiker komt niet eerst op een KPI-schermpje of de planner terecht, maar landt hier direct, elke dag. Dit vervangt de "eigenaar opent 's ochtends ServOps"-belofte uit PRD § 3.1 niet, maar formaliseert hem tot het samengestelde overzicht van acht AI Agents (`43_AI_Agents.md`) in plaats van losse, statische KPI's.

De bestaande layout (§ 1) blijft het structurele uitgangspunt (actiebanners, KPI's, "vandaag"-overzicht, snelle acties); ADR-011 stelt daarbovenop drie eisen die de bouwende sprint in de layout moet verwerken:

1. De inhoud is **vóór het inloggen** samengesteld (dagelijkse Orchestrator-cyclus, geen laadvertraging bij openen).
2. Elke actiebanner/elk voorstel toont **per wijziging**: wat, waarom, welke business rules, verwacht voordeel, impact — plus confidence score, bronnen en alternatieven (BR-703). Dit is meer detail dan de huidige actiebanner-schets in § 1 (die alleen een titel + CTA toont) — een uitbreiding, geen vervanging van de sectie-indeling.
3. Elk voorstel heeft de volledige actieset uit ADR-011 § 1: alles accepteren, individueel accepteren, aanpassen (opent de planner met het voorstel als uitgangspunt), afwijzen, of direct doorklikken naar `/planning`.

Dit document blijft de bron van waarheid voor de **layout**; ADR-011 is de bron van waarheid voor **welke inhoud en acties** die layout moet dragen.

---

## Doel van dit document

Dit document specificeert het **dashboard** (`/`, FR-102, FR-900): de landingspagina die de eigenaar 's ochtends opent. Het realiseert de kernbelofte uit PRD § 3.1: *"De eigenaar opent 's ochtends ServOps en ziet in één oogopslag: wie werkt vandaag waar, welke routes rijden er, wat is er gefactureerd en wat staat open."*

Ontwerphouding: **rust + actiegerichtheid**. Geen dichte cockpit vol grafieken, maar enkele betekenisvolle signalen met een directe volgende actie (PRD § 11.1).

---

## 1. Layout (desktop)

```
┌───────────────────────────────────────────────────────────────┐
│  Goedemorgen, {voornaam}.            [⌘K]        [🔔]  [avatar] │
├───────────────────────────────────────────────────────────────┤
│  ┌── Actiebanners (alleen indien relevant) ─────────────────┐  │
│  │  ⚠ Piet is ziek — 5 beurten     [Herplan bekijken]       │  │
│  │  🌧 Regen do/vr — 8 diensten     [Herplan-opties]         │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌ KPI ─────┐ ┌ KPI ─────┐ ┌ KPI ─────┐ ┌ KPI ─────┐            │
│  │ Omzet mnd│ │ Open fact│ │ Beurten  │ │ Plandruk │            │
│  │ € 3.250  │ │ € 850    │ │ 47 (wk)  │ │ Normaal  │            │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘            │
│                                                                 │
│  ┌ Vandaag ───────────────┐  ┌ Omzet (8 weken) ─────────────┐   │
│  │ 12 beurten · 3 mdw      │  │  ▁▃▅▂▆▇▅█  (bar chart)        │   │
│  │ mini-kaart / lijst      │  │                              │   │
│  └────────────────────────┘  └──────────────────────────────┘   │
│                                                                 │
│  Snelle acties:  [Plan deze week]  [Wachtrij (2)]  [Nieuwe klant]│
└───────────────────────────────────────────────────────────────┘
```

---

## 2. Secties

### 2.1 Begroeting + globale acties
Persoonlijke begroeting (dagdeel-afhankelijk), ⌘K-palette-toegang, notificatie-inbox (21), account.

### 2.2 Actiebanners (conditioneel)
Verschijnen **alleen als er iets te doen is** (anders verborgen — rust). Prioriteitsvolgorde:
1. Medewerker ziek/verlof → herplan (FR-024).
2. Weerwaarschuwing → herplan-opties (FR-023).
3. Mislukte betaling/verzending (FR-082).
4. Niet-thuis-meldingen van vandaag (FR-043).

Elke banner: icoon + korte tekst + één actieknop → diepe link.

### 2.3 KPI-tegels (FR-102, PRD § 17)
| Tegel | Waarde | Bron |
|---|---|---|
| Omzet deze maand | Som gefactureerd (of uitgevoerd) deze maand | facturen |
| Openstaande facturen | Som `payment_status=open` | facturen |
| Beurten deze week | Aantal gepland | jobs |
| Planningsdruk | Laag/Normaal/Hoog o.b.v. capaciteit vs. gepland | routes/availability |

Elke tegel toont optioneel een trend (▲▼ vs. vorige periode) en is klikbaar naar de onderliggende lijst.

### 2.4 Vandaag
Compacte weergave van de dag: aantal beurten, actieve medewerkers, mini-kaart of stoplijst. Klik → Planning (dagweergave).

### 2.5 Omzetgrafiek
Bar chart, 8 weken (PRD § 17). Rustige styling (25_DesignSystem.md), tabulaire waarden, toegankelijke tooltip. Volgt dataviz-richtlijn: één betekenisvolle reeks, geen chartjunk.

**Verhouding tot `/rapportage` (Sprint 10):** dit is een compacte, altijd-zichtbare indicator op het dashboard zelf — geen vervanging van de volledige Rapportage-module (`/rapportage`, owner/admin, `40_Implementatieplan.md` § Sprint 10), die omzet over een zelf te kiezen periode toont naast route-efficiëntie en productiviteit, met CSV-export. "Snelle acties" (§ 2.6) kan hiernaartoe doorlinken voor verdieping.

### 2.6 Snelle acties
Maximaal 3 knoppen; de meest waarschijnlijke ochtendactie eerst ("Plan deze week"). Wachtrij toont teller.

---

## 3. Rol-afhankelijke inhoud (23_Gebruikersrollen.md)

| Rol | Ziet |
|---|---|
| Eigenaar/Admin | Alles, incl. volledige omzet/marge |
| Planner | Planning-KPI's + banners; **geen** omzet/openstaand-bedrag (financiële scheiding, 23 P1) |
| Administratie | Facturatie-KPI's (omzet, open, overdue); **geen** planning-mutatie-acties |
| Medewerker | Geen desktop-dashboard; ziet mobiele dagroute (29) |

Financiële tegels worden server-side weggelaten voor rollen zonder recht (niet client-side verborgen).

---

## 4. Staten

| Staat | Gedrag |
|---|---|
| Loading | Skeleton-tegels + skeleton-grafiek (< 100ms) |
| Empty (nieuw bedrijf) | "Nog geen data. Voeg je eerste klant toe om je week te zien." → "Naar klanten" |
| Error | "Kon dashboard niet laden." + retry; losse tegels falen onafhankelijk (geen hele-pagina-crash) |
| Loaded | Data + conditionele banners |

---

## 5. Realtime & performance
- KPI's en banners updaten realtime bij relevante mutaties (betaling binnen, ziekmelding) via Supabase Realtime.
- TTI < 2s (NFR-101); zware aggregaties server-side voorberekend/gecacht waar nodig.

---

## 6. Mobiel
Op mobiel is het dashboard voor eigenaren een gestapelde, scrollbare versie (KPI's → banners → snelle acties). Medewerkers krijgen géén dashboard maar direct hun dagroute (29_MobieleApp.md).

---

## Changelog

| Datum | Versie | Wijziging |
|---|---|---|
| 2026-07-06 | 1.0 | Placeholder met 4 secties |
| 2026-07-07 | 2.0 | Volledige uitwerking: layout-schets, 6 secties (banners/KPI's/vandaag/grafiek/acties), rol-afhankelijke inhoud, 4 staten, realtime/performance, mobiel |
| 2026-07-12 | 2.1 | § 0 toegevoegd: formele koppeling tussen dit dashboard en FR-900 (Morning Briefing, ADR-011) — bestaande layout/secties blijven leidend, geen redesign, alleen de architecturale herkomst (acht AI Agents i.p.v. losse KPI's) expliciet gemaakt. |
| 2026-07-12 | 2.2 | § 0 uitgebreid conform de verrijkte ADR-011 § 1: Morning Briefing expliciet als primair startscherm (niet een los overzicht), drie concrete eisen aan de layout (vóór-login-samenstelling, per-wijziging wat/waarom/regels/voordeel/impact, volledige actieset accepteren/aanpassen/afwijzen/doorklikken). Nog geen redesign van § 1 zelf — dat is werk voor de bouwende sprint. |
| 2026-07-21 | 2.3 | § 2.5 aangevuld met de verhouding tot de nieuwe Rapportage-module (`/rapportage`, Sprint 10) — de dashboard-omzetgrafiek blijft de compacte indicator, `/rapportage` is de verdiepingsslag met zelf te kiezen periode + export. |
