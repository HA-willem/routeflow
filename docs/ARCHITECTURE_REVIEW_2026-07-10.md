# Architecture Review — post-Sprint-3 (2026-07-10)

**Doel:** volledige architectuurreview van de codebase vóór de start van Sprint 4, met uitsluitend kleine, niet-functionele verbeteringen. Geen nieuwe features.
**Status:** DONE — refactors uitgevoerd, elk als losse commit; lint/typecheck/tests groen.
**Scope:** app/, lib/, components/, hooks/, supabase/migrations/, supabase/functions/, tests/.

## Samenvatting

De codebase is in goede staat voor drie afgeronde sprints: consistente RLS-als-enige-autorisatiegrens, overal Zod-validatie vóór schrijfacties, geen service-role-key-gebruik buiten Edge Functions, en een duidelijke component-gelaagdheid (primitives → composed → domain). Er is geen ernstige technische schuld gevonden. De belangrijkste bevinding is operationeel, niet architecturaal: **productie loopt achter op de lokale migraties** (zie §6).

Het review is uitgevoerd door twee onafhankelijke deep-dive analyses (applicatielaag; data-/RLS-/Edge-Function-laag), waarna de bevindingen hier gesynthetiseerd en de veilige subset daadwerkelijk doorgevoerd is.

## 1. Performance

- **Gevonden:** `supabase/functions/planning-generate/index.ts` doet een N+1-patroon (losse `services`/`jobs`-lookup per dienstafspraak) en heeft geen paginatie op de tenant-brede query. Bij groei (500+ beurten/week/tenant, doc 38) wordt dit een knelpunt.
  **Actie:** *niet* opgelost — vereist een echte batching-herstructurering (architectuurkeuze), geen kleine refactor. Wél opgelost: de tot nu toe stille fout bij de `next_ideal_date`-cache-update logt nu correct (zie §5).
- **Gevonden:** lijstpagina's (`klanten`, `diensten`, objecten-tab) hebben geen paginatie. Op de huidige schaal geen probleem; wordt een risico bij honderden+ rijen per tenant.
  **Actie:** niet opgelost — vraagt een UX-beslissing over paginatie/infinite scroll, geen non-functionele wijziging.
- **Positief:** geen client-side data-fetching buiten Server Actions; RSC's zijn overal server-only.

## 2. Security

- Alle Supabase-clients gebruiken uitsluitend de anon-key; nergens is de service-role-key buiten Edge Functions gevonden. RLS is consistent de enige harde autorisatiegrens, precies zoals `36_Security.md` voorschrijft.
- Elke Server Action valideert met Zod vóórdat er geschreven wordt; `company_id` komt altijd van de server (nooit van client-input).
- **Gevonden:** `pauseSchema` stond inline in een actions-bestand i.p.v. in `lib/validation/`, als enige uitzondering op een verder consistente laagindeling.
  **Actie:** opgelost — verplaatst naar `lib/validation/service-agreement.ts`, met nieuwe unit tests (commit `fc31303`).
- **Openstaand punt (niet onderzocht in dit review):** `app/auth/confirm/route.ts` (PKCE-callback) is niet diepgaand gecontroleerd op open-redirect via een `next`-queryparameter. Aanbevolen als vervolgstap, geen architectuurwijziging.

## 3. Maintainability

- **Gevonden:** vier CRUD Server Actions (klanten, objecten, diensten, dienstafspraken) herhalen bijna identieke boilerplate voor unique-violation-afhandeling (`23505`).
  **Actie:** opgelost — `mapPostgresError()`-helper toegevoegd aan `lib/errors.ts`, toegepast in klanten/objecten-actions (commit `9cd5bbd`).
- **Gevonden:** vier Dutch domain-enum label-maps (`CUSTOMER_TYPE_LABEL`, `BILLING_PREFERENCE_LABEL`, `OBJECT_TYPE_LABEL`, `FREQUENCY_LABEL`) stonden letterlijk gekopieerd in 2-3 bestanden elk, zonder gedeelde bron — een reëel drift-risico als een enum-waarde wijzigt.
  **Actie:** opgelost — gecentraliseerd in nieuw `lib/labels.ts` (commit `9183a28`).
