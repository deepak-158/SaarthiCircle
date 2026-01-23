// Onboarding Step 3 - Consent & Privacy
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
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Speech from 'expo-speech';
import { LargeButton } from '../../components/common';
import { colors, typography, spacing, borderRadius, shadows } from '../../theme';
import { getTranslation } from '../../i18n/translations';

const OnboardingStep3 = ({ navigation, route }) => {
  const { language = 'en', communicationPreference, interests } = route.params || {};
  const t = getTranslation(language);
  const [agreed, setAgreed] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const consentText = language === 'hi' 
    ? 'हम आपकी बातचीत को निजी और सुरक्षित रखते हैं। आपकी जानकारी का उपयोग केवल आपको साथियों और देखभालकर्ताओं से जोड़ने के लिए किया जाता है। हम कभी भी आपकी जानकारी बेचते या साझा नहीं करते।'
    : 'We keep your conversations private and secure. Your information is only used to help connect you with companions and caregivers who can support you. We never sell or share your information with third parties.';

  const handlePlayAudio = async () => {
    if (isPlaying) {
      Speech.stop();
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
      Speech.speak(consentText, {
        language: language === 'hi' ? 'hi-IN' : 'en-IN',
        onDone: () => setIsPlaying(false),
        onError: () => setIsPlaying(false),
      });
    }
  };

  const handleContinue = async () => {
    // Set first time to false so we don't show onboarding again
    try {
      await AsyncStorage.setItem('isFirstTime', 'false');
    } catch (e) {
      console.error('Error saving onboarding status:', e);
    }

    // Navigate to login/register
    navigation.navigate('Login', { 
      language, 
      communicationPreference,
      interests,
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
            <View style={styles.progressDot} />
            <View style={[styles.progressDot, styles.progressActive]} />
          </View>

          {/* Title */}
          <View style={styles.header}>
            <Text style={styles.stepText}>Step 3 of 3</Text>
            <Text style={styles.title}>{t.onboarding.step3Title}</Text>
          </View>

          {/* Privacy Icon */}
          <View style={styles.iconContainer}>
            <View style={styles.iconCircle}>
              <MaterialCommunityIcons
                name="shield-check"
                size={60}
                color={colors.primary.main}
              />
            </View>
          </View>

          {/* Consent Text */}
          <View style={[styles.consentCard, shadows.sm]}>
            <Text style={styles.consentText}>{consentText}</Text>
          </View>

          {/* Audio Button */}
          <TouchableOpacity
            style={[styles.audioButton, shadows.sm]}
            onPress={handlePlayAudio}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons
              name={isPlaying ? 'pause-circle' : 'play-circle'}
              size={36}
              color={colors.primary.main}
            />
            <Text style={styles.audioButtonText}>
              {isPlaying ? 'Pause Audio' : t.onboarding.listenConsent}
            </Text>
          </TouchableOpacity>

          {/* Privacy Points */}
          <View style={styles.privacyPoints}>
            <View style={styles.privacyPoint}>
              <MaterialCommunityIcons
                name="check-circle"
                size={28}
                color={colors.secondary.green}
              />
              <Text style={styles.privacyPointText}>
                Your data is encrypted and secure
              </Text>
            </View>
            <View style={styles.privacyPoint}>
              <MaterialCommunityIcons
                name="check-circle"
                size={28}
                color={colors.secondary.green}
              />
              <Text style={styles.privacyPointText}>
                We never share your information
              </Text>
            </View>
            <View style={styles.privacyPoint}>
              <MaterialCommunityIcons
                name="check-circle"
                size={28}
                color={colors.secondary.green}
              />
              <Text style={styles.privacyPointText}>
                You can delete your data anytime
              </Text>
            </View>
          </View>

          {/* Checkbox */}
          <TouchableOpacity
            style={styles.checkboxContainer}
            onPress={() => setAgreed(!agreed)}
            activeOpacity={0.7}
          >
            <View style={[styles.checkbox, agreed && styles.checkboxChecked]}>
              {agreed && (
                <MaterialCommunityIcons
                  name="check"
                  size={24}
                  color={colors.neutral.white}
                />
              )}
            </View>
            <Text style={styles.checkboxLabel}>{t.onboarding.agreeText}</Text>
          </TouchableOpacity>

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
                title={t.onboarding.continue}
                onPress={handleContinue}
                disabled={!agreed}
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
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
    color: colors.neutral.black,
    textAlign: 'center',
  },
  iconContainer: {
    alignItems: 'center',
    marginVertical: spacing.lg,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.primary.light,
    justifyContent: 'center',
    alignItems: 'center',
  },
  consentCard: {
    backgroundColor: colors.neutral.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.neutral.mediumGray,
  },
  consentText: {
    fontSize: typography.sizes.md,
    color: colors.neutral.black,
    lineHeight: typography.sizes.md * typography.lineHeights.relaxed,
  },
  audioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.neutral.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginTop: spacing.lg,
    borderWidth: 2,
    borderColor: colors.primary.main,
  },
  audioButtonText: {
    fontSize: typography.sizes.lg,
    color: colors.primary.main,
    fontWeight: typography.weights.medium,
    marginLeft: spacing.sm,
  },
  privacyPoints: {
    marginTop: spacing.lg,
  },
  privacyPoint: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  privacyPointText: {
    fontSize: typography.sizes.md,
    color: colors.neutral.black,
    marginLeft: spacing.sm,
    flex: 1,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xl,
    padding: spacing.md,
    backgroundColor: colors.neutral.lightGray,
    borderRadius: borderRadius.md,
  },
  checkbox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: colors.primary.main,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  checkboxChecked: {
    backgroundColor: colors.primary.main,
  },
  checkboxLabel: {
    fontSize: typography.sizes.lg,
    color: colors.neutral.black,
    fontWeight: typography.weights.medium,
    flex: 1,
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

export default OnboardingStep3;
