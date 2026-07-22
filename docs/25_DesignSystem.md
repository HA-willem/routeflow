# 25 — Design System

**Status:** DONE
**Versie:** 2.5
**Bron van waarheid:** `00_PRD.md` § 11 (UX-principes), § 12.1 (Tailwind) — dit document mag het PRD niet tegenspreken.
**Werkinstructie:** zie `MASTER_PROMPT.md`.
**Relaties:** 24_UI_UX.md (principes), 26_ComponentLibrary.md (componenten), 09_NietFunctioneleEisen.md (NFR-6xx toegankelijkheid).

---

## Doel van dit document

Dit document definieert de **design tokens** en fundamenten: kleuren (licht + donker), typografie, spacing, radius, elevation, iconografie en motion. Tokens zijn de single source of truth voor consistentie en worden in code als Tailwind-thema/CSS-variabelen geïmplementeerd (PRD § 12.1).

Principe: **niet ad-hoc pixels of hex-codes in componenten** — altijd via tokens. Dit maakt donkere modus, herbruikbaarheid en toegankelijkheid afdwingbaar.

---

## 1. Kleur

### 1.1 Semantische tokens (i.p.v. rauwe hex in componenten)

| Token | Licht | Donker | Gebruik |
|---|---|---|---|
| `--color-bg` | `#FFFFFF` | `#0E1116` | Paginachtergrond |
| `--color-surface` | `#F0EFE8` | `#201F1A` | Kaarten, panelen |
| `--color-border` | `#E2E0D4` | `#33322B` | Randen, scheidingen |
| `--color-text` | `#111827` | `#E6EDF3` | Primaire tekst |
| `--color-text-muted` | `#5F6368` | `#9BA4B0` | Secundaire tekst |
| `--color-primary` | `#1A73E8` | `#4C8DF6` | Primaire actie, links |
| `--color-primary-contrast` | `#FFFFFF` | `#0E1116` | Tekst op primair |
| `--color-success` | `#34A853` | `#3FBF67` | Betaald, uitgevoerd |
| `--color-warning` | `#F59E0B` | `#FBBF24` | Weer, capaciteit |
| `--color-danger` | `#EA4335` | `#F87171` | Fout, overdue, verwijderen |
| `--color-info` | `#0EA5E9` | `#38BDF8` | Neutrale meldingen |

### 1.2 Statuskleuren (domein)

Gebruikt voor beurt-/factuurstatussen (consistent met 10_BusinessRules.md statusmachine):

| Status | Token |
|---|---|
| voorgesteld | muted/neutraal |
| gepland | info |
| onderweg | primary |
| uitgevoerd | success |
| niet_thuis / overdue | warning/danger |
| geannuleerd | muted |

**Regel:** kleur is nooit de enige informatiedrager (NFR-toegankelijkheid) — altijd label/icoon erbij.

**Tint-conventie ("pop"-kaarten):** een semantische kleurtoken op 10%-dekking (`bg-{token}/10`, bv. `bg-info/10`) i.p.v. een aparte tint-token — al gebruikt door `StatusBadge`/`JobCard`(highlight)/`ProposalCard`, en sinds de warme-paletvernieuwing (changelog 2.2) ook door `KPICard` (`tone`-prop) op de glanceable statistiek-schermen (dashboard, Vandaag). Uitsluitend daar — dichte schermen (RouteBoard, tabellen, formulieren) blijven neutraal, zie `42_DesignSystem.md`.

### 1.3 Contrast

Alle tekst/achtergrond-combinaties ≥ 4,5:1 (WCAG AA, NFR-603); grote tekst ≥ 3:1. Zowel licht als donker getoetst.

---

## 2. Typografie

| Token | Waarde |
|---|---|
| Font-familie | **Inter** (systeem-fallback: -apple-system, Segoe UI, Roboto, sans-serif) |
| Gewichten | 400 (regular), 500 (medium), 600 (semibold), 700 (bold) |

**Schaal (type scale):**

| Token | Grootte / regelhoogte | Gebruik |
|---|---|---|
| `text-xs` | 12 / 16 | Labels, metadata |
| `text-sm` | 14 / 20 | Secundaire tekst, tabellen |
| `text-base` | 16 / 24 | Bodytekst |
| `text-lg` | 18 / 28 | Subkoppen |
| `text-xl` | 20 / 28 | Sectiekop |
| `text-2xl` | 24 / 32 | Paginakop |
| `text-3xl` | 30 / 36 | Dashboard-hero |

