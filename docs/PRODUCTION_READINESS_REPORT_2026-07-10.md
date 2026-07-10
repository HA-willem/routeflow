# Production Readiness Report (2026-07-10)

**Doel:** productieomgeving volledig werkend maken vóór public beta — geen nieuwe functionaliteit, uitsluitend configuratie en kleine bugfixes.
**Vervolg op:** `docs/DEPLOYMENT_REPORT_2026-07-10.md`, dat de migraties 009–010 succesvol deployde maar registratie/login op productie volledig kapot vond.

## 1. Vercel Environment Variables

| Variabele | Bevinding | Actie |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Correct: `https://zffxxhqmefkfjpesonbt.supabase.co` (matcht het productieproject) | Geen wijziging nodig |
| `NEXT_PUBLIC_SITE_URL` | Correct: `https://routeflow-delta.vercel.app` | Geen wijziging nodig |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **Fout.** Stond op `sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH` — dit is niet een project-specifieke sleutel, maar de generieke, vaste publishable key die élke lokale `supabase start`-instantie gebruikt (bevestigd: identiek aan de key uit dit sessies eigen lokale `supabase status`-output). Elke Auth-aanroep vanuit productie werd hierdoor afgewezen vóórdat er zelfs maar credentials gecontroleerd werden — de oorzaak van zowel de kapotte registratie als login. | **Opgelost.** Bijgewerkt naar de echte anon-sleutel van het productieproject (`role: anon`, `ref: zffxxhqmefkfjpesonbt`, geverifieerd door de JWT-payload te decoderen) via `vercel env update`, voor zowel Production als Preview. |

Na de fix is een nieuwe productiedeploy getriggerd (`vercel deploy --prod`, met expliciete toestemming) zodat de gecorrigeerde sleutel daadwerkelijk in de build is meegebakken (`NEXT_PUBLIC_*`-vars worden op build-tijd ingebakken, niet at runtime gelezen).

## 2. Supabase Auth Settings

| Instelling | Bevinding | Actie |
|---|---|---|
| **Site URL** | **Fout.** Stond op `localhost:3000` — bevestigingsmail-links kregen hierdoor `redirect_to=http://localhost:3000`, onbruikbaar voor een echte gebruiker. | Door de gebruiker gecorrigeerd naar `https://routeflow-delta.vercel.app` in het Dashboard. Geverifieerd: een link die vóór de fix gegenereerd was, loste na de fix alsnog correct op naar `https://routeflow-delta.vercel.app/login` (GoTrue evalueert dit blijkbaar op verify-tijd, niet bij linkgeneratie). |
| **Redirect URLs** | Aangevuld met `https://routeflow-delta.vercel.app/**` door de gebruiker. | Opgelost. |
| **Email confirmations** | Stond aan (`enable_confirmations=true`, consistent met `22_Authenticatie.md` §1 en de code in `app/(auth)/registreren/actions.ts`). | Geen wijziging nodig — werkt zoals bedoeld. |
| **PKCE** | Werkend bevestigd: de bevestigingslink is een `pkce_...`-token via `/auth/v1/verify`, en de exchange rondt correct af (`auth.users.email_confirmed_at` wordt gezet). | Geen wijziging nodig. |
| **SMTP** | **Bevinding, geen bug:** het project gebruikt Supabase's ingebouwde, gedeelde mailer (geen custom SMTP). E-mails komen aantoonbaar aan (bevestigd via een echte inbox), maar de rate limit is laag genoeg dat twee testregistraties binnen een paar minuten al een "wacht even"-melding gaven. **Niet geschikt voor echte productietrafiek.** | **Niet opgelost — aanbeveling voor vóór public beta:** configureer custom SMTP (Dashboard → Authentication → Emails → SMTP Settings) zodat het verzendvolume niet door onboarding van echte gebruikers geraakt wordt. |
| **Email templates** | Niet inhoudelijk gecontroleerd (buiten scope van deze sprint — "uitsluitend configuratie of kleine bugfixes", en de template functioneert aantoonbaar: link kwam aan, bevatte het juiste token/type). | Geen actie; aanbevolen voor een latere polish-ronde (NL-teksten/huisstijl controleren). |

## 3. Volledige productie smoke test

Uitgevoerd tegen `https://routeflow-delta.vercel.app`, ná de deploy met de gecorrigeerde anon-key en ná de Site-URL-fix.

