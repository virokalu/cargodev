# CargoDev — Design System (v1.0)

**Derived from:** the approved CargoLink UI screenshots (desktop + mobile, July 2026)
**Applies to:** CargoDev Phase 1 web app · Next.js 14 + Tailwind CSS + shadcn/ui
**Owner:** Dev 3 (platform) — Dev 1 and Dev 2 consume these tokens; nobody hard-codes colors.

> **Mentor note — why this file exists:** With three devs building vertical slices in parallel, the fastest way to end up with three slightly-different blues and four button styles is to let everyone eyeball the screenshots. This file turns the screenshots into *named tokens and component recipes*. If a value ever needs to change, you change it in one place (`globals.css` / `tailwind.config.ts`), not in 40 components. That is the entire point of a design system.

---

## 1. Design language at a glance

The approved design is a classic **"dark sidebar / light workspace" enterprise dashboard**:

- Dark navy sidebar for navigation, calm light blue-gray canvas for content.
- All content lives on **white cards** with generous radius and a whisper of shadow — never directly on the canvas.
- **One accent color** (brand blue) does all the interactive work: primary buttons, active nav, links, focus rings.
- Status is communicated with **pastel pill badges** (soft background + saturated text + leading dot), never with saturated fills.
- Identifiers (chassis numbers, serials, container codes) are set in a **monospace face** so staff can scan them like data, not prose.
- Density is *comfortable*, not compact — this is used by 6–8 staff who live in it all day, often on a phone at the port.

---

## 2. Color tokens

