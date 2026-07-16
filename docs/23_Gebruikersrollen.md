# 23 — Gebruikersrollen & Permissies

**Status:** DONE
**Versie:** 2.1
**Bron van waarheid:** `00_PRD.md` § 14 (Gebruikersrollen & Autorisatie), § 4.3 — dit document mag het PRD niet tegenspreken.
**Werkinstructie:** zie `MASTER_PROMPT.md`.
**Relaties:** 22_Authenticatie.md (technische afdwinging), 11_DatabaseConcept.md (RLS), 09_NietFunctioneleEisen.md (NFR-306), 16_Facturatie.md, 29_MobieleApp.md, 46_PlatformAdmin.md / docs/adr/ADR-013-platform-admin-product-agent.md (platform-admin — expliciet géén Bedrijfsrol, zie § 7).

---

## Doel van dit document

Dit document definieert de **rollen** binnen een Bedrijf en de **volledige rechtenmatrix per resource × actie**. Het is de functionele bron voor de RLS-policies en Edge-Function-guards (22_Authenticatie.md). Kernregel uit PRD § 14: *medewerkers zien uitsluitend eigen routes en gekoppelde klantinfo (naam, adres, instructies — géén prijzen/facturen)*.

---

## 1. Rollen

| Rol | Primair device | Omschrijving |
|---|---|---|
| **Eigenaar** | Desktop + mobiel | Volledige controle incl. abonnement/billing van RouteFlow zelf |
| **Admin** | Desktop | Alles behalve RouteFlow-abonnement/billing |
| **Planner** | Desktop | Planning en klantbeheer; geen gebruikersbeheer, geen facturatie-mutaties |
| **Administratie** | Desktop | Facturatie en debiteuren; geen planning-mutaties |
| **Medewerker** | Mobiel (PWA) | Voert eigen routes uit; beperkte klantinfo, geen financiële data |
| **Klant (eindklant)** | Mobiel/e-mail | Ontvangt berichten, betaalt; (V2) klantportaal met eigen voorkeuren |

Een gebruiker heeft **één rol per bedrijf**. Eigenaar/Admin kunnen rollen toewijzen (FR-100 / 22_Authenticatie.md § 8). De eindklant is geen ingelogde app-gebruiker in MVP/V1 (alleen ontvanger); het klantportaal is V2.

---

## 2. Rechtenmatrix per resource × actie

Legenda: **C** create · **R** read · **U** update · **D** delete · **—** geen toegang · **R◦** beperkte read (zie voetnoten).

| Resource | Eigenaar | Admin | Planner | Administratie | Medewerker |
|---|---|---|---|---|---|
| Bedrijfsinstellingen | R U | R U | R | — | — |
| RouteFlow-abonnement/billing | R U | — | — | — | — |
| Gebruikers & rollen | C R U D | C R U D | — | — | — |
| Diensten (services) | C R U D | C R U D | R | R | R◦¹ |
| Klanten | C R U D² | C R U D² | C R U | R | R◦³ |
| Objecten | C R U D | C R U D | C R U | R | R◦³ |
| Dienstafspraken | C R U D | C R U D | C R U | R | R◦¹ |
| Beurten (jobs) | C R U D | C R U D | C R U | R | R◦⁴ U◦⁵ |
| Routes | C R U D | C R U D | C R U | R | R◦⁶ |
| Medewerkers & beschikbaarheid | C R U D | C R U D | R U⁷ | R | R◦⁸ U◦⁸ |
| Facturen | R | R U | R | C R U | — |
| Factuurregels | R | R U | — | C R U | — |
| Betalingen | R | R | — | R | — |
| Creditfacturen | R | R U | — | C R U | — |
| Berichttemplates | R U | R U | R | R | — |
| Notificaties (klant) | R | R | C R | C R | R◦⁹ |
| Interne notificaties | R | R | R | R | R◦ |
| Rapportage/dashboard | R | R | R◦¹⁰ | R◦¹⁰ | — |
| Audit-trail | R | R | — | R◦ | — |
| Feature requests (§ 7) | C R U D | C R U | C R | R | — |

