# Project Structure

```
QMS/
├── database/
│   ├── schema.sql          # Database schema with RLS policies
│   └── sample-data.sql     # Sample services and counters
│
├── src/
│   ├── lib/
│   │   ├── stores/
│   │   │   ├── auth.ts     # Authentication store (login, user profile)
│   │   │   ├── queue.ts    # Queue management (tickets, counters, services)
│   │   │   └── sound.ts    # Sound system for ticket calls
│   │   └── supabase.ts     # Supabase client configuration
│   │
│   ├── routes/
│   │   ├── +layout.svelte  # Root layout (loads CSS, checks auth)
│   │   ├── +page.svelte    # Root page (redirects based on role)
│   │   │
│   │   ├── login/          # Login page
│   │   │   └── +page.svelte
│   │   │
│   │   ├── display/        # Public TV display (no auth)
│   │   │   └── +page.svelte
│   │   │
│   │   ├── ticket/         # Public ticket creation (no auth)
│   │   │   └── +page.svelte
│   │   │
│   │   ├── counter/        # Counter staff dashboard
│   │   │   └── +page.svelte
│   │   │
│   │   ├── admin/          # Admin dashboard
│   │   │   └── +page.svelte
│   │   │
│   │   ├── help/           # Help page
│   │   │   └── +page.svelte
│   │   │
│   │   └── api/
│   │       └── tickets/
│   │           └── create/
│   │               └── +server.ts  # API endpoint for ticket creation
│   │
│   ├── app.css             # Global styles + Tailwind
│   ├── app.d.ts            # TypeScript definitions
│   └── hooks.server.ts     # SvelteKit server hooks
│
├── static/                 # Static assets
│   └── favicon.ico
│
├── .env                    # Environment variables (create this)
├── .gitignore
├── package.json
├── postcss.config.js       # PostCSS config for Tailwind
├── svelte.config.js        # SvelteKit configuration
├── tailwind.config.js      # Tailwind with green theme
├── tsconfig.json           # TypeScript configuration
├── vite.config.ts          # Vite configuration
│
├── README.md               # Main documentation
├── SETUP.md                # Detailed setup guide
├── QUICKSTART.md           # Quick start guide
└── PROJECT_STRUCTURE.md    # This file
```

## Key Files Explained

### Database
- **schema.sql**: Complete database schema with tables, indexes, RLS policies
- **sample-data.sql**: Sample data for testing

### Stores (State Management)
- **auth.ts**: Handles user authentication and profile management
- **queue.ts**: Core queue logic - tickets, counters, services, realtime
- **sound.ts**: Web Audio API for ticket call notifications

### Routes
- **+layout.svelte**: Root layout, loads CSS, initializes auth
- **+page.svelte**: Root redirect based on user role
- **login/**: Login page with green branding
- **display/**: Public TV display with realtime updates
- **ticket/**: Public ticket creation interface
- **counter/**: Counter staff dashboard (call, serve, recall, etc.)
- **admin/**: Admin dashboard (CRUD, analytics)
- **help/**: Help and FAQ page

### Configuration
- **tailwind.config.js**: Custom green theme (#075E25)
- **svelte.config.js**: SvelteKit adapter and preprocessors
- **vite.config.ts**: Vite build configuration

## Data Flow

1. **Authentication**: User logs in → Supabase Auth → Profile fetched → Role-based redirect
2. **Queue Operations**: Actions → Supabase API → Database → Realtime broadcast → UI updates
3. **Realtime**: Supabase Realtime → Store subscriptions → UI updates + sound

## Theme Customization

Edit `tailwind.config.js` to change colors:
- Primary green: `#075E25` (forest-green)
- Background: White
- Cards: White with shadow-md
- Buttons: Green background, white text

## Adding New Features

1. **New Page**: Create `src/routes/your-page/+page.svelte`
2. **New Store**: Create `src/lib/stores/your-store.ts`
3. **New API Route**: Create `src/routes/api/your-endpoint/+server.ts`
4. **Database Changes**: Update `database/schema.sql` and run in Supabase

## Security

- Row Level Security (RLS) enabled on all tables
- Public read access for display screen
- Role-based access control (admin, counter_staff, public)
- JWT authentication via Supabase

