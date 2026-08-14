# Final QA Report — Be-Nice Restaurant OS

**Read this before assuming anything is "done."** This report distinguishes two very different kinds of verification, and conflating them is exactly the mistake this document exists to prevent:

- **Code-verified**: I ran ESLint and the TypeScript compiler against every file. I traced logic by hand. This tells us the code is internally consistent, type-safe, and free of the class of bug those tools can catch.
- **Browser-verified**: someone opened a real browser, against a real running server, against a real PostgreSQL database, and clicked through the actual behavior.

**Everything in this sprint (Manager RBAC restrictions, Cashier role/dashboard, per-seat occupancy) is code-verified only. None of it is browser-verified yet.** I do not have access to a browser or your database from where I work — I never have, for anything in this entire project. Every feature that reached "browser-verified" status earlier in this build got there because you ran it and reported back, not because I did it myself. That hasn't changed, and I'm not going to imply otherwise here.

---

## What's code-verified in this delivery

### 1. Manager RBAC
- Fixed: `/api/settings` PATCH was incorrectly accepting Manager before this sprint — now Admin-only.
- Added: page-level redirect guards on `/admin/settings` and `/admin/menu` (Admin-only), on top of the API-level checks that are the actual security boundary.
- Added: `/admin/staff` now hides the "Add Staff" button and Accounts tab from Manager in the UI — the underlying account-management API (`/api/staff`, `/api/staff/[id]`) was *already* correctly Admin-only before this sprint; I verified that by reading it, not by rebuilding it.
- Fixed: `/api/analytics` was Admin-only; Manager is on the PRD's allowed list for Analytics, so I opened that up.
- Confirmed already-correct: `/api/reports`, `/api/activity`, `/api/staff/performance`, `/api/reviews` (reply/feature) all already allowed Admin+Manager from the previous sprint.
- **Not browser-tested**: I have not logged in as Manager and attempted to reach `/admin/settings` by typing the URL directly, nor attempted a direct `fetch()` to `/api/settings` with a Manager session token. The PRD specifically asks for this test — please do it.

### 2. Cashier role and dashboard
- New `/cashier` route, fully separate from Waitress (previously Cashier shared the Waitress dashboard — that's fixed).
- New order creation (Pickup or Dine-In with table selection), order lookup by ticket number, payment status/method updates, PDF receipt links, recent-orders list.
- Middleware updated so Cashier can only reach `/cashier`, not `/waitress`, `/kitchen`, `/bar`, or `/admin`.
- **Not browser-tested**: no Cashier account has been logged into and clicked through. No payment has actually been marked paid and reflected in a report. No receipt has actually been opened.

### 3. Per-seat table occupancy
- New `TableSeat` model — one row per seat, auto-created at table-creation time based on capacity (Table with capacity 4 gets 4 seats automatically, per your spec).
- New table-creation flow creates seats atomically with the table.
- Existing tables (created before this schema existed) get backfilled with seats via the extras seed script — this preserves your already-tested tables rather than requiring you to delete and recreate them.
- Waitress dashboard: each table card now shows a row of numbered seat toggles; tapping one flips Available ⇄ Occupied.
- Admin dashboard: each table card shows a colored-dot seat readout (⚪ available, 🟢 occupied).
- Seat changes: publish the same `TABLE_UPDATED` SSE event tables already used, write an `AuditLog` entry (`SEAT_AVAILABLE`/`SEAT_OCCUPIED`) recording which staff member and when, and fire an in-app notification to Admin.
- **Not browser-tested**: nobody has tapped a seat toggle and watched Admin's notification bell fire, nor confirmed the Activity Center actually shows "Grace marked Table 1 Seat 3 available — 10:42 AM" in that exact format.

### Bug found and fixed *during this sprint's own verification* (not requested, but real)
- `/api/upload` required an Admin session for *all* uploads — including the review photo-upload feature built two sprints ago. Since customers submitting reviews have no session at all, every review photo attempt would have silently 403'd. Fixed by adding a `context=review` flag that the review form now sends, allowing that one specific anonymous case while keeping every other upload path (menu photos, hero image) Admin-only. This is exactly the kind of bug that code review can catch but that only surfaces in browser testing when you actually try to attach a photo — worth flagging that this was found by re-reading old code, not by testing.

---

## What's still explicitly not done (carried over, unchanged)

- Per-seat capacity currently mirrors the table's `capacity` field at creation time. If you change a table's capacity *after* creation, seats are not automatically added/removed to match — that would need a small follow-up.
- No email notifications anywhere (confirmed out of scope per your later PRD).
- Cashier cannot be prevented from advancing an order's Kitchen/Bar status via the generic order-status API today — I didn't find that explicitly forbidden in the spec's Cashier restrictions, but flagging it since it's a gray area, not a considered decision.

---

## Build status

- `npx eslint src prisma`: **0 errors, 0 warnings** (full codebase, every file, including everything added this sprint).
- `npx tsc --noEmit`: **0 real errors.** The only remaining output is the same category of noise we've seen since the very first sprint — types that resolve to `{}`/`any` because the Prisma Client can't be generated in my sandbox (its binaries live behind a domain I can't reach). This has never once indicated a real bug in this project; it clears itself the moment you run `npx prisma generate` on your machine.
- `npm run build` (production build): **not run.** I don't have a database connection or working Prisma Client here to build against — this needs to happen on your machine. If it fails, send me the exact output and we'll fix it together.
- Database migration: **not run.** Schema changed again this sprint (`TableSeat` model, new `Notification` types, seat-related fields). You'll need `npx prisma migrate dev --name manager_cashier_seats` before anything in this sprint will work.

## Test accounts (unchanged from last sprint, plus none new this time — Cashier needs an account created)

No Cashier account is seeded yet. Create one from **Admin → Staff → + Add Staff**, role "Cashier" — or tell me and I'll add one to the seed script next round.

## Suggested QA order for this specific batch

1. `npx prisma generate && npx prisma migrate dev --name manager_cashier_seats`
2. `npm run db:seed:extras` (backfills seats onto your existing 8 tables)
3. `npm run build` — does it succeed at all? This is the first real signal.
4. Log in as Manager → try to load `/admin/settings` directly by URL → should redirect. Try `/admin/menu` → should redirect.
5. While logged in as Manager, open DevTools and try `fetch('/api/settings?restaurantId=...', {method:'PATCH', ...})` — should 403 regardless of what the UI shows.
6. Create a Cashier account, log in, create a pickup order, mark it paid, print the receipt.
7. Log in as Waitress, go to Tables tab, tap a few seat numbers on one table, confirm they flip color.
8. Log in as Admin in a second tab, confirm the seat change shows up live (no refresh) and check the notification bell.
9. Check Activity Center for the seat-change entry with the correct staff name and timestamp.