- **Gevonden, niet opgelost (grotere refactor):** vier domeinformulieren + twee actie-componenten (6 call sites) implementeren identieke submit/transition/toast-logica. `hooks/` bestaat al maar is leeg — de natuurlijke plek voor een gedeelde `useFormSubmit`-hook. Bewust niet aangepakt in dit review: raakt 6 call sites tegelijk en is meer dan een "kleine" wijziging; aanbevolen als eerste taak vroeg in Sprint 4, apart gereviewd.
- **Gevonden, niet opgelost (documentatiebeslissing):** `docs/12_Entiteiten.md` noemt een TS-type `WorkLocation` voor `objects` dat nergens in de code bestaat (de gegenereerde Supabase-types worden direct gebruikt). Geen functioneel probleem, wel een doc/code-drift om te corrigeren of bewust te documenteren.

## 4. Technical debt

- Geen TODO/FIXME/HACK-markers gevonden in app/lib/components.
- Twee bewust gedocumenteerde, geaccepteerde afwijkingen (niet in scope van dit review om op te lossen):
  1. Dienstafspraak + Prijsafspraak worden als twee sequentiële, niet-atomaire inserts aangemaakt (pas relevant zodra facturen bestaan, Sprint 5+).
  2. BR-030-beurtannulering bij pauzeren is best-effort or de pauzeactie zelf slaagt altijd door, ook als de annulering faalt (gelogd, niet stil).

## 5. Refactor-kansen (uitgevoerd)

Elke onderstaande wijziging is los gecommit:

1. `fc31303` — `pauseServiceAgreementSchema` verplaatst naar `lib/validation/`, met tests.
2. `327aa2b` — README-tegenstrijdigheid over toegepaste migraties gecorrigeerd.
3. `9cd5bbd` — `mapPostgresError()`-helper, dedupe van 23505-afhandeling.
4. `9183a28` — `lib/labels.ts`: centrale Nederlandse domein-labels.
5. `f160e92` — unit tests voor `lib/auth/session.ts` (voorheen 0% dekking op de meest security-kritieke module).
6. `34d0fac` — index op `service_agreements.service_id`/`pricing_id`/`last_completed_job_id`.
7. `fa9716c` — formaat-constraint op `customers.kvk_number` (8 cijfers), analoog aan de bestaande postcode-check.
8. `e9492fd` — voorheen stille fout bij de `next_ideal_date`-cache-update in `planning-generate` wordt nu gelogd.

**Bewust niet uitgevoerd** ondanks aanbeveling in het onderzoek: een pricings-RLS-rolmatrixtest. De DB-laag-analyse stelde voor dit te doen "analoog aan de bestaande rol-tests voor customers/objects" — die rol-tests bestaan echter niet (zie `customers-rls.test.ts` regel 10-15): er is nog geen gebruikers-uitnodigingsfunctie, dus een planner/medewerker-testgebruiker kan niet worden aangemaakt. Deze test is dus niet haalbaar vóór die feature bestaat; toegevoegd als bekende vervolgstap, niet als bug in dit review.

## 6. Database-ontwerp & migratiehygiëne

