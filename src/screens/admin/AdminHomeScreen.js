// Admin Home Dashboard Screen
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, typography, spacing, borderRadius, shadows } from '../../theme';
import { BACKEND_URL as API_BASE } from '../../config/backend';
import { logout } from '../../services/authService';
import { getSocket, identify } from '../../services/socketService';

const { width } = Dimensions.get('window');
const cardWidth = (width - spacing.md * 3) / 2;

// Default stats for fallback
const DEFAULT_STATS = {
  totalSeniors: 1247,
  activeCaregivers: 89,
  pendingRequests: 23,
  sosAlerts: 2,
  helpResolved: 456,
  avgResponseTime: '12 min',
};

// Default activity for fallback
const DEFAULT_ACTIVITY = [
  { id: '1', type: 'sos', message: 'SOS Alert from Verma Ji', time: '2 mins ago' },
  { id: '2', type: 'request', message: 'New help request assigned', time: '5 mins ago' },
  { id: '3', type: 'resolved', message: 'Medicine pickup completed', time: '10 mins ago' },
  { id: '4', type: 'caregiver', message: 'New caregiver registered', time: '15 mins ago' },
  { id: '5', type: 'mood', message: 'Low mood alert for 3 seniors', time: '30 mins ago' },
];

const AdminHomeScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [adminName, setAdminName] = useState('Admin');
  const [stats, setStats] = useState(DEFAULT_STATS);
  const [recentActivity, setRecentActivity] = useState(DEFAULT_ACTIVITY);
  const [unreadNotifications, setUnreadNotifications] = useState(5);

  useEffect(() => {
    loadDashboardData();

    const initRealtime = async () => {
      try {
        const profileJson = await AsyncStorage.getItem('userProfile');
        const profile = profileJson ? JSON.parse(profileJson) : null;
        const userId = profile?.id || profile?.uid || profile?.userId;
        if (userId) {
          identify({ userId, role: 'ADMIN' });
        }

        const socket = getSocket();
        const onUpdate = () => {
          loadDashboardData();
        };
        socket.off('admin:update');
        socket.on('admin:update', onUpdate);
      } catch (e) {
        // ignore
      }
    };

    initRealtime();

    return () => {
      try {
        const socket = getSocket();
        socket.off('admin:update');
      } catch (e) {
        // ignore
      }
    };
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Load admin profile from AsyncStorage
      try {
        const profileJson = await AsyncStorage.getItem('userProfile');
        if (profileJson) {
          const profile = JSON.parse(profileJson);
          setAdminName(profile.fullName || profile.name || 'Admin');
        }
      } catch (err) {
        console.log('Could not load admin profile:', err);
      }

      // Load token for API calls
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        navigation.replace('Login');
        return;
      }

      // Fetch stats from Node.js backend
      try {
        const response = await fetch(`${API_BASE}/admin/stats`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.status === 401) {
          await logout();
          navigation.replace('Login');
          return;
        }

        if (response.ok) {
          const data = await response.json();
          if (data.stats) {
            setStats(data.stats);
          }
        }
      } catch (apiError) {
        console.log('Failed to fetch stats from backend:', apiError.message);
      }

      // Fetch recent activity from backend
      try {
        const response = await fetch(`${API_BASE}/admin/activity`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          if (data.activities && data.activities.length > 0) {
            setRecentActivity(data.activities.map(a => ({
              ...a,
              time: formatTimeAgo(new Date(a.time))
            })));
          }
        }
      } catch (apiError) {
        console.log('Failed to fetch activity from backend:', apiError.message);
      }

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTimeAgo = (date) => {
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return t('admin.timeAgo.justNow');
    if (minutes < 60) return t('admin.timeAgo.minsAgo', { count: minutes });
    if (hours < 24) return t('admin.timeAgo.hoursAgo', { count: hours });
    return t('admin.timeAgo.daysAgo', { count: days });
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case 'sos': return { icon: 'alert-octagon', color: colors.accent.red };
      case 'request': return { icon: 'hand-heart', color: colors.primary.main };
      case 'resolved': return { icon: 'check-circle', color: colors.secondary.green };
      case 'caregiver': return { icon: 'account-plus', color: colors.accent.orange };
      case 'mood': return { icon: 'emoticon-sad', color: colors.accent.orange };
      default: return { icon: 'information', color: colors.neutral.gray };
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{t('admin.welcome')}</Text>
          <Text style={styles.adminName}>{adminName}</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.notificationBtn}
            onPress={() => navigation.navigate('Notifications')}
          >
            <MaterialCommunityIcons
              name="bell"
              size={26}
              color={colors.neutral.black}
            />
            {unreadNotifications > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.badgeText}>{unreadNotifications > 9 ? '9+' : unreadNotifications}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.profileBtn}
            onPress={() => navigation.navigate('AdminProfile')}
          >
            <MaterialCommunityIcons
              name="account-circle"
              size={40}
              color={colors.primary.main}
            />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary.main]}
          />
        }
      >
        {/* Loading State */}
        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={colors.primary.main} />
          </View>
        )}

        {/* SOS Alert Banner */}
        {stats.sosAlerts > 0 && (
          <TouchableOpacity
            style={[styles.sosBanner, shadows.md]}
            onPress={() => navigation.navigate('IncidentManagement')}
          >
            <MaterialCommunityIcons
              name="alert-circle"
              size={32}
              color={colors.neutral.white}
            />
            <View style={styles.sosContent}>
              <Text style={styles.sosTitle}>{t('admin.sos.activeSOS', { count: stats.sosAlerts })}</Text>
              <Text style={styles.sosSubtitle}>{t('admin.sos.manageSOSDesc')}</Text>
            </View>
            <MaterialCommunityIcons
              name="chevron-right"
              size={28}
              color={colors.neutral.white}
            />
          </TouchableOpacity>
        )}

        {/* KPI Cards */}
        <Text style={styles.sectionTitle}>{t('admin.sections.keyMetrics')}</Text>
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, shadows.sm]}>
            <MaterialCommunityIcons
              name="account-group"
              size={32}
              color={colors.primary.main}
            />
            <Text style={styles.statNumber}>{stats.totalSeniors}</Text>
            <Text style={styles.statLabel}>{t('admin.stats.totalSeniors')}</Text>
          </View>

          <View style={[styles.statCard, shadows.sm]}>
            <MaterialCommunityIcons
              name="hand-heart"
              size={32}
              color={colors.secondary.green}
            />
            <Text style={styles.statNumber}>{stats.activeCaregivers}</Text>
            <Text style={styles.statLabel}>{t('admin.stats.activeCaregivers')}</Text>
          </View>

          <View style={[styles.statCard, shadows.sm]}>
            <MaterialCommunityIcons
              name="clock-alert"
              size={32}
              color={colors.accent.orange}
            />
            <Text style={styles.statNumber}>{stats.pendingRequests}</Text>
            <Text style={styles.statLabel}>{t('admin.stats.pendingRequests')}</Text>
          </View>

          <View style={[styles.statCard, shadows.sm]}>
            <MaterialCommunityIcons
              name="check-decagram"
              size={32}
              color={colors.secondary.green}
            />
            <Text style={styles.statNumber}>{stats.helpResolved}</Text>
            <Text style={styles.statLabel}>{t('admin.stats.helpResolved')}</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>{t('admin.sections.quickActions')}</Text>
        <View style={styles.actionsGrid}>
          <TouchableOpacity
            style={[styles.actionCard, shadows.sm]}
            onPress={() => navigation.navigate('AIRiskDashboard')}
          >
            <View style={[styles.actionIcon, { backgroundColor: colors.primary.light }]}>
              <MaterialCommunityIcons
                name="brain"
                size={28}
                color={colors.primary.main}
              />
            </View>
            <Text style={styles.actionTitle}>{t('admin.actions.aiRisk')}</Text>
            <Text style={styles.actionSubtitle}>{t('admin.actionSubtitles.viewWellness')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionCard, shadows.sm]}
            onPress={() => navigation.navigate('IncidentManagement')}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#FFEBEE' }]}>
              <MaterialCommunityIcons
                name="alert-decagram"
                size={28}
                color={colors.accent.red}
              />
            </View>
            <Text style={styles.actionTitle}>{t('admin.actions.incidents')}</Text>
            <Text style={styles.actionSubtitle}>{t('admin.actionSubtitles.trackEscalations')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionCard, shadows.sm]}
            onPress={() => navigation.navigate('Analytics')}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#E8F5E9' }]}>
              <MaterialCommunityIcons
                name="chart-line"
                size={28}
                color={colors.secondary.green}
              />
            </View>
            <Text style={styles.actionTitle}>{t('admin.actions.analytics')}</Text>
            <Text style={styles.actionSubtitle}>{t('admin.actionSubtitles.viewReports')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionCard, shadows.sm]}
            onPress={() => navigation.navigate('UserManagement')}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#FFF3E0' }]}>
              <MaterialCommunityIcons
                name="account-cog"
                size={28}
                color={colors.accent.orange}
              />
            </View>
            <Text style={styles.actionTitle}>{t('admin.actions.users')}</Text>
            <Text style={styles.actionSubtitle}>{t('admin.actionSubtitles.manageUsers')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionCard, shadows.sm]}
            onPress={() => navigation.navigate('VolunteerApproval')}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#E3F2FD' }]}>
              <MaterialCommunityIcons
                name="account-check"
                size={28}
                color="#1976D2"
              />
            </View>
            <Text style={styles.actionTitle}>{t('admin.actions.volunteers')}</Text>
            <Text style={styles.actionSubtitle}>{t('admin.actionSubtitles.reviewApps')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionCard, shadows.sm]}
            onPress={() => navigation.navigate('NGOApproval')}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#F3E5F5' }]}>
              <MaterialCommunityIcons
                name="office-building"
                size={28}
                color="#6A1B9A"
              />
            </View>
            <Text style={styles.actionTitle}>{t('admin.actions.ngo')}</Text>
            <Text style={styles.actionSubtitle}>{t('admin.actionSubtitles.reviewNGOs')}</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Activity */}
        <View style={styles.activityHeader}>
          <Text style={styles.sectionTitle}>{t('admin.sections.recentActivity')}</Text>
          <TouchableOpacity>
            <Text style={styles.viewAllText}>{t('admin.sections.viewAll')}</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.activityCard, shadows.sm]}>
          {recentActivity.map((activity, index) => {
            const { icon, color } = getActivityIcon(activity.type);
            return (
              <View
                key={activity.id}
                style={[
                  styles.activityItem,
                  index !== recentActivity.length - 1 && styles.activityBorder
                ]}
              >
                <View style={[styles.activityIconContainer, { backgroundColor: color + '20' }]}>
                  <MaterialCommunityIcons
                    name={icon}
                    size={22}
                    color={color}
                  />
                </View>
                <View style={styles.activityContent}>
                  <Text style={styles.activityMessage}>{activity.message}</Text>
                  <Text style={styles.activityTime}>{activity.time}</Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* Response Time Card */}
        <View style={[styles.responseCard, shadows.sm]}>
          <View style={styles.responseLeft}>
            <MaterialCommunityIcons
              name="timer"
              size={32}
              color={colors.secondary.green}
            />
            <View style={styles.responseContent}>
              <Text style={styles.responseLabel}>{t('admin.responseTime.label')}</Text>
              <Text style={styles.responseValue}>{stats.avgResponseTime}</Text>
            </View>
          </View>
          <Text style={styles.responseStatus}>{t('admin.responseTime.statusGood')}</Text>
        </View>
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={[styles.bottomNav, shadows.lg]}>
        <TouchableOpacity style={styles.navItem}>
          <MaterialCommunityIcons
            name="view-dashboard"
            size={26}
            color={colors.primary.main}
          />
          <Text style={[styles.navLabel, styles.navLabelActive]}>{t('admin.nav.dashboard')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => navigation.navigate('AIRiskDashboard')}
        >
          <MaterialCommunityIcons
            name="brain"
            size={26}
            color={colors.neutral.gray}
          />
          <Text style={styles.navLabel}>{t('admin.nav.aiInsights')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => navigation.navigate('IncidentManagement')}
        >
          <MaterialCommunityIcons
            name="alert-decagram"
            size={26}
            color={colors.neutral.gray}
          />
          <Text style={styles.navLabel}>{t('admin.nav.incidents')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => navigation.navigate('Analytics')}
        >
          <MaterialCommunityIcons
            name="chart-box"
            size={26}
            color={colors.neutral.gray}
          />
          <Text style={styles.navLabel}>{t('admin.nav.analytics')}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.neutral.white,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.neutral.white,
  },
  greeting: {
    fontSize: typography.sizes.md,
    color: colors.neutral.darkGray,
  },
  adminName: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
    color: colors.neutral.black,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  notificationBtn: {
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: colors.accent.red,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.neutral.white,
  },
  profileBtn: {},
  scrollView: {
    flex: 1,
    backgroundColor: colors.neutral.lightGray,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: 100,
  },
  loadingOverlay: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  sosBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accent.red,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  sosContent: {
    flex: 1,
    marginLeft: spacing.md,
  },
  sosTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.neutral.white,
  },
  sosSubtitle: {
    fontSize: typography.sizes.sm,
    color: 'rgba(255,255,255,0.8)',
    marginTop: spacing.xs,
  },
  sectionTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semiBold,
    color: colors.neutral.black,
    marginBottom: spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  statCard: {
    width: cardWidth,
    backgroundColor: colors.neutral.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
    color: colors.neutral.black,
    marginTop: spacing.sm,
  },
  statLabel: {
    fontSize: typography.sizes.sm,
    color: colors.neutral.darkGray,
    marginTop: spacing.xs,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  actionCard: {
    width: cardWidth,
    backgroundColor: colors.neutral.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  actionTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semiBold,
    color: colors.neutral.black,
  },
  actionSubtitle: {
    fontSize: typography.sizes.sm,
    color: colors.neutral.darkGray,
    marginTop: spacing.xs,
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  viewAllText: {
    fontSize: typography.sizes.md,
    color: colors.primary.main,
    fontWeight: typography.weights.medium,
  },
  activityCard: {
    backgroundColor: colors.neutral.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  activityBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.lightGray,
  },
  activityIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityContent: {
    flex: 1,
    marginLeft: spacing.md,
  },
  activityMessage: {
    fontSize: typography.sizes.md,
    color: colors.neutral.black,
  },
  activityTime: {
    fontSize: typography.sizes.sm,
    color: colors.neutral.gray,
    marginTop: spacing.xs,
  },
  responseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.neutral.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  responseLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  responseContent: {
    marginLeft: spacing.md,
  },
  responseLabel: {
    fontSize: typography.sizes.sm,
    color: colors.neutral.darkGray,
  },
  responseValue: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.neutral.black,
    marginTop: spacing.xs,
  },
  responseStatus: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semiBold,
    color: colors.secondary.green,
    backgroundColor: '#E8F5E9',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.sm,
  },
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: colors.neutral.white,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.neutral.lightGray,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
  },
  navLabel: {
    fontSize: typography.sizes.xs,
    color: colors.neutral.gray,
    marginTop: spacing.xs,
  },
  navLabelActive: {
    color: colors.primary.main,
    fontWeight: typography.weights.medium,
  },
});

export default AdminHomeScreen;
