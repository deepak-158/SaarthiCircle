// Voice Help Input Screen - Voice recording + Text input
import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Animated,
  Alert,
  Platform,
} from 'react-native';
import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LargeButton } from '../../components/common';
import { colors, typography, spacing, borderRadius, shadows } from '../../theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BACKEND_URL } from '../../config/backend';
import socketService from '../../services/socketService';

const VoiceHelpInputScreen = ({ navigation, route }) => {
  const { category } = route.params || {};
  const { t, i18n } = useTranslation();

  // Mode: 'text' or 'voice'
  const [inputMode, setInputMode] = useState('text');

  // Text input state
  const [message, setMessage] = useState('');

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [hasRecording, setHasRecording] = useState(false);
  const [audioUri, setAudioUri] = useState(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);

  // Common state
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordingError, setRecordingError] = useState('');

  // Refs
  const recordingRef = useRef(null);
  const soundRef = useRef(null);
  const waveAnim = useRef(new Animated.Value(0)).current;
  const durationIntervalRef = useRef(null);
  const inputRef = useRef(null);

  // Setup audio on mount
  useEffect(() => {
    setupAudioSession();

    return () => {
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync().catch(() => { });
      }
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(() => { });
      }
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    };
  }, []);

  // Waveform animation
  useEffect(() => {
    if (isRecording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(waveAnim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: false, // false for web compatibility
          }),
          Animated.timing(waveAnim, {
            toValue: 0,
            duration: 400,
            useNativeDriver: false, // false for web compatibility
          }),
        ])
      ).start();
    } else {
      waveAnim.setValue(0);
    }
  }, [isRecording]);

  const setupAudioSession = async () => {
    try {
      // Platform-specific audio settings
      const audioMode = {
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      };

      // Only add Android-specific settings on Android platform
      if (Platform.OS === 'android') {
        audioMode.interruptionModeAndroid = Audio.INTERRUPTION_MODE_ANDROID_DO_NOT_MIX;
        audioMode.shouldDuckAndroid = true;
      }

      await Audio.setAudioModeAsync(audioMode);
    } catch (error) {
      console.error('Error setting up audio session:', error);
    }
  };

  // Start Recording
  const handleVoiceStart = async () => {
    try {
      setRecordingError('');
      setIsRecording(true);
      setRecordingDuration(0);

      const recording = new Audio.Recording();

      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        setRecordingError(t('help.voice.errors.micPermission'));
        setIsRecording(false);
        return;
      }

      await recording.prepareToRecordAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      await recording.startAsync();
      recordingRef.current = recording;

      durationIntervalRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);

    } catch (error) {
      console.error('Error starting recording:', error);
      setRecordingError(t('help.voice.errors.startRecording'));
      setIsRecording(false);
    }
  };

  // Stop Recording
  const handleVoiceStop = async () => {
    try {
      setIsRecording(false);

      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }

      if (!recordingRef.current) {
        setRecordingError(t('help.voice.errors.noRecording'));
        return;
      }

      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      setAudioUri(uri);
      setHasRecording(true);

      // Auto-generate a message indicating voice recording
      setMessage(t('help.voice.recordedMessage') || 'Voice message recorded (audio will be sent)');

      recordingRef.current = null;
    } catch (error) {
      console.error('Error stopping recording:', error);
      setRecordingError(t('help.voice.errors.processVoice'));
    }
  };

  // Play Preview
  const handlePlayPreview = async () => {
    try {
      if (isPlayingPreview && soundRef.current) {
        await soundRef.current.stopAsync();
        setIsPlayingPreview(false);
        return;
      }

      if (!audioUri) {
        Alert.alert('Error', 'No recording found.');
        return;
      }

      setIsPlayingPreview(true);
      const { sound } = await Audio.Sound.createAsync({ uri: audioUri });
      soundRef.current = sound;

      sound.setOnPlaybackStatusUpdate(async (status) => {
        if (status.didJustFinish) {
          setIsPlayingPreview(false);
        }
      });

      await sound.playAsync();
    } catch (error) {
      console.error('Error playing preview:', error);
      setRecordingError(t('help.voice.errors.playPreview'));
      setIsPlayingPreview(false);
    }
  };

  const handleSubmit = async () => {
    console.log('[HELP-REQUEST] Button clicked!');
    try {
      const trimmedMessage = message.trim();
      console.log('[HELP-REQUEST] Message:', trimmedMessage);
      console.log('[HELP-REQUEST] Has recording:', hasRecording);

      if (!trimmedMessage && !hasRecording) {
        console.warn('[HELP-REQUEST] No message or recording');
        alert('Please enter a message or record audio');
        return;
      }

      console.log('[HELP-REQUEST] Setting processing to true');
      setIsProcessing(true);

      console.log('[HELP-REQUEST] Getting user data from AsyncStorage...');
      const token = await AsyncStorage.getItem('userToken');
      const storedUserId = await AsyncStorage.getItem('userId');
      const userProfile = await AsyncStorage.getItem('userProfile');

      let profile = {};
      if (userProfile) {
        try {
          profile = JSON.parse(userProfile);
        } catch (e) {
          console.error('[HELP-REQUEST] Failed to parse userProfile:', e);
        }
      }

      // Important: Extract userId from storedUserId OR profile.id
      const userId = storedUserId || profile.id || profile._id || profile.uid;

      console.log('[HELP-REQUEST] Stored User ID:', storedUserId);
      console.log('[HELP-REQUEST] Profile ID:', profile.id);
      console.log('[HELP-REQUEST] Final User ID:', userId);
      console.log('[HELP-REQUEST] Has token:', !!token);

      if (!token || !userId) {
        console.error('[HELP-REQUEST] Missing token or userId. Final ID:', userId);
        alert('Please log in to continue. (User ID not found)');
        setIsProcessing(false);
        return;
      }

      // Create help request
      const helpRequest = {
        seniorId: userId,
        seniorName: profile.name || profile.displayName || profile.full_name || 'Senior',
        category: category?.id || 'general',
        categoryTitle: t(category?.titleKey) || category?.title || 'Help Request',
        description: trimmedMessage || 'Voice message',
        hasAudio: hasRecording,
        audioUri: audioUri,
        language: i18n.language || 'en',
        timestamp: new Date().toISOString(),
        status: 'pending',
        priority: category?.id === 'emergency' ? 'high' : 'medium'
      };

      console.log('[HELP-REQUEST] Sending request to backend:', BACKEND_URL);
      console.log('[HELP-REQUEST] Request payload:', helpRequest);

      // Send to backend API
      const response = await fetch(`${BACKEND_URL}/help-requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(helpRequest)
      });

      console.log('[HELP-REQUEST] Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[HELP-REQUEST] Server error:', errorText);
        throw new Error(`Server error: ${response.status}`);
      }

      const data = await response.json();
      const requestId = data.request?.id;
      console.log('[HELP-REQUEST] Request created with ID:', requestId);

      // Emit to volunteers via socket
      console.log('[HELP-REQUEST] Emitting socket event...');
      socketService.getSocket().emit('help:request', {
        requestId,
        seniorId: userId,
        seniorName: profile.name,
        category: t(category?.titleKey) || category?.title,
        description: trimmedMessage || 'Voice message',
        hasAudio: hasRecording,
        language: i18n.language || 'en',
        priority: helpRequest.priority,
        timestamp: helpRequest.timestamp,
      });

      console.log('[HELP-REQUEST] Navigating to HelpProcessing screen...');
      // Navigate to processing screen
      navigation.navigate('HelpProcessing', {
        category,
        transcript: trimmedMessage || 'Voice message',
        requestId,
        language: i18n.language || 'en',
      });

    } catch (error) {
      console.error('[HELP-REQUEST] Error sending help request:', error);
      alert(`Failed to send request: ${error.message}`);
    } finally {
      setIsProcessing(false);
      console.log('[HELP-REQUEST] Processing complete');
    }
  };

  const handleRetry = async () => {
    setMessage('');
    setHasRecording(false);
    setAudioUri(null);
    setRecordingError('');

    if (soundRef.current) {
      await soundRef.current.unloadAsync();
      soundRef.current = null;
    }
    setIsPlayingPreview(false);
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <LinearGradient
      colors={[colors.primary.light, colors.secondary.cream]}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
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
            {category && (
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryText}>
                  {category.emoji ? `${category.emoji} ` : ''}{t(category.titleKey) || category.title || 'Help'}
                </Text>
              </View>
            )}
          </View>

          {/* Main Content */}
          <View style={styles.mainContent}>
            <Text style={styles.title}>{t('help.voiceTitle') || 'Tell us how we can help'}</Text>
            <Text style={styles.subtitle}>{t('help.voicePrompt') || 'Speak freely. We will understand.'}</Text>

            {/* Mode Selector */}
            <View style={styles.modeSelector}>
              <TouchableOpacity
                style={[styles.modeButton, inputMode === 'text' && styles.modeButtonActive]}
                onPress={() => setInputMode('text')}
              >
                <MaterialCommunityIcons
                  name="keyboard"
                  size={24}
                  color={inputMode === 'text' ? colors.neutral.white : colors.primary.main}
                />
                <Text style={[styles.modeButtonText, inputMode === 'text' && styles.modeButtonTextActive]}>
                  Type
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modeButton, inputMode === 'voice' && styles.modeButtonActive]}
                onPress={() => setInputMode('voice')}
              >
                <MaterialCommunityIcons
                  name="microphone"
                  size={24}
                  color={inputMode === 'voice' ? colors.neutral.white : colors.primary.main}
                />
                <Text style={[styles.modeButtonText, inputMode === 'voice' && styles.modeButtonTextActive]}>
                  Voice
                </Text>
              </TouchableOpacity>
            </View>

            {/* Error Message */}
            {!!recordingError && (
              <View style={styles.errorCard}>
                <MaterialCommunityIcons
                  name="alert-circle"
                  size={24}
                  color={colors.accent.red}
                />
                <Text style={styles.errorText}>{recordingError}</Text>
              </View>
            )}

            {/* TEXT INPUT MODE */}
            {inputMode === 'text' && (
              <View style={[styles.inputCard, shadows.sm]}>
                <View style={styles.inputHeader}>
                  <MaterialCommunityIcons
                    name="message-text"
                    size={24}
                    color={colors.primary.main}
                  />
                  <Text style={styles.inputLabel}>
                    {t('help.voice.whatWeHeard') || 'Your Message'}
                  </Text>
                </View>

                <TextInput
                  ref={inputRef}
                  style={styles.textInput}
                  placeholder={t('help.voicePrompt') || 'Type your message here...'}
                  placeholderTextColor={colors.neutral.gray}
                  value={message}
                  onChangeText={setMessage}
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                />

                <View style={styles.inputFooter}>
                  <Text style={styles.charCount}>
                    {message.length} characters
                  </Text>
                  {message.length > 0 && (
                    <TouchableOpacity
                      onPress={() => setMessage('')}
                      style={styles.clearButton}
                    >
                      <MaterialCommunityIcons
                        name="close-circle"
                        size={20}
                        color={colors.neutral.darkGray}
                      />
                      <Text style={styles.clearText}>Clear</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Quick Suggestions */}
                <View style={styles.suggestionsContainer}>
                  <Text style={styles.suggestionsTitle}>Quick suggestions:</Text>
                  <View style={styles.suggestionsGrid}>
                    {[
                      'I need help with daily tasks',
                      'I want someone to talk to',
                      'I need medical assistance',
                      'I need help with groceries',
                    ].map((suggestion, index) => (
                      <TouchableOpacity
                        key={index}
                        style={styles.suggestionChip}
                        onPress={() => setMessage(suggestion)}
                      >
                        <Text style={styles.suggestionText}>{suggestion}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>
            )}

            {/* VOICE RECORDING MODE */}
            {inputMode === 'voice' && (
              <View style={styles.voiceContainer}>
                {/* Waveform Visualization */}
                {isRecording && (
                  <View style={styles.waveformContainer}>
                    {[...Array(5)].map((_, index) => (
                      <Animated.View
                        key={index}
                        style={[
                          styles.waveBar,
                          {
                            transform: [
                              {
                                scaleY: waveAnim.interpolate({
                                  inputRange: [0, 1],
                                  outputRange: [0.3 + (index * 0.1), 1 + (index * 0.1)],
                                }),
                              },
                            ],
                          },
                        ]}
                      />
                    ))}
                  </View>
                )}

                {/* Recording Duration */}
                {isRecording && (
                  <Text style={styles.durationText}>{formatDuration(recordingDuration)}</Text>
                )}

                {/* Voice Button */}
                <View style={styles.voiceButtonContainer}>
                  {!isRecording ? (
                    <TouchableOpacity
                      style={[styles.recordButton, isProcessing && styles.recordButtonDisabled]}
                      onPress={handleVoiceStart}
                      disabled={isProcessing}
                    >
                      <MaterialCommunityIcons
                        name="microphone"
                        size={48}
                        color={colors.neutral.white}
                      />
                      <Text style={styles.recordButtonText}>
                        {isProcessing ? (t('help.voice.processing') || 'Processing...') : (t('help.voice.tapToRecord') || 'Tap to Record')}
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={[styles.recordButton, styles.recordButtonStop]}
                      onPress={handleVoiceStop}
                    >
                      <View style={styles.stopButtonInner} />
                      <Text style={styles.recordButtonText}>{t('help.voice.releaseToStop') || 'Release to Stop'}</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Recording Preview */}
                {hasRecording && !!audioUri && (
                  <View style={[styles.recordingCard, shadows.sm]}>
                    <View style={styles.recordingHeader}>
                      <MaterialCommunityIcons
                        name="microphone"
                        size={24}
                        color={colors.primary.main}
                      />
                      <Text style={styles.recordingLabel}>Voice Recording</Text>
                    </View>

                    <View style={styles.recordingActions}>
                      <TouchableOpacity
                        onPress={handlePlayPreview}
                        style={styles.playButton}
                      >
                        <MaterialCommunityIcons
                          name={isPlayingPreview ? 'pause-circle' : 'play-circle'}
                          size={48}
                          color={colors.primary.main}
                        />
                        <Text style={styles.playText}>
                          {isPlayingPreview ? 'Pause' : 'Play'}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={handleRetry}
                        style={styles.retryButton}
                      >
                        <MaterialCommunityIcons
                          name="refresh"
                          size={24}
                          color={colors.neutral.darkGray}
                        />
                        <Text style={styles.retryText}>{t('help.voice.recordAgain') || 'Record Again'}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* Submit Button */}
          {(message.trim().length > 0 || hasRecording) && (
            <View style={styles.submitContainer}>
              <LargeButton
                title={isProcessing ? 'Sending...' : (t('help.voice.sendRequest') || 'Send Help Request')}
                onPress={handleSubmit}
                icon="send"
                size="xl"
                disabled={isProcessing}
              />
            </View>
          )}

          {/* Tips */}
          <View style={styles.tipsContainer}>
            <MaterialCommunityIcons
              name="lightbulb-outline"
              size={24}
              color={colors.accent.yellow}
            />
            <Text style={styles.tipsText}>
              {inputMode === 'text'
                ? 'Describe your situation clearly. A volunteer will respond soon.'
                : (t('help.voice.tips') || 'Speak slowly and clearly.')}
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  backButton: {
    marginRight: spacing.md,
  },
  categoryBadge: {
    backgroundColor: colors.neutral.white,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
  },
  categoryText: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.medium,
    color: colors.neutral.black,
  },
  mainContent: {
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
    color: colors.neutral.black,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: typography.sizes.lg,
    color: colors.neutral.darkGray,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  modeSelector: {
    flexDirection: 'row',
    backgroundColor: colors.neutral.white,
    borderRadius: borderRadius.full,
    padding: spacing.xs,
    marginBottom: spacing.lg,
    ...shadows.sm,
  },
  modeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.full,
  },
  modeButtonActive: {
    backgroundColor: colors.primary.main,
  },
  modeButtonText: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.medium,
    color: colors.primary.main,
    marginLeft: spacing.sm,
  },
  modeButtonTextActive: {
    color: colors.neutral.white,
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: colors.accent.red,
  },
  errorText: {
    flex: 1,
    fontSize: typography.sizes.md,
    color: colors.accent.red,
    marginLeft: spacing.md,
  },
  inputCard: {
    backgroundColor: colors.neutral.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  inputHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  inputLabel: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.medium,
    color: colors.neutral.black,
    marginLeft: spacing.sm,
  },
  textInput: {
    fontSize: typography.sizes.lg,
    color: colors.neutral.black,
    minHeight: 150,
    maxHeight: 300,
    padding: spacing.md,
    backgroundColor: colors.neutral.lightGray,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  inputFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  charCount: {
    fontSize: typography.sizes.sm,
    color: colors.neutral.gray,
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.xs,
  },
  clearText: {
    fontSize: typography.sizes.sm,
    color: colors.neutral.darkGray,
    marginLeft: spacing.xs,
  },
  suggestionsContainer: {
    marginTop: spacing.md,
  },
  suggestionsTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.neutral.darkGray,
    marginBottom: spacing.sm,
  },
  suggestionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  suggestionChip: {
    backgroundColor: colors.primary.light,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  suggestionText: {
    fontSize: typography.sizes.sm,
    color: colors.primary.main,
  },
  voiceContainer: {
    alignItems: 'center',
  },
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 60,
    marginBottom: spacing.lg,
  },
  waveBar: {
    width: 8,
    height: 40,
    backgroundColor: colors.accent.red,
    borderRadius: 4,
    marginHorizontal: 6,
  },
  durationText: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.accent.red,
    marginBottom: spacing.lg,
  },
  voiceButtonContainer: {
    marginVertical: spacing.xl,
    alignItems: 'center',
  },
  recordButton: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: colors.primary.main,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.md,
  },
  recordButtonDisabled: {
    opacity: 0.6,
  },
  recordButtonStop: {
    backgroundColor: colors.accent.red,
  },
  stopButtonInner: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: colors.neutral.white,
    position: 'absolute',
  },
  recordButtonText: {
    marginTop: spacing.md,
    fontSize: typography.sizes.sm,
    color: colors.neutral.white,
    fontWeight: typography.weights.medium,
    textAlign: 'center',
  },
  recordingCard: {
    backgroundColor: colors.neutral.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    width: '100%',
    marginTop: spacing.lg,
  },
  recordingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  recordingLabel: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.medium,
    color: colors.neutral.black,
    marginLeft: spacing.sm,
  },
  recordingActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  playButton: {
    alignItems: 'center',
  },
  playText: {
    fontSize: typography.sizes.sm,
    color: colors.primary.main,
    marginTop: spacing.xs,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
  },
  retryText: {
    fontSize: typography.sizes.md,
    color: colors.neutral.darkGray,
    marginLeft: spacing.xs,
  },
  submitContainer: {
    marginBottom: spacing.lg,
  },
  tipsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E1',
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  tipsText: {
    flex: 1,
    fontSize: typography.sizes.md,
    color: colors.neutral.darkGray,
    marginLeft: spacing.sm,
  },
});

export default VoiceHelpInputScreen;