Getallen tabulair (`font-variant-numeric: tabular-nums`) in tabellen/bedragen voor nette uitlijning.

---

## 3. Spacing

Schaal (PRD § 11.2): **4 / 8 / 12 / 16 / 24 / 32 / 48 / 64** px. Uitsluitend deze stappen. Basis-unit = 4px.

Toepassing: component-padding meestal 12–16; sectie-marges 24–32; paginamarges 32–64 (desktop).

---

## 4. Radius & elevation

| Token | Waarde | Gebruik |
|---|---|---|
| `radius-sm` | 4px | Inputs, badges |
| `radius-md` | 8px | Knoppen, kaarten |
| `radius-lg` | 12px | Modals, grote panelen |
| `radius-full` | 9999px | Avatars, pills |

**Elevation (schaduw):** subtiel, in 3 niveaus.
| Niveau | Gebruik |
|---|---|
| `shadow-sm` | Kaarten in rust |
| `shadow-md` | Dropdowns, popovers, gesleepte items |
| `shadow-lg` | Modals, command palette |

Bewust **geen** vierde niveau: shadcn's standaard `shadow-xs` op formulierelementen (button, input, select-trigger, checkbox, switch, textarea) is niet onderdeel van dit systeem — een rand (`border-input`) volstaat voor een element in rust. Bij het regenereren van een primitief via `shadcn add` moet een meegekomen `shadow-xs` daarom bewust verwijderd worden, niet overgenomen.

In donkere modus: elevation via lichtere `surface`-tinten i.p.v. zware schaduw.

---

## 5. Iconografie

- Eén icon-set (lijnstijl, bijv. Lucide) voor consistentie.
- Standaardgroottes: 16 / 20 / 24 px, uitgelijnd op tekst.
- Diensten hebben een eigen `icon` + `color_hex` (12_Entiteiten.md § 5) voor herkenning in planning/kaart.

---

## 6. Motion

| Token | Waarde |
|---|---|
| `duration-fast` | 150 ms |
| `duration-base` | 200 ms |
| `duration-slow` | 250 ms |
| `easing` | `ease-out` (cubic-bezier standaard) |

Alleen betekenisvolle motion (24_UI_UX.md § 1.5). `prefers-reduced-motion` gerespecteerd: transities uit/gereduceerd.

---

## 7. Donkere modus

- **Handmatige toggle gebouwd** (2026-07-21, gebruikersverzoek): Licht/Donker/Systeem, `components/composed/ThemeToggle.tsx` — drie-staten `role="radiogroup"` (geen aan/uit-`Switch`, want geen binaire keuze), rechtsboven in zowel de desktop-appshell (`app/(app)/layout.tsx`) als de medewerker-PWA-shell (`app/m/layout.tsx`).
- **Persistentie:** `localStorage` (`servops-theme`), per device/browser — bewust géén `companies.config_json`-veld of andere serverkant-opslag; dit is een sessie-brede UI-voorkeur, geen bedrijfsinstelling (zie ook § 8).
- Bij voorkeur "Systeem" blijft `prefers-color-scheme` leidend en volgt de app live OS-wisselingen (bijv. automatische avondstand); bij een expliciete "Licht"/"Donker"-keuze overschrijft die de OS-voorkeur totdat de gebruiker "Systeem" opnieuw kiest.
- Alle tokens hebben een licht- én donkerwaarde (§ 1.1), ongewijzigd door deze toggle — alleen het activeringsmechanisme is nieuw, niet de kleurwaarden zelf. Componenten verwijzen alleen naar tokens, nooit naar rauwe kleuren, zodat beide thema's automatisch kloppen.
- Beide thema's expliciet getest op contrast (NFR-603).

---

## 8. Implementatie

- **Tailwind CSS v4** (CSS-first `@theme`, geen `tailwind.config.ts`) met het thema uit dit document (tokens als CSS-variabelen in `lib/design/tokens.css`).
- Tokens gedefinieerd op `:root` (licht), `[data-theme="dark"]`/`[data-theme="light"]` (handmatige toggle) én `@media (prefers-color-scheme: dark)` (fallback zonder JavaScript — progressive enhancement, zie § 7).
- `@custom-variant dark (&:where([data-theme='dark'], [data-theme='dark'] *));` in `app/globals.css` laat Tailwinds `dark:`-utility-varianten (gebruikt in alle `components/primitives/*`) meelopen met hetzelfde `data-theme`-attribuut i.p.v. uitsluitend `prefers-color-scheme` — vóór deze wijziging reageerden token-CSS-variabelen en Tailwind-`dark:`-classes op twee onafhankelijke mechanismen.
- Anti-flits: een klein, inline, blocking `<script>` in `app/layout.tsx`'s `<head>` (vóór hydratie) leest de opgeslagen voorkeur en zet `data-theme` synchroon vóór de eerste paint — voorkomt een zichtbare flits van het verkeerde thema. `components/composed/ThemeProvider.tsx` synchroniseert React-state daarna (via `useSyncExternalStore`, niet `useState`+`useEffect` — localStorage is een external store die op de server niet bestaat).
- Componenten (26_ComponentLibrary.md) consumeren uitsluitend tokens.

