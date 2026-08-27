# Mobile API Reference (`/api/v1`)

Read-only HTTP API for a future mobile client. Every endpoint below wraps an
existing `lib/services/*` function — no business logic lives in the route
handlers themselves (CLAUDE.md rule 2).

Status: built ahead of any committed user story (see CLAUDE.md's Phase 2
flagging rule) — the only spec anchor for this work was the architecture
note in `docs/technical-documentation.md` §11 anticipating a JWT-bearer
mobile API. Confirm scope/timing with the team before shipping a client
against it if Phase 1 deadline pressure shows up.

## Base URL

`https://<deployment-host>/api/v1` (or `http://localhost:3000/api/v1` in dev).

## Authentication

Staff only (all roles, including Viewer) — customers cannot use this API;
they remain web-only per CLAUDE.md (a Phase 2 customer portal is a separate,
unrelated effort).

Bearer-token flow with two token types:

- **Access token** — signed JWT, **20 minute** lifetime. Send as
  `Authorization: Bearer <accessToken>` on every request below except the
  three auth endpoints themselves.
- **Refresh token** — opaque string, **30 day** lifetime, single-use
  (rotated on every refresh: the old one stops working the moment a new one
  is issued). Store it securely on-device; use it only to call `/auth/refresh`.

### `POST /api/v1/auth/login`

No bearer token required.

Request body:
```json
{ "email": "user@example.com", "password": "..." }
```

Response `200`:
```json
{
  "data": {
    "accessToken": "eyJ...",
    "accessTokenExpiresIn": 1200,
    "refreshToken": "9OK8TZZy...",
    "refreshTokenExpiresAt": "2026-09-19T06:33:48.499Z",
    "user": { "id": "...", "name": "...", "email": "...", "role": "ADMINISTRATOR", "orgId": "..." }
  }
}
```

Errors: `400 VALIDATION` (bad shape or wrong credentials), `403 FORBIDDEN`
(account locked — 5 failed attempts locks it for 15 minutes; this throttle
is shared with the web login).

### `POST /api/v1/auth/refresh`

No bearer token required — the refresh token itself proves ownership.

Request body: `{ "refreshToken": "..." }`

Response `200`: same shape as login (a **new** access+refresh pair; the
refresh token you sent is now revoked — use the new one next time).

Errors: `403 FORBIDDEN` ("Session expired. Please sign in again.") if the
token is unknown, expired, already used/revoked, or the account has since
been deactivated.

### `POST /api/v1/auth/logout`

Request body: `{ "refreshToken": "..." }`

Response `200`: `{ "data": { "loggedOut": true } }`. Idempotent — logging
out an already-revoked or unknown token still returns success.

### Session invalidation

A refresh token (and the mobile session it represents) is force-revoked
when: the account is deactivated by an admin, or the account's password is
changed (by the user or an admin). The next `/auth/refresh` call after
either event returns `403 FORBIDDEN`.

## Response envelope

Every endpoint responds with one of:

```json
{ "data": <payload> }
```
```json
{ "error": { "code": "VALIDATION", "message": "...", "fieldErrors": { "field": "..." } } }
```

`fieldErrors` is only present on `VALIDATION` errors from a bad request body
or query string.

| HTTP status | `error.code`      | Meaning |
|---|---|---|
| 400 | `VALIDATION`     | Bad request body or query params |
| 401 | `UNAUTHENTICATED` | Missing, malformed, or expired access token |
| 403 | `FORBIDDEN`      | Valid token, but role doesn't allow this endpoint (or a login lockout) |
| 404 | `NOT_FOUND`      | Resource doesn't exist, or belongs to a different org (never distinguished — same 404 either way) |
| 409 | `CONFLICT`       | Reserved for future write endpoints; unused by anything read-only |
| 500 | `INTERNAL`       | Unexpected server error |

All responses carry `Cache-Control: no-store` — never cache a response from
this API, client-side or otherwise.

## Vehicles

All require any authenticated staff role.

### `GET /api/v1/vehicles`

Paginated, filtered vehicle list. Every query param is optional; invalid
values return `400 VALIDATION` (unlike the web filter bar, which silently
falls back to defaults — this is a machine-consumed API, so a bad filter
value is treated as a client bug worth surfacing).

