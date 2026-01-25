# Voice Call Feature Implementation - Complete Guide

## Overview
This document details the implementation of the **Voice Call Feature** for SaarthiCircle's "Talk to Companion" section. The feature enables seniors to initiate voice calls with specific volunteers, with complete flow from call initiation to termination.

---

## Architecture Overview

### Components Created/Modified

#### 1. **Backend Socket Handlers** (`server/src/index.js`)
- **call:initiate** - Senior initiates call to specific volunteer
- **call:incoming** - Notifies volunteer of incoming call
- **call:accept** - Volunteer accepts the call
- **call:reject** - Volunteer rejects the call
- **call:end** - Either party ends the call

#### 2. **Frontend Context** (`src/context/ChatContext.js`)
New state management for voice calls:
```javascript
voiceCallState: {
  status: 'initiating' | 'ringing' | 'active' | 'ended'
  conversationId
  callerId
  calleeId
  startTime
  duration
}
incomingCall: { from, callerId, conversationId }
```

#### 3. **Socket Service** (`src/services/socketService.js`)
New methods:
- `initiateVoiceCall()` - Start a call
- `acceptVoiceCall()` - Accept incoming call
- `rejectVoiceCall()` - Reject incoming call
- `endVoiceCall()` - End active call
- `sendWebRTCOffer/Answer/ICECandidate()` - WebRTC signaling

#### 4. **Screen Components**

**VoiceCallScreen.js** (`src/screens/elderly/VoiceCallScreen.js`)
- Full-screen call interface
- Shows companion avatar, call status, and duration
- States: initiating, ringing, active, ended
- Controls: mute, speaker, end call
- Handles both outgoing and incoming calls

**IncomingCallScreen.js** (`src/screens/caregiver/IncomingCallScreen.js`)
- Full-screen incoming call notification
- Shows caller name
- Accept/Reject buttons
- Navigates to VoiceCallScreen on accept

#### 5. **UI Components**

**ActiveCallOverlay.js** (`src/components/common/ActiveCallOverlay.js`)
- Shows active call banner at top of screen
- Displays companion name and call duration
- Quick access to end call
- Similar to ActiveChatOverlay

**IncomingCallOverlay.js** (`src/components/common/IncomingCallOverlay.js`)
- Modal notification for incoming calls
- Pulsing animation
- Accept/Reject buttons
- Shows caller information

#### 6. **Custom Hook**

**useIncomingCallListener.js** (`src/hooks/useIncomingCallListener.js`)
- Global socket listener for incoming calls
- Automatically navigates to IncomingCallScreen
- Used in CaregiverDashboard

---

## Complete Call Flow

### Flow 1: Senior Initiates Call

```
1. Senior opens Chat with Volunteer
   ↓
2. Taps Phone Button in ChatScreen Header
   ↓
3. handleStartVoiceCall() triggered
   ↓
4. Navigation to VoiceCallScreen with params
   - conversationId
   - companion
   - callerId (senior's ID)
   - calleeId (volunteer's ID)
   ↓
5. Socket emits 'call:initiate'
   - Backend receives and validates volunteer is online
   - Sends 'call:incoming' to volunteer's socket
   - Sends 'call:ringing' back to senior
   ↓
6. Senior sees: "Calling..." with pulsing avatar
   ↓
7. Volunteer receives 'call:incoming'
   - Push notification sent
   - Incoming call screen shown
   ↓
8. Volunteer taps Accept
   - Socket emits 'call:accept'
   - Both parties join conversation room
   - 'call:active' emitted to both
   - 'call:ready-for-webrtc' broadcast to establish audio
   ↓
9. Active Call State
   - Both see: "Call Active" with duration timer
   - Mute/Speaker controls available
   - Call duration increments
   ↓
10. Either party taps "End Call"
    - Socket emits 'call:end'
    - Both removed from conversation room
    - Return to previous screen
```

### Flow 2: Volunteer Rejects Call

```
1. Volunteer receives 'call:incoming'
   ↓
2. Taps "Reject" button
   ↓
3. Socket emits 'call:reject'
   ↓
4. Senior receives 'call:rejected'
   ↓
5. Senior sees: "Call rejected" message
   ↓
6. Auto-returns to ChatScreen after 2 seconds
```

### Flow 3: Volunteer Not Available

