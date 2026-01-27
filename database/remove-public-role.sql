-- =====================================================
-- Remove 'public' Role - Simplify to admin and counter_staff
-- Run this in Supabase SQL Editor
-- =====================================================

-- Step 1: Update any existing 'public' roles to 'counter_staff' (or admin can reassign later)
-- You can change this to 'admin' if needed
UPDATE user_profiles 
SET role = 'counter_staff' 
WHERE role = 'public';

-- Step 2: Drop the old constraint
ALTER TABLE user_profiles 
DROP CONSTRAINT IF EXISTS user_profiles_role_check;

-- Step 3: Add new constraint with only admin and counter_staff
ALTER TABLE user_profiles 
ADD CONSTRAINT user_profiles_role_check 
CHECK (role IN ('admin', 'counter_staff'));

-- Step 4: Update the trigger function to NOT auto-create profiles
-- (Admins should create profiles manually to assign proper roles)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Don't auto-create profile - admin must create it with proper role
    -- This prevents accidental 'public' role assignments
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 5: Verify the changes
SELECT 
    role,
    COUNT(*) as user_count,
    CASE 
        WHEN role IN ('admin', 'counter_staff') THEN '✅ Valid'
        ELSE '❌ Invalid - needs update'
    END as status
FROM user_profiles
GROUP BY role
ORDER BY role;

-- Step 6: Show all users and their roles
SELECT 
    email,
    role,
    name,
    CASE 
        WHEN role = 'admin' THEN '✅ Administrator'
        WHEN role = 'counter_staff' THEN '✅ Counter Staff'
        ELSE '❌ Invalid Role'
    END as role_description
FROM user_profiles
ORDER BY role, email;

