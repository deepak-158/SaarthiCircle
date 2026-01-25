# Fix: Help Requests Table Missing

## Problem
The `/help-requests` endpoint returns a 500 error because the `help_requests` table doesn't exist in Supabase.

## Solution

### Step 1: Open Supabase SQL Editor
1. Go to https://app.supabase.com
2. Select your **SaarthiCircle** project
3. Click **SQL Editor** in the left sidebar
4. Click **New Query**

### Step 2: Copy the SQL
Open the file `server/SETUP_HELP_REQUESTS_TABLE.sql` and copy all the SQL code.

### Step 3: Paste and Execute
1. Paste the SQL into the query editor in Supabase
2. Click **Run** (or press Ctrl+Enter)
3. Wait for confirmation that the table was created

### Step 4: Verify
In Supabase, go to **Database** → **Tables** and verify you see:
- `help_requests` table with columns:
  - id (UUID)
  - senior_id (UUID)
  - volunteer_id (UUID)
  - category (text)
  - description (text)
  - priority (text)
  - status (text)
  - created_at (timestamp)
  - accepted_at (timestamp)
  - completed_at (timestamp)
  - updated_at (timestamp)

### Step 5: Restart Backend
```bash
# Kill the current backend process and restart
cd server
npm run dev
```

## What Was Fixed
- Created `help_requests` table with proper schema
- Added indexes for faster queries
- Added Row Level Security (RLS) policies for data access control
- Backend now gracefully handles table creation status and provides helpful error messages

## Next Steps
Once the table is created:
1. The `/help-requests` endpoint will work
2. CaregiverDashboard will load help requests
3. All chat request features will function properly

If you still get errors, check:
- The table name is `public.help_requests` (not just `help_requests`)
- All columns exist with correct types
- The backend server has been restarted
