// Large Card Component for Options and Information Display
import React from 'react';
import { 
  TouchableOpacity, 
  Text, 
  StyleSheet, 
  View 
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors, typography, borderRadius, shadows, spacing } from '../../theme';

const LargeCard = ({
  title,
  subtitle,
  icon,
  emoji,
  onPress,
  selected = false,
  variant = 'default', // default, highlight, success, warning, danger
  size = 'md', // sm, md, lg
  disabled = false,
  style,
  children,
}) => {
  const handlePress = () => {
    if (!disabled && onPress) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onPress();
    }
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'highlight':
        return {
          container: {
            backgroundColor: colors.primary.light,
            borderColor: colors.primary.main,
          },
          title: {
            color: colors.primary.dark,
          },
        };
      case 'success':
        return {
          container: {
            backgroundColor: colors.secondary.greenLight,
            borderColor: colors.secondary.green,
          },
          title: {
            color: colors.secondary.green,
          },
        };
      case 'warning':
        return {
          container: {
            backgroundColor: '#FFF8E1',
            borderColor: colors.accent.yellow,
          },
          title: {
            color: '#F9A825',
          },
        };
      case 'danger':
        return {
          container: {
            backgroundColor: '#FFEBEE',
            borderColor: colors.accent.red,
          },
          title: {
            color: colors.accent.red,
          },
        };
      default:
        return {
          container: {
            backgroundColor: colors.neutral.white,
            borderColor: colors.neutral.mediumGray,
          },
          title: {
            color: colors.neutral.black,
          },
        };
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return {
          container: {
            padding: spacing.md,
            minHeight: 80,
          },
          title: {
            fontSize: typography.sizes.md,
          },
          subtitle: {
            fontSize: typography.sizes.sm,
          },
          icon: 28,
          emoji: 28,
        };
      case 'lg':
        return {
          container: {
            padding: spacing.xl,
            minHeight: 140,
          },
          title: {
            fontSize: typography.sizes.xl,
          },
          subtitle: {
            fontSize: typography.sizes.md,
          },
          icon: 48,
          emoji: 48,
        };
      default: // md
        return {
          container: {
            padding: spacing.lg,
            minHeight: 100,
          },
          title: {
            fontSize: typography.sizes.lg,
          },
          subtitle: {
            fontSize: typography.sizes.sm,
          },
          icon: 36,
          emoji: 36,
        };
    }
  };

  const variantStyles = getVariantStyles();
  const sizeStyles = getSizeStyles();

  return (
    <TouchableOpacity
      style={[
        styles.container,
        variantStyles.container,
        sizeStyles.container,
        selected && styles.selected,
        disabled && styles.disabled,
        shadows.sm,
        style,
      ]}
      onPress={handlePress}
      disabled={disabled}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ selected, disabled }}
    >
      <View style={styles.content}>
        {(icon || emoji) && (
          <View style={styles.iconContainer}>
            {emoji ? (
              <Text style={[styles.emoji, { fontSize: sizeStyles.emoji }]}>
                {emoji}
              </Text>
            ) : (
              <MaterialCommunityIcons
                name={icon}
                size={sizeStyles.icon}
                color={selected ? colors.primary.main : variantStyles.title.color}
              />
            )}
          </View>
        )}
        <View style={styles.textContainer}>
          <Text
            style={[
              styles.title,
              variantStyles.title,
              sizeStyles.title,
              selected && styles.selectedText,
            ]}
          >
            {title}
          </Text>
          {subtitle && (
            <Text
              style={[
                styles.subtitle,
                sizeStyles.subtitle,
              ]}
            >
              {subtitle}
            </Text>
          )}
        </View>
        {selected && (
          <MaterialCommunityIcons
            name="check-circle"
            size={28}
            color={colors.primary.main}
            style={styles.checkIcon}
          />
        )}
      </View>
      {children}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    width: '100%',
  },
  selected: {
    borderColor: colors.primary.main,
    borderWidth: 3,
    backgroundColor: colors.primary.light,
  },
  disabled: {
    opacity: 0.5,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    marginRight: spacing.md,
  },
  emoji: {
    textAlign: 'center',
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontWeight: typography.weights.semiBold,
  },
  subtitle: {
    color: colors.neutral.darkGray,
    marginTop: spacing.xs,
    lineHeight: typography.lineHeights.relaxed * typography.sizes.sm,
  },
  selectedText: {
    color: colors.primary.dark,
  },
  checkIcon: {
    marginLeft: spacing.sm,
  },
});

export default LargeCard;
