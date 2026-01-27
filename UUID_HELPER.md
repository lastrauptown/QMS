# UUID Helper: d40a51c7-b0d5-474e-a96c-08d9284dbc45

This UUID could be used for several things in the QMS system. Here's how to use it:

## What is this UUID?

This could be:
- **User ID** (from Supabase Auth)
- **Counter ID** (from counters table)
- **Service ID** (from services table)
- **Ticket ID** (from tickets table)

## Step 1: Identify the UUID

Run the queries in `check-uuid.sql` in your Supabase SQL Editor to see where this UUID is used.

## Step 2: Use Cases

### If it's a User ID (from Supabase Auth)

**Create a user profile:**

1. Go to Supabase Dashboard > Authentication > Users
2. Find the user with this ID
3. Note their email address
4. Run this in SQL Editor (replace email and name):

```sql
INSERT INTO user_profiles (id, email, role, name)
VALUES (
    'd40a51c7-b0d5-474e-a96c-08d9284dbc45',
    'user@example.com',  -- Use actual email from Auth
    'admin',             -- or 'counter_staff' or 'public'
    'User Name'          -- Use actual name
);
```

### If it's a Counter ID

**Assign a counter to a staff member:**

1. First, get the user ID from Supabase Auth
2. Then run:

```sql
UPDATE user_profiles
SET counter_id = 'd40a51c7-b0d5-474e-a96c-08d9284dbc45'
WHERE id = 'user-id-from-auth';
```

### If it's a Service ID

**Link a counter to this service:**

```sql
UPDATE counters
SET service_id = 'd40a51c7-b0d5-474e-a96c-08d9284dbc45'
WHERE id = 'counter-id-here';
```

## Quick Commands

### Check if UUID exists in any table:
```sql
-- Check all tables at once
SELECT 'auth.users' as table_name, id, email FROM auth.users WHERE id = 'd40a51c7-b0d5-474e-a96c-08d9284dbc45'
UNION ALL
SELECT 'user_profiles', id::text, email FROM user_profiles WHERE id = 'd40a51c7-b0d5-474e-a96c-08d9284dbc45'
UNION ALL
SELECT 'counters', id::text, name FROM counters WHERE id = 'd40a51c7-b0d5-474e-a96c-08d9284dbc45'
UNION ALL
SELECT 'services', id::text, name FROM services WHERE id = 'd40a51c7-b0d5-474e-a96c-08d9284dbc45';
```

## Need Help?

Tell me:
1. **What is this UUID?** (User ID, Counter ID, etc.)
2. **What do you want to do with it?** (Create profile, assign counter, etc.)

And I'll provide the exact SQL you need!


