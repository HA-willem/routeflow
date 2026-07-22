# Load-tests (LT-1…5, `38_Schaalbaarheid.md` § 6)

**Status: scriptskeleton, bewust nog niet uitgevoerd** (PRD § 19 A-30). Er is
vandaag geen staging-omgeving om representatief tegen te draaien — `38_Schaalbaarheid.md`
zelf plaatst uitvoering "vóór V1-launch", niet als blokkade voor doorontwikkelen.
Een echte pentest/load-run tegen productie-achtige infrastructuur is een
operationele activiteit, geen agent-bouwtaak.

Vereist [k6](https://k6.io) (`brew install k6`) — geen npm-dependency, een los
binary. Voorbeeld:

```sh
BASE_URL=http://127.0.0.1:3000 \
SUPABASE_SERVICE_ROLE_KEY=... \
k6 run tests/load/lt1-planning-query.js
```

| Test | Doel | Script |
|---|---|---|
| LT-1 | 5.000 objecten in één tenant, planning-query, p95 < 300 ms (NFR-504) | `lt1-planning-query.js` |
| LT-2 | Weekplanning-generatie voor grote tenant, binnen budget | nog te schrijven — vereist eerst representatieve seed-data (5.000 objecten) |
| LT-3 | Gelijktijdige cron-run gesimuleerd voor N tenants | nog te schrijven |
| LT-4 | Concurrent drag-drop/herberekening, < 2s warm | nog te schrijven — UI-gedreven, minder geschikt voor k6 (eerder Playwright + timing-assertions) |
| LT-5 | Storage-groei/upload onder volume | nog te schrijven |

Alleen LT-1 heeft een uitvoerbaar script — de overige zijn bewust niet
uitgewerkt tot er representatieve seed-data en een doelomgeving zijn; ze
eerder wél scripten zou giswerk zijn over een omgeving die nog niet bestaat.
