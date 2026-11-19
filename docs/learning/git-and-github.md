# Git and GitHub: repo, remote, branches, protecting `main`

## 1. Monorepo
**What it is:** one repository holding every part of the product: web app, API, shared packages, infrastructure, docs.
**Why we use it:** one pull request can change the API and the screen that uses it together, and CI checks both in one run.
**Without it:** separate repos drift apart; a feature lands in two PRs that can't be tested together.
CI stays fast anyway: path filters run backend jobs only when `apps/api/**` changes, frontend jobs only when `apps/web/**` changes.

### `.gitkeep`
Git saves files, not folders, so an empty folder disappears from the repo. An empty file called `.gitkeep` keeps it. The name is a convention, not a Git feature. Delete it once the folder has real files (`create-next-app` refuses to run in a folder that isn't empty).

## 2. Remote and push
**A remote** is a nickname for another copy of the repo, here the one on GitHub. `origin` is the usual name.

| Command | What it does |
| --- | --- |
| `git remote add origin <url>` | Saves the address. Uploads nothing |
| `git remote -v` | Lists remotes |
| `git ls-remote origin` | Lists the branches on the remote. Empty = empty repo, safe to push |
| `git push -u origin main` | Uploads `main`. `-u` links local `main` to GitHub's `main`, so later a plain `git push` / `git pull` knows where to go |
| `git status -sb` | First line shows the link, e.g. `main...origin/main`, and whether you're ahead or behind |

On Windows PowerShell 5.1, `git push` can report "exit code 255" even when it worked. Git writes progress to stderr, and PowerShell 5.1 treats that as an error. Read the output: `* [new branch] main -> main` means success.

## 3. Branches and pull requests (how every change lands)
```powershell
git switch main; git pull                 # start from the latest main
git switch -c feat/samples-reception      # new branch for one change
# ...edit, then:
git add -A; git status                    # check: no secrets, no private files
git commit -m "feat(samples): add reception scan"
git push -u origin feat/samples-reception
# open the PR on GitHub → CI runs → Squash and merge → delete the branch
git switch main; git pull                 # bring the merged change home
```
Branch names: `feat/…`, `fix/…`, `docs/…`, `chore/…`, `ci/…`. Merge within a day (trunk-based).

## 4. Protecting `main`
**What it is:** a GitHub **ruleset** (ours is `protect-main`) that sets rules for what may happen to the `main` branch.
**Why we use it:** `main` must always be deployable (CONVENTIONS.md §3). The ruleset enforces that, instead of relying on memory.
**Without it:** one quick `git push` straight to `main` skips review and CI, and a broken `main` gets deployed.

| Rule | What it stops |
| --- | --- |
| Require a pull request (0 approvals) | Pushing straight to `main`. 0 because GitHub won't let you approve your own PR |
| Block force pushes | Rewriting `main`'s history (`git push --force`) |
| Restrict deletions | Deleting `main` |
| Require linear history | Merge commits. History stays one straight line |
| Allowed merge method: squash only | A PR's messy work-in-progress commits. Squash turns the whole PR into one clean commit |
| Bypass list empty | You (the admin) quietly skipping the rules |
| *Require status checks* (later) | Merging when CI is red. Turned on once `ci.yml` exists |

**Squash merge:** a PR with 6 commits ("wip", "fix typo"…) lands on `main` as one commit named after the PR. `main`'s history then reads like a changelog.

**Checking the rules without changing anything:** for a public repo, GitHub's API lists the rules active on a branch:
`https://api.github.com/repos/UzomaN-Hub/Aliquot/rules/branches/main`
A ruleset that is saved but "Disabled" doesn't appear there.

## Where it's used in Aliquot
- Repo layout: `apps/`, `packages/`, `infra/`, `docs/` (CONVENTIONS.md §2).
- Remote: `origin` → github.com/UzomaN-Hub/Aliquot.
- Ruleset `protect-main`: GitHub → Settings → Rules → Rulesets.
