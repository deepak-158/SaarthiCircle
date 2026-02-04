// Incident Management Screen
import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, typography, spacing, borderRadius, shadows } from '../../theme';
import { BACKEND_URL as API_BASE } from '../../config/backend';
import { logout } from '../../services/authService';
import { getSocket, identify } from '../../services/socketService';

const IncidentManagementScreen = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState('open');
  const [searchQuery, setSearchQuery] = useState('');

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [incidents, setIncidents] = useState([]);

  const getTokenOrLogout = async () => {
    const token = await AsyncStorage.getItem('userToken');
    if (!token) {
      navigation.replace('Login');
      return null;
    }
    return token;
  };

  useEffect(() => {
    loadIncidents();

    // Quick connectivity check so UI doesn't fail silently
    (async () => {
      try {
        const resp = await fetch(`${API_BASE}/health`);
        if (!resp.ok) {
          Alert.alert('Backend issue', `Backend not reachable (status ${resp.status}).\n\nBackend: ${API_BASE}`);
        }
      } catch (e) {
        Alert.alert('Backend issue', `Cannot reach backend.\n\nBackend: ${API_BASE}`);
      }
    })();

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
          loadIncidents();
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

  const formatTimeAgo = (date) => {
    if (!date) return '—';
    const now = new Date();
    const past = date instanceof Date ? date : new Date(date);
    const diff = now - past;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} mins ago`;
    if (hours < 24) return `${hours} hours ago`;
    return `${days} days ago`;
  };

  const loadIncidents = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        navigation.replace('Login');
        return;
      }

      const q = String(searchQuery || '').trim();
      const url = `${API_BASE}/admin/incidents?status=all${q ? `&q=${encodeURIComponent(q)}` : ''}`;
      const resp = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (resp.status === 401) {
        await logout();
        navigation.replace('Login');
        return;
      }

      if (!resp.ok) {
        let msg = `Failed to load incidents (status ${resp.status})`;
        try {
          const errJson = await resp.json();
          if (errJson?.error) msg = `${msg}: ${errJson.error}`;
          if (errJson?.userRole) msg = `${msg}\nRole: ${errJson.userRole}`;
        } catch { }
        throw new Error(`${msg}\n\nBackend: ${API_BASE}`);
      }
      const data = await resp.json();
      const mapped = (data?.incidents || []).map((i) => {
        const seniorName = i?.senior?.name || i?.senior?.full_name || i?.seniorName || 'Senior';
        const seniorPhone = i?.senior?.phone || i?.senior?.phoneNumber || i?.senior?.mobile || i?.seniorPhone || null;
        const seniorId = i?.senior?.id || i?.seniorId || i?.senior_id || null;
        // Fix: Check escalation_level and escalated_at for SOS alerts
        const isEscalation =
          String(i?.type || '').toLowerCase().includes('escalation') ||
          i?.source === 'help_request' ||
          !!i?.escalated_at ||
          (i?.escalation_level && i?.escalation_level !== 'none');

        const status = String(i?.status || (isEscalation ? 'open' : 'open')).toLowerCase();
        return {
          id: i.id,
          source: i?.source || i?.raw?.source || null,
          type: isEscalation ? 'Escalation' : (i.type || 'SOS'),
          priority: i.priority || (isEscalation ? 'high' : 'critical'),
          seniorName,
          seniorPhone,
          seniorId,
          description: i.description || '',
          status,
          assignee: i?.assignee || i?.assignedTo || (i?.volunteer?.name || i?.volunteer?.full_name) || 'Unassigned',
          createdAt: formatTimeAgo(i.createdAt || i.created_at || i?.raw?.created_at),
          escalated: isEscalation,
          raw: i,
        };
      });

      setIncidents(mapped);
    } catch (e) {
      Alert.alert('Error', e?.message || `Failed to load incidents\n\nBackend: ${API_BASE}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadIncidents();
  };

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
      case 'acknowledged': return colors.accent.orange; // Same as in_progress
      case 'accepted': return colors.accent.orange;
      case 'resolved': return colors.secondary.green;
      default: return colors.neutral.gray;
    }
  };

  const callSenior = async (incident) => {
    const phone = String(incident?.seniorPhone || '').trim();
    if (!phone) {
      Alert.alert('Missing phone', 'Senior phone number is not available for this incident.');
      return;
    }
    const url = `tel:${phone}`;
    try {
      if (Platform.OS === 'web') {
        // Many browsers/dev envs block tel:; show number as fallback.
        try {
          await Linking.openURL(url);
        } catch {
          globalThis?.alert && globalThis.alert(`Call Senior: ${phone}`);
        }
        return;
      }
      await Linking.openURL(url);
    } catch (e) {
      Alert.alert('Call failed', e?.message || `Please dial ${phone} manually.`);
    }
  };

  const escalateIncident = async (incident) => {
    if (incident?.source !== 'sos_alert') {
      Alert.alert('Not supported', 'Escalation from this screen is currently supported only for SOS incidents.');
      return;
    }
    const token = await getTokenOrLogout();
    if (!token) return;

    try {
      const resp = await fetch(`${API_BASE}/admin/sos-alerts/${incident.id}/escalate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Escalated by Admin from Incident Management' }),
      });

      if (resp.status === 401) {
        await logout();
        navigation.replace('Login');
        return;
      }
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        throw new Error(`${data?.error || 'Failed to escalate'} (status ${resp.status})\n\nBackend: ${API_BASE}`);
      }

      Alert.alert('Escalated', 'Escalated to SuperAdmin.');
      loadIncidents();
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to escalate');
    }
  };

  const assignVolunteer = async (incident) => {
    if (incident?.source !== 'sos_alert') {
      Alert.alert('Not supported', 'Volunteer assignment from this screen is currently supported only for SOS incidents.');
      return;
    }
    const token = await getTokenOrLogout();
    if (!token) return;

    try {
      const volsResp = await fetch(`${API_BASE}/volunteers/available`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (volsResp.status === 401) {
        await logout();
        navigation.replace('Login');
        return;
      }

      const volsData = await volsResp.json().catch(() => ({}));
      if (!volsResp.ok) {
        throw new Error(`${volsData?.error || 'Failed to load volunteers'} (status ${volsResp.status})\n\nBackend: ${API_BASE}`);
      }
      const volunteers = Array.isArray(volsData?.volunteers) ? volsData.volunteers : [];
      if (!volunteers.length) {
        Alert.alert('No volunteers', 'No approved online volunteers are available right now.');
        return;
      }

      const assignTo = async (v) => {
        const resp = await fetch(`${API_BASE}/admin/sos-alerts/${incident.id}/reassign`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ volunteerId: v.id }),
        });
        const data = await resp.json();
        if (!resp.ok) throw new Error(data?.error || 'Failed to assign');
      };

      if (Platform.OS === 'web') {
        const list = volunteers.slice(0, 10).map((v, idx) => `${idx + 1}. ${v.name || v.full_name || v.email || String(v.id).slice(0, 8)}`).join('\n');
        const msg = `Choose a volunteer by number:\n\n${list}`;
        const input = globalThis?.prompt ? globalThis.prompt(msg, '1') : '1';
        const idx = Math.max(1, Number(input) || 1) - 1;
        const chosen = volunteers[idx] || volunteers[0];
        if (!chosen) {
          globalThis?.alert && globalThis.alert('No volunteers available.');
          return;
        }
        try {
          await assignTo(chosen);
          globalThis?.alert && globalThis.alert('Volunteer assigned to SOS case.');
          loadIncidents();
        } catch (e) {
          globalThis?.alert && globalThis.alert(e?.message || 'Failed to assign');
        }
        return;
      }

      const showVolunteerPicker = (startIndex = 0) => {
        const page = volunteers.slice(startIndex, startIndex + 2);
        const buttons = page.map((v) => ({
          text: v.name || v.full_name || v.email || String(v.id).slice(0, 8),
          onPress: async () => {
            try {
              await assignTo(v);
              Alert.alert('Assigned', 'Volunteer assigned to SOS case.');
              loadIncidents();
            } catch (e) {
              Alert.alert('Error', e.message || 'Failed to assign');
            }
          },
        }));

        if (startIndex + 2 < volunteers.length) {
          buttons.push({ text: 'More', onPress: () => showVolunteerPicker(startIndex + 2) });
        } else {
          buttons.push({ text: 'Done', style: 'cancel' });
        }

        Alert.alert('Assign Volunteer', 'Choose an available volunteer:', buttons, { cancelable: true });
      };

      showVolunteerPicker(0);
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to load volunteers');
    }
  };

  const filteredIncidents = useMemo(() => {
    const normalized = (searchQuery || '').trim().toLowerCase();
    return incidents.filter(incident => {
      if (activeTab === 'open' && incident.status !== 'open' && incident.status !== 'active') return false;
      if (activeTab === 'in_progress' && incident.status !== 'in_progress' && incident.status !== 'accepted' && incident.status !== 'acknowledged') return false;
      if (activeTab === 'resolved' && incident.status !== 'resolved' && incident.status !== 'closed') return false;
      if (!normalized) return true;
      return (
        String(incident.seniorName || '').toLowerCase().includes(normalized) ||
        String(incident.description || '').toLowerCase().includes(normalized) ||
        String(incident.type || '').toLowerCase().includes(normalized)
      );
    });
  }, [incidents, activeTab, searchQuery]);

  const stats = useMemo(() => ({
    open: incidents.filter(i => i.status === 'open' || i.status === 'active').length,
    inProgress: incidents.filter(i => i.status === 'in_progress' || i.status === 'accepted' || i.status === 'acknowledged').length,
    resolved: incidents.filter(i => i.status === 'resolved' || i.status === 'closed').length,
  }), [incidents]);

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
        {filteredIncidents.map(incident => (
          <View
            key={incident.id}
            style={[styles.incidentCard, shadows.sm]}
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
                  <Text style={styles.footerText}>{incident.assignee || 'N/A'}</Text>
                </View>
                <View style={styles.footerItem}>
                  <MaterialCommunityIcons
                    name="clock-outline"
                    size={16}
                    color={colors.neutral.darkGray}
                  />
                  <Text style={styles.footerText}>{incident.createdAt || 'N/A'}</Text>
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
                      incident.status === 'acknowledged' ? 'In Progress' :
                        incident.status.charAt(0).toUpperCase() + incident.status.slice(1)}
                  </Text>
                </View>
              </View>

              {/* Quick Actions */}
              <View style={styles.quickActions}>
                <TouchableOpacity style={styles.quickAction} onPress={() => assignVolunteer(incident)}>
                  <MaterialCommunityIcons
                    name="account-plus"
                    size={18}
                    color={colors.primary.main}
                  />
                  <Text style={[styles.quickActionText, { color: colors.primary.main }]}>
                    Assign
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.quickAction} onPress={() => callSenior(incident)}>
                  <MaterialCommunityIcons
                    name="phone"
                    size={18}
                    color={colors.secondary.green}
                  />
                  <Text style={[styles.quickActionText, { color: colors.secondary.green }]}>
                    Call Senior
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.quickAction} onPress={() => escalateIncident(incident)}>
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
          </View>
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
