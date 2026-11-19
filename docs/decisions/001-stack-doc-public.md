# 001 — STACK.md is public; costs are private

**Date:** 2026-11-19 · **Status:** Accepted

## Context
The GitHub repo is public from day one. CLAUDE.md listed `docs/STACK.md` as private, but `.gitignore` didn't exclude it and `docs/README.md` presented it as a shared doc, so the three disagreed. STACK.md mixed two kinds of content: the tools we chose and why (good portfolio material) and the monthly cost table (personal budget).

## Decision
Split it.
- `docs/STACK.md` is committed and public: tools, roles, region, scale path.
- Costs move to `docs/COSTS.md`, which is in `.gitignore` and stays local. This includes the per-environment dollar figures that were in ARCHITECTURE.md §12.
- CLAUDE.md §4 lists COSTS as private alongside PROJECT_INSTRUCTIONS, BUILD_PLAN, PROGRESS, `docs/pdf/` and the design PNGs.

## Alternatives considered
- **Keep all of STACK.md private.** Hides the costs, but reviewers and interviewers lose the clearest summary of the tools chosen and why.
- **Make all of STACK.md public.** Simplest, but publishes a personal budget that adds nothing to the portfolio.

## Consequences
- Two files to keep in step: a tool change may need an edit in both STACK.md and COSTS.md.
- Public docs must never contain prices or plan costs; they go in COSTS.md.
- Anyone cloning the repo won't have COSTS.md; nothing in the code depends on it.
