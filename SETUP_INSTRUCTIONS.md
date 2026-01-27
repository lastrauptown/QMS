# Quick Setup with Your Supabase Credentials

Your Supabase credentials have been configured! Here's what to do next:

## ✅ Step 1: Environment File Created

The `.env` file has been created with:
- **URL**: https://wkcbdronkafevdwriolb.supabase.co
- **Anon Key**: sb_publishable_qkFa8Y_j20_wl1P9XpmFGg_sYWQcsYd

**⚠️ Important**: You still need to add your **Service Role Key**:
1. Go to your Supabase Dashboard
2. Settings > API
3. Copy the "service_role" key (keep it secret!)
4. Replace `your_service_role_key_here` in the `.env` file

## 📋 Step 2: Set Up Database Schema

1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/wkcbdronkafevdwriolb
2. Click on **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy the entire contents of `database/schema.sql`
5. Paste it into the SQL Editor
6. Click **Run** (or press Ctrl+Enter)

This will create all the necessary tables, indexes, and security policies.

## 👤 Step 3: Create Your Admin User

### Option A: Via Supabase Dashboard

1. Go to **Authentication** > **Users** in your Supabase dashboard
2. Click **Add User** > **Create new user**
3. Enter:
   - Email: `admin@example.com` (or your email)
   - Password: (choose a strong password)
   - **Auto Confirm User**: ✅ (check this box)
4. Click **Create User**
5. **Copy the User UID** (you'll see it in the user list)

6. Go back to **SQL Editor** and run:

```sql
INSERT INTO user_profiles (id, email, role, name)
VALUES (
    'PASTE_USER_UID_HERE',
    'admin@example.com',
    'admin',
    'Admin User'
);
```

Replace `'PASTE_USER_UID_HERE'` with the actual User UID from step 5.

## 🎯 Step 4: Add Sample Data (Optional)

1. In **SQL Editor**, run the contents of `database/sample-data.sql`
2. This creates sample services and counters for testing

## 🚀 Step 5: Start the Application

```bash
npm run dev
```

Then open `http://localhost:5173` in your browser.

## 🔐 Step 6: Log In

Use the admin credentials you created in Step 3 to log in.

## 📱 Test the System

1. **Public Display**: Visit `http://localhost:5173/display` (no login needed)
2. **Create Ticket**: Visit `http://localhost:5173/ticket` (no login needed)
3. **Admin Dashboard**: Log in and manage services/counters
4. **Counter Interface**: Create a counter staff user (see below)

## 👥 Create Counter Staff Users

For each counter staff member:

1. Create user in **Authentication** > **Users** (same as admin)
2. Get counter IDs:

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

## 🔧 Enable Realtime (Important!)

For real-time updates to work:

1. Go to **Database** > **Replication** in Supabase dashboard
2. Enable replication for:
   - ✅ `tickets` table
   - ✅ `counters` table

## ✅ Verification Checklist

- [ ] `.env` file created with correct credentials
- [ ] Database schema run successfully
- [ ] Admin user created and profile added
- [ ] Sample data added (optional)
- [ ] Realtime enabled for tickets and counters
- [ ] Application starts without errors
- [ ] Can log in as admin
- [ ] Public display shows counters

## 🆘 Troubleshooting

### "Invalid API key" error
- Verify `.env` file has correct values
- Restart dev server after changing `.env`
- Check that keys are from Settings > API

### "Row Level Security policy violation"
- Make sure user profile exists in `user_profiles` table
- Verify role is 'admin', 'counter_staff', or 'public'
- Check RLS policies were created (run schema.sql again)

### Realtime not working
- Enable replication in Database > Replication
- Check browser console for WebSocket errors
- Verify Supabase URL is correct

### Can't log in
- Check user exists in Authentication > Users
- Verify user profile exists in `user_profiles` table
- Make sure "Auto Confirm User" was checked when creating user

## 🎉 You're Ready!

Once you've completed these steps, your QMS is ready to use!

For more details, see:
- [README.md](./README.md) - Full documentation
- [SETUP.md](./SETUP.md) - Detailed setup guide
- [QUICKSTART.md](./QUICKSTART.md) - Quick reference

