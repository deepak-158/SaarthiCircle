// Onboarding Step 1 - Communication Preference
import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { LargeButton, LargeCard } from '../../components/common';
import { colors, typography, spacing } from '../../theme';
import { getTranslation } from '../../i18n/translations';

const OnboardingStep1 = ({ navigation, route }) => {
  const { language = 'en' } = route.params || {};
  const t = getTranslation(language);
  const [preference, setPreference] = useState(null);

  const handleContinue = () => {
    navigation.navigate('Onboarding2', { 
      language, 
      communicationPreference: preference 
    });
  };

  return (
    <LinearGradient
      colors={[colors.primary.light, colors.neutral.white]}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          {/* Progress */}
          <View style={styles.progressContainer}>
            <View style={[styles.progressDot, styles.progressActive]} />
            <View style={styles.progressDot} />
            <View style={styles.progressDot} />
          </View>

          {/* Title */}
          <View style={styles.header}>
            <Text style={styles.stepText}>Step 1 of 3</Text>
            <Text style={styles.title}>{t.onboarding.step1Title}</Text>
          </View>

          {/* Options */}
          <View style={styles.optionsContainer}>
            <LargeCard
              title={t.onboarding.voiceRecommended}
              subtitle={t.onboarding.voiceDesc}
              icon="microphone"
              selected={preference === 'voice'}
              onPress={() => setPreference('voice')}
              variant={preference === 'voice' ? 'highlight' : 'default'}
              size="lg"
              style={styles.optionCard}
            />
            
            <LargeCard
              title={t.onboarding.text}
              subtitle={t.onboarding.textDesc}
              icon="message-text"
              selected={preference === 'text'}
              onPress={() => setPreference('text')}
              variant={preference === 'text' ? 'highlight' : 'default'}
              size="lg"
              style={styles.optionCard}
            />
          </View>

          {/* Recommended Badge */}
          {preference === 'voice' && (
            <View style={styles.recommendedBadge}>
              <Text style={styles.recommendedText}>
                ✨ Recommended for easy conversation
              </Text>
            </View>
          )}

          {/* Continue Button */}
          <View style={styles.buttonContainer}>
            <LargeButton
              title={t.common.next}
              onPress={handleContinue}
              disabled={!preference}
              icon="arrow-right"
              iconPosition="right"
              size="xl"
            />
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
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  progressDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.neutral.mediumGray,
    marginHorizontal: spacing.sm,
  },
  progressActive: {
    backgroundColor: colors.primary.main,
    width: 24,
  },
  header: {
    alignItems: 'center',
    marginTop: spacing.xxl,
    marginBottom: spacing.xl,
  },
  stepText: {
    fontSize: typography.sizes.md,
    color: colors.primary.main,
    fontWeight: typography.weights.medium,
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
    color: colors.neutral.black,
    textAlign: 'center',
    lineHeight: typography.sizes.xxl * typography.lineHeights.normal,
  },
  optionsContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  optionCard: {
    marginBottom: spacing.lg,
  },
  recommendedBadge: {
    backgroundColor: colors.secondary.greenLight,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 20,
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  recommendedText: {
    fontSize: typography.sizes.md,
    color: colors.secondary.green,
    fontWeight: typography.weights.medium,
  },
  buttonContainer: {
    paddingBottom: spacing.lg,
  },
});

export default OnboardingStep1;
