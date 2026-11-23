# Aliquot — Frontend Architecture

**Status:** Agreed · 22 Nov 2026
**Scope:** `apps/web` (Next.js App Router, React 19, TypeScript strict). Complements DESIGN.md (look and states), ARCHITECTURE.md (system) and TESTING.md (tests).

## 1. Principles
1. **Server-first, minimal JavaScript.** Render on the server by default; ship client JS only where people interact.
2. **One home for each kind of state** (section 6). Never duplicate server data into a client store.
3. **The API is the source of truth.** The frontend never decides a clinical outcome; it can preview, the server decides.
4. **Fast on a mid-range Android phone on 4G**, not just on a laptop.
5. **Same components everywhere.** Pages compose /styleguide components; no one-off styling.
6. **No patient data leaves memory** except to the API: not in URLs, storage, logs or analytics.

## 2. Folder structure
```
apps/web/src/
  app/                           routes only (thin): layout, page, loading, error, not-found
    (marketing)/                 landing page
    console/                     super-admin platform console
    l/[lab]/                     everything for one lab (path mode; subdomains rewrite here)
      (auth)/                    sign-in, forgot password, set password
      (app)/                     signed-in lab app: dashboard, worklist, patients, results, admin…
      r/[token]/                 public patient result page
      ack/[token]/               public doctor acknowledgement page
    styleguide/                  component and state catalogue (dev + staging only)
    api/                         the web's own route handlers: health only (the SSE ticket is a FastAPI endpoint, reached through the proxy)
  features/                      one folder per backend module
    patients/  requests/  samples/  results/  verification/  alerts/
    catalogue/  staff/  audit/  reports/  auth/  tenants/
      api.ts                     query + mutation hooks, query keys
      components/                feature components
      schemas.ts                 Zod form schemas
      hooks.ts                   feature hooks
  components/
    ui/                          primitives from /styleguide (Button, Field, Banner, Toast, Modal…)
    patterns/                    composed blocks (DataTable, FormSection, EmptyState, PageHeader)
  lib/
    api/                         typed client, error mapping, idempotency keys
    auth/                        session store, refresh lock, cross-tab channel
    realtime/                    SSE client, event → cache invalidation map
    tenancy/                     lab resolution, branding loader
    format/                      numbers, units, dates in lab timezone, flags
    clinical/                    flag preview (mirrors the server rule, tested against it)
  stores/                        Zustand stores (UI-only)
  styles/                        tokens.css, globals.css
  middleware.ts                  tenant resolution, auth gate, CSP nonce, security headers
packages/api-types/              types generated from FastAPI's OpenAPI
```
**Rule:** `app/` holds routing only. Logic lives in `features/` and `lib/`. A feature may import from `components/` and `lib/`, never from another feature's internals.

## 3. Routing and tenancy
- **One internal tree per lab:** `/l/[lab]/…`. In `TENANT_MODE=path`, that's the real URL (`aliquot.vercel.app/l/demo/worklist`). In `subdomain` mode, middleware rewrites `demo.<domain>/worklist` to the same tree, so pages never change when we switch modes.
- **Route groups** split areas with different layouts and rules without changing URLs: `(auth)` bare branded pages, `(app)` signed-in shell with role-based navigation.
- **Middleware, in order:** resolve lab → unknown or suspended lab shows a branded "Unavailable" page → protect `(app)` and `console` routes (no session cookie → sign-in) → set CSP nonce and security headers.
- **Navigation is role-based** (ROLES.md): the nav lists only what the role uses; a route the role can't use returns 403 from the API and shows the "no access" state, even if typed directly.

## 4. Rendering per area
| Area | Strategy | Why |
| --- | --- | --- |
| Landing | Static (prerendered), edge-cached | Fastest possible; no data |
| Sign-in pages | Server-rendered per lab (branding cached 5 min) | Lab name/logo correct on first paint |
| Lab app `(app)` | Server-rendered shell + client data (TanStack Query) | Data is live, per-user and changes constantly |
| Console | Server-rendered shell + client data | Same reasons, small audience |
| Public result / doctor ack | Fully server-rendered, `no-store`, `noindex`, almost no client JS | Works on any phone, nothing cached anywhere |
| /styleguide | Static; blocked in production | Review tool only |

- **Suspense + `loading.tsx`** on every app route show the skeletons from DESIGN.md immediately.
- **Streaming:** the shell and navigation arrive first; data panels stream in.
- **Heavy parts load only when needed** (`next/dynamic`): barcode scanner, charts, PDF preview, the hero WebGL.

