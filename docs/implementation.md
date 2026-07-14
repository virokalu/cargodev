# CargoDev — Implementation Design & Developer Guide

**Version 1.0 · 14 July 2026**
**Audience:** Dev 1, Dev 2, Dev 3 (internal — not client-facing)
**Authoritative companions:** `CargoDev_Technical_Documentation.md` (v2.0), `CargoDev_User_Stories.md` (v1.0), Task Breakdown CSV
**Supersedes:** any material referencing the old 7-state status flow or the frontend/backend role split. The current model is the **3-state automated shipment flow** and **vertical-slice ownership**.

> **Read this first.** This document tells you *how* we build — the architecture, the folder layout, the patterns every file must follow, and where your tasks plug in. The Technical Documentation tells you *what* we build (fields, rules, business behaviour). When they conflict, the Technical Documentation v2.0 wins — and tell Dev 3 so this doc gets fixed.

---

## 1. What we're building, in one paragraph

CargoDev tracks every vehicle Global Motors buys at overseas auctions — from auction win to handover. Vehicles are either **FC** (export — full shipping lifecycle) or **FL** (local — no shipping fields at all). Shipment status is **never set by hand**: it's derived from data (`Pending → Booking Received` when an ETD is saved, `→ Shipped` when the ETD date passes, via a daily cron + a computed guard on read). 6–8 staff use it; customers are data-only records in Phase 1. Every table carries `org_id` from day 1 so a future SaaS pivot needs zero data refactoring.

---

## 2. Architecture — one app, one service layer, two front doors

```
┌─────────────────────────────────────────────────────────┐
│                    Next.js 14 App Router                 │
│                                                          │
│   Web UI (Phase 1)              Mobile app (Phase 2)     │
│   Server Components             React Native + Expo      │
│   + Server Actions                     │                 │
│        │                               │ HTTPS + JWT     │
│        ▼                               ▼                 │
│   ┌──────────────┐            ┌──────────────────┐       │
│   │ Server Action │            │ /api/* Route     │       │
│   │ (thin wrapper)│            │ Handlers (thin)  │       │
│   └───────┬──────┘            └────────┬─────────┘       │
│           │        BOTH call           │                 │
│           ▼                            ▼                 │
│   ┌──────────────────────────────────────────────┐       │
│   │              lib/services/*                  │       │
│   │   ALL business logic lives here — once.      │       │
│   │   Validation (zod) · org_id scoping ·        │       │
│   │   transactions · notifications · logging     │       │
│   └───────────────────┬──────────────────────────┘       │
│                       ▼                                  │
│              Prisma → PostgreSQL (Supabase)              │
└─────────────────────────────────────────────────────────┘
   External: Pusher (real-time) · Resend (email) · R2 (files)
   Vercel Cron (daily ETD→Shipped job) · WhatsApp Cloud API (add-on)
```

**Mentor note — why the service layer is non-negotiable.** A Server Action is a network entry point, and so is a Route Handler. If business logic lives inside either one, Phase 2 mobile forces us to copy-paste it into the other — and the two copies *will* drift (someone fixes a bug in one and forgets the other). By keeping entry points *thin* (parse input → call service → shape response) and putting everything real in `lib/services/`, the mobile app becomes a new front door on the same house, not a second house.

**The thin-wrapper rule, concretely:** a Server Action should be ≤ 15 lines. If yours is longer, you've leaked business logic — move it into the service.

```ts
// app/(dashboard)/vehicles/actions.ts  — THIN. This is the whole thing.
"use server";
import { requireUser } from "@/lib/auth/guards";
import { createVehicle } from "@/lib/services/vehicle.service";

export async function createVehicleAction(input: unknown) {
  const user = await requireUser({ roles: ["ADMINISTRATOR", "MANAGER", "OPERATOR"] });
  return createVehicle(user, input); // service validates, scopes, transacts, notifies, logs
}
```

---

## 3. Repository structure

