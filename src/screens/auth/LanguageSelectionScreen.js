// Language Selection Screen
import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView,
  ScrollView 
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { LargeButton, LargeCard, VoiceButton } from '../../components/common';
import { colors, typography, spacing } from '../../theme';

const languages = [
  { id: 'hi', name: 'हिंदी', englishName: 'Hindi', icon: '🇮🇳' },
  { id: 'en', name: 'English', englishName: 'English', icon: '🌐' },
  { id: 'bn', name: 'বাংলা', englishName: 'Bengali', icon: '🇮🇳' },
  { id: 'ta', name: 'தமிழ்', englishName: 'Tamil', icon: '🇮🇳' },
  { id: 'te', name: 'తెలుగు', englishName: 'Telugu', icon: '🇮🇳' },
  { id: 'mr', name: 'मराठी', englishName: 'Marathi', icon: '🇮🇳' },
];

const LanguageSelectionScreen = ({ navigation }) => {
  const [selectedLanguage, setSelectedLanguage] = useState(null);
  const [isListening, setIsListening] = useState(false);

  const handleLanguageSelect = (langId) => {
    setSelectedLanguage(langId);
  };

  const handleContinue = () => {
    if (selectedLanguage) {
      // Store language preference
      navigation.navigate('Onboarding1', { language: selectedLanguage });
    }
  };

  const handleVoiceInput = () => {
    setIsListening(!isListening);
    // Voice recognition will detect language automatically
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
          <View style={styles.header}>
            <Text style={styles.title}>Choose Your Language</Text>
            <Text style={styles.titleHindi}>अपनी भाषा चुनें</Text>
          </View>

          {/* Voice Option */}
          <View style={styles.voiceSection}>
            <VoiceButton
              size="md"
              isListening={isListening}
              onPress={handleVoiceInput}
              prompt="🎤 Speak your language"
            />
          </View>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Language Options */}
          <View style={styles.languageGrid}>
            {languages.map((lang) => (
              <View key={lang.id} style={styles.languageItem}>
                <LargeCard
                  title={lang.name}
                  subtitle={lang.englishName}
                  emoji={lang.icon}
                  selected={selectedLanguage === lang.id}
                  onPress={() => handleLanguageSelect(lang.id)}
                  size="md"
                />
              </View>
            ))}
          </View>

          {/* Continue Button */}
          <View style={styles.buttonContainer}>
            <LargeButton
              title="Continue"
              onPress={handleContinue}
              disabled={!selectedLanguage}
              icon="arrow-right"
              iconPosition="right"
              size="xl"
            />
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
  header: {
    alignItems: 'center',
    marginTop: spacing.xl,
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
    color: colors.neutral.black,
    textAlign: 'center',
  },
  titleHindi: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.medium,
    color: colors.neutral.darkGray,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  voiceSection: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 2,
    backgroundColor: colors.neutral.mediumGray,
  },
  dividerText: {
    fontSize: typography.sizes.md,
    color: colors.neutral.darkGray,
    marginHorizontal: spacing.md,
    fontWeight: typography.weights.medium,
  },
  languageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  languageItem: {
    width: '48%',
    marginBottom: spacing.md,
  },
  buttonContainer: {
    marginTop: spacing.xl,
  },
});

export default LanguageSelectionScreen;
