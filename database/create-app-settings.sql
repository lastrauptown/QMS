-- Create app_settings table
CREATE TABLE IF NOT EXISTS app_settings (
    key VARCHAR(255) PRIMARY KEY,
    value TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Policies

-- Public read access (for display screen)
DROP POLICY IF EXISTS "Public can view app_settings" ON app_settings;
CREATE POLICY "Public can view app_settings" ON app_settings FOR SELECT USING (true);

-- Admin full access
DROP POLICY IF EXISTS "Admins can manage app_settings" ON app_settings;
CREATE POLICY "Admins can manage app_settings" ON app_settings FOR ALL USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Enable Realtime for app_settings
ALTER PUBLICATION supabase_realtime ADD TABLE app_settings;