```
cargodev/
├── app/
│   ├── (auth)/
│   │   └── login/page.tsx
│   ├── (dashboard)/                      ← gated layout: sidebar + header
│   │   ├── layout.tsx
│   │   ├── dashboard/page.tsx            ← KPIs, pies, column chart, widgets
│   │   ├── vehicles/
│   │   │   ├── page.tsx                  ← table: FC/FL toggle, filters, row colours
│   │   │   ├── add/page.tsx              ← incl. legacy serial mode
│   │   │   ├── [id]/page.tsx             ← detail: 35 fields, files, remarks, timeline
│   │   │   ├── [id]/edit/page.tsx
│   │   │   └── actions.ts                ← thin Server Actions for this slice
│   │   ├── customers/                    ← userType = CUSTOMER only
│   │   │   ├── page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── users/                        ← userType = STAFF only (Admin)
│   │   │   └── page.tsx
│   │   ├── notifications/page.tsx
│   │   ├── reports/page.tsx
│   │   ├── settings/                     ← Admin only
│   │   │   ├── page.tsx                  ← company info
│   │   │   ├── lookups/page.tsx          ← halls, transport, locations, agents,
│   │   │   │                                brand/model/grade tree
│   │   │   └── statuses/page.tsx         ← row-colour statuses + colour picker
│   │   ├── activity-log/page.tsx         ← change-order, Admin only
│   │   └── profile/page.tsx              ← every user edits own profile
│   └── api/
│       ├── auth/[...nextauth]/route.ts
│       ├── cron/
│       │   └── shipment-status/route.ts  ← Vercel Cron: ETD→Shipped + deadline scan
│       ├── uploads/
│       │   └── presign/route.ts          ← R2 presigned URLs
│       └── pusher/auth/route.ts          ← private channel auth
│       # Phase 2: /api/v1/* Route Handlers for mobile — same services underneath
│
├── components/
│   ├── ui/                               ← shadcn/ui primitives (owned source — edit freely)
│   ├── shared/                           ← Dev 3's platform components (see §6)
│   │   ├── data-table/                   ← sorting, pagination, row-colouring engine
│   │   ├── combobox-create/              ← flat + hierarchical inline-create modes
│   │   ├── tri-state-toggle.tsx          ← — / Yes / No
│   │   ├── date-field.tsx
│   │   ├── uploads/                      ← single-image, multi-image, documents
│   │   └── charts/                       ← pie, column, KPI card wrappers
│   ├── vehicles/                         ← Dev 1 + Dev 2 feature components
│   ├── dashboard/                        ← Dev 1
│   ├── notifications/                    ← Dev 1
│   └── settings/                         ← Dev 2
│
├── lib/
│   ├── prisma.ts                         ← singleton client
│   ├── auth/
│   │   ├── config.ts                     ← NextAuth credentials + bcrypt + JWT
│   │   └── guards.ts                     ← requireUser(), role/userType gating
│   ├── services/                         ← ★ THE single source of truth ★
│   │   ├── vehicle.service.ts            ← create/update, tri-states, FL rules, FK wiring
│   │   ├── shipment-status.service.ts    ← ETD transitions, revert, StatusHistory
│   │   ├── serial.service.ts             ← transactional counters, legacy bump rules
│   │   ├── lookup.service.ts             ← brand/model/grade + flat lists, merge/rename
│   │   ├── customer.service.ts           ← CUSTOMER users, vehicle linking
│   │   ├── user.service.ts               ← staff CRUD, roles, activate/deactivate
│   │   ├── remark.service.ts             ← append-only thread
│   │   ├── file.service.ts               ← auction sheet, photos, documents
│   │   ├── notification.service.ts       ← emit() fan-out: in-app / email / WhatsApp
│   │   ├── report.service.ts             ← filtered queries for PDF/Excel
│   │   ├── dashboard.service.ts          ← widget queries
│   │   └── activity-log.service.ts       ← change-order: write hooks + query layer
│   ├── validation/                       ← zod schemas, one file per domain
│   │   ├── vehicle.schema.ts
│   │   └── ...
│   ├── errors.ts                         ← typed service errors (see §7)
│   ├── pusher.ts · resend.ts · r2.ts · whatsapp.ts
│   └── utils.ts
│
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts                           ← org, admin user, lookups, serial counters
├── emails/                               ← React Email templates (Shipped, deadline)
├── middleware.ts                         ← session gate for (dashboard) routes
├── .github/workflows/ci.yml              ← typecheck, lint, build (live already)
└── docs/                                 ← this file + companions live here
```

**Mentor note — route groups.** `(auth)` and `(dashboard)` are Next.js *route groups*: the parentheses mean the folder organises files without appearing in the URL. `/dashboard`, `/vehicles` etc. all share the `(dashboard)/layout.tsx` shell (sidebar + header + auth gate) while `/login` gets a clean page with no sidebar. One layout decision, enforced structurally instead of by memory.

---

## 4. Data model — the patterns every schema and query must follow

The full 35-field spec is in Technical Documentation §2. What matters *here* is the five patterns that repeat across the whole schema. Learn these once and every model makes sense.

