# CargoDev — Phase 1 User Stories

**Version 1.0 · 11 July 2026 · Companion to Technical Documentation v2.0 and Task Breakdown CSV**
Roles: **Admin** (Administrator), **Manager**, **Operator**, **Viewer**, **Staff** (any logged-in employee), **System** (automated behaviour). Customers are data-only in Phase 1 — the customer-login story is listed at the end as Phase 2.
Each story lists acceptance criteria (AC) and the task IDs that implement it.

---

## Epic 1 — Authentication & access

**US-01 · Staff login** — *As a staff member, I want to sign in with my email and password so that only authorised people can access company vehicle data.*
AC: valid credentials open the dashboard; invalid show a clear error without revealing which field was wrong; session persists per "remember me"; passwords stored only as bcrypt hashes.
Tasks: CD-D3-17, CD-D1-01

**US-02 · Role-based access** — *As an Admin, I want each staff account to have a role (Administrator / Manager / Operator / Viewer) so that people only see and do what their job requires.*
AC: Viewer gets read-only everywhere (no save/edit/upload controls rendered, and server rejects writes); Operator can add/edit vehicles and upload files; Manager additionally manages customers; only Admin sees Users, Settings and the Activity Log; access enforced server-side, not just hidden in the UI.
Tasks: CD-D3-18

**US-03 · Editable profile** — *As any user, I want to edit my own profile (name, contact details, password) so that my account information stays current.*
AC: user can change own name/phone/password; email change validated for uniqueness; changes take effect immediately.
Tasks: CD-D2-17

---

## Epic 2 — Vehicle registry

**US-04 · Add a new vehicle with auto serial** — *As an Operator, I want to register a vehicle as FC (export) or FL (local) and have the system assign the next serial automatically so that numbering never has gaps or duplicates.*
AC: choosing FC or FL previews the next serial (e.g. FC1024); serial is assigned transactionally at save — two staff saving simultaneously never get the same number; serial is unique per organisation and read-only after creation.
Tasks: CD-D3-20, CD-D2-01, CD-D2-04

**US-05 · Enter a legacy vehicle** — *As an Operator, I want to type an old vehicle's original serial manually so that historical records keep their real numbers.*
AC: legacy mode accepts a manual serial matching the FC/FL pattern; duplicates are rejected with a clear message; entering a number higher than the counter bumps the counter so the next auto serial continues correctly; lower numbers back-fill without affecting the counter.
Tasks: CD-D2-03, CD-D3-20

**US-06 · Vehicle table** — *As a staff member, I want a table of all vehicles with the full field set so that I can see the fleet's state at a glance.*
AC: columns cover the specified fields (serial, chassis, model, YOM, statuses, dates, customer, destination, transport, agent, etc.); sortable columns; paginated; loads under 2s at 1,000+ records.
Tasks: CD-D1-02, CD-D1-03

**US-07 · FC / FL filter toggle** — *As a staff member, I want a one-click FC / FL / All toggle on the vehicle table so that I can work each business track separately.*
AC: toggle filters instantly by serial prefix; the active choice is visually obvious and persists while navigating away and back within the session.
Tasks: CD-D1-02, CD-D1-03

**US-08 · Search & filter** — *As a staff member, I want to search and filter vehicles (chassis, serial, model, status, destination, customer, dates) so that I can find any vehicle in seconds.*
AC: text search matches serial, chassis, auction item/lot no; per-column filters combine with the FC/FL toggle; empty results show a friendly empty state.
Tasks: CD-D1-02, CD-D1-03

**US-09 · Row colours** — *As a staff member, I want table rows coloured by workflow status so that I can read the fleet's situation without opening records.*
AC: selecting a row-colour status (Name Change Needed, Faxed to Auction, Sold, Resold in Auction, Shaken Fax from Auc OK, Unit Canceled) colours the whole row; **Transport Complete colours only the Transport By cell**; colours match the values configured in Settings; rows with no status stay uncoloured.
Tasks: CD-D3-12, CD-D1-04

**US-10 · Vehicle detail** — *As a staff member, I want a full detail page per vehicle so that everything about it — fields, photos, documents, remarks, history — lives in one place.*
AC: all 35 fields displayed grouped logically; photo gallery, document list and auction sheet visible; remarks thread and status timeline included; Edit available per role.
Tasks: CD-D1-06, CD-D2-11

**US-11 · Edit a vehicle** — *As an Operator, I want to update any editable vehicle field so that records stay accurate as the shipment progresses.*
AC: all fields except serial editable per role; validation errors shown inline; every save is captured in the activity log.
Tasks: CD-D2-01, CD-D2-02, CD-D2-04–06

