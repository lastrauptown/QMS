# How to Push QMS to GitHub

Since Git is not currently installed on this system, you will need to install it first.

## Step 1: Install Git
1. Download Git from [git-scm.com](https://git-scm.com/download/win).
2. Install it (use default settings).
3. Restart your terminal or VS Code.

## Step 2: Initialize and Push
Open a terminal in this project folder (`C:\Users\MIS\Desktop\QMS`) and run these commands one by one:

```powershell
# 1. Initialize Git
git init

# 2. Add all files
git add .

# 3. Commit the code
git commit -m "Initial commit: Complete Queue Management System"

# 4. Rename branch to main
git branch -M main

# 5. Link to your repository
git remote add origin https://github.com/lastrauptown/QMS.git

# 6. Push the code
git push -u origin main
```

## Step 3: Deployment Checklist
- **Environment Variables**: The `.env` file is ignored for security. You must manually add your Supabase keys to your hosting provider (e.g., Vercel, Netlify) or create a `.env` file on the server.
- **Database**: Ensure your Supabase database has the required tables. Use the SQL files in the `database/` folder to set it up if needed.
