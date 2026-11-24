# 009 — Near-square controls (2px), not 10px and not pills

**Date:** 2026-11-24 · **Status:** Accepted

## Context
DESIGN.md gave in-app buttons a 10px radius; the approved Stitch login used pill-shaped fields and buttons. The two disagreed. Aliquot must not look like a generic AI-built app. A 10px radius is shadcn/ui's default (`--radius: 0.625rem`), so it is the shape most v0/Lovable/Bolt apps ship with.

## Decision
- Controls (buttons, fields, result-entry cells): **2px** radius.
- Modals, menus, working panels: **4px**.
- Selected nav item: no filled block; ink colour, semibold, a 2px Haematoxylin bar on the left.
- Landing hero panels (28px) and the marketing pill button are revisited at the landing stage.
- Tokens: `rounded-control` 2px, `rounded-panel` 4px, `rounded-hero` 28px. `rounded-nav` removed.

Concept fit: lab paperwork is square: request forms, logbooks, printed result slips and slide labels. With Instrument Serif and hairlines it reads as precise and printed.

## Alternatives considered
- **10px (old DESIGN.md):** the shadcn default; the generic AI-app look.
- **Pills (Stitch login):** a pill button in a worklist row reads as a status chip, which DESIGN.md rule 4 bans. Multi-line fields (clinical details, film comment, amendment reason) can't be pills, so forms would mix shapes. Pills waste width in the dense result grid.
- **0px:** sharper still, but looks unfinished next to the focus ring and on Windows font rendering.

## Consequences
- The Stitch login and worklist are layout references only; their shapes are rebuilt at 2px/4px.
- One scale for all components; the /styleguide review checks it.
- The 2px corner is subtle; hierarchy keeps coming from type and space, not shape.
