# Role Simplification - Admin & Counter Staff Only

## Changes Made

We've simplified the role system to **only two roles**:

1. **`admin`** - Full system access, can manage everything
2. **`counter_staff`** - Staff who work at counters, can manage their assigned counter

## Why Remove 'public' Role?

- ✅ **Public users don't need accounts** - They just view the display screen (no login required)
- ✅ **Clearer role assignment** - Admins explicitly assign roles when creating users
- ✅ **Prevents confusion** - No more accidental 'public' role assignments
- ✅ **Better security** - Only authenticated users with proper roles can access the system

## Migration Steps

### 1. Run the Migration Script

**File: `database/remove-public-role.sql`**

This script will:
- ✅ Update any existing 'public' roles to 'counter_staff' (you can reassign to admin later if needed)
- ✅ Remove 'public' from the role constraint
- ✅ Update the trigger function to not auto-create profiles
- ✅ Show verification of all users and their roles

### 2. Update Your Admin Account

After running the migration, make sure your admin account has the correct role:

```sql
UPDATE user_profiles 
SET role = 'admin' 
WHERE email = 'admin@sanpedro.com';
```

### 3. Verify

```sql
SELECT email, role FROM user_profiles;
```

All users should now have either `admin` or `counter_staff` role.

## Creating New Users

**Important:** The system no longer auto-creates user profiles. When creating new users:

1. **Create user in Supabase Auth** (Dashboard → Authentication → Add User)
2. **Create profile in `user_profiles` table** with proper role:
   ```sql
   INSERT INTO user_profiles (id, email, role, name)
   VALUES ('USER_UUID_FROM_AUTH', 'user@example.com', 'counter_staff', 'User Name');
   ```
3. **Or use the Admin Dashboard** - The Users tab in `/admin` can create profiles for existing auth users

## Files Updated

- ✅ `database/schema.sql` - Removed 'public' from role constraint
- ✅ `database/fix-database.sql` - Updated constraint and trigger function
- ✅ `src/lib/stores/auth.ts` - Updated TypeScript type definition
- ✅ `src/routes/login/+page.svelte` - Updated error handling for invalid roles

## Benefits

1. **Simpler system** - Only two roles to manage
2. **Better security** - Explicit role assignment
3. **Clearer intent** - Each user has a specific purpose
4. **Easier maintenance** - Less confusion about role purposes