### 4.1 `org_id` on everything — no exceptions

```prisma
model Vehicle {
  id     String @id @default(cuid())
  org_id String                          // ← every model, always
  // ...
  @@unique([org_id, serial])             // ← uniqueness is per-org, not global
  @@index([org_id])
}
```

Every Prisma query filters by it:

```ts
const vehicles = await prisma.vehicle.findMany({
  where: { org_id: user.org_id, /* ...filters */ },
});
```

**Why now, with one client?** Uniqueness constraints, indexes and every query shape are decided today. Retrofitting tenancy later means touching every table, every query, and migrating live data. Adding `org_id` now costs one column per table; adding it later costs a rewrite. Dev 3 runs an org-scoping audit (CD-D3-26) in Week 4 — any query missing the filter fails review before that.

### 4.2 Tri-state flags are `Boolean?`, never `Boolean`

`auction_bill_paid`, `log_book`, `extra_key`:

```prisma
auction_bill_paid Boolean?   // null = not entered · true = Yes · false = No
```

**Why:** a plain `Boolean` defaults to `false`, silently converting "staff haven't entered it yet" into "No". The unpaid-bills dashboard widget deliberately treats `null` and `false` as distinct — both appear on the list, but for different reasons. Never coerce `undefined`/missing form values to `false` in a service; write `null`.

### 4.3 Lookups store IDs, never text

The vehicle row holds `brand_id`, `auction_hall_id`, `transport_company_id`, `freight_agent_id`, etc. — foreign keys into reference tables with `@@unique([org_id, name])` and case-insensitive create logic in `lookup.service.ts`.

**Why:** "Toyota", "TOYOTA" and "toyota " as free text are three different values that wreck every filter and dashboard grouping. With FKs, renaming a lookup in Settings propagates to every vehicle instantly, because vehicles never held the text in the first place.

### 4.4 Serials are three columns, assigned in a transaction

```prisma
serialPrefix SerialPrefix   // FC | FL
serialNumber Int
serial       String         // display: "FC1024"
@@unique([org_id, serial])
```

Assignment happens inside `serial.service.ts` in a **Prisma transaction** that increments the `SerialCounter` row and creates the vehicle atomically. Legacy manual entry validates the pattern, rejects duplicates, and bumps the counter if the typed number is higher (`lastNumber = max(lastNumber, entered)`).

**Why the transaction:** two operators clicking Save at the same moment must never receive the same serial. Read-then-write without a transaction is a race; the transactional increment makes duplicates impossible rather than merely unlikely. Why three columns: sorting and the FC/FL toggle become cheap indexed queries on `serialPrefix`/`serialNumber` instead of string parsing.

### 4.5 Append-only history tables

`StatusHistory`, `RemarkEntry`, and `ActivityLog` rows are **created, never updated or deleted**. Services expose `append`/`write` functions only — no update paths exist.

**Why:** these tables answer "who did what, when" during disputes. A history you can edit is not a history.

### 4.6 Shipment status is derived, not stored as truth

Status transitions happen in exactly two places:

1. **`shipment-status.service.ts`** — when a vehicle update takes ETD from `null → value`, flip `PENDING → BOOKING_RECEIVED` (and revert on clear). Called from inside `vehicle.service.ts` update flow — never from UI code.
2. **The cron route** (`/api/cron/shipment-status`) — daily, flips `BOOKING_RECEIVED → SHIPPED` where `etd < today`.

Plus a **computed guard on read**: the vehicle read path returns `SHIPPED` for any Booking Received vehicle whose ETD has passed, even if the cron hasn't run yet — so the UI is never stale. Every transition (including automated ones, actor = "System") writes a `StatusHistory` row.

**FL vehicles are outside all of this** — no ETD, no shipment status tracking, shipping fields hidden on form and detail, excluded from shipping widgets.

---

## 5. Auth & authorisation

- **NextAuth credentials provider**, bcrypt hashes, JWT sessions. Session token carries `userId`, `org_id`, `userType`, `role`.
- **`middleware.ts`** blocks unauthenticated access to `(dashboard)` routes — coarse gate.
- **`requireUser({ roles })`** in `lib/auth/guards.ts` is the fine gate: call it at the top of **every** Server Action and Route Handler. It returns the session user (with `org_id`) or throws.

| Role | Can |
|---|---|
| Viewer | Read everything; **server rejects all writes** (not just hidden buttons) |
| Operator | + add/edit vehicles, upload files, add remarks |
| Manager | + manage customers |
| Administrator | + Users, Settings, Activity Log |

