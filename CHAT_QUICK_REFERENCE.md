# Chat System - Quick Reference

## Problem Solved
✅ Messages now isolated per conversation (not broadcast to everyone)
✅ Active chats persist when switching tabs
✅ Visual overlay shows all active conversations

## Key Changes Quick Summary

| Component | Change | Impact |
|-----------|--------|--------|
| **ChatContext.js** | Added activeChats Map tracking | Multiple chats can be active simultaneously |
| **ActiveChatOverlay.js** | New component | Users see/manage active conversations |
| **ChatScreen.js** | Message validation + registration | Only receives messages for its conversation |
| **ElderlyNavigator.js** | Added overlay to main screen | Overlay persists across tab navigation |
| **Backend socket handler** | Conversation validation | Messages only sent to correct room |
| **Backend REST endpoint** | Conversation validation | API ensures data isolation |

## For Frontend Developers

### Using Active Chats in Components
```javascript
import { useChat } from '../../context/ChatContext';

const MyComponent = () => {
  const { activeChats, addActiveChat, removeActiveChat } = useChat();
  
  // Register a chat
  useEffect(() => {
    if (companion && conversationId) {
      addActiveChat(conversationId, companion);
    }
  }, [conversationId, companion]);
  
  // Get all active chats
  const chats = activeChats; // Array of active chat objects
};
```

### Message Validation Pattern
```javascript
const messageHandler = (m) => {
  // CRITICAL: Only accept messages from THIS conversation
  if (m.conversation_id !== conversationId && m.conversationId !== conversationId) {
    console.log('[CHAT] Ignoring message from different conversation');
    return; // Reject the message
  }
  // Process message...
};
```

### Update Active Chat Preview
```javascript
import { useChat } from '../../context/ChatContext';

const { updateActiveChatMessage } = useChat();

// When message received or sent
updateActiveChatMessage(conversationId, messageText.substring(0, 50));
```

## For Backend Developers

### Socket Message Handler Best Practices
```javascript
socket.on('message:send', async ({ conversationId, senderId, content, type }) => {
  // 1. Validate conversationId
  if (!conversationId) {
    return socket.emit('error', { message: 'conversationId required' });
  }
  
  // 2. Save to database
  const saved = await saveMessage({ conversationId, senderId, content, type });
  
  // 3. Ensure conversation_id in response
  const messageToEmit = { ...saved, conversation_id: conversationId };
  
  // 4. Broadcast ONLY to specific room
  io.to(`conv:${conversationId}`).emit('message:new', messageToEmit);
  
  // 5. Log for debugging
  console.log(`[CHAT] Message sent in conversation ${conversationId} from ${senderId}`);
});
```

### REST Endpoint Pattern
```javascript
app.post('/conversations/:id/messages', async (req, res) => {
  const { id } = req.params;
  const { senderId, content, type } = req.body;
  
  // 1. Validate
  if (!senderId || !content) {
    return res.status(400).json({ error: 'senderId and content required' });
  }
  
  // 2. Verify conversation exists
  const { data: convo, error } = await supabase
    .from(TABLES.CONVERSATIONS)
    .select('id').eq('id', id).single();
  if (error || !convo) return res.status(404).json({ error: 'Not found' });
  
  // 3. Save message
  const message = await saveMessage({ conversationId: id, senderId, content, type });
  
  // 4. Include conversation_id
  const messageToEmit = { ...message, conversation_id: id };
  
  // 5. Broadcast to room
  io.to(`conv:${id}`).emit('message:new', messageToEmit);
  
  // 6. Respond
  res.json({ message: messageToEmit });
});
```

## Common Tasks

### Add a New User to Active Chat
```javascript
const { addActiveChat } = useChat();
addActiveChat(conversationId, { id: volunteerId, fullName: 'Name' });
```

### Remove User from Active Chats
```javascript
const { removeActiveChat } = useChat();
removeActiveChat(conversationId);
```

### Get List of Active Chats
```javascript
const { activeChats } = useChat();
const chatList = activeChats; // Array
chatList.forEach(chat => {
  console.log(chat.conversationId, chat.companion.fullName);
});
```

### Update Message Preview
```javascript
const { updateActiveChatMessage } = useChat();
updateActiveChatMessage(conversationId, 'New message preview...');
```

