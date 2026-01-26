// Analytics Dashboard Screen
import React, { useEffect, useMemo, useState } from 'react';
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

const AnalyticsScreen = ({ navigation }) => {
  const [selectedPeriod, setSelectedPeriod] = useState('week');

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [metrics, setMetrics] = useState({
    helpRequests: { total: 0, change: 0, breakdown: {} },
    responseTime: { average: '—', change: 0 },
    satisfaction: { score: 0, change: 0 },
    activeUsers: { seniors: 0, caregivers: 0, changeS: 0, changeC: 0 },
  });

  const [topCaregivers, setTopCaregivers] = useState([]);
  const [weeklyData, setWeeklyData] = useState([]);

  const maxRequests = useMemo(() => {
    if (!weeklyData.length) return 1;
    return Math.max(...weeklyData.map(d => d.requests || 0), 1);
  }, [weeklyData]);

  useEffect(() => {
    loadAnalytics();

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
          loadAnalytics();
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
  }, [selectedPeriod]);

  const mapPeriodParam = (p) => {
    const v = String(p || '').toLowerCase();
    if (v === 'today') return 'today';
    if (v === 'month') return 'month';
    if (v === 'year') return 'year';
    return 'week';
  };

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        navigation.replace('Login');
        return;
      }

      const period = mapPeriodParam(selectedPeriod);

      const [analyticsResp, statsResp, leadersResp] = await Promise.all([
        fetch(`${API_BASE}/admin/analytics?period=${encodeURIComponent(period)}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${API_BASE}/admin/stats`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${API_BASE}/admin/leaderboard/caregivers?period=${encodeURIComponent(period)}&limit=5`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (analyticsResp.status === 401 || statsResp.status === 401 || leadersResp.status === 401) {
        await logout();
        navigation.replace('Login');
        return;
      }

      const analyticsJson = analyticsResp.ok ? await analyticsResp.json() : null;
      const statsJson = statsResp.ok ? await statsResp.json() : null;
      const leadersJson = leadersResp.ok ? await leadersResp.json() : null;

      const total = analyticsJson?.metrics?.helpRequests?.total ?? 0;
      const breakdown = analyticsJson?.metrics?.helpRequests?.breakdown ?? {};
      const avgMinutes = analyticsJson?.metrics?.responseTime?.averageMinutes;

      setWeeklyData((analyticsJson?.trend || []).map((t) => {
        const d = String(t.day || '');
        const label = d.length >= 10 ? d.slice(5) : d;
        return { day: label || '—', requests: t.requests || 0 };
      }));

      setTopCaregivers((leadersJson?.leaders || []).map((l) => ({
        name: l.name,
        requests: l.requests || 0,
        rating: l.rating || 0,
      })));

      const seniors = statsJson?.stats?.totalSeniors ?? 0;
      const caregivers = statsJson?.stats?.activeCaregivers ?? 0;

      setMetrics({
        helpRequests: { total, change: 0, breakdown },
        responseTime: { average: avgMinutes ? `${avgMinutes} min` : '—', change: 0 },
        satisfaction: { score: 0, change: 0 },
        activeUsers: { seniors, caregivers, changeS: 0, changeC: 0 },
      });
    } catch (e) {
      // ignore
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAnalytics();
  };

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
            color={colors.neutral.black}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Analytics</Text>
        <TouchableOpacity style={styles.exportButton}>
          <MaterialCommunityIcons
            name="download"
            size={24}
            color={colors.primary.main}
          />
        </TouchableOpacity>
      </View>

      {/* Period Selector */}
      <View style={styles.periodContainer}>
        {['Today', 'Week', 'Month', 'Year'].map((period) => (
          <TouchableOpacity
            key={period}
            style={[
              styles.periodButton,
              selectedPeriod === period.toLowerCase() && styles.periodButtonActive
            ]}
            onPress={() => setSelectedPeriod(period.toLowerCase())}
          >
            <Text style={[
              styles.periodText,
              selectedPeriod === period.toLowerCase() && styles.periodTextActive
            ]}>
              {period}
            </Text>
          </TouchableOpacity>
        ))}
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
        {loading && (
          <View style={{ paddingVertical: spacing.md }}>
            <ActivityIndicator size="small" color={colors.primary.main} />
          </View>
        )}
        {/* Key Metrics Row */}
        <View style={styles.metricsRow}>
          <View style={[styles.metricCard, shadows.sm]}>
            <MaterialCommunityIcons
              name="hand-heart"
              size={28}
              color={colors.primary.main}
            />
            <Text style={styles.metricValue}>{metrics.helpRequests.total}</Text>
            <Text style={styles.metricLabel}>Help Requests</Text>
            <View style={styles.changeContainer}>
              <MaterialCommunityIcons
                name="arrow-up"
                size={14}
                color={colors.secondary.green}
              />
              <Text style={[styles.changeText, { color: colors.secondary.green }]}>
                {metrics.helpRequests.change}%
              </Text>
            </View>
          </View>

          <View style={[styles.metricCard, shadows.sm]}>
            <MaterialCommunityIcons
              name="clock-fast"
              size={28}
              color={colors.accent.orange}
            />
            <Text style={styles.metricValue}>{metrics.responseTime.average}</Text>
            <Text style={styles.metricLabel}>Avg Response</Text>
            <View style={styles.changeContainer}>
              <MaterialCommunityIcons
                name="arrow-down"
                size={14}
                color={colors.secondary.green}
              />
              <Text style={[styles.changeText, { color: colors.secondary.green }]}>
                {Math.abs(metrics.responseTime.change)} min
              </Text>
            </View>
          </View>

          <View style={[styles.metricCard, shadows.sm]}>
            <MaterialCommunityIcons
              name="star"
              size={28}
              color={colors.accent.orange}
            />
            <Text style={styles.metricValue}>{metrics.satisfaction.score}</Text>
            <Text style={styles.metricLabel}>Satisfaction</Text>
            <View style={styles.changeContainer}>
              <MaterialCommunityIcons
                name="arrow-up"
                size={14}
                color={colors.secondary.green}
              />
              <Text style={[styles.changeText, { color: colors.secondary.green }]}>
                +{metrics.satisfaction.change}
              </Text>
            </View>
          </View>
        </View>

        {/* Weekly Trend Chart */}
        <View style={[styles.chartCard, shadows.sm]}>
          <Text style={styles.chartTitle}>Help Requests Trend</Text>
          <View style={styles.chart}>
            {weeklyData.map((item, index) => (
              <View key={index} style={styles.chartColumn}>
                <View style={styles.barContainer}>
                  <View 
                    style={[
                      styles.bar,
                      { 
                        height: `${(item.requests / maxRequests) * 100}%`,
                        backgroundColor: item.day === 'Thu' 
                          ? colors.primary.main 
                          : colors.primary.light
                      }
                    ]}
                  />
                </View>
                <Text style={styles.barLabel}>{item.day}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Help Request Breakdown */}
        <View style={[styles.breakdownCard, shadows.sm]}>
          <Text style={styles.sectionTitle}>Request Categories</Text>
          
          {Object.entries(metrics.helpRequests.breakdown).map(([category, count], index) => {
            const percentage = Math.round((count / metrics.helpRequests.total) * 100);
            const categoryColors = [
              colors.primary.main,
              colors.secondary.green,
              colors.accent.orange,
              colors.neutral.gray
            ];
            const icons = ['pill', 'basket', 'car', 'dots-horizontal'];
            const color = categoryColors[index % categoryColors.length];
            const icon = icons[index % icons.length];
            
            return (
              <View key={category} style={styles.breakdownItem}>
                <View style={styles.breakdownLeft}>
                  <View style={[
                    styles.categoryIcon,
                    { backgroundColor: color + '20' }
                  ]}>
                    <MaterialCommunityIcons
                      name={icon}
                      size={20}
                      color={color}
                    />
                  </View>
                  <Text style={styles.categoryName}>
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </Text>
                </View>
                <View style={styles.breakdownRight}>
                  <View style={styles.progressBar}>
                    <View 
                      style={[
                        styles.progressFill,
                        { 
                          width: `${percentage}%`,
                          backgroundColor: color
                        }
                      ]}
                    />
                  </View>
                  <Text style={styles.categoryCount}>{count}</Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* User Stats */}
        <View style={[styles.userStatsCard, shadows.sm]}>
          <Text style={styles.sectionTitle}>Active Users</Text>
          
          <View style={styles.userStatsRow}>
            <View style={styles.userStatItem}>
              <MaterialCommunityIcons
                name="account-group"
                size={32}
                color={colors.primary.main}
              />
              <Text style={styles.userStatValue}>{metrics.activeUsers.seniors}</Text>
              <Text style={styles.userStatLabel}>Seniors</Text>
              <Text style={styles.userStatChange}>+{metrics.activeUsers.changeS} this week</Text>
            </View>
            
            <View style={styles.userStatDivider} />
            
            <View style={styles.userStatItem}>
              <MaterialCommunityIcons
                name="hand-heart"
                size={32}
                color={colors.secondary.green}
              />
              <Text style={styles.userStatValue}>{metrics.activeUsers.caregivers}</Text>
              <Text style={styles.userStatLabel}>Caregivers</Text>
              <Text style={styles.userStatChange}>+{metrics.activeUsers.changeC} this week</Text>
            </View>
          </View>
        </View>

        {/* Top Caregivers */}
        <View style={[styles.leaderboardCard, shadows.sm]}>
          <View style={styles.leaderboardHeader}>
            <Text style={styles.sectionTitle}>Top Caregivers</Text>
            <TouchableOpacity>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>
          
          {topCaregivers.map((caregiver, index) => (
            <View key={index} style={styles.leaderboardItem}>
              <View style={[
                styles.rankBadge,
                index < 3 && { backgroundColor: ['#FFD700', '#C0C0C0', '#CD7F32'][index] }
              ]}>
                <Text style={styles.rankText}>{index + 1}</Text>
              </View>
              <View style={styles.caregiverInfo}>
                <Text style={styles.caregiverName}>{caregiver.name}</Text>
                <Text style={styles.caregiverStats}>
                  {caregiver.requests} requests completed
                </Text>
              </View>
              <View style={styles.ratingContainer}>
                <MaterialCommunityIcons
                  name="star"
                  size={18}
                  color="#FFB300"
                />
                <Text style={styles.ratingText}>{caregiver.rating}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Insights */}
        <View style={[styles.insightsCard, shadows.sm]}>
          <MaterialCommunityIcons
            name="lightbulb-on"
            size={28}
            color={colors.accent.orange}
          />
          <View style={styles.insightContent}>
            <Text style={styles.insightTitle}>Key Insight</Text>
            <Text style={styles.insightText}>
              Thursday has the highest help request volume. Consider adding more caregivers 
              to the schedule on Thursdays.
            </Text>
          </View>
        </View>
      </ScrollView>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.neutral.white,
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.lightGray,
  },
  backButton: {
    padding: spacing.sm,
  },
  headerTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semiBold,
    color: colors.neutral.black,
  },
  exportButton: {
    padding: spacing.sm,
  },
  periodContainer: {
    flexDirection: 'row',
    padding: spacing.md,
    backgroundColor: colors.neutral.white,
  },
  periodButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: borderRadius.md,
    backgroundColor: colors.neutral.lightGray,
    marginHorizontal: spacing.xs,
  },
  periodButtonActive: {
    backgroundColor: colors.primary.main,
  },
  periodText: {
    fontSize: typography.sizes.sm,
    color: colors.neutral.darkGray,
    fontWeight: typography.weights.medium,
  },
  periodTextActive: {
    color: colors.neutral.white,
  },
  scrollView: {
    flex: 1,
    backgroundColor: colors.neutral.lightGray,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  metricCard: {
    flex: 1,
    backgroundColor: colors.neutral.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
  },
  metricValue: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.neutral.black,
    marginTop: spacing.sm,
  },
  metricLabel: {
    fontSize: typography.sizes.xs,
    color: colors.neutral.darkGray,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  changeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  changeText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
  },
  chartCard: {
    backgroundColor: colors.neutral.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  chartTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semiBold,
    color: colors.neutral.black,
    marginBottom: spacing.md,
  },
  chart: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 150,
  },
  chartColumn: {
    alignItems: 'center',
    flex: 1,
  },
  barContainer: {
    height: 120,
    justifyContent: 'flex-end',
    width: 24,
  },
  bar: {
    width: '100%',
    borderRadius: borderRadius.sm,
    minHeight: 8,
  },
  barLabel: {
    fontSize: typography.sizes.xs,
    color: colors.neutral.darkGray,
    marginTop: spacing.xs,
  },
  breakdownCard: {
    backgroundColor: colors.neutral.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semiBold,
    color: colors.neutral.black,
    marginBottom: spacing.md,
  },
  breakdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  breakdownLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 130,
  },
  categoryIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  categoryName: {
    fontSize: typography.sizes.md,
    color: colors.neutral.black,
  },
  breakdownRight: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: colors.neutral.lightGray,
    borderRadius: borderRadius.xs,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: borderRadius.xs,
  },
  categoryCount: {
    fontSize: typography.sizes.sm,
    color: colors.neutral.darkGray,
    width: 40,
    textAlign: 'right',
  },
  userStatsCard: {
    backgroundColor: colors.neutral.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  userStatsRow: {
    flexDirection: 'row',
  },
  userStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  userStatDivider: {
    width: 1,
    backgroundColor: colors.neutral.lightGray,
    marginVertical: spacing.sm,
  },
  userStatValue: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
    color: colors.neutral.black,
    marginTop: spacing.sm,
  },
  userStatLabel: {
    fontSize: typography.sizes.md,
    color: colors.neutral.darkGray,
    marginTop: spacing.xs,
  },
  userStatChange: {
    fontSize: typography.sizes.sm,
    color: colors.secondary.green,
    marginTop: spacing.xs,
  },
  leaderboardCard: {
    backgroundColor: colors.neutral.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  leaderboardHeader: {
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
  leaderboardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.lightGray,
  },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.neutral.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.neutral.white,
  },
  caregiverInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  caregiverName: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.medium,
    color: colors.neutral.black,
  },
  caregiverStats: {
    fontSize: typography.sizes.sm,
    color: colors.neutral.darkGray,
    marginTop: spacing.xs,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  ratingText: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semiBold,
    color: colors.neutral.black,
  },
  insightsCard: {
    backgroundColor: '#FFF8E1',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: '#FFE082',
  },
  insightContent: {
    flex: 1,
    marginLeft: spacing.md,
  },
  insightTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semiBold,
    color: colors.neutral.black,
  },
  insightText: {
    fontSize: typography.sizes.md,
    color: colors.neutral.darkGray,
    marginTop: spacing.xs,
    lineHeight: 22,
  },
});

export default AnalyticsScreen;
