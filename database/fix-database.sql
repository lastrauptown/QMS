-- =====================================================
-- QMS Database Fix & Verification Script
-- Run this in Supabase SQL Editor to fix all issues
-- =====================================================

-- Step 1: Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Step 2: Create tables if they don't exist (with all columns)
-- Services table
CREATE TABLE IF NOT EXISTS services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(10) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Counters table
CREATE TABLE IF NOT EXISTS counters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    service_id UUID REFERENCES services(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT true,
    current_ticket VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tickets table
CREATE TABLE IF NOT EXISTS tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service_code VARCHAR(10) NOT NULL,
    number INTEGER NOT NULL,
    ticket_number VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'waiting' CHECK (status IN ('waiting', 'called', 'served', 'skipped')),
    counter_id UUID REFERENCES counters(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    called_at TIMESTAMP WITH TIME ZONE,
    served_at TIMESTAMP WITH TIME ZONE
);

-- User profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'counter_staff')),
    counter_id UUID REFERENCES counters(id) ON DELETE SET NULL,
    name VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Audit log table
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    table_name VARCHAR(50),
    record_id UUID,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 3: Add missing columns if tables exist but columns are missing
DO $$ 
BEGIN
    -- Add missing columns to services
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'services' AND column_name = 'description') THEN
        ALTER TABLE services ADD COLUMN description TEXT;
    END IF;
    
    -- Add missing columns to counters
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'counters' AND column_name = 'current_ticket') THEN
        ALTER TABLE counters ADD COLUMN current_ticket VARCHAR(50);
    END IF;
    
    -- Add missing columns to tickets
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tickets' AND column_name = 'called_at') THEN
        ALTER TABLE tickets ADD COLUMN called_at TIMESTAMP WITH TIME ZONE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tickets' AND column_name = 'served_at') THEN
        ALTER TABLE tickets ADD COLUMN served_at TIMESTAMP WITH TIME ZONE;
    END IF;
    
    -- Add missing columns to user_profiles
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'name') THEN
        ALTER TABLE user_profiles ADD COLUMN name VARCHAR(255);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'counter_id') THEN
        ALTER TABLE user_profiles ADD COLUMN counter_id UUID REFERENCES counters(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Step 4: Create all indexes for performance
CREATE INDEX IF NOT EXISTS idx_tickets_service_code ON tickets(service_code);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_counter_id ON tickets(counter_id);
CREATE INDEX IF NOT EXISTS idx_tickets_created_at ON tickets(created_at);
CREATE INDEX IF NOT EXISTS idx_counters_service_id ON counters(service_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_tickets_service_date ON tickets(service_code, created_at);
CREATE INDEX IF NOT EXISTS idx_user_profiles_counter_id ON user_profiles(counter_id);

-- Step 5: Enable Row Level Security
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Step 6: Drop all existing policies (clean slate)
DROP POLICY IF EXISTS "Public can view services" ON services;
DROP POLICY IF EXISTS "Public can view counters" ON counters;
DROP POLICY IF EXISTS "Public can view tickets" ON tickets;
DROP POLICY IF EXISTS "Admins have full access to services" ON services;
DROP POLICY IF EXISTS "Admins have full access to counters" ON counters;
DROP POLICY IF EXISTS "Admins have full access to tickets" ON tickets;
DROP POLICY IF EXISTS "Counter staff can update tickets" ON tickets;
DROP POLICY IF EXISTS "Counter staff can create tickets" ON tickets;
DROP POLICY IF EXISTS "Counter staff can view services" ON services;
DROP POLICY IF EXISTS "Counter staff can view assigned counter" ON counters;
DROP POLICY IF EXISTS "Admins have full access to user_profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can view audit logs" ON audit_logs;

-- Step 6.5: Create helper function to check admin role (avoids RLS recursion)
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

-- Step 7: Create all RLS policies

-- Public read access (for display screen)
CREATE POLICY "Public can view services" ON services FOR SELECT USING (true);
CREATE POLICY "Public can view counters" ON counters FOR SELECT USING (true);
CREATE POLICY "Public can view tickets" ON tickets FOR SELECT USING (true);

-- Admin full access
CREATE POLICY "Admins have full access to services" ON services FOR ALL USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Admins have full access to counters" ON counters FOR ALL USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Admins have full access to tickets" ON tickets FOR ALL USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Use function to avoid recursion when checking user_profiles itself
CREATE POLICY "Admins have full access to user_profiles" ON user_profiles FOR ALL 
USING (is_admin(auth.uid()));

CREATE POLICY "Admins can view audit logs" ON audit_logs FOR SELECT 
USING (is_admin(auth.uid()));

-- Counter staff policies
CREATE POLICY "Counter staff can view services" ON services FOR SELECT USING (true);

CREATE POLICY "Counter staff can view assigned counter" ON counters FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE id = auth.uid() 
        AND counter_id = counters.id
    )
);

CREATE POLICY "Counter staff can update tickets" ON tickets FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM user_profiles up
        JOIN counters c ON c.id = up.counter_id
        WHERE up.id = auth.uid() AND c.id = tickets.counter_id
    )
);

CREATE POLICY "Counter staff can create tickets" ON tickets FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('admin', 'counter_staff'))
);

-- User profile policies
CREATE POLICY "Users can view own profile" ON user_profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON user_profiles FOR UPDATE USING (auth.uid() = id);

-- Step 8: Create/Update trigger function for auto-creating user profiles
-- Note: We don't auto-create profiles to ensure proper role assignment by admins
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Don't auto-create profile - admin must create it with proper role
    -- This prevents accidental role assignments
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 9: Create/Update trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Step 10: Enable Realtime for tickets and counters
-- Note: This requires the supabase_realtime publication to exist
DO $$
BEGIN
    -- Add tickets to realtime publication if not already added
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        BEGIN
            ALTER PUBLICATION supabase_realtime ADD TABLE tickets;
        EXCEPTION WHEN duplicate_object THEN
            -- Already added, ignore
        END;
        
        BEGIN
            ALTER PUBLICATION supabase_realtime ADD TABLE counters;
        EXCEPTION WHEN duplicate_object THEN
            -- Already added, ignore
        END;
    END IF;
END $$;

-- Step 11: Fix any existing data issues
-- Update user_profiles to ensure all have valid roles
UPDATE user_profiles 
SET role = 'public' 
WHERE role NOT IN ('admin', 'counter_staff') OR role IS NULL;

-- Ensure email is not null
UPDATE user_profiles 
SET email = COALESCE(email, 'unknown@example.com')
WHERE email IS NULL;

-- Step 12: Verification queries (run these to check)
-- Uncomment to run verification:
/*
-- Check all tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('services', 'counters', 'tickets', 'user_profiles', 'audit_logs')
ORDER BY table_name;

-- Check RLS is enabled
SELECT tablename, rowsecurity FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('services', 'counters', 'tickets', 'user_profiles', 'audit_logs');

-- Check policies exist
SELECT schemaname, tablename, policyname FROM pg_policies 
WHERE schemaname = 'public' 
ORDER BY tablename, policyname;

-- Check indexes exist
SELECT tablename, indexname FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename IN ('services', 'counters', 'tickets', 'user_profiles')
ORDER BY tablename, indexname;
*/

-- =====================================================
-- Script completed!
-- =====================================================
-- Next steps:
-- 1. Verify tables exist in Table Editor
-- 2. Check RLS policies are enabled (should see badges in Table Editor)
-- 3. Enable Realtime manually if needed:
--    - Go to Database > Replication
--    - Enable for 'tickets' and 'counters' tables
-- 4. Test the application
-- =====================================================

