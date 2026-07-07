# 35 — Deployment & Infrastructuur

**Status:** DONE
**Versie:** 2.0
**Bron van waarheid:** `00_PRD.md` § 12 (Technische Architectuur), § 13 (NFR) — dit document mag het PRD niet tegenspreken.
**Werkinstructie:** zie `MASTER_PROMPT.md`.
**Relaties:** 36_Security.md, 37_Performance.md, 38_Schaalbaarheid.md, 11_DatabaseConcept.md (migraties), 31_Testplan.md (CI).

---

## Doel van dit document

Dit document beschrijft **hosting, omgevingen, CI/CD, migraties, secrets, monitoring en rollback**. Het maakt de vastgestelde stack (Next.js · Supabase · Vercel — PRD § 12.1) concreet tot een uitrolproces.

---

## 1. Stack & hosting

| Laag | Keuze | Regio |
|---|---|---|
| Frontend (Next.js App Router) | **Vercel** | EU (edge) |
| Database (PostgreSQL + PostGIS) | **Supabase** | **EU** (AVG, NFR-401) |
| Auth | Supabase Auth | EU |
| Storage (foto's, PDF's) | Supabase Storage | EU |
| Server-logica | Supabase **Edge Functions** (Deno) + **pg_cron** | EU |
| CDN/edge | Vercel Edge Network | EU-first |
| Externe providers | Mollie, Mapbox, 360dialog, weer-API, e-mail (Resend) | EU/DPA |

**Datalocatie EU** is hard (NFR-401); alle subverwerkers onder DPA (NFR-402, 36).

---

## 2. Omgevingen

| Omgeving | Doel | Data | Trigger |
|---|---|---|---|
| **Local** | Ontwikkeling | Supabase local + seed | Handmatig |
| **Preview** | Per PR een geïsoleerde deploy | Preview-DB of seed-tenant | Automatisch bij PR |
| **Staging** (optioneel V1) | Release-kandidaat, UAT | Anon/kopie | Merge naar `release` |
| **Productie** | Live | Echte data | Merge naar `main` + approval |

Elke omgeving heeft eigen secrets en Supabase-project/branch; nooit productiedata in preview.

---

## 3. CI/CD-pijplijn

```
PR geopend
 ├─ Lint + typecheck
 ├─ Unit + integratie (test-DB)          ← blokkerend (31)
 ├─ Preview-deploy (Vercel)
 ├─ Lighthouse + axe op preview          ← rapport
 └─ E2E-kernflows (Playwright)           ← blokkerend op PR→main

Merge naar main
 ├─ DB-migraties toepassen (gecontroleerd, § 4)
 ├─ Productie-deploy (Vercel)
 ├─ Smoke-tests
 └─ Klaar / auto-rollback bij falen
```

- Rode test/scan = geen merge (31 § 8).
- Secret-scan + dependency-scan in CI (NFR-302/304).

---

## 4. Database-migraties

- Versioned SQL-migraties in repo (`/migrations`, 11 § 6), genummerd en idempotent waar mogelijk.
- **Volgorde:** migratie vóór app-deploy; backwards-compatibele stappen (expand/contract-patroon) zodat oude en nieuwe code even naast elkaar kunnen bestaan.
- Preview: automatisch. Productie: expliciete approval; nooit destructieve migratie zonder backup-checkpoint.
- RLS-policies horen bij de migratie van hun tabel (security by default).

---

## 5. Secrets & configuratie

- Secrets in **Vercel/Supabase vault** (env), nooit in de repo (NFR-304); `.env*` in `.gitignore`.
- Provider-keys (Mollie, Mapbox, 360dialog, weer, e-mail) per omgeving gescheiden; test-keys in preview.
- Rotatiebeleid; toegang tot productiesecrets minimaal (least privilege).

---

## 6. Monitoring & observability

| Aspect | Tool | Ref |
|---|---|---|
| Error tracking (frontend + Edge Functions) | Sentry | NFR-702 |
| Gestructureerde logs (JSON, correlatie-id, geen PII) | Vercel/Supabase logs | NFR-701 |
| Cron-job-monitoring (planning, facturen, herinneringen) | Alerting op mislukking | NFR-703 |
| Uptime + statuspagina | Externe monitor | NFR-201 |
| Performance (RUM) | Vercel Analytics | NFR-101 |

---

## 7. Rollback & herstel

- **App-rollback:** Vercel houdt vorige deploys; één klik terug naar laatste goede versie.
- **DB-herstel:** Supabase Point-in-Time Recovery ≤ 30 dagen (NFR-801); dagelijkse backups (NFR-802).
- **Runbook:** incidentprocedure met RTO < 4u (NFR-205); hersteltest per kwartaal (NFR-803).
- **Feature-flags** (V1) voor risicovolle features → uitrol ontkoppeld van deploy, snelle uitschakeling.

---

## 8. Schaal-overwegingen (kort; detail 38)

- Stateless frontend/Edge Functions schalen horizontaal (Vercel/Supabase).
- Zwaartepunt-belasting (planning, matrix) is server-side en cachebaar (14 § 3).
- Bij route-API-kosten: OSRM self-host als aparte infra-component (BL-040).

---

## 9. Openstaande punten

Geen open beslissingen. Keuze staging-omgeving (wel/niet aparte staging vóór productie) is een **operationele** afweging voor V1, geen productbeslissing; genoteerd als optie in § 2.

---

## Changelog

| Datum | Versie | Wijziging |
|---|---|---|
| 2026-07-06 | 1.0 | Placeholder met hosting-lijst |
| 2026-07-07 | 2.0 | Volledige uitwerking: stack+EU-datalocatie, omgevingen, CI/CD-pijplijn, migratiestrategie (expand/contract), secrets, monitoring, rollback/herstel (PITR/runbook), schaal-notities |
