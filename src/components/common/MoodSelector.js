// Mood Selector Component with Large Emoji Buttons
import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity 
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors, typography, borderRadius, shadows, spacing } from '../../theme';

const moods = [
  { id: 'happy', emoji: '😊', label: 'Happy', color: colors.mood.happy },
  { id: 'okay', emoji: '😐', label: 'Okay', color: colors.mood.neutral },
  { id: 'sad', emoji: '😞', label: 'Sad', color: colors.mood.sad },
];

const MoodSelector = ({
  selectedMood,
  onMoodSelect,
  title,
  showLabels = true,
  size = 'lg', // md, lg, xl
  style,
}) => {
  const handleMoodSelect = (moodId) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onMoodSelect?.(moodId);
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'md':
        return {
          button: { width: 70, height: 70 },
          emoji: 36,
          label: typography.sizes.sm,
        };
      case 'xl':
        return {
          button: { width: 110, height: 110 },
          emoji: 60,
          label: typography.sizes.lg,
        };
      default: // lg
        return {
          button: { width: 90, height: 90 },
          emoji: 48,
          label: typography.sizes.md,
        };
    }
  };

  const sizeStyles = getSizeStyles();

  return (
    <View style={[styles.container, style]}>
      {title && <Text style={styles.title}>{title}</Text>}
      <View style={styles.moodContainer}>
        {moods.map((mood) => (
          <TouchableOpacity
            key={mood.id}
            style={[
              styles.moodButton,
              sizeStyles.button,
              selectedMood === mood.id && {
                ...styles.selectedMood,
                borderColor: mood.color,
                backgroundColor: `${mood.color}20`,
              },
              shadows.sm,
            ]}
            onPress={() => handleMoodSelect(mood.id)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={mood.label}
            accessibilityState={{ selected: selectedMood === mood.id }}
          >
            <Text style={[styles.emoji, { fontSize: sizeStyles.emoji }]}>
              {mood.emoji}
            </Text>
            {showLabels && (
              <Text
                style={[
                  styles.label,
                  { fontSize: sizeStyles.label },
                  selectedMood === mood.id && { color: mood.color },
                ]}
              >
                {mood.label}
              </Text>
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  title: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.medium,
    color: colors.neutral.black,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  moodContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  moodButton: {
    backgroundColor: colors.neutral.white,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.neutral.mediumGray,
  },
  selectedMood: {
    borderWidth: 4,
  },
  emoji: {
    textAlign: 'center',
  },
  label: {
    marginTop: spacing.xs,
    fontWeight: typography.weights.medium,
    color: colors.neutral.darkGray,
  },
});

export default MoodSelector;