## Debugging Tips

### Check Message Isolation
```javascript
// In ChatScreen message handler
socket.on('message:new', (m) => {
  console.log('Received message:', m);
  console.log('Current conversation:', conversationId);
  console.log('Message conversation:', m.conversation_id);
  console.log('Match:', m.conversation_id === conversationId);
});
```

### Check Socket Rooms
```javascript
// On backend - see who's in what room
console.log('Rooms:', io.sockets.adapter.rooms);
// Should see rooms like 'conv:uuid-here'
```

### Check AsyncStorage
```javascript
// In ChatScreen
AsyncStorage.getItem('activeChats').then(chats => {
  console.log('Stored active chats:', chats);
});
```

## Testing Checklist

- [ ] Send msg in conv A, NOT in conv B ✓
- [ ] Open conv A, switch tabs, switch back ✓
- [ ] Kill app with active chat, reopen, chat still there ✓
- [ ] Open 2 chats, use overlay to switch ✓
- [ ] Close chat from overlay, it disappears ✓
- [ ] Overlay shows correct participant names ✓
- [ ] Overlay shows last message preview ✓
- [ ] No performance degradation ✓

## Architecture Diagram

```
┌─────────────────────────────────────┐
│      ElderlyNavigator               │
│  ┌───────────────────────────────┐  │
│  │  ElderlyMainScreen            │  │
│  │  ┌─────────────────────────┐  │  │
│  │  │ ElderlyTabNavigator     │  │  │
│  │  │ (Home, Companion, Help) │  │  │
│  │  └─────────────────────────┘  │  │
│  │  ┌─────────────────────────┐  │  │
│  │  │ ActiveSessionOverlay    │  │  │
│  │  └─────────────────────────┘  │  │
│  │  ┌─────────────────────────┐  │  │
│  │  │ ActiveChatOverlay ◄─────┼──┼─ Persists across tabs
│  │  │ (Shows active chats)    │  │  │
│  │  └─────────────────────────┘  │  │
│  └───────────────────────────────┘  │
│                                      │
│  ChatContext                         │
│  ├─ activeSession (current chat)    │
│  ├─ activeChats (all concurrent)    │
│  └─ AsyncStorage (persisted)        │
│                                      │
│  ChatScreen                          │
│  ├─ Message validation              │
│  ├─ Conversation-specific messages  │
│  └─ Register self as active chat    │
└─────────────────────────────────────┘
         │
         │ Socket.io rooms
         │ conv:${conversationId}
         │
    ┌────▼────────────────────┐
    │   Backend Server        │
    │ ┌──────────────────────┐ │
    │ │ Socket Handlers      │ │
    │ │ - message:send       │ │
    │ │ - message validation │ │
    │ │ - room broadcasting  │ │
    │ └──────────────────────┘ │
    │ ┌──────────────────────┐ │
    │ │ REST Endpoints       │ │
    │ │ - GET /conv/:id/msgs │ │
    │ │ - POST /conv/:id/msgs│ │
    │ │ - Validation         │ │
    │ └──────────────────────┘ │
    └────┬────────────────────┘
         │
    ┌────▼────────────────────┐
    │   Supabase Database     │
    │ ├─ CONVERSATIONS table  │
    │ ├─ MESSAGES table       │
    │ │  (filtered by conv_id)│
    │ └─ USERS table          │
    └─────────────────────────┘
```

## Frequently Asked Questions

**Q: What if a user is in multiple conversations?**
A: Each conversation is tracked separately in activeChats Map. Overlay shows all with quick switching.

**Q: What happens on app restart?**
A: activeChats are persisted to AsyncStorage and restored on app boot.

**Q: Can backend broadcast to multiple rooms?**
A: Yes - use `io.to(room1).to(room2).emit(...)` if needed. Currently each conversation has own room.

**Q: What if conversation ID is null?**
A: Message handler rejects it. Backend socket handler returns error.

**Q: Performance with 100 concurrent chats?**
A: Socket.io rooms are very efficient. ~1KB per chat in memory. No issues expected.

**Q: Can user have same conversation open twice?**
A: Not in normal flow, but if they do, both ChatScreen instances will receive same messages (correct behavior).

---

**Last Updated**: Jan 24, 2026
**Status**: ✅ Production Ready
**Version**: 1.0