---

## 9. Governance

- Nieuwe kleur/afmeting → eerst token toevoegen, dan gebruiken. Geen inline-uitzonderingen.
- Wijziging aan een token = design-review (raakt alles).

---

## Changelog

| Datum | Versie | Wijziging |
|---|---|---|
| 2026-07-06 | 1.0 | Placeholder met enkele tokens |
| 2026-07-07 | 2.0 | Volledige uitwerking: semantische kleur-tokens (licht+donker), statuskleuren, contrast, type scale, spacing, radius/elevation, iconografie, motion-tokens, donkere modus, Tailwind-implementatie, governance |
| 2026-07-19 | 2.1 | § 4 verduidelijkt: `shadow-xs` is expliciet geen vierde elevation-niveau. Audit vond dit ongedocumenteerde schaduwniveau op 6 shadcn-formulierprimitieven (button-outline, input, select-trigger, checkbox, switch, textarea) — bovenop hun rand, op vrijwel elke pagina. Verwijderd uit de betreffende `components/primitives/*.tsx` (geen tokenwijziging, alleen conformance-fix); `card.tsx`/`JobCard`/`ProposalCard`/`dialog.tsx`/`SelectContent`/`RouteDetailsDialog`/`CommandBar` gebruikten al correct sm/md/lg en zijn ongewijzigd. |
| 2026-07-19 | 2.2 | § 1.1 warme paletvernieuwing op gebruikersverzoek (referentie: Housapp-marketingsite, al gesanctioneerde inspiratiebron in `42_DesignSystem.md`): `--color-bg`/`--color-surface`/`--color-border` van koel wit/grijs naar warm ivoor/zand (licht + donker); overige tokens (tekst, accent-/statuskleuren) ongewijzigd, contrast blijft gelijkwaardig (§ 1.3, tekstkleuren zelf niet aangepast). § 1.2: nieuwe "tint-conventie ('pop'-kaarten)"-paragraaf formaliseert het bestaande `bg-{token}/10`-patroon, nu ook toegepast door `KPICard` (`tone`-prop) op dashboard/Vandaag — bewust niet op dichte schermen. Dit is een § 9-tokenwijziging; deze sessie (met expliciete kleurreferentie van de gebruiker) is de vereiste design-review. |
| 2026-07-19 | 2.3 | Correctie op 2.2, ná visuele controle door de gebruiker: `--color-bg` (paginachtergrond) terug naar neutraal wit/`#0E1116` — de volle beige/ivoor-toon oogde te zanderig als *paginaachtergrond*. `--color-surface`/`--color-border` blijven wél warm beige/zand ("de vakken mogen beige blijven"): het contrast tussen een neutrale pagina en een warme `surface` is precies het Housapp-"pop"-effect, niet een uniform warme pagina. |
| 2026-07-19 | 2.4 | Correctie op 2.3: `--color-surface`/`--color-border` (licht + donker) minder verzadigd/zanderig gemaakt op basis van een door de gebruiker aangeleverde referentiekleur (afbeelding, geen exacte pixelwaarde beschikbaar — visueel ingeschat als een zachte, grijzige warme beige i.p.v. de eerdere meer okergele zandtoon). |
| 2026-07-21 | 2.5 | § 7/§ 8: handmatige Licht/Donker/Systeem-toggle gebouwd (was "optioneel V1", nu live) op gebruikersverzoek — `ThemeToggle`/`ThemeProvider`, `localStorage`-persistentie, `@custom-variant dark` zodat Tailwind-`dark:`-utilities en de token-laag hetzelfde `data-theme`-attribuut volgen, anti-flits-inline-script. Geen tokenwaarde-wijziging (zelfde licht/donker-kleuren als 2.4), alleen het activeringsmechanisme. Onderdeel van de ServOps-naamswijziging-sessie (PRD § 19 A-31/A-32). |
