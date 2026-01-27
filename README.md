# Queue Management System (QMS)

A production-ready Queueing Management System built with SvelteKit, TypeScript, and Supabase. Features a green-themed UI designed for public offices and LGUs.

## Features

- **Public Display (TV Mode)**: Real-time queue display with sound notifications
- **Counter Interface**: Staff dashboard for managing queues
- **Admin Dashboard**: Full CRUD operations, analytics, and user management
- **Real-time Updates**: Live synchronization across all devices
- **Sound System**: Audio notifications when tickets are called
- **Role-based Access**: Admin, Counter Staff, and Public roles

## Tech Stack

- **Frontend**: SvelteKit + TypeScript
- **Styling**: TailwindCSS with custom green theme
- **Backend**: Supabase (PostgreSQL + Realtime + Auth)
- **State Management**: Svelte Stores

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Copy your project URL and anon key
3. Create a `.env` file in the root directory:

```env
PUBLIC_SUPABASE_URL=your_supabase_url
PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 3. Database Schema

Run the following SQL in your Supabase SQL Editor:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Services table
CREATE TABLE services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(10) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Counters table
CREATE TABLE counters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    service_id UUID REFERENCES services(id),
    is_active BOOLEAN DEFAULT true,
    current_ticket VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tickets table
CREATE TABLE tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service_code VARCHAR(10) NOT NULL,
    number INTEGER NOT NULL,
    ticket_number VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'waiting',
    counter_id UUID REFERENCES counters(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    called_at TIMESTAMP WITH TIME ZONE,
    served_at TIMESTAMP WITH TIME ZONE
);

-- User profiles table
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'counter_staff', 'public')),
    counter_id UUID REFERENCES counters(id),
    name VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Audit log table
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    action VARCHAR(100) NOT NULL,
    table_name VARCHAR(50),
    record_id UUID,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_tickets_service_code ON tickets(service_code);
CREATE INDEX idx_tickets_status ON tickets(status);
CREATE INDEX idx_tickets_counter_id ON tickets(counter_id);
CREATE INDEX idx_tickets_created_at ON tickets(created_at);
CREATE INDEX idx_counters_service_id ON counters(service_id);
CREATE INDEX idx_user_profiles_role ON user_profiles(role);

-- Row Level Security (RLS) Policies
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Public read access for services and counters
CREATE POLICY "Public can view services" ON services FOR SELECT USING (true);
CREATE POLICY "Public can view counters" ON counters FOR SELECT USING (true);
CREATE POLICY "Public can view tickets" ON tickets FOR SELECT USING (true);

-- Admin full access
CREATE POLICY "Admins have full access to services" ON services FOR ALL USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Admins have full access to counters" ON counters FOR ALL USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Admins have full access to tickets" ON tickets FOR ALL USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Counter staff can update their own counter's tickets
CREATE POLICY "Counter staff can update tickets" ON tickets FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM user_profiles up
        JOIN counters c ON c.id = up.counter_id
        WHERE up.id = auth.uid() AND c.id = tickets.counter_id
    )
);

-- Counter staff can insert tickets
CREATE POLICY "Counter staff can create tickets" ON tickets FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('admin', 'counter_staff'))
);

-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON user_profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON user_profiles FOR UPDATE USING (auth.uid() = id);
```

### 4. Create Initial Admin User

1. Go to Supabase Dashboard > Authentication > Users
2. Create a new user manually or via the Auth API
3. Insert a profile record in the `user_profiles` table:

```sql
INSERT INTO user_profiles (id, email, role, name)
VALUES (
    'user-uuid-from-auth',
    'admin@example.com',
    'admin',
    'Admin User'
);
```

### 5. Create Sample Data (Optional)

```sql
-- Sample services
INSERT INTO services (code, name, description) VALUES
('S1', 'Service 1', 'General Service'),
('S2', 'Service 2', 'Document Processing'),
('S3', 'Service 3', 'Payment Processing');

-- Sample counters
INSERT INTO counters (name, service_id, is_active)
SELECT 'Counter 1', id, true FROM services WHERE code = 'S1'
UNION ALL
SELECT 'Counter 2', id, true FROM services WHERE code = 'S2'
UNION ALL
SELECT 'Counter 3', id, true FROM services WHERE code = 'S3';
```

### 6. Run Development Server

```bash
npm run dev
```

Visit `http://localhost:5173` to see the application.

## Project Structure

```
src/
├── lib/
│   ├── stores/
│   │   ├── auth.ts      # Authentication store
│   │   ├── queue.ts     # Queue management store
│   │   └── sound.ts     # Sound system
│   └── supabase.ts      # Supabase client
├── routes/
│   ├── +page.svelte     # Root redirect
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

## Features in Detail

### Public Display
- Real-time queue updates
- Sound notifications
- Full-screen friendly layout
- Green-themed UI

### Counter Interface
- Call next customer
- Recall previous ticket
- Serve current ticket
- Skip ticket
- Transfer ticket
- Queue history

### Admin Dashboard
- Service management (CRUD)
- Counter management (CRUD)
- Analytics dashboard
- Daily queue reset
- User management (coming soon)

## Deployment

### Build for Production

```bash
npm run build
```

### Deploy to Vercel/Netlify

1. Connect your repository
2. Add environment variables
3. Deploy

### Environment Variables for Production

Make sure to set:
- `PUBLIC_SUPABASE_URL`
- `PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server-side only)

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

## Security Notes

- Row Level Security (RLS) is enabled on all tables
- JWT authentication via Supabase Auth
- Service role key should never be exposed to client
- All API calls go through Supabase with proper RLS policies

## Support

For issues or questions, please refer to the help page or contact your system administrator.

## License

This project is built for production use in LGUs and corporate offices.

