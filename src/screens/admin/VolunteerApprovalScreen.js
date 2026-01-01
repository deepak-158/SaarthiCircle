// Volunteer Approval Screen for Admin
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, typography, spacing } from '../../theme';
import { LargeButton } from '../../components/common';
import {
  getPendingVolunteers,
  approveVolunteer,
  rejectVolunteer,
  getUsersByRole,
  USER_ROLES,
} from '../../config/firebase';

const VolunteerApprovalScreen = ({ navigation }) => {
  const [pendingVolunteers, setPendingVolunteers] = useState([]);
  const [approvedVolunteers, setApprovedVolunteers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('pending');
  const [adminUid, setAdminUid] = useState(null);

  useEffect(() => {
    loadAdminInfo();
    loadVolunteers();
  }, []);

  const loadAdminInfo = async () => {
    try {
      const userToken = await AsyncStorage.getItem('userToken');
      setAdminUid(userToken);
    } catch (error) {
      console.error('Load admin info error:', error);
    }
  };

  const loadVolunteers = async () => {
    try {
      setLoading(true);
      
      // Mock data for fallback
      const mockPending = [
        {
          id: 'mock1',
          fullName: 'Rahul Sharma',
          email: 'rahul@example.com',
          phone: '+91 98765 43210',
          city: 'Delhi',
          skills: ['Grocery Shopping', 'Companionship'],
          whyVolunteer: 'I want to help elderly people in my community.',
          createdAt: new Date(),
        },
        {
          id: 'mock2',
          fullName: 'Priya Patel',
          email: 'priya@example.com',
          phone: '+91 87654 32109',
          city: 'Mumbai',
          skills: ['Healthcare', 'Technology Help'],
          whyVolunteer: 'My grandmother inspired me to help seniors.',
          createdAt: new Date(),
        },
      ];

      const mockApproved = [
        {
          id: 'mock3',
          fullName: 'Amit Kumar',
          email: 'amit@example.com',
          phone: '+91 76543 21098',
          city: 'Bangalore',
          skills: ['Transportation', 'Document Help'],
          helpCount: 15,
          rating: 4.8,
          isApproved: true,
          status: 'approved',
        },
      ];

      // Try to load from Firebase
      let firebasePending = [];
      let firebaseApproved = [];
      
      try {
        // Get pending volunteers from Firebase
        const pending = await getPendingVolunteers();
        if (pending && pending.length > 0) {
          firebasePending = pending.map(v => ({
            ...v,
            skills: v.skills || ['General Help'],
            whyVolunteer: v.whyVolunteer || v.bio || 'Wants to help seniors',
            createdAt: v.createdAt?.toDate?.() || new Date(),
          }));
        }

        // Get approved volunteers from Firebase
        const allVolunteers = await getUsersByRole(USER_ROLES.VOLUNTEER);
        if (allVolunteers && allVolunteers.length > 0) {
          firebaseApproved = allVolunteers
            .filter(v => v.status === 'approved' || v.isApproved)
            .map(v => ({
              ...v,
              skills: v.skills || ['General Help'],
              helpCount: v.helpCount || 0,
              rating: v.rating || 'N/A',
              isApproved: true,
            }));
        }
      } catch (fbError) {
        console.log('Firebase data not fully available:', fbError.message);
      }

      // Use Firebase data if available, otherwise combine with mock data
      if (firebasePending.length > 0) {
        setPendingVolunteers(firebasePending);
      } else {
        setPendingVolunteers(mockPending);
      }

      if (firebaseApproved.length > 0) {
        setApprovedVolunteers(firebaseApproved);
      } else {
        setApprovedVolunteers(mockApproved);
      }

    } catch (error) {
      console.error('Load volunteers error:', error);
      // Fallback to empty with mock
      setPendingVolunteers([]);
      setApprovedVolunteers([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleApprove = async (volunteer) => {
    Alert.alert(
      'Approve Volunteer',
      `Are you sure you want to approve ${volunteer.fullName} as a volunteer?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: async () => {
            try {
              // Try to call Firebase function
              if (!volunteer.id.startsWith('mock')) {
                await approveVolunteer(volunteer.id, adminUid);
              }
              
              // Update local state
              setPendingVolunteers(prev => prev.filter(v => v.id !== volunteer.id));
              setApprovedVolunteers(prev => [...prev, { 
                ...volunteer, 
                isApproved: true,
                status: 'approved',
                helpCount: 0,
                rating: 'N/A',
              }]);
              
              Alert.alert('Success', `${volunteer.fullName} has been approved as a volunteer.`);
            } catch (error) {
              console.error('Approve error:', error);
              Alert.alert('Error', 'Failed to approve volunteer. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleReject = async (volunteer) => {
    Alert.alert(
      'Reject Volunteer',
      `Are you sure you want to reject ${volunteer.fullName}'s application?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            try {
              // Try to call Firebase function
              if (!volunteer.id.startsWith('mock')) {
                await rejectVolunteer(volunteer.id, adminUid, 'Not meeting requirements');
              }
              
              // Update local state
              setPendingVolunteers(prev => prev.filter(v => v.id !== volunteer.id));
              
              Alert.alert('Done', `${volunteer.fullName}'s application has been rejected.`);
            } catch (error) {
              console.error('Reject error:', error);
              Alert.alert('Error', 'Failed to reject volunteer. Please try again.');
            }
          },
        },
      ]
    );
  };

  const renderVolunteerCard = (volunteer, isPending) => (
    <View key={volunteer.id} style={styles.volunteerCard}>
      <View style={styles.volunteerHeader}>
        <View style={styles.avatarContainer}>
          <MaterialCommunityIcons name="account" size={32} color={colors.primary.main} />
        </View>
        <View style={styles.volunteerInfo}>
          <Text style={styles.volunteerName}>{volunteer.fullName}</Text>
          <Text style={styles.volunteerEmail}>{volunteer.email}</Text>
          <Text style={styles.volunteerCity}>📍 {volunteer.city}</Text>
        </View>
        {!isPending && (
          <View style={styles.approvedBadge}>
            <MaterialCommunityIcons name="check-circle" size={20} color={colors.status.success} />
          </View>
        )}
      </View>

      <View style={styles.volunteerDetails}>
        <Text style={styles.detailLabel}>Phone:</Text>
        <Text style={styles.detailValue}>{volunteer.phone}</Text>
      </View>

      <View style={styles.skillsContainer}>
        <Text style={styles.detailLabel}>Skills:</Text>
        <View style={styles.skillsRow}>
          {volunteer.skills?.map((skill, index) => (
            <View key={index} style={styles.skillBadge}>
              <Text style={styles.skillText}>{skill}</Text>
            </View>
          ))}
        </View>
      </View>

      {isPending && volunteer.whyVolunteer && (
        <View style={styles.motivationContainer}>
          <Text style={styles.detailLabel}>Why volunteer:</Text>
          <Text style={styles.motivationText}>"{volunteer.whyVolunteer}"</Text>
        </View>
      )}

      {!isPending && (
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <MaterialCommunityIcons name="hand-heart" size={20} color={colors.primary.main} />
            <Text style={styles.statValue}>{volunteer.helpCount || 0}</Text>
            <Text style={styles.statLabel}>Helps</Text>
          </View>
          <View style={styles.statItem}>
            <MaterialCommunityIcons name="star" size={20} color={colors.status.warning} />
            <Text style={styles.statValue}>{volunteer.rating || 'N/A'}</Text>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
        </View>
      )}

      {isPending && (
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.rejectButton]}
            onPress={() => handleReject(volunteer)}
          >
            <MaterialCommunityIcons name="close" size={20} color={colors.status.error} />
            <Text style={[styles.actionButtonText, { color: colors.status.error }]}>Reject</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.approveButton]}
            onPress={() => handleApprove(volunteer)}
          >
            <MaterialCommunityIcons name="check" size={20} color={colors.neutral.white} />
            <Text style={[styles.actionButtonText, { color: colors.neutral.white }]}>Approve</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="arrow-left" size={28} color={colors.primary.main} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Volunteer Management</Text>
        <TouchableOpacity onPress={() => loadVolunteers()}>
          <MaterialCommunityIcons name="refresh" size={24} color={colors.primary.main} />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'pending' && styles.activeTab]}
          onPress={() => setActiveTab('pending')}
        >
          <Text style={[styles.tabText, activeTab === 'pending' && styles.activeTabText]}>
            Pending ({pendingVolunteers.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'approved' && styles.activeTab]}
          onPress={() => setActiveTab('approved')}
        >
          <Text style={[styles.tabText, activeTab === 'approved' && styles.activeTabText]}>
            Approved ({approvedVolunteers.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary.main} />
          <Text style={styles.loadingText}>Loading volunteers...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => {
              setRefreshing(true);
              loadVolunteers();
            }} />
          }
        >
          {activeTab === 'pending' ? (
            pendingVolunteers.length > 0 ? (
              pendingVolunteers.map(v => renderVolunteerCard(v, true))
            ) : (
              <View style={styles.emptyState}>
                <MaterialCommunityIcons name="check-all" size={60} color={colors.neutral.gray} />
                <Text style={styles.emptyTitle}>All caught up!</Text>
                <Text style={styles.emptySubtitle}>No pending volunteer applications.</Text>
              </View>
            )
          ) : (
            approvedVolunteers.length > 0 ? (
              approvedVolunteers.map(v => renderVolunteerCard(v, false))
            ) : (
              <View style={styles.emptyState}>
                <MaterialCommunityIcons name="account-group" size={60} color={colors.neutral.gray} />
                <Text style={styles.emptyTitle}>No approved volunteers yet</Text>
                <Text style={styles.emptySubtitle}>Approved volunteers will appear here.</Text>
              </View>
            )
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.neutral.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.lightGray,
  },
  backButton: {
    padding: spacing.sm,
  },
  headerTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.neutral.black,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.neutral.white,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.lightGray,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: colors.primary.main,
  },
  tabText: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.medium,
    color: colors.neutral.gray,
  },
  activeTabText: {
    color: colors.primary.main,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: typography.sizes.md,
    color: colors.neutral.gray,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.md,
  },
  volunteerCard: {
    backgroundColor: colors.neutral.white,
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  volunteerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  avatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.primary.light,
    alignItems: 'center',
    justifyContent: 'center',
  },
  volunteerInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  volunteerName: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.neutral.black,
  },
  volunteerEmail: {
    fontSize: typography.sizes.sm,
    color: colors.neutral.gray,
  },
  volunteerCity: {
    fontSize: typography.sizes.sm,
    color: colors.primary.main,
    marginTop: 2,
  },
  approvedBadge: {
    padding: spacing.xs,
  },
  volunteerDetails: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  detailLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.neutral.gray,
    marginRight: spacing.sm,
  },
  detailValue: {
    fontSize: typography.sizes.sm,
    color: colors.neutral.black,
  },
  skillsContainer: {
    marginBottom: spacing.sm,
  },
  skillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.xs,
    gap: spacing.xs,
  },
  skillBadge: {
    backgroundColor: colors.primary.light,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 12,
  },
  skillText: {
    fontSize: typography.sizes.xs,
    color: colors.primary.main,
    fontWeight: typography.weights.medium,
  },
  motivationContainer: {
    backgroundColor: colors.neutral.background,
    padding: spacing.md,
    borderRadius: 12,
    marginTop: spacing.sm,
  },
  motivationText: {
    fontSize: typography.sizes.sm,
    color: colors.neutral.darkGray,
    fontStyle: 'italic',
    marginTop: spacing.xs,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.neutral.lightGray,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.neutral.black,
    marginTop: 4,
  },
  statLabel: {
    fontSize: typography.sizes.xs,
    color: colors.neutral.gray,
  },
  actionButtons: {
    flexDirection: 'row',
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: 12,
  },
  rejectButton: {
    backgroundColor: '#FFEBEE',
    borderWidth: 1,
    borderColor: colors.status.error,
  },
  approveButton: {
    backgroundColor: colors.status.success,
  },
  actionButtonText: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.medium,
    marginLeft: spacing.xs,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.neutral.black,
    marginTop: spacing.md,
  },
  emptySubtitle: {
    fontSize: typography.sizes.md,
    color: colors.neutral.gray,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
});

export default VolunteerApprovalScreen;
