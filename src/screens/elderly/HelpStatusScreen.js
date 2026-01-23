// Help Status Screen - Request confirmation and tracking
import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView,
  ScrollView,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LargeButton } from '../../components/common';
import { colors, typography, spacing, borderRadius, shadows } from '../../theme';
import { getTranslation } from '../../i18n/translations';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BACKEND_URL } from '../../config/backend';

const HelpStatusScreen = ({ navigation, route }) => {
  const { category, requestId } = route.params || {};
  const [language] = useState('en');
  const t = getTranslation(language);
  
  const [status, setStatus] = useState('sent'); // sent, accepted, arriving
  const [helper, setHelper] = useState(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Pulse animation for status icon
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    let pollInterval;

    if (requestId) {
      const pollStatus = async () => {
        try {
          const token = await AsyncStorage.getItem('userToken');
          const response = await fetch(`${BACKEND_URL}/help-requests`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (response.ok) {
            const data = await response.json();
            const currentRequest = data.requests.find(r => r.id === requestId);
            if (currentRequest) {
              if (currentRequest.status === 'accepted' || currentRequest.status === 'completed') {
                setStatus('accepted');
                if (currentRequest.volunteer_id) {
                  // We could fetch volunteer details here if needed
                  setHelper({
                    name: 'Volunteer Caregiver',
                    org: 'Local NGO Support'
                  });
                }
              }
              if (currentRequest.status === 'completed') {
                 // Maybe navigate home or show a rating screen
              }
            }
          }
        } catch (e) {
          console.error('Polling error:', e);
        }
      };

      pollStatus();
      pollInterval = setInterval(pollStatus, 5000);
    } else {
      // Simulate status updates if no requestId (demo mode)
      const timer1 = setTimeout(() => setStatus('accepted'), 3000);
      const timer2 = setTimeout(() => setStatus('arriving'), 6000);
      
      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
      };
    }

    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [requestId]);

  const handleCallHelper = () => {
    // Initiate call to helper
  };

  const handleGoHome = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'ElderlyApp' }],
    });
  };

  const getStatusInfo = () => {
    switch (status) {
      case 'sent':
        return {
          icon: 'send-check',
          title: 'Request Sent',
          color: colors.primary.main,
        };
      case 'accepted':
        return {
          icon: 'account-check',
          title: 'Help Accepted',
          color: colors.secondary.green,
        };
      case 'arriving':
        return {
          icon: 'run-fast',
          title: 'Help is on the way',
          color: colors.accent.orange,
        };
      default:
        return {
          icon: 'send',
          title: 'Processing',
          color: colors.primary.main,
        };
    }
  };

  const statusInfo = getStatusInfo();

  return (
    <LinearGradient
      colors={[colors.secondary.greenLight, colors.neutral.white]}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Success Animation */}
          <Animated.View
            style={[
              styles.successIcon,
              { transform: [{ scale: pulseAnim }] },
            ]}
          >
            <View style={[styles.iconCircle, { borderColor: statusInfo.color }]}>
              <MaterialCommunityIcons
                name={statusInfo.icon}
                size={60}
                color={statusInfo.color}
              />
            </View>
          </Animated.View>

          {/* Title */}
          <Text style={styles.title}>{t.help.statusTitle}</Text>

          {/* Status Card */}
          <View style={[styles.statusCard, shadows.md]}>
            {/* Status Badge */}
            <View style={[styles.statusBadge, { backgroundColor: statusInfo.color }]}>
              <MaterialCommunityIcons
                name="check"
                size={20}
                color={colors.neutral.white}
              />
              <Text style={styles.statusBadgeText}>{statusInfo.title}</Text>
            </View>

            {/* Helper Info */}
            <View style={styles.helperInfo}>
              <MaterialCommunityIcons
                name="account-heart"
                size={48}
                color={colors.secondary.green}
              />
              <View style={styles.helperDetails}>
                <Text style={styles.helperLabel}>{t.help.statusResponding}</Text>
                <Text style={styles.helperName}>Volunteer Caregiver</Text>
                <Text style={styles.helperOrg}>Local NGO Support</Text>
              </View>
            </View>

            {/* ETA */}
            {status === 'arriving' && (
              <View style={styles.etaContainer}>
                <MaterialCommunityIcons
                  name="clock-outline"
                  size={24}
                  color={colors.accent.orange}
                />
                <Text style={styles.etaText}>Estimated arrival: 15-20 minutes</Text>
              </View>
            )}
          </View>

          {/* Reassuring Message */}
          <View style={styles.reassuringCard}>
            <MaterialCommunityIcons
              name="heart-multiple"
              size={36}
              color={colors.accent.orange}
            />
            <Text style={styles.reassuringText}>{t.help.statusMessage}</Text>
          </View>

          {/* Progress Steps */}
          <View style={styles.progressSteps}>
            <View style={styles.step}>
              <View style={[styles.stepDot, styles.stepComplete]}>
                <MaterialCommunityIcons name="check" size={16} color={colors.neutral.white} />
              </View>
              <Text style={styles.stepText}>Request Received</Text>
            </View>
            <View style={styles.stepLine} />
            <View style={styles.step}>
              <View style={[
                styles.stepDot, 
                (status === 'accepted' || status === 'arriving') && styles.stepComplete
              ]}>
                {(status === 'accepted' || status === 'arriving') && (
                  <MaterialCommunityIcons name="check" size={16} color={colors.neutral.white} />
                )}
              </View>
              <Text style={styles.stepText}>Help Assigned</Text>
            </View>
            <View style={styles.stepLine} />
            <View style={styles.step}>
              <View style={[styles.stepDot, status === 'arriving' && styles.stepComplete]}>
                {status === 'arriving' && (
                  <MaterialCommunityIcons name="check" size={16} color={colors.neutral.white} />
                )}
              </View>
              <Text style={styles.stepText}>On the Way</Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <LargeButton
              title={t.help.callHelper}
              onPress={handleCallHelper}
              icon="phone"
              variant="primary"
              size="xl"
              style={styles.callButton}
            />

            <LargeButton
              title="Go to Home"
              onPress={handleGoHome}
              variant="outline"
              size="lg"
              style={styles.homeButton}
            />
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
  successIcon: {
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.neutral.white,
    borderWidth: 4,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.lg,
  },
  title: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
    color: colors.neutral.black,
    textAlign: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
  },
  statusCard: {
    backgroundColor: colors.neutral.white,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    marginBottom: spacing.lg,
  },
  statusBadgeText: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semiBold,
    color: colors.neutral.white,
    marginLeft: spacing.xs,
  },
  helperInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  helperDetails: {
    marginLeft: spacing.md,
    flex: 1,
  },
  helperLabel: {
    fontSize: typography.sizes.sm,
    color: colors.neutral.darkGray,
  },
  helperName: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semiBold,
    color: colors.neutral.black,
    marginTop: spacing.xs,
  },
  helperOrg: {
    fontSize: typography.sizes.md,
    color: colors.primary.main,
    marginTop: spacing.xs,
  },
  etaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.lg,
  },
  etaText: {
    fontSize: typography.sizes.md,
    color: colors.accent.orange,
    fontWeight: typography.weights.medium,
    marginLeft: spacing.sm,
  },
  reassuringCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral.white,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
    ...shadows.sm,
  },
  reassuringText: {
    flex: 1,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.medium,
    color: colors.neutral.black,
    marginLeft: spacing.md,
    lineHeight: typography.sizes.lg * typography.lineHeights.relaxed,
  },
  progressSteps: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  step: {
    alignItems: 'center',
  },
  stepDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.neutral.mediumGray,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepComplete: {
    backgroundColor: colors.secondary.green,
  },
  stepText: {
    fontSize: typography.sizes.sm,
    color: colors.neutral.darkGray,
    marginTop: spacing.xs,
    textAlign: 'center',
    width: 80,
  },
  stepLine: {
    width: 40,
    height: 3,
    backgroundColor: colors.neutral.mediumGray,
    marginBottom: spacing.lg,
  },
  actionButtons: {
    marginTop: spacing.md,
  },
  callButton: {
    marginBottom: spacing.md,
  },
  homeButton: {},
});

export default HelpStatusScreen;