| Param | Type | Default | Notes |
|---|---|---|---|
| `page` | int ≥ 1 | 1 | |
| `pageSize` | int, 1–100 | 50 | Client-controlled (the web UI always uses 50) |
| `track` | `FC`\|`FL`\|`ALL` | `FC` | |
| `q` | string | `""` | Free-text search |
| `status` | repeatable: `PENDING`\|`BOOKING_RECEIVED`\|`SHIPPED`\|`CANCELLED` | `[]` (no filter) | e.g. `?status=PENDING&status=SHIPPED` |
| `destination`, `customer`, `rowColour`, `rowColourNot`, `brand`, `model`, `grade`, `hall`, `agent`, `packingAgent`, `location`, `transport` | id string or `ALL` | `ALL` | Lookup ids from the corresponding `/lookups/*` endpoint |
| `method` | `RORO`\|`CONTAINER`\|`ALL` | `ALL` | |
| `billPaid`, `logBook`, `extraKey` | `ALL`\|`YES`\|`NO`\|`BLANK` | `ALL` | Tri-state filters — `BLANK` means "field is null (not entered)" |
| `sort` | `serial`\|`chassisNo`\|`model`\|`yom`\|`shipmentStatus`\|`purchaseDate`\|`etd`\|`eta`\|`destination`\|`docsArrivedDate`\|`nameChangeDeadline`\|`massoDate`\|`docSentDate`\|`recycleDate` | `serial` | |
| `dir` | `asc`\|`desc` | `desc` | |

Response `data`: `{ rows: VehicleListRow[], total, page, pageSize, totalPages }`.

### `GET /api/v1/vehicles/destinations`

Distinct destination country list (for a filter dropdown). Response `data`: `string[]`.

### `GET /api/v1/vehicles/:serial`

Full vehicle detail. `:serial` is the human-readable serial (e.g. `FC1024`),
not the internal id. `404` if it doesn't exist in your org.

### `GET /api/v1/vehicles/:serial/status-history`

Chronological shipment-status transitions (who/what triggered each one).
Always empty for FL vehicles — shipment status isn't tracked for FL at all.

### `GET /api/v1/vehicles/:serial/files`

`{ auctionSheetUrl: string | null, photos: [...], documents: [...] }` — plain
public R2 URLs (not presigned). **Prefer this over `/pdf-images`** for a
client that just needs to display files.

### `GET /api/v1/vehicles/:serial/pdf-images`

Auction sheet + every photo inlined as base64 data URLs — can be several MB
per vehicle. Exists for parity with the web app's PDF export only.

## Customers

All require any authenticated staff role.

- `GET /api/v1/customers?q=` — full customer list (with `vehicleCount`), optionally filtered by name/email/phone.
- `GET /api/v1/customers/search?q=` — lightweight `{id, name}` results, for a combobox.
- `GET /api/v1/customers/:id` — single customer's `{id, name}`. `404` if not found.

## Lookups

All require any authenticated staff role. Every `search` endpoint takes an
optional `?q=` and returns up to 20 matches; every `:id` endpoint returns
`404 NOT_FOUND` if the id doesn't exist in your org.

| Resource | List/search | By id |
|---|---|---|
| Brand | `GET /lookups/brands?q=` | `GET /lookups/brands/:id` |
| Model (scoped to a brand) | `GET /lookups/models?brandId=&q=` (`brandId` required) | `GET /lookups/models/:id` |
| Grade (scoped to a model) | `GET /lookups/grades?modelId=&q=` (`modelId` required) | `GET /lookups/grades/:id` |
| Auction Hall | `GET /lookups/auction-halls?q=` | `GET /lookups/auction-halls/:id` |
| Transport Company | `GET /lookups/transport-companies?q=` | `GET /lookups/transport-companies/:id` |
| Packing Agent | `GET /lookups/packing-agents?q=` | `GET /lookups/packing-agents/:id` |
| Vehicle Location | `GET /lookups/vehicle-locations?q=` | `GET /lookups/vehicle-locations/:id` |
| Freight Agent | `GET /lookups/freight-agents` (full list, with `offersRoro`/`offersContainer`) and `GET /lookups/freight-agents/search?q=&method=RORO\|CONTAINER` | `GET /lookups/freight-agents/:id` |
| Row Colour Status | `GET /lookups/row-colour-statuses` (full list only, no search) | — |

## Reports

All require any authenticated staff role. `track` is `FC` or `FL` (no `ALL`
option — unlike the vehicle list filter, defaults to `FC`).

