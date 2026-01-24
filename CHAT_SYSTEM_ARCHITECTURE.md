# Chat System Architecture & Message Isolation

## Overview

The chat system has been updated to ensure that:
1. **Messages are isolated per conversation** - Only participants in a specific conversation receive messages
2. **Active chats persist across navigation** - Users can switch tabs without losing active conversations
3. **Active chat overlay shows all ongoing conversations** - Users can quickly switch between multiple chats

## Key Components

### 1. **Enhanced ChatContext** (`src/context/ChatContext.js`)
- Manages multiple active chats in a Map structure
- Stores: `conversationId`, `companion`, `isActive`, `lastMessage`, `timestamp`
- Methods:
  - `addActiveChat(conversationId, companion)` - Register a new active chat
  - `removeActiveChat(conversationId)` - Close a chat
  - `updateActiveChatMessage(conversationId, lastMessage)` - Update last message preview
  - `getActiveChatsList()` - Get array of all active chats
- Persists to AsyncStorage for recovery after app restart

### 2. **ActiveChatOverlay Component** (`src/components/common/ActiveChatOverlay.js`)
- Shows at bottom of screen when chats are active
- **Collapsed Mode**: Shows current active chat with chat count badge
- **Expanded Mode**: Shows all active chats with participant names and last message preview
- Features:
  - Click to switch between conversations instantly
  - Close button to end individual chats
  - Active chat indicator with green checkmark
  - Badge showing total active chats

### 3. **Updated ChatScreen** (`src/screens/elderly/ChatScreen.js`)
- **Message Isolation**: Only listens to messages from the specific conversation
- Validates `conversation_id` on incoming messages
- Registers itself as active chat when mounted
- Updates active chat with last message preview when messages arrive
- Prevents message leakage from other conversations

### 4. **Backend Message Routing** (`server/src/index.js`)
- **Socket Handler**: `socket.on('message:send', ...)` 
  - Validates `conversationId` is present
  - Includes `conversation_id` in emitted message
  - Uses `io.to(\`conv:${conversationId}\`)` for room-based broadcasting
  - Logs all message activity
  
- **REST Endpoint**: `POST /conversations/:id/messages`
  - Validates conversation exists before saving
  - Includes `conversation_id` in emitted message
  - Only broadcasts to specific conversation room
  
- **GET Endpoint**: `GET /conversations/:id/messages`
  - Validates conversation exists
  - Returns ONLY messages from that specific conversation
  - Properly ordered by creation time

## Data Flow

### Sending a Message

```
User types message in ChatScreen
  ↓
handleSendMessage() called
  ↓
Message added to local state (optimistic update)
  ↓
updateActiveChatMessage() updates overlay preview
  ↓
POST /conversations/:id/messages
  ↓
Backend: saveMessage() → Supabase
  ↓
Backend: Updates conversation.last_message_at
  ↓
Backend: Broadcasts to io.to(`conv:${id}`) room ONLY
  ↓
Message received by ChatScreen message handler
  ↓
Validates message.conversation_id matches current conversation
  ↓
If valid: Added to messages state
  If invalid: Logged and ignored (prevents leakage)
```

### Receiving a Message

```
Other participant sends message
  ↓
Backend: saveMessage() → Supabase
  ↓
Backend: Broadcasts to io.to(`conv:${id}`) room ONLY
  ↓
ChatScreen message handler receives event
  ↓
Validates message.conversation_id === current conversationId
  ↓
If valid: Added to messages state & cached locally
  If invalid: Ignored completely
  ↓
updateActiveChatMessage() updates overlay preview
```

### Switching Between Conversations

```
User taps chat in ActiveChatOverlay (expanded mode)
  ↓
handleSwitchChat(chat)
  ↓
navigation.navigate('Chat', { 
    mode: 'text',
    companion: chat.companion,
    conversationId: chat.conversationId
  })
  ↓
ChatScreen mounts with new conversationId
  ↓
joinSession({ conversationId }) - joins socket room
  ↓
Fetches messages for NEW conversation only
  ↓
Sets up message listener for NEW conversation only
  ↓
Registers as active chat in context
```

## Message Isolation Guarantees

### 1. Socket Room Isolation
- Messages are emitted to `io.to(\`conv:${conversationId}\`)` 
- Only sockets joined to that room receive the message
- Enforced by Socket.io at server level

### 2. Message Handler Validation
```javascript
const messageHandler = (m) => {
  // CRITICAL: Only process messages for THIS conversation
  if (m.conversation_id !== conversationId && m.conversationId !== conversationId) {
    console.log(`[CHAT] Ignoring message from different conversation`);
    return;  // Message ignored completely
  }
  // Process message only if it belongs to this conversation
};
```

### 3. Database Query Isolation
- `GET /conversations/:id/messages` uses `.eq('conversation_id', id)`
- Returns ONLY messages belonging to that conversation
- Prevents data leakage via API

### 4. Local State Isolation
- Each conversation has own cache key: `chat:messages:${conversationId}`
- Messages cached per-conversation in AsyncStorage
- Prevents cross-conversation state mixing

## Navigation Integration

### ElderlyNavigator (`src/navigation/ElderlyNavigator.js`)
- **ElderlyMainScreen** wraps tab navigator
- **Includes two overlays**:
  1. `ActiveSessionOverlay` - For incoming requests
  2. `ActiveChatOverlay` - For active conversations
- Both persist across tab switches
- Do NOT unmount when switching tabs

```jsx
const ElderlyMainScreen = () => {
  return (
    <View style={{ flex: 1 }}>
      <ElderlyTabNavigator />
      <ActiveSessionOverlay />
      <ActiveChatOverlay />
    </View>
  );
};
```

## Performance Considerations

1. **Socket Room Joins**: Minimal memory overhead - Socket.io room membership is efficient
2. **Message Filtering**: O(1) conversation_id check - negligible performance impact
3. **Active Chats Map**: Up to device memory limit, typically 5-20 concurrent chats
4. **AsyncStorage Caching**: 200 most recent messages per conversation cached locally

## Testing Checklist

- [ ] Send message in conversation A, verify not visible in conversation B
- [ ] Open conversation A, switch tabs (Home → Companion), return to Chat, verify state preserved
- [ ] Open 2 chats with different companions, use overlay to switch, verify correct messages shown
- [ ] Close one chat from overlay, verify it disappears
- [ ] Receive message while on another tab, overlay updates with preview
- [ ] Restart app, verify active chats restored from AsyncStorage
- [ ] Multiple participants chat simultaneously, verify each sees only their conversation

## Debugging

### Enable Logging
Backend logs message activity:
```
[CHAT] Message sent in conversation ${conversationId} from ${senderId}
[CHAT] Retrieved ${count} messages for conversation ${id}
```

### Check Socket Rooms
- Verify client joins correct room: `socket.emit('session:join', { conversationId })`
- Verify server broadcasts to room: `io.to(\`conv:${conversationId}\`)`

### Verify Message Filtering
- Check message validation in ChatScreen message handler
- Verify `conversation_id` field present in emitted message
- Test with console logs in message handler

## Future Enhancements

1. **Typing Indicators**: Broadcast only within conversation room
2. **Read Receipts**: Per-conversation tracking
3. **Message Search**: Query within specific conversation
4. **Conversation Archive**: Save/restore multiple chat histories
5. **Notification Routing**: Push notifications targeted to conversation participants
