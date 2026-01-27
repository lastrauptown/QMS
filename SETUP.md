# QMS Setup Guide

Complete step-by-step guide to set up the Queue Management System.

## Prerequisites

- Node.js 18+ installed
- A Supabase account (free tier works)
- Basic knowledge of SQL

## Step 1: Install Dependencies

```bash
npm install
```

## Step 2: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up/login
2. Click "New Project"
3. Fill in:
   - Project name: `qms` (or your choice)
   - Database password: (save this securely)
   - Region: Choose closest to you
4. Wait for project to be created (2-3 minutes)

## Step 3: Get Supabase Credentials

1. In your Supabase project dashboard, go to **Settings** > **API**
2. Copy the following:
   - **Project URL** (under "Project URL")
   - **anon/public key** (under "Project API keys" > "anon public")
   - **service_role key** (under "Project API keys" > "service_role" - keep this secret!)

## Step 4: Configure Environment Variables

1. Create a `.env` file in the project root:

```env
PUBLIC_SUPABASE_URL=https://your-project.supabase.co
PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

2. Replace the values with your actual Supabase credentials

## Step 5: Set Up Database Schema

1. In Supabase dashboard, go to **SQL Editor**
2. Click **New Query**
3. Copy and paste the entire contents of `database/schema.sql`
4. Click **Run** (or press Ctrl+Enter)
5. Verify tables were created by going to **Table Editor**

You should see these tables:
- `services`
- `counters`
- `tickets`
- `user_profiles`
- `audit_logs`

## Step 6: Create Initial Admin User

### Option A: Via Supabase Dashboard

1. Go to **Authentication** > **Users**
2. Click **Add User** > **Create new user**
3. Enter:
   - Email: `admin@example.com` (or your email)
   - Password: (choose a strong password)
   - Auto Confirm User: ✅ (check this)
4. Click **Create User**
5. Copy the **User UID** (you'll need this)

6. Go to **SQL Editor** and run:

```sql
INSERT INTO user_profiles (id, email, role, name)
VALUES (
    'paste-user-uid-here',
    'admin@example.com',
    'admin',
    'Admin User'
);
```

Replace `'paste-user-uid-here'` with the actual User UID from step 5.

### Option B: Via Supabase Auth API (Programmatic)

You can also create users programmatically using the Supabase Admin API, but the dashboard method is simpler for initial setup.

## Step 7: Create Sample Data (Optional)

1. In **SQL Editor**, run the contents of `database/sample-data.sql`
2. This creates sample services and counters

## Step 8: Create Counter Staff Users

For each counter staff member:

1. Create user in **Authentication** > **Users** (same as admin)
2. Get the counter ID:

```sql
SELECT id, name FROM counters;
```

3. Insert profile with counter assignment:

```sql
INSERT INTO user_profiles (id, email, role, name, counter_id)
VALUES (
    'staff-user-uid',
    'staff@example.com',
    'counter_staff',
    'Staff Name',
    'counter-id-from-above'
);
```

## Step 9: Test the Application

1. Start the development server:

```bash
npm run dev
```

2. Open `http://localhost:5173` in your browser
3. You should be redirected to `/login`
4. Log in with your admin credentials
5. You should see the admin dashboard

## Step 10: Verify Features

### Test Public Display
- Go to `http://localhost:5173/display`
- Should show counters (if you created sample data)
- Should have green header

### Test Counter Interface
- Log in as a counter staff user
- Should see counter dashboard
- Can call next ticket, serve, etc.

### Test Admin Interface
- Log in as admin
- Create/edit services
- Create/edit counters
- View analytics

## Troubleshooting

### "Invalid API key" error
- Check that your `.env` file has correct values
- Make sure `PUBLIC_` prefix is on the URL and anon key
- Restart dev server after changing `.env`

### "Row Level Security policy violation"
- Check that user profile exists in `user_profiles` table
- Verify role is set correctly ('admin', 'counter_staff', or 'public')
- Check RLS policies in `database/schema.sql` were created

### "Service not found" when creating tickets
- Make sure services exist in database
- Check service code matches exactly (case-sensitive)

### Realtime not working
- In Supabase dashboard, go to **Database** > **Replication**
- Enable replication for `tickets` and `counters` tables
- Check that you're using the correct Supabase URL

### Sound not playing
- Modern browsers require user interaction before playing audio
- Click anywhere on the page first
- Check browser console for errors
- Verify Web Audio API is supported

## Production Deployment

### Build for Production

```bash
npm run build
```

### Deploy to Vercel

1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

### Deploy to Netlify

1. Push code to GitHub
2. Import project in Netlify
3. Add environment variables in Netlify dashboard
4. Deploy

### Environment Variables for Production

Make sure to set:
- `PUBLIC_SUPABASE_URL`
- `PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (only if using server-side operations)

## Security Checklist

- [ ] RLS policies are enabled on all tables
- [ ] Service role key is never exposed to client
- [ ] Strong passwords for all users
- [ ] HTTPS enabled in production
- [ ] Environment variables secured
- [ ] Regular backups of Supabase database

## Next Steps

- Customize the green theme in `tailwind.config.js`
- Add more services and counters
- Configure email notifications (optional)
- Set up monitoring and logging
- Create user documentation

## Support

For issues:
1. Check browser console for errors
2. Check Supabase logs in dashboard
3. Verify database schema matches `database/schema.sql`
4. Review RLS policies

