# CargoDev — Phase 1 Technical Documentation & Task Breakdown

**Project:** CargoDev — Vehicle Import Management System · Client: Global Motors (Pvt) Ltd
**Version:** 2.0 · 11 July 2026 — **supersedes v1.0.** This revision replaces the generic vehicle model with the real Phase 1 field specification provided by the business, redefines the shipment status flow, and re-cuts the task breakdown. Architecture, conventions, environments and quotation basis (CL-2026-001 Rev B + admin-log change-order) carry over from v1.0.
**Companion file:** `CargoDev_Task_Breakdown.csv` — import-ready, 160 hrs per developer.

---

## 1. Business domain — FC / FL and the vehicle lifecycle

Every vehicle carries a **serial number** that defines its business track:

| Prefix | Meaning | Behaviour |
|---|---|---|
| **FC** | Export/shipping vehicles | Full shipment lifecycle: ETD/ETA, BL, freight agent, RORO/container, tracking |
| **FL** | Local vehicles — sold locally, never shipped | **Confirmed:** shipping fields (ETD/ETA/BL/agent/method/tracking) hidden; shipment status not tracked for FL |

The main vehicle table has a **direct FC / FL / All filter toggle** so staff can view each track separately.

### Shipment status — three states, automated

The v1 seven-state flow is **replaced** by this simpler, automated flow:

```
PENDING            ← every vehicle starts here on entry
   ↓  (staff enters an ETD)
BOOKING RECEIVED   ← set automatically the moment ETD is saved
   ↓  (ETD date passes)
SHIPPED            ← set automatically by a daily scheduled job once today > ETD
```

- No manual status dropdown — status is derived from data. Every transition still writes a `StatusHistory` row (who/when/what triggered it).
- Implementation: transition to Booking Received happens inside the vehicle-update service when ETD goes from null → value. Transition to Shipped runs via **Vercel Cron** (daily) plus a computed guard on read, so the UI is never stale even if the job hasn't run yet.
- Clearing an ETD reverts status to Pending (logged).

### Row colour status (separate from shipment status)

A second, staff-selected status controls **row colour** in the vehicle table. Statuses are stored as a managed list with an editable colour per status (configured in Settings):

| Status | Colour scope |
|---|---|
| Name Change Needed | whole row |
| Faxed to Auction | whole row |
| Sold | whole row |
| Resold in Auction | whole row |
| Shaken Fax from Auc OK | whole row |
| Unit Canceled | whole row |
| **Transport Complete** | **Transport By cell only** — does not colour the row |

The colour value is data, not code — admins can adjust colours without a deploy, and new statuses can be added later.

---

## 2. Vehicle field specification (the core of Phase 1)

| # | Field | Type / control | Behaviour |
|---|---|---|---|
| 1 | Serial No | `FC`/`FL` prefix + auto-increment | Auto-generated per prefix; manual entry allowed for legacy records (see §3) |
| 2 | Auction Item No | text | — |
| 3 | Chassis No | text | Unique per org (soft-warn on duplicates for legacy data) |
| 4 | Shipment Status | derived enum | Pending → Booking Received → Shipped (automated, §1) |
| 5 | Model | single combobox, hierarchical | Brand → Model → Grade, normalized reference tables, inline add (§4) |
| 6 | YOM | year number | Year of manufacture |
| 7 | Auction Hall | managed lookup combobox | Fixed-ish list, addable/editable from the form (§4) |
| 8 | Purchase Date | date | — |
| 9 | ETD | date | Setting it triggers Booking Received |
| 10 | ETA | date | — |
| 11 | Auction Lot No | text | — |
| 12 | Customer | combobox → User (type CUSTOMER) | Name-only record for now; Phase 2 gives customers logins (§5) |
| 13 | Destination | country select | Any country |
| 14 | BL No | text | — |
| 15 | Auction Bill Paid | **tri-state**: blank / Yes / No | Stored as nullable boolean — **null until staff explicitly set it**; never defaults to No |
| 16 | Auction Sheet | image upload | Single image, stored in R2 |
| 17 | Docs Arrived Date | date | — |
| 18 | Log Book | tri-state | Same rule as #15 |
| 19 | Extra Key | tri-state | Same rule as #15 |
| 20 | Name Change Deadline | date | Candidate for deadline alert notification |
| 21 | Transport By | managed lookup | Like Auction Hall; feeds the dashboard transport widget |
| 22 | Vehicle Location | managed lookup | Like Auction Hall |
| 23 | Freight Agent | managed lookup + capabilities | Each agent flagged as offering RORO and/or Container |
| 24 | RORO / Container | enum per vehicle | Validated against the chosen agent's capabilities |
| 25 | Masso Date | date | Deregistration (抹消) date |
| 26 | Bill Number | text | — |
| 27 | LC No | text | — |
| 28 | Tracking No | text | — |
| 29 | Remarks | append-only thread | Textarea; new entries append with author + timestamp, existing entries preserved (§6) |
| 30 | Doc Sent to Client | date **+ optional comment** | Two columns: `doc_sent_date`, `doc_sent_comment` |
| 31 | Recycle | date | Confirmed as a date field (`recycle_date DateTime?`) |
| 32 | Jibaishake (自賠責) | free text | Confirmed as text for now (`jibaishake String?`); can be structured later without migration pain |
| 33 | Row Colour Status | managed lookup with colour | §1; nullable |
| 34 | Vehicle Photos | multi-image upload | Multiple images per vehicle |
| 35 | Documents | multi-file upload (PDF) | B/L, export cert, invoices, other |

