# 13 — API Specificatie

**Status:** DONE
**Versie:** 2.0
**Bron van waarheid:** `00_PRD.md` § 12 (Architectuur, API-first) — dit document mag het PRD niet tegenspreken.
**Werkinstructie:** zie `MASTER_PROMPT.md`.
**Relaties:** 11_DatabaseConcept.md (resources), 12_Entiteiten.md (modellen), 22_Authenticatie.md (auth), 16_Facturatie.md & 19_WhatsApp.md (webhooks), 09_NietFunctioneleEisen.md (NFR-307).

---

## Doel van dit document

Dit document specificeert het **API-contract** van RouteFlow: authenticatie, conventies, resource-endpoints, domein-acties (RPC), webhooks, foutmodel, paginatie, en rate limiting. De API is **API-first** (PRD § 12.2) zodat toekomstige integraties en native apps mogelijk zijn.

**Architectuur:** RouteFlow combineert twee lagen:
1. **Data-API** — Supabase PostgREST genereert CRUD-endpoints per tabel, beveiligd met **RLS** (multi-tenant, PRD § 12.2). Gebruikt door de webclient via de Supabase-SDK.
2. **Domein-API (Edge Functions)** — server-side logica die niet in de client hoort: planning genereren, route optimaliseren, factuur finaliseren, webhooks. Aangeroepen als RPC-endpoints.

---

## 1. Conventies

| Aspect | Keuze |
|---|---|
| Base-URL (data) | `https://<project>.supabase.co/rest/v1` |
| Base-URL (domein) | `https://<project>.supabase.co/functions/v1` (of `api.routeflow.nl` via proxy) |
| Formaat | JSON (`Content-Type: application/json`) |
| Tijd | ISO 8601 UTC (bijv. `2026-07-14T09:15:00Z`); rendering Europe/Amsterdam client-side |
| Bedragen | Integer in centen (`amount_cents`) + `currency` (EUR) |
| ID's | UUID v4 |
| Naamgeving velden | `snake_case` (PostgREST-conventie) |
| Versionering | Header `X-RouteFlow-Api-Version` (bij breaking changes; PostgREST-pad blijft `/rest/v1`) |

---

## 2. Authenticatie & autorisatie

- **Auth:** Bearer JWT van Supabase Auth (22_Authenticatie.md). Header: `Authorization: Bearer <access_token>` + `apikey: <anon_key>` voor de data-API.
- **Tenant-context:** de JWT bevat `user_metadata.company_id`; RLS-policies filteren elke query op `company_id = current_company_id()` (11_DatabaseConcept.md § 1). Er is géén tenant-parameter in de URL — isolatie is database-afgedwongen (NFR-301).
- **Rollen:** endpoint-toegang volgt 23_Gebruikersrollen.md; RLS-policies en Edge-Function-guards weigeren ongeautoriseerde acties (bijv. medewerker die facturen opvraagt).

---

## 3. Data-API (PostgREST, CRUD)

Per resource genereert PostgREST standaard endpoints. Voorbeeld voor `customers`:

| Methode | Pad | Actie | Rol |
|---|---|---|---|
| GET | `/customers` | Lijst (RLS-gefilterd) | Planner+ |
| GET | `/customers?id=eq.<uuid>` | Detail | Planner+ |
| POST | `/customers` | Aanmaken (FR-001) | Planner+ |
| PATCH | `/customers?id=eq.<uuid>` | Wijzigen | Planner+ |
| DELETE | `/customers?id=eq.<uuid>` | Verboden bij facturen → 409 (BR-500) | Admin |

Analoog voor: `objects`, `services`, `service_agreements`, `jobs`, `routes`, `employees`, `availability`, `invoices`, `invoice_lines`, `payments`, `notifications`, `messages`.

### 3.1 Query-conventies (PostgREST)

- Filter: `?status=eq.planned`, `?scheduled_date=gte.2026-07-01`
- Sorteren: `?order=scheduled_date.asc`
- Selecteren/embedden: `?select=*,objects(*,customers(name))`
- Paginatie: `Range`-header of `?limit=50&offset=100`; response `Content-Range: 0-49/1240`

### 3.2 Voorbeeld — beurten van een dag

```http
GET /rest/v1/jobs?scheduled_date=eq.2026-07-14&select=*,service_agreements(objects(address_line1,location))&order=sequence.asc
Authorization: Bearer <jwt>
apikey: <anon_key>
```

---

## 4. Domein-API (Edge Functions / RPC)

Server-side operaties die domeinlogica of externe providers raken. Alle POST, JSON-body, JWT vereist.

