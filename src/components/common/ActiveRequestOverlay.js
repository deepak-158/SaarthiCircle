// Active Chat Request Overlay - Shows when waiting for volunteer
import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius, shadows } from '../../theme';

const ActiveRequestOverlay = ({
  visible = true,
  volunteerName = 'Volunteer',
  requestType = 'chat', // 'chat', 'voice'
  onCancel,
  isWaiting = true,
  isConnecting = false,
  isConnected = false,
}) => {
  const pulseAnim = useRef(new Animated.Value(0.8)).current;
  const spinAnim = useRef(new Animated.Value(0)).current;

  // Pulse animation
  useEffect(() => {
    if (isWaiting) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0.8,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [isWaiting, pulseAnim]);

  // Spin animation
  useEffect(() => {
    if (isConnecting) {
      Animated.loop(
        Animated.timing(spinAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        })
      ).start();
    }
  }, [isConnecting, spinAnim]);

  const spinInterpolate = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  if (!visible) return null;

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={[colors.primary.main, colors.primary.light]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        {/* Close Button */}
        <TouchableOpacity
          style={styles.closeButton}
          onPress={onCancel}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons
            name="close"
            size={32}
            color={colors.neutral.white}
          />
        </TouchableOpacity>

        <View style={styles.content}>
          {/* Status Indicator */}
          <View style={styles.statusContainer}>
            {isWaiting && (
              <Animated.View
                style={[
                  styles.pulseRing,
                  { transform: [{ scale: pulseAnim }] },
                ]}
              />
            )}
            {isConnecting && (
              <Animated.View
                style={[
                  styles.spinningLoader,
                  { transform: [{ rotate: spinInterpolate }] },
                ]}
              >
                <MaterialCommunityIcons
                  name="loading"
                  size={64}
                  color={colors.neutral.white}
                />
              </Animated.View>
            )}
            {isConnected && (
              <MaterialCommunityIcons
                name="check-circle"
                size={80}
                color={colors.status.success}
              />
            )}

            {isWaiting && (
              <MaterialCommunityIcons
                name="clock-outline"
                size={80}
                color={colors.neutral.white}
              />
            )}
          </View>

          {/* Status Title */}
          <Text style={styles.statusTitle}>
            {isWaiting
              ? `Waiting for ${volunteerName}...`
              : isConnecting
              ? 'Connecting...'
              : 'Connected! 🎉'}
          </Text>

          {/* Status Description */}
          <Text style={styles.statusDescription}>
            {isWaiting
              ? requestType === 'voice'
                ? 'Your call request has been sent'
                : 'Your chat request has been sent'
              : isConnecting
              ? 'Setting up secure connection...'
              : requestType === 'voice'
              ? 'You can now start your voice call'
              : 'You can now start chatting'}
          </Text>

          {/* Request Details */}
          <View style={styles.detailsCard}>
            <View style={styles.detailItem}>
              <MaterialCommunityIcons
                name={requestType === 'voice' ? 'phone' : 'chat'}
                size={24}
                color={colors.primary.main}
              />
              <Text style={styles.detailLabel}>
                {requestType === 'voice' ? 'Voice Call' : 'Chat Request'}
              </Text>
            </View>

            <View style={styles.detailItem}>
              <MaterialCommunityIcons
                name="account"
                size={24}
                color={colors.primary.main}
              />
              <Text style={styles.detailLabel}>{volunteerName}</Text>
            </View>

            {isWaiting && (
              <View style={styles.detailItem}>
                <MaterialCommunityIcons
                  name="timer-sand"
                  size={24}
                  color={colors.accent.orange}
                />
                <Text style={styles.detailLabel}>
                  Waiting for response...
                </Text>
              </View>
            )}
          </View>

          {/* Tip */}
          <View style={styles.tipContainer}>
            <MaterialCommunityIcons
              name="lightbulb-outline"
              size={20}
              color={colors.accent.yellow}
            />
            <Text style={styles.tipText}>
              {isWaiting
                ? 'Your request is being sent to available volunteers. This usually takes less than a minute.'
                : 'The volunteer has accepted your request and is ready to help.'}
            </Text>
          </View>

          {/* Cancel Button */}
          {isWaiting && (
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onCancel}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelButtonText}>Cancel Request</Text>
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  closeButton: {
    position: 'absolute',
    top: spacing.lg,
    right: spacing.lg,
    zIndex: 10,
    padding: spacing.sm,
  },
  content: {
    alignItems: 'center',
    width: '100%',
  },
  statusContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  pulseRing: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.3)',
    position: 'absolute',
  },
  spinningLoader: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusTitle: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
    color: colors.neutral.white,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  statusDescription: {
    fontSize: typography.sizes.lg,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginBottom: spacing.xxl,
  },
  detailsCard: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    width: '100%',
    marginBottom: spacing.xxl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  detailLabel: {
    fontSize: typography.sizes.md,
    color: colors.neutral.white,
    marginLeft: spacing.md,
    fontWeight: typography.weights.medium,
  },
  tipContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    width: '100%',
    marginBottom: spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: colors.accent.yellow,
  },
  tipText: {
    flex: 1,
    fontSize: typography.sizes.sm,
    color: colors.neutral.white,
    marginLeft: spacing.sm,
    lineHeight: typography.sizes.sm * 1.5,
  },
  cancelButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.full,
    borderWidth: 2,
    borderColor: colors.neutral.white,
    width: '100%',
  },
  cancelButtonText: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.neutral.white,
    textAlign: 'center',
  },
});

export default ActiveRequestOverlay;
