# Aliquot — Project Documents

Multi-tenant Laboratory Information System for Chemical Pathology, Haematology and Medical Microbiology.
All planning agreed 1–18 Nov 2026. These files are the single source of truth for every chat and for Claude Code.

## Read in this order
| # | File | What it decides |
| --- | --- | --- |
| 1 | SCOPE.md | Name, v1 scope per section, what waits |
| 2 | ROLES.md | Roles, permission matrix, super-admin limits |
| 3 | FLOWS.md | Step-by-step user flows for every role |
| 4 | PAGES.md | All 38 pages and 6 templates |
| 5 | DESIGN.md | H&E colours, fonts, component rules, feedback states, guardrails |
| 6 | ANIMATION.md | Landing hero "The stain" |
| 7 | STACK.md | Tools and services |
| 8 | ARCHITECTURE.md | Modular monolith, speed (DSA), security, live updates, environments |
| 9 | SCHEMA.md | Tables, indexes, relationships |
| 10 | CONVENTIONS.md | Learning mode, Git, CI/CD, code style, testing, definition of done |
| 11 | TESTING.md | Every test type, when it runs, pass criteria, release gate |
| 12 | BUILD_PLAN.md | Build stages in order, each with its done-when gate |

## Folders
- `designs/` — approved reference screens (login, section worklist) with required fixes in `designs/README.md`.
- `prototypes/hero-stain.html` — working prototype of the landing hero animation.
- `learning/` — one-page notes on each new tool (starts with uv).
- `decisions/` — one file per trade-off decision (ADR).
- `PROGRESS.md` — session log: done, next, blockers.
- `pdf/` — PDF copies of every document.

`CLAUDE.md` (repo root) is what Claude Code reads first in every session.

## Rule
If a document and the code disagree, the document wins until the document is updated. Every new decision is recorded in `docs/decisions/`.
