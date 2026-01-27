-- =====================================================
-- QMS Enhanced Database Schema
-- Includes: Roles table, Permissions, Settings, and more
-- Run this AFTER fix-database.sql if you want enhanced features
-- =====================================================

-- =====================================================
-- PART 1: ROLES AND PERMISSIONS SYSTEM
-- =====================================================

-- Roles table (replaces hardcoded role strings)
CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(20) UNIQUE NOT NULL, -- 'admin', 'counter_staff', 'public'
    name VARCHAR(100) NOT NULL, -- 'Administrator', 'Counter Staff', 'Public User'
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Permissions table (defines what actions can be performed)
CREATE TABLE IF NOT EXISTS permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL, -- 'services.create', 'tickets.view_all', etc.
    name VARCHAR(100) NOT NULL,
    description TEXT,
    resource VARCHAR(50) NOT NULL, -- 'services', 'tickets', 'counters', 'users'
    action VARCHAR(50) NOT NULL, -- 'create', 'read', 'update', 'delete', 'manage'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Role-Permission mapping (many-to-many)
CREATE TABLE IF NOT EXISTS role_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(role_id, permission_id)
);

-- Indexes for roles and permissions
CREATE INDEX IF NOT EXISTS idx_roles_code ON roles(code);
CREATE INDEX IF NOT EXISTS idx_permissions_code ON permissions(code);
CREATE INDEX IF NOT EXISTS idx_permissions_resource ON permissions(resource);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission ON role_permissions(permission_id);

-- =====================================================
-- PART 2: SYSTEM SETTINGS
-- =====================================================

-- System settings table (for configuration)
CREATE TABLE IF NOT EXISTS system_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(100) UNIQUE NOT NULL,
    value TEXT,
    type VARCHAR(20) DEFAULT 'string' CHECK (type IN ('string', 'number', 'boolean', 'json')),
    description TEXT,
    category VARCHAR(50) DEFAULT 'general', -- 'queue', 'display', 'notifications', 'general'
    is_public BOOLEAN DEFAULT false, -- Can be read by public users
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(key);
CREATE INDEX IF NOT EXISTS idx_system_settings_category ON system_settings(category);

-- =====================================================
-- PART 3: NOTIFICATIONS SYSTEM
-- =====================================================

-- Notifications table (for system notifications)
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(20) DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error')),
    is_read BOOLEAN DEFAULT false,
    link VARCHAR(255), -- Optional link to related page
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at);

-- =====================================================
-- PART 4: QUEUE CONFIGURATION
-- =====================================================

-- Queue settings per service (customizable queue behavior)
CREATE TABLE IF NOT EXISTS service_queue_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service_id UUID REFERENCES services(id) ON DELETE CASCADE,
    max_wait_time INTEGER DEFAULT 60, -- Maximum wait time in minutes
    estimated_service_time INTEGER DEFAULT 5, -- Estimated service time in minutes
    max_queue_length INTEGER, -- Maximum queue length (NULL = unlimited)
    auto_reset_daily BOOLEAN DEFAULT true,
    reset_time TIME DEFAULT '00:00:00', -- Time to reset queue daily
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(service_id)
);

CREATE INDEX IF NOT EXISTS idx_service_queue_settings_service ON service_queue_settings(service_id);

-- =====================================================
-- PART 5: UPDATE USER_PROFILES TO USE ROLES TABLE
-- =====================================================

-- Add role_id column to user_profiles (keeping role for backward compatibility)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'role_id') THEN
        ALTER TABLE user_profiles ADD COLUMN role_id UUID REFERENCES roles(id) ON DELETE SET NULL;
        CREATE INDEX IF NOT EXISTS idx_user_profiles_role_id ON user_profiles(role_id);
    END IF;
END $$;

-- =====================================================
-- PART 6: ACTIVITY LOG (Enhanced audit)
-- =====================================================

-- Add more fields to audit_logs if needed
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'ip_address') THEN
        ALTER TABLE audit_logs ADD COLUMN ip_address VARCHAR(45);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'user_agent') THEN
        ALTER TABLE audit_logs ADD COLUMN user_agent TEXT;
    END IF;
END $$;

-- =====================================================
-- PART 7: INSERT DEFAULT DATA
-- =====================================================

