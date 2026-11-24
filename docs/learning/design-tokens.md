# Design tokens — colours, fonts and shapes as code

**What it is:** a **token** is a named design value (`ink`, `radius-control`, `text-body`) that code uses instead of a raw value (`#221D45`, `10px`, `14px`). The values live in one file; everything else refers to the names.

**Why we use it:** DESIGN.md allows three colours, three fonts and a few shapes. If those are the *only* things that exist in Tailwind, nobody can drift, by accident or under time pressure. Changing a value (e.g. a contrast fix) is one edit, everywhere at once.

**Without it:** 40 slightly different purples across 38 pages, a "quick" `text-red-500` for an error, and a dark mode that has to be rebuilt screen by screen.

## How it works in our code
1. **`src/styles/tokens.css`** — the only file with colour values, as CSS variables (`--ink: #221d45`). A second block redefines them for dark mode.
2. **`src/styles/globals.css`** → `@theme inline` — tells Tailwind which utilities exist.
   - `--color-*: initial;` deletes every default colour. Then we add ours: `--color-ink: var(--ink)` creates `text-ink`, `bg-ink`, `border-ink`…
   - Same for fonts, type sizes, weights, radius, shadows, animations: defaults removed, ours added.
   - `inline` means the utility uses `var(--ink)` directly, so it changes when the variable changes.
3. **Dark mode without `dark:` classes.** Components write `bg-surface text-ink`. In dark mode the *variables* flip (`--surface` becomes Haematoxylin, `--ink` becomes Bone), so the same classes give the dark look. Dark mode follows the device setting; `data-theme="dark"|"light"` on any element forces it (the /styleguide shows both side by side).
4. **Semantic names** (`ink-muted`, `selected`, `eosin-text`) say what a colour is *for*, not what it looks like. That's what lets one name hold two values (light/dark).
5. **ESLint guard** (`eslint.config.mjs`) — any hex value, `rgb()`/`oklch()`… or arbitrary colour class (`bg-[#…]`) in a `.ts/.tsx` file fails lint and CI.
6. **Fonts** — `next/font/google` downloads the three families **at build time** and serves them from our own domain: no request to Google from the patient's browser, and fallback fonts are size-matched so text doesn't jump when the real font arrives.

## Contrast (accessibility)
Text must reach **4.5:1** against its background (WCAG AA); large text and non-text marks 3:1. Faint `#8A85A3` is 3.2:1 on Bone, so it's never used for text (decision 008). To check a new pair, compute the ratio before using it.

## Cheat sheet
| Want | Write |
| --- | --- |
| Page background / text | `bg-surface` / `text-ink` |
| Secondary, muted text | `text-ink-secondary`, `text-ink-muted` |
| Divider | `border-hairline` |
| Selected / hover row | `bg-selected` / `hover:bg-hover` |
| Primary button | `bg-primary text-on-primary rounded-control` |
| Critical text / mark | `text-eosin-text` / `border-eosin` |
| Result value, lab no. | `font-mono` (tabular figures) |
| Sizes | `text-caption` 12 · `text-body` 14 · `text-body-lg` 16 · `text-title` 20 · `text-figure` 28 · `text-display` 36 · `text-hero-sm` 44 · `text-hero` 56 |
| Shapes (decision 009) | `rounded-control` 2 · `rounded-panel` 4 · `rounded-hero` 28 (landing) · `rounded-full` pill (marketing) |

## Where it's used in Aliquot
- `apps/web/src/styles/tokens.css`, `apps/web/src/styles/globals.css`
- `apps/web/src/app/layout.tsx` (fonts)
- `apps/web/eslint.config.mjs` (raw-colour guard)
