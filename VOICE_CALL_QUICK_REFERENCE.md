# Voice Call Feature - Quick Reference

## How It Works

### For Senior (Caller)
1. Open Chat with a Companion
2. Tap the **Phone Button** ☎️ in the top right
3. Wait for "Calling..." message
4. When volunteer answers: "Call Active" appears with duration
5. Tap **End Call** to disconnect
6. Returns to Chat screen

### For Volunteer (Receiver)
1. Receives **Push Notification**: "[Senior Name] is calling you"
2. Full-screen **Incoming Call Screen** appears
3. Shows caller name and options
4. Tap **Accept** ✓ to take call
5. Tap **Reject** ✗ to decline
6. If accepted: Enters **Call Active Screen**
7. Call shows duration timer
8. Tap **End Call** to disconnect

---

## Call States

| State | What It Means | What User Sees |
|-------|---------------|----------------|
| **Initiating** | Senior just clicked phone button | "Initiating call..." |
| **Ringing** | System finding volunteer | "Calling..." (pulsing avatar) |
| **Active** | Both are connected | "Call Active" + duration timer |
| **Rejected** | Volunteer said no | "Call rejected" (auto-dismisses) |
| **Ended** | Someone clicked end call | Screen returns to chat |
| **Failed** | Volunteer offline | "Volunteer not available" |

---

## Key Features

✅ **Call Only Specific Person**
- No broadcast to all volunteers
- Private one-on-one calls

✅ **Real-Time Updates**
- Instant notifications
- Live call status
- Duration tracking

✅ **Easy Controls**
- Large buttons (accessibility)
- One-tap actions
- Clear status messages

✅ **Error Handling**
- Offline detection
- Rejection support
- Auto-dismiss on failure

---

## Technical Stack

**Backend:** Node.js + Express + Socket.IO
**Frontend:** React Native + Expo
**Real-time:** WebSocket (Socket.IO)
**Audio:** WebRTC (P2P audio stream)

---

## File Locations

| Feature | File |
|---------|------|
| Senior call screen | `src/screens/elderly/VoiceCallScreen.js` |
| Volunteer call screen | `src/screens/caregiver/IncomingCallScreen.js` |
| Call notification | `src/components/common/IncomingCallOverlay.js` |
| Active call banner | `src/components/common/ActiveCallOverlay.js` |
| Call state management | `src/context/ChatContext.js` |
| Socket methods | `src/services/socketService.js` |
| Backend handlers | `server/src/index.js` (lines ~510-670) |

---

## Socket Events

**Senior Starts Call**
```
Client: emit('call:initiate', {
  conversationId, callerId, calleeId, callerName
})

Server: emit('call:incoming') → Volunteer
Server: emit('call:ringing') → Senior
```

**Volunteer Accepts**
```
Client: emit('call:accept', {
  conversationId, callerId, calleeId
})

Server: emit('call:active') → Both
Server: emit('call:ready-for-webrtc') → Both
```

**Either Ends**
```
Client: emit('call:end', {
  conversationId, userId
})

Server: emit('call:ended') → Both
```

---

## Testing the Feature

### 1. Start with Two Devices/Emulators
- Device 1: Senior logged in
- Device 2: Volunteer logged in

### 2. Senior Initiates
- Go to Chat screen with volunteer
- Tap phone button
- See "Calling..." message

### 3. Volunteer Receives
- See incoming call notification
- Shows senior's name
- Tap Accept

### 4. Call Connects
- Both see "Call Active"
- Duration timer starts
- Can mute/toggle speaker (if audio setup done)

### 5. End Call
- Either person taps "End Call"
- Returns to chat screen
- Can verify call completed

---

## Push Notifications Setup

1. **Expo Push Token Required**
   - Sent to backend via `/auth/register-push-token`
   - Stored in memory: `pushTokens.set(userId, token)`

2. **When Call Initiated**
   - Backend sends: `{title, body, data}`
   - Volunteer's device receives notification
   - Opens IncomingCallScreen

3. **Token Format**
   ```javascript
   // Example Expo token
   "ExponentPushToken[xxxxxxxxxxxxxxx]"
   ```

---

## Error Scenarios

| Scenario | What Happens | Recovery |
|----------|-------------|----------|
| Volunteer offline | `call:failed` event | Show "Not available" → auto-dismiss |
| Volunteer rejects | `call:rejected` event | Show "Rejected" → return to chat |
| Network drops | Connection error | Auto-disconnect both sides |
| No push token | Notification skipped | Call notification may not arrive |

---

## Next Steps for Full Implementation

1. **Audio Setup**
   - Install `react-native-webrtc`
   - Implement audio capture/playback
   - Handle mic permissions

2. **Active Call Banner**
   - Show while in app (currently notifications only)
   - Tap to return to call
   - Shows duration in real-time

3. **Call History**
   - Save calls to database
   - Display in UI
   - Track statistics

4. **Improve Signaling**
   - Add proper ICE candidate handling
   - Implement TURN servers for P2P
   - Better error recovery

---

## FAQ

**Q: Can multiple seniors call the same volunteer?**
A: Not at the same time. Next call goes into queue (future feature).

**Q: What if volunteer is in another call?**
A: Senior gets "Volunteer not available" message.

**Q: Can they switch to video?**
A: Not yet. Voice only for now. Video is future enhancement.

**Q: How long can calls last?**
A: No limit. Call stays active until either person ends it.

**Q: Are calls recorded?**
A: No, not implemented. Privacy by default.

**Q: What about call costs?**
A: P2P audio via WebRTC = minimal data. No per-minute charges.

---

## Debugging Tips

1. **Check Socket Connection**
   ```javascript
   const socket = getSocket();
   console.log(socket.connected); // true/false
   ```

2. **Monitor Socket Events**
   ```javascript
   socket.on('call:incoming', (data) => {
     console.log('[CALL] Incoming:', data);
   });
   ```

3. **Check Backend Logs**
   ```
   [CALL] Initiate call from SENIOR_ID to VOLUNTEER_ID
   [CALL] Incoming call notification sent to VOLUNTEER_ID
   [CALL] Call is now active between IDs
   ```

4. **Verify Push Tokens**
   ```javascript
   // Backend should have token stored
   const token = pushTokens.get(userId);
   console.log('Token:', token); // Should exist
   ```

---

## Version Info
- **Implemented:** January 2026
- **Status:** ✅ Complete
- **Audio Implementation:** ⏳ Pending
- **Testing:** ⏳ In Progress

---

For detailed implementation, see: `VOICE_CALL_IMPLEMENTATION.md`
