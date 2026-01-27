-- =====================================================
-- Fix Infinite Recursion in user_profiles RLS Policy
-- Run this in Supabase SQL Editor
-- =====================================================

-- Step 1: Drop the problematic policy
DROP POLICY IF EXISTS "Admins have full access to user_profiles" ON user_profiles;

-- Step 2: Create a security definer function to check admin role
-- This function bypasses RLS to check the role
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

-- Step 3: Create new admin policy using the function
-- This avoids recursion because the function uses SECURITY DEFINER
CREATE POLICY "Admins have full access to user_profiles" ON user_profiles FOR ALL 
USING (is_admin(auth.uid()));

-- Step 4: Also fix the audit logs policy to use the function
DROP POLICY IF EXISTS "Admins can view audit logs" ON audit_logs;
CREATE POLICY "Admins can view audit logs" ON audit_logs FOR SELECT 
USING (is_admin(auth.uid()));

-- Step 5: Update your user role to admin
UPDATE user_profiles 
SET role = 'admin' 
WHERE email = 'admin@sanpedro.com';

-- Verification
SELECT 
    'Policy fixed!' as status,
    email,
    role,
    CASE 
        WHEN role = 'admin' THEN '✅ Admin role set'
        ELSE '❌ Still needs update'
    END as role_status
FROM user_profiles 
WHERE email = 'admin@sanpedro.com';