- `GET /api/v1/reports/by-customer?track=`
- `GET /api/v1/reports/by-auction-hall?track=`
- `GET /api/v1/reports/by-destination?track=`
- `GET /api/v1/reports/by-freight-agent` — no `track` param, this report is FC-only by definition.

## Dashboard

All require any authenticated staff role. No query params.

- `GET /api/v1/dashboard/stats` — KPI cards + category breakdowns.
- `GET /api/v1/dashboard/trends` — monthly trend series (bookings vs arrivals, vehicles entered, cumulative growth, docs turnaround).

## Notifications

All require any authenticated staff role. Always scoped to the calling
user — you only ever see your own notifications, never another staff
member's.

- `GET /api/v1/notifications?limit=` — `limit` is 1–100, default 50.
- `GET /api/v1/notifications/unread-count` — `{ count: number }`.
- `POST /api/v1/notifications/:id/read` — marks one notification read. Idempotent — an already-read id, or one that doesn't belong to you, just no-ops (`{ read: true }` either way, never a 404 — same "don't leak what exists" reasoning as everywhere else).
- `POST /api/v1/notifications/read-all` — marks every unread notification read for the calling user.

Mirrors the web app's Notifications page exactly: list, unread count, mark
one read, mark all read. The web page's real-time delivery (Pusher) and
click-through-to-vehicle behavior are both client-side concerns — for
mobile, real-time delivery is push notifications (device registration,
tracked separately) rather than a live socket subscription, and
click-through just means navigating to `GET /vehicles/:serial` using the
notification's `vehicleSerial` field.

## Push notifications (device tokens)

Any authenticated staff role. Registers this device to receive OS-level
push for the events listed above, delivered via Expo. `userId`/`orgId`
always come from your access token — never send them in the body.

- `POST /api/v1/device-tokens` — register or refresh this device's Expo
  push token. Call it once after login, and again whenever the app starts
  (Expo tokens can rotate). Body: `{ "expoPushToken": "ExponentPushToken[...]", "platform": "ios" | "android" }`.
  Re-registering the same `expoPushToken` under a different signed-in user
  (shared device, reinstalled app) reassigns it — the previous owner stops
  getting push to that device. `400 VALIDATION` if the token isn't
  recognized as a real Expo push token.
- `DELETE /api/v1/device-tokens` — unregister a token, e.g. on sign-out so
  a logged-out device stops receiving push. Body: `{ "expoPushToken": "..." }`.
  Idempotent — an unknown or already-removed token still returns
  `{ "unregistered": true }`.

**Before wiring this up on the mobile side**: as of Expo SDK 53, remote
push does not work inside Expo Go — you need a development build
(`expo-dev-client`) to test it at all, on either platform. Push also isn't
reliable in the iOS Simulator; test on a physical iPhone.

## Profile

- `GET /api/v1/profile` — the calling user's own profile. Any authenticated staff role.

## Staff

- `GET /api/v1/staff?q=` — **Administrator or Manager only** (matches the web Users page's real access gate). `403 FORBIDDEN` for Operator/Viewer tokens.

## Organization

- `GET /api/v1/organization` — `{ name: string }`. Any authenticated staff role.

## Activity Log

- `GET /api/v1/activity-log` — **Administrator only**. `403 FORBIDDEN` for every other role.

| Param | Type | Notes |
|---|---|---|
| `page`, `pageSize` | int | Same defaults as the vehicle list (1 / 50, max pageSize 100) |
| `entity`, `entityId`, `actorId`, `action` | string | Exact-match filters, all optional |
| `dateFrom`, `dateTo` | `YYYY-MM-DD` | Inclusive range on `createdAt`, both optional |

Response `data`: `{ rows: [{id, actorId, actorName, action, entity, entityId, before, after, createdAt}], total, page, pageSize, totalPages }`.

## Field notes

- **Tri-state fields** (`auctionBillPaid`, `logBook`, `extraKey` on vehicle
  responses): always `true`, `false`, or `null`. `null` means "not entered
  yet" — never coerce it to `false` on the client, they mean different
  things (CLAUDE.md tri-state rule).
- **Dates** are ISO 8601 strings in every response.
- **`org_id`** is never a request parameter anywhere in this API — it's
  always derived from your access token. There is no way to query another
  org's data even by guessing an id (you'll get `404`, not `403`, so
  existence is never leaked either).
