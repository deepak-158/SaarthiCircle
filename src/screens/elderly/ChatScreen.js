// Chat/Call Screen with Large Text and Simple Interface
import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LargeButton, VoiceButton } from '../../components/common';
import { colors, typography, spacing, borderRadius, shadows } from '../../theme';
import { getTranslation } from '../../i18n/translations';
import { BACKEND_URL } from '../../config/backend';
import socketService, { getSocket, joinSession, sendMessage as socketSendMessage } from '../../services/socketService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useChat } from '../../context/ChatContext';
import { ActiveRequestOverlay } from '../../components/common';

const conversationPrompts = [
  { id: 1, text: 'Talk about childhood memories', icon: 'memory' },
  { id: 2, text: "Discuss today's news", icon: 'newspaper' },
  { id: 3, text: 'Share a favorite song', icon: 'music' },
  { id: 4, text: 'Talk about family', icon: 'account-group' },
];

const ChatScreen = ({ navigation, route }) => {
  const { mode = 'text', companion: routeCompanion, conversationId: routeConversationId } = route.params || {};
  const { activeSession, setCallStatus, addActiveChat, updateActiveChatMessage, removeActiveChat } = useChat();
  const companion = routeCompanion || activeSession?.companion;
  const conversationId = routeConversationId || activeSession?.conversationId;
  const [language] = useState('en');
  const t = getTranslation(language);
  
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isCallActive, setIsCallActive] = useState(mode === 'voice');
  const [callDuration, setCallDuration] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [isWaitingForVolunteer, setIsWaitingForVolunteer] = useState(!conversationId);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(!!conversationId);
  
  const scrollViewRef = useRef();
  const callTimerRef = useRef(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const cacheKey = conversationId ? `chat:messages:${conversationId}` : null;

  const normalizeMessage = (m) => {
    const sentAt = m.sent_at || m.created_at || Date.now();
    const senderId = m.sender_id || m.senderId;
    const sender = companion?.id && senderId === companion.id ? 'companion' : 'user';
    return {
      id: m.id || `${senderId}-${sentAt}`,
      text: m.content || m.text || '',
      sender,
      timestamp: new Date(sentAt),
    };
  };

  // Register this chat as active when screen mounts
  useEffect(() => {
    if (companion && conversationId) {
      addActiveChat(conversationId, companion);
    }
  }, [conversationId, companion]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const profileJson = await AsyncStorage.getItem('userProfile');
        const profile = profileJson ? JSON.parse(profileJson) : null;
        const uid = profile?.id || profile?.uid || profile?.userId;
        if (mounted) {
          setCurrentUserId(uid);
          setUserProfile(profile);
        }
      } catch {}
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Message listener - IMPORTANT: Only listen to this specific conversation
  useEffect(() => {
    let mounted = true;
    const socket = getSocket();

    if (cacheKey) {
      (async () => {
        try {
          const cached = await AsyncStorage.getItem(cacheKey);
          const parsed = cached ? JSON.parse(cached) : null;
          if (mounted && Array.isArray(parsed)) {
            setMessages(parsed.map(m => ({
              ...m,
              timestamp: m.timestamp ? new Date(m.timestamp) : new Date(),
            })));
          }
        } catch {}
      })();
    }

    if (conversationId) {
      joinSession({ conversationId });
      (async () => {
        try {
          const res = await fetch(`${BACKEND_URL}/conversations/${conversationId}/messages`);
          const json = await res.json();
          if (mounted && Array.isArray(json.messages)) {
            setMessages(json.messages.map(normalizeMessage));
          }
        } catch {}
      })();
    }

    // Create a unique event listener for this conversation
    const messageHandler = (m) => {
      if (!mounted || !m) return;
      
      // Only process messages for THIS conversation
      if (m.conversation_id !== conversationId && m.conversationId !== conversationId) {
        console.log(`[CHAT] Ignoring message from different conversation. Expecting: ${conversationId}, got: ${m.conversation_id || m.conversationId}`);
        return;
      }

      const normalized = normalizeMessage(m);
      setMessages((prev) => {
        // Prevent duplicates by ID
        if (prev.some(msg => msg.id === normalized.id)) {
          return prev;
        }

        // Check if this is a message we sent optimistically
        if (normalized.sender === 'user') {
          const localMatchIndex = prev.findIndex(
            msg => msg.id.startsWith('local-') && msg.text === normalized.text
          );
          
          if (localMatchIndex !== -1) {
            // Replace the local optimistic message with the real one from server
            const updated = [...prev];
            updated[localMatchIndex] = normalized;
            return updated;
          }
        }
        
        return [...prev, normalized];
      });

      // Update active chat with last message preview
      updateActiveChatMessage(conversationId, normalized.text.substring(0, 50));
    };

    socket.off('message:new');
    socket.on('message:new', messageHandler);

    // Handle chat ended event
    const chatEndedHandler = (data) => {
      if (!mounted) return;
      console.log(`[CHAT] Chat ended by ${data.endedBy}`);
      removeActiveChat?.(conversationId);
      // Navigate back after a brief delay
      setTimeout(() => {
        navigation.goBack();
      }, 1000);
    };

    socket.off('chat:ended');
    socket.on('chat:ended', chatEndedHandler);

    return () => {
      mounted = false;
      socket.off('message:new', messageHandler);
      socket.off('chat:ended', chatEndedHandler);
    };
  }, [cacheKey, conversationId, companion?.id]);

  // Handle session started (volunteer accepted request)
  useEffect(() => {
    const socket = getSocket();
    
    const sessionStartedHandler = ({ conversationId: cid, seniorId, volunteerId }) => {
      console.log('[CHAT] Session started:', { cid, seniorId, volunteerId });
      setIsWaitingForVolunteer(false);
      setIsConnecting(true);
      setIsConnected(true);
      
      // Small delay to show connecting state
      setTimeout(() => {
        setIsConnecting(false);
      }, 1000);
    };

    socket.off('session:started');
    socket.on('session:started', sessionStartedHandler);

    return () => {
      socket.off('session:started', sessionStartedHandler);
    };
  }, []);

  useEffect(() => {
    if (!cacheKey) return;
    (async () => {
      try {
        const serializable = messages.slice(-200).map(m => ({
          id: m.id,
          text: m.text,
          sender: m.sender,
          timestamp: m.timestamp instanceof Date ? m.timestamp.toISOString() : m.timestamp,
        }));
        await AsyncStorage.setItem(cacheKey, JSON.stringify(serializable));
      } catch {}
    })();
  }, [cacheKey, messages]);

  useEffect(() => {
    const callActive = mode === 'voice';
    setIsCallActive(callActive);
    setCallStatus?.(callActive);
  }, [mode, setCallStatus]);

  useEffect(() => {
    if (isCallActive) {
      // Start call timer
      callTimerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);

      // Pulse animation for call
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }

    return () => {
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
      }
    };
  }, [isCallActive]);

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSendMessage = () => {
    if (!inputText.trim() || isSending) return;

    setIsSending(true);
    const optimistic = {
      id: `local-${Date.now()}`,
      text: inputText,
      sender: 'user',
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, optimistic]);
    const toSend = inputText;
    setInputText('');

    // Update active chat with last message preview
    updateActiveChatMessage(conversationId, toSend.substring(0, 50));

    if (conversationId) {
      (async () => {
        try {
          await fetch(`${BACKEND_URL}/conversations/${conversationId}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ senderId: currentUserId || 'USER', content: toSend, type: 'text' }),
          });
        } catch (e) {
          console.error('Error sending message:', e);
        } finally {
          setIsSending(false);
        }
      })();
    } else {
      setIsSending(false);
    }
  };

  const handlePromptSelect = (prompt) => {
    setInputText(prompt.text);
  };

  const handleEndChat = () => {
    // End chat on backend
    if (conversationId) {
      (async () => {
        try {
          await fetch(`${BACKEND_URL}/conversations/${conversationId}/end`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: currentUserId || 'USER' }),
          });
        } catch (e) {
          console.log('Error ending chat:', e);
        }
      })();
      
      // Remove from active chats
      removeActiveChat?.(conversationId);
      
      // Emit socket event to notify other participant
      const socket = getSocket();
      if (socket) {
        socket.emit('chat:end', { conversationId, userId: currentUserId });
      }
    }

    setMessages([]);
    navigation.goBack();
  };

  const handleStartVoiceCall = () => {
    if (!conversationId || !companion || !currentUserId) {
      console.error('Missing conversation data for voice call');
      return;
    }

    // Navigate to VoiceCallScreen
    navigation.navigate('VoiceCall', {
      conversationId,
      companion,
      callerId: currentUserId,
      calleeId: companion.id,
      isIncoming: false,
    });

    // Emit socket event to initiate call
    const socket = getSocket();
    if (socket) {
      socketService.initiateVoiceCall({
        conversationId,
        callerId: currentUserId,
        calleeId: companion.id,
        callerName: userProfile?.fullName || 'Senior User',
      });
    }
  };

  const handleEndCall = () => {
    setIsCallActive(false);
    setCallStatus?.(false);
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
    }
    navigation.goBack();
  };

  const handleVoiceInput = () => {
    setIsListening(!isListening);
    // Voice recognition implementation
  };

  // Voice Call Interface
  if (isCallActive) {
    return (
      <View style={styles.callContainer}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.callContent}>
            {/* Companion Avatar */}
            <Animated.View
              style={[
                styles.avatarContainer,
                { transform: [{ scale: pulseAnim }] },
              ]}
            >
              <MaterialCommunityIcons
                name="account-circle"
                size={120}
                color={colors.neutral.white}
              />
            </Animated.View>

            <Text style={styles.callTitle}>Your Companion</Text>
            <Text style={styles.callStatus}>Connected</Text>
            <Text style={styles.callDuration}>{formatDuration(callDuration)}</Text>

            {/* Conversation Prompts */}
            <View style={styles.promptsContainer}>
              <Text style={styles.promptsTitle}>Conversation Ideas:</Text>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.promptsScroll}
              >
                {conversationPrompts.map((prompt) => (
                  <TouchableOpacity
                    key={prompt.id}
                    style={styles.promptCard}
                    onPress={() => {}}
                  >
                    <MaterialCommunityIcons
                      name={prompt.icon}
                      size={24}
                      color={colors.primary.main}
                    />
                    <Text style={styles.promptText}>{prompt.text}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Call Controls */}
            <View style={styles.callControls}>
              <TouchableOpacity style={styles.callControlButton}>
                <MaterialCommunityIcons
                  name="microphone"
                  size={32}
                  color={colors.neutral.white}
                />
              </TouchableOpacity>

              <TouchableOpacity style={styles.callControlButton}>
                <MaterialCommunityIcons
                  name="volume-high"
                  size={32}
                  color={colors.neutral.white}
                />
              </TouchableOpacity>
            </View>

            {/* End Call Button */}
            <LargeButton
              title={t.chat.endCall}
              onPress={handleEndCall}
              icon="phone-hangup"
              variant="danger"
              size="xl"
              style={styles.endCallButton}
            />
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // Text Chat Interface
  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Request Waiting Overlay */}
      <ActiveRequestOverlay
        visible={isWaitingForVolunteer && !conversationId}
        volunteerName={companion?.fullName || 'Volunteer'}
        requestType={mode === 'voice' ? 'voice' : 'chat'}
        isWaiting={isWaitingForVolunteer && !isConnecting}
        isConnecting={isConnecting && !isConnected}
        isConnected={isConnected && !isWaitingForVolunteer}
        onCancel={() => {
          navigation.goBack();
        }}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.chatContainer}
      >
        {/* Header */}
        <View style={styles.chatHeader}>
          <TouchableOpacity 
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <MaterialCommunityIcons
              name="arrow-left"
              size={32}
              color={colors.neutral.black}
            />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <MaterialCommunityIcons
              name="account-circle"
              size={48}
              color={colors.primary.main}
            />
            <View style={styles.headerText}>
              <Text style={styles.headerTitle}>Your Companion</Text>
              <Text style={styles.headerStatus}>Online</Text>
            </View>
          </View>
          <View style={styles.headerButtons}>
            <TouchableOpacity 
              style={styles.callButton}
              onPress={handleStartVoiceCall}
            >
              <MaterialCommunityIcons
                name="phone"
                size={28}
                color={colors.primary.main}
              />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.endChatButton}
              onPress={handleEndChat}
            >
              <MaterialCommunityIcons
                name="close-circle"
                size={28}
                color={colors.accent.red}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Messages */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd()}
        >
          {messages.map((message) => (
            <View
              key={message.id}
              style={[
                styles.messageBubble,
                message.sender === 'user' 
                  ? styles.userMessage 
                  : styles.companionMessage,
              ]}
            >
              <Text style={[
                styles.messageText,
                message.sender === 'user' && styles.userMessageText,
              ]}>
                {message.text}
              </Text>
            </View>
          ))}
        </ScrollView>

        {/* Conversation Prompts */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.chatPromptsContainer}
          contentContainerStyle={styles.chatPromptsContent}
        >
          {conversationPrompts.map((prompt) => (
            <TouchableOpacity
              key={prompt.id}
              style={styles.chatPromptChip}
              onPress={() => handlePromptSelect(prompt)}
            >
              <Text style={styles.chatPromptText}>{prompt.text}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Input Area */}
        <View style={styles.inputContainer}>
          <TouchableOpacity
            style={styles.voiceInputButton}
            onPress={handleVoiceInput}
          >
            <MaterialCommunityIcons
              name={isListening ? 'microphone' : 'microphone-outline'}
              size={28}
              color={isListening ? colors.accent.red : colors.primary.main}
            />
          </TouchableOpacity>
          
          <TextInput
            style={styles.textInput}
            value={inputText}
            onChangeText={setInputText}
            placeholder={t.chat.placeholder}
            placeholderTextColor={colors.neutral.darkGray}
            multiline
          />
          
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!inputText.trim() || isSending) && styles.sendButtonDisabled,
            ]}
            onPress={handleSendMessage}
            disabled={!inputText.trim() || isSending}
          >
            <MaterialCommunityIcons
              name="send"
              size={28}
              color={inputText.trim() && !isSending ? colors.neutral.white : colors.neutral.darkGray}
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.neutral.white,
  },
  // Call Styles
  callContainer: {
    flex: 1,
    backgroundColor: colors.primary.main,
  },
  callContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  avatarContainer: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  callTitle: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
    color: colors.neutral.white,
    marginTop: spacing.lg,
  },
  callStatus: {
    fontSize: typography.sizes.lg,
    color: 'rgba(255,255,255,0.8)',
    marginTop: spacing.sm,
  },
  callDuration: {
    fontSize: typography.sizes.xxxl,
    fontWeight: typography.weights.bold,
    color: colors.neutral.white,
    marginTop: spacing.md,
  },
  promptsContainer: {
    marginTop: spacing.xl,
    alignItems: 'center',
  },
  promptsTitle: {
    fontSize: typography.sizes.md,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: spacing.md,
  },
  promptsScroll: {
    paddingHorizontal: spacing.md,
  },
  promptCard: {
    backgroundColor: colors.neutral.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginHorizontal: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  promptText: {
    fontSize: typography.sizes.sm,
    color: colors.neutral.black,
    marginLeft: spacing.sm,
  },
  callControls: {
    flexDirection: 'row',
    marginTop: spacing.xl,
  },
  callControlButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: spacing.md,
  },
  endCallButton: {
    marginTop: spacing.xxl,
    width: '80%',
  },
  // Chat Styles
  chatContainer: {
    flex: 1,
    backgroundColor: colors.neutral.lightGray,
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral.white,
    padding: spacing.md,
    ...shadows.sm,
  },
  backButton: {
    padding: spacing.sm,
  },
  headerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: spacing.sm,
  },
  headerText: {
    marginLeft: spacing.sm,
  },
  headerTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semiBold,
    color: colors.neutral.black,
  },
  headerStatus: {
    fontSize: typography.sizes.sm,
    color: colors.secondary.green,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  callButton: {
    padding: spacing.sm,
  },
  endChatButton: {
    padding: spacing.sm,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: spacing.md,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
  },
  userMessage: {
    backgroundColor: colors.primary.main,
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  companionMessage: {
    backgroundColor: colors.neutral.white,
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
    ...shadows.sm,
  },
  messageText: {
    fontSize: typography.sizes.lg,
    color: colors.neutral.black,
    lineHeight: typography.sizes.lg * typography.lineHeights.relaxed,
  },
  userMessageText: {
    color: colors.neutral.white,
  },
  chatPromptsContainer: {
    maxHeight: 60,
    backgroundColor: colors.neutral.white,
    borderTopWidth: 1,
    borderTopColor: colors.neutral.mediumGray,
  },
  chatPromptsContent: {
    padding: spacing.sm,
  },
  chatPromptChip: {
    backgroundColor: colors.primary.light,
    borderRadius: borderRadius.full,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginRight: spacing.sm,
  },
  chatPromptText: {
    fontSize: typography.sizes.sm,
    color: colors.primary.main,
    fontWeight: typography.weights.medium,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: colors.neutral.white,
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.neutral.mediumGray,
  },
  voiceInputButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary.light,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  textInput: {
    flex: 1,
    backgroundColor: colors.neutral.lightGray,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: typography.sizes.lg,
    maxHeight: 100,
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary.main,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.sm,
  },
  sendButtonDisabled: {
    backgroundColor: colors.neutral.mediumGray,
  },
});

export default ChatScreen;
