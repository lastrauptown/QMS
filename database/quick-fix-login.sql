-- =====================================================
-- Quick Fix for Login Issues
-- Run this in Supabase SQL Editor
-- =====================================================

-- Step 1: Fix RLS Recursion Issue
DROP POLICY IF EXISTS "Admins have full access to user_profiles" ON user_profiles;

-- Create helper function to check admin (avoids recursion)
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

-- Recreate admin policy using function (no recursion)
CREATE POLICY "Admins have full access to user_profiles" ON user_profiles FOR ALL 
USING (is_admin(auth.uid()));

-- Step 2: Simplify roles (remove 'public', keep only admin and counter_staff)
-- Update any 'public' roles to 'counter_staff'
UPDATE user_profiles 
SET role = 'counter_staff' 
WHERE role = 'public';

-- Drop old constraint
ALTER TABLE user_profiles 
DROP CONSTRAINT IF EXISTS user_profiles_role_check;

-- Add new constraint with only admin and counter_staff
ALTER TABLE user_profiles 
ADD CONSTRAINT user_profiles_role_check 
CHECK (role IN ('admin', 'counter_staff'));

-- Step 3: Update your admin account role
UPDATE user_profiles 
SET role = 'admin' 
WHERE email = 'admin@sanpedro.com';

-- Step 4: Verify the update
SELECT 
    email,
    role,
    name,
    CASE 
        WHEN role = 'admin' THEN '✅ Ready to login'
        ELSE '❌ Role still needs update'
    END as status
FROM user_profiles 
WHERE email = 'admin@sanpedro.com';

-- Step 5: Fix audit logs policy too
DROP POLICY IF EXISTS "Admins can view audit logs" ON audit_logs;
CREATE POLICY "Admins can view audit logs" ON audit_logs FOR SELECT 
USING (is_admin(auth.uid()));

