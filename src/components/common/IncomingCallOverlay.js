// Incoming Call Overlay - Shows incoming call notification for volunteers
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Modal,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius, shadows } from '../../theme';

const IncomingCallOverlay = ({ visible, callerName, onAccept, onReject, isLoading }) => {
  const { t } = useTranslation();
  const [scaleAnim] = useState(new Animated.Value(0.8));
  const [ringAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    if (visible) {
      // Scale in animation
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: Platform.OS !== 'web',
      }).start();

      // Pulsing ring animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(ringAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: Platform.OS !== 'web',
          }),
          Animated.timing(ringAnim, {
            toValue: 0,
            duration: 600,
            useNativeDriver: Platform.OS !== 'web',
          }),
        ])
      ).start();
    } else {
      scaleAnim.setValue(0.8);
      ringAnim.setValue(0);
    }
  }, [visible]);

  const ringScale = ringAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.3],
  });

  const ringOpacity = ringAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.8, 0.2],
  });

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      hardwareAccelerated={true}
    >
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.container,
            { transform: [{ scale: scaleAnim }] }
          ]}
        >
          {/* Pulsing ring animation */}
          <Animated.View
            style={[
              styles.pulsingRing,
              {
                transform: [{ scale: ringScale }],
                opacity: ringOpacity,
              },
            ]}
          />

          {/* Call Icon */}
          <View style={styles.iconContainer}>
            <MaterialCommunityIcons
              name="phone-incoming"
              size={80}
              color={colors.secondary.green}
            />
          </View>

          {/* Caller Info */}
          <Text style={styles.callerName}>{callerName || t('calling.unknownCaller')}</Text>
          <Text style={styles.callLabel}>{t('calling.incomingTitle')}</Text>

          {/* Action Buttons */}
          <View style={styles.buttonsContainer}>
            {/* Accept Button */}
            <TouchableOpacity
              style={[styles.button, styles.acceptButton]}
              onPress={onAccept}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons
                name="phone"
                size={36}
                color={colors.neutral.white}
              />
              <Text style={styles.buttonText}>{t('calling.accept')}</Text>
            </TouchableOpacity>

            {/* Reject Button */}
            <TouchableOpacity
              style={[styles.button, styles.rejectButton]}
              onPress={onReject}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons
                name="phone-hangup"
                size={36}
                color={colors.neutral.white}
              />
              <Text style={styles.buttonText}>{t('calling.reject')}</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  pulsingRing: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 3,
    borderColor: colors.secondary.green,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.secondary.green,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
    ...shadows.lg,
  },
  callerName: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
    color: colors.neutral.white,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  callLabel: {
    fontSize: typography.sizes.lg,
    color: colors.neutral.lightGray,
    marginBottom: spacing.xxl,
  },
  buttonsContainer: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginTop: spacing.xl,
  },
  button: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.lg,
  },
  acceptButton: {
    backgroundColor: colors.secondary.green,
  },
  rejectButton: {
    backgroundColor: colors.danger.main,
  },
  buttonText: {
    color: colors.neutral.white,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    marginTop: spacing.xs,
  },
});

export default IncomingCallOverlay;
