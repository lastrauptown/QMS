# Fix Login Issues - Quick Guide

## Problems Identified:
1. **Infinite Recursion Error**: RLS policy for `user_profiles` is checking itself, causing a loop
2. **Wrong Role**: Your user has role `public` instead of `admin`

## Solution:

### Option 1: Quick Fix (Recommended)
Run this SQL script in your Supabase SQL Editor:

**File: `database/quick-fix-login.sql`**

This will:
- ✅ Fix the infinite recursion by using a security definer function
- ✅ Update your role from `public` to `admin`
- ✅ Fix related policies

### Option 2: Step-by-Step

1. **Open Supabase Dashboard** → SQL Editor

2. **Run this to fix the recursion:**
```sql
-- Drop problematic policy
DROP POLICY IF EXISTS "Admins have full access to user_profiles" ON user_profiles;

-- Create helper function (bypasses RLS)
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE id = user_id 
        AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate policy using function (no recursion)
CREATE POLICY "Admins have full access to user_profiles" ON user_profiles FOR ALL 
USING (is_admin(auth.uid()));
```

3. **Update your role:**
```sql
UPDATE user_profiles 
SET role = 'admin' 
WHERE email = 'admin@sanpedro.com';
```

4. **Verify:**
```sql
SELECT email, role FROM user_profiles WHERE email = 'admin@sanpedro.com';
```

## After Running the Fix:

1. **Refresh your browser** (clear cache if needed)
2. **Try logging in again** at `http://localhost:5173/login`
3. You should now be able to sign in successfully!

## Why This Happened:

The RLS policy was checking `user_profiles` to see if you're an admin, but to check `user_profiles`, it needs to check if you're an admin first → **infinite loop**!

The `SECURITY DEFINER` function bypasses RLS, breaking the cycle.