- **Belangrijkste bevinding:** productie (Supabase Cloud) had bij aanvang van dit review alleen migraties 001-008 toegepast; 009 (`jobs`) en 010 (`service_agreements_horizon`) stonden lokaal klaar maar waren **niet gedeployed** — geverifieerd via `npx supabase migration list`. De README sprak zichzelf hierover tegen (regel 12 zei 001-010, regel 16 zei 001-008). Gecorrigeerd naar de geverifieerde waarheid (commit `327aa2b`). **Dit betekent dat Sprint 3's kernfunctionaliteit (beurten/jobs, horizon-planning) nog niet live staat in productie** — een deploy-actie, niet uitgevoerd in dit review omdat dat een expliciete bevestiging vereist (productie-DB-wijziging).
- Consistente `created_at`/`updated_at`-triggers, `archived_at`-soft-delete-conventie, en ongewoon grondige CHECK-constraints (bewust regel-gedreven uit `10_BusinessRules.md`).
- Kleine schema/doc-drift gevonden (`frequency_interval` vs `frequency_interval_days`, `vat_rate`-types) — niet gecorrigeerd in dit review, alleen gevlagd; laag risico, documentatie-only.
- `onboard_company()`'s slug-generatie heeft een race condition onder gelijktijdige signups met dezelfde bedrijfsnaam — gevlagd, niet opgelost (vereist een lock/retry-strategie, een ontwerpbeslissing).

## 7. RLS

- Elke tenant-tabel heeft RLS aan met correcte `company_id = current_company_id()`-scoping; geen `USING (true)`-gaten gevonden.
- **Gevonden, niet opgelost:** `current_user_role()` doet een DB-subquery per policy-evaluatie (i.t.t. `current_company_id()`, die uit de JWT leest). Bij schaalgroei (bulk-writes via planning-generate) een reële kostenvermenigvuldiger. De structurele fix (rol ook in de JWT-claim zetten, zoals `company_id`) is een ontwerpwijziging aan de auth-flow — bewust niet in dit review doorgevoerd.

## 8. Edge Functions

- `planning-generate` gebruikt correct de caller-JWT (nooit service-role); N+1-patroon is de belangrijkste schaalbaarheidsbevinding (zie §1), niet in dit review opgelost.
- Kleine fix doorgevoerd: de voorheen ongecontroleerde `next_ideal_date`-update logt nu fouten (§5, punt 8).

## 9. API-structuur, testdekking, domeinmodel, componentarchitectuur

- Geen `app/api/*`-routes — bewust, PostgREST/Server Actions + één Edge Function, conform `13_API_Specificatie.md`.
- Server Action-returnvormen zijn 100% consistent (`ActionResult<T>`).
- Component-gelaagdheid (primitives/composed/domain) en server/client-scheiding zijn overal correct toegepast.
- Testdekking: sterk voor pure logica (`lib/validation/*`, `lib/planning/horizon.ts`); voorheen zwak voor `lib/auth/session.ts` (nu opgelost, zie §5) en nog steeds afwezig voor Server Actions en componenten zelf (`*.test.tsx` bestaat nergens, ondanks volledig geconfigureerde jsdom/Testing-Library-infrastructuur). Dit is een reële dekkingslacune maar te omvangrijk voor "kleine, niet-functionele verbetering" — aanbevolen als vroege Sprint 4-taak.

## Verificatie

- `npx tsc --noEmit` — schoon na elke wijziging.
- `npx eslint .` — schoon.
- `npx vitest run` (unit) — 109/109 groen.
- `npm run test:integration` (RLS, tegen lokale Supabase incl. migraties 011/012) — 39/39 groen.
- `npx supabase db reset` — beide nieuwe migraties passen schoon toe op een verse database.

## Aanbevelingen voor na dit review (niet uitgevoerd, buiten scope)

1. **Productie-migraties 009-010 deployen** — vereist expliciete bevestiging, is een deploy-actie op een live systeem.
2. `useFormSubmit`-hook extraheren voor de 6 duplicerende form/actie-componenten (grotere refactor, apart reviewen).
3. N+1/paginatie-herstructurering van `planning-generate` vóór het écht op schaal draait.
4. `current_user_role()` naar JWT-claim verplaatsen (ontwerpwijziging, mirror van `current_company_id()`).
5. Unit tests voor Server Actions en componenten (infrastructuur staat al klaar, wordt nergens gebruikt).
6. `docs/12_Entiteiten.md`'s `WorkLocation`-typenaam corrigeren of alsnog invoeren.