**Voetnoten:**
1. Medewerker ziet dienst-/afspraaknaam en instructies, **geen prijzen**.
2. Verwijderen klant verboden bij bestaande facturen → archiveren/anonimiseren (BR-040).
3. Medewerker ziet alleen klanten/objecten die aan **zijn eigen route van vandaag** hangen: naam, adres, toegangsinstructies. Geen contactvoorkeuren, geen betaaltermijn.
4. Medewerker ziet alleen **eigen** beurten (RLS op `route.employee_id`).
5. Medewerker mag status muteren binnen de PWA-flow: `gepland → onderweg → uitgevoerd/niet_thuis` (FR-042/043), plus notitie/foto. Geen datum/prijs/toewijzing wijzigen.
6. Medewerker ziet alleen zijn eigen route (niet die van collega's).
7. Planner beheert beschikbaarheid/verlof functioneel maar wijzigt geen medewerker-accounts.
8. Medewerker kan **eigen** beschikbaarheid melden (bijv. ziekmelding, FR-024/BR-802).
9. Medewerker ziet dat een klantbericht is verzonden (bijv. niet-thuis), niet de volledige communicatiehistorie.
10. Planner/Administratie zien rapportage beperkt tot hun domein; volledige omzet-/margecijfers zijn Eigenaar/Admin.

---

## 3. Kernprincipes (afdwingbaar)

- **P1 — Financiële scheiding:** Medewerker en Planner zien **geen prijzen/facturen/betalingen**. Prijsvelden worden server-side weggelaten (niet client-side verborgen) — RLS/column-select afgedwongen.
- **P2 — Eigen-route-isolatie:** Medewerker ziet uitsluitend data gekoppeld aan zijn eigen routes (RLS op `employee_id`), nooit de hele klantenkring.
- **P3 — Planning-scheiding:** Administratie heeft geen planning-mutaties; Planner heeft geen facturatie-mutaties. Voorkomt fouten en fraude.
- **P4 — Tenant-isolatie:** boven alles geldt RLS op `company_id` (NFR-301) — geldt voor élke rol.
- **P5 — Least privilege:** nieuwe features krijgen expliciet toegewezen rechten; default = geen toegang.

---

## 4. Technische afdwinging

| Laag | Mechanisme |
|---|---|
| Database | RLS-policies per tabel op `company_id` + rol/`employee_id` (11_DatabaseConcept.md) |
| Kolomniveau | Prijs-/factuurkolommen uitgesloten via views/`select`-grants voor Medewerker/Planner |
| API | Edge-Function-guards controleren rol vóór domeinacties (13_API_Specificatie.md) |
| UI | Rol-gebaseerde navigatie/knoppen (defensief, niet als enige verdediging — PRD § 12.2) |

Autorisatie is **defense-in-depth**: UI verbergt, API weigert, database dwingt af. Nooit alleen client-side.

---

## 5. Edge cases

| # | Case | Gedrag |
|---|---|---|
| RB-01 | Medewerker is ook Eigenaar (ZZP'er, klein bedrijf) | Rol = Eigenaar; PWA + desktop beide beschikbaar; geen beperking |
| RB-02 | Gebruiker verwijderd terwijl routes toegewezen | Account gedeactiveerd (soft); routes moeten eerst herverdeeld — waarschuwing bij deactiveren |
| RB-03 | Rolwijziging tijdens sessie | Nieuwe rechten gelden na token-refresh; lopende sessie krijgt bij volgende actie 403 indien niet meer toegestaan |
| RB-04 | Medewerker opent link naar factuur (deep link) | 403 `forbidden_role`; UI toont "Je hebt geen toegang tot facturen" |
| RB-05 | Multi-bedrijf-gebruiker (franchise) | Rechten gelden per actief bedrijf; wisselen van tenant herlaadt context (22_Authenticatie.md § 5) |
| RB-06 | Klantportaal (V2) | Eindklant-rol met eigen, sterk beperkte RLS-scope (alleen eigen data) — buiten MVP/V1 |

---

## 6. Openstaande punten

Geen open beslissingen. Het klantportaal (eindklant-rol met inlog) is expliciet V2 (PRD § 5.2) en wordt daar functioneel uitgewerkt; de matrix houdt er nu al rekening mee (P5, RB-06).

---

## 7. Platform-admin (expliciet buiten deze matrix)

**Platform-admin is geen Bedrijfsrol** en staat daarom buiten de rechtenmatrix in § 2 — een gebruiker heeft nooit "platform-admin" als rol-waarde bij een Bedrijf. Het is een aparte, orthogonale autorisatiedimensie (allowlist op `user_id`, geen `company_id`), uitsluitend bedoeld voor de platform-eigenaar zelf: overzicht over álle bedrijven, triage van Product Agent-voorstellen, cross-tenant operationele monitoring. Volledige uitwerking: `46_PlatformAdmin.md`, `docs/adr/ADR-013-platform-admin-product-agent.md`, `10_BusinessRules.md` § 11 (BR-900–904).

Kernconsequentie voor deze matrix: **geen enkele combinatie van Bedrijfsrollen** (ook niet Eigenaar van meerdere/grote bedrijven) geeft ooit platform-toegang — dat zou P4 (Tenant-isolatie, § 3) en P5 (Least privilege) tegenspreken. Platform-toegang wordt uitsluitend handmatig toegekend (§ 1.1, `46_PlatformAdmin.md`).

---

## Changelog

| Datum | Versie | Wijziging |
|---|---|---|
| 2026-07-06 | 1.0 | Placeholder met grove 5×4-matrix |
| 2026-07-07 | 2.0 | Volledige rechtenmatrix per resource × actie (CRUD) met voetnoten, 5 kernprincipes, afdwinging in 4 lagen, 6 edge cases |
| 2026-07-16 | 2.1 | "Feature requests"-rij toegevoegd aan de rechtenmatrix (§ 2); nieuw § 7 "Platform-admin (expliciet buiten deze matrix)" toegevoegd — voortvloeiend uit ADR-013/`46_PlatformAdmin.md`/PRD § 19 A-23. |
