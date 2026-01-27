-- Check what this UUID is used for: d40a51c7-b0d5-474e-a96c-08d9284dbc45
-- Run these queries in Supabase SQL Editor to find where this UUID is used

-- Check if it's a user in auth.users
SELECT id, email, created_at 
FROM auth.users 
WHERE id = 'd40a51c7-b0d5-474e-a96c-08d9284dbc45';

-- Check if it's in user_profiles
SELECT id, email, role, name, counter_id 
FROM user_profiles 
WHERE id = 'd40a51c7-b0d5-474e-a96c-08d9284dbc45';

-- Check if it's a counter ID
SELECT id, name, service_id, is_active 
FROM counters 
WHERE id = 'd40a51c7-b0d5-474e-a96c-08d9284dbc45';

-- Check if it's a service ID
SELECT id, code, name, description 
FROM services 
WHERE id = 'd40a51c7-b0d5-474e-a96c-08d9284dbc45';

-- Check if it's used as counter_id in tickets
SELECT id, ticket_number, status, counter_id, created_at 
FROM tickets 
WHERE counter_id = 'd40a51c7-b0d5-474e-a96c-08d9284dbc45';

-- Check if it's used as counter_id in user_profiles
SELECT id, email, role, name, counter_id 
FROM user_profiles 
WHERE counter_id = 'd40a51c7-b0d5-474e-a96c-08d9284dbc45';