-- Insert default roles
INSERT INTO roles (code, name, description, is_active) VALUES
('admin', 'Administrator', 'Full system access with all permissions', true),
('counter_staff', 'Counter Staff', 'Can manage assigned counter and tickets', true),
('public', 'Public User', 'Read-only access to display and ticket creation', true)
ON CONFLICT (code) DO UPDATE SET 
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    updated_at = NOW();

-- Insert default permissions
INSERT INTO permissions (code, name, description, resource, action) VALUES
-- Services permissions
('services.view', 'View Services', 'View all services', 'services', 'read'),
('services.create', 'Create Services', 'Create new services', 'services', 'create'),
('services.update', 'Update Services', 'Update existing services', 'services', 'update'),
('services.delete', 'Delete Services', 'Delete services', 'services', 'delete'),
-- Counters permissions
('counters.view', 'View Counters', 'View all counters', 'counters', 'read'),
('counters.create', 'Create Counters', 'Create new counters', 'counters', 'create'),
('counters.update', 'Update Counters', 'Update existing counters', 'counters', 'update'),
('counters.delete', 'Delete Counters', 'Delete counters', 'counters', 'delete'),
-- Tickets permissions
('tickets.view', 'View Tickets', 'View tickets', 'tickets', 'read'),
('tickets.view_all', 'View All Tickets', 'View all tickets across all counters', 'tickets', 'read'),
('tickets.create', 'Create Tickets', 'Create new tickets', 'tickets', 'create'),
('tickets.update', 'Update Tickets', 'Update ticket status', 'tickets', 'update'),
('tickets.manage', 'Manage Tickets', 'Full ticket management (call, serve, skip, transfer)', 'tickets', 'update'),
-- Users permissions
('users.view', 'View Users', 'View user profiles', 'users', 'read'),
('users.view_all', 'View All Users', 'View all user profiles', 'users', 'read'),
('users.create', 'Create Users', 'Create new users', 'users', 'create'),
('users.update', 'Update Users', 'Update user profiles', 'users', 'update'),
('users.delete', 'Delete Users', 'Delete users', 'users', 'delete'),
('users.assign_counters', 'Assign Counters', 'Assign counters to counter staff', 'users', 'update'),
-- Analytics permissions
('analytics.view', 'View Analytics', 'View system analytics', 'analytics', 'read'),
('analytics.view_all', 'View All Analytics', 'View analytics for all counters', 'analytics', 'read'),
-- Settings permissions
('settings.view', 'View Settings', 'View system settings', 'settings', 'read'),
('settings.update', 'Update Settings', 'Update system settings', 'settings', 'update'),
-- Audit permissions
('audit.view', 'View Audit Logs', 'View audit logs', 'audit', 'read')
ON CONFLICT (code) DO NOTHING;

-- Assign permissions to roles
-- Admin gets all permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.code = 'admin'
ON CONFLICT DO NOTHING;

-- Counter staff permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.code = 'counter_staff'
AND p.code IN (
    'services.view',
    'counters.view',
    'tickets.view',
    'tickets.create',
    'tickets.update',
    'tickets.manage',
    'users.view',
    'analytics.view'
)
ON CONFLICT DO NOTHING;

-- Public permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.code = 'public'
AND p.code IN (
    'services.view',
    'counters.view',
    'tickets.view',
    'tickets.create'
)
ON CONFLICT DO NOTHING;

-- Insert default system settings
INSERT INTO system_settings (key, value, type, description, category, is_public) VALUES
('app_name', 'Queue Management System', 'string', 'Application name', 'general', true),
('organization_name', 'City of San Pedro, Laguna', 'string', 'Organization name', 'general', true),
('max_tickets_per_service', '999', 'number', 'Maximum tickets per service per day', 'queue', false),
('sound_enabled', 'true', 'boolean', 'Enable sound notifications', 'display', true),
('display_refresh_interval', '5', 'number', 'Display refresh interval in seconds', 'display', false),
('auto_reset_queue', 'true', 'boolean', 'Automatically reset queue daily', 'queue', false),
('queue_reset_time', '00:00:00', 'string', 'Time to reset queue daily (HH:MM:SS)', 'queue', false),
('enable_notifications', 'true', 'boolean', 'Enable system notifications', 'notifications', false)
ON CONFLICT (key) DO UPDATE SET 
    updated_at = NOW();

-- =====================================================
-- PART 8: RLS POLICIES FOR NEW TABLES
-- =====================================================

-- Enable RLS on new tables
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_queue_settings ENABLE ROW LEVEL SECURITY;

