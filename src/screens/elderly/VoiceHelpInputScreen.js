// Voice Help Input Screen - Voice-first help request
import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView,
  TouchableOpacity,
  Animated,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { VoiceButton, LargeButton } from '../../components/common';
import { colors, typography, spacing, borderRadius, shadows } from '../../theme';
import { getTranslation } from '../../i18n/translations';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BACKEND_URL } from '../../config/backend';

const VoiceHelpInputScreen = ({ navigation, route }) => {
  const { category } = route.params || {};
  const [language] = useState('en');
  const t = getTranslation(language);
  
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [hasSpoken, setHasSpoken] = useState(false);
  
  const waveAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isListening) {
      // Wave animation while listening
      Animated.loop(
        Animated.timing(waveAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        })
      ).start();
    } else {
      waveAnim.setValue(0);
    }
  }, [isListening]);

  const handleVoiceStart = () => {
    setIsListening(true);
    // Start voice recognition
    // In production, integrate with Azure Speech Services
    
    // Simulate transcription after 3 seconds
    setTimeout(() => {
      setIsListening(false);
      setTranscript('I need help with my daily medicines. I forgot which ones to take today and feel confused.');
      setHasSpoken(true);
    }, 3000);
  };

  const handleSubmit = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        Alert.alert('Error', 'You must be logged in to request help.');
        return;
      }

      const response = await fetch(`${BACKEND_URL}/help-requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          category: category?.title || 'General',
          description: transcript,
          priority: category?.id === 'emergency' ? 'high' : 'medium'
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create help request');
      }

      const data = await response.json();
      
      navigation.navigate('HelpProcessing', { 
        category, 
        transcript,
        requestId: data.request.id
      });
    } catch (error) {
      console.error('Error sending help request:', error);
      Alert.alert('Error', 'Failed to send help request. Please try again.');
    }
  };

  const handleRetry = () => {
    setTranscript('');
    setHasSpoken(false);
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

            {/* Voice Waveform Visualization */}
            {isListening && (
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

            {/* Voice Button */}
            <View style={styles.voiceButtonContainer}>
              <VoiceButton
                size="xl"
                isListening={isListening}
                onPress={handleVoiceStart}
                prompt={isListening ? 'Listening...' : 'Tap to speak'}
              />
            </View>

            {/* Language Detection Badge */}
            <View style={styles.languageBadge}>
              <MaterialCommunityIcons
                name="translate"
                size={20}
                color={colors.primary.main}
              />
              <Text style={styles.languageText}>
                Language auto-detected
              </Text>
            </View>

            {/* Transcript Display */}
            {hasSpoken && transcript && (
              <View style={[styles.transcriptCard, shadows.sm]}>
                <Text style={styles.transcriptLabel}>What we heard:</Text>
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
                    <Text style={styles.retryText}>Try Again</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>

          {/* Submit Button */}
          {hasSpoken && (
            <View style={styles.submitContainer}>
              <LargeButton
                title="Send Help Request"
                onPress={handleSubmit}
                icon="send"
                size="xl"
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
  voiceButtonContainer: {
    marginVertical: spacing.xl,
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
  transcriptLabel: {
    fontSize: typography.sizes.md,
    color: colors.neutral.darkGray,
    marginBottom: spacing.sm,
  },
  transcriptText: {
    fontSize: typography.sizes.lg,
    color: colors.neutral.black,
    fontStyle: 'italic',
    lineHeight: typography.sizes.lg * typography.lineHeights.relaxed,
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
