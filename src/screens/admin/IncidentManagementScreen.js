// Incident Management Screen
import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius, shadows } from '../../theme';

const IncidentManagementScreen = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState('open');
  const [searchQuery, setSearchQuery] = useState('');

  const [incidents] = useState([
    {
      id: '1',
      type: 'SOS',
      priority: 'critical',
      seniorName: 'Verma Ji',
      description: 'Emergency SOS triggered - no response to calls',
      status: 'open',
      assignee: 'Unassigned',
      createdAt: '2 hours ago',
      escalated: true,
    },
    {
      id: '2',
      type: 'Welfare Check',
      priority: 'high',
      seniorName: 'Sharma Aunty',
      description: 'Missed 3 consecutive check-ins',
      status: 'open',
      assignee: 'Rahul Kumar',
      createdAt: '4 hours ago',
      escalated: false,
    },
    {
      id: '3',
      type: 'Medical',
      priority: 'high',
      seniorName: 'Gupta Uncle',
      description: 'Medication not picked up for 2 days',
      status: 'in_progress',
      assignee: 'Priya Singh',
      createdAt: '6 hours ago',
      escalated: false,
    },
    {
      id: '4',
      type: 'Mood Alert',
      priority: 'medium',
      seniorName: 'Patel Ji',
      description: 'Consistently reporting low mood for a week',
      status: 'in_progress',
      assignee: 'Amit Sharma',
      createdAt: '1 day ago',
      escalated: false,
    },
    {
      id: '5',
      type: 'Service Issue',
      priority: 'low',
      seniorName: 'Singh Aunty',
      description: 'Grocery delivery delayed',
      status: 'resolved',
      assignee: 'System',
      createdAt: '2 days ago',
      escalated: false,
      resolvedAt: '1 day ago',
    },
  ]);

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'critical': return colors.accent.red;
      case 'high': return colors.accent.orange;
      case 'medium': return '#FFC107';
      case 'low': return colors.secondary.green;
      default: return colors.neutral.gray;
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'SOS': return 'alert-octagon';
      case 'Welfare Check': return 'heart-pulse';
      case 'Medical': return 'medical-bag';
      case 'Mood Alert': return 'emoticon-sad';
      case 'Service Issue': return 'tools';
      default: return 'alert-circle';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'open': return colors.accent.red;
      case 'in_progress': return colors.accent.orange;
      case 'resolved': return colors.secondary.green;
      default: return colors.neutral.gray;
    }
  };

  const filteredIncidents = incidents.filter(incident => {
    if (activeTab === 'open') return incident.status === 'open';
    if (activeTab === 'in_progress') return incident.status === 'in_progress';
    if (activeTab === 'resolved') return incident.status === 'resolved';
    return true;
  });

  const stats = {
    open: incidents.filter(i => i.status === 'open').length,
    inProgress: incidents.filter(i => i.status === 'in_progress').length,
    resolved: incidents.filter(i => i.status === 'resolved').length,
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
        <Text style={styles.headerTitle}>Incident Management</Text>
        <TouchableOpacity style={styles.addButton}>
          <MaterialCommunityIcons
            name="plus"
            size={26}
            color={colors.primary.main}
          />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <MaterialCommunityIcons
          name="magnify"
          size={24}
          color={colors.neutral.gray}
        />
        <TextInput
          style={styles.searchInput}
          placeholder="Search incidents..."
          placeholderTextColor={colors.neutral.gray}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <TouchableOpacity>
          <MaterialCommunityIcons
            name="filter-variant"
            size={24}
            color={colors.primary.main}
          />
        </TouchableOpacity>
      </View>

      {/* Stats Bar */}
      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <View style={[styles.statDot, { backgroundColor: colors.accent.red }]} />
          <Text style={styles.statText}>{stats.open} Open</Text>
        </View>
        <View style={styles.statItem}>
          <View style={[styles.statDot, { backgroundColor: colors.accent.orange }]} />
          <Text style={styles.statText}>{stats.inProgress} In Progress</Text>
        </View>
        <View style={styles.statItem}>
          <View style={[styles.statDot, { backgroundColor: colors.secondary.green }]} />
          <Text style={styles.statText}>{stats.resolved} Resolved</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'open' && styles.tabActive]}
          onPress={() => setActiveTab('open')}
        >
          <Text style={[styles.tabText, activeTab === 'open' && styles.tabTextActive]}>
            Open
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'in_progress' && styles.tabActive]}
          onPress={() => setActiveTab('in_progress')}
        >
          <Text style={[styles.tabText, activeTab === 'in_progress' && styles.tabTextActive]}>
            In Progress
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'resolved' && styles.tabActive]}
          onPress={() => setActiveTab('resolved')}
        >
          <Text style={[styles.tabText, activeTab === 'resolved' && styles.tabTextActive]}>
            Resolved
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {filteredIncidents.map(incident => (
          <TouchableOpacity 
            key={incident.id}
            style={[styles.incidentCard, shadows.sm]}
            onPress={() => navigation.navigate('IncidentDetail', { incidentId: incident.id })}
          >
            {/* Priority Indicator */}
            <View style={[
              styles.priorityBar,
              { backgroundColor: getPriorityColor(incident.priority) }
            ]} />

            <View style={styles.incidentContent}>
              {/* Header Row */}
              <View style={styles.incidentHeader}>
                <View style={[
                  styles.typeIcon,
                  { backgroundColor: getPriorityColor(incident.priority) + '20' }
                ]}>
                  <MaterialCommunityIcons
                    name={getTypeIcon(incident.type)}
                    size={24}
                    color={getPriorityColor(incident.priority)}
                  />
                </View>
                <View style={styles.incidentInfo}>
                  <View style={styles.titleRow}>
                    <Text style={styles.incidentType}>{incident.type}</Text>
                    {incident.escalated && (
                      <View style={styles.escalatedBadge}>
                        <MaterialCommunityIcons
                          name="arrow-up"
                          size={12}
                          color={colors.neutral.white}
                        />
                        <Text style={styles.escalatedText}>Escalated</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.seniorName}>{incident.seniorName}</Text>
                </View>
                <View style={[
                  styles.priorityBadge,
                  { backgroundColor: getPriorityColor(incident.priority) }
                ]}>
                  <Text style={styles.priorityText}>
                    {incident.priority.toUpperCase()}
                  </Text>
                </View>
              </View>

              {/* Description */}
              <Text style={styles.description} numberOfLines={2}>
                {incident.description}
              </Text>

              {/* Footer */}
              <View style={styles.incidentFooter}>
                <View style={styles.footerItem}>
                  <MaterialCommunityIcons
                    name="account"
                    size={16}
                    color={colors.neutral.darkGray}
                  />
                  <Text style={styles.footerText}>{incident.assignee}</Text>
                </View>
                <View style={styles.footerItem}>
                  <MaterialCommunityIcons
                    name="clock-outline"
                    size={16}
                    color={colors.neutral.darkGray}
                  />
                  <Text style={styles.footerText}>{incident.createdAt}</Text>
                </View>
                <View style={[
                  styles.statusBadge,
                  { backgroundColor: getStatusColor(incident.status) + '20' }
                ]}>
                  <View style={[
                    styles.statusDot,
                    { backgroundColor: getStatusColor(incident.status) }
                  ]} />
                  <Text style={[
                    styles.statusText,
                    { color: getStatusColor(incident.status) }
                  ]}>
                    {incident.status === 'in_progress' ? 'In Progress' : 
                     incident.status.charAt(0).toUpperCase() + incident.status.slice(1)}
                  </Text>
                </View>
              </View>

              {/* Quick Actions */}
              <View style={styles.quickActions}>
                <TouchableOpacity style={styles.quickAction}>
                  <MaterialCommunityIcons
                    name="account-plus"
                    size={18}
                    color={colors.primary.main}
                  />
                  <Text style={[styles.quickActionText, { color: colors.primary.main }]}>
                    Assign
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.quickAction}>
                  <MaterialCommunityIcons
                    name="phone"
                    size={18}
                    color={colors.secondary.green}
                  />
                  <Text style={[styles.quickActionText, { color: colors.secondary.green }]}>
                    Call Senior
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.quickAction}>
                  <MaterialCommunityIcons
                    name="arrow-up-circle"
                    size={18}
                    color={colors.accent.orange}
                  />
                  <Text style={[styles.quickActionText, { color: colors.accent.orange }]}>
                    Escalate
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        ))}

        {filteredIncidents.length === 0 && (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons
              name="check-circle"
              size={64}
              color={colors.secondary.green}
            />
            <Text style={styles.emptyTitle}>All Clear!</Text>
            <Text style={styles.emptySubtitle}>
              No {activeTab.replace('_', ' ')} incidents
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
  addButton: {
    padding: spacing.sm,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral.lightGray,
    margin: spacing.md,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.sizes.md,
    color: colors.neutral.black,
    marginLeft: spacing.sm,
  },
  statsBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.neutral.lightGray,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: spacing.xs,
  },
  statText: {
    fontSize: typography.sizes.sm,
    color: colors.neutral.darkGray,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    backgroundColor: colors.neutral.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.lightGray,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: colors.primary.main,
  },
  tabText: {
    fontSize: typography.sizes.md,
    color: colors.neutral.darkGray,
  },
  tabTextActive: {
    color: colors.primary.main,
    fontWeight: typography.weights.semiBold,
  },
  scrollView: {
    flex: 1,
    backgroundColor: colors.neutral.lightGray,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  incidentCard: {
    backgroundColor: colors.neutral.white,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  priorityBar: {
    width: 4,
  },
  incidentContent: {
    flex: 1,
    padding: spacing.md,
  },
  incidentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typeIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  incidentInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  incidentType: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semiBold,
    color: colors.neutral.black,
  },
  escalatedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accent.red,
    paddingVertical: 2,
    paddingHorizontal: spacing.xs,
    borderRadius: borderRadius.xs,
    gap: 2,
  },
  escalatedText: {
    fontSize: typography.sizes.xs,
    color: colors.neutral.white,
    fontWeight: typography.weights.medium,
  },
  seniorName: {
    fontSize: typography.sizes.sm,
    color: colors.neutral.darkGray,
    marginTop: spacing.xs,
  },
  priorityBadge: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  priorityText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.neutral.white,
  },
  description: {
    fontSize: typography.sizes.md,
    color: colors.neutral.black,
    marginTop: spacing.md,
    lineHeight: 22,
  },
  incidentFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.neutral.lightGray,
    gap: spacing.md,
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  footerText: {
    fontSize: typography.sizes.sm,
    color: colors.neutral.darkGray,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
    marginLeft: 'auto',
    gap: spacing.xs,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
  },
  quickActions: {
    flexDirection: 'row',
    marginTop: spacing.md,
    gap: spacing.lg,
  },
  quickAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  quickActionText: {
    fontSize: typography.sizes.sm,
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

export default IncidentManagementScreen;
