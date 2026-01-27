# Database Fix & Setup Guide

## Quick Fix - Run This First!

I've created a comprehensive database fix script. Follow these steps:

### Step 1: Run the Fix Script

1. Open your Supabase Dashboard
2. Go to **SQL Editor** (left sidebar)
3. Click **New Query**
4. Open the file `database/fix-database.sql` from your project
5. Copy the entire contents
6. Paste into the SQL Editor
7. Click **Run** (or press Ctrl+Enter)

This script will:
- ✅ Create all missing tables
- ✅ Add missing columns to existing tables
- ✅ Create all indexes for performance
- ✅ Enable Row Level Security (RLS)
- ✅ Create/update all RLS policies
- ✅ Set up triggers and functions
- ✅ Fix data integrity issues
- ✅ Enable Realtime (if possible)

### Step 2: Verify Database Setup

1. In SQL Editor, create a new query
2. Open `database/verify-database.sql`
3. Copy and run it
4. Check the results - all checks should show ✅ PASS

### Step 3: Enable Realtime (Manual Step)

The script tries to enable Realtime automatically, but you may need to do it manually:

1. Go to **Database** > **Replication** in Supabase dashboard
2. Find the `tickets` table
3. Toggle **Enable Realtime** to ON
4. Do the same for `counters` table

**OR** run this SQL:

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE tickets;
ALTER PUBLICATION supabase_realtime ADD TABLE counters;
```

### Step 4: Fix Your Admin User

Your current user `nin@sanpedro.com` has role `public`. Update it to `admin`:

```sql
UPDATE user_profiles 
SET role = 'admin' 
WHERE email = 'nin@sanpedro.com';
```

### Step 5: Add Sample Data (Optional)

If you want test data:

1. Run `database/sample-data.sql` in SQL Editor
2. This creates sample services and counters

### Step 6: Test the Application

1. Make sure your dev server is running: `npm run dev`
2. Go to `http://localhost:5173/login`
3. Login with `nin@sanpedro.com` and your password
4. You should see the Admin Dashboard

## What the Fix Script Does

### Tables Created/Verified:
- ✅ `services` - Service types
- ✅ `counters` - Service counters
- ✅ `tickets` - Queue tickets
- ✅ `user_profiles` - User role information
- ✅ `audit_logs` - System activity logs

### Security (RLS Policies):
- ✅ Public read access for display screen
- ✅ Admin full access to all tables
- ✅ Counter staff access to assigned counters only
- ✅ User profile self-management

### Performance:
- ✅ Indexes on frequently queried columns
- ✅ Composite indexes for complex queries

### Automation:
- ✅ Auto-create user profiles on signup
- ✅ Realtime updates enabled

## Troubleshooting

### "Policy already exists" errors
- This is normal - the script uses `DROP POLICY IF EXISTS` to handle this
- If you see errors, the policies are likely already correct

### "Table already exists" errors
- This is normal - the script uses `CREATE TABLE IF NOT EXISTS`
- Your existing data will be preserved

### Realtime not working
- Make sure you enabled Realtime in Database > Replication
- Or run the ALTER PUBLICATION commands manually

### Can't login as admin
- Verify the user exists in Authentication > Users
- Check the role in user_profiles table is 'admin'
- Reset password in Authentication > Users if needed

## Verification Checklist

After running the fix script, verify:

- [ ] All 5 tables exist in Table Editor
- [ ] RLS badges show on all tables (should see "RLS" indicator)
- [ ] Can see policies when clicking "RLS policies" button
- [ ] Realtime enabled for tickets and counters
- [ ] Admin user has role 'admin' in user_profiles
- [ ] Can login and access admin dashboard

## Need Help?

If issues persist:
1. Run `database/verify-database.sql` to see what's missing
2. Check the error messages in SQL Editor
3. Verify your Supabase project is active
4. Make sure you have the correct permissions

