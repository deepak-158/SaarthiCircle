// Caregiver Dashboard Screen
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, typography, spacing, borderRadius, shadows } from '../../theme';
import { 
  getAllHelpRequests, 
  updateHelpRequestStatus, 
  getVolunteerStats,
  getUserProfile,
} from '../../config/firebase';

// Dummy/fallback requests data
const DUMMY_REQUESTS = [
  {
    id: 'dummy1',
    seniorName: 'Sharma Ji',
    helpType: 'Daily Assistance',
    priority: 'high',
    status: 'pending',
    description: 'Needs help with medicine pickup',
    time: '5 min ago',
    icon: 'pill',
  },
  {
    id: 'dummy2',
    seniorName: 'Verma Aunty',
    helpType: 'Emotional Support',
    priority: 'medium',
    status: 'pending',
    description: 'Wants someone to talk to',
    time: '15 min ago',
    icon: 'heart',
  },
  {
    id: 'dummy3',
    seniorName: 'Gupta Uncle',
    helpType: 'Health-Related',
    priority: 'medium',
    status: 'pending',
    description: 'Feeling unwell, needs guidance',
    time: '30 min ago',
    icon: 'stethoscope',
  },
  {
    id: 'dummy4',
    seniorName: 'Kumar Ji',
    helpType: 'Tech Help',
    priority: 'low',
    status: 'active',
    description: 'Needs help setting up video call',
    time: '1 hour ago',
    icon: 'cellphone',
  },
  {
    id: 'dummy5',
    seniorName: 'Mehta Aunty',
    helpType: 'Grocery Shopping',
    priority: 'medium',
    status: 'active',
    description: 'Weekly grocery assistance',
    time: '2 hours ago',
    icon: 'cart',
  },
  {
    id: 'dummy6',
    seniorName: 'Patel Uncle',
    helpType: 'Daily Assistance',
    priority: 'high',
    status: 'completed',
    description: 'Medicine pickup completed',
    time: 'Yesterday',
    icon: 'pill',
    completedAt: 'Yesterday',
  },
  {
    id: 'dummy7',
    seniorName: 'Singh Ji',
    helpType: 'Emotional Support',
    priority: 'low',
    status: 'completed',
    description: 'Had a nice conversation',
    time: '2 days ago',
    icon: 'heart',
    completedAt: '2 days ago',
  },
];

