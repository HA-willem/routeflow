# 25 — Design System

**Status:** DONE
**Versie:** 2.0
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
| `--color-surface` | `#F7F8FA` | `#161B22` | Kaarten, panelen |
| `--color-border` | `#E5E7EB` | `#2A2F37` | Randen, scheidingen |
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

- Systeemvoorkeur-volgend (`prefers-color-scheme`), met optionele handmatige toggle (V1).
- Alle tokens hebben een licht- én donkerwaarde (§ 1.1). Componenten verwijzen alleen naar tokens, nooit naar rauwe kleuren, zodat beide thema's automatisch kloppen.
- Beide thema's expliciet getest op contrast (NFR-603).

---

## 8. Implementatie

- **Tailwind CSS** met het thema uit dit document (tokens als CSS-variabelen + Tailwind-config).
- Tokens gedefinieerd op `:root` (licht) en `[data-theme="dark"]` / `@media (prefers-color-scheme: dark)`.
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
