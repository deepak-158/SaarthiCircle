// Help Categories Screen - "I Need Help" flow
import React from 'react';
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
import { LargeCard } from '../../components/common';
import { colors, typography, spacing, borderRadius, shadows } from '../../theme';

const helpCategories = [
  {
    id: 'emotional',
    icon: 'heart',
    emoji: '🧡',
    titleKey: 'help.emotional',
    subtitleKey: 'help.emotionalDesc',
    color: colors.accent.orange,
    bgColor: '#FFF3E0',
  },
  {
    id: 'daily',
    icon: 'tools',
    emoji: '🛠',
    titleKey: 'help.daily',
    subtitleKey: 'help.dailyDesc',
    color: colors.primary.main,
    bgColor: colors.primary.light,
  },
  {
    id: 'health',
    icon: 'stethoscope',
    emoji: '🩺',
    titleKey: 'help.health',
    subtitleKey: 'help.healthDesc',
    color: colors.secondary.green,
    bgColor: colors.secondary.greenLight,
  },
  {
    id: 'emergency',
    icon: 'alert-circle',
    emoji: '🚨',
    titleKey: 'help.safety',
    subtitleKey: 'help.safetyDesc',
    color: colors.accent.red,
    bgColor: '#FFEBEE',
  },
];

const HelpCategoriesScreen = ({ navigation }) => {
  const { t } = useTranslation();

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
            <Text style={styles.title}>{t('help.title')}</Text>
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
                    {t(category.titleKey)}
                  </Text>
                  <Text style={styles.categorySubtitle}>
                    {t(category.subtitleKey)}
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
              {t('help.reassuringMessage')}
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
