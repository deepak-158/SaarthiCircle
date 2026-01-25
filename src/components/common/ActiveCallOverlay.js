// Active Call Overlay - Shows ongoing calls similar to ActiveChatOverlay
import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity,
  Animated,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius, shadows } from '../../theme';

const ActiveCallOverlay = ({ 
  visible, 
  companionName, 
  duration = 0, 
  onTap,
  onEnd,
}) => {
  const [slideAnim] = useState(new Animated.Value(-150));
  const [displayDuration, setDisplayDuration] = useState('00:00');

  // Update duration display
  useEffect(() => {
    const interval = setInterval(() => {
      const minutes = Math.floor(duration / 60);
      const seconds = duration % 60;
      setDisplayDuration(
        `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
      );
    }, 1000);

    return () => clearInterval(interval);
  }, [duration]);

  useEffect(() => {
    if (visible) {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: -150,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <TouchableOpacity
        style={styles.content}
        onPress={onTap}
        activeOpacity={0.8}
      >
        {/* Call Icon */}
        <View style={styles.iconContainer}>
          <MaterialCommunityIcons
            name="phone-in-talk"
            size={24}
            color={colors.secondary.green}
          />
        </View>

        {/* Call Info */}
        <View style={styles.infoContainer}>
          <Text style={styles.companionName} numberOfLines={1}>
            {companionName || 'Active Call'}
          </Text>
          <Text style={styles.duration}>{displayDuration}</Text>
        </View>

        {/* Duration Indicator */}
        <View style={styles.durationBadge}>
          <Text style={styles.durationText}>{displayDuration}</Text>
        </View>

        {/* End Call Button */}
        <TouchableOpacity
          style={styles.endButton}
          onPress={onEnd}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons
            name="phone-hangup"
            size={18}
            color={colors.neutral.white}
          />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    zIndex: 1000,
  },
  content: {
    backgroundColor: colors.secondary.green,
    borderRadius: borderRadius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    ...shadows.lg,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.neutral.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  infoContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  companionName: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.neutral.white,
  },
  duration: {
    fontSize: typography.sizes.sm,
    color: colors.neutral.white,
    marginTop: spacing.xs,
    opacity: 0.9,
  },
  durationBadge: {
    backgroundColor: colors.neutral.white,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    marginRight: spacing.sm,
  },
  durationText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.secondary.green,
  },
  endButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.danger.main,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ActiveCallOverlay;