**Mentor note — why both layers.** Hiding a button is UX; it is not security. Anyone can call a Server Action endpoint directly with dev tools. The rule is: *the UI hides what you can't do; the server refuses what you can't do.* If only one layer exists, it must be the server one. Same principle behind the freight-agent capability rule — the RORO/Container selector filters options in the UI, **and** the service rejects invalid combinations, because we never trust the client.

Phase 2 note: `requireUser()` is written so a JWT-bearer branch (mobile) can be added inside the guard without touching any service — services receive a `user` object and don't care how it authenticated.

---

## 6. Dev 3's shared component library — use it, don't fork it

Dev 1 and Dev 2: these exist so both slices look and behave identically. **If a shared component is missing a prop you need, ask Dev 3 to extend it — do not copy it into your feature folder.** A fork today is two divergent components by Week 3.

| Component | Used by | Notes |
|---|---|---|
| `shared/data-table` | Vehicle table, users, customers, activity log | Sorting, pagination, **row-colouring engine** — pass a `rowColor` resolver; it also handles the Transport-Complete cell-only rule |
| `shared/combobox-create` | Model field (hierarchical), all flat lookups | Searches case-insensitively; renders "Add 'X'…" at the missing level; calls `lookup.service` — never creates rows itself |
| `shared/tri-state-toggle` | Auction Bill Paid, Log Book, Extra Key | Emits `true \| false \| null` — pass `null` through untouched |
| `shared/uploads/*` | Auction sheet, photos, documents | Wraps the R2 presign flow: request presigned URL → PUT to R2 → save URL via `file.service` |
| `shared/charts/*` | Dashboard, reports | Pie, column, KPI card with house styling baked in |

**The presigned-upload flow, since everyone touches it:** the browser never sends file bytes through our server. It asks `/api/uploads/presign` for a short-lived URL (server checks role, size and type limits), uploads directly to R2, then tells the service the resulting URL. DB stores URLs only, never binary. Why: Vercel serverless functions have body-size limits and we'd pay to proxy every byte twice.

---

## 7. Conventions — the Definition of Done for every PR

1. **TypeScript strict. No `any`.** Define interfaces/types for every data shape; infer from zod where possible (`z.infer<typeof vehicleSchema>`).
2. **Every mutation validates with zod** inside the service — not (only) in the UI. Schemas live in `lib/validation/`.
3. **Every query filters by `org_id`.** No exceptions, including dashboards and reports.
4. **Services throw typed errors** from `lib/errors.ts`:

```ts
// lib/errors.ts
export class ServiceError extends Error {
  constructor(
    public code: "NOT_FOUND" | "FORBIDDEN" | "VALIDATION" | "CONFLICT" | "INTERNAL",
    message: string,
    public fieldErrors?: Record<string, string>
  ) { super(message); }
}
```

   Entry points catch `ServiceError` and shape it for their client (form field errors for web; JSON status codes for the future mobile API). Why typed: `catch (e) { alert(e.message) }` leaks internals and can't map to form fields; a closed set of codes can.
