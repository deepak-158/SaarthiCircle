// Volunteer Approval Screen for Admin
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Pressable,
  Alert,
  RefreshControl,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, typography, spacing } from '../../theme';
import { LargeButton } from '../../components/common';
import { BACKEND_URL as API_BASE } from '../../config/backend';
import { logout } from '../../services/authService';
import { createNotification } from '../../config/firebase';
import { getSocket, identify } from '../../services/socketService';

const VolunteerApprovalScreen = ({ navigation }) => {
  const [pendingVolunteers, setPendingVolunteers] = useState([]);
  const [approvedVolunteers, setApprovedVolunteers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('pending');
  const [adminToken, setAdminToken] = useState(null);
  const [processingId, setProcessingId] = useState(null); // Track which volunteer is being processed

  useEffect(() => {
    loadAdminInfo();
  }, []);

  useEffect(() => {
    if (adminToken) {
      loadVolunteers();
    }
  }, [adminToken]);

  useEffect(() => {
    if (!adminToken) return;
    let mounted = true;

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
          if (!mounted) return;
          loadVolunteers();
        };
        socket.off('admin:update');
        socket.on('admin:update', onUpdate);
      } catch (e) {
        // ignore
      }
    };

    initRealtime();

    return () => {
      mounted = false;
      try {
        const socket = getSocket();
        socket.off('admin:update');
      } catch (e) {
        // ignore
      }
    };
  }, [adminToken]);

  const loadAdminInfo = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      setAdminToken(token);
    } catch (error) {
      console.error('Load admin info error:', error);
    }
  };

  const loadVolunteers = async () => {
    if (!adminToken) {
      console.log('[LOAD] No admin token, skipping load');
      return;
    }
    try {
      console.log('[LOAD] Starting to load volunteers...');
      setLoading(true);
      
      const [pendingResp, approvedResp] = await Promise.all([
        fetch(`${API_BASE}/admin/volunteers/pending`, {
          headers: { 'Authorization': `Bearer ${adminToken}` }
        }),
        fetch(`${API_BASE}/admin/volunteers/approved`, {
          headers: { 'Authorization': `Bearer ${adminToken}` }
        })
      ]);

      console.log('[LOAD] Pending response status:', pendingResp.status);
      console.log('[LOAD] Approved response status:', approvedResp.status);

      if (pendingResp.status === 401 || approvedResp.status === 401) {
        Alert.alert('Session Expired', 'Your session has expired. Please login again.');
        await logout();
        return;
      }

      if (!pendingResp.ok) {
        const errorText = await pendingResp.text();
        console.error('[LOAD] Pending volunteers fetch failed:', errorText);
        throw new Error(`Failed to fetch pending volunteers: ${pendingResp.status}`);
      }

      if (!approvedResp.ok) {
        const errorText = await approvedResp.text();
        console.error('[LOAD] Approved volunteers fetch failed:', errorText);
        throw new Error(`Failed to fetch approved volunteers: ${approvedResp.status}`);
      }

      const pendingData = await pendingResp.json();
      const approvedData = await approvedResp.json();

      console.log('[LOAD] Pending volunteers count:', pendingData.volunteers?.length || 0);
      console.log('[LOAD] Approved volunteers count:', approvedData.volunteers?.length || 0);

      const mappedPending = (pendingData.volunteers || []).map(v => ({
        id: v.id,
        fullName: v.name || v.full_name || 'Anonymous',
        email: v.email,
        phone: v.phone || 'N/A',
        city: v.city || 'N/A',
        skills: v.skills || [],
        whyVolunteer: v.why_volunteer || v.motivation || '',
        createdAt: new Date(v.updated_at || v.created_at || Date.now()),
        role: v.role, // Include role for debugging
      }));
      
      const mappedApproved = (approvedData.volunteers || []).map(v => ({
        id: v.id,
        fullName: v.name || v.full_name || 'Anonymous',
        email: v.email,
        phone: v.phone || 'N/A',
        city: v.city || 'N/A',
        skills: v.skills || [],
        helpCount: v.help_count || 0,
        rating: v.rating || 0,
        isApproved: true,
        updatedAt: new Date(v.updated_at || v.created_at || Date.now()),
        role: v.role,
      }));
      
      console.log('[LOAD] Mapped pending volunteers:', mappedPending.length);
      console.log('[LOAD] Mapped approved volunteers:', mappedApproved.length);
      if (mappedPending.length > 0) {
        console.log('[LOAD] Sample pending volunteer:', JSON.stringify(mappedPending[0], null, 2));
      }
      if (mappedApproved.length > 0) {
        console.log('[LOAD] Sample approved volunteer:', JSON.stringify(mappedApproved[0], null, 2));
      }
      
      setPendingVolunteers(mappedPending);
      setApprovedVolunteers(mappedApproved);

    } catch (error) {
      console.error('[LOAD] Load volunteers error:', error);
      console.error('[LOAD] Error stack:', error.stack);
      Alert.alert('Error', `Failed to load volunteers: ${error.message}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
      console.log('[LOAD] Load volunteers completed');
    }
  };

  const handleApprove = async (volunteer) => {
    console.log('[APPROVE] ========== HANDLE APPROVE CALLED ==========');
    console.log('[APPROVE] Volunteer ID:', volunteer.id);
    console.log('[APPROVE] Volunteer Name:', volunteer.fullName);
    console.log('[APPROVE] Platform:', Platform.OS);
    console.log('[APPROVE] Current processingId:', processingId);
    
    // For web, use window.confirm instead of Alert.alert
    if (Platform.OS === 'web') {
      console.log('[APPROVE] Web platform detected, using window.confirm');
      const confirmed = window.confirm(`Are you sure you want to approve ${volunteer.fullName} as a volunteer?`);
      if (!confirmed) {
        console.log('[APPROVE] User cancelled (web confirm)');
        return;
      }
      console.log('[APPROVE] User confirmed (web), proceeding with approval...');
      // Continue directly to approval
    } else {
      console.log('[APPROVE] Native platform, using Alert.alert');
      Alert.alert(
        'Approve Volunteer',
        `Are you sure you want to approve ${volunteer.fullName} as a volunteer?`,
        [
          { 
            text: 'Cancel', 
            style: 'cancel',
            onPress: () => {
              console.log('[APPROVE] User cancelled approval');
            }
          },
          {
            text: 'Approve',
            onPress: async () => {
              console.log('[APPROVE] Alert onPress callback triggered');
              await executeApproval(volunteer);
            },
          },
        ],
        { cancelable: true }
      );
      console.log('[APPROVE] Alert.alert called, waiting for user response');
      return;
    }
    
    // Execute approval for web or if we reach here
    await executeApproval(volunteer);
  };

  const executeApproval = async (volunteer) => {
    console.log('[APPROVE] ========== EXECUTE APPROVAL STARTED ==========');
    console.log('[APPROVE] ProcessingId check:', processingId);
    
    if (processingId) {
      console.log('[APPROVE] Already processing, returning early');
      return;
    }
    
    console.log('[APPROVE] Setting processingId to:', volunteer.id);
    setProcessingId(volunteer.id);
    
    try {
      console.log('[APPROVE] Starting approval for:', volunteer.id);
      if (!adminToken) {
        Alert.alert('Error', 'Admin token is missing. Please login again.');
        setProcessingId(null);
        return;
      }

      // Get admin user info for notification
      const adminProfileJson = await AsyncStorage.getItem('userProfile');
      const adminProfile = adminProfileJson ? JSON.parse(adminProfileJson) : null;
      const adminName = adminProfile?.name || adminProfile?.full_name || 'Admin';

      console.log('[APPROVE] Making API call to:', `${API_BASE}/admin/volunteers/${volunteer.id}/approve`);
      console.log('[APPROVE] Token present:', !!adminToken);
      console.log('[APPROVE] Token length:', adminToken?.length);
      
      const resp = await fetch(`${API_BASE}/admin/volunteers/${volunteer.id}/approve`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      console.log('[APPROVE] Response status:', resp.status);
      const responseText = await resp.text();
      console.log('[APPROVE] Response body (raw):', responseText);
      console.log('[APPROVE] Response headers:', JSON.stringify([...resp.headers.entries()]));

      if (resp.status === 401) {
        Alert.alert('Session Expired', 'Your session has expired. Please login again.');
        await logout();
        setProcessingId(null);
        return;
      }

      if (resp.status === 403) {
        Alert.alert('Access Denied', 'You do not have permission to approve volunteers. Please contact an administrator.');
        setProcessingId(null);
        return;
      }

      if (!resp.ok) {
        let errData = {};
        try {
          errData = JSON.parse(responseText);
        } catch (e) {
          errData = { error: responseText || `Approval failed with status ${resp.status}` };
        }
        console.error('[APPROVE] Failed details:', errData);
        console.error('[APPROVE] Full error:', {
          status: resp.status,
          statusText: resp.statusText,
          body: errData
        });
        Alert.alert('Approval Failed', errData.error || `Failed to approve volunteer. Status: ${resp.status}`);
        setProcessingId(null);
        return;
      }
      
      let data;
      try {
        data = JSON.parse(responseText);
        console.log('[APPROVE] Success data:', JSON.stringify(data, null, 2));
      } catch (parseError) {
        console.error('[APPROVE] Failed to parse response:', parseError);
        console.error('[APPROVE] Response text was:', responseText);
        Alert.alert('Error', 'Received invalid response from server. Please try again.');
        setProcessingId(null);
        return;
      }

      // Verify the response indicates success
      if (!data.success && !data.volunteer) {
        console.error('[APPROVE] Response does not indicate success:', data);
        Alert.alert('Error', 'Server response did not confirm approval. Please check the logs.');
        setProcessingId(null);
        return;
      }
      
      console.log('[APPROVE] Approval confirmed, creating notifications...');
      
      // Create notifications
      try {
        // Notification for applicant
        await createNotification({
          type: 'approval',
          title: 'Application Approved! 🎉',
          message: `Congratulations! Your volunteer application has been approved. You can now start helping seniors in your community.`,
          targetUserId: volunteer.id,
          targetRole: 'volunteer',
          actionRoute: null,
        });
        console.log('[APPROVE] Notification created for applicant');

        // Notification for admin
        await createNotification({
          type: 'approval',
          title: 'Volunteer Approved',
          message: `You approved ${volunteer.fullName} as a volunteer.`,
          targetRole: 'admin',
          actionRoute: null,
        });
        console.log('[APPROVE] Notification created for admin');
      } catch (notifError) {
        console.warn('[APPROVE] Failed to create notifications:', notifError);
        // Don't fail the approval if notifications fail
      }
      
      console.log('[APPROVE] Reloading volunteer lists...');
      
      // Reload the volunteer lists to get fresh data from server
      await loadVolunteers();
      
      console.log('[APPROVE] Volunteer lists reloaded');
      
      // Verify the volunteer was moved
      setTimeout(async () => {
        await loadVolunteers();
        console.log('[APPROVE] Second reload completed for verification');
      }, 1000);
      
      Alert.alert('Success', `${volunteer.fullName} has been approved as a volunteer.`);
    } catch (error) {
      console.error('[APPROVE] ========== ERROR CAUGHT ==========');
      console.error('[APPROVE] Error:', error);
      console.error('[APPROVE] Error stack:', error.stack);
      console.error('[APPROVE] Error message:', error.message);
      Alert.alert('Error', error.message || 'Failed to approve volunteer. Please try again.');
    } finally {
      console.log('[APPROVE] Finally block - clearing processingId');
      setProcessingId(null);
      console.log('[APPROVE] ========== EXECUTE APPROVAL COMPLETED ==========');
    }
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
            if (processingId) return; // Prevent double-clicks
            setProcessingId(volunteer.id);
            try {
              console.log('[REJECT] Starting rejection for:', volunteer.id);
              if (!adminToken) {
                Alert.alert('Error', 'Admin token is missing. Please login again.');
                setProcessingId(null);
                return;
              }

              // Get admin user info for notification
              const adminProfileJson = await AsyncStorage.getItem('userProfile');
              const adminProfile = adminProfileJson ? JSON.parse(adminProfileJson) : null;
              const adminName = adminProfile?.name || adminProfile?.full_name || 'Admin';

              console.log('[REJECT] Making API call to:', `${API_BASE}/admin/volunteers/${volunteer.id}/reject`);
              console.log('[REJECT] Token present:', !!adminToken);
              
              const resp = await fetch(`${API_BASE}/admin/volunteers/${volunteer.id}/reject`, {
                method: 'POST',
                headers: { 
                  'Authorization': `Bearer ${adminToken}`,
                  'Content-Type': 'application/json',
                  'Accept': 'application/json'
                }
              });

              console.log('[REJECT] Response status:', resp.status);
              const responseText = await resp.text();
              console.log('[REJECT] Response body:', responseText);

              if (resp.status === 401) {
                Alert.alert('Session Expired', 'Your session has expired. Please login again.');
                await logout();
                setProcessingId(null);
                return;
              }

              if (!resp.ok) {
                let errData = {};
                try {
                  errData = JSON.parse(responseText);
                } catch (e) {
                  errData = { error: responseText || 'Rejection failed' };
                }
                console.error('[REJECT] Failed details:', errData);
                throw new Error(errData.error || 'Rejection failed');
              }
              
              const data = JSON.parse(responseText);
              console.log('[REJECT] Success data:', data);

              // Create notifications
              try {
                // Notification for applicant
                await createNotification({
                  type: 'system',
                  title: 'Application Status Update',
                  message: `Your volunteer application has been reviewed. Unfortunately, it was not approved at this time. You can contact support for more information.`,
                  targetUserId: volunteer.id,
                  targetRole: 'volunteer',
                  actionRoute: null,
                });

                // Notification for admin
                await createNotification({
                  type: 'approval',
                  title: 'Volunteer Rejected',
                  message: `You rejected ${volunteer.fullName}'s volunteer application.`,
                  targetRole: 'admin',
                  actionRoute: null,
                });
              } catch (notifError) {
                console.warn('[REJECT] Failed to create notifications:', notifError);
                // Don't fail the rejection if notifications fail
              }
              
              // Reload the volunteer lists to get fresh data from server
              await loadVolunteers();
              
              Alert.alert('Done', `${volunteer.fullName}'s application has been rejected.`);
            } catch (error) {
              console.error('[REJECT] Error:', error);
              Alert.alert('Error', error.message || 'Failed to reject volunteer. Please try again.');
            } finally {
              setProcessingId(null);
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
          {volunteer.skills && volunteer.skills.length > 0 ? (
            volunteer.skills.map((skill, index) => (
              <View key={index} style={styles.skillBadge}>
                <Text style={styles.skillText}>{skill}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.detailValue}>No skills listed</Text>
          )}
        </View>
      </View>

      {isPending && (
        <View style={styles.motivationContainer}>
          <Text style={styles.detailLabel}>Why volunteer:</Text>
          <Text style={styles.motivationText}>
            {volunteer.whyVolunteer ? `"${volunteer.whyVolunteer}"` : "No motivation provided"}
          </Text>
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
          <Pressable
            style={({ pressed }) => [
              styles.actionButton, 
              styles.rejectButton,
              { 
                opacity: (pressed || processingId === volunteer.id) ? 0.5 : 1,
                disabled: processingId === volunteer.id
              }
            ]}
            onPress={() => {
              if (processingId === volunteer.id) return;
              console.log('[BUTTON] Reject button pressed for:', volunteer.fullName, 'ID:', volunteer.id);
              handleReject(volunteer);
            }}
            disabled={processingId === volunteer.id}
            accessibilityRole="button"
            accessibilityLabel={`Reject ${volunteer.fullName}`}
            importantForAccessibility="yes"
          >
            {processingId === volunteer.id ? (
              <ActivityIndicator size="small" color={colors.status.error} />
            ) : (
              <>
                <MaterialCommunityIcons name="close" size={20} color={colors.status.error} />
                <Text style={[styles.actionButtonText, { color: colors.status.error }]}>Reject</Text>
              </>
            )}
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.actionButton, 
              styles.approveButton,
              { 
                opacity: (pressed || processingId === volunteer.id) ? 0.5 : 1,
                disabled: processingId === volunteer.id
              }
            ]}
            onPress={() => {
              if (processingId === volunteer.id) return;
              console.log('[BUTTON] Approve button pressed for:', volunteer.fullName, 'ID:', volunteer.id);
              handleApprove(volunteer);
            }}
            disabled={processingId === volunteer.id}
            accessibilityRole="button"
            accessibilityLabel={`Approve ${volunteer.fullName}`}
            importantForAccessibility="yes"
          >
            {processingId === volunteer.id ? (
              <ActivityIndicator size="small" color={colors.neutral.white} />
            ) : (
              <>
                <MaterialCommunityIcons name="check" size={20} color={colors.neutral.white} />
                <Text style={[styles.actionButtonText, { color: colors.neutral.white }]}>Approve</Text>
              </>
            )}
          </Pressable>
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
