# Aliquot — Test Strategy

**Status:** Agreed · 18 Nov 2026
**Principle:** a lab result is a medico-legal record. Every rule that could harm a patient if wrong is tested automatically, and every release proves speed, security and resilience with numbers.

## When tests run
| Trigger | What runs | Time budget |
| --- | --- | --- |
| Every pull request | Static checks, unit, integration, contract, security scans, E2E (Chromium), visual, accessibility, bundle budgets | ≤ 15 min |
| Nightly (on `main`, against staging) | Full E2E on 3 browsers + mobile, API fuzzing, DAST scan, mutation tests on clinical services, Lighthouse | ≤ 60 min |
| Before each release | Load, stress, spike, soak, chaos, backup restore, manual security checklist, usability check | Half a day |
| After each deploy | Smoke tests + synthetic sign-in check | ≤ 2 min |

Reports are saved to `docs/test-reports/` (performance numbers go in `docs/performance.md`).

---

## 1. Static checks
Ruff, mypy (strict), ESLint, Prettier, `tsc --noEmit`, import-linter (module boundaries), Alembic up/down/up on a fresh database, OpenAPI schema diff (no accidental breaking API changes).

## 2. Unit tests (pytest, Vitest)
Fast, no database. Every business rule in `service.py`.
- **Sample state machine:** every allowed transition passes; every forbidden one raises (e.g. released → received).
- **Property-based tests (Hypothesis):** random sequences of actions never reach an invalid state; random result values always get exactly one correct flag.
- **Frontend logic (Vitest):** number formatting, flag display, Zod schemas, date/time display in the lab's timezone.

## 3. Clinical safety tests (highest priority)
| Area | Cases |
| --- | --- |
| Reference range selection | Male/female/any; neonate (0–28 days), infant, child, adult, elderly boundaries; exact boundary ages; no matching range → "No range" shown, never a false "N" |
| Flagging | Value exactly at low/high/critical limits (inclusive rules documented); just inside/outside; negative and zero values; very large values; text results |
| Calculations | eGFR (CKD-EPI 2021) against published reference values; Friedewald LDL including TG > 4.5 mmol/L (not calculated); anion gap; rounding and decimals per parameter |
| Units | Every parameter stores and prints its unit; unit snapshot unchanged after catalogue edit |
| Snapshots | Editing a range or price never changes past results, flags or request totals |
| Versioning | Amendment creates a new version; old version kept and visible; patient sees "Amended" |
| Verification | Only Chief Scientists of that section can release; Lab Scientists never; released results locked |
| Microbiology | Preliminary releases without locking; final locks; S/I/R only from configured panel; organism required before sensitivity |
| Critical alerts | Saved critical → alert in < 10 s; escalation at 15 and 30 min (frozen clock); acknowledgement stops escalation; duplicates never sent |
| PDF content | Text extracted from each generated PDF matches the database exactly (values, units, flags, ranges, verifier name, version) |
| Patient identity | Results never shown on another patient's slip or link; lab no. and barcode unique per lab |

## 4. Integration tests (pytest + real Postgres + Redis in CI)
- Every API endpoint: success, validation errors, permission denied, not found.
- **Permission matrix:** one test per row of ROLES.md, per role.
- **Tenant isolation:** for every table, lab A cannot read, list, update or reference lab B's rows, through the API and directly in SQL with RLS on. Forged IDs and forged `lab_id` in bodies are ignored.
- **Super-admin isolation:** platform role gets zero rows from every clinical table.
- **Query budgets:** each endpoint asserts its maximum number of queries (catches N+1).
- **Concurrency:** two users edit the same sample → second save gets a clear conflict, not a silent overwrite; two front-desk users confirm the same payment → only one succeeds.
- **Idempotency:** same `Idempotency-Key` twice → one change, same response.
- **Outbox:** a rolled-back transaction sends nothing; a committed one sends exactly once.
- **Time:** all times stored UTC, shown Africa/Lagos; lab no. sequence resets correctly at local midnight.

