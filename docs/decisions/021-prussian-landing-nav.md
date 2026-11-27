# 021 — Prussian landing nav and section bar in light mode

**Date:** 2026-11-27 · **Status:** Accepted (extends 018)

## Context
In light mode the landing nav was Bone like the page, and the section bar was graphite. Uzoma asked for both to be Prussian in light mode, and for "Book a demo" to be Prussian too, turning black on hover. Dark mode stays exactly as it is ("I love how it is").

## Decision
- **A `data-tone="bar"` palette** in `tokens.css`. In light mode it's Prussian with Bone text: ink 10.6:1, secondary 8.4:1, muted 6.9:1, Eosin text 4.7:1. In dark mode it takes the graphite palette, so dark is unchanged. The nav and the section bar use it, and both are solid in light mode, because 90% see-through Prussian read as grey. In dark mode they keep their earlier see-through blur.
- **The action pill gets its own colours** (`--cta`, `--on-cta`, `--cta-hover`, `--on-cta-hover`):
  - light page: Prussian, then ink on hover;
  - dark mode: ink, then Prussian, as before;
  - on graphite blocks: light, then softened Prussian, as before.
- **Inside the Prussian nav the pill is Bone, then ink on hover.** A Prussian pill on a Prussian bar would disappear.
- This matches the app's Prussian top bar (decision 014): the product's chrome is Prussian everywhere in light mode.
- **Update, same day (Uzoma's review):**
  - **Over dark blocks the bars turn graphite.** When the nav (just below its edge) or the section bar (its middle) sits over a full-width dark block marked `data-nav-tone="dark"` (the disciplines section, the Prussian closing band, the footer), its tone switches to `dark`. It's checked on scroll, on resize and every 400 ms, because pins and the morphing dark frame move content without scrolling (`use-tone-under.ts`).
  - **Pill colours, final:**
    - light page: Prussian, then graphite on hover;
    - dark mode: graphite, then Prussian on hover;
    - inside the Prussian nav: white, then graphite;
    - inside a graphite nav (dark mode, or over a dark block): white, then Prussian.

  The hover always contrasts with the bar, so the pill never disappears into it.

## Alternatives considered
- **Prussian pill in the nav too:** invisible against the bar.
- **Reuse `data-tone="dark"` and repaint it:** dark tone means graphite in both modes; a separate tone keeps both meanings clear.

## Consequences
- Light-mode browser test: the nav background is exactly Prussian (`rgb(27, 58, 92)`), and in dark mode it isn't.
- DESIGN.md colour section notes the bar tone.
