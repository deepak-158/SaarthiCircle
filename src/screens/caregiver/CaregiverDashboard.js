// Caregiver Dashboard Screen
import React, { useState, useEffect, useCallback } from 'react';
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
import useIncomingCallListener from '../../hooks/useIncomingCallListener';
// Firebase imports removed - feature being migrated to centralized backend
import { useFocusEffect } from '@react-navigation/native';
import { getSocket, identify } from '../../services/socketService';

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

import { BACKEND_URL as API_BASE } from '../../config/backend';

const CaregiverDashboard = ({ navigation }) => {
  const [allRequests, setAllRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('pending');
  const [volunteerProfile, setVolunteerProfile] = useState(null);
  const [availabilityOnline, setAvailabilityOnline] = useState(false);

  // Listen for incoming calls
  useIncomingCallListener();

  useEffect(() => {
    loadDashboardData();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadDashboardData();
    }, [])
  );

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      
      // Load fresh profile from backend
      try {
        const resp = await fetch(`${API_BASE}/me`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (resp.ok) {
          const data = await resp.json();
          if (data.user) {
            setVolunteerProfile(data.user);
            await AsyncStorage.setItem('userProfile', JSON.stringify(data.user));
          }
        } else {
          // fallback to local
          const profileJson = await AsyncStorage.getItem('userProfile');
          if (profileJson) setVolunteerProfile(JSON.parse(profileJson));
        }
      } catch (e) {
        console.warn('Dashboard: Failed to fetch profile:', e);
        const profileJson = await AsyncStorage.getItem('userProfile');
        if (profileJson) setVolunteerProfile(JSON.parse(profileJson));
      }
      
      // Load help requests (can be expanded to backend later)
      await loadHelpRequests();

      // Load persisted availability for volunteer/caregiver
      try {
        const resp = await fetch(`${API_BASE}/volunteers/me/availability`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (resp.ok) {
          const data = await resp.json();
          setAvailabilityOnline(!!data?.isOnline);
        }
      } catch {}
      
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleAvailability = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const next = !availabilityOnline;

      const resp = await fetch(`${API_BASE}/volunteers/me/availability`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ isOnline: next })
      });
      if (!resp.ok) throw new Error('Failed to update availability');

      setAvailabilityOnline(next);

      // Sync socket state so seniors see it in real-time
      try {
        const profileJson = await AsyncStorage.getItem('userProfile');
        const profile = profileJson ? JSON.parse(profileJson) : null;
        const userId = profile?.id || profile?.uid || profile?.userId;
        if (userId) {
          if (next) identify({ userId, role: 'VOLUNTEER' });
          const socket = getSocket();
          socket?.emit('volunteer:availability', { volunteerId: userId, isOnline: next });
        }
      } catch {}
    } catch (e) {
      Alert.alert('Error', e?.message || 'Failed to update availability');
    }
  };

  const loadHelpRequests = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const resolvedDummyJson = await AsyncStorage.getItem('dummyResolvedIds');
      const resolvedDummyIds = resolvedDummyJson ? JSON.parse(resolvedDummyJson) : [];
      const resolvedDummySet = new Set(Array.isArray(resolvedDummyIds) ? resolvedDummyIds : []);
      // Fetch all relevant requests (pending + own accepted/completed)
      const resp = await fetch(`${API_BASE}/help-requests?status=all`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!resp.ok) throw new Error('Failed to fetch requests');
      
      const data = await resp.json();
      const realRequests = (data.requests || []).map(r => ({
        id: r.id,
        seniorName: r.senior?.name || 'Anonymous Senior',
        helpType: r.category,
        priority: r.priority,
        status: (r.status === 'accepted' || r.status === 'escalated') ? 'active' : r.status,
        description: r.description,
        time: formatTimeAgo(r.created_at),
        icon: getIconForHelpType(r.category),
        senior: r.senior,
        raw: r // keep raw data for detail view
      }));

      // Apply local completion state for dummy requests (for demo/testing on web)
      const dummyRequests = DUMMY_REQUESTS.map((r) => {
        if (resolvedDummySet.has(String(r.id))) {
          return { ...r, status: 'completed', completedAt: r.completedAt || 'Just now' };
        }
        return r;
      });

      // Combine with dummy only if empty for demo purposes
      if (realRequests.length === 0) {
        setAllRequests(dummyRequests);
      } else {
        setAllRequests(realRequests);
      }
    } catch (error) {
      console.error('Error loading requests:', error);
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
      const token = await AsyncStorage.getItem('userToken');
      let conversationId = null;
      
      if (!requestId.toString().startsWith('dummy')) {
        const resp = await fetch(`${API_BASE}/help-requests/${requestId}/accept`, {
          method: 'PUT',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!resp.ok) throw new Error('Failed to accept request');
        
        const data = await resp.json();
        conversationId = data.conversationId || data.conversation?.id;
        console.log('[DEBUG] Accept response - conversationId:', conversationId);
      }
      
      // Update local state
      setAllRequests(prev => 
        prev.map(r => r.id === requestId ? { ...r, status: 'active' } : r)
      );
      
      const request = allRequests.find(r => r.id === requestId);
      
      // Pass conversationId to the next screen
      navigation.navigate('CaregiverInteraction', { 
        requestId, 
        request,
        conversationId,
        seniorId: request?.senior?.id || request?.senior_id
      });
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
      const token = await AsyncStorage.getItem('userToken');
      
      if (!requestId.toString().startsWith('dummy')) {
        const resp = await fetch(`${API_BASE}/help-requests/${requestId}/complete`, {
          method: 'PUT',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!resp.ok) throw new Error('Failed to complete request');
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
    const raw = request?.raw;
    const convId =
      request?.conversationId ||
      request?.conversation_id ||
      raw?.conversationId ||
      raw?.conversation_id;
    const sid = request?.senior?.id || request?.senior_id || raw?.senior_id;
    navigation.navigate('CaregiverInteraction', { requestId: request.id, request, conversationId: convId, seniorId: sid });
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
              {volunteerProfile?.full_name || volunteerProfile?.fullName || 'Volunteer'}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity
              style={[styles.availabilityButton, availabilityOnline ? styles.availabilityOnline : styles.availabilityOffline]}
              onPress={toggleAvailability}
            >
              <Text style={styles.availabilityText}>{availabilityOnline ? 'Online' : 'Offline'}</Text>
            </TouchableOpacity>

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

      {/* Pending Approval Banner */}
      {volunteerProfile?.is_approved === false && (
        <View style={styles.pendingBanner}>
          <MaterialCommunityIcons name="clock-alert-outline" size={20} color={colors.neutral.white} />
          <Text style={styles.pendingBannerText}>
            Application Pending Approval. Our team is reviewing your profile.
          </Text>
        </View>
      )}

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
  availabilityButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    marginRight: spacing.sm,
  },
  availabilityOnline: {
    backgroundColor: 'rgba(46, 204, 113, 0.9)',
  },
  availabilityOffline: {
    backgroundColor: 'rgba(231, 76, 60, 0.9)',
  },
  availabilityText: {
    color: colors.neutral.white,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semiBold,
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
  pendingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accent.orange,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    borderRadius: borderRadius.md,
    ...shadows.sm,
  },
  pendingBannerText: {
    flex: 1,
    fontSize: typography.sizes.sm,
    color: colors.neutral.white,
    fontWeight: typography.weights.medium,
    marginLeft: spacing.sm,
  },
});

export default CaregiverDashboard;
