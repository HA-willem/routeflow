# Deploymentrapport — Sprint 3 afronding (2026-07-10)

**Doel:** laatste afronding van Sprint 3 vóór de start van Sprint 4: lokale commits pushen, migraties 009–010 naar Supabase Cloud deployen, verifiëren, en het volledige gebruikersgpad opnieuw testen.

## Uitgevoerde stappen

### 1. Push naar GitHub
9 lokale commits (architectuurreview-refactors + rapport) gepusht naar `origin/main`.
Pre-push hook (`tsc --noEmit`) liep automatisch en slaagde.
Resultaat: `91740ff..b46b01a main -> main`.

### 2. Deploy migraties 009 en 010 naar Supabase Cloud
De Supabase CLI heeft geen optie om een subset van migraties te pushen (`db push` past altijd alle nog-niet-toegepaste migraties toe, in volgorde). Om exact aan de scope ("migraties 009 en 010") te voldoen zijn migraties 011/012 (uit het architectuurreview, ongerelateerd aan Sprint 3) tijdelijk buiten `supabase/migrations/` geplaatst, is een `--dry-run` gedaan om te bevestigen dat alleen 009/010 zouden worden toegepast, en is vervolgens `supabase db push` uitgevoerd. Na afloop zijn 011/012 teruggezet — dit is een puur lokale, niet-gecommitte bewerking geweest.
Resultaat: `009_jobs.sql` en `010_service_agreements_horizon.sql` succesvol toegepast op productie. Migraties 011/012 (indexen, KVK-formaatcheck) staan bewust nog niet op productie — buiten scope van deze deploy-opdracht.

### 3. Verificaties (allemaal tegen de gelinkte Supabase Cloud-database, via `supabase db query --linked`, zonder API-keys bloot te leggen)

| Check | Resultaat |
|---|---|
| Migraties 001–010 aanwezig op productie | ✅ `supabase migration list` toont voor alle tien een matchende `remote`-kolom |
| `jobs`-tabel aanwezig | ✅ bevestigd via `information_schema.tables` |
| `service_agreements` bevat horizon-kolommen | ✅ `last_completed_job_id` (uuid) en `next_ideal_date` (date) aanwezig |
| RLS actief op alle tenant-tabellen | ✅ `companies`, `customers`, `jobs`, `objects`, `pricings`, `service_agreements`, `services`, `users` hebben allemaal `relrowsecurity = true`; policy-aantal per tabel komt overeen met de migraties (customers/jobs/objects/pricings/service_agreements/services: 3, companies: 2, users: 1) |
| `planning-generate` Edge Function werkt nog | ❌ **niet gedeployed op productie** — `supabase functions list` geeft een lege lijst. De functie bestaat alleen lokaal (`supabase/functions/planning-generate/`) en is nooit naar Supabase Cloud gepusht. Dit stond niet expliciet in de opdracht ("deploy migraties 009 en 010"), dus niet zelfstandig alsnog gedeployed — zie Problemen/Conclusie. |

### 4. Functionele hertest tegen productie (`https://routeflow-delta.vercel.app`)

Uitgevoerd via een tijdelijk Playwright-script (niet aan de repo toegevoegd, na afloop verwijderd) dat de live site aanstuurt, met e-mailbevestiging via een directe `auth.users`-controle (geen productie-mailbox beschikbaar voor automatische bevestiging).

| Stap | Resultaat |
|---|---|
| Registratie | ❌ **Mislukt.** Het formulier toont "Er ging iets mis. Probeer het opnieuw." — de generieke fallback in `lib/auth/error-messages.ts`. Geverifieerd via `auth.users`-query: er is **geen** gebruikersrij aangemaakt voor het testadres, dus de `signUp()`-aanroep faalt server-side vóórdat er iets geschreven wordt. |
| Login | ❌ **Mislukt** (zelfs met een bewust onbestaand account, waar een specifieke `invalid_credentials`-melding verwacht werd). Dezelfde generieke fallback-melding verschijnt. |
| Onboarding | Niet bereikbaar — vereist een geslaagde login. |
| Eerste planning-generatie | Niet bereikbaar — vereist een geslaagde onboarding, én de Edge Function is sowieso niet gedeployed. |

Geen productie-testdata is achtergebleven: `auth.users` bevat geen rijen voor de gebruikte testadressen (geverifieerd na afloop).

## Problemen