## 5. Contract tests
- **Schemathesis** fuzzes the API from its OpenAPI schema (thousands of generated requests): no 500 errors, responses always match the schema.
- Generated frontend types must match the API (CI fails on drift).
- WhatsApp, Termii and Resend are tested against recorded responses: success, rate-limited, timeout, invalid number, webhook signature valid/invalid.

## 6. End-to-end tests (Playwright)
One test per flow in FLOWS.md, using real roles in real browsers:
lab onboarding · Manager setup · patient visit → payment → labels · reception and rejection · chem path result → verify → release → patient opens PDF · haematology · microbiology preliminary → final · critical escalation and acknowledgement · amendment · password reset · 2FA sign-in.
- **Cross-tab:** sign out in one tab signs out the others; different user in one tab reloads the rest; token refresh with 3 tabs open never logs anyone out.
- **Browsers:** Chromium, Firefox, WebKit (Safari); mobile viewports (375 px Android, iPhone).
- **Network:** slow 3G and offline mid-form (data kept, clear banner).
- **Session expiry** mid-entry keeps unsaved results.

## 7. Visual regression
Playwright screenshots of /styleguide and every key screen (all states: loading, empty, error, success; light and dark) compared to approved baselines. Any unapproved pixel change fails the PR.

## 8. Accessibility
- axe-core on every page in E2E (zero serious violations).
- Keyboard-only run of result entry and verification.
- Colour contrast ≥ 4.5:1 for text (checked in tokens and on the hero overlay).
- Flags readable without colour.
- Manual screen-reader pass (NVDA) on sign-in, worklist and patient result page before release.

## 9. Performance tests
**Data:** seed 1,000,000 samples and 5,000,000 results across 20 labs.

| Test | Tool | Scenario | Pass when |
| --- | --- | --- | --- |
| Query speed | `EXPLAIN ANALYZE` | Every screen's queries on the full dataset | Index used; < 50 ms |
| Load | k6 | 200 staff working normally for 30 min (search, enter, verify) | p95 API < 200 ms, errors < 0.1% |
| Stress | k6 | Ramp users until it breaks | Breaking point recorded; it slows or returns 429/503, never corrupts data or crashes for good |
| Spike | k6 | Sudden jump from 50 to 2,000 users in 30 s | Recovers to normal within 2 min |
| Login storm | k6 | 10,000 sign-in attempts in 60 s | See note below |
| Soak | k6 | Normal load for 4 hours | No memory growth, no slowdown, no connection leaks |
| Live updates | k6 | 1,000 open SSE connections | New sample appears on screens in < 2 s |
| Worker throughput | Custom | 10,000 queued messages + 500 PDFs | Criticals still sent in < 10 s while the queue is full |
| Frontend | Lighthouse CI | Landing, sign-in, worklist, patient result on throttled 4G + slow CPU | LCP < 2.0 s, INP < 100 ms, CLS < 0.1 |
| Bundle | Next.js build | Every route | First-load JS < 150 KB |

**About 10,000 logins at the same time:** each sign-in deliberately costs ~50–100 ms of CPU (Argon2 password hashing, which is what makes stolen passwords hard to crack). One Starter instance can therefore handle roughly 10–20 sign-ins per second. So the test checks the right things:
1. The system stays up and other users keep working.
2. Extra requests get a clean "Too many attempts, try again shortly" (429), never a crash or a timeout loop.
3. No data corruption, no partial sessions.
4. We record how many instances would serve 10,000 logins in a minute (the number goes in performance.md as the scaling plan).
A real lab has tens of staff; 10,000 simultaneous logins only happens at platform scale or during an attack, and the rate limiter is the defence.

