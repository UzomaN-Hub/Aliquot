# Aliquot — System Architecture

**Status:** Agreed · 18 Nov 2026
**Shape:** Modular monolith now, built so modules can be split into services later.
**Targets:** fast on Nigerian mobile networks, secure enough for medico-legal data, proven with 1,000,000+ records.

---

## 1. Components
| Component | Runs on | Job |
| --- | --- | --- |
| Web (Next.js) | Vercel (functions pinned to Frankfurt) | Landing, lab app, platform console, public result pages |
| API (FastAPI, async) | Render, Frankfurt | All business logic, auth, tenant scoping |
| Worker + Beat (Celery) | Render, Frankfurt | Alerts, escalation timers, PDFs, WhatsApp/SMS/email, scheduled sweeps |
| Redis | Render Key Value, Frankfurt | Job broker, cache, rate limits, live-update fan-out |
| Postgres | Supabase Pro, Frankfurt (eu-central) | All data, RLS tenant isolation |
| Object storage | Cloudflare R2 | PDFs and logos (private, short-lived signed URLs) |
| n8n | Render | Daily report, Google Sheets export |

**Region:** API, worker, Redis and database sit in the same Frankfurt region, the closest option to Nigeria among these providers. Database round trips stay around 1–2 ms instead of crossing an ocean on every query.

The browser talks only to the API. Worker, Redis, database and n8n are never public.

---

## 2. Modular monolith
One FastAPI codebase, one deploy, one database, split into modules with hard boundaries:

`auth` · `tenants` · `staff` · `catalogue` · `patients` · `requests` · `samples` · `results` · `verification` · `alerts` · `delivery` · `audit` · `reports`

**Each module owns:** its router, service (business rules), repository (queries), schemas, tables, and tests.

**Boundary rules (enforced by an import-linter check in CI):**
1. A module never imports another module's repository or tables. It calls the other module's service interface.
2. Side effects across modules go through domain events written to the `outbox` table (e.g. `ResultReleased` → `delivery` sends WhatsApp, `audit` records it).
3. No shared "utils" holding business logic.

**Future split path (when load or team size justifies it, not before):**
1. `delivery` (WhatsApp, SMS, email, PDFs) — already event-driven, easiest to extract.
2. `reports` — read-heavy, can move to a read replica / separate service.
3. `alerts` — independent scaling for escalation timers.
Because modules already talk through interfaces and events, extraction means replacing an in-process call with a queue or HTTP call, not a rewrite.

---

## 3. Speed: data structures and algorithms in the system
The same thinking as the library-management project, applied at database and network level.

| Need | Structure / technique | Cost | Instead of |
| --- | --- | --- | --- |
| Find sample by barcode / lab no. | Unique **B-tree index** (balanced tree) | O(log n) | Table scan, O(n) |
| Patient search by name ("Eze", typos, partial) | **Trigram GIN index** (`pg_trgm`) | Sub-linear, fuzzy | `LIKE '%eze%'` scan, O(n) |
| Patient search by phone / hospital no. | B-tree prefix index | O(log n) | Scan |
| Worklist: STAT first, then due time | **Composite index** `(lab_id, section, status, priority, due_at)` — rows come back already sorted | O(log n + k) | Sort on every request, O(n log n) |
| Paging long lists | **Keyset (cursor) pagination** | O(log n) per page | `OFFSET`, which gets slower every page, O(n) |
| Reference ranges, catalogue, branding (rarely change) | **Redis cache**, hash lookup, invalidated on edit | O(1) | Database query every time |
| Escalation and TAT deadlines | Scheduled tasks + per-minute sweep over a **partial index** on open deadlines | O(log n) | Scanning all samples |
| Job processing | **FIFO queues** with a separate high-priority queue for criticals | O(1) enqueue/dequeue | Doing work inside the request |
| Audit log (grows forever) | **Monthly partitions** by time | Queries touch one partition | One huge table |
| Long tables on screen | **Virtualised rendering** (only visible rows exist in the DOM) | O(visible rows) | Rendering thousands of rows |
| Search box | **Debounce** 200 ms + cancel stale requests | 1 request per pause | 1 request per keystroke |

Every query used by a screen is checked with `EXPLAIN ANALYZE` against the 1M-row dataset before the screen is marked done.

---

## 4. Speed: frontend
- **Server Components + streaming:** pages arrive as HTML with data; the shell shows instantly while slower parts stream in.
- **Static landing page** on Vercel's edge network: served from the nearest location, no server work.
- **Prefetching:** links to the next likely page (worklist → result entry) load in the background.
- **TanStack Query cache:** returning to a page shows cached data immediately, then refreshes quietly.
- **Optimistic UI** only for low-risk actions (mark collected), never for verify/release.
- **Fonts:** self-hosted, subset, preloaded; no layout shift.
- **Code splitting:** each role downloads only its own screens.
- **Budgets:** first-load JS under 150 KB per route; enforced in CI.

## 5. Speed: backend
- Async FastAPI with **orjson** responses.
- **Connection pooling** via Supabase's pooler in transaction mode (works with `SET LOCAL` per transaction).
- Queries select only needed columns; relationships loaded in batches (no N+1 queries), checked by a test that counts queries per endpoint.
- **gzip/brotli** compression; HTTP caching headers on public, non-patient assets.
- Heavy work (PDFs, messages, reports) never runs inside a request; it goes to the worker.

## 6. Performance budgets (checked before each release)
| Metric | Target |
| --- | --- |
| API p95 response | < 200 ms |
| Worklist / patient search (1M samples) | < 150 ms server time |
| Lab app page interaction (INP) | < 100 ms |
| Public result page LCP on 4G | < 2.0 s |
| Critical alert sent after result saved | < 10 s |