**US-12 · Honest tri-state flags** — *As a staff member, I want Auction Bill Paid, Log Book and Extra Key to show blank / Yes / No so that "not entered yet" is never mistaken for "No".*
AC: new vehicles show all three as blank; a three-segment control sets Yes/No or clears back to blank; dashboards and filters treat blank and No as distinct values.
Tasks: CD-D3-14, CD-D2-01, CD-D2-06

**US-13 · Append-only remarks** — *As a staff member, I want to add remarks to a vehicle without overwriting earlier ones so that the record keeps a trustworthy conversation history.*
AC: new remark appends with my name and timestamp; existing remarks are never editable or deletable; thread shows newest context clearly.
Tasks: CD-D1-08

**US-14 · Doc sent to client** — *As an Operator, I want to record the date documents were sent to the client with an optional comment so that we can answer "when did you send it?" instantly.*
AC: date field plus free-text comment; both visible in the table/detail; blank until entered.
Tasks: CD-D1-09

---

## Epic 3 — Shipment lifecycle (automated)

**US-15 · Booking Received on ETD** — *As the System, when staff save an ETD on a Pending vehicle, I set the shipment status to Booking Received so that status always reflects reality without manual updates.*
AC: saving a first ETD flips Pending → Booking Received immediately; clearing the ETD reverts to Pending; both transitions write StatusHistory with actor and trigger.
Tasks: CD-D1-05

**US-16 · Shipped after ETD passes** — *As the System, I mark vehicles Shipped once their ETD date has passed so that staff never have to remember to update them.*
AC: a daily job flips Booking Received → Shipped where ETD < today; the UI also computes the correct status on read so it is never stale between job runs; transition logged in StatusHistory.
Tasks: CD-D3-22, CD-D1-05

**US-17 · Status timeline** — *As a staff member, I want to see every status change with who/what triggered it and when so that disputes about timing are settled by the record.*
AC: detail page shows a chronological timeline of all transitions incl. automated ones marked "System".
Tasks: CD-D1-07

**US-18 · FL vehicles skip shipping** — *As an Operator, when I register an FL vehicle, I don't want to see shipping fields so that local sales entry stays fast and clean.*
AC: ETD/ETA, BL, freight agent, RORO/container, tracking hidden for FL on form and detail; FL vehicles excluded from shipment-status tracking and shipping widgets.
Tasks: CD-D2-02, CD-D2-05

---

## Epic 4 — Models & managed lookups

**US-19 · One model field, three levels** — *As an Operator, I want to type into a single Model field and get suggestions like "Toyota Land Cruiser ZX" so that brand, model and grade are captured without duplicate text in the database.*
AC: typing searches across brand+model+grade paths case-insensitively; selection stores IDs, not text; grade optional.
Tasks: CD-D3-13, CD-D2-07, CD-D2-09

**US-20 · Add new brand/model/grade inline** — *As an Operator, when a vehicle has a brand, model or grade we've never used, I want to add it right from the field so that data entry never stops.*
AC: "Add 'X'" appears at the missing level (new brand / new model under brand / new grade under model); created value is immediately selected and reusable by everyone; case-insensitive duplicate prevention.
Tasks: CD-D3-13, CD-D2-07

**US-21 · Manage lookups in Settings** — *As an Admin, I want to rename, merge or deactivate lookup values (halls, transport companies, locations, agents, brands/models/grades) so that lists stay clean without touching vehicle records.*
AC: rename propagates instantly to every vehicle (IDs, not text); merge re-points affected vehicles; deactivated values hidden from new entry but preserved on old records.
Tasks: CD-D2-08, CD-D2-12

**US-22 · Freight agent capabilities** — *As an Operator, I want the RORO/Container choice limited to what the selected agent actually offers so that impossible bookings can't be recorded.*
AC: agent records carry offersRoro/offersContainer flags; the method selector only shows supported options; server rejects invalid combinations even if the UI is bypassed.
Tasks: CD-D2-05, CD-D2-08

**US-23 · Configurable status colours** — *As an Admin, I want to set the colour of each row-colour status so that the table matches how our team already reads colours.*
AC: colour picker per status in Settings; changes apply immediately without deploy; new statuses can be added later.
Tasks: CD-D2-13

---

## Epic 5 — Files

**US-24 · Auction sheet** — *As an Operator, I want to attach the auction sheet image to a vehicle so that the original condition report is always at hand.*
AC: single image upload (JPEG/PNG/WebP, ≤10 MB, enforced server-side); viewable full-size from the detail page; replaceable.
Tasks: CD-D3-19, CD-D2-10, CD-D2-11

