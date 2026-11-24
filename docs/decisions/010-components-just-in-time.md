# 010 — Components built just in time; /styleguide is a catalogue, not a gate

**Date:** 2026-11-24 · **Status:** Accepted (supersedes the Stage 2 gate in BUILD_PLAN.md)

## Context
BUILD_PLAN.md Stage 2 required every component to be built and the /styleguide page approved before any real page. After Button, Field, Flag and Banner, Uzoma decided that reviewing components in isolation costs more time than it saves: he'd rather review real pages and correct them there.

## Decision
- Stage 2 closes with the components built so far (Button, Field, PasswordInput, Flag, Banner) and the tokens.
- Each remaining component (Toast, Modal, Skeleton, EmptyState, Table…) is built, with tests, in the slice of the first page that needs it, then added to /styleguide.
- /styleguide stays as a living catalogue (dev, plus staging when `STYLEGUIDE_ENABLED=true`) and the visual-regression baseline later. It is no longer an approval gate.
- Review happens on real pages, against DESIGN.md.

## Alternatives considered
- **Keep the gate:** catches design drift before it spreads to many pages, but delays real work and asks for review of components out of context.

## Consequences
- Real pages start now (Stage 3).
- Risk: a component designed for its first page may need changes for the next. Pages still use only shared components, so a change lands everywhere at once.
- The "components first" guardrail in DESIGN.md still holds per component: no one-off styling in pages.
