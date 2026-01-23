// Large Accessible Button Component for Elderly Users
import React from 'react';
import { 
  TouchableOpacity, 
  Text, 
  StyleSheet, 
  View,
  ActivityIndicator,
  Platform 
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors, typography, borderRadius, shadows, buttonSizes } from '../../theme';

const LargeButton = ({
  title,
  onPress,
  icon,
  iconPosition = 'left',
  variant = 'primary', // primary, secondary, outline, danger
  size = 'lg', // sm, md, lg, xl
  disabled = false,
  loading = false,
  fullWidth = true,
  style,
  textStyle,
}) => {
  const handlePress = () => {
    // Haptic feedback for better UX (only on native platforms)
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch (e) {
        // Silently ignore haptic errors
      }
    }
    onPress?.();
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return {
          container: {
            backgroundColor: colors.primary.main,
          },
          text: {
            color: colors.neutral.white,
          },
        };
      case 'secondary':
        return {
          container: {
            backgroundColor: colors.secondary.green,
          },
          text: {
            color: colors.neutral.white,
          },
        };
      case 'outline':
        return {
          container: {
            backgroundColor: 'transparent',
            borderWidth: 3,
            borderColor: colors.primary.main,
          },
          text: {
            color: colors.primary.main,
          },
        };
      case 'danger':
        return {
          container: {
            backgroundColor: colors.accent.red,
          },
          text: {
            color: colors.neutral.white,
          },
        };
      case 'companion':
        return {
          container: {
            backgroundColor: colors.accent.orange,
          },
          text: {
            color: colors.neutral.white,
          },
        };
      default:
        return {
          container: {
            backgroundColor: colors.primary.main,
          },
          text: {
            color: colors.neutral.white,
          },
        };
    }
  };

  const getSizeStyles = () => {
    const sizeConfig = buttonSizes[size] || buttonSizes.lg;
    return {
      container: {
        height: sizeConfig.height,
        paddingHorizontal: sizeConfig.paddingHorizontal,
      },
      text: {
        fontSize: sizeConfig.fontSize,
      },
    };
  };

  const variantStyles = getVariantStyles();
  const sizeStyles = getSizeStyles();

  return (
    <TouchableOpacity
      style={[
        styles.container,
        variantStyles.container,
        sizeStyles.container,
        fullWidth && styles.fullWidth,
        disabled && styles.disabled,
        shadows.md,
        style,
      ]}
      onPress={handlePress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      {loading ? (
        <ActivityIndicator 
          size="large" 
          color={variantStyles.text.color} 
        />
      ) : (
        <View style={styles.content}>
          {icon && iconPosition === 'left' && (
            <MaterialCommunityIcons
              name={icon}
              size={sizeStyles.text.fontSize + 8}
              color={variantStyles.text.color}
              style={styles.iconLeft}
            />
          )}
          <Text
            style={[
              styles.text,
              variantStyles.text,
              sizeStyles.text,
              textStyle,
            ]}
          >
            {title}
          </Text>
          {icon && iconPosition === 'right' && (
            <MaterialCommunityIcons
              name={icon}
              size={sizeStyles.text.fontSize + 8}
              color={variantStyles.text.color}
              style={styles.iconRight}
            />
          )}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.5,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontWeight: typography.weights.bold,
    textAlign: 'center',
  },
  iconLeft: {
    marginRight: 12,
  },
  iconRight: {
    marginLeft: 12,
  },
});

export default LargeButton;
