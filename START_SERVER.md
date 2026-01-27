# How to Start the QMS Server

## Quick Start

1. **Open a terminal/PowerShell in the QMS folder**

2. **Run this command:**
   ```powershell
   npm run dev
   ```

3. **Wait for the message:**
   ```
   VITE v5.x.x  ready in xxx ms
   
   ➜  Local:   http://localhost:5173/
   ➜  Network: use --host to expose
   ```

4. **Open your browser and go to:**
   - http://localhost:5173

## If Port 5173 is Already in Use

The server will automatically try the next available port (5174, 5175, etc.)

Check the terminal output to see which port it's using.

## Troubleshooting

### "Connection Refused" Error

1. **Make sure the server is running:**
   - Check the terminal where you ran `npm run dev`
   - You should see "VITE ready" message
   - If not, there might be an error - read the terminal output

2. **Kill any existing Node processes:**
   ```powershell
   Get-Process | Where-Object {$_.ProcessName -eq "node"} | Stop-Process -Force
   ```
   Then try starting again: `npm run dev`

3. **Check if another app is using port 5173:**
   ```powershell
   netstat -ano | findstr :5173
   ```

### Server Won't Start

1. **Reinstall dependencies:**
   ```powershell
   rm -r node_modules
   npm install
   ```

2. **Check for errors in terminal:**
   - Look for red error messages
   - Common issues: missing dependencies, syntax errors

3. **Verify Node.js version:**
   ```powershell
   node --version
   ```
   Should be 18+ (you have v24.11.1 - that's perfect!)

## Alternative: Use the PowerShell Script

I've created `start-server.ps1` - you can also run:
```powershell
.\start-server.ps1
```

## What to Expect

Once the server starts:
- Terminal shows "VITE ready" message
- Browser can access http://localhost:5173
- You'll see the QMS login page or be redirected based on auth status

## Still Having Issues?

1. Share the **exact error message** from the terminal
2. Check if `node_modules` folder exists (it should)
3. Verify `.env` file exists with Supabase credentials

