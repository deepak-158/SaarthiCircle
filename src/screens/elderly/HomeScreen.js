// Home Screen - Main screen for elderly users
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
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
import { LargeButton, MoodSelector, VoiceButton } from '../../components/common';
import { colors, typography, spacing, borderRadius, shadows } from '../../theme';
import useIncomingCallListener from '../../hooks/useIncomingCallListener';

// Default profile data if user data not available
const DEFAULT_PROFILE = {
  fullName: 'Friend',
  age: null,
  city: 'Your City',
};

const HomeScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const [currentMood, setCurrentMood] = useState(null);
  const [userProfile, setUserProfile] = useState(DEFAULT_PROFILE);
  const [greeting, setGreeting] = useState('');

  // Listen for incoming calls
  useIncomingCallListener();

  useEffect(() => {
    loadUserProfile();

    // Set greeting based on time of day
    const hour = new Date().getHours();
    if (hour < 12) {
      setGreeting('Good Morning');
    } else if (hour < 17) {
      setGreeting('Good Afternoon');
    } else {
      setGreeting('Good Evening');
    }
  }, []);

  const loadUserProfile = async () => {
    try {
      const profileJson = await AsyncStorage.getItem('userProfile');
      if (profileJson) {
        const profile = JSON.parse(profileJson);
        setUserProfile({
          ...DEFAULT_PROFILE,
          ...profile,
          // Use actual name or fallback to 'Friend' - handle both name and fullName fields
          fullName: profile.name || profile.full_name || profile.fullName || DEFAULT_PROFILE.fullName,
        });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const handleTalkToCompanion = () => {
    navigation.navigate('CompanionMatching');
  };

  const handleNeedHelp = () => {
    navigation.navigate('HelpCategories');
  };

  const handleEmergency = () => {
    navigation.navigate('SOS');
  };

  const handleMoodSelect = (mood) => {
    setCurrentMood(mood);
    // Log mood to backend
  };

  const handleVoiceMood = () => {
    // Voice input for mood
    navigation.navigate('MoodCheckIn');
  };

  return (
    <LinearGradient
      colors={[colors.primary.light, colors.secondary.cream, colors.neutral.white]}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header with Greeting */}
          <View style={styles.header}>
            <View style={styles.greetingContainer}>
              <Text style={styles.greetingTime}>{greeting} 🌸</Text>
              <Text style={styles.greetingName}>
                {userProfile.fullName && userProfile.fullName !== DEFAULT_PROFILE.fullName
                  ? `Hello, ${userProfile.fullName.split(' ')[0]}!`
                  : t('home.greeting')}
              </Text>
              <Text style={styles.safeMessage}>{t('home.safeMessage')}</Text>
              {userProfile.city && userProfile.city !== 'Your City' && (
                <Text style={styles.locationText}>📍 {userProfile.city}</Text>
              )}
            </View>

            {/* Profile Icon */}
            <TouchableOpacity
              style={styles.profileButton}
              onPress={() => navigation.navigate('Profile')}
            >
              <MaterialCommunityIcons
                name="account-circle"
                size={56}
                color={colors.primary.main}
              />
            </TouchableOpacity>
          </View>

          {/* Current Mood Display */}
          {currentMood && (
            <View style={[styles.currentMoodCard, shadows.sm]}>
              <Text style={styles.currentMoodText}>
                {currentMood === 'happy' ? '😊' : currentMood === 'okay' ? '😐' : '😞'}
                {' '}You're feeling {currentMood} today
              </Text>
            </View>
          )}

          {/* Main Action Buttons */}
          <View style={styles.mainButtons}>
            {/* Talk to Companion - Primary Action */}
            <LargeButton
              title={t('home.talkToCompanion')}
              onPress={handleTalkToCompanion}
              icon="heart"
              variant="companion"
              size="xl"
              style={styles.companionButton}
            />

            {/* I Need Help */}
            <LargeButton
              title={t('home.needHelp')}
              onPress={handleNeedHelp}
              icon="hand-heart"
              variant="secondary"
              size="xl"
              style={styles.helpButton}
            />

            {/* Emergency SOS */}
            <LargeButton
              title={t('home.emergency')}
              onPress={handleEmergency}
              icon="alert-circle"
              variant="danger"
              size="xl"
              style={styles.sosButton}
            />
          </View>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
          </View>

          {/* Daily Mood Check-in */}
          <View style={[styles.moodSection, shadows.sm]}>
            <Text style={styles.moodTitle}>{t('home.moodQuestion')}</Text>

            <MoodSelector
              selectedMood={currentMood}
              onMoodSelect={handleMoodSelect}
              size="lg"
            />

            {/* Voice Option */}
            <TouchableOpacity
              style={styles.voiceMoodButton}
              onPress={handleVoiceMood}
            >
              <MaterialCommunityIcons
                name="microphone"
                size={28}
                color={colors.primary.main}
              />
              <Text style={styles.voiceMoodText}>
                🎤 "{t('mood.voicePrompt')}"
              </Text>
            </TouchableOpacity>
          </View>

          {/* Quick Help Card */}
          <TouchableOpacity
            style={[styles.quickHelpCard, shadows.sm]}
            onPress={handleNeedHelp}
          >
            <MaterialCommunityIcons
              name="phone-in-talk"
              size={40}
              color={colors.secondary.green}
            />
            <View style={styles.quickHelpText}>
              <Text style={styles.quickHelpTitle}>{t('home.quickHelpTitle')}</Text>
              <Text style={styles.quickHelpSubtitle}>
                {t('home.quickHelpSubtitle')}
              </Text>
            </View>
            <MaterialCommunityIcons
              name="chevron-right"
              size={32}
              color={colors.neutral.darkGray}
            />
          </TouchableOpacity>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },
  greetingContainer: {
    flex: 1,
  },
  greetingTime: {
    fontSize: typography.sizes.lg,
    color: colors.neutral.darkGray,
    fontWeight: typography.weights.medium,
  },
  greetingName: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
    color: colors.neutral.black,
    marginTop: spacing.xs,
  },
  safeMessage: {
    fontSize: typography.sizes.md,
    color: colors.secondary.green,
    fontWeight: typography.weights.medium,
    marginTop: spacing.xs,
  },
  locationText: {
    fontSize: typography.sizes.sm,
    color: colors.neutral.darkGray,
    marginTop: spacing.xs,
  },
  profileButton: {
    padding: spacing.sm,
  },
  currentMoodCard: {
    backgroundColor: colors.neutral.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    alignItems: 'center',
  },
  currentMoodText: {
    fontSize: typography.sizes.lg,
    color: colors.neutral.black,
    fontWeight: typography.weights.medium,
  },
  mainButtons: {
    marginBottom: spacing.lg,
  },
  companionButton: {
    marginBottom: spacing.md,
  },
  helpButton: {
    marginBottom: spacing.md,
  },
  sosButton: {
    marginBottom: spacing.md,
  },
  divider: {
    marginVertical: spacing.md,
  },
  dividerLine: {
    height: 2,
    backgroundColor: colors.neutral.mediumGray,
    opacity: 0.5,
  },
  moodSection: {
    backgroundColor: colors.neutral.white,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  moodTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.semiBold,
    color: colors.neutral.black,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  voiceMoodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
    padding: spacing.md,
    backgroundColor: colors.primary.light,
    borderRadius: borderRadius.md,
  },
  voiceMoodText: {
    fontSize: typography.sizes.md,
    color: colors.primary.main,
    fontWeight: typography.weights.medium,
    marginLeft: spacing.sm,
  },
  quickHelpCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.secondary.greenLight,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 2,
    borderColor: colors.secondary.green,
  },
  quickHelpText: {
    flex: 1,
    marginLeft: spacing.md,
  },
  quickHelpTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semiBold,
    color: colors.neutral.black,
  },
  quickHelpSubtitle: {
    fontSize: typography.sizes.md,
    color: colors.neutral.darkGray,
    marginTop: spacing.xs,
  },
});

export default HomeScreen;
