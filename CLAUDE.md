@AGENTS.md

# CargoDev — Vehicle Import Management System

Internal tool for a Sri Lankan vehicle brokerage (Global Motors). Tracks imported
vehicles from overseas auction win to customer handover. Used by 6–8 staff only.
Phase 1 deadline: ~1 month. Formerly named CargoLink.

## Full specifications (read when a task needs detail)

- `docs/technical-documentation.md` — vehicle field spec (35 fields), schema design,
  serial number engine, lookups, dashboard spec, full task breakdown (CD-Dx-xx IDs)
- `docs/user-stories.md` — 42 stories across 11 epics with acceptance criteria

Do NOT guess field behaviour — check the field spec. It supersedes any older
7-state status flow you may find referenced elsewhere.

## Commands

- Dev server: `npm run dev`
- Type check: `npx tsc --noEmit`
- Lint: `npm run lint`
- Build: `npm run build`
- Prisma migrate (dev): `npx prisma migrate dev`
- Environment: Windows / PowerShell — use PowerShell-compatible commands, not bash-isms

## Architecture rules (non-negotiable)

1. **Every table has `org_id`; every Prisma query filters by it.** No exceptions,
   even though there is only one org in Phase 1. This is the SaaS foundation.
2. **All business logic lives in `lib/services/`.** Server Actions and future
   `/api/*` Route Handlers are thin wrappers that call services. Never put business
   logic directly in a Server Action, Route Handler, or component — a Phase 2
   mobile app will consume the same services.
3. **Prisma for all DB access** — no raw SQL unless truly unavoidable.
4. **zod validation on every mutation**, server-side. Never trust the UI alone
   (e.g. freight agent RORO/Container capability is re-validated on the server).
5. **Typed service errors** — services throw/return typed errors, not raw strings.
6. **TypeScript strict, no `any`.** Server Components by default; `"use client"`
   only when interactivity requires it.
7. **Every mutation writes an ActivityLog entry** (change-order scope).
8. **Lookup values are created only through the lookup services** — never inline
   `create` on Brand/Model/Grade/Hall/Transport/Location/Agent from feature code.

## Domain rules that are easy to get wrong

- **FC vs FL:** serial prefix defines the track. FC = export (full shipping
  lifecycle). FL = local — shipping fields (ETD/ETA/BL/agent/method/tracking) are
  hidden and shipment status is NOT tracked for FL.
- **Shipment status is derived, never manually set:** Pending → Booking Received
  (auto when ETD saved) → Shipped (daily Vercel Cron once today > ETD, plus a
  computed guard on read so the UI is never stale). Clearing ETD reverts to
  Pending. Every transition writes a StatusHistory row.
- **Tri-state flags (Auction Bill Paid, Log Book, Extra Key):** Prisma `Boolean?`.
  `null` = not entered, `true` = Yes, `false` = No. NEVER default to `false` —
  that silently turns "unknown" into "No" and corrupts reporting. UI is a
  three-segment — / Yes / No control.
- **Row colour status is separate from shipment status.** It colours the whole
  row, EXCEPT "Transport Complete" which colours only the Transport By cell.
  Colours are data (configured in Settings), not code.
- **Serial numbers:** transactional counter per org+prefix. Legacy entry mode
  allows manual serials; if a typed number exceeds the counter, bump the counter
  (`lastNumber = max(lastNumber, entered)`). Serial is read-only after creation.
- **Remarks are append-only.** Never editable or deletable; each entry stores
  author + timestamp.
- **Customers are User rows with `userType = CUSTOMER`** (single users table,
  UserType enum). Vehicles link to CUSTOMER users only — server rejects staff IDs
  in `customer_id`. Name is the only required customer field.
- **RBAC roles:** Administrator / Manager / Operator / Viewer. Enforce
  server-side via the shared `requireUser()` guard, not just by hiding UI.

## Stack

Next.js 14 App Router (TypeScript) · PostgreSQL via Supabase · Prisma · NextAuth
(credentials + bcrypt; cookie sessions now, JWT bearer branch for mobile later) ·
Pusher (real-time) · Resend (email) · Cloudflare R2 (files, presigned uploads,
URLs only in DB) · Vercel (hosting + Cron) · Tailwind + shadcn/ui (dark sidebar,
light content — match the approved designs).

## Team & workflow conventions

- 3 devs: Dev 3 (platform/foundation — repo owner), Dev 1 (tracking/dashboard/
  reports/notifications slice), Dev 2 (entry/lookups/files/settings/people slice).
  Dev 1 & 2 own vertical slices end-to-end; shared components come from Dev 3.
- Branch names follow task IDs, e.g. `cd-d3-02-org-scoping`. Default branch: `main`.
- Every PR references its task ID. PRs require one approval; CI (typecheck, lint,
  build) must pass.
- Flag anything that looks like Phase 2 scope (customer portal/logins, Stripe,
  multi-tenant routing) and suggest deferring rather than building it.

## Style for explanations

The developers are entry-to-mid level. Prefer readable, explicit code over clever
one-liners, and briefly explain the *why* behind non-obvious decisions in comments.

- `docs/designs/` — approved UI screenshots (desktop + mobile per screen).
  When building or modifying any screen, READ the matching design image first
  and match it: dark sidebar, light content, shadcn/ui components.
  Note: designs show the old CargoLink branding and the old 7-state status
  flow — the layout/style is approved, but field content follows
  docs/technical-documentation.md, which supersedes what's in the images.