**Tri-state rule (mentor note):** a plain `Boolean` would force `false` on records where staff simply haven't entered the value yet — that silently turns "unknown" into "No" and corrupts reporting (e.g. the unpaid-auction-bill widget). Prisma `Boolean?` gives us three honest states: `null` = not entered, `true` = Yes, `false` = No. The UI control is a three-segment toggle: — / Yes / No.

---

## 3. Serial number system

**Requirements:** continue incrementing from the last serial in the existing (pre-system) datasets, per prefix; AND allow old records to be entered afterwards without breaking the sequence.

**Design:**

```prisma
model SerialCounter {
  id         String @id @default(cuid())
  org_id     String
  prefix     SerialPrefix   // FC | FL
  lastNumber Int
  @@unique([org_id, prefix])
}
```

1. **Seed** each counter with the last number used in the legacy data (needs the real values from the old sheets — open question Q3).
2. **New vehicle:** service transactionally increments the counter and assigns `serial = prefix + padded number` (e.g. `FC1024`). Transactional increment = no duplicates even if two staff save at once.
3. **Legacy entry mode:** the form allows typing a serial manually. Validation: must match `FC…`/`FL…` pattern and be unique. If the typed number is **higher** than the counter, the counter is bumped up to it (`lastNumber = max(lastNumber, entered)`); if lower, it simply back-fills the gap. Either way the "next new serial" is always correct.
4. Stored as three columns — `serialPrefix`, `serialNumber Int`, `serial String` (display) — with `@@unique([org_id, serial])`. Keeping the numeric part separate makes sorting and the FC/FL filter a cheap indexed query instead of string parsing.
5. **Legacy data is entered manually by staff** — no bulk import tool is built. The Add Vehicle form's *legacy entry mode* (manual serial input with pattern/uniqueness validation and counter-bump logic above) is the mechanism. Recommended: seed the counters with the last known FC/FL serials from the old sheets before entry starts, so a brand-new vehicle created early can never collide with an old serial that hasn't been typed in yet.

## 4. Normalized lookups — models, halls, transport, locations, agents

**Problem to avoid:** typing "Toyota", "TOYOTA", "toyota " as free text creates duplicates that ruin filtering and dashboards. **Solution:** reference tables + a reusable **combobox-with-inline-create** component. The vehicle row stores only foreign keys — each name exists exactly once in the database.