```
1. Senior initiates call
   ↓
2. Backend checks volunteer socket exists
   ↓
3. If not available:
   - Socket emits 'call:failed'
   - Message: "Volunteer not available"
   ↓
4. Senior returns to ChatScreen
```

---

## Implementation Details

### Backend Logic (`server/src/index.js`)

```javascript
// Check if volunteer is online
const calleeSocketId = userSockets.get(calleeId);
if (!calleeSocketId) {
  return socket.emit('call:failed', { 
    reason: 'Volunteer not available',
    message: 'The volunteer is currently offline.'
  });
}

// Send to SPECIFIC volunteer only
io.to(calleeSocketId).emit('call:incoming', { ... });

// Both join conversation room
socket.join(`conv:${conversationId}`);
io.sockets.sockets.get(calleeSocketId)?.join(convRoom);

// WebRTC signaling in conversation room only
io.to(`conv:${conversationId}`).emit('call:ready-for-webrtc', { ... });
```

### Frontend Call Handling

```javascript
// Senior initiates call
handleStartVoiceCall() {
  socketService.initiateVoiceCall({
    conversationId,
    callerId: currentUserId,
    calleeId: companion.id,
    callerName: userProfile?.fullName
  });
  navigation.navigate('VoiceCall', { ... });
}

// Listen for call state changes
socket.on('call:active', () => {
  setCallStatus('active');
  startCallTimer();
  playAnswerSound();
});

socket.on('call:rejected', () => {
  showMessage('Call was rejected');
  navigation.goBack();
});

socket.on('call:ended', () => {
  stopCallTimer();
  navigation.goBack();
});
```

---

## State Management

### ChatContext Voice Call Methods

```javascript
// Initiate outgoing call
initiateVoiceCall(conversationId, callerId, calleeId)

// Set call to ringing state
setCallRinging(conversationId, callerId, calleeId)

// Call connected and active
setCallActive(conversationId, callerId, calleeId)

// Update call duration
updateCallDuration(seconds)

// End call
endVoiceCall()

// Incoming call notification
setIncomingCallNotification(from, callerId, conversationId)
clearIncomingCall()
```

---

## Navigation Routes

### ElderlyNavigator
```javascript
<Stack.Screen 
  name="VoiceCall" 
  component={VoiceCallScreen}
  options={{
    animation: 'slide_from_bottom',
    presentation: 'fullScreenModal'
  }}
/>
```

### CaregiverNavigator
```javascript
<Stack.Screen 
  name="IncomingCall" 
  component={IncomingCallScreen}
  options={{
    animation: 'slide_from_bottom',
    presentation: 'fullScreenModal'
  }}
/>

<Stack.Screen 
  name="VoiceCall" 
  component={VoiceCallScreen}
  options={{
    animation: 'slide_from_bottom',
    presentation: 'fullScreenModal'
  }}
/>
```

---

## Socket Events Reference

### Client → Server

| Event | Payload | From | Purpose |
|-------|---------|------|---------|
| `call:initiate` | `conversationId, callerId, calleeId, callerName` | Senior | Start call |
| `call:accept` | `conversationId, callerId, calleeId` | Volunteer | Accept call |
| `call:reject` | `conversationId, callerId, calleeId` | Volunteer | Reject call |
| `call:end` | `conversationId, callerId, calleeId, userId` | Either | End call |
| `webrtc:offer` | `conversationId, sdp` | Either | WebRTC offer |
| `webrtc:answer` | `conversationId, sdp` | Either | WebRTC answer |
| `webrtc:ice-candidate` | `conversationId, candidate` | Either | ICE candidate |

### Server → Client

| Event | Payload | To | Purpose |
|-------|---------|-------|---------|
| `call:ringing` | `conversationId, calleeId` | Senior | Call is ringing |
| `call:incoming` | `conversationId, callerId, callerName, calleeId` | Volunteer | Incoming call notification |
| `call:active` | `conversationId, callerId, calleeId, acceptedAt` | Both | Call is active |
| `call:rejected` | `rejectedBy, reason` | Senior | Call was rejected |
| `call:ended` | `endedBy, endedAt` | Both | Call ended |
| `call:failed` | `reason, message` | Senior | Call failed |
| `call:ready-for-webrtc` | `conversationId, callerId, calleeId` | Both | Ready for audio |

---

## UI States

