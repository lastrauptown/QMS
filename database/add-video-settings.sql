-- Create a table for application settings
CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable RLS
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Allow public read access" ON app_settings
    FOR SELECT USING (true);

-- Allow authenticated users (admin) to update
CREATE POLICY "Allow admin update" ON app_settings
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Allow admin insert
CREATE POLICY "Allow admin insert" ON app_settings
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Insert default video setting if not exists
INSERT INTO app_settings (key, value)
VALUES ('display_video_url', '/BOYSEN Celso Episode 1 Celso - BOYSEN Paints (720p, h264).mp4')
ON CONFLICT (key) DO NOTHING;

-- Create storage bucket for videos
-- Note: You might need to create this in the Supabase Dashboard > Storage
-- if this SQL script doesn't work for storage creation (it's a different API).
INSERT INTO storage.buckets (id, name, public)
VALUES ('videos', 'videos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Public Access" ON storage.objects
  FOR SELECT USING (bucket_id = 'videos');

CREATE POLICY "Admin Upload" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'videos' AND auth.role() = 'authenticated');

CREATE POLICY "Admin Update" ON storage.objects
  FOR UPDATE USING (bucket_id = 'videos' AND auth.role() = 'authenticated');

CREATE POLICY "Admin Delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'videos' AND auth.role() = 'authenticated');
