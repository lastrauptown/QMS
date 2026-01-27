-- Enable public read access for counters (fixes "No counters configured" issue)
-- Run this in your Supabase SQL Editor

-- 1. Enable RLS (just in case)
ALTER TABLE counters ENABLE ROW LEVEL SECURITY;

-- 2. Drop any existing restrictive policies
DROP POLICY IF EXISTS "Public can view counters" ON counters;
DROP POLICY IF EXISTS "Admins have full access to counters" ON counters;

-- 3. Create a policy that allows EVERYONE to view counters
CREATE POLICY "Public can view counters" 
ON counters 
FOR SELECT 
USING (true);

-- 4. Grant explicit permissions to anonymous users
GRANT SELECT ON counters TO anon;
GRANT SELECT ON counters TO authenticated;
GRANT SELECT ON counters TO service_role;

-- 5. Reload schema cache
NOTIFY pgrst, 'reload config';