-- Roles policies (everyone can view, only admins can modify)
DROP POLICY IF EXISTS "Public can view roles" ON roles;
CREATE POLICY "Public can view roles" ON roles FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins can manage roles" ON roles;
CREATE POLICY "Admins can manage roles" ON roles FOR ALL USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Permissions policies
DROP POLICY IF EXISTS "Public can view permissions" ON permissions;
CREATE POLICY "Public can view permissions" ON permissions FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins can manage permissions" ON permissions;
CREATE POLICY "Admins can manage permissions" ON permissions FOR ALL USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Role-permissions policies
DROP POLICY IF EXISTS "Public can view role_permissions" ON role_permissions;
CREATE POLICY "Public can view role_permissions" ON role_permissions FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins can manage role_permissions" ON role_permissions;
CREATE POLICY "Admins can manage role_permissions" ON role_permissions FOR ALL USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
);

-- System settings policies
DROP POLICY IF EXISTS "Public can view public settings" ON system_settings;
CREATE POLICY "Public can view public settings" ON system_settings FOR SELECT USING (is_public = true);
DROP POLICY IF EXISTS "Authenticated can view settings" ON system_settings;
CREATE POLICY "Authenticated can view settings" ON system_settings FOR SELECT USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Admins can manage settings" ON system_settings;
CREATE POLICY "Admins can manage settings" ON system_settings FOR ALL USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Notifications policies
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
CREATE POLICY "Users can view own notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "System can create notifications" ON notifications;
CREATE POLICY "System can create notifications" ON notifications FOR INSERT WITH CHECK (true);

-- Service queue settings policies
DROP POLICY IF EXISTS "Public can view service_queue_settings" ON service_queue_settings;
CREATE POLICY "Public can view service_queue_settings" ON service_queue_settings FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins can manage service_queue_settings" ON service_queue_settings;
CREATE POLICY "Admins can manage service_queue_settings" ON service_queue_settings FOR ALL USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
);

-- =====================================================
-- PART 9: HELPER FUNCTIONS
-- =====================================================

-- Function to check if user has permission
CREATE OR REPLACE FUNCTION has_permission(user_id UUID, permission_code VARCHAR)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM user_profiles up
        JOIN roles r ON r.code = up.role OR r.id = up.role_id
        JOIN role_permissions rp ON rp.role_id = r.id
        JOIN permissions p ON p.id = rp.permission_id
        WHERE up.id = user_id
        AND p.code = permission_code
        AND r.is_active = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's role code
CREATE OR REPLACE FUNCTION get_user_role(user_id UUID)
RETURNS VARCHAR AS $$
DECLARE
    user_role VARCHAR;
BEGIN
    SELECT COALESCE(r.code, up.role) INTO user_role
    FROM user_profiles up
    LEFT JOIN roles r ON r.id = up.role_id
    WHERE up.id = user_id;
    
    RETURN user_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to sync role_id with role string (for backward compatibility)
CREATE OR REPLACE FUNCTION sync_user_role_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.role_id IS NULL AND NEW.role IS NOT NULL THEN
        SELECT id INTO NEW.role_id
        FROM roles
        WHERE code = NEW.role
        LIMIT 1;
    END IF;
    
    IF NEW.role_id IS NOT NULL AND NEW.role IS NULL THEN
        SELECT code INTO NEW.role
        FROM roles
        WHERE id = NEW.role_id
        LIMIT 1;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to sync role_id and role
DROP TRIGGER IF EXISTS sync_user_role_trigger ON user_profiles;
CREATE TRIGGER sync_user_role_trigger
    BEFORE INSERT OR UPDATE ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION sync_user_role_id();

-- =====================================================
-- PART 10: UPDATE EXISTING USER_PROFILES
-- =====================================================

-- Sync existing user_profiles with roles table
UPDATE user_profiles up
SET role_id = r.id
FROM roles r
WHERE r.code = up.role
AND up.role_id IS NULL;

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '✅ Enhanced schema created successfully!';
    RAISE NOTICE '✅ Roles, permissions, and settings tables added';
    RAISE NOTICE '✅ Default data inserted';
    RAISE NOTICE '✅ RLS policies configured';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Verify tables in Table Editor';
    RAISE NOTICE '2. Check roles and permissions data';
    RAISE NOTICE '3. Test the application';
END $$;

