# Final Development Sprint — What Changed

This documents everything added since the original delivery + the "final sprint" PRD, on top of what you'd already verified locally (Kitchen/Bar/Waitress dashboards, Help Requests, Stations, basic Reviews).

## ⚠️ Before you do anything else

This project's schema changed significantly (new roles, Notification model, expanded Review model, new Order/OrderItem fields). You **must** re-run migration + regenerate the client:

```powershell
npx prisma generate
npx prisma migrate dev --name final_sprint
npm install
```

`npm install` is needed because `pdf-lib` was added as a new dependency (for PDF receipts).

Then seed the extra data:
```powershell
npm run db:seed:extras
```
(Safe to run even if you already ran the old standalone `seed-stations-drinks.ts`/`seed-bar-staff.ts` scripts during earlier testing — everything here is an upsert or has a duplicate-check.)

## New staff logins seeded

| Role | Email | Password |
|---|---|---|
| Admin | admin@benice.com | Admin@2026 |
| Manager | manager@benice.com | Manager@2026 |
| Kitchen (shared/demo) | kitchen@benice.com | Kitchen@2026 |
| Kitchen — David Asare | kitchen.david@benice.com | David@2026 |
| Bar (shared/demo) | bar@benice.com | Bar@2026 |
| Bar — John Boateng | bar.john@benice.com | John@2026 |
| Waitress (shared/demo) | waitress@benice.com | Waitress@2026 |
| Waitress — Grace Owusu | waitress.grace@benice.com | Grace@2026 |
| Waitress — Abena Mensah | waitress.abena@benice.com | Abena@2026 |

Manager and Cashier can both log in — Manager lands on `/admin` (same access as Admin for now, since granular permission tiers within Admin aren't split out yet — see "Known gaps" below), Cashier lands on `/waitress`.

## What's new in this sprint

- **RBAC**: `MANAGER` and `CASHIER` roles added. Middleware updated so `/admin` accepts Admin+Manager, `/waitress` accepts Waitress+Cashier.
- **Staff accountability**: every order/item status change, help-request resolution, and table status change now writes an `AuditLog` row with the acting staff member.
- **Activity Center** (`/admin/activity`): filterable log of everything above, by event type and date range.
- **Staff Performance dashboard** (`/admin/staff` → Performance tab): orders created/accepted/served, items prepared, help requests handled, per staff member.
- **In-app notifications**: a bell icon (top-right of every staff dashboard) with unread count, live via SSE, mark-all-read, and clear-all. Fires on new orders, help requests, cancellations, table occupied/available. No email is sent — this is in-app only, per the updated spec.
- **Order cancellation**: customers can cancel from the tracking page only while status is `RECEIVED`. Staff can cancel at any stage. Cancelled orders vanish from Kitchen/Bar/Waitress active queues automatically (they're simply excluded from the active-status filter) but remain visible in Admin → Orders → Cancelled tab.
- **Table occupancy**: Waitress can tap "Mark Available" on any occupied table; Admin gets a live notification either way (occupied or available).
- **Dine-in/Pickup fix**: this was a real bug — order `type` used to be silently inferred from whether a table happened to be attached, so a walk-in customer choosing "Dine In" before being seated got quietly treated as Pickup. The customer menu and the waitress manual-order screen now both require an explicit choice, and the server takes that value as-is.
- **Professional ticket numbers**: format changed to `BN-20260805-000125` (date-stamped). A new **Order Confirmation** screen appears right after checkout with the ticket number, a "save/screenshot this" reminder, estimated wait, and a Track Order button.
- **Reviews overhaul**: food/service/wait-time/friendliness sub-ratings, optional photo upload (via Cloudinary), one review per completed order (enforced server-side), admin reply, "Feature" toggle, search, and a rating-distribution bar chart in Admin → Reviews.
- **Reporting & Analytics** (`/admin/reports`): daily/weekly/monthly/yearly/custom ranges, revenue/orders/AOV, per-category sales breakdown with percentages, best/worst/most-profitable items, sales trend chart, busiest weekday chart, peak ordering hour, and a print-friendly layout.
- **PDF receipts**: every order has a "PDF" link (Admin → Orders) and a "Download Receipt" link (customer tracking page, once served) that streams a generated receipt.
- **Hero section**: added the QR-ordering call-to-action and weekend-hours banner to the existing layout (not redesigned, per the spec). Admin → Settings now has a hero-image upload — swap in real photography anytime without touching code.
- **Cloudinary**: fully wired using your credentials. Used for menu photos, review photos, and the hero image.
- **Mobile responsiveness pass**: Waitress dashboard (highest priority per spec) got a real pass — larger touch targets, horizontally-scrollable tab bar, responsive grids. Admin got a slide-out mobile nav with a top bar (previously the sidebar was desktop-only with no mobile navigation at all — that was a real gap, now fixed). Kitchen/Bar dashboards already used responsive grids from the original build.

## Known gaps — please read before testing

I want to be upfront about what's *not* fully done, rather than let you discover it mid-QA:

- **Manager role is not yet permission-restricted from Admin.** The PRD asks for "Manager: operational management with restricted access to critical settings" — right now Manager has identical access to Admin. Splitting this out (e.g., blocking Manager from Settings or Staff management) is straightforward but wasn't done yet.
- **Cashier role exists but has no dedicated UI.** It currently lands on the Waitress dashboard. A proper Cashier-specific "Orders + Payments only" view wasn't built.
- **"Table X Seat Y Available" (per-seat tracking)** — I implemented table-level occupancy only (Available/Occupied), not individual numbered seats within a table, since that's a genuinely new data concept (seats as their own entities) that wasn't confirmed with you before I built this batch. Table-level "Mark Available" is done and tested-by-construction; seat-level is not.
- **This whole batch has not been through the machine-in-hand verification cycle** we used for everything earlier in this build. I've verified: schema self-consistency, a full ESLint pass (zero errors/warnings), and a full TypeScript check (zero real errors — the only remaining `tsc` noise is the expected "Prisma Client not generated in this sandbox" artifact that resolves itself the moment you run `prisma generate`). What I have **not** done: click through any of this in a real browser against a real database, because that requires your machine. Please treat this delivery as "ready for QA," not "QA complete."
- **Production build** (`npm run build`) hasn't been run anywhere — please run it on your machine after migrating, and send me the output if it fails.

## Suggested QA order

Given the scope, I'd suggest testing in this order so failures are easy to isolate:
1. `npx prisma generate && npx prisma migrate dev --name final_sprint && npm install && npm run db:seed:extras`
2. `npm run build` — does production build succeed at all?
3. `npm run dev` — log in as each role, confirm correct landing dashboard
4. Place a mixed food+drink order via QR, confirm the new ticket/confirmation screen, then Track Order
5. Cancel an order before it's accepted (customer side) — confirm it vanishes from Kitchen
6. Full order lifecycle: Kitchen accept → prepare → ready, Bar prepare → ready, Waitress serve, leave a full review with sub-ratings
7. Admin: check Reports (all 5 range options), Activity Center, Staff Performance, Reviews (search/reply/feature), notification bell
8. Waitress: mark a table available, confirm Admin's bell fires
9. Download a PDF receipt from both customer tracking and Admin → Orders
10. Resize the browser down to phone width and re-check Waitress + Admin