| Endpoint | Body (kern) | Effect | FR |
|---|---|---|---|
| `POST /functions/v1/planning-generate` | `{ from_date, weeks }` | Genereert voorgestelde beurten uit dienstafspraken | FR-020 |
| `POST /functions/v1/route-optimize` | `{ employee_id, date }` | Berekent optimale route (14_RoutingEngine.md) | FR-021 |
| `POST /functions/v1/route-move-job` | `{ job_id, target_route_id, position }` | Verplaatst beurt + herberekent | FR-022 |
| `POST /functions/v1/replan` | `{ trigger, employee_id?, date? }` | Reactief herplannen; geeft diff-voorstel terug | FR-024 |
| `POST /functions/v1/invoice-finalize` | `{ invoice_id }` | Nummer toekennen, PDF, verzenden | FR-060/064 |
| `POST /functions/v1/invoice-credit` | `{ invoice_id, lines }` | Creditfactuur (BR-301) | FR-068 |
| `POST /functions/v1/notify-send` | `{ type, recipient_id, channel? }` | Verstuurt bericht via adapter (e-mail/WhatsApp) | FR-080 |
| `POST /functions/v1/geocode` | `{ postal_code, house_number }` | Geocoding via routing-adapter | FR-002 |

### 4.1 Voorbeeld — herplan-voorstel

```http
POST /functions/v1/replan
{ "trigger": "employee_sick", "employee_id": "uuid", "date": "2026-07-15" }
```
Response `200`:
```json
{
  "proposal_id": "uuid",
  "moved_jobs": [
    { "job_id": "uuid", "from_date": "2026-07-15", "to_date": "2026-07-16", "extra_drive_sec": 320 }
  ],
  "unplaceable_jobs": ["uuid"],
  "requires_confirmation": true
}
```
De planner bevestigt via `POST /functions/v1/replan-accept { proposal_id }` (BR-802).

---

## 5. Webhooks (inbound)

| Endpoint | Bron | Doel | Beveiliging |
|---|---|---|---|
| `POST /functions/v1/webhooks/mollie` | Mollie | Betaalstatus bijwerken (FR-067) | Signature-verificatie + status opnieuw ophalen bij Mollie (nooit body vertrouwen) |
| `POST /functions/v1/webhooks/whatsapp` | 360dialog/Meta | Inbound berichten + statusupdates (FR-083) | Meta-signature (HMAC), idempotentie op message-id |

**Idempotentie (NFR-307):** elke webhook is idempotent op provider-message/payment-id; duplicaten worden genegeerd. Alle events gelogd (audit-trail).

### 5.1 Mollie-flow

```
Mollie POST { id: "tr_xxx" }
 → server: GET Mollie /payments/tr_xxx  (bron van waarheid)
 → status 'paid' → invoices.payment_status='paid' + payments-record
 → realtime notify planner (FR-067)
 → antwoord 200 (anders retryt Mollie)
```

---

## 6. Foutmodel

Uniform JSON-foutobject; nooit kale stacktraces (PRD § 11.7).

```json
{
  "error": {
    "code": "customer_has_invoices",
    "message": "Deze klant kan niet worden verwijderd omdat er facturen aan gekoppeld zijn.",
    "hint": "Archiveer de klant in plaats van verwijderen.",
    "status": 409
  }
}
```

| HTTP | Betekenis | Voorbeeld-code |
|---|---|---|
| 400 | Validatiefout | `invalid_postal_code` |
| 401 | Niet ingelogd / token verlopen | `unauthenticated` |
| 403 | Geen rechten voor deze actie/rol | `forbidden_role` |
| 404 | Niet gevonden (of buiten tenant → lijkt niet-bestaand) | `not_found` |
| 409 | Conflict / businessregel | `customer_has_invoices`, `invoice_immutable` |
| 422 | Semantisch onverwerkbaar | `service_agreement_incomplete` |
| 429 | Rate limit | `rate_limited` |
| 5xx | Serverfout (gelogd in Sentry) | `internal_error` |

---

## 7. Paginatie, filtering, rate limiting

- **Paginatie:** default `limit=50`, max `limit=200`; `Content-Range` in respons.
- **Rate limiting:** per JWT/IP op de domein-API (bijv. 60 req/min voor zware RPC zoals `route-optimize`); overschrijding → 429 met `Retry-After`. Data-API leunt op Supabase-limieten per plan.
- **Realtime:** planning-updates via Supabase Realtime (WebSocket) op `jobs`/`routes` — de client abonneert op wijzigingen binnen zijn tenant (RLS geldt ook op realtime).

---

## 8. Openstaande punten

Geen open beslissingen. Concrete OpenAPI/Swagger-definitie wordt als artefact in de codefase gegenereerd (Supabase levert een OpenAPI-spec voor de data-API automatisch); dit document is de conceptuele leidraad die daaraan voorafgaat.

---

## Changelog

| Datum | Versie | Wijziging |
|---|---|---|
| 2026-07-06 | 1.0 | Placeholder met enkele voorbeeld-endpoints |
| 2026-07-07 | 2.0 | Volledige uitwerking: auth/tenant-model, PostgREST-CRUD + query-conventies, domein-RPC-endpoints, Mollie/WhatsApp-webhooks met idempotentie, uniform foutmodel, paginatie & rate limiting |
