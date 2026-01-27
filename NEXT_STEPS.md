# Next Steps - You're Almost Done! ✅

Great progress! You've completed:
- ✅ Database schema setup
- ✅ Admin user created (`admin@sanpedro.com`)

## Step 1: Create Admin Profile (IMPORTANT!)

You need to add a profile record for your admin user. In Supabase SQL Editor, run:

```sql
INSERT INTO user_profiles (id, email, role, name)
VALUES (
    '68a63320-11cd-44db-9232-da0287787e7c',
    'admin@sanpedro.com',
    'admin',
    'Admin User'
);
```

Or copy the contents of `create-admin-profile.sql` and run it.

## Step 2: Enable Realtime (NOT Replication)

**Important**: The "Replication" page you saw is for external data warehouses. For realtime updates in the app, you need to enable Realtime on tables.

1. Go to **Database** > **Tables** in your Supabase dashboard
2. Click on the **`tickets`** table
3. Look for a **"Realtime"** toggle or section
4. Enable Realtime for the `tickets` table
5. Do the same for the **`counters`** table

**Alternative method** (if Realtime toggle isn't visible):
- Go to **Database** > **Publications** 
- Check if there's a `supabase_realtime` publication
- If not, you may need to enable it via SQL:

```sql
-- Enable Realtime for tickets table
ALTER PUBLICATION supabase_realtime ADD TABLE tickets;

-- Enable Realtime for counters table  
ALTER PUBLICATION supabase_realtime ADD TABLE counters;
```

## Step 3: Add Sample Data (Optional but Recommended)

Run this in SQL Editor to create test services and counters:

```sql
-- Sample Services
INSERT INTO services (code, name, description, is_active) VALUES
('S1', 'Service 1', 'General Service - Document Processing', true),
('S2', 'Service 2', 'Payment Processing', true),
('S3', 'Service 3', 'Information Desk', true)
ON CONFLICT (code) DO NOTHING;

-- Sample Counters
INSERT INTO counters (name, service_id, is_active)
SELECT 'Counter 1', id, true FROM services WHERE code = 'S1'
UNION ALL
SELECT 'Counter 2', id, true FROM services WHERE code = 'S1'
UNION ALL
SELECT 'Counter 3', id, true FROM services WHERE code = 'S2'
ON CONFLICT DO NOTHING;
```

## Step 4: Get Service Role Key

1. Go to **Settings** > **API** in Supabase dashboard
2. Find the **"service_role"** key (it's a long string)
3. Copy it
4. Update your `.env` file and replace `your_service_role_key_here` with the actual key

## Step 5: Start the Application

```bash
npm run dev
```

Then open `http://localhost:5173`

## Step 6: Log In

- Email: `admin@sanpedro.com`
- Password: (the password you set when creating the user)

## 🎉 You Should Now See:

- Admin dashboard with Services, Counters, Analytics tabs
- Ability to create/edit services and counters
- Public display at `/display`
- Ticket creation at `/ticket`

## Troubleshooting

### "Row Level Security policy violation"
- Make sure you ran the admin profile SQL (Step 1)
- Verify the user UID matches exactly

### Realtime not working
- Make sure you enabled Realtime on tables (Step 2)
- Check browser console for WebSocket errors
- Verify Supabase URL in `.env` is correct

### Can't log in
- Verify user profile exists (run Step 1 SQL)
- Check that user is confirmed (should show "Confirmed at" in user details)