```prisma
model Brand            { id String @id @default(cuid()); org_id String; name String; models VehicleModelRef[]; @@unique([org_id, name]) }
model VehicleModelRef  { id String @id @default(cuid()); org_id String; brand_id String; brand Brand @relation(...); name String; grades Grade[]; @@unique([org_id, brand_id, name]) }
model Grade            { id String @id @default(cuid()); org_id String; model_id String; model VehicleModelRef @relation(...); name String; @@unique([org_id, model_id, name]) }

model AuctionHall      { id String @id @default(cuid()); org_id String; name String; @@unique([org_id, name]) }
model TransportCompany { id String @id @default(cuid()); org_id String; name String; @@unique([org_id, name]) }
model VehicleLocation  { id String @id @default(cuid()); org_id String; name String; @@unique([org_id, name]) }
model FreightAgent     { id String @id @default(cuid()); org_id String; name String; offersRoro Boolean @default(false); offersContainer Boolean @default(false); @@unique([org_id, name]) }
```

**Model field UX (single column, three levels):** one combobox that searches across `Brand Model Grade` paths ("land zx" → *Toyota Land Cruiser ZX*). While typing, existing entries are suggested; if no match exists at any level, an inline "Add 'X' as new brand / model under Toyota / grade under Land Cruiser" option creates it on the spot. Case-insensitive matching + unique constraints prevent duplicates. Grade is optional.

**Other lookups** (Auction Hall, Transport By, Vehicle Location, Freight Agent) use the same component with a flat list. All lists are also editable (rename/merge/deactivate) in **Settings → Lookups**; renames propagate everywhere instantly because vehicles store IDs, not text.

**Freight agent capability rule:** the RORO/Container selector on a vehicle only offers methods the chosen agent actually provides; server-side validation enforces it too (never trust the UI alone).

## 5. Users vs customers — one table, two populations

```prisma
enum UserType  { STAFF CUSTOMER }
enum StaffRole { ADMINISTRATOR MANAGER OPERATOR VIEWER }

model User {
  id            String    @id @default(cuid())
  org_id        String
  userType      UserType
  name          String
  email         String?    // optional for customers in Phase 1
  phone         String?
  country       String?
  address       String?
  password      String?    // null for customers until Phase 2 logins
  loginEnabled  Boolean    @default(false)   // true for staff, false for customers (Phase 1)
  role          StaffRole? // null for customers
  lastActiveAt  DateTime?
  vehicles      Vehicle[]  @relation("CustomerVehicles")
  @@unique([org_id, email])
}
```

- **Vehicles are always purchased by CUSTOMER users, never staff** — the customer combobox on the vehicle form only lists `userType = CUSTOMER`.
- Separate screens: **Users** (staff, with roles) and **Customers** (name-first records) — same table underneath, filtered by `userType`, so Phase 2 "customer login to view own vehicles" is just: set a password, flip `loginEnabled`, and add a portal route scoped by `customer_id`. Zero data migration.
- Every account (staff and customer) has an editable profile page.

## 6. Remarks, files, and activity log

- **Remarks:** an append-only `RemarkEntry` child table (vehicle_id, author, body, createdAt) rendered as a running thread under a textarea. Nothing is ever overwritten — you always know who said what, when.
- **Files per vehicle:** one Auction Sheet image, multiple Photos, multiple Documents (PDF) — all via the shared R2 presigned-upload infrastructure, URLs only in the DB.
- **Admin activity log (change-order):** every mutation writes an `ActivityLog` row (actor, action, entity, before/after metadata); Administrator-only viewer screen with filters. Scoped 30 hrs / Rs. 27,000 — approval still recommended before Week 3.

## 7. Dashboard specification

| Widget | Type | Source |
|---|---|---|
| Total vehicles | KPI card | count |
| Pending shipping | KPI card | `shipmentStatus = PENDING` |
| Shipped | KPI card | `shipmentStatus = SHIPPED` |
| Total vehicles tracked | Pie | FC vs FL split *(assumption A3 — still open; flag if a different split is wanted)* |
| Shipment status distribution | Pie | Pending / Booking Received / Shipped |
| Vehicles by destination | Pie | destination country + counts |
| Export volume by destination | Column chart | FC vehicles grouped by destination |
| Transport status by company | Grouped bar / table | grouped by Transport By, split by row-colour status incl. Transport Complete |
| Auction bill payment due | List / KPI | `auction_bill_paid` is `null` **or** `false` (i.e. not confirmed paid) |

