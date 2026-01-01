// SOS Emergency Screen - Critical emergency feature
import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView,
  TouchableOpacity,
  Animated,
  Alert,
  Vibration,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LargeButton } from '../../components/common';
import { colors, typography, spacing, borderRadius, shadows } from '../../theme';
import { getTranslation } from '../../i18n/translations';

const SOSScreen = ({ navigation }) => {
  const [language] = useState('en');
  const t = getTranslation(language);
  
  const [isActivated, setIsActivated] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [isSent, setIsSent] = useState(false);
  
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Continuous pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  useEffect(() => {
    if (isActivated && countdown > 0) {
      const timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        Vibration.vibrate(500);
      }, 1000);

      return () => clearInterval(timer);
    } else if (isActivated && countdown === 0) {
      // Send SOS
      setIsSent(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      // In production: Send SOS to emergency contacts and backend
    }
  }, [isActivated, countdown]);

  const handleSOSPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setIsActivated(true);
  };

  const handleCancel = () => {
    Alert.alert(
      t.sos.confirmCancel,
      '',
      [
        { text: 'No', style: 'cancel' },
        { 
          text: 'Yes', 
          style: 'destructive',
          onPress: () => {
            setIsActivated(false);
            setCountdown(5);
            setIsSent(false);
          },
        },
      ]
    );
  };

  const handleGoBack = () => {
    navigation.goBack();
  };

  // SOS Sent Confirmation
  if (isSent) {
    return (
      <View style={styles.sentContainer}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.sentContent}>
            <View style={styles.sentIconContainer}>
              <MaterialCommunityIcons
                name="check-circle"
                size={100}
                color={colors.neutral.white}
              />
            </View>
            
            <Text style={styles.sentTitle}>SOS Alert Sent!</Text>
            <Text style={styles.sentSubtitle}>
              Emergency contacts have been notified.
              Help is on the way.
            </Text>

            <View style={styles.contactsCard}>
              <Text style={styles.contactsTitle}>Notified:</Text>
              <View style={styles.contactItem}>
                <MaterialCommunityIcons name="account" size={24} color={colors.neutral.white} />
                <Text style={styles.contactText}>Emergency Contact</Text>
              </View>
              <View style={styles.contactItem}>
                <MaterialCommunityIcons name="hospital-building" size={24} color={colors.neutral.white} />
                <Text style={styles.contactText}>Local Emergency Services</Text>
              </View>
              <View style={styles.contactItem}>
                <MaterialCommunityIcons name="account-group" size={24} color={colors.neutral.white} />
                <Text style={styles.contactText}>NGO Support Team</Text>
              </View>
            </View>

            <Text style={styles.stayCalm}>
              🙏 Stay calm. Someone will call you shortly.
            </Text>

            <LargeButton
              title="Return to Home"
              onPress={() => navigation.reset({ index: 0, routes: [{ name: 'ElderlyApp' }] })}
              variant="outline"
              size="lg"
              style={styles.homeButton}
              textStyle={{ color: colors.neutral.white }}
            />
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={handleGoBack}
            style={styles.backButton}
          >
            <MaterialCommunityIcons
              name="close"
              size={32}
              color={colors.neutral.white}
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t.sos.title}</Text>
          <View style={{ width: 48 }} />
        </View>

        {/* Main Content */}
        <View style={styles.content}>
          {/* SOS Button */}
          <Animated.View
            style={[
              styles.sosButtonOuter,
              { transform: [{ scale: pulseAnim }] },
            ]}
          >
            <TouchableOpacity
              style={[
                styles.sosButton,
                isActivated && styles.sosButtonActivated,
              ]}
              onPress={handleSOSPress}
              disabled={isActivated}
              activeOpacity={0.8}
            >
              {isActivated ? (
                <Text style={styles.countdownText}>{countdown}</Text>
              ) : (
                <>
                  <MaterialCommunityIcons
                    name="alert-circle"
                    size={60}
                    color={colors.neutral.white}
                  />
                  <Text style={styles.sosText}>{t.sos.buttonText}</Text>
                </>
              )}
            </TouchableOpacity>
          </Animated.View>

          {/* Status Text */}
          <Text style={styles.statusText}>
            {isActivated 
              ? `Sending in ${countdown} seconds...`
              : 'Press and hold for emergency'
            }
          </Text>

          {/* Voice Hint */}
          <View style={styles.voiceHint}>
            <MaterialCommunityIcons
              name="microphone"
              size={24}
              color={colors.neutral.white}
            />
            <Text style={styles.voiceHintText}>{t.sos.voiceHint}</Text>
          </View>

          {/* Escalation Info */}
          <View style={styles.infoCard}>
            <MaterialCommunityIcons
              name="information"
              size={24}
              color={colors.accent.yellow}
            />
            <Text style={styles.infoText}>{t.sos.escalationInfo}</Text>
          </View>

          {/* Cancel Button */}
          {isActivated && (
            <LargeButton
              title={t.sos.cancel}
              onPress={handleCancel}
              variant="outline"
              size="lg"
              style={styles.cancelButton}
              textStyle={{ color: colors.neutral.white }}
            />
          )}
        </View>

        {/* Emergency Numbers */}
        <View style={styles.emergencyNumbers}>
          <Text style={styles.emergencyTitle}>Emergency Numbers:</Text>
          <View style={styles.numberRow}>
            <View style={styles.numberItem}>
              <Text style={styles.numberLabel}>Police</Text>
              <Text style={styles.number}>100</Text>
            </View>
            <View style={styles.numberItem}>
              <Text style={styles.numberLabel}>Ambulance</Text>
              <Text style={styles.number}>108</Text>
            </View>
            <View style={styles.numberItem}>
              <Text style={styles.numberLabel}>Women</Text>
              <Text style={styles.number}>1091</Text>
            </View>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.accent.red,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
  },
  backButton: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.neutral.white,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  sosButtonOuter: {
    marginBottom: spacing.xl,
  },
  sosButton: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 6,
    borderColor: colors.neutral.white,
  },
  sosButtonActivated: {
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  sosText: {
    fontSize: typography.sizes.xxxl,
    fontWeight: typography.weights.bold,
    color: colors.neutral.white,
    marginTop: spacing.sm,
  },
  countdownText: {
    fontSize: 80,
    fontWeight: typography.weights.bold,
    color: colors.neutral.white,
  },
  statusText: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.medium,
    color: colors.neutral.white,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  voiceHint: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.full,
    marginBottom: spacing.lg,
  },
  voiceHintText: {
    fontSize: typography.sizes.lg,
    color: colors.neutral.white,
    marginLeft: spacing.sm,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
  },
  infoText: {
    fontSize: typography.sizes.md,
    color: colors.neutral.white,
    marginLeft: spacing.sm,
    flex: 1,
  },
  cancelButton: {
    borderColor: colors.neutral.white,
    width: '80%',
  },
  emergencyNumbers: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    padding: spacing.lg,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    borderRadius: borderRadius.lg,
  },
  emergencyTitle: {
    fontSize: typography.sizes.md,
    color: colors.neutral.white,
    marginBottom: spacing.md,
    opacity: 0.8,
  },
  numberRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  numberItem: {
    alignItems: 'center',
  },
  numberLabel: {
    fontSize: typography.sizes.sm,
    color: colors.neutral.white,
    opacity: 0.8,
  },
  number: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.neutral.white,
    marginTop: spacing.xs,
  },
  // Sent state styles
  sentContainer: {
    flex: 1,
    backgroundColor: colors.secondary.green,
  },
  sentContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  sentIconContainer: {
    marginBottom: spacing.lg,
  },
  sentTitle: {
    fontSize: typography.sizes.xxxl,
    fontWeight: typography.weights.bold,
    color: colors.neutral.white,
    textAlign: 'center',
  },
  sentSubtitle: {
    fontSize: typography.sizes.xl,
    color: colors.neutral.white,
    textAlign: 'center',
    marginTop: spacing.md,
    opacity: 0.9,
  },
  contactsCard: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    marginTop: spacing.xl,
    width: '100%',
  },
  contactsTitle: {
    fontSize: typography.sizes.md,
    color: colors.neutral.white,
    opacity: 0.8,
    marginBottom: spacing.md,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  contactText: {
    fontSize: typography.sizes.lg,
    color: colors.neutral.white,
    marginLeft: spacing.md,
  },
  stayCalm: {
    fontSize: typography.sizes.xl,
    color: colors.neutral.white,
    textAlign: 'center',
    marginTop: spacing.xl,
    fontWeight: typography.weights.medium,
  },
  homeButton: {
    borderColor: colors.neutral.white,
    marginTop: spacing.xxl,
    width: '80%',
  },
});

export default SOSScreen;
