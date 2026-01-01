// Help Categories Screen - "I Need Help" flow
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
import { LargeCard } from '../../components/common';
import { colors, typography, spacing, borderRadius, shadows } from '../../theme';
import { getTranslation } from '../../i18n/translations';

const helpCategories = [
  {
    id: 'emotional',
    icon: 'heart',
    emoji: '🧡',
    title: 'Emotional Support',
    titleHi: 'भावनात्मक सहारा',
    subtitle: 'I want someone to talk to',
    subtitleHi: 'मैं किसी से बात करना चाहता/चाहती हूं',
    color: colors.accent.orange,
    bgColor: '#FFF3E0',
  },
  {
    id: 'daily',
    icon: 'tools',
    emoji: '🛠',
    title: 'Daily Assistance',
    titleHi: 'दैनिक सहायता',
    subtitle: 'Medicine, groceries, small help',
    subtitleHi: 'दवाई, किराना, छोटी मदद',
    color: colors.primary.main,
    bgColor: colors.primary.light,
  },
  {
    id: 'health',
    icon: 'stethoscope',
    emoji: '🩺',
    title: 'Health-Related Help',
    titleHi: 'स्वास्थ्य संबंधी मदद',
    subtitle: 'Feeling unwell, need guidance',
    subtitleHi: 'तबीयत ठीक नहीं, मार्गदर्शन चाहिए',
    color: colors.secondary.green,
    bgColor: colors.secondary.greenLight,
  },
  {
    id: 'emergency',
    icon: 'alert-circle',
    emoji: '🚨',
    title: 'Safety / Emergency',
    titleHi: 'सुरक्षा / आपातकाल',
    subtitle: 'Danger, fall, abuse',
    subtitleHi: 'खतरा, गिरना, दुर्व्यवहार',
    color: colors.accent.red,
    bgColor: '#FFEBEE',
  },
];

const HelpCategoriesScreen = ({ navigation }) => {
  const [language] = useState('en');
  const t = getTranslation(language);

  const handleCategorySelect = (category) => {
    if (category.id === 'emergency') {
      navigation.navigate('SOS');
    } else {
      navigation.navigate('VoiceHelpInput', { category });
    }
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
            <Text style={styles.title}>{t.help.title}</Text>
          </View>

          {/* Help Categories */}
          <View style={styles.categoriesContainer}>
            {helpCategories.map((category) => (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.categoryCard,
                  { backgroundColor: category.bgColor },
                  shadows.md,
                ]}
                onPress={() => handleCategorySelect(category)}
                activeOpacity={0.8}
              >
                <View style={[styles.iconContainer, { backgroundColor: category.color }]}>
                  <Text style={styles.emoji}>{category.emoji}</Text>
                </View>
                <View style={styles.categoryText}>
                  <Text style={[styles.categoryTitle, { color: category.color }]}>
                    {language === 'hi' ? category.titleHi : category.title}
                  </Text>
                  <Text style={styles.categorySubtitle}>
                    {language === 'hi' ? category.subtitleHi : category.subtitle}
                  </Text>
                </View>
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={32}
                  color={category.color}
                />
              </TouchableOpacity>
            ))}
          </View>

          {/* Reassuring Message */}
          <View style={styles.reassuringCard}>
            <MaterialCommunityIcons
              name="hand-heart"
              size={36}
              color={colors.secondary.green}
            />
            <Text style={styles.reassuringText}>
              Don't worry, we are here to help you. Take your time.
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
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  backButton: {
    marginRight: spacing.md,
  },
  title: {
    flex: 1,
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.neutral.black,
  },
  categoriesContainer: {
    marginBottom: spacing.lg,
  },
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emoji: {
    fontSize: 32,
  },
  categoryText: {
    flex: 1,
    marginLeft: spacing.md,
  },
  categoryTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
  },
  categorySubtitle: {
    fontSize: typography.sizes.md,
    color: colors.neutral.darkGray,
    marginTop: spacing.xs,
  },
  reassuringCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.secondary.greenLight,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 2,
    borderColor: colors.secondary.green,
  },
  reassuringText: {
    flex: 1,
    fontSize: typography.sizes.md,
    color: colors.neutral.black,
    marginLeft: spacing.md,
    lineHeight: typography.sizes.md * typography.lineHeights.relaxed,
  },
});

export default HelpCategoriesScreen;
