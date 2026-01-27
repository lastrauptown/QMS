-- Create user profile for UUID: d40a51c7-b0d5-474e-a96c-08d9284dbc45
-- Run this in Supabase SQL Editor

-- Option 1: Create Admin User Profile
INSERT INTO user_profiles (id, email, role, name)
VALUES (
    'd40a51c7-b0d5-474e-a96c-08d9284dbc45',
    'user@example.com',  -- Replace with actual email
    'admin',             -- or 'counter_staff' or 'public'
    'User Name'          -- Replace with actual name
)
ON CONFLICT (id) DO UPDATE
SET email = EXCLUDED.email,
    role = EXCLUDED.role,
    name = EXCLUDED.name;

-- Option 2: Create Counter Staff with Counter Assignment
-- First, get a counter ID (run this separately to find counter IDs):
-- SELECT id, name FROM counters;

-- Then use this (replace 'counter-id-here' with actual counter ID):
/*
INSERT INTO user_profiles (id, email, role, name, counter_id)
VALUES (
    'd40a51c7-b0d5-474e-a96c-08d9284dbc45',
    'staff@example.com',
    'counter_staff',
    'Staff Name',
    'counter-id-here'  -- Replace with actual counter UUID
)
ON CONFLICT (id) DO UPDATE
SET email = EXCLUDED.email,
    role = EXCLUDED.role,
    name = EXCLUDED.name,
    counter_id = EXCLUDED.counter_id;
*/


