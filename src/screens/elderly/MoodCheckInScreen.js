// Daily Mood Check-in Screen
import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { MoodSelector, VoiceButton, LargeButton } from '../../components/common';
import { colors, typography, spacing, borderRadius, shadows } from '../../theme';
import { getTranslation } from '../../i18n/translations';

const MoodCheckInScreen = ({ navigation }) => {
  const [language] = useState('en');
  const t = getTranslation(language);
  
  const [selectedMood, setSelectedMood] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [notes, setNotes] = useState('');

  const handleMoodSelect = (mood) => {
    setSelectedMood(mood);
  };

  const handleVoiceInput = () => {
    setIsListening(!isListening);
    // In production: Use Azure Speech to Text
  };

  const handleSubmit = () => {
    // Save mood to backend
    navigation.goBack();
  };

  const handleSkip = () => {
    navigation.goBack();
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
              style={styles.closeButton}
            >
              <MaterialCommunityIcons
                name="close"
                size={32}
                color={colors.neutral.darkGray}
              />
            </TouchableOpacity>
          </View>

          {/* Illustration */}
          <View style={styles.illustrationContainer}>
            <View style={styles.illustration}>
              <Text style={styles.illustrationEmoji}>
                {selectedMood === 'happy' ? '🌻' : selectedMood === 'sad' ? '🌧️' : '🌤️'}
              </Text>
            </View>
          </View>

          {/* Question */}
          <Text style={styles.question}>{t.mood.voicePrompt}</Text>

          {/* Mood Selector */}
          <View style={styles.moodSection}>
            <MoodSelector
              selectedMood={selectedMood}
              onMoodSelect={handleMoodSelect}
              size="xl"
            />
          </View>

          {/* Voice Input Option */}
          <View style={styles.voiceSection}>
            <Text style={styles.voiceLabel}>Or tell us how you feel:</Text>
            <VoiceButton
              size="md"
              isListening={isListening}
              onPress={handleVoiceInput}
              prompt="Tap to speak"
            />
          </View>

          {/* Follow-up based on mood */}
          {selectedMood === 'sad' && (
            <View style={styles.supportCard}>
              <MaterialCommunityIcons
                name="heart"
                size={28}
                color={colors.accent.orange}
              />
              <Text style={styles.supportText}>
                We're here for you. Would you like to talk to someone?
              </Text>
              <TouchableOpacity 
                style={styles.talkButton}
                onPress={() => navigation.navigate('CompanionMatching')}
              >
                <Text style={styles.talkButtonText}>Talk to Companion</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <LargeButton
              title="Save"
              onPress={handleSubmit}
              disabled={!selectedMood}
              size="xl"
              style={styles.saveButton}
            />
            
            <TouchableOpacity 
              style={styles.skipButton}
              onPress={handleSkip}
            >
              <Text style={styles.skipText}>Skip for now</Text>
            </TouchableOpacity>
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
    justifyContent: 'flex-end',
  },
  closeButton: {
    padding: spacing.sm,
  },
  illustrationContainer: {
    alignItems: 'center',
    marginVertical: spacing.xl,
  },
  illustration: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.neutral.white,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.md,
  },
  illustrationEmoji: {
    fontSize: 60,
  },
  question: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
    color: colors.neutral.black,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  moodSection: {
    marginBottom: spacing.xl,
  },
  voiceSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  voiceLabel: {
    fontSize: typography.sizes.md,
    color: colors.neutral.darkGray,
    marginBottom: spacing.md,
  },
  supportCard: {
    backgroundColor: '#FFF3E0',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.lg,
    borderWidth: 2,
    borderColor: colors.accent.orange,
  },
  supportText: {
    fontSize: typography.sizes.lg,
    color: colors.neutral.black,
    textAlign: 'center',
    marginVertical: spacing.md,
  },
  talkButton: {
    backgroundColor: colors.accent.orange,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.full,
  },
  talkButtonText: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semiBold,
    color: colors.neutral.white,
  },
  actionButtons: {
    marginTop: 'auto',
  },
  saveButton: {
    marginBottom: spacing.md,
  },
  skipButton: {
    alignItems: 'center',
    padding: spacing.md,
  },
  skipText: {
    fontSize: typography.sizes.lg,
    color: colors.neutral.darkGray,
  },
});

export default MoodCheckInScreen;