## 8. Notifications — re-mapped to the new flow *(proposal — confirm)*

The old Arrived/Delayed events no longer exist. Proposed Phase 1 events: **Booking Received** (auto, in-app), **Shipped** (auto, in-app + email), **Name-change deadline approaching** (7 and 1 days before, in-app + email — this is the highest-value alert in the new model), **Document/photo uploaded** (in-app). WhatsApp add-on channel attaches to Shipped + deadline alerts. Same fan-out core as v1.

## 9. Commercial & scope notes

- The 3-state automated shipment flow is **simpler** than the quoted 7-state flow, but the vehicle model is **far richer** (35 fields, 7 lookup tables, serial system, row-colour system, customers). Legacy data is entered manually by staff (no import tool), so the net effort fits the 480-hr envelope. The only open commercial item is the **admin activity log change-order (Rs. 27,000)**.
- Customer **logins/portal remain Phase 2** — Phase 1 only lays the data foundation (deliberately, at near-zero cost).

## 10. Open questions & assumptions

| ID | Item | Status |
|---|---|---|
| A1 | FL vehicles hide shipping fields; shipment status not tracked for FL | ✅ Confirmed |
| A2 | Recycle = **date**, Jibaishake = **free text** for now | ✅ Confirmed (recycle read as "date" from "just a data" — flag if wrong) |
| A3 | "Total vehicles tracked" pie split by FC vs FL | ⏳ Open — proceeding with FC/FL |
| Q3 | Legacy data entry: **manual by staff** via the form's legacy serial mode — no import tool | ✅ Confirmed; still extract the last FC/FL serials to seed counters before entry starts |
| Q4 | Notification events in §8 | ⏳ Open — proceeding as proposed |

---

## 11. Architecture, stack & conventions (unchanged from v1.0)

One Next.js 14 App Router app; all business logic in `lib/services/*` called by thin Server Actions now and `/api/*` Route Handlers when the mobile app is approved. PostgreSQL (Supabase) + Prisma, every table carries `org_id` and every query filters by it. NextAuth (cookie sessions now, JWT-bearer branch later). Pusher (real-time), Resend (email), Cloudflare R2 (files), Vercel (hosting + **Cron for the ETD→Shipped job**). Tailwind + shadcn/ui, dark-sidebar layout per approved designs. TypeScript strict, zod on every mutation, typed service errors, PR review + CI required, task IDs in every PR. Definition of Done as v1.0 §17 (now including: mutations write an ActivityLog entry; lookup values created only through the lookup services).

---

## 12. Task breakdown — granular, equal 160 hrs per developer, full-stack ownership

**Allocation principle (revised):** no frontend/backend specialisation. Dev 1 and Dev 2 each own **vertical feature slices end-to-end** — database query → service → UI — so every feature has exactly one owner and no cross-dev handoff in the middle of a feature. Dev 3 remains the **platform owner** (setup, schema, shared components, auth, serial engine, scheduler, notification core) so the other two build on a consistent base. Consistency across the two feature devs is enforced by Dev 3's shared component library and the conventions in §11, not by role labels.

Tasks are broken to 2–12 hrs each (70 tasks total) so progress is visible daily in the tracker.

**Envelope:** 400 base + 50 approved add-ons + 30 change-order (admin log) = **480 hrs → 160 hrs / Rs. 144,000 per developer**. Legacy import removed; those hours are reabsorbed into the richer vehicle form/table/dashboard estimates.

### Dev 3 — Platform & foundation · 160 hrs · 28 tasks

