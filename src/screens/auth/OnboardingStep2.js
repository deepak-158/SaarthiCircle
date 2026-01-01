// Onboarding Step 2 - Interests Selection
import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { LargeButton } from '../../components/common';
import { colors, typography, spacing, borderRadius, shadows } from '../../theme';
import { getTranslation } from '../../i18n/translations';

const interests = [
  { id: 'religion', emoji: '🕉', label: 'Religion / Spirituality', labelHi: 'धर्म / आध्यात्मिकता' },
  { id: 'music', emoji: '🎵', label: 'Music', labelHi: 'संगीत' },
  { id: 'health', emoji: '🩺', label: 'Health Talk', labelHi: 'स्वास्थ्य चर्चा' },
  { id: 'daily', emoji: '☕', label: 'Daily Life', labelHi: 'दैनिक जीवन' },
  { id: 'family', emoji: '👨‍👩‍👧‍👦', label: 'Family', labelHi: 'परिवार' },
  { id: 'nature', emoji: '🌿', label: 'Nature', labelHi: 'प्रकृति' },
];

const OnboardingStep2 = ({ navigation, route }) => {
  const { language = 'en', communicationPreference } = route.params || {};
  const t = getTranslation(language);
  const [selectedInterests, setSelectedInterests] = useState([]);

  const toggleInterest = (interestId) => {
    setSelectedInterests((prev) => {
      if (prev.includes(interestId)) {
        return prev.filter((id) => id !== interestId);
      }
      return [...prev, interestId];
    });
  };

  const handleContinue = () => {
    navigation.navigate('Onboarding3', { 
      language, 
      communicationPreference,
      interests: selectedInterests,
    });
  };

  const handleBack = () => {
    navigation.goBack();
  };

  return (
    <LinearGradient
      colors={[colors.primary.light, colors.neutral.white]}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Progress */}
          <View style={styles.progressContainer}>
            <View style={styles.progressDot} />
            <View style={[styles.progressDot, styles.progressActive]} />
            <View style={styles.progressDot} />
          </View>

          {/* Title */}
          <View style={styles.header}>
            <Text style={styles.stepText}>Step 2 of 3</Text>
            <Text style={styles.title}>{t.onboarding.step2Title}</Text>
            <Text style={styles.subtitle}>
              Select all that interest you (minimum 1)
            </Text>
          </View>

          {/* Interest Cards */}
          <View style={styles.interestsGrid}>
            {interests.map((interest) => {
              const isSelected = selectedInterests.includes(interest.id);
              return (
                <TouchableOpacity
                  key={interest.id}
                  style={[
                    styles.interestCard,
                    isSelected && styles.interestCardSelected,
                    shadows.sm,
                  ]}
                  onPress={() => toggleInterest(interest.id)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.interestEmoji}>{interest.emoji}</Text>
                  <Text style={[
                    styles.interestLabel,
                    isSelected && styles.interestLabelSelected,
                  ]}>
                    {language === 'hi' ? interest.labelHi : interest.label}
                  </Text>
                  {isSelected && (
                    <View style={styles.checkMark}>
                      <Text style={styles.checkMarkText}>✓</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Selection Count */}
          <View style={styles.selectionInfo}>
            <Text style={styles.selectionText}>
              {selectedInterests.length} selected
            </Text>
          </View>

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={handleBack}
            >
              <Text style={styles.backButtonText}>{t.common.back}</Text>
            </TouchableOpacity>
            
            <View style={styles.nextButtonContainer}>
              <LargeButton
                title={t.common.next}
                onPress={handleContinue}
                disabled={selectedInterests.length === 0}
                icon="arrow-right"
                iconPosition="right"
                size="lg"
              />
            </View>
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
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
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
    marginTop: spacing.xl,
    marginBottom: spacing.lg,
  },
  stepText: {
    fontSize: typography.sizes.md,
    color: colors.primary.main,
    fontWeight: typography.weights.medium,
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.neutral.black,
    textAlign: 'center',
    lineHeight: typography.sizes.xl * typography.lineHeights.normal,
  },
  subtitle: {
    fontSize: typography.sizes.md,
    color: colors.neutral.darkGray,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  interestsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
  },
  interestCard: {
    width: '48%',
    backgroundColor: colors.neutral.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.neutral.mediumGray,
  },
  interestCardSelected: {
    borderColor: colors.primary.main,
    backgroundColor: colors.primary.light,
  },
  interestEmoji: {
    fontSize: 48,
    marginBottom: spacing.sm,
  },
  interestLabel: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semiBold,
    color: colors.neutral.black,
    textAlign: 'center',
  },
  interestLabelSelected: {
    color: colors.primary.dark,
  },
  checkMark: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary.main,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkMarkText: {
    color: colors.neutral.white,
    fontSize: 16,
    fontWeight: typography.weights.bold,
  },
  selectionInfo: {
    alignItems: 'center',
    marginTop: spacing.md,
  },
  selectionText: {
    fontSize: typography.sizes.md,
    color: colors.primary.main,
    fontWeight: typography.weights.medium,
  },
  buttonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  backButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  backButtonText: {
    fontSize: typography.sizes.lg,
    color: colors.neutral.darkGray,
    fontWeight: typography.weights.medium,
  },
  nextButtonContainer: {
    flex: 1,
    marginLeft: spacing.md,
  },
});

export default OnboardingStep2;
