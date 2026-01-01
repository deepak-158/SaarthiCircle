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

const conversationPrompts = [
  { id: 1, text: 'Talk about childhood memories', icon: 'memory' },
  { id: 2, text: "Discuss today's news", icon: 'newspaper' },
  { id: 3, text: 'Share a favorite song', icon: 'music' },
  { id: 4, text: 'Talk about family', icon: 'account-group' },
];

const ChatScreen = ({ navigation, route }) => {
  const { mode = 'text', companion } = route.params || {};
  const [language] = useState('en');
  const t = getTranslation(language);
  
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: 'Hello! It\'s so nice to meet you. How are you feeling today?',
      sender: 'companion',
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isCallActive, setIsCallActive] = useState(mode === 'voice');
  const [callDuration, setCallDuration] = useState(0);
  const [isListening, setIsListening] = useState(false);
  
  const scrollViewRef = useRef();
  const callTimerRef = useRef(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

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
    if (!inputText.trim()) return;

    const newMessage = {
      id: messages.length + 1,
      text: inputText,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, newMessage]);
    setInputText('');

    // Simulate companion response
    setTimeout(() => {
      const response = {
        id: messages.length + 2,
        text: 'That\'s wonderful to hear! Please tell me more about it.',
        sender: 'companion',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, response]);
    }, 2000);
  };

  const handlePromptSelect = (prompt) => {
    setInputText(prompt.text);
  };

  const handleEndCall = () => {
    setIsCallActive(false);
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
          <TouchableOpacity 
            style={styles.callButton}
            onPress={() => setIsCallActive(true)}
          >
            <MaterialCommunityIcons
              name="phone"
              size={28}
              color={colors.primary.main}
            />
          </TouchableOpacity>
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
              !inputText.trim() && styles.sendButtonDisabled,
            ]}
            onPress={handleSendMessage}
            disabled={!inputText.trim()}
          >
            <MaterialCommunityIcons
              name="send"
              size={28}
              color={inputText.trim() ? colors.neutral.white : colors.neutral.darkGray}
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
  callButton: {
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