### VoiceCallScreen States

1. **initiating**
   - Show: "Initiating call..."
   - Display: Pulsing avatar
   - Controls: None

2. **ringing**
   - Show: "Calling..."
   - Display: Pulsing avatar with scale animation
   - Controls: None

3. **active**
   - Show: "Call Active" with duration
   - Display: Avatar, duration timer
   - Controls: Mute, Speaker, End Call

4. **rejected**
   - Show: "Call rejected"
   - Display: Error message
   - Auto-dismiss: 2 seconds

5. **ended**
   - Show: "Call ended"
   - Auto-dismiss: 1.5 seconds

6. **failed**
   - Show: Error message
   - Auto-dismiss: 2 seconds

---

## Key Features

✅ **Specific Volunteer Targeting**
- Call goes only to specified volunteer
- Not broadcast to all volunteers

✅ **Real-time Notifications**
- Push notifications for incoming calls
- Instant state updates via socket

✅ **Call Status Display**
- Clear UI showing current call state
- Duration timer for active calls

✅ **Error Handling**
- Volunteer offline detection
- Call rejection support
- Timeout handling

✅ **User-Friendly Controls**
- Large buttons for accessibility
- Clear call status messages
- Quick access to end call

✅ **Active Call Indicator**
- Similar to active chat overlay
- Shows ongoing calls across app
- Quick dismiss/end access

---

## Testing Checklist

- [ ] Senior can initiate call with volunteer
- [ ] Volunteer receives incoming call notification
- [ ] Volunteer can accept call
- [ ] Volunteer can reject call
- [ ] Both see "Call Active" when connected
- [ ] Call duration updates correctly
- [ ] Either party can end call
- [ ] Call ends properly and returns to chat
- [ ] Error shows if volunteer is offline
- [ ] Push notification sent to volunteer
- [ ] Active call overlay appears (when implemented)
- [ ] WebRTC audio connection established (requires media setup)

---

## Future Enhancements

1. **Audio Implementation**
   - Implement actual WebRTC audio capture
   - Add audio stream management
   - Handle permissions (microphone access)

2. **Call History**
   - Log all calls in database
   - Display call history in UI
   - Call duration statistics

3. **Call Scheduling**
   - Allow seniors to schedule calls
   - Availability checking
   - Reminder notifications

4. **Call Recording** (with consent)
   - Optional call recording
   - Privacy-first approach

5. **Video Call**
   - Extend to video calls
   - Camera toggle
   - Video quality settings

6. **Call Waiting**
   - Multiple incoming calls
   - Call queue management
   - Call transfer

---

## Files Modified/Created

### Created Files
- `src/screens/elderly/VoiceCallScreen.js`
- `src/screens/caregiver/IncomingCallScreen.js`
- `src/components/common/ActiveCallOverlay.js`
- `src/components/common/IncomingCallOverlay.js`
- `src/hooks/useIncomingCallListener.js`

### Modified Files
- `src/context/ChatContext.js` - Added voice call state management
- `src/services/socketService.js` - Added voice call socket methods
- `src/screens/elderly/ChatScreen.js` - Added voice call button handler
- `src/navigation/ElderlyNavigator.js` - Added VoiceCallScreen route
- `src/navigation/CaregiverNavigator.js` - Added IncomingCall/VoiceCall routes
- `src/screens/elderly/index.js` - Export VoiceCallScreen
- `src/screens/caregiver/index.js` - Export IncomingCallScreen
- `src/components/common/index.js` - Export new overlay components
- `server/src/index.js` - Added call socket handlers

---

## Deployment Notes

1. **Ensure Socket.IO is properly configured** for real-time communication
2. **Test push notifications** on actual devices
3. **Verify user permissions** for microphone access
4. **Set up error logging** for call failures
5. **Monitor WebRTC connection** quality
6. **Consider rate limiting** on call initiation to prevent abuse

---

## Support & Troubleshooting

**Call not going through?**
- Check if volunteer is online via backend logs
- Verify socket connection is established
- Ensure conversationId matches

**Volunteer not receiving notification?**
- Check push token is registered
- Verify notification service is running
- Check firewall/network issues

**Audio not working?**
- Implement WebRTC audio stream handling
- Check microphone permissions
- Verify audio codecs are supported

---

## Contact
For questions or issues, contact the development team.
