// Analytics Dashboard Screen
import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius, shadows } from '../../theme';

const { width } = Dimensions.get('window');

const AnalyticsScreen = ({ navigation }) => {
  const [selectedPeriod, setSelectedPeriod] = useState('week');

  const [metrics] = useState({
    helpRequests: {
      total: 456,
      change: +12,
      breakdown: {
        medicine: 180,
        groceries: 120,
        transport: 96,
        other: 60,
      }
    },
    responseTime: {
      average: '12 min',
      change: -3,
    },
    satisfaction: {
      score: 4.7,
      change: +0.2,
    },
    activeUsers: {
      seniors: 1247,
      caregivers: 89,
      changeS: +45,
      changeC: +8,
    },
  });

  const [topCaregivers] = useState([
    { name: 'Rahul Kumar', requests: 45, rating: 4.9 },
    { name: 'Priya Singh', requests: 42, rating: 4.8 },
    { name: 'Amit Sharma', requests: 38, rating: 4.9 },
    { name: 'Neha Gupta', requests: 35, rating: 4.7 },
    { name: 'Vikram Patel', requests: 33, rating: 4.8 },
  ]);

  const [weeklyData] = useState([
    { day: 'Mon', requests: 65 },
    { day: 'Tue', requests: 72 },
    { day: 'Wed', requests: 58 },
    { day: 'Thu', requests: 80 },
    { day: 'Fri', requests: 75 },
    { day: 'Sat', requests: 45 },
    { day: 'Sun', requests: 42 },
  ]);

  const maxRequests = Math.max(...weeklyData.map(d => d.requests));

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
      >
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
            
            return (
              <View key={category} style={styles.breakdownItem}>
                <View style={styles.breakdownLeft}>
                  <View style={[
                    styles.categoryIcon,
                    { backgroundColor: categoryColors[index] + '20' }
                  ]}>
                    <MaterialCommunityIcons
                      name={icons[index]}
                      size={20}
                      color={categoryColors[index]}
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
                          backgroundColor: categoryColors[index]
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
