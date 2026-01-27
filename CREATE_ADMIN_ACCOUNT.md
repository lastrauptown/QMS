# How to Create an Admin Account in Supabase

## Method 1: Using Supabase Dashboard (Easiest)

### Step 1: Create Authentication User

1. **Go to Supabase Dashboard**
   - Open your project: https://supabase.com/dashboard
   - Navigate to **Authentication** → **Users** (left sidebar)

2. **Add New User**
   - Click **"Add User"** button (top right)
   - Select **"Create new user"**

3. **Fill in User Details**
   - **Email**: Enter your admin email (e.g., `admin@sanpedro.com`)
   - **Password**: Enter a strong password (save this!)
   - **Auto Confirm User**: ✅ **Check this box** (important!)
   - **Send Invite Email**: Uncheck (optional)

4. **Create User**
   - Click **"Create User"**
   - **Copy the User UID** (you'll see it in the user list or user details)

### Step 2: Create User Profile

1. **Go to SQL Editor**
   - Click **SQL Editor** in left sidebar
   - Click **"New Query"**

2. **Run This SQL** (replace the values):

```sql
-- Replace 'USER_UID_HERE' with the User UID from Step 1
-- Replace 'admin@sanpedro.com' with your actual email
INSERT INTO user_profiles (id, email, role, name)
VALUES (
    'USER_UID_HERE',  -- Paste the User UID here
    'admin@sanpedro.com',  -- Your email
    'admin',  -- Role must be 'admin'
    'Administrator'  -- Your name
);
```

**Example:**
```sql
INSERT INTO user_profiles (id, email, role, name)
VALUES (
    '68a63320-11cd-44db-9232-da0287787e7c',
    'admin@sanpedro.com',
    'admin',
    'Administrator'
);
```

3. **Click Run** (or press Ctrl+Enter)

### Step 3: Verify

1. Go to **Table Editor** → **user_profiles**
2. You should see your new admin user with `role = 'admin'`

### Step 4: Test Login

1. Go to your app: `http://localhost:5173/login`
2. Login with:
   - **Email**: `admin@sanpedro.com` (or your email)
   - **Password**: The password you set in Step 1
3. You should be redirected to the Admin Dashboard

---

## Method 2: Update Existing User to Admin

If you already have a user (like `nin@sanpedro.com`), just update the role:

### Step 1: Update Role in SQL Editor

```sql
UPDATE user_profiles 
SET role = 'admin' 
WHERE email = 'nin@sanpedro.com';
```

### Step 2: Verify

Check in Table Editor that the role changed to `admin`

### Step 3: Test Login

Login with your existing credentials - you should now have admin access.

---

## Method 3: Using Supabase Auth API (Advanced)

If you want to create users programmatically, you can use the Supabase Admin API, but the dashboard method is simpler.

---

## Troubleshooting

### "User already exists" error
- The user already exists in Authentication
- Just update the role in `user_profiles` table (Method 2)

### "Foreign key constraint" error
- The User UID doesn't exist in `auth.users`
- Make sure you created the user in Authentication first (Step 1)

### "Role check constraint" error
- The role must be exactly: `'admin'`, `'counter_staff'`, or `'public'`
- Check for typos (case-sensitive)

### Can't login after creating admin
- Verify user exists in Authentication → Users
- Check `user_profiles` has correct User UID
- Verify role is exactly `'admin'` (not `'Admin'` or `'ADMIN'`)
- Try resetting password in Authentication → Users

### "Row Level Security policy violation"
- Make sure you ran `database/fix-database.sql` first
- Check that RLS policies are created
- Verify the user profile exists

---

## Quick Reference

**Minimum Required:**
1. User in `auth.users` (via Authentication → Users)
2. Profile in `user_profiles` with `role = 'admin'`

**SQL Template:**
```sql
INSERT INTO user_profiles (id, email, role, name)
VALUES (
    'paste-user-uid-here',
    'your-email@example.com',
    'admin',
    'Your Name'
);
```

---

## Security Notes

- Use strong passwords for admin accounts
- Don't share admin credentials
- Consider using 2FA for admin accounts (if available)
- Regularly audit admin users
- Use service role key only server-side (never expose to client)

