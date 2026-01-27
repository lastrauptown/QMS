-- 1. Create the 'videos' bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('videos', 'videos', true)
ON CONFLICT (id) DO NOTHING;

-- NOTE: storage.objects already has RLS enabled by default in Supabase.
-- We removed the ALTER TABLE command that was causing the permission error.

-- 2. Create policies for the 'videos' bucket

-- Allow public access to view files in the 'videos' bucket
DROP POLICY IF EXISTS "Public Videos View" ON storage.objects;
CREATE POLICY "Public Videos View"
ON storage.objects FOR SELECT
USING ( bucket_id = 'videos' );

-- Allow authenticated users (Admins/Staff) to upload files to 'videos' bucket
DROP POLICY IF EXISTS "Authenticated Videos Upload" ON storage.objects;
CREATE POLICY "Authenticated Videos Upload"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'videos' AND auth.role() = 'authenticated' );

-- Allow authenticated users to update/delete files in 'videos' bucket
DROP POLICY IF EXISTS "Authenticated Videos Update" ON storage.objects;
CREATE POLICY "Authenticated Videos Update"
ON storage.objects FOR UPDATE
USING ( bucket_id = 'videos' AND auth.role() = 'authenticated' );

DROP POLICY IF EXISTS "Authenticated Videos Delete" ON storage.objects;
CREATE POLICY "Authenticated Videos Delete"
ON storage.objects FOR DELETE
USING ( bucket_id = 'videos' AND auth.role() = 'authenticated' );
