# 06 — User Journeys

**Status:** DONE
**Versie:** 1.0
**Bron van waarheid:** `00_PRD.md` § 3 (Productvisie) — dit document mag het PRD niet tegenspreken.
**Werkinstructie:** zie `MASTER_PROMPT.md`.

---

## Doel van dit document

Dit document beschrijft concrete **user journeys** per scenario, mapping touchpoints, pijnpunten, en happy-path-momenten.

---

## Journey 1: Onboarding (Frans, dag 1)

### Stap 1: Sign-up (5 min)

```
Frans → routeflow.nl → "Gratis proberen" 
→ E-mail + wachtwoord → Verify e-mail
→ Redirect: Onboarding-wizard
```

**Moment:** "Yay, ik ben erin!" (premium-voel)

### Stap 2: Bedrijfsnaam (1 min)

```
"Glazenwasserij De Haan" → NEXT
```

### Stap 3: Eerste Klant (5 min)

```
"Klant toevoegen"
→ Naam: "Bakkerij Jansen"
→ Adres: "1234 AB" + "42" → Auto-geocoded
→ Dienst: "Glasbewassing" (default)
→ Frequentie: "Wekelijks"
→ SAVE
```

**Moment:** "Wow, ik heb al 1 klant!" (sense of progress)

### Stap 4: Eerste Planning (2 min)

```
"Plan eerste week"
→ System AI Planner: "Volgende week: 1 beurt dinsdag"
→ Preview → SAVE
```

**Moment:** "Dit ging makkelijk!" (nul-training achieved)

**Tijd totaal:** 15 min ✓ (FR-101 target)

---

## Journey 2: Normale Werkweek (Frans, desktop, Monday)

### 09:00 — Planning Review

```
Open dashboard
→ "Deze week: 23 beurten, €2.850 omzet"
→ Kaart: 23 pins, geclusterd per wijk
→ Tabel: medewerkers, routes per dag
→ Banner: "Medewerker Piet ziek morgen — 5 beurten" [Herplan-voorstel]
```

**Moment:** "Ik zie alles in 1 blik" (situational awareness)

### 09:05 — Herplan Review

```
Klik "Herplan-voorstel"
→ Dialog: "5 beurten Piet → 3 naar Jeroen (wo), 2 Reserve (wachtrij)"
→ Diff-tabel: beurt #1–5 van woensdag naar donderdag
→ "Akkoord" → Routes bijgewerkt, SMS naar medewerkers
```

**Moment:** "Dit zou uren geduurd hebben; nu 30 seconden" (automation magic)

---

## Journey 3: Werkdag (Jeroen, PWA, Dinsdag 07:30)

### 07:30 — Sync Route

```
Jeroen opent PWA
→ "Goedemorgen! Je hebt vandaag 6 beurten"
→ Kaart: 6 pins, geordend
→ Tabel: adres | klant | dienst | verwachte tijd
```

**Moment:** "Ik weet exact wat ik moet doen" (clarity)

### 08:52 — Beurt 1 Gereed

```
Jeroen: [Service voltooid]
→ Tik "Gereed" 
→ Pop-up: "Notitie? Foto?" (optioneel)
→ SAVE → Confetti animation ✨
```

**Moment:** "Simpel, bevredigend" (good UX)

---

## Journey 4: Regenachtige Dag (Planner, Thursday 06:30)

### 06:30 — Weather Alert

```
Frans opent RouteFlow dashboard
→ Banner: "Weerwaarschuwing: 80% regen. 8 diensten gepland"
→ Knop: "Bekijk herplan-opties"
```

### 06:35 — Herplan AI

```
Klik "Herplan"
→ Dialog: "Voorgesteld: verplaats 8 diensten naar maandag + volgende week"
→ "Accept" → Routes updated, SMS naar medewerkers
```

**Moment:** "AI denkwerk, ik besluit" (human-in-the-loop)

---

## Changelog

| Datum | Versie | Wijziging |
|---|---|---|
| 2026-07-06 | 1.0 | Volledig: 4 journeys (onboarding, weekplanning, medewerker-dag, weerherstel) |
