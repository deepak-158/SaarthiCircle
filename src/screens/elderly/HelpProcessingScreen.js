// Help Processing Screen - AI analyzing request
import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { getTranslation } from '../../i18n/translations';

const HelpProcessingScreen = ({ navigation, route }) => {
  const { category, transcript, requestId } = route.params || {};
  const [language] = useState('en');
  const t = getTranslation(language);
  
  const [stage, setStage] = useState(0); // 0: Listening, 1: Understanding, 2: Finding Help
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const dotAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Dot animation
    Animated.loop(
      Animated.timing(dotAnim, {
        toValue: 3,
        duration: 1500,
        useNativeDriver: false,
      })
    ).start();

    // Progress through stages
    const timer1 = setTimeout(() => setStage(1), 1500);
    const timer2 = setTimeout(() => setStage(2), 3000);
    const timer3 = setTimeout(() => {
      navigation.replace('HelpStatus', { category, transcript, requestId });
    }, 4500);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, []);

  const stages = [
    { icon: 'ear-hearing', text: 'Listening to you...' },
    { icon: 'brain', text: 'Understanding your request...' },
    { icon: 'account-search', text: 'Finding the right help...' },
  ];

  const currentStage = stages[stage];

  return (
    <LinearGradient
      colors={[colors.primary.light, colors.secondary.cream]}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          {/* Animated Icon */}
          <Animated.View
            style={[
              styles.iconContainer,
              { transform: [{ scale: pulseAnim }] },
            ]}
          >
            <MaterialCommunityIcons
              name={currentStage.icon}
              size={80}
              color={colors.primary.main}
            />
          </Animated.View>

          {/* Processing Text */}
          <Text style={styles.title}>{t.help.processingTitle}</Text>
          
          <View style={styles.stageContainer}>
            <Text style={styles.stageText}>{currentStage.text}</Text>
          </View>

          {/* Animated Dots */}
          <View style={styles.dotsContainer}>
            {[0, 1, 2].map((index) => (
              <Animated.View
                key={index}
                style={[
                  styles.dot,
                  {
                    opacity: dotAnim.interpolate({
                      inputRange: [index, index + 0.5, index + 1, 3],
                      outputRange: [0.3, 1, 0.3, 0.3],
                      extrapolate: 'clamp',
                    }),
                    transform: [
                      {
                        scale: dotAnim.interpolate({
                          inputRange: [index, index + 0.5, index + 1, 3],
                          outputRange: [1, 1.5, 1, 1],
                          extrapolate: 'clamp',
                        }),
                      },
                    ],
                  },
                ]}
              />
            ))}
          </View>

          {/* Progress Indicators */}
          <View style={styles.progressContainer}>
            {stages.map((s, index) => (
              <View key={index} style={styles.progressItem}>
                <View
                  style={[
                    styles.progressDot,
                    index <= stage && styles.progressDotActive,
                  ]}
                >
                  {index < stage && (
                    <MaterialCommunityIcons
                      name="check"
                      size={16}
                      color={colors.neutral.white}
                    />
                  )}
                </View>
                {index < stages.length - 1 && (
                  <View
                    style={[
                      styles.progressLine,
                      index < stage && styles.progressLineActive,
                    ]}
                  />
                )}
              </View>
            ))}
          </View>

          {/* Reassuring Message */}
          <View style={styles.messageContainer}>
            <MaterialCommunityIcons
              name="heart"
              size={24}
              color={colors.accent.orange}
            />
            <Text style={styles.messageText}>
              {t.help.processingMessage}
            </Text>
          </View>
        </View>
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
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  iconContainer: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: colors.neutral.white,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary.main,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  title: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
    color: colors.neutral.black,
    textAlign: 'center',
    marginTop: spacing.xxl,
  },
  stageContainer: {
    marginTop: spacing.lg,
  },
  stageText: {
    fontSize: typography.sizes.lg,
    color: colors.neutral.darkGray,
    textAlign: 'center',
  },
  dotsContainer: {
    flexDirection: 'row',
    marginTop: spacing.xl,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary.main,
    marginHorizontal: 6,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xxl,
  },
  progressItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.neutral.mediumGray,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressDotActive: {
    backgroundColor: colors.primary.main,
  },
  progressLine: {
    width: 40,
    height: 3,
    backgroundColor: colors.neutral.mediumGray,
  },
  progressLineActive: {
    backgroundColor: colors.primary.main,
  },
  messageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral.white,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginTop: spacing.xxl,
  },
  messageText: {
    fontSize: typography.sizes.md,
    color: colors.neutral.darkGray,
    marginLeft: spacing.sm,
  },
});

export default HelpProcessingScreen;
