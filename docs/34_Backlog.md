# 34 — Product Backlog

**Status:** DONE
**Versie:** 2.0
**Bron van waarheid:** `00_PRD.md` § 5 (Scope), § 19 (aannames) — dit document mag het PRD niet tegenspreken.
**Werkinstructie:** zie `MASTER_PROMPT.md`.
**Relaties:** 33_Roadmap.md (fasering), 39_Toekomstvisie.md (lange termijn), 08_FunctioneleEisen.md (FR's).

---

## Doel van dit document

Dit document is de **groslijst van toekomstige werkitems** die (nog) niet in de actieve fase zitten: V2+, ideeën, technische schuld en verbeteringen. Het is bewust een levend document — items stromen hierheen uit reviews en gebruikersfeedback, en stromen eruit naar 33_Roadmap.md zodra ze worden ingepland.

**Conventie:** BL-### (stabiel). Per item: omschrijving, waarde, geschatte fase, afhankelijkheden. Prioritering volgt MoSCoW + waarde/inspanning.

---

## 1. Backlog — V2-kandidaten (uit PRD § 5.2)

| ID | Item | Waarde | Afhankelijkheid |
|---|---|---|---|
| BL-001 | **Klantportaal** — eindklant beheert eigen voorkeuren/afspraken self-service | Minder telefoon/mail; klantbinding | Eindklant-rol + RLS-scope (23 RB-06) |
| BL-002 | **Tweeweg-WhatsApp** ("OVERSLAAN", chatbot-afhandeling) FR-083 | Minder handmatige afzeggingen | 19 § 6 (webhook, servicevenster) |
| BL-003 | **Boekhoudkoppelingen** — e-Boekhouden, Moneybird, Exact (A-09) | Bespaart dubbele invoer | Immutabele facturen + audit (16) |
| BL-004 | **Automatische incasso (SEPA)** | Betere cashflow | Mollie SEPA + mandaatbeheer |
| BL-005 | **Voorspellende capaciteitsplanning** + multi-dag-optimalisatie | Betere benutting | AI Planner-data-historie (15) |
| BL-006 | **Live-uitloopdetectie** (E-05) | Realtime herplannen bij vertraging | GPS-tracking PWA |
| BL-007 | **Strippenkaart-prijstype** | Vooruitbetaalde bundels | Prijsmodel (18 § 1.4) |
| BL-008 | **Volledige offline-first sync** | Werken zonder dekking | Sync-engine (20 § 3 grenzen) |
| BL-009 | **Native apps (iOS/Android)** — heroverweging (A-05) | App-store-aanwezigheid, betere hardware-toegang | Beslissing na V1-PWA-evaluatie |
| BL-010 | **Spraaknotities & materiaalregistratie** (PWA) | Snellere vastlegging in het veld | PWA-media |
| BL-011 | **Review-verzoeken** na uitvoering | Reputatie/marketing | Communicatie-engine |

---

## 2. Backlog — verbeteringen & uitbreidingen

| ID | Item | Waarde |
|---|---|---|
| BL-020 | Volledige verticaal-onboarding-flows (schoonmaak, hoveniers, …) | Marktverbreding (PRD § 4.2) |
| BL-021 | Uitgebreide rapportage: omzet per wijk/klant, medewerkerproductiviteit | Sturing |
| BL-022 | Prognoses & churn-signalen bij eindklanten | Retentie-inzicht |
| BL-023 | i18n: tweede taal (EN/DE) activeren (architectuur al aanwezig, A-01) | Internationalisering |
| BL-024 | Meerdere afstandsmatrix-profielen (bakfiets/te voet voor andere verticalen) | Verticaal-fit routing |
| BL-025 | Team-entiteit volledig benutten (planning op teamniveau) | Grotere bedrijven |

---

## 3. Backlog — technisch / niet-functioneel

| ID | Item | Waarde |
|---|---|---|
| BL-040 | OSRM self-hosted uitrol (A-06 fallback) bij route-API-kostendruk | Kostenbeheersing @ schaal (14 § 10) |
| BL-041 | Uitgebreide audit-trail-tabel met triggers (11 § 7) | Compliance/forensics |
| BL-042 | Load-/stresstests op 10.000 tenants (38) | Schaalzekerheid |
| BL-043 | Statuspagina + externe uptime-monitoring (NFR-201) | Vertrouwen/transparantie |
| BL-044 | Hersteltest-automatisering (NFR-803) | Betrouwbaarheid backups |

---

## 4. Werkwijze

- **Instroom:** ideeën/feedback/bugs-die-geen-blocker-zijn komen hier met een BL-nummer.
- **Prioritering:** per kwartaal herzien; waarde × urgentie ÷ inspanning; noordster-impact (01 § 6) weegt zwaar.
- **Uitstroom:** een item dat wordt ingepland verhuist naar 33_Roadmap.md (met FR-nummers indien functioneel).
- **Nooit stilzwijgend scope-creep:** niets uit dit document wordt in een vroegere fase gebouwd zonder expliciete roadmap-beslissing (MASTER_PROMPT § 3).

---

## 5. Relatie tot open aannames

Openstaande/uit te werken beslissingen uit PRD § 19 die backlog-werk kunnen genereren: er zijn er momenteel **geen open** (A-06 en A-08 zijn vastgesteld). Toekomstige aannames worden in PRD § 19 geregistreerd en kunnen hier als BL-item landen.

---

## Changelog

| Datum | Versie | Wijziging |
|---|---|---|
| 2026-07-06 | 1.0 | Placeholder met 4 items |
| 2026-07-07 | 2.0 | Volledige uitwerking: genummerde backlog (V2-kandidaten, verbeteringen, technisch) met waarde/afhankelijkheid, werkwijze in/uitstroom, relatie tot PRD § 19 |
