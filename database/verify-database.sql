-- =====================================================
-- QMS Database Verification Script
-- Run this to check if your database is set up correctly
-- =====================================================

-- Check 1: Verify all tables exist
SELECT 
    'Tables Check' as check_type,
    CASE 
        WHEN COUNT(*) = 5 THEN '✅ PASS - All 5 tables exist'
        ELSE '❌ FAIL - Missing tables. Expected 5, found ' || COUNT(*)::text
    END as result
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('services', 'counters', 'tickets', 'user_profiles', 'audit_logs');

-- Check 2: Verify RLS is enabled on all tables
SELECT 
    'RLS Check' as check_type,
    tablename,
    CASE 
        WHEN rowsecurity THEN '✅ Enabled'
        ELSE '❌ Disabled'
    END as rls_status
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('services', 'counters', 'tickets', 'user_profiles', 'audit_logs')
ORDER BY tablename;

-- Check 3: Count RLS policies (should have at least 13 policies)
SELECT 
    'Policies Check' as check_type,
    COUNT(*) as policy_count,
    CASE 
        WHEN COUNT(*) >= 13 THEN '✅ PASS - Sufficient policies'
        ELSE '❌ FAIL - Missing policies. Expected at least 13, found ' || COUNT(*)::text
    END as result
FROM pg_policies 
WHERE schemaname = 'public';

-- Check 4: List all policies
SELECT 
    'Policy Details' as check_type,
    tablename,
    policyname,
    CASE 
        WHEN cmd = 'SELECT' THEN 'Read'
        WHEN cmd = 'INSERT' THEN 'Insert'
        WHEN cmd = 'UPDATE' THEN 'Update'
        WHEN cmd = 'DELETE' THEN 'Delete'
        WHEN cmd = 'ALL' THEN 'Full Access'
        ELSE cmd
    END as permission
FROM pg_policies 
WHERE schemaname = 'public' 
ORDER BY tablename, policyname;

-- Check 5: Verify indexes exist
SELECT 
    'Indexes Check' as check_type,
    tablename,
    COUNT(*) as index_count
FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename IN ('services', 'counters', 'tickets', 'user_profiles')
GROUP BY tablename
ORDER BY tablename;

-- Check 6: Verify trigger exists
SELECT 
    'Trigger Check' as check_type,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_trigger 
            WHERE tgname = 'on_auth_user_created'
        ) THEN '✅ PASS - Trigger exists'
        ELSE '❌ FAIL - Trigger missing'
    END as result;

-- Check 7: Verify function exists
SELECT 
    'Function Check' as check_type,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_proc 
            WHERE proname = 'handle_new_user'
        ) THEN '✅ PASS - Function exists'
        ELSE '❌ FAIL - Function missing'
    END as result;

-- Check 8: Check for data integrity issues
SELECT 
    'Data Integrity' as check_type,
    'user_profiles' as table_name,
    COUNT(*) FILTER (WHERE role NOT IN ('admin', 'counter_staff', 'public')) as invalid_roles,
    COUNT(*) FILTER (WHERE email IS NULL) as null_emails
FROM user_profiles;

-- Check 9: Verify foreign key constraints
SELECT 
    'Foreign Keys' as check_type,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_schema = 'public'
ORDER BY tc.table_name;

-- Check 10: Summary Report
SELECT 
    '=== DATABASE VERIFICATION SUMMARY ===' as summary;

SELECT 
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('services', 'counters', 'tickets', 'user_profiles', 'audit_logs')) as tables_count,
    (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public') as policies_count,
    (SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public' AND tablename IN ('services', 'counters', 'tickets', 'user_profiles')) as indexes_count,
    (SELECT COUNT(*) FROM pg_trigger WHERE tgname = 'on_auth_user_created') as trigger_count,
    (SELECT COUNT(*) FROM pg_proc WHERE proname = 'handle_new_user') as function_count;

