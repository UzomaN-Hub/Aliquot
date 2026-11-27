# Aliquot — Tech Stack & Architecture Decisions

**Status:** Agreed · 1 Nov 2026
**Project:** Aliquot, a multi-tenant Laboratory Information System (Chemical Pathology, Haematology, Medical Microbiology)
**Goal:** A portfolio-grade, production-quality system built to medium scale from day one.

---

## 1. Architecture

### Multi-tenant SaaS, white-labelled per lab
- One platform serves many labs. Each lab is a **tenant**, identified by `lab_id`.
- **Branding per tenant:** name, logo, address, signatories. The interface palette is fixed for every lab (decision 004). These appear on every screen, PDF result slip and WhatsApp/SMS message. Staff and patients never see another lab's name.
- **Address per tenant:** subdomain (`<lab>.<ourdomain>.com`) by default, with an optional custom domain (e.g. `results.labname.com`).
- **Data isolation, two locks:**
  1. Every tenant-owned table carries `lab_id`; the API scopes every query to the current user's lab.
  2. Postgres **Row-Level Security (RLS)** enforces the same rule in the database. The API sets `app.current_lab_id` per transaction, and RLS policies only return matching rows.
- **Future premium option:** dedicated deployment (same codebase, own server and database) for large hospitals that require it. Not built unless requested.

### Core rules
- Business logic (state machine, flagging, reference ranges, alerts) lives in `services/`, never in routers.
- Results are **versioned**, never updated in place.
- Every write creates an **audit log** entry in the same transaction.
- Permissions are enforced in the API, not just the UI. Only Chief Scientists verify and release (see ROLES.md). The super-admin has no access to clinical data.
- No patient data in URLs or logs. Patient result links use hashed, expiring tokens.

---

## 2. Frontend

| Tool | Role |
| --- | --- |
| Next.js 16 (App Router) + TypeScript | App framework; `proxy.ts` (formerly middleware) resolves tenant from subdomain/domain |
| Tailwind CSS + shadcn/ui | Styling and components; lab name, logo and signatories; fixed Aliquot palette |
| TanStack Query | Server state: fetching, caching, refetching worklists |
| Zustand | Client state: UI state, scanner session, filters |
| React Hook Form + Zod | Forms and validation (result entry) |
| TanStack Table | Bench worklists, verification queues |
| Recharts | Trend charts; later Levey-Jennings QC charts |
| openapi-typescript | Frontend types generated from FastAPI's OpenAPI schema |
| openapi-fetch | Typed API client over those generated types |
| nuqs | Shareable view state in the URL (search, filters, sort, cursor, tab) |
| @tanstack/react-virtual | Virtualised long lists (only visible rows in the DOM) |
| @zxing/browser | Barcode scanning with phone/laptop camera |
| GSAP (+ ScrollTrigger, SplitText) + Lenis | Landing page motion only, loaded after first paint (decision 017) |
| @playwright/test | Browser tests in Chromium, Firefox and WebKit (decision 016) |

## 3. Backend

| Tool | Role |
| --- | --- |
| FastAPI (Python 3.13) | API · same version locally, in CI and in production (`python:3.13-slim` image) |
| SQLAlchemy 2 (async) + Alembic | ORM and migrations |
| psycopg 3 | Postgres driver, async for the API and sync for migrations and the worker (decision 011) |
| PyJWT | Signs and checks access tokens (decision 013) |
| pyotp + cryptography + segno | Console 2FA: TOTP codes, Fernet encryption of the secret at rest, QR code as SVG (decision 015) |
| Pydantic v2 | Request/response validation |
| Custom JWT auth (access + refresh) + RBAC | Login, roles, tenant scoping |
| Argon2 (argon2-cffi) + SlowAPI | Password hashing, rate limiting |
| WeasyPrint | Branded PDF result slips |
| python-barcode | Code 128 barcode labels |

## 4. Data, cache & background jobs

| Tool | Role |
| --- | --- |
| PostgreSQL on Supabase (Pro) | Main database, used as plain Postgres via SQLAlchemy (portable to RDS/Neon). RLS for tenant isolation |
| Redis (Render Key Value) | Cache and Celery broker |
| Celery + Celery Beat | Background jobs (alerts, PDFs, messages) and scheduled jobs (TAT checks, escalations) |
| Cloudflare R2 | File storage for PDFs, logos, uploads (S3-compatible, no egress fees) |

## 5. Messaging & automation

| Tool | Role |
| --- | --- |
| WhatsApp Cloud API | Critical alerts, result links (Meta test number during build) |
| Termii | SMS fallback |
| Resend | Transactional email (reports, password resets) |
| n8n (self-hosted on Render) | Daily reports, Google Sheets sync, integrations; stores its data in Supabase Postgres |

## 6. Deployment & infrastructure

| Tool | Role |
| --- | --- |
| Docker + Docker Compose | Identical local and production environments |
| Render | FastAPI API, Celery worker (+Beat), Redis, n8n — all always-on paid instances |
| Vercel | Next.js frontend; wildcard subdomain for tenants |
| Custom domain | Platform domain with wildcard DNS |

## 7. Quality & monitoring

| Tool | Role |
| --- | --- |
| GitHub + GitHub Actions | Repo and CI/CD (lint, type check, tests on every push) |
| pytest · Vitest · Playwright | Backend, frontend and end-to-end tests |
| Testing Library + MSW | Component and hook tests against a mocked API |
| @next/bundle-analyzer | Checks the 150 KB first-load JS budget per route |
| Sentry | Error tracking, frontend and backend |
| UptimeRobot | Uptime alerts |
| uv (Python) · pnpm (JS) | Dependency management |

---

## 8. Region and scale path

All servers in **Frankfurt** (closest region to Nigeria). See ARCHITECTURE.md.

### Scale path (when needed, not now)
- Supabase: Micro → Small compute.
- Render: Starter → Standard instances; split Celery Beat into its own service; add worker replicas.
- Live updates: polling → Server-Sent Events → WebSockets.

---

## 9. Open items for later stages
- Live update mechanism for worklists and alerts (decided at architecture stage).
- Custom-domain provisioning flow for tenants.
