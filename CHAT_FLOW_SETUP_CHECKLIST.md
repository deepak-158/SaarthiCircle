# Quick Setup Checklist - Chat Flow Fix

## 🚀 What's New

✅ **New Conversations Endpoint** - Caregivers can fetch active conversations
✅ **Accept Returns Conversation ID** - Frontend now knows which chat to open
✅ **Start In-App Chat Button** - One-click from interaction screen to chat
✅ **Proper RLS Policies** - Access control for conversations & messages
✅ **Messages Table** - Stores chat history

---

## ⚙️ Required Database Setup

### Step 1: Run Conversations Table Setup (REQUIRED)

**File**: `server/SETUP_CONVERSATIONS_TABLE.sql`

1. Open Supabase SQL Editor: https://app.supabase.com
2. Create new query
3. Copy-paste entire content from the file
4. Click **Run**
5. Should see: "Query successful" ✅

### Step 2: Update Help Requests Table (RECOMMENDED)

**File**: `server/SETUP_HELP_REQUESTS_TABLE.sql`

1. Create new query in Supabase
2. Copy-paste entire content
3. Click **Run**
4. Should see: "Query successful" ✅

**Why**: Updates RLS policies to ensure caregivers can see all pending requests

---

## ▶️ Start Backend

```bash
cd server
npm run dev
```

Backend should auto-reload with nodemon watching changes.

---

## ✅ Test Checklist

### Phase 1: Senior Requests Chat
- [ ] Senior logs in
- [ ] Senior navigates to Companions
- [ ] Senior clicks "Text Chat"
- [ ] Frontend shows "Searching for volunteers..."
- [ ] Backend logs show `seeker:request` event received

### Phase 2: Caregiver Views Dashboard
- [ ] Caregiver logs in
- [ ] Caregiver opens dashboard/CaregiverDashboard
- [ ] Caregiver sees pending request **OR** calls GET `/help-requests`
- [ ] Verify senior details shown

### Phase 3: Caregiver Accepts
- [ ] Caregiver clicks "Accept" button
- [ ] Backend logs should show:
  - `[REQUEST] Accepting help request...`
  - `[REQUEST] Creating/using conversation...`
  - `[REQUEST] Notified senior of accepted request`
- [ ] Frontend navigates to CaregiverInteractionScreen
- [ ] Screen shows senior details

### Phase 4: Start Chat
- [ ] Caregiver clicks "Start In-App Chat" button
- [ ] ChatScreen opens with senior
- [ ] Can send/receive messages
- [ ] Messages persist in database

### Phase 5: Verify Active Conversations
- [ ] Call GET `/conversations` for caregiver user ID
- [ ] Should return conversation object with senior info
- [ ] Call for senior user ID
- [ ] Should return same conversation from senior side

---

## 🔧 Verify Database Tables

### In Supabase Console

1. Go to **SQL Editor**
2. Run this query:

```sql
-- Check if tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('conversations', 'messages', 'help_requests');
```

Should return 3 rows:
- [ ] conversations
- [ ] messages  
- [ ] help_requests

### Check RLS Policies

1. In Supabase, go to **Authentication** → **Policies**
2. For each table, verify policies exist:
   - conversations: 4 policies
   - messages: 3 policies
   - help_requests: 4 policies

---

## 🐛 Debugging Commands

### Check Pending Requests
```bash
curl -X GET http://localhost:3001/help-requests \
  -H "Authorization: Bearer {USER_TOKEN}"
```

### Check Active Conversations
```bash
curl -X GET http://localhost:3001/conversations \
  -H "Authorization: Bearer {CAREGIVER_TOKEN}"
```

### Accept Request
```bash
curl -X PUT http://localhost:3001/help-requests/{REQUEST_ID}/accept \
  -H "Authorization: Bearer {CAREGIVER_TOKEN}"
```

Should return:
```json
{
  "request": {...},
  "conversationId": "uuid-here"
}
```

---

## 📊 Backend Log Format

Watch for these in terminal:

```
[DEBUG] Caregiver viewing pending requests (status=pending filter applied)
[DEBUG] Query successful, found 1 requests

[REQUEST] Accepting help request abc-123 by volunteer xyz-789
[REQUEST] Successfully accepted, creating conversation
[REQUEST] Created new conversation conv-abc
[REQUEST] Wiring sockets to room conv:conv-abc
[REQUEST] Notified senior of accepted request
[REQUEST] Notified volunteer of accepted request
```

---

## 📲 Screen Navigation Flow

```
CaregiverDashboard (Pending Requests)
        ↓ [Accept]
CaregiverInteractionScreen (Senior Details)
        ↓ [Start In-App Chat]
ChatScreen (Messaging)
```

---

## ⚡ Common Issues & Fixes

| Issue | Cause | Fix |
|-------|-------|-----|
| "Found 0 requests" | Tables don't exist | Run SETUP_CONVERSATIONS_TABLE.sql |
| "Cannot coerce JSON" | DB query issue | Verify RLS policies |
| "conversation not initialized" | conversationId null | Check accept response in logs |
| Chat won't open | Navigation missing | Verify Chat screen in navigator |
| RLS errors | Wrong user ID | Verify auth.uid() matches database IDs |

---

## 📝 Files Changed

### Backend
- `server/src/index.js` - Added `/conversations` endpoint, updated `/accept`

### Database
- `server/SETUP_CONVERSATIONS_TABLE.sql` - NEW file (run this in Supabase)
- `server/SETUP_HELP_REQUESTS_TABLE.sql` - Updated RLS policies

### Frontend
- `src/screens/caregiver/CaregiverDashboard.js` - Extract & pass conversationId
- `src/screens/caregiver/CaregiverInteractionScreen.js` - Add in-app chat button

---

## ✨ After Setup

The complete flow now works:

```
Senior Click "Text Chat"
        ↓
Request sent to backend
        ↓
Caregiver sees pending request
        ↓
Caregiver clicks Accept
        ↓
Conversation created in DB
        ↓
Frontend receives conversationId
        ↓
Caregiver sees "Start In-App Chat" button
        ↓
Caregiver clicks button
        ↓
ChatScreen opens with senior
        ↓
Messages flow in real-time ✅
```

---

**Last Updated**: January 25, 2026
**Status**: Ready for testing ✅