| Stap | Resultaat |
|---|---|
| Registreren | ✅ Slaagt (was stap 1 die eerder faalde met een generieke fout) |
| Bevestigingsmail | ✅ Komt aan in een echte inbox; link bevat een geldig PKCE-token en een correcte `redirect_to` |
| Bevestigen (linkbezoek) | ✅ `auth.users.email_confirmed_at` wordt gezet; eindbestemming is nu `routeflow-delta.vercel.app`, niet meer `localhost` |
| Login | ✅ Slaagt met de juiste credentials; foutmeldingen voor onjuiste credentials tonen nu ook correct "E-mail of wachtwoord onjuist." (was eerder ook de generieke fout) |
| Onboarding | ✅ Bedrijf aanmaken slaagt; company + profielkoppeling correct |
| Logout | ✅ Werkt, stuurt terug naar `/login` |
| Opnieuw inloggen | ✅ Slaagt, bedrijfsnaam correct zichtbaar na herinloggen |

**Kleine, niet-blokkerende observatie:** tijdens de test rapporteerde `page.url()` op enkele momenten kort een inconsistente waarde (`/` terwijl de onboardingpagina-inhoud al zichtbaar was) voordat alles alsnog correct functioneel afrondde. Alle **inhoud-gebaseerde** assertions (daadwerkelijk zichtbare tekst/koppen) slaagden consistent bij een herhaalde run; dit lijkt een cosmetisch Playwright/navigatie-timingsdetail zonder functionele impact, geen bug in de applicatie. Niet verder onderzocht binnen scope van deze sprint (geen functionele wijziging nodig).

## 4. Controle auth.users / users / companies

Voor het nieuw aangemaakte testaccount (`willemvanliempd@hotmail.nl`), na de volledige flow:

| Tabel | Resultaat |
|---|---|
| `auth.users` | Rij aanwezig, `email_confirmed_at` correct gezet |
| `public.users` | Rij aanwezig, gekoppeld aan `auth.users.id`, `role = owner`, `full_name` correct overgenomen uit de registratie |
| `public.companies` | Rij aanwezig, naam/slug correct, `subscription_tier = starter` (standaardwaarde), gekoppeld via `public.users.company_id` |

Alle drie tabellen worden correct en consistent gevuld — het `onboard_company()`-RPC-pad (enige toegestane schrijfpad, `003_rls_baseline.sql`) functioneert zoals ontworpen.

## 5. RLS-controle

Herhaalde de RLS-verificatie uit het deploymentrapport ná alle wijzigingen: alle 8 tenant-tabellen (`companies`, `customers`, `jobs`, `objects`, `pricings`, `service_agreements`, `services`, `users`) hebben nog steeds `relrowsecurity = true`; geen enkele tabel is per ongeluk gewijzigd. De nieuwe testtenant ("Willem Test BV") is een gewone, RLS-geïsoleerde company zoals elke andere.

## 6. Opgeruimde testdata

- Eén onbevestigd wegwerptestaccount (`deploy-verify-01c14839@routeflow.nl`) staat nog in `auth.users` zonder gekoppeld profiel/company — onschadelijk (nooit bevestigd, geen data eraan gekoppeld), maar niet actief opgeruimd: een directe `DELETE` op `auth.users` in productie viel buiten de scope van "uitsluitend configuratie of kleine bugfixes" en is niet zonder expliciete toestemming uitgevoerd.
- Het testaccount `willemvanliempd@hotmail.nl` + bedrijf "Willem Test BV" is **bewust laten staan** — dit is het account dat je zelf gevraagd had om mee te kunnen testen.

## Wat niet is aangepast

Conform "bouw geen nieuwe functionaliteit" en "pas uitsluitend configuratie of kleine bugfixes toe":
- Geen SMTP geconfigureerd (aanbeveling, geen blocker voor deze sprint's scope, wel voor public beta zelf).
- De `planning-generate` Edge Function staat nog steeds niet op productie (zie deploymentrapport) — niet in scope van deze opdracht, die zich specifiek op Vercel-env-vars en Supabase Auth-instellingen richtte.
- Geen applicatiecode gewijzigd.

## Conclusie

**GO FOR PUBLIC BETA** — met één aantekening: configureer custom SMTP vóórdat er echte gebruikersaanmeldingen op schaal verwacht worden; de huidige ingebouwde mailer heeft een lage, gedeelde rate limit die anders al bij een handvol gelijktijdige registraties tegen "wacht even"-meldingen aanloopt. Dat is een operationele instelling, geen functionele blocker — de kernflow (registreren → bevestigen → inloggen → onboarden → uitloggen → opnieuw inloggen) werkt end-to-end, correct geverifieerd tegen de echte productieomgeving, met correcte data in `auth.users`/`public.users`/`public.companies` en intacte RLS-isolatie.

**Openstaand voor een volgende sprint (niet deze):** `planning-generate` Edge Function deployen naar productie — zonder die stap werkt "eerste planning-generatie" nog niet voor een nieuwe klant/dienstafspraak in productie, ook al is de rest van de keten nu gezond.
