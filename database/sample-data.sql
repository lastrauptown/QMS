-- Sample data for Queue Management System
-- Run this after setting up the schema

-- Sample Services (Updated to Generic Names)
INSERT INTO services (code, name, description, is_active) VALUES
('S1', 'Service 1', 'General Service 1', true),
('S2', 'Service 2', 'General Service 2', true),
('S3', 'Service 3', 'General Service 3', true),
('S4', 'Service 4', 'General Service 4', true),
('S5', 'Service 5', 'General Service 5', true)
ON CONFLICT (code) DO UPDATE SET 
    name = EXCLUDED.name, 
    description = EXCLUDED.description;

-- Sample Counters (assuming services exist)
-- Link counters to services dynamically based on code
INSERT INTO counters (name, service_id, is_active)
SELECT 'Counter 1', id, true FROM services WHERE code = 'S1'
UNION ALL
SELECT 'Counter 2', id, true FROM services WHERE code = 'S1'
UNION ALL
SELECT 'Counter 3', id, true FROM services WHERE code = 'S2'
UNION ALL
SELECT 'Counter 4', id, true FROM services WHERE code = 'S2'
UNION ALL
SELECT 'Counter 5', id, true FROM services WHERE code = 'S3'
UNION ALL
SELECT 'Counter 6', id, true FROM services WHERE code = 'S4'
UNION ALL
SELECT 'Counter 7', id, true FROM services WHERE code = 'S5'
ON CONFLICT DO NOTHING;

-- Note: User profiles should be created after users are created in Supabase Auth