const CaregiverDashboard = ({ navigation }) => {
  const [allRequests, setAllRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('pending');
  const [volunteerProfile, setVolunteerProfile] = useState(null);
  const [stats, setStats] = useState({ totalHelped: 0, activeRequests: 0 });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load volunteer profile
      await loadVolunteerProfile();
      
      // Load help requests from Firebase
      await loadHelpRequests();
      
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadVolunteerProfile = async () => {
    try {
      const profileJson = await AsyncStorage.getItem('userProfile');
      if (profileJson) {
        const profile = JSON.parse(profileJson);
        setVolunteerProfile(profile);
        
        // Try to get stats from Firebase
        if (profile.id || profile.uid) {
          try {
            const volunteerStats = await getVolunteerStats(profile.id || profile.uid);
            setStats(volunteerStats);
          } catch (err) {
            console.log('Could not load volunteer stats:', err);
          }
        }
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const loadHelpRequests = async () => {
    try {
      // Try to load from Firebase
      const firebaseRequests = await getAllHelpRequests();
      
      if (firebaseRequests && firebaseRequests.length > 0) {
        // Format Firebase requests
        const formattedRequests = firebaseRequests.map(req => ({
          id: req.id,
          seniorName: req.seniorName || 'Senior',
          helpType: req.helpType || req.category || 'General Help',
          priority: req.priority || 'medium',
          status: req.status || 'pending',
          description: req.description || req.message || 'Help needed',
          time: formatTimeAgo(req.createdAt),
          icon: getIconForHelpType(req.helpType || req.category),
          completedAt: req.completedAt ? formatTimeAgo(req.completedAt) : null,
          ...req,
        }));
        
        setAllRequests(formattedRequests);
      } else {
        // Use dummy data if no Firebase data
        setAllRequests(DUMMY_REQUESTS);
      }
    } catch (error) {
      console.log('Using dummy requests:', error.message);
      setAllRequests(DUMMY_REQUESTS);
    }
  };

  const formatTimeAgo = (date) => {
    if (!date) return 'Just now';
    const now = new Date();
    const past = date instanceof Date ? date : new Date(date);
    const diff = now - past;
    
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} min ago`;
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return past.toLocaleDateString();
  };

  const getIconForHelpType = (helpType) => {
    const type = (helpType || '').toLowerCase();
    if (type.includes('medicine') || type.includes('health')) return 'pill';
    if (type.includes('grocery') || type.includes('shopping')) return 'cart';
    if (type.includes('tech') || type.includes('phone')) return 'cellphone';
    if (type.includes('emotion') || type.includes('talk') || type.includes('companion')) return 'heart';
    if (type.includes('transport')) return 'car';
    if (type.includes('document')) return 'file-document';
    return 'hand-heart';
  };

  // Filter requests based on active tab
  const getFilteredRequests = () => {
    switch (activeTab) {
      case 'pending':
        return allRequests.filter(r => r.status === 'pending');
      case 'active':
        return allRequests.filter(r => r.status === 'active');
      case 'history':
        return allRequests.filter(r => r.status === 'completed');
      default:
        return allRequests;
    }
  };

  const filteredRequests = getFilteredRequests();
  const pendingCount = allRequests.filter(r => r.status === 'pending').length;
  const activeCount = allRequests.filter(r => r.status === 'active').length;
  const completedCount = allRequests.filter(r => r.status === 'completed').length;

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const handleAccept = async (requestId) => {
    try {
      // Update in Firebase if not dummy
      if (!requestId.toString().startsWith('dummy')) {
        const volunteerUid = volunteerProfile?.id || volunteerProfile?.uid;
        await updateHelpRequestStatus(requestId, 'active', volunteerUid);
      }
      
      // Update local state
      setAllRequests(prev => 
        prev.map(r => r.id === requestId ? { ...r, status: 'active' } : r)
      );
      
      const request = allRequests.find(r => r.id === requestId);
      navigation.navigate('CaregiverInteraction', { requestId, request });
    } catch (error) {
      console.error('Accept request error:', error);
      Alert.alert('Error', 'Failed to accept request. Please try again.');
    }
  };

  const handleDecline = (requestId) => {
    Alert.alert(
      'Decline Request',
      'Are you sure you want to decline this request?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Decline', 
          style: 'destructive',
          onPress: () => {
            setAllRequests(prev => prev.filter(r => r.id !== requestId));
          }
        },
      ]
    );
  };

  const handleComplete = async (requestId) => {
    try {
      // Update in Firebase if not dummy
      if (!requestId.toString().startsWith('dummy')) {
        await updateHelpRequestStatus(requestId, 'completed');
      }
      
      // Update local state
      setAllRequests(prev => 
        prev.map(r => r.id === requestId ? { ...r, status: 'completed', completedAt: 'Just now' } : r)
      );
      
      Alert.alert('Success', 'Request marked as completed!');
    } catch (error) {
      console.error('Complete request error:', error);
      Alert.alert('Error', 'Failed to complete request. Please try again.');
    }
  };

  const handleViewDetails = (request) => {
    navigation.navigate('CaregiverInteraction', { requestId: request.id, request });
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return colors.accent.red;
      case 'medium':
        return colors.accent.orange;
      default:
        return colors.primary.main;
    }
  };

  const getPriorityLabel = (priority) => {
    switch (priority) {
      case 'high':
        return 'HIGH';
      case 'medium':
        return 'MEDIUM';
      default:
        return 'LOW';
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary.main} />
          <Text style={styles.loadingText}>Loading dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <LinearGradient
        colors={[colors.primary.main, colors.primary.dark]}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerGreeting}>Welcome Back</Text>
            <Text style={styles.headerTitle}>
              {volunteerProfile?.fullName || 'Volunteer'}
            </Text>
          </View>
          <TouchableOpacity 
            style={styles.profileButton}
            onPress={() => navigation.navigate('VolunteerProfile')}
          >
            <MaterialCommunityIcons
              name="account-circle"
              size={48}
              color={colors.neutral.white}
            />
          </TouchableOpacity>
        </View>

        {/* Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{pendingCount}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{completedCount}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{volunteerProfile?.rating || '4.8'}</Text>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'pending' && styles.activeTab]}
          onPress={() => setActiveTab('pending')}
        >
          <Text style={[styles.tabText, activeTab === 'pending' && styles.activeTabText]}>
            Pending Requests
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'active' && styles.activeTab]}
          onPress={() => setActiveTab('active')}
        >
          <Text style={[styles.tabText, activeTab === 'active' && styles.activeTabText]}>
            Active
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'history' && styles.activeTab]}
          onPress={() => setActiveTab('history')}
        >
          <Text style={[styles.tabText, activeTab === 'history' && styles.activeTabText]}>
            History
          </Text>
        </TouchableOpacity>
      </View>

      {/* Request List */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {filteredRequests.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons
              name={activeTab === 'history' ? 'history' : 'inbox-outline'}
              size={80}
              color={colors.neutral.mediumGray}
            />
            <Text style={styles.emptyText}>
              {activeTab === 'pending' && 'No pending requests'}
              {activeTab === 'active' && 'No active tasks'}
              {activeTab === 'history' && 'No completed tasks yet'}
            </Text>
          </View>
        ) : (
          filteredRequests.map((request) => (
            <TouchableOpacity 
              key={request.id} 
              style={[styles.requestCard, shadows.md]}
              onPress={() => handleViewDetails(request)}
              activeOpacity={0.8}
            >
              {/* Priority Badge */}
              <View style={[
                styles.priorityBadge, 
                { backgroundColor: getPriorityColor(request.priority) }
              ]}>
                <Text style={styles.priorityText}>
                  {getPriorityLabel(request.priority)}
                </Text>
              </View>

              {/* Status Badge for Active/Completed */}
              {request.status !== 'pending' && (
                <View style={[
                  styles.statusBadge,
                  request.status === 'completed' && styles.completedBadge
                ]}>
                  <Text style={styles.statusBadgeText}>
                    {request.status === 'active' ? 'IN PROGRESS' : 'COMPLETED'}
                  </Text>
                </View>
              )}

              {/* Request Info */}
              <View style={styles.requestHeader}>
                <View style={[styles.iconContainer, { backgroundColor: `${getPriorityColor(request.priority)}20` }]}>
                  <MaterialCommunityIcons
                    name={request.icon}
                    size={28}
                    color={getPriorityColor(request.priority)}
                  />
                </View>
                <View style={styles.requestInfo}>
                  <Text style={styles.seniorName}>{request.seniorName}</Text>
                  <Text style={styles.helpType}>{request.helpType}</Text>
                </View>
                <Text style={styles.timeText}>{request.time}</Text>
              </View>

              <Text style={styles.description}>{request.description}</Text>

              {/* Completed Date for History */}
              {request.status === 'completed' && request.completedAt && (
                <View style={styles.completedInfo}>
                  <MaterialCommunityIcons name="check-circle" size={16} color="#4CAF50" />
                  <Text style={styles.completedText}>Completed on {request.completedAt}</Text>
                </View>
              )}

              {/* Action Buttons based on status */}
              {request.status === 'pending' && (
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={styles.declineButton}
                    onPress={() => handleDecline(request.id)}
                  >
                    <MaterialCommunityIcons
                      name="close"
                      size={24}
                      color={colors.neutral.darkGray}
                    />
                    <Text style={styles.declineText}>Decline</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.acceptButton}
                    onPress={() => handleAccept(request.id)}
                  >
                    <MaterialCommunityIcons
                      name="check"
                      size={24}
                      color={colors.neutral.white}
                    />
                    <Text style={styles.acceptText}>Accept</Text>
                  </TouchableOpacity>
                </View>
              )}

              {request.status === 'active' && (
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={styles.viewButton}
                    onPress={() => handleViewDetails(request)}
                  >
                    <MaterialCommunityIcons
                      name="eye"
                      size={20}
                      color={colors.primary.main}
                    />
                    <Text style={styles.viewText}>View Details</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.completeButton}
                    onPress={() => handleComplete(request.id)}
                  >
                    <MaterialCommunityIcons
                      name="check-circle"
                      size={20}
                      color={colors.neutral.white}
                    />
                    <Text style={styles.completeText}>Mark Done</Text>
                  </TouchableOpacity>
                </View>
              )}
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* SOS Alert Button */}
      <TouchableOpacity 
        style={styles.sosAlertButton}
        onPress={() => navigation.navigate('SOSAlerts')}
      >
        <MaterialCommunityIcons
          name="alert-circle"
          size={24}
          color={colors.neutral.white}
        />
        <Text style={styles.sosAlertText}>2 SOS Alerts</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.neutral.lightGray,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.neutral.lightGray,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: typography.sizes.md,
    color: colors.neutral.darkGray,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    borderBottomLeftRadius: borderRadius.xl,
    borderBottomRightRadius: borderRadius.xl,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerGreeting: {
    fontSize: typography.sizes.md,
    color: 'rgba(255,255,255,0.8)',
  },
  headerTitle: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
    color: colors.neutral.white,
    marginTop: spacing.xs,
  },
  profileButton: {
    padding: spacing.xs,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginTop: spacing.lg,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
    color: colors.neutral.white,
  },
  statLabel: {
    fontSize: typography.sizes.sm,
    color: 'rgba(255,255,255,0.8)',
    marginTop: spacing.xs,
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
  },
  tab: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginRight: spacing.sm,
    borderRadius: borderRadius.full,
  },
  activeTab: {
    backgroundColor: colors.primary.main,
  },
  tabText: {
    fontSize: typography.sizes.md,
    color: colors.neutral.darkGray,
    fontWeight: typography.weights.medium,
  },
  activeTabText: {
    color: colors.neutral.white,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyText: {
    fontSize: typography.sizes.lg,
    color: colors.neutral.darkGray,
    marginTop: spacing.md,
  },
  requestCard: {
    backgroundColor: colors.neutral.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  priorityBadge: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  priorityText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.neutral.white,
  },
  requestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  requestInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  seniorName: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semiBold,
    color: colors.neutral.black,
  },
  helpType: {
    fontSize: typography.sizes.md,
    color: colors.primary.main,
    marginTop: spacing.xs,
  },
  timeText: {
    fontSize: typography.sizes.sm,
    color: colors.neutral.darkGray,
  },
  description: {
    fontSize: typography.sizes.md,
    color: colors.neutral.darkGray,
    marginBottom: spacing.lg,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  declineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginRight: spacing.md,
  },
  declineText: {
    fontSize: typography.sizes.md,
    color: colors.neutral.darkGray,
    marginLeft: spacing.xs,
  },
  acceptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.secondary.green,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
  },
  acceptText: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semiBold,
    color: colors.neutral.white,
    marginLeft: spacing.xs,
  },
  // New styles for status badges and additional buttons
  statusBadge: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.primary.main,
  },
  completedBadge: {
    backgroundColor: '#4CAF50',
  },
  statusBadgeText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.neutral.white,
  },
  completedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  completedText: {
    fontSize: typography.sizes.sm,
    color: '#4CAF50',
    marginLeft: spacing.xs,
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginRight: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary.main,
    borderRadius: borderRadius.md,
  },
  viewText: {
    fontSize: typography.sizes.md,
    color: colors.primary.main,
    marginLeft: spacing.xs,
  },
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
  },
  completeText: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semiBold,
    color: colors.neutral.white,
    marginLeft: spacing.xs,
  },
  sosAlertButton: {
    position: 'absolute',
    bottom: spacing.lg,
    right: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accent.red,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.full,
    ...shadows.lg,
  },
  sosAlertText: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semiBold,
    color: colors.neutral.white,
    marginLeft: spacing.sm,
  },
});

export default CaregiverDashboard;