**US-25 · Vehicle photos** — *As an Operator, I want to upload multiple photos per vehicle so that its condition is documented at auction and yard.*
AC: multi-image upload with progress; gallery on detail page; individual delete per role.
Tasks: CD-D3-15, CD-D2-10, CD-D2-11

**US-26 · Documents** — *As an Operator, I want to attach PDFs (B/L, export certificate, invoices, other) under each vehicle so that paperwork is never hunted through email.*
AC: multiple PDFs with type labels; list with uploader + date; download/view from detail page.
Tasks: CD-D2-10, CD-D2-11

---

## Epic 6 — Customers & users

**US-27 · Name-first customer** — *As a Manager, I want to create a customer with just a name so that a sale can be recorded the moment it's agreed, details later.*
AC: name is the only required field; phone/email/country/address optional and editable later; customer appears immediately in the vehicle form's customer field.
Tasks: CD-D2-14, CD-D2-15

**US-28 · Vehicles belong to customers, never staff** — *As the System, I only allow CUSTOMER-type users in the vehicle's customer field so that ownership data stays meaningful.*
AC: customer combobox lists customers only; server rejects staff IDs in customer_id.
Tasks: CD-D2-14

**US-29 · Customers listed separately** — *As a staff member, I want customers and employees on separate screens so that the two populations are never confused, even though they share one accounts table.*
AC: Customers screen shows only userType=CUSTOMER; Users screen only STAFF with roles; both support search.
Tasks: CD-D2-15, CD-D2-17

**US-30 · Staff management** — *As an Admin, I want to add, edit, deactivate staff and assign roles so that access always matches the current team.*
AC: CRUD for staff; deactivation blocks login immediately without deleting history; last-active visible.
Tasks: CD-D2-16, CD-D2-17

---

## Epic 7 — Dashboard

**US-31 · KPI cards** — *As a Manager, I want Total Vehicles, Pending Shipping and Shipped counts at the top of the dashboard so that I get the headline numbers in one glance.*
AC: counts correct and org-scoped; Pending/Shipped count FC vehicles only; cards update on load.
Tasks: CD-D1-10, CD-D1-12

**US-32 · Distribution pies** — *As a Manager, I want pie charts for vehicles tracked (FC vs FL) and shipment status so that I can see the shape of the business, not just totals.*
AC: pies with legends and counts; empty categories omitted; the 2-slice FC vs FL pie uses two deliberately distinct colours (not two shades of the same blue); the shipment-status pie reuses the same warning/info/success colours already used for status badges elsewhere in the app. The original third pie (destination) was retired — destination is still covered by Export Volume by Destination (US-33, now folded into the US-44 selectable widget); the more granular set added in US-44 covers location/transport/agent/RORO-Container/brand instead.
Tasks: CD-D1-10, CD-D1-11, CD-D1-12

**US-33 · Export volume by destination** — *As a Manager, I want to see export volume per destination so that I can compare markets.*
AC: FC vehicles grouped by destination country; sorted by volume; readable at 10+ destinations. Originally its own column chart — folded into the US-44 selectable widget during implementation so it scales the same way as the other lookup breakdowns.
Tasks: CD-D1-11, CD-D1-13

**US-34 · Transport status by company** — *As a Manager, I want vehicle transport status grouped by transport company so that I can see each company's load and completion at a glance.*
AC: grouped by Transport By value; shows Transport Complete vs in-progress per company; companies with no vehicles omitted.
Tasks: CD-D1-11, CD-D1-13

**US-35 · Auction bills needing payment** — *As a Manager, I want to see vehicles whose auction bill is not confirmed paid so that nothing is missed at the auction house.*
AC: includes vehicles where Auction Bill Paid is blank **or** No (blank is not treated as paid); links straight to each vehicle. Originally its own always-visible, colour-highlighted list card below the KPI row — folded into the KPI row itself as the 4th card during implementation (US-45), keeping the red/green colour-coding via the card's own tone instead of the whole card's background.
Tasks: CD-D1-11, CD-D1-13

**US-43 · Dashboard trend charts** *(added post-spec, during implementation)* — *As a Manager, I want to switch between a few trend charts (Bookings vs Arrivals, Vehicles Entered, Cumulative Growth, Docs Turnaround) so that I can see how things are moving over time without cluttering the dashboard with every chart at once.*
AC: one segmented selector, only the chosen chart renders; Bookings vs Arrivals counts FC vehicles by ETD/ETA month; Vehicles Entered and Cumulative Growth count all vehicles by `createdAt` month; Docs Turnaround averages `docsArrivedDate - purchaseDate` in days per month; each chart shows an empty state instead of a blank card when there's not enough data yet.
Tasks: none (added directly, no task breakdown entry)

