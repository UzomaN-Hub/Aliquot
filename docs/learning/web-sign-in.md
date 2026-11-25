# Web sign-in: forms, the in-memory session, and streaming pages

## React Hook Form + Zod (forms)
**What:** React Hook Form keeps form state (values, errors, "is submitting") without re-rendering on every keystroke. A Zod schema (`features/auth/schemas.ts`) holds the rules and messages; `zodResolver` connects them.
**Why:** one schema = one source of truth for "what's valid", tested on its own. `mode: "onBlur"` gives DESIGN.md's rule: errors on blur or submit, never while typing.
**Without it:** hand-written `useState` per field, validation scattered across handlers, errors firing mid-word.
- `register("email")` wires an input (value, blur, ref).
- `setError` puts a server error under the right field; `setFocus` moves the cursor there.

## Zustand (the session, in memory only)
**What:** a tiny global store (`stores/session.ts`): `session`, `setSession`, `clearSession`. Components read only the slice they need.
**Why:** the access token must live in memory, never `localStorage` (FRONTEND.md §6, §13). A malicious script can't read it after the tab closes.
**Without it:** passing the session through every component, or storing it somewhere a script can steal it.

## The session gate and Web Locks
A reload clears memory. `SessionGate` (`features/auth/components/session-gate.tsx`) then calls `POST /api/v1/auth/refresh`. The browser sends the httpOnly cookie automatically.
- Session back → show the app. Ended → the lab's sign-in page. Network down → "Try again" screen.
- **Web Locks** (`navigator.locks.request`) let only one tab refresh at a time. Two tabs sending the same refresh token would look like theft and end the session (decision 013).
- The cookie's path is `/api/v1/auth`, so page requests never carry it. That's why the check runs in the browser, not in `proxy.ts`.

## Suspense + Cache Components (Next.js 16)
- With `cacheComponents: true`, anything request-specific (the lab in the URL, cookies) must sit inside `<Suspense>`. Everything outside it is prerendered into a **static shell** that loads instantly (the skeleton), and the rest streams in. The build fails if you forget; that's how we found the missing boundary around `SessionGate`.
- `getLabBranding()` (`lib/tenancy/branding.ts`) uses `"use cache"` + `cacheLife(5 min)`: the lab's name is fetched from the API on the server and reused for 5 minutes (FRONTEND.md §4).
- Next 16 error screens (`error.tsx`) receive `retry()` (formerly `reset()`).

## The pages
| URL | What |
| --- | --- |
| `/l/tavnit/sign-in` | Lab name large on the left, form on the right. Suspended lab → "unavailable" message. Unknown lab → "Page not found" |
| `/l/tavnit` | Signed-in home inside the app shell: greeting in the lab's timezone, role and sections, Sign out |

## Try it locally
Docker running → `uv run python -m app.scripts.dev_db` and `uv run fastapi dev` (in `apps/api`) → `pnpm dev` (in `apps/web`) → open http://localhost:3000/l/tavnit/sign-in. Use Chrome or Edge: Safari drops `Secure` cookies on `http://localhost`.
