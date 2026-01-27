-- Update services to use generic names (Service 1, Service 2, etc.)
-- Run this in your Supabase SQL Editor

-- Upsert services (Update if exists, Insert if not)
INSERT INTO services (code, name, description, is_active)
VALUES 
    ('S1', 'Service 1', 'General Service 1', true),
    ('S2', 'Service 2', 'General Service 2', true),
    ('S3', 'Service 3', 'General Service 3', true),
    ('S4', 'Service 4', 'General Service 4', true),
    ('S5', 'Service 5', 'General Service 5', true)
ON CONFLICT (code) 
DO UPDATE SET 
    name = EXCLUDED.name, 
    description = EXCLUDED.description,
    is_active = EXCLUDED.is_active;

-- Optional: Update counters to ensure they have generic names too (if desired)
-- UPDATE counters SET name = 'Counter 1' WHERE name ILIKE '%1%';
-- UPDATE counters SET name = 'Counter 2' WHERE name ILIKE '%2%';
