# 005 — CI path filters at job level, one required gate check

**Date:** 2026-11-23 · **Status:** Accepted

## Context
CLAUDE.md wants path filters: backend jobs only when `apps/api/**` changes, frontend jobs only when `apps/web/**` changes. The `protect-main` ruleset must also require CI to pass before merging.

GitHub's built-in filter (`on: pull_request: paths:`) skips the **whole workflow**. A skipped workflow reports no status, so a required check stays "Expected — waiting" forever and a docs-only PR can never merge.

## Decision
- One workflow, `ci.yml`, always runs.
- A first job, `changes`, uses `git diff` against the PR's base commit and outputs which areas changed. Each job has `if: needs.changes.outputs.<area> == 'true'`.
- A last job, `CI passed`, runs `if: always()`, needs every other job, and fails only if one failed or was cancelled. It's the **only** required status check.
- Third-party actions are pinned to full commit SHAs.

## Alternatives considered
- **`on: paths:` per workflow:** simplest YAML, but breaks required checks as above.
- **`dorny/paths-filter` action:** popular and tidy, but one more third-party dependency with write-free but code-reading access; our need is a ten-line `git diff`.
- **Require each job as its own check:** every new job means editing the ruleset, and skipped jobs need special handling.

## Consequences
- Docs-only PRs pass in seconds (only `changes` and `CI passed` run).
- Adding a job = add it to `needs:` of `CI passed`; the ruleset never changes.
- `fetch-depth: 0` downloads full history in the `changes` job: fine for this repo's size; switch to a shallow fetch of the base commit if it grows slow.
- Pinned SHAs don't update themselves; Dependabot (ARCHITECTURE.md §9) will propose bumps once enabled.
