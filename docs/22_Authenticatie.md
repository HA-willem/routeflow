# 22 — Authenticatie

**Status:** DONE
**Versie:** 1.0
**Bron van waarheid:** `00_PRD.md` § 12 (Technische Architectuur) — dit document mag het PRD niet tegenspreken.
**Werkinstructie:** zie `MASTER_PROMPT.md`.

---

## Doel van dit document

Dit document beschrijft het **authentication & authorization-model**: hoe loggen gebruikers in, beheren sessies, en wat kunnen ze doen?

---

## 1. Authenticatie-methoden

### Supabase Auth

**MVP-methoden:**
- E-mail/wachtwoord
- Magic Link (e-mail-only, passwordless)

**V1+ optioneel:**
- OAuth (Google, GitHub)

### Flow: Registratie (Eigenaar)

1. User voert e-mail + wachtwoord in
2. Supabase Auth creëert account; verific-e-mail verzonden
3. User klikt link → account activated
4. Redirect: onboarding-wizard (FR-101)

### Flow: Aanmelden (Desktop)

1. E-mail + wachtwoord
2. Supabase Auth → JWT token gegenereerd
3. Token opgeslagen in browser (secure cookie, httpOnly)
4. Redirect: planning-dashboard

---

## 2. Sessies & Tokens

**JWT (JSON Web Token):**
- Issued by Supabase Auth
- Expiry: 1 uur (access token)
- Refresh token: 7 dagen (auto-refresh via Supabase client)

**Refresh-flow:**
```
Access-token expired → Client detects
→ POST /auth/refresh (refresh-token) 
→ Supabase → new access-token
→ Transparent to user
```

---

## 3. 2FA (optional, V1+)

**Enable:** User settings → "Two-factor authentication" checkbox

**Methods:**
- TOTP (Time-based One-Time Password): Google Authenticator, Authy
- SMS (optional, depends on Supabase plan)

**Flow:**
1. Enable: QR-code presented → user scans
2. Verify: user enters 6-digit code
3. Next login: password → 2FA prompt

---

## 4. Wachtwoordbeleid

**Requirements:**
- Min. 8 chars
- Min. 1 uppercase, 1 lowercase, 1 digit
- Reset-link valid 24h

---

## 5. Multi-Bedrijf-Lidmaatschap

**Use-case:** Eigenaar van franchise kan lid zijn van N bedrijven (N companies).

**Model:**
- `users` tabel: 1 user → many companies via join-tabel (V1+, MVP single-company per user)
- Active company-context: stored in user session / localStorage
- RLS policy: filter all queries by `current_company_id()`

---

## 6. RLS-Koppeling (JWT → Database Policies)

### 6.1 JWT Claims

Supabase Auth injecteert claims in JWT:
```json
{
  "sub": "user-id",
  "email": "user@example.com",
  "user_metadata": {
    "company_id": "uuid-bedrijf"
  }
}
```

### 6.2 Custom Function

```sql
CREATE FUNCTION current_company_id() RETURNS UUID AS $$
  SELECT (auth.jwt() -> 'user_metadata' ->> 'company_id')::uuid;
$$ LANGUAGE sql;
```

### 6.3 RLS Policies

Alle tabellen met `company_id`:
```sql
CREATE POLICY "users see own company" ON customers
  USING (company_id = current_company_id());
```

**Enforcement:** Database-level; geen query-filtering-bugs.

---

## 7. Autorisatie (Rollen & Permissies)

**Rollen:**
- Owner: all permissions + billing
- Admin: all except billing
- Planner: planning, routing, communicatie
- Support: read-only + communication
- Employee: medewerker (PWA only)

**Implementatie:** `users.role` enum; API-checks per endpoint.

---

## 8. Uitnodigingsflow Medewerkers

### 8.1 Flow

1. Admin: "Voeg medewerker toe" → e-mailadres + rol
2. System: invite-token gegenereerd, e-mail verzonden
3. Medewerker klikt link → sign-up-flow (wachtwoord instellen)
4. Medewerker → `users` table, role set, onboarding PWA

### 8.2 Invite-tokens

Tabel `invites`:
```
id, company_id, email, token, role, expires_at, created_at
```

TTL: 7 dagen. Undo: admin kan invite verwijderen vóór accept.

---

## 9. Foutmeldingen & Edge Cases

| Scenario | Melding | Actie |
|---|---|---|
| Wrong password | "E-mail of wachtwoord onjuist" | Retry |
| Account niet geverificeerd | "Verific-e-mail [email]. Opnieuw verzenden?" | Link resend |
| Token expired | Transparent refresh (geen melding) | Auto-refresh |
| 2FA-code onjuist | "6-digit code onjuist" | Retry (3×, dan block 5min) |
| Invite-token verlopen | "Link verlopen. Admin kan nieuw uitnodiging sturen" | Contact admin |

---

## Relaties met andere documenten

- **23_Gebruikersrollen.md**: permissie-matrix per rol
- **36_Security.md**: security-richtlijnen (token-handling, OWASP)

---

## Changelog

| Datum | Versie | Wijziging |
|---|---|---|
| 2026-07-06 | 1.0 | Volledig: Supabase Auth-methoden, JWT, 2FA, multi-company, RLS-koppeling, invites, foutmeldingen |