> **Mentor note:** Values below are read off the screenshots and snapped to the nearest Tailwind palette stop so the whole team shares one vocabulary ("that's `blue-600`, not "that blue"). If the client's brand blue is later confirmed to be a custom hex, change the token once — nothing else moves.

### 2.1 Core palette

| Token | Value | Tailwind | Used for |
|---|---|---|---|
| `--brand` | `#2563EB` | `blue-600` | Primary buttons, active nav item, links, active tab, logo tile |
| `--brand-hover` | `#1D4ED8` | `blue-700` | Hover/pressed state of anything `--brand` |
| `--brand-soft` | `#DBEAFE` | `blue-100` | Icon tiles, selected/unread row tint, info badges |
| `--sidebar` | `#0F172A` | `slate-900` | Sidebar background, auth-page left panel |
| `--sidebar-fg` | `#94A3B8` | `slate-400` | Inactive nav labels & icons |
| `--sidebar-fg-active` | `#FFFFFF` | `white` | Active nav label & icon |
| `--canvas` | `#F1F5F9` | `slate-100` | Page background behind cards |
| `--card` | `#FFFFFF` | `white` | Cards, table container, top bar, inputs |
| `--border` | `#E2E8F0` | `slate-200` | Card borders, table row dividers, input borders |
| `--text` | `#0F172A` | `slate-900` | Headings, primary content, big KPI numbers |
| `--text-secondary` | `#64748B` | `slate-500` | Subtitles, labels, table headers, timestamps |
| `--text-muted` | `#94A3B8` | `slate-400` | Placeholders, tertiary metadata |

### 2.2 Semantic / status palette

Each status uses the **same recipe**: `bg = color-100`, `text = color-700`, plus a `color-500` leading dot.

| Semantic | Soft bg | Text/dot | Tailwind pair | Seen on |
|---|---|---|---|---|
| Info / in-progress | `#DBEAFE` | `#1D4ED8` | `blue-100` / `blue-700` | Booked, In Transit, Loaded, Ready for Shipping |
| Success | `#DCFCE7` | `#15803D` | `green-100` / `green-700` | Delivered, Arrived, "Active" user status, ↗ positive trend |
| Danger | `#FEE2E2` | `#B91C1C` | `red-100` / `red-700` | Delayed, delete icons, notification badge, ↘ negative trend |
| Warning | `#FEF3C7` | `#B45309` | `amber-100` / `amber-700` | Missing Document icon tile, Pending Shipments KPI tile |
| Neutral | `#F1F5F9` | `#475569` | `slate-100` / `slate-600` | Pending badge, Inactive user, role badges |

> **Mentor note — the screenshots show the *old* 7-state flow.** The v2 spec replaces it with Pending → Booking Received → Shipped, plus the staff-selected **row-colour statuses** stored in the database (Tech Doc §1). This is exactly why we tokenise by *semantic role* and not by status name: the badge component takes a `{bg, fg}` pair, so new statuses (and admin-configured row colours from Settings) plug into the same recipe with zero redesign. Row-colour values coming from the DB should be validated/normalised to comfortable pastels — suggest storing the `*-100` background and deriving text at `*-700`.

### 2.3 KPI icon-tile palette

Rounded-xl (≈12px) pastel squares, ~48px, icon at `*-600`:

| Tile | bg / icon |
|---|---|
| Vehicles (car) | `blue-100` / `blue-600` |
| Pending (clock) | `amber-100` / `amber-600` |
| Shipped (ship) | `sky-100` / `sky-600` |
| In Transit (send) | `cyan-100` / `cyan-600` |
| Arrived / done (check) | `green-100` / `green-600` |
| Delayed / alert (triangle) | `red-100` / `red-600` |

### 2.4 CSS variables (drop into `app/globals.css`)

shadcn/ui themes through CSS variables — this is the bridge between the screenshots and the component library:

```css
:root {
  --background: 210 40% 96%;        /* canvas  #F1F5F9 */
  --foreground: 222 47% 11%;        /* text    #0F172A */
  --card: 0 0% 100%;
  --card-foreground: 222 47% 11%;
  --primary: 221 83% 53%;           /* brand   #2563EB */
  --primary-foreground: 0 0% 100%;
  --secondary: 210 40% 96%;
  --secondary-foreground: 222 47% 11%;
  --muted: 210 40% 96%;
  --muted-foreground: 215 16% 47%;  /* #64748B */
  --destructive: 0 72% 51%;         /* #DC2626 */
  --border: 214 32% 91%;            /* #E2E8F0 */
  --input: 214 32% 91%;
  --ring: 221 83% 53%;              /* focus ring = brand */
  --radius: 0.75rem;                /* 12px default radius */
}
```

---

## 3. Typography

| Role | Face | Size / weight | Notes |
|---|---|---|---|
| Font family | **Inter** (via `next/font`), fallback `system-ui, sans-serif` | — | One family everywhere; hierarchy comes from size + weight, not from mixing fonts |
| Page title | Inter | 30px / 800 (`text-3xl font-extrabold`) | "Dashboard", "Vehicles", "Settings" |
| Page subtitle | Inter | 16px / 400, `--text-secondary` | One sentence under the title |
| Card / section heading | Inter | 18px / 700 (`text-lg font-bold`) | "Vehicle Information", "Monthly Shipment Trends" |
| KPI number | Inter | 30px / 800 | Dark, tight leading |
| Body / table cell | Inter | 14px / 400–500 | Default UI size is 14px, not 16px |
| Table header, labels, badges | Inter | 12–13px / 500–600 | Table headers in `--text-secondary` |
| Timestamps, hints | Inter | 12px / 400, `--text-muted` | "10 min ago", "Tip: try …" |
| **Identifiers** | **JetBrains Mono / `font-mono`** | 13px / 500 | Chassis nos, serials (`FC1024`), container codes, code chips like `JT100000A` |

> **Mentor note — why mono for identifiers:** `JT100000A` in a proportional font is easy to misread (`0` vs `O`, `1` vs `l`). Monospace makes every character the same width and visually distinct — a small choice that prevents real-world data-entry errors at the auction hall. Wrap it once in a `<Code>`/`<Mono>` primitive so it's consistent.

---

## 4. Spacing, radius, elevation

| Token | Value | Where |
|---|---|---|
| Base spacing unit | 4px grid | Everything snaps to multiples of 4 |
| Card padding | 24px (`p-6`) | All cards |
| Card gap | 24px (`gap-6`) | Between cards in a grid |
| Page padding | 32px desktop (`p-8`), 16px mobile (`p-4`) | Content area |
| `--radius-sm` | 8px | Badges, small chips |
| `--radius-md` | 10–12px | Buttons, inputs, tabs |
| `--radius-lg` | 16px | Cards, table container, KPI cards |
| `--radius-full` | 9999px | Avatars, status pills, notification badge |
| Elevation | `border --border` + `shadow-sm` | Cards sit on the canvas with a border and a *very* soft shadow — never heavy drop shadows |
| Focus ring | 2px `--brand` at 40% opacity, offset 2px | Keyboard accessibility; shadcn gives this via `--ring` |

---

## 5. Layout

### 5.1 App shell (desktop ≥1024px)

```
┌──────────────┬────────────────────────────────────────────┐
│  SIDEBAR      │  TOP BAR  [search………]        ☾  🔔3  (A) admin │
│  260px, navy  ├────────────────────────────────────────────┤
│               │  CANVAS  (slate-100, p-8)                   │
│  ▪ logo tile  │   Page title (3xl/800)         [Primary btn]│
│  Dashboard    │   subtitle (slate-500)                      │
│  Vehicles     │   ┌─card─┐ ┌─card─┐ ┌─card─┐  gap-6         │
│  Add Vehicle  │   └──────┘ └──────┘ └──────┘                │
│  …            │   ┌──────────── table card ───────────────┐ │
│  Settings     │   └────────────────────────────────────────┘ │
│  ‹ Collapse   │                                             │
└──────────────┴────────────────────────────────────────────┘
```

- **Sidebar:** fixed 260px, `--sidebar` bg. Logo = blue rounded-xl tile + wordmark + small tagline. Nav item = icon (20px) + 14px/500 label, 10px radius; **active item is a full-width solid `--brand` pill with white text**; inactive is `--sidebar-fg` with subtle hover lighten. "Collapse" pinned to the bottom.
- **Top bar:** white, bottom border. Left: global search input (icon prefix, ~560px max). Right: theme toggle (moon), bell with red count badge, avatar (blue circle, white initial) + username.

### 5.2 Mobile (≤768px)

- Sidebar collapses to a **hamburger** in a slim white top bar (hamburger left; moon, bell, avatar right).
- Page padding drops to 16px; page actions (e.g. **Add User**) sit inline right of the title.
- KPI cards go **2-up grid**, then charts full-width stacked.
- Filters stack vertically inside their card (search, then each select full-width).
- Wide tables **scroll horizontally** inside their card (visible scrollbar affordance at the card's bottom edge) — columns are not dropped.
- Buttons and inputs go full-width in forms; touch targets ≥ 44px.

> **Mentor note:** the mobile screens are the *same components at a narrower width*, not separate designs. That's the contract behind the mobile-responsive add-on (US-42): build every component mobile-first with Tailwind's responsive prefixes (`grid-cols-2 lg:grid-cols-6`) instead of maintaining parallel layouts.

---

## 6. Component recipes

### 6.1 Buttons

| Variant | Recipe | Example |
|---|---|---|
| **Primary** | `--brand` bg, white 14px/600 text, radius-md, `px-4 h-10`, optional leading icon, hover `--brand-hover` | Sign in, Add Vehicle, Save Changes, Track Shipment |
| **Secondary / outline** | white bg, `--border` border, `--text` label, same metrics | Mark all as read, Upload Logo, Cancel |
| **Destructive (icon)** | red-500 icon button, red-100 hover bg | Row delete (trash) |
| **Icon button** | 40px square, transparent, slate-500 icon, hover slate-100 | Theme toggle, row actions (eye, pencil, power) |
| Full-width | mobile forms and auth (`w-full`) | Sign in, Track Shipment |

Buttons say what they do ("Save Changes", "Track Shipment") — never "Submit".

### 6.2 Inputs & forms

- **Input:** white bg, 1px `--border`, radius-md, `h-11`, 14px text, `--text-muted` placeholder, optional leading icon (mail, lock, search) in slate-400; focus = `--ring` ring, border turns brand.
- **Label:** 14px/600 `--text`, 6px above the field; **required** marked with a red `*` after the label.
- **Select:** same as input + trailing chevron.
- **Checkbox:** brand fill when checked, white check, radius-sm ("Remember me").
- **Password:** trailing eye toggle.
- **Form sections:** each logical group is its own card with an 18px/700 heading ("Vehicle Information", "Shipment Details"); two-column field grid on desktop, single column on mobile.
- **Upload dropzones:** dashed 1.5px `--border`, radius-lg, centered icon + 14px/600 title + 13px muted hint ("Multiple images supported"); sits in a card with its own heading (Documents, Vehicle Photos).
- **Tri-state toggle (new spec §2):** style as a 3-segment control matching the tabs recipe below — segments `—` / `Yes` / `No`, active segment white pill; never render blank as "No".

### 6.3 Badges & pills

- **Status pill:** radius-full, `px-2.5 py-0.5`, 12–13px/600, semantic pastel pair + 6px leading dot (recipe in §2.2).
- **Role badge:** neutral pair (`slate-100`/`slate-700`), no dot — roles are facts, not states.
- **Notification count:** red-500 circle, white 11px/700, absolutely positioned on the bell's top-right.
- **Trend chip (KPI):** no bg; ↗ + green-600 for positive, ↘ + red-600 for negative, 13px/600.
- **Code chip:** `font-mono` 12px on slate-100, radius-sm ("Tip: try `JT100000A`").

### 6.4 Cards

- **Base card:** white, radius-lg, `--border`, `shadow-sm`, `p-6`.
- **KPI card:** icon tile (top-left, §2.3) + trend chip (top-right) + number (30px/800) + label (14px slate-500). Desktop: 6-up row; mobile: 2-up grid.
- **Chart card:** heading + Recharts area/line (brand blue line, soft blue fill, green comparison line; dashed slate-200 gridlines, slate-400 axis labels) or donut with legend below (label left, count right).

### 6.5 Tables

- Wrapped in a card; **header row**: 13px/600 `--text-secondary`, sort arrows (⇅) on sortable columns.
- **Rows:** 14px, comfortable height (~56px), 1px `--border` divider, subtle slate-50 hover.
- Primary identifier column bold; chassis/serial in `font-mono`; two-line cells allowed (make bold / model muted).
- **Files column:** icon + count pairs (📄 3, 🖼 3) in slate-500.
- **Actions column:** right-aligned icon buttons — view (eye), edit (pencil), deactivate (power), delete (trash, red).
- **Row-colour engine (CD-D3-12):** row bg comes from the vehicle's row-colour status at low opacity (pastel), except **Transport Complete tints only the Transport By cell** — implement as a cell-level class hook, not row-level.
- Empty state: friendly icon + one sentence + the action that fixes it.

### 6.6 Tabs / segmented controls

Track: slate-100, radius-md, `p-1`. Segments: 14px/600 slate-500 with optional icon; **active segment = white pill, radius-sm, shadow-xs, `--text` label**. Used for notification filters (All / Unread / Shipment / Document / System), settings tabs (Company / Notifications / Statuses / Countries), and reuse it for the **FC / FL / All toggle** on the vehicle table.

### 6.7 Notifications list

- Row: icon tile (semantic pastel, §2.3) + title 15px/700 + body 14px slate-500 + timestamp 12px slate-400 + right-aligned "✓ Read" text button.
- **Unread:** row tinted `blue-50`, blue-500 dot after the title. Read rows are plain white — the tint difference *is* the unread indicator.
- Bell badge count, list, and tint all clear together (mark one / mark all).

### 6.8 Auth page

- **Desktop:** 50/50 split. Left: `--sidebar` navy brand panel — logo row top-left, big white headline ("Vehicle Shipping Management, simplified."), one-line slate-300 subtitle, a 3-stat row (value 24px/800 white, label 13px slate-400), tiny footer. Right: light panel, centered 480px form.
- **Mobile:** brand panel drops away; logo tile + heading + form stacked on the light bg.
- Form: heading 30px/800 → subtitle → email → password (eye toggle) → Remember me + "Forgot password?" link (brand, 600) → full-width primary Sign in → muted helper line.

### 6.9 Iconography

**lucide-react** throughout (matches shadcn/ui): 20px in nav/inputs, 16px in buttons/badges, 24px in icon tiles. Stroke width 2. One icon set only — mixing sets is the fastest way to make a UI feel unfinished.

---

## 7. Interaction & motion

- Transitions: 150ms ease on hover/focus color changes only. No entrance animations, no parallax — this is a workhorse tool.
- Hover: buttons darken one palette step; rows tint slate-50; icon buttons gain a soft bg.
- Focus: always visible (`--ring`) — staff tab through forms all day.
- Loading: skeleton blocks in slate-200 matching the final layout (cards, table rows), not spinners, for data-heavy views.
- Respect `prefers-reduced-motion`.

---

## 8. Voice & microcopy

- Sentence case everywhere except page titles.
- Subtitles state the page's job in one plain sentence ("Track a shipment by chassis or container number.").
- Buttons name the outcome ("Save Vehicle", "Mark all as read").
- Helper text is short and concrete ("Export cert, B/L, invoice…", "Tip: try `JT100000A`").
- Counts are stated plainly ("56 records found.", "3 unread alerts.", "6 team members.").
- Errors say what happened and how to fix it; empty states invite the next action.

---

## 9. Implementation checklist (Dev 3 → Dev 1 / Dev 2)

1. `globals.css` — paste the CSS variables (§2.4); load Inter + a mono face via `next/font`.
2. `tailwind.config.ts` — map `brand`, `sidebar`, `canvas` names; set default radius to 12px.
3. shadcn/ui — generate Button, Input, Select, Badge, Card, Tabs, Table, Dialog; restyle **once** at the component level to these recipes. Dev 1/Dev 2 import, never restyle.
4. Build the shared primitives that shadcn doesn't ship: `StatusBadge`, `KpiCard`, `IconTile`, `Mono`, `TriStateToggle`, `UploadDropzone`, `EmptyState`, `PageHeader` — these live with CD-D3-11…16.
5. Rule of thumb for reviews: **if a PR contains a raw hex code or a one-off `rounded-[13px]`, it gets flagged.** Everything visual goes through a token or a shared component.

> **Final mentor note:** a design system isn't finished when this file is written — it's finished when the *third* screen built with it required zero new visual decisions. If Dev 1 or Dev 2 hit something this file doesn't answer (a new badge color, a new layout pattern), the fix is to add it *here* first, then use it. The document stays the single source of truth, exactly like `lib/services/` is for business logic.