# Next.js and pnpm — the web app

## pnpm
**What it is:** a JavaScript package manager, like npm. It keeps one copy of each package version on the disk and links it into every project.

**Why we use it:** faster installs, much less disk use, and it's strict: code can only import packages listed in its own `package.json`, so a missing dependency fails on your laptop, not in production.

**Without it (npm):** slower installs, and "phantom" imports of packages you never declared that break when a sub-dependency changes.

| Want to | npm way | pnpm way |
| --- | --- | --- |
| Install everything (fresh clone) | `npm install` | `pnpm install` |
| Add a package | `npm install zod` | `pnpm add zod` |
| Add a dev-only package | `npm install -D vitest` | `pnpm add -D vitest` |
| Run a script | `npm run lint` | `pnpm lint` |
| Install exactly the lock file (CI) | `npm ci` | `pnpm install --frozen-lockfile` |

`pnpm-lock.yaml` = exact versions (like `uv.lock`); always commit it. `"packageManager": "pnpm@10.33.2"` in `package.json` pins pnpm itself; CI reads it.

## Next.js (App Router)
**What it is:** a React framework. Folders under `src/app/` become URLs; a `page.tsx` is a page, a `layout.tsx` wraps pages, a `route.ts` is an API endpoint.

**Why we use it:** pages render on the server (fast first paint on slow phones), it splits JavaScript per route, and one deploy on Vercel serves the landing page, lab app and public result pages.

**Without it:** we'd assemble routing, server rendering, code splitting and image/font optimisation ourselves.

**What we set up (and why):**
| Piece | Where | Why |
| --- | --- | --- |
| Validated config | `src/lib/config.ts` (Zod) | Build fails with a clear list if `PLATFORM_NAME`, `API_URL`… are missing. Same rule as the API's Settings |
| Same-origin proxy | `next.config.ts` → `rewrites()` | Browser calls `/api/v1/…` here; Next forwards to FastAPI `/v1/…` (decision 003) |
| Web health | `src/app/api/health/route.ts` | `connection()` makes it run per request; a prerendered copy would say "ok" even when down |
| `poweredByHeader: false` | `next.config.ts` | Don't advertise the framework in every response |
| `noUncheckedIndexedAccess` | `tsconfig.json` | `list[0]` is typed "maybe undefined", so you must handle the empty case |

**Next.js 16 words:** `proxy.ts` is the new name for what used to be `middleware.ts` (runs before every request: tenant, auth gate, headers). Don't confuse it with our *same-origin API proxy*, which is just a rewrite.

**`localhost` vs `127.0.0.1`:** Node tries IPv6 (`::1`) first for `localhost`; our API listens on IPv4. That's why `API_URL=http://127.0.0.1:8000`.

**Rewrites are baked in at build time.** Change `API_URL` → run `pnpm build` again (dev mode picks it up on restart).

## Checks (from `apps/web`)
| Tool | Command | Catches |
| --- | --- | --- |
| ESLint | `pnpm lint` | Bugs and React/Next mistakes (hooks rules, missing `alt`) |
| Prettier | `pnpm format:check` / `pnpm format` | Formatting; `eslint-config-prettier` stops ESLint arguing with it |
| TypeScript | `pnpm typecheck` | Type errors (`next typegen` first generates route types like `LayoutProps<"/">`) |
| Vitest | `pnpm test` | Logic: config parsing, route handlers, later formatters and flag preview |
| Build | `pnpm build` | Anything that only fails when compiling for production |

## Where it's used in Aliquot
- `apps/web/` — all of the above. CI job "Web · lint, types, tests, build" runs the same five commands.
- FRONTEND.md — the full structure the app grows into.