## 10. Resilience (chaos) tests
Run on staging before release:
- Kill the worker mid-job → job retries, no duplicate message.
- Redis down for 2 min → API keeps serving reads; jobs resume when it returns; SSE clients fall back to polling.
- Database restart → API recovers without manual action.
- WhatsApp returns errors or times out → SMS fallback fires; alert status shows the failure.
- Clock jump / delayed Beat → escalation sweep catches missed timers.
- Deploy during active use → no lost entries (rolling deploy, idempotent writes).

## 11. Security tests
**Automated (every PR / nightly)**
- SAST: CodeQL, Bandit, Semgrep (OWASP rules).
- Dependencies: pip-audit, pnpm audit, Dependabot.
- Secrets: gitleaks on every commit.
- DAST: OWASP ZAP baseline scan against staging nightly.
- Security headers check (CSP, HSTS, frame-ancestors, referrer policy).

**Targeted tests (pytest + Playwright)**
- Auth: wrong password lockout after 5; refresh-token reuse revokes the session family; expired/forged/altered JWT rejected; 2FA cannot be skipped; password reset links single-use and expiring.
- Access control (IDOR): every ID-based endpoint tested with another lab's and another section's IDs.
- Injection: SQL, XSS and template payloads in every text field (patient names, comments, clinical details) are stored safely and rendered escaped, including in PDFs and WhatsApp messages.
- CSRF on cookie-authenticated endpoints.
- Uploads (logos): type and size limits, no SVG scripts, files only served via signed URLs.
- Patient links: token guessing infeasible; 5 wrong attempts locks; expired links refused; no data in URL.
- Webhooks: unsigned or wrongly signed calls rejected.
- Logs and Sentry contain no patient names, phone numbers or results.

**Manual (before first pilot)**
- OWASP ASVS level 2 checklist, signed off in `docs/test-reports/security-asvs.md`.
- Self-run penetration pass with OWASP ZAP active scan + Burp Community on staging.

## 12. Payment confirmation tests
(v1 records payment; there's no online gateway.)
- Amount comes from catalogue prices at request time; stored in kobo; totals exact for any combination of tests.
- Labels can't print until "Paid", unless the lab allows "Pay later" and the request is marked so.
- Only Front Desk can confirm; who, when, method and amount are audited.
- Double-click / two users confirming at once → recorded once.
- Price edits after payment don't change the paid amount.
- **When a gateway is added later:** webhook signature checks, idempotent payment events, amount tampering, refunds and reconciliation tests get added here first.

## 13. Data safety tests
- Migrations: upgrade/downgrade on a copy of staging data.
- **Backup restore drill:** restore the latest Supabase backup into a scratch project and verify row counts and a sample of results. Before launch, then monthly.
- Audit log: UPDATE and DELETE are refused by the database.
- No hard deletes of clinical rows (database rule + test).

## 14. Mutation testing
mutmut on the clinical services (flagging, ranges, calculations, state machine): tests must catch ≥ 85% of injected bugs. This proves the tests check real behaviour, not just run the code.

## 15. Usability check (manual, before release)
Three practising lab scientists each do: register a patient, receive a sample, enter an E/U/Cr, verify it. Measured against paper: Aliquot must be no slower. Notes go in `docs/test-reports/usability.md`.

## 16. After every deploy
- Smoke: health check, sign-in, open worklist, open a patient result link.
- Synthetic monitoring: UptimeRobot on web, API and public result page every 5 min.
- On smoke failure: automatic rollback (CONVENTIONS.md §4).

## Tools summary
pytest · Hypothesis · freezegun · httpx · Vitest · Playwright · axe-core · Schemathesis · k6 · Lighthouse CI · mutmut · CodeQL · Bandit · Semgrep · pip-audit · pnpm audit · gitleaks · OWASP ZAP · Burp Community · NVDA. All free.

## Release gate
v1 ships only when: all automated suites green · clinical safety tests 100% pass · performance budgets met and recorded · zero high/critical security findings · backup restore drill passed · usability check done.
