# Queue Management System (QMS)

A production-ready Queueing Management System built with SvelteKit and TypeScript. Features a green-themed UI designed for public offices and LGUs.

## Features

- **Public Display (TV Mode)**: Real-time queue display with sound notifications
- **Counter Interface**: Staff dashboard for managing queues
- **Admin Dashboard**: Full CRUD operations, analytics, and user management
- **Real-time Updates**: Live synchronization (polling-based) across all devices
- **Sound System**: Audio notifications when tickets are called
- **Role-based Access**: Admin, Counter Staff, and Public roles

## Application Links (Local)

- Kiosk / Landing: http://localhost:5173/
- Login: http://localhost:5173/login
- Admin Dashboard: http://localhost:5173/admin
- Public Display (TV): http://localhost:5173/display
- Counter Controller: http://localhost:5173/counter/controller
- Counter Dashboard (admin view): http://localhost:5173/counter

## Tech Stack

- **Frontend**: SvelteKit + TypeScript
- **Styling**: TailwindCSS with custom green theme
- **Backend**: MySQL (via API routes)
- **State Management**: Svelte Stores
- **Authentication**: Session-based (Database stored)

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up MySQL Database

1. Install MySQL Server (if not already installed).
2. Create a new database named `qms` (or any name you prefer).
3. Run the schema script `database/schema-mysql.sql` in your MySQL client to create tables and initial data.

```bash
# Example using mysql command line
mysql -u root -p qms < database/schema-mysql.sql
```

### 3. Configure Environment Variables

Create a `.env` file in the root directory with your MySQL credentials:

```env
# Database Configuration
MYSQL_HOST=localhost
MYSQL_USER=root
MYSQL_PASSWORD=your_password
MYSQL_DATABASE=qms
MYSQL_CONNECTION_LIMIT=10

# Security (JWT Secret for sessions - change this!)
JWT_SECRET=change-this-to-a-secure-random-string
```

### 4. Run Development Server

```bash
npm run dev
```

Visit `http://localhost:5173` to see the application.

## Default Credentials

- **Admin Login**:
  - Email: `admin@sanpedro.com`
  - Password: `admin123`

## Project Structure

```
src/
├── lib/
│   ├── server/
│   │   └── db.ts        # MySQL connection pool
│   ├── stores/
│   │   ├── auth.ts      # Authentication store
│   │   ├── queue.ts     # Queue management store
│   │   └── sound.ts     # Sound system
├── routes/
│   ├── api/             # Backend API endpoints
│   ├── +page.svelte     # Ticket Kiosk / Landing
│   ├── login/           # Login page
│   ├── display/         # Public TV display
│   ├── counter/         # Counter staff dashboard
│   ├── admin/           # Admin dashboard
│   └── help/            # Help page
└── app.css              # Global styles
```

## User Roles

- **Admin**: Full system access, CRUD operations, analytics
- **Counter Staff**: Manage queues, call tickets, serve customers
- **Public**: View-only access to display screen

## Ticket Format

Tickets follow the format: `<ServiceCode>-<Number>`
- Example: `S1-005` (Service 1, ticket number 5)

## Deployment

### Build for Production

```bash
npm run build
```

### Deploy to Node.js Server

1. Build the project.
2. Set environment variables on the server.
3. Run the built application using `node`.

```bash
node build/index.js
```

## Customization

### Theme Colors

Edit `tailwind.config.js` to customize the green theme:

```js
colors: {
  'forest-green': {
    DEFAULT: '#075E25', // Your custom green
    // ... other shades
  }
}
```

### Sound Settings

Modify `src/lib/stores/sound.ts` to adjust:
- Sound frequency
- Volume
- Sound pattern

## Support

For issues:
1. Check browser console for errors
2. Check server logs
3. Verify database connection in `.env`

---

## Controller-Only Mode for Counter Staff

- Counter Staff accounts automatically use the compact Controller view instead of the full dashboard.
- Visiting `/counter` redirects to `/counter/controller` for Counter Staff.
- Admins access `/admin` and can still open the Counter dashboard for monitoring purposes.
- Controller persists login and counter selection across refreshes and windows.

