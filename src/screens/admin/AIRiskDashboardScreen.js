// AI Risk Dashboard Screen - Wellness Insights & Risk Analysis
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

const AIRiskDashboardScreen = ({ navigation }) => {
  const [riskCategories] = useState({
    high: 12,
    medium: 45,
    low: 190,
  });

  const [riskAlerts] = useState([
    {
      id: '1',
      seniorName: 'Sharma Ji',
      riskLevel: 'high',
      reasons: ['Missed 3 check-ins', 'Low mood trend', 'Isolation pattern'],
      lastContact: '48 hours ago',
    },
    {
      id: '2',
      seniorName: 'Gupta Aunty',
      riskLevel: 'high',
      reasons: ['Negative sentiment in calls', 'Declining activity'],
      lastContact: '24 hours ago',
    },
    {
      id: '3',
      seniorName: 'Patel Uncle',
      riskLevel: 'medium',
      reasons: ['Irregular sleep pattern', 'Missed medication reminder'],
      lastContact: '12 hours ago',
    },
    {
      id: '4',
      seniorName: 'Verma Ji',
      riskLevel: 'medium',
      reasons: ['Social isolation', 'Reduced app engagement'],
      lastContact: '6 hours ago',
    },
  ]);

  const [moodTrends] = useState({
    happy: 45,
    okay: 38,
    sad: 17,
  });

  const getRiskColor = (level) => {
    switch (level) {
      case 'high': return colors.accent.red;
      case 'medium': return colors.accent.orange;
      case 'low': return colors.secondary.green;
      default: return colors.neutral.gray;
    }
  };

  const getRiskIcon = (level) => {
    switch (level) {
      case 'high': return 'alert-circle';
      case 'medium': return 'alert';
      case 'low': return 'check-circle';
      default: return 'information';
    }
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
        <Text style={styles.headerTitle}>AI Risk Dashboard</Text>
        <TouchableOpacity style={styles.filterButton}>
          <MaterialCommunityIcons
            name="filter-variant"
            size={26}
            color={colors.neutral.black}
          />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {/* AI Analysis Card */}
        <View style={[styles.aiCard, shadows.md]}>
          <View style={styles.aiHeader}>
            <MaterialCommunityIcons
              name="brain"
              size={32}
              color={colors.primary.main}
            />
            <View style={styles.aiInfo}>
              <Text style={styles.aiTitle}>AI Wellness Analysis</Text>
              <Text style={styles.aiSubtitle}>Last updated: 5 mins ago</Text>
            </View>
          </View>
          <Text style={styles.aiDescription}>
            Based on call patterns, mood check-ins, and engagement data, 
            our AI has identified seniors who may need attention.
          </Text>
        </View>

        {/* Risk Overview */}
        <Text style={styles.sectionTitle}>Risk Overview</Text>
        <View style={styles.riskOverview}>
          <View style={[styles.riskCard, { borderLeftColor: colors.accent.red }, shadows.sm]}>
            <MaterialCommunityIcons
              name="alert-circle"
              size={28}
              color={colors.accent.red}
            />
            <Text style={[styles.riskNumber, { color: colors.accent.red }]}>
              {riskCategories.high}
            </Text>
            <Text style={styles.riskLabel}>High Risk</Text>
          </View>

          <View style={[styles.riskCard, { borderLeftColor: colors.accent.orange }, shadows.sm]}>
            <MaterialCommunityIcons
              name="alert"
              size={28}
              color={colors.accent.orange}
            />
            <Text style={[styles.riskNumber, { color: colors.accent.orange }]}>
              {riskCategories.medium}
            </Text>
            <Text style={styles.riskLabel}>Medium Risk</Text>
          </View>

          <View style={[styles.riskCard, { borderLeftColor: colors.secondary.green }, shadows.sm]}>
            <MaterialCommunityIcons
              name="check-circle"
              size={28}
              color={colors.secondary.green}
            />
            <Text style={[styles.riskNumber, { color: colors.secondary.green }]}>
              {riskCategories.low}
            </Text>
            <Text style={styles.riskLabel}>Low Risk</Text>
          </View>
        </View>

        {/* Mood Trends */}
        <Text style={styles.sectionTitle}>Mood Trends (This Week)</Text>
        <View style={[styles.moodCard, shadows.sm]}>
          <View style={styles.moodBar}>
            <View style={[styles.moodSegment, styles.happySegment, { flex: moodTrends.happy }]} />
            <View style={[styles.moodSegment, styles.okaySegment, { flex: moodTrends.okay }]} />
            <View style={[styles.moodSegment, styles.sadSegment, { flex: moodTrends.sad }]} />
          </View>
          <View style={styles.moodLegend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.secondary.green }]} />
              <Text style={styles.legendText}>Happy {moodTrends.happy}%</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.accent.orange }]} />
              <Text style={styles.legendText}>Okay {moodTrends.okay}%</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.accent.red }]} />
              <Text style={styles.legendText}>Sad {moodTrends.sad}%</Text>
            </View>
          </View>
        </View>

        {/* High Risk Alerts */}
        <View style={styles.alertsHeader}>
          <Text style={styles.sectionTitle}>Attention Required</Text>
          <TouchableOpacity>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>

        {riskAlerts.map(alert => (
          <TouchableOpacity 
            key={alert.id}
            style={[styles.alertCard, shadows.sm]}
            onPress={() => navigation.navigate('SeniorDetail', { seniorId: alert.id })}
          >
            <View style={styles.alertHeader}>
              <View style={[
                styles.riskBadge, 
                { backgroundColor: getRiskColor(alert.riskLevel) + '20' }
              ]}>
                <MaterialCommunityIcons
                  name={getRiskIcon(alert.riskLevel)}
                  size={24}
                  color={getRiskColor(alert.riskLevel)}
                />
              </View>
              <View style={styles.alertInfo}>
                <Text style={styles.alertName}>{alert.seniorName}</Text>
                <Text style={styles.alertContact}>Last contact: {alert.lastContact}</Text>
              </View>
              <View style={[
                styles.riskIndicator,
                { backgroundColor: getRiskColor(alert.riskLevel) }
              ]}>
                <Text style={styles.riskIndicatorText}>
                  {alert.riskLevel.toUpperCase()}
                </Text>
              </View>
            </View>

            <View style={styles.reasonsContainer}>
              <Text style={styles.reasonsTitle}>AI-Detected Concerns:</Text>
              {alert.reasons.map((reason, index) => (
                <View key={index} style={styles.reasonItem}>
                  <MaterialCommunityIcons
                    name="circle-small"
                    size={20}
                    color={getRiskColor(alert.riskLevel)}
                  />
                  <Text style={styles.reasonText}>{reason}</Text>
                </View>
              ))}
            </View>

            <View style={styles.alertActions}>
              <TouchableOpacity style={styles.alertAction}>
                <MaterialCommunityIcons
                  name="phone"
                  size={20}
                  color={colors.secondary.green}
                />
                <Text style={[styles.actionText, { color: colors.secondary.green }]}>
                  Call
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.alertAction}>
                <MaterialCommunityIcons
                  name="account-check"
                  size={20}
                  color={colors.primary.main}
                />
                <Text style={[styles.actionText, { color: colors.primary.main }]}>
                  Assign Caregiver
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.alertAction}>
                <MaterialCommunityIcons
                  name="check"
                  size={20}
                  color={colors.neutral.darkGray}
                />
                <Text style={[styles.actionText, { color: colors.neutral.darkGray }]}>
                  Mark OK
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        ))}

        {/* Insights Summary */}
        <View style={[styles.insightsCard, shadows.sm]}>
          <View style={styles.insightHeader}>
            <MaterialCommunityIcons
              name="lightbulb-on"
              size={28}
              color={colors.accent.orange}
            />
            <Text style={styles.insightTitle}>AI Insights</Text>
          </View>
          <View style={styles.insightItem}>
            <MaterialCommunityIcons
              name="trending-down"
              size={20}
              color={colors.accent.red}
            />
            <Text style={styles.insightText}>
              12% increase in low mood reports this week
            </Text>
          </View>
          <View style={styles.insightItem}>
            <MaterialCommunityIcons
              name="clock-alert"
              size={20}
              color={colors.accent.orange}
            />
            <Text style={styles.insightText}>
              Average response time increased by 3 mins
            </Text>
          </View>
          <View style={styles.insightItem}>
            <MaterialCommunityIcons
              name="account-group"
              size={20}
              color={colors.secondary.green}
            />
            <Text style={styles.insightText}>
              85% of seniors had companion calls this week
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
    backgroundColor: colors.neutral.lightGray,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.neutral.white,
    padding: spacing.md,
    ...shadows.sm,
  },
  backButton: {
    padding: spacing.sm,
  },
  headerTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semiBold,
    color: colors.neutral.black,
  },
  filterButton: {
    padding: spacing.sm,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  aiCard: {
    backgroundColor: colors.primary.light,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.primary.main,
  },
  aiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  aiInfo: {
    marginLeft: spacing.md,
  },
  aiTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.primary.dark,
  },
  aiSubtitle: {
    fontSize: typography.sizes.sm,
    color: colors.neutral.darkGray,
    marginTop: spacing.xs,
  },
  aiDescription: {
    fontSize: typography.sizes.md,
    color: colors.neutral.black,
    lineHeight: 22,
  },
  sectionTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semiBold,
    color: colors.neutral.black,
    marginBottom: spacing.md,
  },
  riskOverview: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  riskCard: {
    flex: 1,
    backgroundColor: colors.neutral.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    borderLeftWidth: 4,
  },
  riskNumber: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
    marginTop: spacing.sm,
  },
  riskLabel: {
    fontSize: typography.sizes.sm,
    color: colors.neutral.darkGray,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  moodCard: {
    backgroundColor: colors.neutral.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  moodBar: {
    flexDirection: 'row',
    height: 24,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  moodSegment: {
    height: '100%',
  },
  happySegment: {
    backgroundColor: colors.secondary.green,
  },
  okaySegment: {
    backgroundColor: colors.accent.orange,
  },
  sadSegment: {
    backgroundColor: colors.accent.red,
  },
  moodLegend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: spacing.xs,
  },
  legendText: {
    fontSize: typography.sizes.sm,
    color: colors.neutral.darkGray,
  },
  alertsHeader: {
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
  alertCard: {
    backgroundColor: colors.neutral.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  riskBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  alertName: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semiBold,
    color: colors.neutral.black,
  },
  alertContact: {
    fontSize: typography.sizes.sm,
    color: colors.neutral.darkGray,
    marginTop: spacing.xs,
  },
  riskIndicator: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  riskIndicatorText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.neutral.white,
  },
  reasonsContainer: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.neutral.lightGray,
  },
  reasonsTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semiBold,
    color: colors.neutral.darkGray,
    marginBottom: spacing.sm,
  },
  reasonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  reasonText: {
    fontSize: typography.sizes.md,
    color: colors.neutral.black,
  },
  alertActions: {
    flexDirection: 'row',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.neutral.lightGray,
    justifyContent: 'space-around',
  },
  alertAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  actionText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
  },
  insightsCard: {
    backgroundColor: '#FFF8E1',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: '#FFE082',
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  insightTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semiBold,
    color: colors.neutral.black,
    marginLeft: spacing.sm,
  },
  insightItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  insightText: {
    fontSize: typography.sizes.md,
    color: colors.neutral.black,
    flex: 1,
  },
});

export default AIRiskDashboardScreen;
