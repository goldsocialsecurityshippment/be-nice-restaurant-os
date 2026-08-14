# Coratech Restaurant OS
### First implementation: Be-Nice Catering Services Digital Restaurant System

A full customer-ordering-and-workflow platform connecting **Customer → Kitchen → Waitress → Owner**, built with Next.js 15, TypeScript, Tailwind CSS, Prisma, and PostgreSQL.

---

## What's included

- **Customer site** — homepage, digital menu, online ordering (pickup or dine-in), QR table ordering, live order tracking, post-order reviews.
- **QR table ordering** — every table gets a unique, unguessable QR code. Scanning it opens the menu pre-linked to that table; placing an order sends it straight to the kitchen.
- **Kitchen dashboard** — real-time order queue (New → Preparing → Ready), no polling, no refresh button.
- **Waitress dashboard** — ready-to-serve queue, table status grid (flag "needs attention"), and a manual order entry screen for walk-ins.
- **Admin dashboard** — sales overview with charts, full order log with filters, menu CRUD (with Cloudinary photo upload), table & QR code management (view/print), staff account management, analytics (top sellers, busy hours, sales trend), and system settings.
- **Real-time updates** via Server-Sent Events (`/api/events`) — kitchen and waitress screens update instantly when an order is placed or its status changes.
- **Role-based auth** (NextAuth v5, credentials provider) with middleware protecting `/admin`, `/kitchen`, and `/waitress`.

---

## 1. Prerequisites

- Node.js 20+
- A PostgreSQL database (local, Neon, Supabase, or Render Postgres all work well)
- A free Cloudinary account (optional at first — menu items look fine with the on-brand placeholder until you add real photos)

## 2. Install

```bash
npm install
```

## 3. Configure environment

Copy `.env.example` to `.env` and fill in real values:

```bash
cp .env.example .env
```

| Variable | Notes |
|---|---|
| `DATABASE_URL` | Your PostgreSQL connection string |
| `NEXTAUTH_URL` | `http://localhost:3000` locally, your real domain in production |
| `NEXTAUTH_SECRET` | Generate with `openssl rand -base64 32` |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | From your Cloudinary dashboard — needed for the admin "upload a photo" button |
| `NEXT_PUBLIC_APP_URL` | Used to build the QR code target URLs — must be reachable by whoever scans the code |
| `NEXT_PUBLIC_RESTAURANT_SLUG` | Leave as `be-nice` unless you rename the seeded restaurant |

## 4. Set up the database

```bash
npx prisma generate
npx prisma migrate dev --name init
npm run db:seed
```

> **Note on this delivery:** this project was built in a sandboxed environment that could not reach Prisma's engine-binary server or run a live Postgres instance, so `prisma generate`/`migrate` could not be executed here. The schema, API routes, and seed script are written and reviewed by hand and are Prisma 5-compatible — the three commands above are the only ones you need to run once you have real network + database access (any normal machine or CI will work fine).

The seed script creates:
- The Be-Nice restaurant record, branding colors, and default settings
- Three staff logins (change these passwords immediately after first login):

  | Role | Email | Password |
  |---|---|---|
  | Admin | admin@benice.com | Admin@2026 |
  | Kitchen | kitchen@benice.com | Kitchen@2026 |
  | Waitress | waitress@benice.com | Waitress@2026 |

- The full menu from the PRD (Weekend Local Foods, Proteins, Soups, Weekly Lunch Menu, Jollof Pan Packages, Chops Boxes)
- 8 tables, each with a generated QR code
- 3 sample reviews

## 5. Run it

```bash
npm run dev
```

- Customer site: http://localhost:3000
- Staff login: http://localhost:3000/login
- Kitchen: http://localhost:3000/kitchen
- Waitress: http://localhost:3000/waitress
- Admin: http://localhost:3000/admin

Scan a table's QR code (from **Admin → Tables & QR**) with your phone, on the same network as your dev server (or after deploying), to test the full ordering flow end-to-end.

---

## Architecture notes

- **Real-time**: `/api/events` is a Server-Sent Events stream. `src/lib/events.ts` is a small in-process pub/sub — any API route that changes an order calls `publishEvent(...)`, and every open dashboard connection receives it instantly via `useOrderEvents`. This works out of the box for a single-server deployment. If you later scale to multiple server instances/regions, swap `src/lib/events.ts` for a shared backend (Redis Pub/Sub, Postgres LISTEN/NOTIFY, Pusher, or Ably) — the publish/subscribe interface is intentionally small so that's a one-file change.
- **Order numbers** are generated atomically per-restaurant (BN-000123 style) via `Settings.nextOrderSeq`.
- **Price integrity**: the server always re-reads menu item prices from the database when an order is created — the client cart cannot influence what's actually charged.
- **Status transitions** are validated server-side (`src/app/api/orders/[id]/route.ts`) so, e.g., an order can't jump from "Received" straight to "Served".
- **Multi-tenant-ready**: every model is scoped by `restaurantId`, and the app resolves "the current restaurant" by slug (`NEXT_PUBLIC_RESTAURANT_SLUG`). Reusing this for a second restaurant is mostly a matter of seeding a new `Restaurant` row and pointing a subdomain/env var at its slug — per the PRD's future-vision section.

## Deployment

Any platform that runs Next.js works (Vercel, Render, Railway, a VPS). Remember to:
1. Set all env vars from `.env.example` in your host's dashboard.
2. Run `npx prisma migrate deploy` (not `migrate dev`) as part of your build/release step.
3. Run `npm run db:seed` once, the first time, against your production database.
4. Point `NEXT_PUBLIC_APP_URL` at your real domain **before** generating/printing table QR codes — the QR image bakes in the URL at creation time. If you change the domain later, just delete and recreate the tables in **Admin → Tables & QR**.

## What's intentionally out of scope for this MVP (per the PRD)

Inventory system, payroll, employee attendance, loyalty points, AI chatbot, accounting, mobile money payment, delivery tracking, multi-branch management, advanced AI analytics — all listed in the PRD as future versions, not MVP.
