# QMS Quick Start Guide

Get your Queue Management System running in 5 minutes!

## 1. Install Dependencies

```bash
npm install
```

## 2. Set Up Supabase

1. Create account at [supabase.com](https://supabase.com)
2. Create new project
3. Copy Project URL and anon key from Settings > API

## 3. Configure Environment

Create `.env` file:

```env
PUBLIC_SUPABASE_URL=your_url_here
PUBLIC_SUPABASE_ANON_KEY=your_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_key_here
```

## 4. Initialize Database

1. In Supabase SQL Editor, run `database/schema.sql`
2. (Optional) Run `database/sample-data.sql` for test data

## 5. Create Admin User

1. Supabase Dashboard > Authentication > Add User
2. Create user with email/password
3. Copy User UID
4. In SQL Editor, run:

```sql
INSERT INTO user_profiles (id, email, role, name)
VALUES ('user-uid-here', 'admin@example.com', 'admin', 'Admin');
```

## 6. Run Development Server

```bash
npm run dev
```

Visit `http://localhost:5173` and log in!

## Routes

- `/login` - Login page
- `/display` - Public TV display (no login needed)
- `/ticket` - Public ticket creation (no login needed)
- `/counter` - Counter staff dashboard
- `/admin` - Admin dashboard
- `/help` - Help page

## Default Login

Use the admin credentials you created in step 5.

## Next Steps

- Create counter staff users (see SETUP.md)
- Add services and counters via admin dashboard
- Customize theme in `tailwind.config.js`
- Deploy to production (see README.md)

For detailed setup, see [SETUP.md](./SETUP.md)

