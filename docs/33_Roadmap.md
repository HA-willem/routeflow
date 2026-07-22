# 33 — Roadmap

**Status:** DONE
**Versie:** 2.0
**Bron van waarheid:** `00_PRD.md` § 5 (Scope: MVP, V1, V2) — dit document mag het PRD niet tegenspreken.
**Werkinstructie:** zie `MASTER_PROMPT.md`.
**Relaties:** 08_FunctioneleEisen.md (FR-fasering), 34_Backlog.md (details), 39_Toekomstvisie.md (lange termijn), 35_Deployment.md.

---

## Doel van dit document

Dit document beschrijft de **uitrolvolgorde** van ServOps in fasen (MVP → V1 → V2), met per fase de doelen, scope, exit-criteria en afhankelijkheden. Het respecteert de scopetabel PRD § 5.2 en de faseringregel uit MASTER_PROMPT § 3: **bouw niets uit een latere fase "omdat het makkelijk meegenomen kan worden"**.

De genoemde doorlooptijden zijn **indicatief** (richtinggevend, geen commitment); scope is leidend, niet datum.

---

## 0. Documentatiefase (huidig)

**Doel:** alle documenten 00–39 op DONE conform Definition of Done (MASTER_PROMPT § 6). **Exit:** geen placeholders, geen open PRD-conflicten, alle secties uitgewerkt. Pas daarna start codeontwikkeling (CLAUDE.md).

---

## 1. MVP — "gooi het wijkboekje weg"

**Doel:** de kleinste set waarmee een glazenwasser zijn papieren boekje weggooit (PRD § 5.1).

**Scope (Must, MVP):**
- Klanten & objecten: CRUD, adres + geocoding, dienstafspraken met frequentie/prijs/voorkeuren (FR-001…005/008).
- Planning: automatische beurt-generatie, dagplanning met geoptimaliseerde volgorde, drag-and-drop, vergrendelen (FR-020/021/022/026).
- Uitvoering (PWA): dagroute, navigatie, afvinken, notitie (FR-040/041/042).
- Facturatie: conceptfactuur, NL-BTW, doorlopende nummering, PDF, e-mailverzending (FR-060/061/062, e-mail deel van 064/080).
- Communicatie: e-mail-aankondiging "morgen" (FR-080, e-mail).
- Dashboard basis (FR-102), onboarding (FR-101), bedrijf/diensten/rollen instellen (FR-100), zoeken (FR-008).
- Fundament: auth + RLS-multitenancy (22), routing-adapter met Mapbox (14), betaal-adapter (Mollie) voorbereid.

**Expliciet nog niet:** AI-herplannen, weer, WhatsApp, betaallink/QR, herinneringen, foto's, offline-queue (dat is V1).

**Exit-criteria:**
- E2E-1…7 (31_Testplan.md) groen; must-NFR's MVP gehaald.
- Een echte glazenwasser plant zonder handleiding binnen 15 min zijn eerste week (01 § 4.4).
- Facturen zijn Belastingdienst-correct en verzendbaar per e-mail.

---

## 2. V1 — "commercieel verkoopbaar"

**Doel:** volwaardig, betaald product met de onderscheidende AI- en communicatiefeatures (PRD § 5.2).

**Scope (Must/Should, V1):**
- **AI Planner volledig:** geografische clustering, weersgevoeligheid + herplanvoorstel, automatisch herplannen bij ziekte/verlof, "plan opnieuw", capaciteitswaarschuwing, "waarom"-uitleg (FR-023/024/025/027/028).
- **Betalingen:** iDEAL-betaallink + QR (Mollie), webhook-statusupdate, automatische herinneringen, abonnementsfacturatie, creditfacturen (FR-063/065/066/067/068).
- **WhatsApp (360dialog):** aankondiging/niet-thuis/factuur/herinnering/bevestiging, templates met variabelen (FR-064/080/081, 19).
- **PWA+:** foto's, "niet thuis"-flow, offline-tolerantie/retry-queue (FR-043/044/045).
- **Klanten:** CSV-import, klant-tijdlijn (FR-006/007).
- **Interne notificaties**, rapportage (route-/omzetstatistieken), donkere modus.
- Branche-templates diensten (verticaal-uitbreiding, 17 § 1.1).

**Exit-criteria:**
- E2E-8…10 + BR-/RLS-tests groen; must-NFR's V1 gehaald (incl. security ASVS L2, AVG-DPA's, backups/PITR).
- WhatsApp Business-verificatie operationeel; Mollie live.
- Reductie reistijd aantoonbaar (KPI, PRD § 17).

---

## 3. V2 — "marktleiderschap"

**Doel:** features die ServOps onderscheidend en schaalbaar maken (PRD § 5.2).

**Scope (Could/later):**
- Klantportaal (self-service voorkeuren), tweeweg-WhatsApp ("OVERSLAAN", FR-083).
- Voorspellende capaciteitsplanning, multi-dag-optimalisatie, live-uitloopdetectie.
- Automatische incasso (SEPA), boekhoudkoppelingen (e-Boekhouden, Moneybird, Exact) (A-09).
- Strippenkaart-prijstype, materiaal-/spraaknotities.
- Volledige offline-first synchronisatie; heroverweging native apps (A-05).
- Routing op schaal via OSRM self-hosted (A-06 fallback), full verticaal-onboarding.

**Exit-criteria:** per feature eigen AC's; schaal-NFR's (38) gevalideerd onder realistische last.

---

## 4. Afhankelijkheden & volgorde

```
Fundament (auth/RLS/adapters) ─▶ MVP-kern (klant→planning→uitvoering→factuur/e-mail)
                                    │
                                    ▼
                    V1 (AI-herplan · Mollie-betaling · WhatsApp · PWA+)
                                    │
                                    ▼
                    V2 (portaal · incasso · boekhoudkoppeling · schaal)
```

- Weer/herplannen (V1) bouwt op de dag-laag + routing-engine (MVP).
- WhatsApp (V1) hergebruikt de messaging-adapter naast e-mail (MVP).
- Boekhoudkoppelingen (V2) bouwen op immutabele facturen + audit-trail (MVP/V1).

---

## 5. Risico's op de tijdlijn (PRD § 18)

| Risico | Faseraking | Mitigatie |
|---|---|---|
| WhatsApp Business-verificatie duurt | V1 | Vroeg starten; e-mail-first blijft werken |
| Route-API-kosten | V1→V2 | Cache (14 § 3); OSRM-fallback klaar |
| Vertrouwen in auto-planning | V1 | Voorstel-diff + "waarom" + geleidelijke automatisering |
| Fiscale BTW-nuances | MVP | Instelbaar per dienst + disclaimer (A-07) |

---

## Changelog

| Datum | Versie | Wijziging |
|---|---|---|
| 2026-07-06 | 1.0 | Placeholder-tabel met 3 fasen |
| 2026-07-07 | 2.0 | Volledige uitwerking: documentatiefase + MVP/V1/V2 met doelen, scope, exit-criteria, afhankelijkheden-diagram, tijdlijn-risico's |