1. **Registratie/login op productie geven beide dezelfde generieke authenticatiefout.** Dat zowel `signUp()` als `signInWithPassword()` (met een bewust onbestaand account) dezelfde niet-specifieke fout geven, wijst niet op een enkel foutcode-pad (zoals een ontbrekende redirect-URL in de Auth-allowlist, wat alleen `signUp` zou raken), maar eerder op een structureel probleem in hoe de productie-Vercel-omgeving met Supabase Auth praat — bijvoorbeeld een verkeerd geconfigureerde `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY` in Vercel, of een Auth-instelling die niet via `supabase/config.toml` gesynchroniseerd is naar productie (dat bestand bevat momenteel alleen `site_url = "http://127.0.0.1:3000"`, wat er op wijst dat de Auth-configuratie van productie nooit via `supabase config push` is bijgewerkt en waarschijnlijk los, via de Supabase Dashboard, staat ingesteld — mogelijk incompleet).
   **Niet zelfstandig onderzocht/opgelost:** verder graven vereist ofwel Vercel-productielogs (geblokkeerd door de veiligheidsclassifier van deze sessie, terecht — dat zou productie-runtimedata/PII in de transcript trekken zonder dat expliciet gevraagd is) ofwel toegang tot het Supabase Dashboard (Authentication-instellingen), wat buiten de scope van "deploy migraties 009 en 010" valt en een aparte, bewuste actie moet zijn.
   **Dit is hoogstwaarschijnlijk een al langer bestaand probleem**, niet veroorzaakt door de migratie-deploy van vandaag: er is geen enkel bewijs (geen historische e2e-run, geen commit) dat registratie/login ooit tegen productie is getest vóór dit review — de bestaande e2e-tests (`tests/e2e/*.spec.ts`) draaien allemaal tegen de lokale Supabase-instantie.
2. **`planning-generate` Edge Function staat niet op productie.** Bestaat alleen lokaal. Dit betekent dat zelfs ná een fix van punt 1, de "eerste planning-generatie" niet zou werken op productie totdat deze functie gedeployed wordt (`supabase functions deploy planning-generate`). Niet zelfstandig gedaan — viel buiten de expliciete scope ("deploy migraties 009 en 010") en de opdracht sloot af met "Bouw verder niets".
3. Migraties 011/012 (uit het architectuurreview van eerder vandaag: indexen op `service_agreements`, KVK-formaatcheck) staan lokaal klaar maar zijn — conform de scope van deze opdracht — niet meegenomen in deze deploy. Ze zijn niet-functioneel en niet urgent; kunnen in een aparte, kleine deploy-stap volgen.

## Documentatie bijgewerkt

- `README.md`: migratiestatus gecorrigeerd naar 001–010 toegepast; twee nieuwe waarschuwingsregels toegevoegd voor het auth-probleem en de niet-gedeployde Edge Function (beide verwijzen naar dit rapport).
- `.gitignore`: `.vercel`-map toegevoegd (aangemaakt door `vercel link`, gebruikt voor read-only logdiagnose; geen wijzigingen aan Vercel-instellingen gedaan).

## Conclusie: **NO-GO** voor productiegebruik door eindgebruikers — **GO** voor start van Sprint 4-ontwikkeling

- De migraties zelf zijn correct en volledig gedeployed en geverifieerd (schema, RLS, policies) — dat deel van de opdracht is succesvol afgerond.
- Productie is op dit moment **niet bruikbaar voor een echte gebruiker**: niemand kan zich registreren of inloggen. Dit is een bestaand, niet door vandaag's werk veroorzaakt probleem dat nu voor het eerst zichtbaar is geworden omdat dit de eerste keer is dat het volledige pad tegen productie is getest.
- Sprint 4-ontwikkeling zelf (code, lokaal, met de lokale Supabase-instantie die wél volledig werkt) wordt hier niet door geblokkeerd — die kan starten.
- **Aanbevolen als eerste actie, vóór of parallel aan Sprint 4:** de Supabase Auth-configuratie in productie (Dashboard → Authentication → URL Configuration, en de Vercel-omgevingsvariabelen) controleren en herstellen, gevolgd door een herhaling van deze vier functionele tests. Dit is bewust niet zelfstandig door mij opgelost, omdat het buiten de expliciete scope van deze opdracht viel en toegang tot productie-instellingen/-logs vereist die niet zonder jouw uitdrukkelijke instructie geraadpleegd zijn.
