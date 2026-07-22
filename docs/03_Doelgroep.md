# 03 — Doelgroep

**Status:** DONE
**Versie:** 1.0
**Bron van waarheid:** `00_PRD.md` § 4 (Doelgroep & Markt) — dit document mag het PRD niet tegenspreken.
**Werkinstructie:** zie `MASTER_PROMPT.md`.

---

## Doel van dit document

Dit document detailleert de **primaire en secundaire doelgroepen**, hun pijnpunten, koopgedrag, en adoptiebarrières.

---

## 1. Primaire Doelgroep: Nederlandse Glazenwassers (1–15 medewerkers)

### 1.1 Marktomvang

- **Glazenwasbedrijven NL:** ± 1.200 (est. via KVK)
- **Doelgroep (1–15 mw):** ± 900–1.000 bedrijven
- **Potentiële klanten jaar 1:** 50–100 (0,05–0,11 penetratie)

### 1.2 Segmentatie

| Segment | Grootte | Kenmerken | ServOps-fit |
|---|---|---|---|
| **ZZP'ers** | 1 | Eigenaar = uitvoerder = planner | Hoog: alles-in-één op telefoon |
| **Klein (2–5 mw)** | 2–5 | Eigenaar + partners + medewerkers | Zeer hoog: KERNGROEP |
| **Middelgroot (6–15 mw)** | 6–15 | Plannen-laag, team-uitvoering | Hoog: planning cruciaal |

### 1.3 Koopgedrag & Beslissers

- **Besluiter:** Eigenaar/GM (financieel + operationeel)
- **Influencer:** Medewerker/teamlead (ergonomie, mobiel-app)
- **Budget:** Jaarlijks ± €1.500–3.000 IT (zacht)
- **Evaluatie-criteria:** Ease-of-use > prijs > features (vertrouwen > innovations)

### 1.4 Adoptiebarrières

| Barrière | Oplossing |
|---|---|
| "Ik ben geen IT-persoon" | Nul-training: in 15 min gereed (FR-101) |
| Risico: gegevens weg / hacker | Trust: AVG-certified, backups, security-blabla |
| Gewend aan papier/Excel | PWA voelt geen "IT"-tool, gewoon handige app |
| Schakelen = gedoe | Free trial (14 dagen), no credit card, auto-cancel |

---

## 2. Secundaire Verticalen (Uitbreiding V1+)

### 2.1 Gemeenschappelijke Noemer

Alle secundaire verticalen zijn **servicebedrijven met periodieke werkzaamheden op klant-locaties met route-component**:

- **Schoonmaakbedrijven** (1–30 mw): kantoor, huizen
- **Hoveniers** (1–10 mw): onderhoud groen
- **Ongediertebestrijding** (1–5 mw): inspecties, behandelingen
- **Dakgoot-reiniging** (ZZP–5 mw): seizoenswerk
- **Installateurs** (HVAC, loodgieter, elektriciens): service-abonnementen
- **CV/Airco-onderhoud** (1–10 mw): periodiek onderhoud

### 2.2 Karakteristieken

Alle delen:
- Frequentie-afspraken (wekelijks, maandelijks, 2×/jaar)
- Geografische spreiding (routes)
- Meerdere diensttypen per bedrijf
- Facturatie per beurt / abonnement
- Medewerker-scheduling kritisch

---

## 3. Jobs-to-be-Done (JTBD) per Segment

### JTBD Eigenaar (planning)

1. **"Ik wil weten wat ik deze week verdien"** → Dashboard omzet/facturen
2. **"Ik wil niet puzzelen met routes"** → Auto-planning
3. **"Ik wil zien wie waar is"** → Live kaartje
4. **"Ik wil klanten niet vergeten"** → Automatische herinneringen

### JTBD Medewerker (uitvoering)

1. **"Ik wil weten waar ik heen moet zonder te bellen"** → PWA route
2. **"Ik wil dit snel afvinken en naar huis"** → Eén-tik completion
3. **"Ik wil weten waar ik ernaartoe rij"** → Navigatie-link
4. **"Ik wil niet online-werken, ik wil buiten werken"** → Offline-tolerantie

### JTBD Administratie (facturatie)

1. **"Ik wil niet elke avond facturen typen"** → Auto-factuur
2. **"Ik wil geen foute BTW-bedragen"** → Regels afdwingend
3. **"Ik wil snelle betaling"** → Betaallink

---

## Relaties met andere documenten

- **00_PRD.md**: § 4 (Doelgroep markt) — overzicht
- **05_UserPersonas.md**: Concrete personas per segment

---

## Changelog

| Datum | Versie | Wijziging |
|---|---|---|
| 2026-07-06 | 1.0 | Volledig: primaire-doelgroep segmentatie, marktomvang, koopgedrag, barrières, secundaire verticalen, JTBD |
