// Voice Help Input Screen - Voice-first help request with real recording
import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView,
  TouchableOpacity,
  Animated,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Audio } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { VoiceButton, LargeButton } from '../../components/common';
import { colors, typography, spacing, borderRadius, shadows } from '../../theme';
import { getTranslation } from '../../i18n/translations';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BACKEND_URL } from '../../config/backend';
import { speechToText, detectLanguage } from '../../services/speechService';
import socketService from '../../services/socketService';

const VoiceHelpInputScreen = ({ navigation, route }) => {
  const { category } = route.params || {};
  const [language, setLanguage] = useState('en');
  const t = getTranslation(language);
  
  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [detectedLanguage, setDetectedLanguage] = useState('en');
  const [confidence, setConfidence] = useState(0);
  const [hasSpoken, setHasSpoken] = useState(false);
  const [recordingError, setRecordingError] = useState('');
  const [audioUri, setAudioUri] = useState(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  
  // Refs
  const recordingRef = useRef(null);
  const soundRef = useRef(null);
  const waveAnim = useRef(new Animated.Value(0)).current;
  const durationIntervalRef = useRef(null);

  // Setup audio permissions on mount
  useEffect(() => {
    setupAudioSession();
    
    return () => {
      // Cleanup on unmount
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync().catch(() => {});
      }
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(() => {});
      }
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    };
  }, []);

  // Waveform animation while recording
  useEffect(() => {
    if (isRecording) {
      Animated.loop(
        Animated.timing(waveAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        })
      ).start();
    } else {
      waveAnim.setValue(0);
    }
  }, [isRecording, waveAnim]);

  // Setup Audio Session
  const setupAudioSession = async () => {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        interruptionModeAndroid: Audio.INTERRUPTION_MODE_ANDROID_DO_NOT_MIX,
        shouldDuckAndroid: true,
      });
    } catch (error) {
      console.error('Error setting up audio session:', error);
      setRecordingError('Failed to setup audio. Please check microphone permissions.');
    }
  };

  // Start Recording
  const handleVoiceStart = async () => {
    try {
      setRecordingError('');
      setIsRecording(true);
      setRecordingDuration(0);

      // Create new recording
      const recording = new Audio.Recording();
      
      // Request permissions
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        setRecordingError('Microphone permission required to record voice.');
        setIsRecording(false);
        return;
      }

      // Start recording
      await recording.prepareToRecordAsync({
        android: {
          extension: '.m4a',
          outputFormat: Audio.AndroidOutputFormat.MPEG_4,
          audioEncoder: Audio.AndroidAudioEncoder.AAC,
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 128000,
        },
        ios: {
          extension: '.m4a',
          audioQuality: Audio.IosAudioQuality.HIGH,
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
      });

      await recording.startAsync();
      recordingRef.current = recording;

      // Track recording duration
      durationIntervalRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);

    } catch (error) {
      console.error('Error starting recording:', error);
      setRecordingError('Failed to start recording. Try again.');
      setIsRecording(false);
    }
  };

  // Stop Recording and Convert to Text
  const handleVoiceStop = async () => {
    try {
      setIsRecording(false);
      
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }

      if (!recordingRef.current) {
        setRecordingError('No recording found.');
        return;
      }

      // Stop recording
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      setAudioUri(uri);

      // Show processing indicator
      setIsProcessing(true);

      // Convert audio to blob for speech-to-text
      const audioBlob = await uriToBlob(uri);

      // Detect language
      const langDetect = await detectLanguage(audioBlob);
      if (langDetect.success) {
        setDetectedLanguage(langDetect.detectedLanguage);
        setLanguage(langDetect.detectedLanguage.split('-')[0]);
      }

      // Convert speech to text
      const result = await speechToText(audioBlob, detectedLanguage);

      if (result.success) {
        setTranscript(result.text);
        setConfidence(result.confidence || 0);
        setHasSpoken(true);
        setRecordingError('');
      } else {
        setRecordingError('Failed to understand speech. Please try again.');
        setHasSpoken(false);
      }

    } catch (error) {
      console.error('Error stopping recording:', error);
      setRecordingError('Error processing voice. Please try again.');
    } finally {
      setIsProcessing(false);
      recordingRef.current = null;
    }
  };

  // Convert URI to Blob
  const uriToBlob = async (uri) => {
    const response = await fetch(uri);
    return await response.blob();
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
      setRecordingError('Failed to play preview.');
      setIsPlayingPreview(false);
    }
  };

  const handleSubmit = async () => {
    try {
      setIsProcessing(true);
      
      const token = await AsyncStorage.getItem('userToken');
      const userId = await AsyncStorage.getItem('userId');
      const userProfile = await AsyncStorage.getItem('userProfile');
      const profile = userProfile ? JSON.parse(userProfile) : {};
      
      if (!token || !userId) {
        Alert.alert('Error', 'You must be logged in to request help.');
        return;
      }

      // Create help request with recorded voice transcript
      const helpRequest = {
        seniorId: userId,
        seniorName: profile.name || 'Senior',
        category: category?.id || 'general',
        categoryTitle: category?.title || 'Help Request',
        description: transcript,
        language: detectedLanguage,
        confidence: confidence,
        audioUri: audioUri, // Can be used for volunteer to listen later
        timestamp: new Date().toISOString(),
        status: 'pending',
        priority: category?.id === 'emergency' ? 'high' : 'medium'
      };

      // Send to backend API
      const response = await fetch(`${BACKEND_URL}/help-requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(helpRequest)
      });

      if (!response.ok) {
        throw new Error('Failed to create help request');
      }

      const data = await response.json();
      const requestId = data.request?.id;

      // Emit to volunteers via socket
      socketService.getSocket().emit('help:request', {
        requestId,
        seniorId: userId,
        seniorName: profile.name,
        category: category?.title,
        description: transcript,
        language: detectedLanguage,
        priority: helpRequest.priority,
        timestamp: helpRequest.timestamp,
      });

      // Navigate to processing screen
      navigation.navigate('HelpProcessing', { 
        category, 
        transcript,
        requestId,
        language: detectedLanguage,
      });

    } catch (error) {
      console.error('Error sending help request:', error);
      Alert.alert('Error', error.message || 'Failed to send help request. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRetry = async () => {
    try {
      setTranscript('');
      setHasSpoken(false);
      setConfidence(0);
      setRecordingError('');
      
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }
      
      setIsPlayingPreview(false);
    } catch (error) {
      console.error('Error retrying:', error);
    }
  };

  // Format duration as MM:SS
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
        <View style={styles.content}>
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
                <Text style={styles.categoryText}>{category.emoji} {category.title}</Text>
              </View>
            )}
          </View>

          {/* Main Content */}
          <View style={styles.mainContent}>
            <Text style={styles.title}>{t.help.voiceTitle}</Text>
            <Text style={styles.subtitle}>{t.help.voicePrompt}</Text>

            {/* Error Message */}
            {recordingError && (
              <View style={styles.errorCard}>
                <MaterialCommunityIcons
                  name="alert-circle"
                  size={24}
                  color={colors.accent.red}
                />
                <Text style={styles.errorText}>{recordingError}</Text>
              </View>
            )}

            {/* Voice Waveform Visualization */}
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
                              inputRange: [0, 0.5, 1],
                              outputRange: [0.3, 1, 0.3],
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
                    {isProcessing ? 'Processing...' : 'Tap to Record'}
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.recordButton, styles.recordButtonStop]}
                  onPress={handleVoiceStop}
                >
                  <View style={styles.stopButtonInner} />
                  <Text style={styles.recordButtonText}>Release to Stop</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Processing Indicator */}
            {isProcessing && (
              <View style={styles.processingContainer}>
                <ActivityIndicator size="large" color={colors.primary.main} />
                <Text style={styles.processingText}>Converting voice to text...</Text>
              </View>
            )}

            {/* Language Detection Badge */}
            {detectedLanguage && (
              <View style={styles.languageBadge}>
                <MaterialCommunityIcons
                  name="translate"
                  size={20}
                  color={colors.primary.main}
                />
                <Text style={styles.languageText}>
                  {detectedLanguage.toUpperCase()} • {Math.round(confidence * 100)}% confidence
                </Text>
              </View>
            )}

            {/* Transcript Display */}
            {hasSpoken && transcript && (
              <View style={[styles.transcriptCard, shadows.sm]}>
                <View style={styles.transcriptHeader}>
                  <Text style={styles.transcriptLabel}>📝 What we heard:</Text>
                  {audioUri && (
                    <TouchableOpacity
                      onPress={handlePlayPreview}
                      style={styles.playButton}
                    >
                      <MaterialCommunityIcons
                        name={isPlayingPreview ? 'pause-circle' : 'play-circle'}
                        size={28}
                        color={colors.primary.main}
                      />
                    </TouchableOpacity>
                  )}
                </View>

                <Text style={styles.transcriptText}>"{transcript}"</Text>
                
                <View style={styles.transcriptActions}>
                  <TouchableOpacity 
                    style={styles.retryButton}
                    onPress={handleRetry}
                  >
                    <MaterialCommunityIcons
                      name="refresh"
                      size={24}
                      color={colors.neutral.darkGray}
                    />
                    <Text style={styles.retryText}>Record Again</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>

          {/* Submit Button */}
          {hasSpoken && (
            <View style={styles.submitContainer}>
              <LargeButton
                title={isProcessing ? 'Sending...' : 'Send Help Request'}
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
              Speak slowly and clearly. You can speak in any language.
            </Text>
          </View>
        </View>
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
  content: {
    flex: 1,
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
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
  processingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: spacing.lg,
  },
  processingText: {
    fontSize: typography.sizes.md,
    color: colors.neutral.darkGray,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  languageBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary.light,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    marginTop: spacing.md,
  },
  languageText: {
    fontSize: typography.sizes.sm,
    color: colors.primary.main,
    marginLeft: spacing.sm,
  },
  transcriptCard: {
    backgroundColor: colors.neutral.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    width: '100%',
    marginTop: spacing.xl,
  },
  transcriptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  transcriptLabel: {
    fontSize: typography.sizes.md,
    color: colors.neutral.darkGray,
    fontWeight: typography.weights.medium,
  },
  playButton: {
    padding: spacing.sm,
  },
  transcriptText: {
    fontSize: typography.sizes.lg,
    color: colors.neutral.black,
    fontStyle: 'italic',
    lineHeight: typography.sizes.lg * 1.5,
    marginBottom: spacing.md,
  },
  transcriptActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: spacing.md,
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
