# Queue Management System (QMS) - System Overview

This document provides a comprehensive overview of the Queue Management System, detailing its architecture, components, workflows, and database structure.

## 1. System Architecture

The QMS is a real-time web application built with **SvelteKit** and **Supabase**. It follows a reactive architecture where changes in the database are immediately reflected across all connected clients (Kiosk, Display, Counter Dashboards) via Supabase Realtime.

### Tech Stack
- **Frontend Framework**: SvelteKit (Svelte 4)
- **Language**: TypeScript
- **Database**: Supabase (PostgreSQL)
- **Real-time Engine**: Supabase Realtime
- **Styling**: Tailwind CSS
- **State Management**: Svelte Stores (Custom implementation in `src/lib/stores/queue.ts`)

---

## 2. Core Components

The system is divided into four main interfaces, each serving a specific role:

### A. Kiosk Interface (`/`)
- **Purpose**: Public-facing interface for customers to generate tickets.
- **Functionality**:
  - Lists available services fetched from the database.
  - Generates a ticket number (e.g., "A-001") upon service selection.
  - Displays a confirmation modal with the ticket number.
- **Key File**: `src/routes/+page.svelte`

### B. Public Display (`/display`)
- **Purpose**: Large screen display for the waiting area.
- **Functionality**:
  - Shows "Now Serving" tickets for each active counter.
  - Plays a sound notification when a new ticket is called.
  - Updates in real-time as counters change status.
- **Key File**: `src/routes/display/+page.svelte`

### C. Counter Dashboard (`/counter`)
- **Purpose**: Interface for staff members to manage the queue.
- **Functionality**:
  - **Call Next**: Calls the next waiting ticket for the assigned service.
  - **Complete Service**: Marks the current ticket as done.
  - **Recall**: Re-announces the current ticket (useful if customer didn't hear).
  - **Skip**: Moves the current ticket to "skipped" status and calls the next.
  - **Transfer**: Moves the ticket to another counter's waiting queue.
  - **Stats**: Shows personal performance metrics (tickets served, avg time).
- **Key File**: `src/routes/counter/+page.svelte`

### D. Admin Dashboard (`/admin`)
- **Purpose**: System configuration and monitoring.
- **Functionality**:
  - **Services Management**: Create, edit, delete services.
  - **Counters Management**: Create, edit, delete counters and assign them to services.
  - **User Management**: Create staff accounts and assign roles.
  - **Analytics**: View system-wide performance metrics.
  - **Monitoring**: Live view of all queues.
- **Key File**: `src/routes/admin/+page.svelte`

---

## 3. Database Structure

The system uses a relational database schema designed for data integrity and performance.

### Key Tables

1.  **`services`**
    *   `id`: UUID
    *   `code`: Short code (e.g., "MED", "PAY")
    *   `name`: Full name (e.g., "Medical Consultation")
    *   `is_active`: Boolean

2.  **`counters`**
    *   `id`: UUID
    *   `name`: Display name (e.g., "Counter 1")
    *   `service_id`: FK to `services` (The service this counter handles)
    *   `is_active`: Boolean
    *   `current_ticket`: (Cache) Currently served ticket number

3.  **`tickets`**
    *   `id`: UUID
    *   `ticket_number`: Formatted string (e.g., "A-005")
    *   `status`: Enum ('waiting', 'called', 'served', 'skipped')
    *   `service_code`: Code of the requested service
    *   `counter_id`: FK to `counters` (Assigned when called)
    *   `created_at`, `called_at`, `served_at`: Timestamps for analytics

4.  **`user_profiles`**
    *   `id`: UUID (Linked to Supabase Auth)
    *   `role`: 'admin' or 'counter_staff'
    *   `counter_id`: FK to `counters` (For staff assignment)

---

## 4. Key Workflows

### Ticket Lifecycle

1.  **Creation**
    *   User selects "Medical" on Kiosk.
    *   System finds the last ticket number for "Medical" today.
    *   New ticket "MED-005" is created with status `waiting`.

2.  **Calling**
    *   Counter 1 (assigned to "Medical") clicks "Call Next".
    *   System finds the oldest `waiting` ticket for "Medical".
    *   Ticket status updates to `called`.
    *   `counter_id` is set to Counter 1.
    *   `called_at` timestamp is recorded.
    *   **Real-time Event**: Display screen updates and plays sound.

3.  **Serving**
    *   Staff helps the customer.
    *   Real-time timer shows elapsed service time.
    *   Staff clicks "Complete Service".
    *   Ticket status updates to `served`.
    *   `served_at` timestamp is recorded.

4.  **Transferring**
    *   Staff clicks "Transfer" and selects "Pharmacy".
    *   Ticket service code updates to "PHARMA".
    *   Ticket status resets to `waiting`.
    *   Ticket appears in Pharmacy queue (Counter 2).

---

## 5. Directory Structure

```
src/
├── lib/
│   ├── stores/          # State management
│   │   ├── queue.ts     # Central store for tickets/counters
│   │   ├── auth.ts      # Authentication store
│   │   └── sound.ts     # Audio notification logic
│   └── supabase.ts      # Supabase client configuration
├── routes/
│   ├── +page.svelte     # Kiosk Interface
│   ├── display/         # Public Display
│   ├── counter/         # Staff Interface
│   ├── admin/           # Admin Dashboard
│   └── api/             # Backend API Endpoints
│       ├── tickets/     # Ticket operations (create, call, serve...)
│       └── users/       # User management
```

## 6. Real-time Mechanism

The system relies on `src/lib/stores/queue.ts` to manage state.

1.  **Initialization**: On app load, the store fetches initial data (Services, Counters, active Tickets).
2.  **Subscription**: The store subscribes to Supabase Realtime channels for `tickets` and `counters` tables.
3.  **Updates**: When an `INSERT` or `UPDATE` event occurs in the database (e.g., a ticket is called), the store automatically re-fetches or updates the local state.
4.  **Reactivity**: Svelte components subscribe to these stores and automatically re-render when data changes.
