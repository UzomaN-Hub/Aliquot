# 018 — Dark mode darkens surfaces, not the page; landing v2 patterns

**Date:** 2026-11-27 · **Status:** Accepted (refines decisions 014 and 017)

## Context
Uzoma reviewed landing v1 (6/10, "maybe 4") against the reference (trustedtrucks.com, now studied in a real browser with Playwright screenshots). His corrections:
- In dark mode **only the navbar, divs and containers change**; the page background stays off-white.
- Section headings should **drop in letter by letter and replay every time** a section comes back; all entrances replay.
- A **sticky dark section bar**, a **big hover-changing CTA pill**, a **marquee**, a **hero tab carousel**, richer content, a rich footer, bigger type.
- Unbuilt actions must say **"Coming soon"** in a dialog over a **blurred** page, never do nothing.
- The pinned journey stood still too long; the dark section should be full-bleed on arrival and round only as you leave.

## Decision
- **Theme semantics:** the light palette is the page's in both modes. `[data-theme="dark"]` changes only the top bar and elements marked **`data-surface`** (nav bars, panels, cards, menus, dialogs). **`data-tone="dark"`** forces graphite (landing dark sections, footer, section bar); **`data-tone="light"`** forces light inside dark (the drawn phone's screen). Surfaces always use their own text colour (`[data-surface], [data-tone] { color: var(--ink) }`). Base CSS reads `var(--ink)` and friends directly, because Tailwind's `--color-*` aliases resolve once at the page level.
- **Dialogs blur the page** (`backdrop-blur-md` on the overlay) app-wide.
- **Landing patterns:**
  - a section header row (Eosin square, number, label that decodes via ScrambleText, tagline, hairline) and two-tone headlines (ink, then Prussian). Section labels and the "Coming soon" tag are **functional** (navigation, status), an explicit exception to DESIGN.md rule 4 for the landing page.
  - a sticky graphite section bar with the current section lit and an Eosin progress line.
  - the `CtaPill`: big, ink → Prussian on hover, an arrow in a circle.
  - a hero tab carousel that lights a lane of the figure; a marquee band.
  - Switchers (outlined words that fill in) for the sections and the roles.
  - a delivery section with a drawn phone; a "What's next" section whose cards open "Coming soon".
  - a graphite footer with columns and a giant wordmark.
- **Motion:** every entrance uses `toggleActions: "restart none restart none"` (replays from either direction). Headlines drop letter by letter (random order, about 1.3 s). The journey pin is short (1.8 screens) and always moving (a tube travels the track). The dark section rounds only on exit. Triggers are sorted top-to-bottom before measuring (`ScrollTrigger.sort()`), so the pin's scroll space doesn't shift later triggers.

## Alternatives considered
- **Whole-page dark mode (decision 014's first version):** what Uzoma rejected; also makes Eosin and Prussian less distinct.
- **Play entrances once:** calmer, but the page feels dead on the way back up; the reference replays.
- **Keep the long pin with steps dimming:** looked frozen; replaced by continuous movement.

## Consequences
- New container components must add `data-surface` to darken in dark mode.
- Landing browser tests cover the Coming soon dialog and the section bar; review screenshots per section come from `e2e/capture.spec.ts`.
