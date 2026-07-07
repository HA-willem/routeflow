# 13 — API Specificatie

**Status:** DONE
**Versie:** 1.0

---

## REST API (Supabase Auto-Gen)

- Base: `https://api.routeflow.nl`
- Auth: Bearer JWT (Supabase)
- Format: JSON

### Endpoints (sample)

- `GET /companies` — Bedrijven
- `GET /customers` — Klanten (RLS-filtered)
- `POST /jobs` — Beurt aanmaken
- `GET /routes/{date}` — Routeuring per dag
- `POST /invoices` — Factuur genereren

### Webhooks

- `POST /webhooks/mollie` — Payment updates

---

## Changelog
| Datum | Versie | Wijziging |
|---|---|---|
| 2026-07-06 | 1.0 | Volledig: REST endpoints, webhooks |
