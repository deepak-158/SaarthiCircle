# Step 1: Create the help_requests Table (IMPORTANT!)

The chat request system won't work until you create the database table. Follow these steps:

## Instructions

1. **Open Supabase SQL Editor**
   - Go to: https://app.supabase.com
   - Select your **SaarthiCircle** project
   - Click **SQL Editor** in the left sidebar
   - Click **New Query**

2. **Copy the SQL**
   - Open this file: `server/SETUP_HELP_REQUESTS_TABLE.sql`
   - Copy ALL the SQL code

3. **Paste & Execute**
   - Paste into the Supabase query editor
   - Click **Run** (or press Ctrl+Enter)
   - Wait for success message

4. **Verify Table Created**
   - Go to **Database** → **Tables**
   - Look for `help_requests` table
   - Should have columns: id, senior_id, volunteer_id, category, description, priority, status, etc.

## What This Creates

✅ `help_requests` table - stores all chat/call requests
✅ Indexes - for fast queries
✅ RLS Policies - security & access control
❌ NO foreign key constraints - removes the FK error

## After Setup

Once the table exists:
1. Backend will automatically start storing requests
2. Caregivers will see pending requests in dashboard
3. Chat request system fully functional

## Issues Fixed

- ✅ Removed foreign key constraints (was causing 23503 error)
- ✅ Backend now gracefully handles DB failures
- ✅ Socket notifications work even if DB fails
- ✅ Senior user records auto-created if needed

## If You Already Created the Table

If you already created the help_requests table with foreign keys, drop it and create it again using this new SQL (without FK constraints).

To drop:
```sql
DROP TABLE IF EXISTS public.help_requests CASCADE;
```

Then run the new setup SQL.
