# Aliquot — Approved Designs

Only screens in this folder are approved. Build from these, styled by ../DESIGN.md.

**Rules for using these files**
- `../DESIGN.md` is the single source of truth for colour, type, shape and states. If a Stitch file disagrees with it, DESIGN.md wins.
- Stitch's own DESIGN.md files are not kept: they drifted (Eosin as primary, JetBrains Mono/Newsreader).
- Stitch HTML loads "Atkinson Hyperlegible" (original). Production uses **Atkinson Hyperlegible Next** and **Mono**.
- Treat the HTML as layout reference, not production code. Rebuild with our components.

**Public repo note:** the HTML files use a fictional lab ("Demo Diagnostic Laboratory", `demo-lab.example`) and invented patient names. The PNG screenshots still show the original Stitch text and are kept local only (`.gitignore`).

## Index
| # | Screen | Page (PAGES.md) | States approved | Files |
| --- | --- | --- | --- | --- |
| 01 | Lab login | 6 | Default, error | `01-lab-login/default.html`, `error.html`, `error.png` (local only) |
| 02 | Section worklist | 20 | Default, loading, empty, no results | `02-section-worklist/*.html`, `*.png` (local only) — **reference with fixes below** |

## 02 Section worklist: required fixes (the PNGs show these mistakes; build without them)
- Mono font only for lab numbers and Received/Due times. Everything else Atkinson Hyperlegible Next.
- No top bar, no avatar icon. Header starts 48px from the top of the main area.
- No "CHEMICAL PATHOLOGY" label under the lab name.
- Column headers exactly: Lab no., Patient, Tests, Received, Due (sentence case, 12px, muted `#5E5880`; the PNGs' faint `#8A85A3` fails contrast, decision 008) on every state.
- Tests truncate to one line; rows exactly 40px.
- Show all rows (no "Showing 10 of 18", no "View archive log").
- No-results state keeps the real count ("18 waiting"); no footer; normal hairline search border.

## Approach from here
Stitch is retired. Remaining pages are built directly in code from DESIGN.md and the components in /styleguide, reviewed by screenshot.
