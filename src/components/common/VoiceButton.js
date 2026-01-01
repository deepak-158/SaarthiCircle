// Voice Input Button Component with Visual Feedback
import React, { useState, useEffect, useRef } from 'react';
import { 
  TouchableOpacity, 
  Text, 
  StyleSheet, 
  View,
  Animated,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors, typography, borderRadius, shadows, spacing } from '../../theme';

const VoiceButton = ({
  onPress,
  onLongPress,
  isListening = false,
  prompt = 'Tap to speak',
  size = 'lg', // md, lg, xl
  disabled = false,
  style,
}) => {
  const [pressed, setPressed] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const waveAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isListening) {
      // Pulse animation when listening
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Wave animation
      Animated.loop(
        Animated.timing(waveAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        })
      ).start();
    } else {
      pulseAnim.setValue(1);
      waveAnim.setValue(0);
    }
  }, [isListening]);

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    onPress?.();
  };

  const handleLongPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    onLongPress?.();
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'md':
        return {
          button: { width: 100, height: 100 },
          icon: 48,
          text: typography.sizes.md,
        };
      case 'xl':
        return {
          button: { width: 160, height: 160 },
          icon: 80,
          text: typography.sizes.xl,
        };
      default: // lg
        return {
          button: { width: 120, height: 120 },
          icon: 60,
          text: typography.sizes.lg,
        };
    }
  };

  const sizeStyles = getSizeStyles();

  return (
    <View style={[styles.container, style]}>
      {/* Animated waves when listening */}
      {isListening && (
        <>
          <Animated.View
            style={[
              styles.wave,
              sizeStyles.button,
              {
                opacity: waveAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.6, 0],
                }),
                transform: [
                  {
                    scale: waveAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [1, 2],
                    }),
                  },
                ],
              },
            ]}
          />
          <Animated.View
            style={[
              styles.wave,
              sizeStyles.button,
              {
                opacity: waveAnim.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [0, 0.6, 0],
                }),
                transform: [
                  {
                    scale: waveAnim.interpolate({
                      inputRange: [0, 0.5, 1],
                      outputRange: [1, 1.5, 2],
                    }),
                  },
                ],
              },
            ]}
          />
        </>
      )}

      <Animated.View
        style={{
          transform: [{ scale: pulseAnim }],
        }}
      >
        <TouchableOpacity
          style={[
            styles.button,
            sizeStyles.button,
            isListening && styles.buttonListening,
            disabled && styles.disabled,
            shadows.lg,
          ]}
          onPress={handlePress}
          onLongPress={handleLongPress}
          onPressIn={() => setPressed(true)}
          onPressOut={() => setPressed(false)}
          disabled={disabled}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={isListening ? 'Stop listening' : 'Start voice input'}
        >
          <MaterialCommunityIcons
            name={isListening ? 'microphone' : 'microphone-outline'}
            size={sizeStyles.icon}
            color={colors.neutral.white}
          />
        </TouchableOpacity>
      </Animated.View>

      <Text style={[styles.prompt, { fontSize: sizeStyles.text }]}>
        {isListening ? 'Listening...' : prompt}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    backgroundColor: colors.primary.main,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonListening: {
    backgroundColor: colors.accent.red,
  },
  disabled: {
    opacity: 0.5,
  },
  wave: {
    position: 'absolute',
    backgroundColor: colors.accent.red,
    borderRadius: borderRadius.full,
  },
  prompt: {
    marginTop: spacing.lg,
    color: colors.neutral.darkGray,
    fontWeight: typography.weights.medium,
    textAlign: 'center',
  },
});

export default VoiceButton;
