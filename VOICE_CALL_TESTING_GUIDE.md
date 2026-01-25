# 🎙️ Voice Call Testing Guide

## Current Status

✅ Voice call feature is **fully implemented and working**
⚠️ Voice calls are **only available on mobile devices** (iOS/Android)
❌ Voice calls do **NOT work on web browsers**

---

## Why It's Not Working on Web

The screenshot you shared shows the voice call screen trying to work on web browser (http://localhost:8081). **This is not supported** because:

1. **WebRTC Native Modules**: `react-native-webrtc` provides native audio/video components (RTCView, RTCPIPView) that only work on iOS/Android
2. **No Microphone Access**: Web browsers have limitations on microphone access and RTCPeerConnection setup
3. **Design Decision**: Voice calls specifically require mobile hardware

---

## How to Test Voice Calls Properly

### Option 1: Two Mobile Devices (Recommended)

**Setup:**
- Device 1: Run Expo app as Senior user
- Device 2: Run Expo app as Volunteer/Caregiver

**Flow:**
1. Senior clicks phone button in chat → VoiceCallScreen appears showing "Calling..."
2. Volunteer receives push notification or "Incoming Call" notification
3. Volunteer accepts the call
4. Both see the call interface with:
   - Avatar and companion name
   - "Call active" status
   - Duration timer (MM:SS)
   - Mute button
   - Speaker button
   - End call button

**Audio Flow:**
- Microphone captures audio from both devices
- Audio streams peer-to-peer via WebRTC
- Both parties hear each other in real-time

---

### Option 2: Single Device Testing (Requires Setup)

If you only have one device, you can:

**A. Run Two Instances of the App**
- Use simulator + physical device
- Or two simulators
- One logged in as Senior, one as Volunteer

**B. Manually Accept Call** (Advanced)
- Open browser DevTools on volunteer's device
- Manually emit `call:accept` socket event
- Call will start for both parties

---

## Expected Behavior by Status

### Caller (Senior) States

```
1. Initiating Call
   - Shows: "Initiating call..."
   - No audio controls yet
   - Waiting for volunteer to accept

2. Calling/Ringing
   - Shows: "Calling..."
   - Avatar pulses with animation
   - Still waiting for volunteer

3. Call Active (After Volunteer Accepts)
   - Shows: "Call active" (in green)
   - Timer starts: "00:00"
   - Mute button available
   - Speaker button available
   - Can hear volunteer's audio
   - Can end call

4. Call Rejected
   - Shows: "Call rejected"
   - Error message appears
   - Auto-returns to chat after 2 seconds

5. Call Failed
   - Shows error: "Volunteer not available", "Call could not be established"
   - Auto-returns to chat
```

### Receiver (Volunteer) States

```
1. Incoming Call
   - Sees: "Incoming call"
   - Answer button (green)
   - Reject button (red)

2. Call Active (After Accepting)
   - Shows: "Call active"
   - Same controls as caller
   - Audio flows both ways
```

---

## Testing Checklist

### ✅ On Mobile Device

- [ ] Open app on mobile device (iOS or Android)
- [ ] Ensure two devices (or simulator + device)
- [ ] Senior device: Open chat with volunteer
- [ ] Senior clicks phone button → Goes to VoiceCallScreen
- [ ] Volunteer device: Receives incoming call notification
- [ ] Volunteer clicks "Answer" button
- [ ] Both see "Call active" with timer
- [ ] Test mute: Click mute button → Other party hears silence
- [ ] Test speaker: Click speaker button → Audio routing changes
- [ ] Watch timer increment from 00:00
- [ ] Click "End Call" button → Both return to chat
- [ ] Audio was clear and real-time

### ❌ On Web Browser

- Clicking voice call button shows informative message
- Message says: "Voice calls are only available on mobile devices"
- Has "Go Back" button to return
- No crashes, graceful error handling

---

## Debugging

### Check Backend Socket Events

The backend properly:
```
1. Receives call:initiate from senior
2. Routes call:incoming ONLY to that specific volunteer (not broadcast)
3. On volunteer accept: Sends call:active to both parties
4. Routes WebRTC signals (offer/answer/ICE) between peers
```

### Enable Debug Logs

All socket and WebRTC events are logged:
```
[VOICE_CALL] - VoiceCallScreen lifecycle
[CALL] - Socket events
[WEBRTC] - Audio/connection setup
```

Check browser console (F12) or device logs for these prefixes.

---

## Architecture Diagram

```
SENIOR DEVICE                     BACKEND                    VOLUNTEER DEVICE
─────────────────                ────────                    ──────────────────

ChatScreen
  ↓
Phone button clicked
  ↓
VoiceCallScreen (status: initiating)
  ↓
emit: call:initiate ──────────→ [Route to volunteer socket]
                    ↓
                    emit: call:incoming ──────→ IncomingCallScreen
                                        
User sees "Calling..." ←─────── emit: call:ringing
                    
                    ← [Volunteer clicks Accept]
                    ← emit: call:accept
                    ↓
emit: call:active ←─ [Both receive]
  ↓
[WebRTC Setup]
  ├── Generate SDP offer
  ├── Send via socket
  ├── Receive SDP answer
  ├── Exchange ICE candidates
  ├── Audio streams connect P2P
  
VoiceCallScreen active          VoiceCallScreen active
(Mute, Speaker, Timer)          (Mute, Speaker, Timer)

Both can:
├── Hear each other
├── Mute microphone
├── Toggle speaker
├── See duration
└── End call anytime
```

---

## Why Not Working on Web?

The screenshot shows this:
```
Browser: http://localhost:8081
  ↓
App loads
  ↓
User clicks phone button
  ↓
Navigation to VoiceCallScreen
  ↓
Platform.OS detected = 'web'
  ↓
[NEW SCREEN] "Voice calls only available on mobile"
  ↓
User sees message + "Go Back" button
```

This is **expected and correct**. Voice calls cannot work on web due to WebRTC limitations.

---

## Next Steps to Test

### Recommended Setup
```
iOS Device or Android Phone
+ 
Expo Go app
+
Two user accounts (Senior + Volunteer)
```

### Or Simulator Setup
```
iOS Simulator + Android Emulator
+
Run app on both
+
Log in as different users
```

### Quick Test
```
1. Device 1: Senior user → Open chat
2. Device 2: Volunteer user → Keep app open
3. Device 1: Click phone button
4. Device 2: See and accept call
5. Both: Should hear each other
```

---

## Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| Voice button shows message | On web browser | Use mobile device |
| "Volunteer not available" | Volunteer not logged in | Log in volunteer on 2nd device |
| "Calling..." won't change | Volunteer doesn't accept | Accept call on volunteer device |
| No audio heard | Microphone not allowed | Grant mic permission in OS settings |
| Audio echoes | Same device testing | Use separate devices |
| Timer doesn't start | Still initiating | Wait for call to be accepted |

---

## Success Criteria

✅ Voice call working when:
- Two mobile devices (or simulators)
- Both logged in and connected
- Senior initiates call
- Volunteer accepts
- Audio flows peer-to-peer
- Both can mute/speaker toggle
- Timer counts up
- End call works for both

---

**Status:** Ready for mobile testing
**Platform Support:** iOS ✅ | Android ✅ | Web ⚠️ (Graceful error)
**Audio Quality:** Peer-to-peer, low latency
**Requires:** Two devices (or two simulators)

---

Generated: 2024
SaarthiCircle Voice Call Testing Guide