## 5. Talking to the API
**Same-origin proxy.** The browser always calls `/api/v1/…` on the web's own origin; Next.js rewrites it to the FastAPI service.
- **Why:** on the free addresses the web (`vercel.app`) and API (`onrender.com`) are different sites. Browsers block or restrict cross-site cookies, so the refresh cookie would break, especially on Safari. Same-origin makes the cookie first-party and removes CORS problems.
- The refresh cookie is `httpOnly; Secure; SameSite=Lax; Path=/api/v1/auth`. The access token lives only in memory.
- **SSE goes direct** to the API with a **ticket**: the client asks `/api/v1/realtime/ticket` (same-origin, proxied to FastAPI, which issues it) for a single-use token valid 60 s, then opens `EventSource` to the API with it. Long-lived streams then never depend on the proxy.
- **What the proxy means for the API** (decision 003):
  - Client IP for rate limits comes from `X-Forwarded-For`, trusted only from the proxy; otherwise every user shares Vercel's IP.
  - The refresh cookie is set with `Path=/api/v1/auth` explicitly (the browser's path, not FastAPI's `/v1/auth`).
  - CORS allows the web origin on the SSE endpoint only; everything else is same-origin.
  - CSRF protection on the refresh endpoint still applies (ARCHITECTURE.md §9); `SameSite=Lax` helps but doesn't replace it.

**Typed client.** `openapi-fetch` over the generated types in `packages/api-types`. A changed endpoint breaks the TypeScript build instead of breaking in production.

**Every request** carries the access token; a 401 triggers one refresh (only one tab refreshes, via Web Locks; ARCHITECTURE.md §9), then retries once. A second 401 shows the sign-in modal, keeping unsaved work.

**Every mutation** sends an `Idempotency-Key` generated when the form is submitted, so double clicks and network retries change data once.

**Errors** use the API's single shape `{ code, message, field? }`:
- `field` set → shown under that field (`setError` in React Hook Form).
- Known `code` → the matching DESIGN.md surface (banner, inline, modal).
- Unknown → generic inline error with a reference ID and a retry action.

## 6. State: where each kind lives
| Kind of state | Home | Examples |
| --- | --- | --- |
| Server data | **TanStack Query** cache | Worklist, patient, results, catalogue |
| Shareable view state | **URL search params** (nuqs) | Search text, filters, sort, page cursor, selected tab |
| Form input | **React Hook Form** + Zod | Register patient, result entry, test editor |
| Local UI | `useState` | Open menu, hover, a dialog's step |
| Cross-component UI | **Zustand** (small stores) | Scanner session, sidebar collapsed, unsaved-entry guard |
| Session | In-memory auth store + BroadcastChannel | Access token, user, role, sections |
| Preferences | `localStorage` (non-sensitive only) | Theme, table density |

**Never:** server data copied into Zustand; patient data in `localStorage`, `sessionStorage`, URLs or analytics; tokens outside memory.
**Why URL state matters:** a scientist can refresh, use back/forward, or send a colleague the exact filtered worklist.

## 7. Server data rules (TanStack Query)
- **Query keys** come from a factory per feature: `samples.keys.worklist(section, filters)`, `patients.keys.detail(id)`. No hand-typed key arrays.
- **Freshness by data type:**

| Data | staleTime | Kept fresh by |
| --- | --- | --- |
| Worklists, verification queue, alerts | 0 (always revalidate) | SSE events |
| Patient, sample, result detail | 30 s | SSE events + mutation invalidation |
| Catalogue, ranges, staff, branding | 10 min | Invalidated when edited |
| Reports | 5 min | Manual refresh |

- **SSE → cache:** one table maps each event to the keys it invalidates (e.g. `sample.received` → that section's worklist; `result.released` → that patient's results). If SSE drops, affected queries fall back to 30 s polling until it reconnects.
- **Pause** live refetching when the tab is hidden; refetch on focus.
- **Optimistic updates** only on an allowlist of low-risk actions (mark collected). Never for verify, release, amend, payment or anything clinical.
- **Prefetch** the next likely screen on hover or row selection (worklist row → result entry).

## 8. Forms and result entry
- **React Hook Form + Zod** for every form. Schemas live in the feature's `schemas.ts`, mirror the API's validation, and are unit-tested.
- **Validation timing** follows DESIGN.md: on blur and submit, never while typing.
- **Unsaved changes guard** on result entry and editors (in-app navigation and tab close).
- **Result entry grid:**
  - Keyboard-first: Enter/Tab/arrow keys move between cells; no mouse needed.
  - Units, ranges and calculated values shown inline.
  - **Flag preview** while typing uses `lib/clinical` with the ranges sent alongside the worklist. The server recalculates on save and its flag is final. A test runs the same cases through both and must agree.
  - Critical values show the inline warning from DESIGN.md before saving.
  - Drafts stay in memory only (not storage) and survive the re-sign-in modal.

## 9. Tables and lists
- **TanStack Table** for structure; **TanStack Virtual** when a list can pass ~100 rows.
- Sorting, filtering and pagination happen **on the server** (keyset cursors); the table never loads everything.
- Row actions appear on selection (DESIGN.md rule), and every row is reachable by keyboard.
- Column definitions live in the feature; the table component is shared from `components/patterns`.