Key screens:
- Controller: [controller/+page.svelte](file:///c:/Users/MIS/Desktop/QMS/src/routes/counter/controller/+page.svelte)
- Counter dashboard (admin only by default): [counter/+page.svelte](file:///c:/Users/MIS/Desktop/QMS/src/routes/counter/+page.svelte)
- Login routing: [login/+page.svelte](file:///c:/Users/MIS/Desktop/QMS/src/routes/login/+page.svelte)

## Quick Start (Windows)

1. Install prerequisites
   - Node.js 18+ (required by Vite 5)
   - MySQL Server (local or remote)
2. Clone and install
   - `npm install`
3. Configure environment
   - Create `.env` using `.env.example`
   - Set `MYSQL_HOST`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DATABASE`
4. Initialize database
   - Option A: Command line  
     `mysql -u root -p qms < database/schema-mysql.sql`
   - Option B: Script  
     `node scripts/init-db.js`
5. Verify database connectivity  
   - `node scripts/check-setup-mysql.js`
6. Run the app  
   - `npm run dev`
7. Sign in  
   - Admin: `admin@sanpedro.com` / `admin123`
   - Create Counter Staff via Admin → Users, then sign in as Counter Staff to use the Controller

Helpful commands:
- Type checking: `npm run check`
- Build: `npm run build`
- Preview build: `npm run preview`

## System Logic

### Core Entities
- Users: Admin, Counter Staff
- Services: Code, Name, Description, Active
- Counters: Name, Service binding, Active state, Current ticket
- Tickets: ID, Number, Service code, Status, Timestamps, Counter assignment

Tables are created by [database/schema-mysql.sql](file:///c:/Users/MIS/Desktop/QMS/database/schema-mysql.sql).

### Ticket Statuses
- `waiting`: created and queued
- `called`: currently being served by a counter
- `served`: completed successfully
- `skipped`: skipped from the queue by staff

### Queue Operations
- Create: [api/tickets/create/+server.ts](file:///c:/Users/MIS/Desktop/QMS/src/routes/api/tickets/create/+server.ts)
- Call: [api/tickets/call/+server.ts](file:///c:/Users/MIS/Desktop/QMS/src/routes/api/tickets/call/+server.ts)
- Recall: [api/tickets/recall/+server.ts](file:///c:/Users/MIS/Desktop/QMS/src/routes/api/tickets/recall/+server.ts)
- Serve: [api/tickets/serve/+server.ts](file:///c:/Users/MIS/Desktop/QMS/src/routes/api/tickets/serve/+server.ts)
- Skip: [api/tickets/skip/+server.ts](file:///c:/Users/MIS/Desktop/QMS/src/routes/api/tickets/skip/+server.ts)
- Transfer: [api/tickets/transfer/+server.ts](file:///c:/Users/MIS/Desktop/QMS/src/routes/api/tickets/transfer/+server.ts)

Client store helpers: [queue.ts](file:///c:/Users/MIS/Desktop/QMS/src/lib/stores/queue.ts)
- `createTicket(serviceCode)`
- `callTicket(ticketId, counterId)`
- `recallTicket(ticketId)`
- `serveTicket(ticketId)`
- `skipTicket(ticketId)`
- `transferTicket(ticketId, newCounterId)`

### Display and Filtering Rules
- Only tickets from the current day are considered for current display and stats.
- Active "called" tickets are tracked per counter.
- Waiting order is first-come-first-serve per service code.

Relevant code:
- Current-day filtering and per-counter mapping: [queue.ts](file:///c:/Users/MIS/Desktop/QMS/src/lib/stores/queue.ts#L115-L139)
- Stats helpers: [queue.ts](file:///c:/Users/MIS/Desktop/QMS/src/lib/stores/queue.ts#L279-L335)

### Realtime Model
- MySQL backend uses polling every 2 seconds to synchronize tickets and counters.
- Polling is initialized on app start and can be stopped if needed.
- Code: [queue.ts](file:///c:/Users/MIS/Desktop/QMS/src/lib/stores/queue.ts#L255-L276)

### Authentication and Session Persistence
- On login, user and profile are persisted to local storage.
- On refresh/new window, the app restores the session and profile.
- Counter selection persists via `activeCounterId` and is read by the Controller.
- Code: [auth.ts](file:///c:/Users/MIS/Desktop/QMS/src/lib/stores/auth.ts)

### Controller Actions
- Call Next, Recall, Complete Service, Skip, Transfer
- Compact UI tailored for staff working with other applications
- Code: [controller/+page.svelte](file:///c:/Users/MIS/Desktop/QMS/src/routes/counter/controller/+page.svelte)

## Admin Guide

- Services: Create/update/delete at [api/services/+server.ts](file:///c:/Users/MIS/Desktop/QMS/src/routes/api/services/+server.ts)
- Counters: Create/update status at [api/counters/+server.ts](file:///c:/Users/MIS/Desktop/QMS/src/routes/api/counters/+server.ts)
- Users: Create at [api/users/create/+server.ts](file:///c:/Users/MIS/Desktop/QMS/src/routes/api/users/create/+server.ts)
- Toggle counter availability from the dashboard (admin view) or via API.

## Troubleshooting

- Check backend connectivity: [api/debug/+server.ts](file:///c:/Users/MIS/Desktop/QMS/src/routes/api/debug/+server.ts)
- Ensure `.env` values match your MySQL instance.
- Verify schema loaded correctly using `node scripts/check-setup-mysql.js`.
