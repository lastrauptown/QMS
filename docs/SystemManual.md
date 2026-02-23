# Queue Management System — System Manual

## Overview
- Purpose: Manage citizen queues efficiently across services and counters.
- Audience: Counter Staff, Admins, IT support, and operators of public display.
- Mode: Counter Staff use the compact Controller window; Admins use dashboards.

## Quick Start (Windows)
- Prerequisites: Node.js 18+, MySQL Server
- Install dependencies: `npm install`
- Configure environment: create `.env` from `.env.example` and set `MYSQL_*` values
- Initialize database:
  - CLI: `mysql -u root -p qms < database/schema-mysql.sql`
  - Script: `node scripts/init-db.js`
- Verify DB: `node scripts/check-setup-mysql.js`
- Run dev: `npm run dev`
- Sign in:
  - Admin: `admin@sanpedro.com` / `admin123`
  - Create Counter Staff via Admin → Users, then sign in as staff

## Runtime Roles
- Admin: configure Services, Counters, Users; monitor queues; view stats.
- Counter Staff: operate tickets in the Controller window.
- Public: view the Display (TV mode) and generate tickets at the kiosk.

## Screens & Routes
- Login: [login/+page.svelte](file:///c:/Users/MIS/Desktop/QMS/src/routes/login/+page.svelte)
- Public Display: [display/+page.svelte](file:///c:/Users/MIS/Desktop/QMS/src/routes/display/+page.svelte)
- Ticket Kiosk/Landing: [src/routes/+page.svelte](file:///c:/Users/MIS/Desktop/QMS/src/routes/+page.svelte)
- Controller (Staff): [counter/controller/+page.svelte](file:///c:/Users/MIS/Desktop/QMS/src/routes/counter/controller/+page.svelte)
- Counter Dashboard (Admin): [counter/+page.svelte](file:///c:/Users/MIS/Desktop/QMS/src/routes/counter/+page.svelte)
- Admin Dashboard: [admin/+page.svelte](file:///c:/Users/MIS/Desktop/QMS/src/routes/admin/+page.svelte)

## Controller (Staff) Actions
- Call Next: pick first waiting ticket for the counter’s service.
- Recall: re-announce the currently called ticket.
- Complete Service: mark as served and clear counter display.
- Skip: mark as skipped and clear counter display.
- Transfer: move current ticket to another active counter (updates service_code).

## Architecture
- Frontend: SvelteKit + TypeScript
- Styling: TailwindCSS (forest-green theme)
- Backend: SvelteKit API routes + MySQL ([db.ts](file:///c:/Users/MIS/Desktop/QMS/src/lib/server/db.ts))
- State: Svelte stores ([queue.ts](file:///c:/Users/MIS/Desktop/QMS/src/lib/stores/queue.ts), [auth.ts](file:///c:/Users/MIS/Desktop/QMS/src/lib/stores/auth.ts))
- Realtime: Polling every ~2s for tickets/counters/services

### Key Stores
- Queue store: [queue.ts](file:///c:/Users/MIS/Desktop/QMS/src/lib/stores/queue.ts)
  - `fetchTickets`, `fetchCounters`, `fetchServices`
  - `callTicket`, `recallTicket`, `serveTicket`, `skipTicket`, `transferTicket`
  - `currentTickets` map: active called tickets per counter
  - Stats helpers: wait/service time averages, completion rate
- Auth store: [auth.ts](file:///c:/Users/MIS/Desktop/QMS/src/lib/stores/auth.ts)
  - `signIn`, `signOut`, `checkAuth`, `fetchUserProfile`
  - Persists `user`, `userProfile`, `access_token` to localStorage
  - Restores on app start from storage

### API Endpoints (MySQL)
- Tickets:
  - Create: [api/tickets/create/+server.ts](file:///c:/Users/MIS/Desktop/QMS/src/routes/api/tickets/create/+server.ts)
  - Recent: [api/tickets/recent/+server.ts](file:///c:/Users/MIS/Desktop/QMS/src/routes/api/tickets/recent/+server.ts)
  - Call: [api/tickets/call/+server.ts](file:///c:/Users/MIS/Desktop/QMS/src/routes/api/tickets/call/+server.ts)
  - Recall: [api/tickets/recall/+server.ts](file:///c:/Users/MIS/Desktop/QMS/src/routes/api/tickets/recall/+server.ts)
  - Serve: [api/tickets/serve/+server.ts](file:///c:/Users/MIS/Desktop/QMS/src/routes/api/tickets/serve/+server.ts)
  - Skip: [api/tickets/skip/+server.ts](file:///c:/Users/MIS/Desktop/QMS/src/routes/api/tickets/skip/+server.ts)
  - Transfer: [api/tickets/transfer/+server.ts](file:///c:/Users/MIS/Desktop/QMS/src/routes/api/tickets/transfer/+server.ts)
- Services:
  - List/Create: [api/services/+server.ts](file:///c:/Users/MIS/Desktop/QMS/src/routes/api/services/+server.ts)
  - Update/Delete: [api/services/[id]/+server.ts](file:///c:/Users/MIS/Desktop/QMS/src/routes/api/services/%5Bid%5D/+server.ts)
- Counters:
  - List/Create: [api/counters/+server.ts](file:///c:/Users/MIS/Desktop/QMS/src/routes/api/counters/+server.ts)
  - Update status: [api/counters/status/+server.ts](file:///c:/Users/MIS/Desktop/QMS/src/routes/api/counters/status/+server.ts) (if present)
- Users:
  - Create/List: [api/users/create/+server.ts](file:///c:/Users/MIS/Desktop/QMS/src/routes/api/users/create/+server.ts), [api/users/+server.ts](file:///c:/Users/MIS/Desktop/QMS/src/routes/api/users/+server.ts)
- Auth:
  - Login: [api/auth/login/+server.ts](file:///c:/Users/MIS/Desktop/QMS/src/routes/api/auth/login/+server.ts)
  - Profile: [api/auth/profile/+server.ts](file:///c:/Users/MIS/Desktop/QMS/src/routes/api/auth/profile/+server.ts)
- Debug:
  - DB check: [api/debug/+server.ts](file:///c:/Users/MIS/Desktop/QMS/src/routes/api/debug/+server.ts)

## Data Model (Simplified)
- Users: `id`, `email`, `password_hash`, `role`, `counter_id`, `name`
- Services: `id`, `code`, `name`, `description`, `is_active`
- Counters: `id`, `name`, `service_id`, `is_active`, `current_ticket`
- Tickets: `id`, `ticket_number`, `service_code`, `status`, `counter_id`,  
  `created_at`, `called_at`, `served_at`, `updated_at`

Ticket statuses:
- `waiting` → `called` → `served`
- or `waiting` → `called` → `skipped`
- Transfer: `called` → set to `waiting`, move to target counter/service

## Queue Logic
- Ticket creation:
  - Compute next number per service for today.
  - Insert as `waiting` with `ticket_number` like `PAY-001`.
- Next selection:
  - Filter `waiting` tickets by service_code of the active counter.
  - Sort by numeric ascending; pick first.
- Call:
  - Auto-serve any currently `called` ticket for this counter.
  - Set new ticket to `called`, assign `counter_id`, set `called_at`.
  - Update `counters.current_ticket`.
- Recall:
  - Only allowed for `called` tickets; updates `updated_at` to refresh views.
- Serve:
  - Set `served`, record `served_at`, clear `counters.current_ticket`.
- Skip:
  - Set `skipped`, clear `counters.current_ticket`.
- Transfer:
  - Set ticket to `waiting`, change `counter_id` and `service_code` to target.
  - Clear source counter’s `current_ticket`.

## Display & Filtering Rules
- Consider tickets from the current day only (prevents stale entries).
- Track one active `called` ticket per counter.
- Waiting order: first-come-first-serve within a service.
- Stats helpers compute aggregate metrics for today.

References:
- Filtering & active map: [queue.ts](file:///c:/Users/MIS/Desktop/QMS/src/lib/stores/queue.ts#L115-L139)
- Stats: [queue.ts](file:///c:/Users/MIS/Desktop/QMS/src/lib/stores/queue.ts#L279-L335)

## Realtime Model
- Polling:
  - `fetchTickets`, `fetchCounters`, `fetchServices` every ~2 seconds.
  - Initialized by `initializeRealtime()` on page mount.
  - Code: [queue.ts](file:///c:/Users/MIS/Desktop/QMS/src/lib/stores/queue.ts#L255-L276)

## Authentication & Session
- Login returns a session and user; profile is fetched separately.
- Persist `user`, `userProfile`, `access_token` in localStorage.
- `checkAuth()` restores session on refresh/new window.
- Controller reads `activeCounterId` and profile’s `counter_id`.
- Code: [auth.ts](file:///c:/Users/MIS/Desktop/QMS/src/lib/stores/auth.ts)
- Global restore on app load: [+layout.svelte](file:///c:/Users/MIS/Desktop/QMS/src/routes/+layout.svelte)

## Admin Procedures
- Create Services: [api/services/+server.ts](file:///c:/Users/MIS/Desktop/QMS/src/routes/api/services/+server.ts)
- Create Counters: [api/counters/+server.ts](file:///c:/Users/MIS/Desktop/QMS/src/routes/api/counters/+server.ts)
- Create Users: [api/users/create/+server.ts](file:///c:/Users/MIS/Desktop/QMS/src/routes/api/users/create/+server.ts)
- Toggle Counter Availability:
  - Via dashboard button (admin view) or API
  - Updates `is_active`

## Troubleshooting
- Backend connectivity: [api/debug/+server.ts](file:///c:/Users/MIS/Desktop/QMS/src/routes/api/debug/+server.ts)
- Check `.env` matches your MySQL instance.
- Verify schema load: `node scripts/check-setup-mysql.js`
- Common issues:
  - No tickets visible: ensure services and counters are active and polling is running.
  - Controller shows “No waiting tickets”: verify assigned counter/service and waiting queue.
  - Login bounce: ensure localStorage is intact; `checkAuth()` restores automatically.

## Printing This Manual
- Open this file in your IDE or browser and use Print → Save as PDF.
- Path: [docs/SystemManual.md](file:///c:/Users/MIS/Desktop/QMS/docs/SystemManual.md)