## 10. Branding per lab
- Each lab brings its **name, logo, address and signatories**. They appear in the app header, sign-in, public pages, PDFs and messages.
- The interface palette stays Aliquot's three colours for every lab (consistency, accessibility, flag meaning). **No custom lab colours in v1** (decision 004).
- Branding is fetched once per request on the server and cached; the logo goes through `next/image` with fixed dimensions (no layout shift).

## 11. Performance rules
- First-load JS ≤ 150 KB per route (CI fails above), checked with the Next.js bundle analyser.
- Fonts self-hosted with `next/font`, subset, preloaded; `font-display: swap` with matched fallback metrics.
- Images through `next/image`; the hero ships AVIF/WebP (ANIMATION.md).
- No request waterfalls: a page's queries start in parallel; nested components don't wait for their parents' data unless they need it.
- Memoisation only where the React profiler shows a cost (large grids, virtual lists).
- Targets (from ARCHITECTURE.md / TESTING.md): LCP < 2.0 s on throttled 4G, INP < 100 ms, CLS < 0.1.

## 12. Errors and resilience
- `error.tsx` per route group with a retry action; `not-found.tsx` per area; `global-error.tsx` as the last resort.
- A failed panel shows its own inline error; the rest of the page keeps working.
- Offline: banner from DESIGN.md, mutations disabled with an explanation, form data kept.
- Sentry with PII scrubbing; no patient values or names in breadcrumbs.

## 13. Security (frontend side)
- CSP with per-request nonces (set in middleware); no inline scripts without a nonce.
- No `dangerouslySetInnerHTML` except the few controlled places in /styleguide; all text rendered escaped.
- Tokens never in storage; access token in memory only.
- Clinical responses `Cache-Control: no-store`; public result pages `noindex, nofollow` and `Referrer-Policy: no-referrer` so the token never leaks via referrers.
- IDs in URLs are UUIDs, never names, phone numbers or lab numbers with patient meaning.
- External links `rel="noopener noreferrer"`.

## 14. Accessibility
- Semantic HTML first; ARIA only where HTML has no equivalent.
- Focus moves to the page heading after navigation and into/out of modals correctly.
- `aria-live` for toasts, the critical-alert banner and live worklist updates (polite, not noisy).
- Fully keyboard-operable bench screens; visible focus ring (DESIGN.md).
- Touch targets ≥ 44 px on public and front-desk screens; reduced-motion respected.

## 15. Screens and devices
| Area | Primary device | Minimum width |
| --- | --- | --- |
| Bench (worklist, entry, verification) | Desktop/laptop | 1280 px (usable from 1024 px) |
| Front desk | Laptop or tablet | 768 px |
| Manager, console | Desktop | 1024 px |
| Public result, doctor ack, landing | Phone first | 360 px |

Browsers: current and previous versions of Chrome, Edge, Firefox and Safari; Android Chrome on mid-range phones.

## 16. Frontend testing (maps to TESTING.md)
| Layer | Tools | What |
| --- | --- | --- |
| Utilities and schemas | Vitest | Formatters, flag preview, Zod schemas, query-key factories |
| Components and hooks | Vitest + Testing Library + MSW | Each component's states; hooks against mocked API responses |
| Visual | Playwright screenshots | /styleguide and key screens, light/dark |
| End to end | Playwright | Every flow in FLOWS.md, cross-tab, mobile, slow network |
| Accessibility | axe-core in Playwright | Zero serious violations |
| Performance | Lighthouse CI, bundle budget | Section 11 targets |

## 17. Conventions
- Server Components by default; `"use client"` at the smallest boundary that needs it.
- Named exports only (except Next.js route files).
- Files `kebab-case.tsx`, components `PascalCase`, hooks `useThing`.
- No `any`, no non-null `!` without a comment saying why.
- A component over ~200 lines is split.
- Data fetching only through feature `api.ts` hooks; components never call `fetch` directly.

## 18. Additions to STACK.md (approved 23 Nov 2026, added)
`nuqs` (URL state) · `openapi-fetch` (typed client) · `@tanstack/react-virtual` (virtual lists) · `msw` + `@testing-library/react` (tests) · `@next/bundle-analyzer`. All free and small.

## 19. Changes this document makes elsewhere (applied 23 Nov 2026)
- **ARCHITECTURE.md §8:** the browser reaches the API through the same-origin proxy (`/api/v1`); `api.<domain>` serves webhooks and SSE.
- **STACK.md:** replace "tenant colours via CSS variables" with "lab name, logo and signatories; fixed Aliquot palette"; add section 18's packages.
- **CLAUDE.md §1:** add FRONTEND.md to the docs table.
- **README.md:** add FRONTEND.md to the reading order.
