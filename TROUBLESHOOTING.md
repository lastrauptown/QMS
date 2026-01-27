# Troubleshooting Black Screen Issue

If you're seeing a black screen, follow these steps:

## Step 1: Check Browser Console

1. Open your browser (Chrome/Firefox/Edge)
2. Press **F12** to open Developer Tools
3. Click on the **Console** tab
4. Look for any **red error messages**
5. Take a screenshot or copy the errors

## Step 2: Check Network Tab

1. In Developer Tools, click the **Network** tab
2. Refresh the page (F5)
3. Look for any failed requests (red status codes)
4. Check if `localhost:5173` is loading

## Step 3: Verify Dev Server is Running

Open a new terminal and check:

```powershell
# Check if port 5173 is in use
netstat -ano | findstr :5173
```

If nothing shows, the server isn't running. Start it with:
```powershell
npm run dev
```

## Step 4: Check Environment Variables

Visit: **http://localhost:5173/debug**

This page will show:
- If environment variables are loaded
- If Supabase connection works
- Any connection errors

## Step 5: Common Issues

### Issue: "Invalid API key"
- **Solution**: The anon key format looks unusual. Supabase keys are typically JWT tokens.
- Check your Supabase Dashboard > Settings > API
- Make sure you're copying the **anon/public** key, not the service_role key

### Issue: "Row Level Security policy violation"
- **Solution**: Make sure you've created the admin profile:
```sql
INSERT INTO user_profiles (id, email, role, name)
VALUES (
    '68a63320-11cd-44db-9232-da0287787e7c',
    'admin@sanpedro.com',
    'admin',
    'Admin User'
);
```

### Issue: Blank/Black Screen
- **Solution**: 
  1. Check browser console for errors
  2. Try visiting `/debug` page directly
  3. Try visiting `/display` page (doesn't require login)
  4. Clear browser cache and hard refresh (Ctrl+Shift+R)

### Issue: Dev Server Won't Start
- **Solution**:
```powershell
# Kill any existing node processes
taskkill /F /IM node.exe

# Restart
npm run dev
```

## Step 6: Test Direct Routes

Try these URLs directly:
- http://localhost:5173/debug - Debug page
- http://localhost:5173/display - Public display (no login)
- http://localhost:5173/ticket - Ticket creation (no login)
- http://localhost:5173/login - Login page

If these work but the root page doesn't, it's an auth issue.

## Step 7: Verify Supabase Key Format

Your anon key starts with `sb_publishable_` which is unusual. Standard Supabase anon keys are JWT tokens that look like:
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndrY2Jkcm9ua2FmZXZkd3Jpb2xiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzNDk3MDYsImV4cCI6MjA4MDkyNTcwNn0...
```

**Check your Supabase Dashboard:**
1. Go to Settings > API
2. Under "Project API keys"
3. Copy the **anon public** key (not service_role)
4. It should be a long JWT token

## Still Having Issues?

1. Share the browser console errors
2. Share what you see on `/debug` page
3. Verify the Supabase project is active and accessible

