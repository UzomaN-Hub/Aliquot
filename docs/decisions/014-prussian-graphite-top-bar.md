# 014 — Prussian blue and graphite, time-based theme, top bar, centred sign-in

**Date:** 2026-11-25 · **Status:** Accepted (supersedes the Haematoxylin palette of DESIGN.md v1 and parts of decisions 008 and 009)

## Context
Uzoma reviewed the first real screens and rated the design 2/10:
- The sign-in split into two panels (lab name | form) and the sidebar app shell are the most common AI-generated layouts.
- His laptop is in dark mode, so the OS-driven dark theme painted whole pages Haematoxylin purple. He wanted off-white backgrounds, with colour only on small elements.
- He doesn't like Haematoxylin purple as the main colour.

He compared four options side by side (`docs/prototypes/palette-options.html`).

## Decision
- **Light mode:** Bone background, **Prussian blue** `#1B3A5C` (from Perls' iron stain, still a pathology stain) for buttons, the top bar and highlights. Near-black text.
- **Dark mode:** **graphite** `#1E1E1C` background, off-white text, Prussian softened to `#A9BCD0`.
- Eosin unchanged in meaning: attention only. All tones muted, never glossy.
- **Theme by time, not by the OS:** Auto (default) is dark 19:00–08:00 by the device clock; Light and Dark override it and are kept in `localStorage` (the word only). A tiny boot script in `<head>` applies it before the first paint, so there's no flash. The control is on sign-in and in the app menu.
- **Top bar, no sidebar:** lab name left, the role's main places, the person's name and a nine-dot menu on the right.
- **Sign-in:** a centred, generous form panel over a drawn, blurred blood film drifting slowly (60 s), with a veil for contrast, the lab name large at the top left, and the theme control at the top right.

## Alternatives considered
- **Graphite in both modes:** very editorial, but light mode loses identity; kept for dark mode, where it shines.
- **Malachite green:** distinctive, but reads as "success/health app".
- **Keep Haematoxylin on small elements only:** Uzoma disliked the hue itself.
- **Follow the OS dark mode:** caused the full-purple pages; time-based Auto matches lab shifts (night bench work) better.
- **Soft gradient blobs behind sign-in:** the "aurora" background is itself an AI cliché; the blood film is ours.

## Consequences
- `tokens.css` holds both palettes under `[data-theme]`; components didn't change their class names (`bg-primary`, `text-ink`…).
- The inline boot script is the one `dangerouslySetInnerHTML` outside /styleguide: a static string, no user data. It gets the CSP nonce when `proxy.ts` adds CSP.
- Approved Stitch screens (designs/01, 02) are now layout history only; their sidebar and colours are superseded.
- Contrast pairs re-checked for both palettes (values and ratios in `tokens.css` comments).
