# Setup Service Role Key for User Creation

To enable creating users directly from the admin dashboard, you need to add your Supabase **Service Role Key** to your environment variables.

## ⚠️ Important Security Note

The Service Role Key has **full admin access** to your Supabase project. **Never expose it in client-side code** or commit it to public repositories. It's only used in server-side endpoints.

## Steps to Get Your Service Role Key

1. **Go to Supabase Dashboard**
   - Open your project: https://supabase.com/dashboard
   - Select your project

2. **Navigate to Settings**
   - Click **Settings** (gear icon) in the left sidebar
   - Click **API** in the settings menu

3. **Copy Service Role Key**
   - Find the **"service_role"** key (NOT the anon key)
   - Click the **eye icon** to reveal it
   - Click **Copy** to copy the key

4. **Add to Your .env File**

   Create or update your `.env` file in the project root:

   ```env
   # Supabase Public Keys (already set)
   PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

   # Service Role Key (add this - keep it secret!)
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
   ```

   **Example:**
   ```env
   PUBLIC_SUPABASE_URL=https://wkcbdronkafevdwriolb.supabase.co
   PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

5. **Restart Your Dev Server**

   After adding the key, restart your development server:

   ```bash
   # Stop the server (Ctrl+C)
   # Then restart
   npm run dev
   ```

## Verify It's Working

1. Go to Admin Dashboard → Users tab
2. Click "Add User"
3. Fill in the form:
   - Email
   - Password (min 6 characters)
   - Name
   - Role (Admin or Counter Staff)
   - Counter (if Counter Staff)
4. Click "Create Profile"

If you see an error about the service role key, double-check:
- ✅ The key is in `.env` (not `.env.example`)
- ✅ The variable name is exactly `SUPABASE_SERVICE_ROLE_KEY`
- ✅ You copied the **service_role** key (not anon key)
- ✅ You restarted the dev server after adding it

## What This Enables

With the service role key configured, admins can:
- ✅ Create new users directly from the dashboard
- ✅ Set passwords for new users
- ✅ Assign roles (admin or counter_staff)
- ✅ Assign counters to counter staff
- ✅ No need to go to Supabase Dashboard!

## Troubleshooting

### "Service role key not configured"
- Make sure `SUPABASE_SERVICE_ROLE_KEY` is in your `.env` file
- Restart the dev server after adding it
- Check for typos in the variable name

### "Failed to create user"
- Check that the email isn't already in use
- Ensure password is at least 6 characters
- Check browser console for detailed error messages

### Still having issues?
- Verify the service role key is correct in Supabase Dashboard
- Make sure your `.env` file is in the project root (same folder as `package.json`)
- Check that the `.env` file is not in `.gitignore` (it should be, but make sure it exists locally)

