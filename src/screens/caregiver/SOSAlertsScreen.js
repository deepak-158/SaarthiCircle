// SOS Alerts Screen for Caregivers
import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Animated,
  Vibration,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LargeButton } from '../../components/common';
import { colors, typography, spacing, borderRadius, shadows } from '../../theme';

const SOSAlertsScreen = ({ navigation }) => {
  const [alerts, setAlerts] = useState([
    {
      id: '1',
      seniorName: 'Verma Ji',
      age: 78,
      type: 'SOS Emergency',
      time: '2 mins ago',
      location: 'D-45, Vasant Kunj, New Delhi',
      phone: '+91 98765 43210',
      status: 'active',
      medicalInfo: 'Heart condition, Diabetes',
    },
    {
      id: '2',
      seniorName: 'Gupta Aunty',
      age: 68,
      type: 'Wellness Check',
      time: '15 mins ago',
      location: 'B-12, Lajpat Nagar, New Delhi',
      phone: '+91 87654 32109',
      status: 'pending',
      medicalInfo: 'Arthritis',
    },
    {
      id: '3',
      seniorName: 'Singh Uncle',
      age: 82,
      type: 'Low Mood Alert',
      time: '1 hour ago',
      location: 'C-89, Saket, New Delhi',
      phone: '+91 76543 21098',
      status: 'acknowledged',
      medicalInfo: 'Blood Pressure',
    },
  ]);

  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Pulse animation for active alerts
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
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

    // Vibrate for active SOS alerts
    const activeAlerts = alerts.filter(a => a.status === 'active');
    if (activeAlerts.length > 0) {
      Vibration.vibrate([500, 500, 500]);
    }
  }, []);

  const handleAcknowledge = (alertId) => {
    setAlerts(prev => 
      prev.map(alert => 
        alert.id === alertId 
          ? { ...alert, status: 'acknowledged' }
          : alert
      )
    );
  };

  const handleRespond = (alert) => {
    navigation.navigate('CaregiverInteraction', { requestId: alert.id });
  };

  const handleEscalate = (alertId) => {
    // Escalate to NGO/Admin
    setAlerts(prev => 
      prev.map(alert => 
        alert.id === alertId 
          ? { ...alert, status: 'escalated' }
          : alert
      )
    );
  };

  const handleCall = (phone) => {
    // Initiate call
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return colors.accent.red;
      case 'pending':
        return colors.accent.orange;
      case 'acknowledged':
        return colors.primary.main;
      case 'escalated':
        return colors.secondary.green;
      default:
        return colors.neutral.gray;
    }
  };

  const getAlertIcon = (type) => {
    switch (type) {
      case 'SOS Emergency':
        return 'alert-octagon';
      case 'Wellness Check':
        return 'heart-pulse';
      case 'Low Mood Alert':
        return 'emoticon-sad';
      default:
        return 'alert-circle';
    }
  };

  const activeCount = alerts.filter(a => a.status === 'active').length;

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <MaterialCommunityIcons
            name="arrow-left"
            size={28}
            color={colors.neutral.white}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>SOS Alerts</Text>
        {activeCount > 0 && (
          <Animated.View 
            style={[
              styles.activeBadge,
              { transform: [{ scale: pulseAnim }] }
            ]}
          >
            <Text style={styles.activeBadgeText}>{activeCount}</Text>
          </Animated.View>
        )}
      </View>

      {/* Alert Summary */}
      <View style={styles.summaryBar}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryNumber}>{alerts.filter(a => a.status === 'active').length}</Text>
          <Text style={styles.summaryLabel}>Active</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryNumber}>{alerts.filter(a => a.status === 'pending').length}</Text>
          <Text style={styles.summaryLabel}>Pending</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryNumber}>{alerts.filter(a => a.status === 'acknowledged').length}</Text>
          <Text style={styles.summaryLabel}>Acknowledged</Text>
        </View>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Active SOS Alerts */}
        {alerts.filter(a => a.status === 'active').length > 0 && (
          <>
            <Text style={styles.sectionHeader}>⚠️ ACTIVE EMERGENCIES</Text>
            {alerts
              .filter(a => a.status === 'active')
              .map(alert => (
                <Animated.View 
                  key={alert.id}
                  style={[
                    styles.alertCard,
                    styles.activeAlertCard,
                    shadows.md,
                  ]}
                >
                  <View style={styles.alertHeader}>
                    <View style={[
                      styles.alertIconContainer,
                      { backgroundColor: getStatusColor(alert.status) }
                    ]}>
                      <MaterialCommunityIcons
                        name={getAlertIcon(alert.type)}
                        size={32}
                        color={colors.neutral.white}
                      />
                    </View>
                    <View style={styles.alertInfo}>
                      <Text style={styles.alertSeniorName}>{alert.seniorName}</Text>
                      <Text style={styles.alertType}>{alert.type}</Text>
                      <Text style={styles.alertTime}>{alert.time}</Text>
                    </View>
                    <TouchableOpacity 
                      style={styles.callButton}
                      onPress={() => handleCall(alert.phone)}
                    >
                      <MaterialCommunityIcons
                        name="phone"
                        size={28}
                        color={colors.neutral.white}
                      />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.alertDetails}>
                    <View style={styles.detailRow}>
                      <MaterialCommunityIcons
                        name="map-marker"
                        size={20}
                        color={colors.accent.red}
                      />
                      <Text style={styles.detailText}>{alert.location}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <MaterialCommunityIcons
                        name="medical-bag"
                        size={20}
                        color={colors.accent.red}
                      />
                      <Text style={styles.detailText}>{alert.medicalInfo}</Text>
                    </View>
                  </View>

                  <View style={styles.alertActions}>
                    <TouchableOpacity 
                      style={[styles.actionBtn, styles.acknowledgeBtn]}
                      onPress={() => handleAcknowledge(alert.id)}
                    >
                      <MaterialCommunityIcons
                        name="check"
                        size={20}
                        color={colors.neutral.white}
                      />
                      <Text style={styles.actionBtnText}>Acknowledge</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={[styles.actionBtn, styles.respondBtn]}
                      onPress={() => handleRespond(alert)}
                    >
                      <MaterialCommunityIcons
                        name="run-fast"
                        size={20}
                        color={colors.neutral.white}
                      />
                      <Text style={styles.actionBtnText}>Respond</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={[styles.actionBtn, styles.escalateBtn]}
                      onPress={() => handleEscalate(alert.id)}
                    >
                      <MaterialCommunityIcons
                        name="arrow-up"
                        size={20}
                        color={colors.accent.red}
                      />
                      <Text style={[styles.actionBtnText, styles.escalateBtnText]}>
                        Escalate
                      </Text>
                    </TouchableOpacity>
                  </View>
                </Animated.View>
              ))}
          </>
        )}

        {/* Other Alerts */}
        {alerts.filter(a => a.status !== 'active').length > 0 && (
          <>
            <Text style={styles.sectionHeader}>Other Alerts</Text>
            {alerts
              .filter(a => a.status !== 'active')
              .map(alert => (
                <View 
                  key={alert.id}
                  style={[styles.alertCard, shadows.sm]}
                >
                  <View style={styles.alertHeader}>
                    <View style={[
                      styles.alertIconContainer,
                      { backgroundColor: getStatusColor(alert.status) }
                    ]}>
                      <MaterialCommunityIcons
                        name={getAlertIcon(alert.type)}
                        size={28}
                        color={colors.neutral.white}
                      />
                    </View>
                    <View style={styles.alertInfo}>
                      <Text style={styles.alertSeniorName}>{alert.seniorName}</Text>
                      <Text style={styles.alertType}>{alert.type}</Text>
                      <Text style={styles.alertTime}>{alert.time}</Text>
                    </View>
                    <View style={[
                      styles.statusIndicator,
                      { backgroundColor: getStatusColor(alert.status) }
                    ]}>
                      <Text style={styles.statusText}>
                        {alert.status.charAt(0).toUpperCase() + alert.status.slice(1)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.alertDetails}>
                    <View style={styles.detailRow}>
                      <MaterialCommunityIcons
                        name="map-marker"
                        size={18}
                        color={colors.neutral.darkGray}
                      />
                      <Text style={[styles.detailText, styles.detailTextMuted]}>
                        {alert.location}
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity 
                    style={styles.viewDetailsBtn}
                    onPress={() => handleRespond(alert)}
                  >
                    <Text style={styles.viewDetailsText}>View Details</Text>
                    <MaterialCommunityIcons
                      name="chevron-right"
                      size={20}
                      color={colors.primary.main}
                    />
                  </TouchableOpacity>
                </View>
              ))}
          </>
        )}

        {/* Empty State */}
        {alerts.length === 0 && (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons
              name="check-circle"
              size={80}
              color={colors.secondary.green}
            />
            <Text style={styles.emptyTitle}>All Clear!</Text>
            <Text style={styles.emptySubtitle}>
              No active alerts at the moment
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.accent.red,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.accent.red,
  },
  backButton: {
    padding: spacing.sm,
  },
  headerTitle: {
    flex: 1,
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.neutral.white,
    marginLeft: spacing.sm,
  },
  activeBadge: {
    backgroundColor: colors.neutral.white,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeBadgeText: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.accent.red,
  },
  summaryBar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryNumber: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.neutral.white,
  },
  summaryLabel: {
    fontSize: typography.sizes.sm,
    color: 'rgba(255,255,255,0.9)',
  },
  summaryDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  scrollView: {
    flex: 1,
    backgroundColor: colors.neutral.lightGray,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  sectionHeader: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.accent.red,
    marginBottom: spacing.md,
    marginTop: spacing.md,
  },
  alertCard: {
    backgroundColor: colors.neutral.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  activeAlertCard: {
    borderWidth: 2,
    borderColor: colors.accent.red,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  alertIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  alertSeniorName: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.neutral.black,
  },
  alertType: {
    fontSize: typography.sizes.md,
    color: colors.neutral.darkGray,
    marginTop: spacing.xs,
  },
  alertTime: {
    fontSize: typography.sizes.sm,
    color: colors.neutral.gray,
    marginTop: spacing.xs,
  },
  callButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.secondary.green,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusIndicator: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  statusText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semiBold,
    color: colors.neutral.white,
  },
  alertDetails: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.neutral.lightGray,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  detailText: {
    fontSize: typography.sizes.md,
    color: colors.neutral.black,
    marginLeft: spacing.sm,
    flex: 1,
  },
  detailTextMuted: {
    color: colors.neutral.darkGray,
  },
  alertActions: {
    flexDirection: 'row',
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  acknowledgeBtn: {
    backgroundColor: colors.primary.main,
  },
  respondBtn: {
    backgroundColor: colors.secondary.green,
  },
  escalateBtn: {
    backgroundColor: colors.neutral.white,
    borderWidth: 1,
    borderColor: colors.accent.red,
  },
  actionBtnText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semiBold,
    color: colors.neutral.white,
  },
  escalateBtnText: {
    color: colors.accent.red,
  },
  viewDetailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.neutral.lightGray,
  },
  viewDetailsText: {
    fontSize: typography.sizes.md,
    color: colors.primary.main,
    fontWeight: typography.weights.medium,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl * 2,
  },
  emptyTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.secondary.green,
    marginTop: spacing.lg,
  },
  emptySubtitle: {
    fontSize: typography.sizes.md,
    color: colors.neutral.darkGray,
    marginTop: spacing.sm,
  },
});

export default SOSAlertsScreen;
