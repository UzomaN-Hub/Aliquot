# 004 — Fixed palette; labs brand with name, logo and signatories only

**Date:** 2026-11-23 · **Status:** Accepted

## Context
Each lab is white-labelled: staff and patients see the lab's identity, never another lab's. The earlier plan also let each lab set its own colours via CSS variables. But colour carries meaning in Aliquot: Eosin marks critical results and STAT (DESIGN.md), and flag colours must pass contrast checks in light and dark mode.

## Decision
Every lab uses the same three-colour palette from DESIGN.md. A lab's branding is its name, logo, address and signatories, shown in the app header, sign-in, public pages, PDFs and messages. No custom lab colours in v1.

## Alternatives considered
- **Per-lab colours via CSS variables:** stronger white-labelling, but a lab could choose a red brand colour that looks like a critical flag, or a pale one that fails contrast. Every lab would multiply the visual test baselines. Rejected for v1.
- **Per-lab accent only (one colour):** smaller risk, but still clashes with Eosin's "attention only" meaning and still needs contrast checks per lab.

## Consequences
- Flag and alert colours mean the same thing in every lab: safer for staff who work in more than one lab.
- One set of visual baselines; accessibility checked once.
- `labs` table needs no colour columns (SCHEMA.md already has none).
- If a large customer requires its own colours later, it becomes a premium option with its own contrast checks.