| ID | Task | Week | Hrs |
|---|---|---|---|
| CD-D3-01 | Create repo, branch protection, Next.js 14 + TS + Tailwind + shadcn scaffold | 0 | 6 |
| CD-D3-02 | Provision Supabase + Prisma wiring + env config | 0 | 4 |
| CD-D3-03 | Provision Vercel, R2, Pusher, Resend + secrets | 0–1 | 6 |
| CD-D3-04 | CI pipeline: lint, typecheck, build | 1 | 4 |
| CD-D3-05 | PR preview deployments + branching workflow | 1 | 4 |
| CD-D3-06 | **Add-on, day 1:** initiate Meta Business verification | 1 | 2 |
| CD-D3-07 | **Add-on:** draft + submit WhatsApp utility templates | 1 | 2 |
| CD-D3-08 | Schema: Vehicle model (35 fields) | 1 | 6 |
| CD-D3-09 | Schema: lookup tables (brand/model/grade, halls, transport, locations, agents, row statuses) | 1 | 4 |
| CD-D3-10 | Schema: users/customers, remarks, files, notifications, activity log, serial counters; migrations + seed | 1 | 6 |
| CD-D3-11 | App shell: sidebar, header, nav, route groups | 1 | 6 |
| CD-D3-12 | Shared data table: sorting, pagination + **row-colouring engine** | 1–2 | 8 |
| CD-D3-13 | **Combobox-with-inline-create** (flat + hierarchical modes) | 1–2 | 8 |
| CD-D3-14 | Tri-state toggle, date picker, form field primitives | 2 | 4 |
| CD-D3-15 | Upload widgets: single image, multi-image, documents | 2 | 4 |
| CD-D3-16 | Chart wrappers: pie, column, KPI card | 2 | 4 |
| CD-D3-17 | NextAuth credentials + bcrypt + JWT sessions | 1 | 6 |
| CD-D3-18 | `requireUser()` guard + role/userType middleware gating | 1–2 | 6 |
| CD-D3-19 | R2 presigned upload routes + server-side limits | 2 | 8 |
| CD-D3-20 | Serial number engine: transactional counters, manual-entry bump rules, seeding | 2 | 10 |
| CD-D3-21 | Notification fan-out core `emit()` + Pusher plumbing | 2 | 6 |
| CD-D3-22 | Vercel Cron: daily ETD→Shipped job + deadline scan | 2 | 6 |
| CD-D3-23 | **Change-order:** activity log service + write hooks | 3 | 8 |
| CD-D3-24 | **Add-on:** WhatsApp send service + template params | 5 | 8 |
| CD-D3-25 | **Add-on:** WhatsApp alert wiring + delivery logging | 5 | 6 |
| CD-D3-26 | Security & org_id scoping audit | 4 | 6 |
| CD-D3-27 | Production deploy + monitoring basics | 4 | 6 |
| CD-D3-28 | UAT coordination + handover docs | 4 | 6 |

### Dev 1 — Vehicle tracking, dashboard, reports, notifications · 160 hrs · 21 tasks

| ID | Task | Week | Hrs |
|---|---|---|---|
| CD-D1-01 | Login page UI + NextAuth wiring | 1 | 4 |
| CD-D1-02 | Vehicle list query layer: FC/FL filter, search, column filters, pagination | 2 | 8 |
| CD-D1-03 | Vehicle table UI: full column set, **FC/FL toggle**, filter bar | 2 | 12 |
| CD-D1-04 | Row colouring integration: whole-row + Transport-By-cell-only rule | 2 | 4 |
| CD-D1-05 | Shipment status automation service: ETD→Booking Received, revert rules, StatusHistory | 2 | 8 |
| CD-D1-06 | Vehicle detail page: full record view | 3 | 10 |
| CD-D1-07 | Status history timeline UI | 3 | 4 |
| CD-D1-08 | Remarks: append service + thread UI | 3 | 6 |
| CD-D1-09 | Doc-sent-to-client: date + comment (service + UI) | 3 | 2 |
| CD-D1-10 | Dashboard queries: 3 KPIs, shipment-status pie, FC/FL pie | 3 | 8 |
| CD-D1-11 | Dashboard queries: destination pie, export-volume column, transport-by-company, unpaid-bills | 3 | 8 |
| CD-D1-12 | Dashboard UI: KPI cards + 3 pie charts | 3 | 10 |
| CD-D1-13 | Dashboard UI: column chart, transport widget, unpaid-bill list | 3 | 8 |
| CD-D1-14 | Reports queries + PDF export | 4 | 10 |
| CD-D1-15 | Excel export | 4 | 6 |
| CD-D1-16 | Reports page UI + export buttons | 4 | 6 |
| CD-D1-17 | In-app notification channel: persistence, unread counts, mark-as-read | 3 | 6 |
| CD-D1-18 | Notifications UI: bell, live badge, list | 3 | 8 |
| CD-D1-19 | Email notifications: Resend templates (Shipped, name-change deadline) | 3 | 8 |
| CD-D1-20 | **Change-order:** activity log viewer UI — admin-only, filters, detail drawer | 4 | 12 |
| CD-D1-21 | **Add-on:** mobile-responsive — vehicle screens + dashboard + reports | 5 | 12 |