**Proof:** a seed script generates 1,000,000 samples and 5,000,000 results; k6 load tests simulate 200 concurrent staff. Results go in `docs/performance.md` (portfolio evidence, like the library project's timings).

---

## 7. Live updates
**Server-Sent Events (SSE)** from the API, fed by Redis pub/sub on per-lab, per-section channels. New samples, verifications and critical alerts appear instantly. If the connection drops, the client falls back to 30 s polling and reconnects automatically.
*Why SSE:* updates only flow server → browser here, so SSE is simpler and lighter than WebSockets.

---

## 8. Domains and tenant resolution
| Address | Serves |
| --- | --- |
| `<domain>` (e.g. aliquot.com) | Landing page |
| `console.<domain>` | Super-admin console |
| `<lab>.<domain>` | That lab's app and public result pages |
| `api.<domain>` | API |

**Until the domain is bought:** labs resolve by path on the free Vercel address (`aliquot.vercel.app/l/<lab>`). Tenant resolution sits behind one setting (`TENANT_MODE=path|subdomain`), so switching to subdomains later needs no code changes.

1. Next.js middleware reads the subdomain (or path) and loads the lab's public branding (cached).
2. The API takes `lab_id` only from the signed token, never from the URL or body.
3. A token for lab A on lab B's subdomain is rejected.
4. Each request runs in a transaction with `SET LOCAL app.current_lab_id`; RLS filters every query.
5. Super-admin tokens carry no `lab_id`; RLS returns nothing from clinical tables.

---

## 9. Security
**Identity and sessions**
- Passwords: Argon2id. Breached-password check on set/reset.
- Access token 15 min (in memory); refresh token 7 days in an httpOnly, Secure, SameSite cookie, rotated on every use; reuse of an old refresh token revokes the whole session family.
- **2FA (TOTP)** available to all staff, required for Managers and Chief Scientists.
- Sessions end after 8 h idle; role or section changes revoke active sessions.
- **Cross-tab session sync (BroadcastChannel `aliquot-auth`, `storage`-event fallback):**
  - Sign out in one tab → every tab of that lab signs out at once and shows the sign-in page.
  - Sign in as a different user in one tab → other tabs reload into the new session (no tab keeps acting as the old user).
  - Session expiry or revocation detected in one tab → all tabs show the sign-in modal, keeping unsaved entries.
  - **One tab refreshes the token at a time** (Web Locks API), then shares the new access token with the others. Without this, several tabs refreshing together would trip refresh-token reuse detection and log everyone out.
- Sign-out also revokes the refresh token on the server, so a tab that missed the broadcast fails on its next request.
- "Sign out of all devices" in My account revokes every session for that user.
- Login rate limit: 5 attempts per 15 min per email + IP; lockout notice by email.

**Authorisation**
- Role checks (RBAC) plus section checks on every route, as FastAPI dependencies; one test per permission in ROLES.md.
- Postgres **RLS with FORCE ROW LEVEL SECURITY**; the app connects as a non-owner role that cannot bypass it.
- Platform (super-admin) endpoints use a separate router and database role with no grants on clinical tables.

**Data**
- TLS everywhere, HSTS, encryption at rest (Supabase, R2).
- Patient result links: 128-bit random token, stored hashed, expiring, with last-4-digits check and lockout after 5 failures.
- No patient data in URLs, logs or Sentry (PII scrubbing on).
- Files only through short-lived signed URLs (5 min).
- Nothing clinical is hard-deleted; audit log is append-only.

**Application**
- Strict CSP, security headers, CSRF protection on cookie-authenticated routes.
- All input validated by Pydantic / Zod; parameterised queries only.
- `Idempotency-Key` on every write (no double submissions on bad networks).
- Webhooks (WhatsApp, Termii) verified by signature.

**Supply chain and process**
- Dependabot, `pip-audit`, `pnpm audit`, CodeQL in CI; builds fail on high-severity issues.
- Secrets only in Render/Vercel environment variables; secret scanning on the repo.
- Security checklist (OWASP ASVS level 2) reviewed before the first pilot.

**Compliance:** Nigeria Data Protection Act 2023: privacy notice, recorded patient consent, lab as data controller and Aliquot as processor, breach-response steps documented.

---

## 10. Background jobs
- Every job is idempotent and keyed by a business ID (e.g. `alert:{id}:level:2`).
- 3 retries with exponential backoff, then marked failed and shown inline ("Failed · Retry").
- **Outbox pattern:** messages are written in the same transaction as the change, then sent by the worker. A change that rolls back sends nothing.
- Two queues: `critical` (alerts) and `default` (PDFs, reports), so a report run never delays a critical alert.

---

## 11. Data rules
- Results versioned; amendments add a version.
- Times in UTC, shown in the lab's timezone (default Africa/Lagos).
- Money as integer kobo.
- Tokens stored hashed.

---

## 12. Environments
| Env | What it is | Runs on |
| --- | --- | --- |
| Local | Everything on your laptop | Docker (Postgres, Redis); API and web run natively |
| Staging | A second, private copy of Aliquot on our own accounts, with fake data, used to test before going live | Second Supabase project and worker; API and Redis on Render free tiers |
| Production | The live system real labs use | See STACK.md |

Staging is created when we first deploy, not before.

---

## 13. API conventions
- REST under `/v1`, JSON, OpenAPI-generated; frontend types generated from it.
- One error shape: `{ code, message, field? }`.
- Cursor pagination everywhere.

## 14. Monitoring
Sentry (web, API, worker) with performance tracing · UptimeRobot on web, API and public result page · slow-query log (> 100 ms) reviewed weekly · failed-job count on the super-admin console.