**US-44 · Additional distribution charts** *(added post-spec, during implementation)* — *As a Manager, I want to see vehicle counts by Location, Transport Company, Freight Agent, Export Volume by Destination and Brand so that I can see the shape of the business across every lookup field, not just shipment status and track — without the dashboard growing a new permanent card for each one.*
AC: Vehicle Location, Transport Company, Freight Agent, Export Volume by Destination and Brand share one switchable "Vehicles by Category" widget (segmented selector, one horizontal bar chart rendered at a time) since each can grow to many categories over time and a pie or a vertical bar with rotated labels stops being readable past a handful; bar-chart height scales with category count so it stays readable at any size; RORO/Container stays its own pie (only 2 categories, doesn't need the selector); every chart colours each category individually from a shared rotating palette instead of one flat colour per chart, and the 2-category charts (FC vs FL, RORO/Container) get an explicit 2-colour override picked to sit far apart on the wheel rather than drawing two similar blues off the rotation; each empty category omitted; each chart shows an empty state instead of a blank card when there's no data yet. Replaces the retired "vehicles by destination" pie from US-32.
Tasks: none (added directly, no task breakdown entry)

**US-45 · Clickable KPI cards** *(added post-spec, during implementation)* — *As a Manager, I want to click a KPI card and land on exactly those vehicles so that a headline number is a starting point, not a dead end.*
AC: Total Vehicles and Shipped link straight to the vehicles table, pre-filtered to match what the card counted (Shipped: `status=SHIPPED&track=FC`); Pending Shipping and Unpaid Auction Bills each open a popup first, listing every matching vehicle as a small box (serial + year, brand/model, customer name), since a Manager usually wants to know *which* vehicles before leaving the dashboard; picking one from either popup closes it and opens the vehicles table filtered to that vehicle's unique serial; all 4 cards get a hover lift/shadow so they read as clickable.
Tasks: none (added directly, no task breakdown entry)

---

## Epic 8 — Reports

**US-36 · PDF & Excel export** — *As a Manager, I want to export vehicle reports as PDF and Excel so that I can share fleet data outside the system.*
AC: exports respect current filters (incl. FC/FL); Excel opens cleanly with correct types (dates as dates); PDF is print-ready.
Tasks: CD-D1-14, CD-D1-15, CD-D1-16

---

## Epic 9 — Notifications

**US-37 · In-app bell** — *As a staff member, I want a bell with a live unread count so that I notice events without refreshing.*
AC: badge updates in real time via Pusher; list shows newest first; mark one/all as read.
Tasks: CD-D3-21, CD-D1-17, CD-D1-18

**US-38 · Shipped alerts** — *As a staff member, I want in-app + email alerts when a vehicle becomes Shipped so that follow-up actions start on time.*
AC: fired by the automated transition; email lists serial, model, chassis, ETD, destination.
Tasks: CD-D1-19, CD-D3-22

**US-39 · Name-change deadline alerts** — *As a staff member, I want alerts 7 days and 1 day before a vehicle's name-change deadline so that we never miss a legal deadline.*
AC: daily scan of name_change_deadline; in-app + email at both thresholds; no repeat spam once sent.
Tasks: CD-D3-22, CD-D1-19

**US-40 · WhatsApp alerts (add-on)** — *As a staff member, I want Shipped and deadline alerts on WhatsApp so that I see them port-side without opening the app.*
AC: Meta Cloud API utility templates; delivery logged; recipient numbers manageable by Admin; failures fall back silently to email/in-app.
Tasks: CD-D3-06/07/24/25, CD-D2-20

---

## Epic 10 — Admin activity log (change-order, pending approval)

**US-41 · Full activity trail** — *As an Admin, I want a filterable log of every action — who changed which vehicle/field, uploaded what, created whom, when — so that any question about "who did this?" has an answer.*
AC: every mutation writes actor, action, entity, timestamp and before/after metadata; Admin-only screen filters by user, entity and date range; detail drawer shows the change payload; log rows are immutable.
Tasks: CD-D3-23, CD-D2-19, CD-D1-20

---

## Epic 11 — Mobile (add-on)

**US-42 · Work from a phone** — *As an Operator at the auction hall or port, I want every screen usable on my phone so that I can update statuses and check details on the spot.*
AC: all core screens usable at 380px width; tables scroll or collapse gracefully; forms and toggles are touch-friendly; verified on real Android + iOS devices.
Tasks: CD-D1-21, CD-D2-21

---

## Phase 2 (recorded now, not built now)

**US-P2-01 · Customer portal login** — *As a Customer, I want to log in and see only my own vehicles so that I can follow my purchase without calling the office.* — Foundation already laid: customers live in the users table with loginEnabled=false; Phase 2 sets a password, flips the flag, and adds a portal route scoped by customer_id.