### Dev 2 — Vehicle entry, lookups, files, settings, people · 160 hrs · 21 tasks

| ID | Task | Week | Hrs |
|---|---|---|---|
| CD-D2-01 | Vehicle service: create/update, tri-state handling, FK wiring | 2 | 10 |
| CD-D2-02 | Vehicle validation: zod schemas, chassis soft-dup warning, FL field rules | 2 | 8 |
| CD-D2-03 | Legacy serial entry mode: manual serial UI + validation against the serial engine | 2 | 6 |
| CD-D2-04 | Add/Edit form: layout + vehicle info & auction sections | 2 | 10 |
| CD-D2-05 | Add/Edit form: shipment section (FC-only) — dates, agent, RORO/container validation | 2–3 | 8 |
| CD-D2-06 | Add/Edit form: statuses & flags section (tri-states, row-colour status), save flow | 3 | 6 |
| CD-D2-07 | Lookup services: brand/model/grade hierarchy — create, case-insensitive dedupe | 2 | 8 |
| CD-D2-08 | Lookup services: flat lists + agent capabilities; rename/merge/deactivate | 2 | 8 |
| CD-D2-09 | Hierarchical model combobox integration on the form | 3 | 6 |
| CD-D2-10 | Files services: auction sheet, multi-photos, documents per vehicle | 3 | 8 |
| CD-D2-11 | Files UI: uploads on form + gallery/doc list on detail page | 3 | 8 |
| CD-D2-12 | Settings: lookup management screens (all lists + brand/model/grade tree) | 4 | 8 |
| CD-D2-13 | Settings: row-status colour picker | 4 | 4 |
| CD-D2-14 | Customer service: CUSTOMER-type users, name-first creation, vehicle linking | 3 | 6 |
| CD-D2-15 | Customers screens: list (separate from staff), create, profile edit | 3 | 8 |
| CD-D2-16 | User management (staff) service: CRUD, roles, activate/deactivate | 3 | 6 |
| CD-D2-17 | Users (staff) screens + editable profile pages | 3 | 8 |
| CD-D2-18 | API hardening pass: typed errors across all services | 4 | 4 |
| CD-D2-19 | **Change-order:** activity log query layer — filters, pagination, retention | 3 | 10 |
| CD-D2-20 | **Add-on:** WhatsApp fan-out hooks + recipient/number management | 5 | 8 |
| CD-D2-21 | **Add-on:** mobile-responsive — forms, settings, users/customers screens | 5 | 12 |

**Totals:** 160 × 3 = 480 hrs. Cross-check: WhatsApp 2+2+8+6+8 = 26 ✓ · mobile 12+12 = 24 ✓ · admin log 8+12+10 = 30 ✓.

### Critical-path dependencies (encode in your task tool)

- CD-D3-08/09/10 (schema) block nearly everything — done by day 3, iterated after.
- CD-D3-12/13/14 (table, combobox, tri-state) block CD-D1-03 and CD-D2-04/09 — skeleton first, polish later.
- CD-D3-17/18 (auth) block all gated pages and CD-D2-14/16.
- CD-D3-19 (uploads) blocks CD-D2-10/11.
- CD-D3-20 (serial engine) blocks CD-D2-01/03 — and its **counter seeding needs the last FC/FL serials from the old sheets before real entry starts**.
- CD-D3-21/22 (fan-out + cron) block CD-D1-05/17/19 and CD-D2-20.
- CD-D2-07/08 (lookup services) block CD-D2-09/12 and parts of CD-D1-03 filters.
- CD-D3-06/07 (Meta) block CD-D3-24/25 — day 1.