5. **Every mutation writes an `ActivityLog` entry** (once CD-D3-23 lands — write hooks live in the services, so this is mostly automatic; just don't bypass services).
6. **Lookup values are created only via `lookup.service`** — the combobox already does this; never `prisma.brand.create` from feature code.
7. **Server Components by default; `"use client"` only where interactivity demands it** (forms, toggles, live badges). Why: server components ship zero JS for read-only views, which is most of this app.
8. **Explain-why comments.** We are all learning — a comment saying *why* a transaction or a `null` check exists is part of the deliverable.
9. **Branch = task ID** (`cd-d1-03-vehicle-table-ui`), **PR title starts with the task ID**, one approval required, CI (typecheck + lint + build) must pass. Force pushes to `main` are blocked.
10. **Small PRs.** One task = one PR where possible. A 2–12 hr task should never become a 3,000-line PR.

---

## 8. Ownership map & how the slices fit together

| Owner | Owns end-to-end (DB query → service → UI) |
|---|---|
| **Dev 3 — platform** | Repo/CI (done), schema & migrations, app shell, shared components (§6), auth & guards, R2 presign, serial engine, notification fan-out core, cron, activity-log write hooks, WhatsApp add-on services, security audit, deploy |
| **Dev 1 — tracking slice** | Vehicle list/table + FC/FL toggle + row colours, shipment-status automation, vehicle detail + timeline, remarks, dashboard (queries + UI), reports + exports, in-app & email notification channels, activity-log viewer UI |
| **Dev 2 — entry slice** | Vehicle service + validation + Add/Edit form (all sections), legacy serial mode, lookup services + settings screens, files (services + UI), customers, staff user management, colour picker, API hardening, WhatsApp fan-out hooks |

**Vertical slices mean:** if you own the vehicle table, you own its query layer too. No "waiting for the backend guy" — you are both. Consistency comes from §6 and §7, not from role labels.

### Critical-path dependencies (what blocks what)

| Foundation (Dev 3) | Blocks |
|---|---|
| CD-D3-08/09/10 — schema + seed | Nearly everything · target: day 3 |
| CD-D3-17/18 — auth + guards | All gated pages, CD-D2-14/16 |
| CD-D3-12/13/14 — table, combobox, tri-state | CD-D1-03, CD-D2-04/09 (skeleton first, polish later) |
| CD-D3-19 — R2 presign | CD-D2-10/11 |
| CD-D3-20 — serial engine | CD-D2-01/03 · **needs last FC/FL serials from the old sheets to seed counters — chase this now** |
| CD-D3-21/22 — fan-out + cron | CD-D1-05/17/19, CD-D2-20 |
| CD-D3-06/07 — Meta verification + templates | CD-D3-24/25 · long external lead time — day-1 item |

**Working against an unfinished dependency:** don't wait — code against the service's *interface*. Dev 3 publishes the function signature (or a stub throwing `NOT_IMPLEMENTED`) as soon as the schema lands; you build UI and wiring against it and swap in the real implementation when it merges. This is how three people ship in four weeks without serialising.

---

## 9. Getting started (Dev 1 & Dev 2 onboarding)

Windows / PowerShell / VS Code assumed. Node 18+ via nvm-windows (`nvm use 18` or later).

```powershell
git clone https://github.com/<org>/cargodev.git
cd cargodev
npm install
copy .env.example .env.local      # then fill values from the team vault — never commit .env.local
npx prisma migrate dev            # applies migrations to your dev DB
npx prisma db seed                # org, admin user, lookup seeds, serial counters
npm run dev                       # http://localhost:3000
```

`.env.local` keys (values from Dev 3, sourced per environment — dev DB ≠ prod DB):

```
DATABASE_URL=            # Supabase Postgres (dev branch/project)
NEXTAUTH_SECRET=
NEXTAUTH_URL=http://localhost:3000
R2_ACCOUNT_ID= / R2_ACCESS_KEY_ID= / R2_SECRET_ACCESS_KEY= / R2_BUCKET=
PUSHER_APP_ID= / PUSHER_KEY= / PUSHER_SECRET= / PUSHER_CLUSTER=
RESEND_API_KEY=
CRON_SECRET=             # cron route rejects requests without it
# WhatsApp keys arrive after Meta verification (add-on)
```

Daily loop: `git checkout main && git pull` → branch off with your task ID → build → PR → review → merge → next task. Update the task tracker as you go — 2–12 hr tasks exist so progress is visible daily.

---

## 10. Week-by-week shape (matches the task breakdown)

| Week | Dev 3 | Dev 1 | Dev 2 |
|---|---|---|---|
| **0–1** | Provisioning, schema, shell, auth, shared components skeleton, **Meta verification day 1** | Login page | (ramping — read this doc + tech doc §1–6) |
| **2** | Serial engine, presign, fan-out, cron, component polish | Vehicle query layer + table + row colours + status automation | Vehicle service/validation/form, legacy serial mode, lookup services |
| **3** | Activity-log write hooks (change-order) | Detail page, timeline, remarks, dashboard, notifications | Form completion, files, customers, staff users, activity-log queries |
| **4** | Org-scoping audit, prod deploy, UAT, handover | Reports + exports, activity-log viewer | Settings screens, colour picker, API hardening |
| **5 (add-ons)** | WhatsApp send service + wiring | Mobile-responsive: vehicle/dashboard/reports | Mobile-responsive: forms/settings/people · WhatsApp hooks |

Open items to keep visible: **admin activity log change-order (Rs. 27,000) still needs client approval before Week 3**; **legacy FC/FL serial numbers needed to seed counters before real data entry**; assumption A3 (FC/FL pie) and the §8 notification event mapping are proceeding-as-proposed unless the client objects.

---

*Maintained by Dev 3. PRs against this doc welcome — it should always describe the repo as it actually is.*