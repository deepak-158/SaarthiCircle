
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius, shadows } from '../../theme';
import { BACKEND_URL as API_BASE } from '../../config/backend';
import { logout } from '../../services/authService';
import { getSocket, identify } from '../../services/socketService';

const TABS = {
  users: 'users',
  ngos: 'ngos',
  seniors: 'seniors',
};

const UserManagementScreen = ({ navigation }) => {
  const [tab, setTab] = useState(TABS.users);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [users, setUsers] = useState([]);
  const [ngos, setNgos] = useState([]);
  const [seniors, setSeniors] = useState([]);

  const [modal, setModal] = useState({
    open: false,
    type: null,
    target: null,
    title: '',
    aLabel: '',
    a: '',
    bLabel: '',
    b: '',
  });

  const list = useMemo(() => {
    if (tab === TABS.users) return users;
    if (tab === TABS.ngos) return ngos;
    return seniors;
  }, [tab, users, ngos, seniors]);

  const timeAgo = (v) => {
    if (!v) return '—';
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return '—';
    const diffMs = Date.now() - d.getTime();
    const mins = Math.floor(diffMs / 60000);
    const hrs = Math.floor(diffMs / 3600000);
    const days = Math.floor(diffMs / 86400000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins} mins ago`;
    if (hrs < 24) return `${hrs} hours ago`;
    return `${days} days ago`;
  };

  const closeModal = () => {
    setModal({ open: false, type: null, target: null, title: '', aLabel: '', a: '', bLabel: '', b: '' });
  };

  const fetchJson = async (url, options = {}) => {
    const token = await AsyncStorage.getItem('userToken');
    if (!token) {
      navigation.replace('Login');
      return null;
    }

    const resp = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(options.headers || {}),
      },
    });

    if (resp.status === 401) {
      await logout();
      navigation.replace('Login');
      return null;
    }

    const text = await resp.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { raw: text };
    }

    if (!resp.ok) throw new Error(data?.error || `Request failed (${resp.status})`);
    return data;
  };

  const load = async () => {
    try {
      setLoading(true);
      const qq = String(q || '').trim();

      if (tab === TABS.users) {
        const data = await fetchJson(`${API_BASE}/admin/users?limit=200${qq ? `&q=${encodeURIComponent(qq)}` : ''}`);
        if (data) setUsers(data.users || []);
      }
      if (tab === TABS.ngos) {
        const data = await fetchJson(`${API_BASE}/admin/ngos?limit=200${qq ? `&q=${encodeURIComponent(qq)}` : ''}`);
        if (data) setNgos(data.ngos || []);
      }
      if (tab === TABS.seniors) {
        const data = await fetchJson(`${API_BASE}/admin/seniors?limit=200${qq ? `&q=${encodeURIComponent(qq)}` : ''}`);
        if (data) setSeniors(data.seniors || []);
      }
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to load');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
  };

  useEffect(() => {
    load();

    const initRealtime = async () => {
      try {
        const profileJson = await AsyncStorage.getItem('userProfile');
        const profile = profileJson ? JSON.parse(profileJson) : null;
        const userId = profile?.id || profile?.uid || profile?.userId;
        if (userId) identify({ userId, role: 'ADMIN' });

        const socket = getSocket();
        const onUpdate = () => {
          load();
        };
        socket.off('admin:update');
        socket.on('admin:update', onUpdate);
      } catch {
        // ignore
      }
    };

    initRealtime();

    return () => {
      try {
        const socket = getSocket();
        socket.off('admin:update');
      } catch {
        // ignore
      }
    };
  }, [tab]);

  const parseCsv = (s) => String(s || '').split(',').map((x) => x.trim()).filter(Boolean);

  const blockUser = (u) => {
    const blocked = u.status !== 'blocked';
    Alert.alert(blocked ? 'Block User' : 'Unblock User', `Apply to ${u.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: blocked ? 'Block' : 'Unblock',
        style: blocked ? 'destructive' : 'default',
        onPress: async () => {
          try {
            await fetchJson(`${API_BASE}/admin/users/${u.id}/block`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ blocked }),
            });
            await load();
          } catch (e) {
            Alert.alert('Error', e.message || 'Failed');
          }
        },
      },
    ]);
  };

  const resetAccess = async (u) => {
    try {
      await fetchJson(`${API_BASE}/admin/users/${u.id}/reset-access`, { method: 'POST' });
      Alert.alert('Done', 'Access reset recorded.');
      await load();
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed');
    }
  };

  const ngoVerify = async (n) => {
    try {
      await fetchJson(`${API_BASE}/admin/ngos/${n.id}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verified: !n.verified }),
      });
      await load();
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed');
    }
  };

  const ngoProfileUpdateApprove = async (n) => {
    Alert.alert('Approve Update', `Approve profile update for ${n.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Approve',
        style: 'default',
        onPress: async () => {
          try {
            await fetchJson(`${API_BASE}/admin/ngos/${n.id}/profile-update/approve`, { method: 'POST' });
            await load();
          } catch (e) {
            Alert.alert('Error', e.message || 'Failed');
          }
        },
      },
    ]);
  };

  const ngoProfileUpdateReject = (n) => {
    setModal({
      open: true,
      type: 'ngo_profile_update_reject',
      target: n,
      title: 'Reject Profile Update',
      aLabel: 'Reason',
      a: '',
      bLabel: '',
      b: '',
    });
  };

  const ngoAccess = async (n) => {
    try {
      await fetchJson(`${API_BASE}/admin/ngos/${n.id}/access`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: n.status !== 'enabled' }),
      });
      await load();
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed');
    }
  };

  const seniorDeactivate = async (s) => {
    try {
      await fetchJson(`${API_BASE}/admin/seniors/${s.id}/deactivate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deactivated: s.status !== 'deactivated' }),
      });
      await load();
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed');
    }
  };

  const seniorHistory = async (s) => {
    try {
      const data = await fetchJson(`${API_BASE}/admin/seniors/${s.id}/emergency-history`);
      if (!data) return;
      const history = Array.isArray(data.history) ? data.history : [];
      const preview = history
        .slice(0, 6)
        .map((h) => `${h.type === 'sos' ? 'SOS' : 'Help'} • ${h.status || '—'} • ${timeAgo(h.createdAt)}`);
      Alert.alert('Emergency History', [`Total: ${history.length}`, ...preview].join('\n'));
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed');
    }
  };

  const submitModal = async () => {
    const { type, target } = modal;
    if (!type || !target) return closeModal();
    try {
      if (type === 'role') {
        const role = String(modal.a || '').trim().toLowerCase();
        if (!role) throw new Error('Role required');
        await fetchJson(`${API_BASE}/admin/users/${target.id}/role`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role }),
        });
      }
      if (type === 'ngo_assign') {
        await fetchJson(`${API_BASE}/admin/ngos/${target.id}/assign`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ regions: parseCsv(modal.a), serviceTypes: parseCsv(modal.b) }),
        });
      }
      if (type === 'ngo_reject') {
        await fetchJson(`${API_BASE}/admin/ngos/${target.id}/reject`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason: String(modal.a || '') }),
        });
      }
      if (type === 'ngo_profile_update_reject') {
        const reason = String(modal.a || '').trim();
        if (!reason) throw new Error('Reason required');
        await fetchJson(`${API_BASE}/admin/ngos/${target.id}/profile-update/reject`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason }),
        });
      }
      if (type === 'senior_flag') {
        await fetchJson(`${API_BASE}/admin/seniors/${target.id}/flag`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ highRisk: !target.highRisk, reason: String(modal.a || '') }),
        });
      }
      closeModal();
      await load();
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="arrow-left" size={26} color={colors.neutral.black} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>User Management</Text>
        <TouchableOpacity style={styles.iconBtn} onPress={load}>
          <MaterialCommunityIcons name="refresh" size={24} color={colors.neutral.black} />
        </TouchableOpacity>
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity style={[styles.tab, tab === TABS.users && styles.tabActive]} onPress={() => setTab(TABS.users)}>
          <Text style={[styles.tabText, tab === TABS.users && styles.tabTextActive]}>All Users</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, tab === TABS.ngos && styles.tabActive]} onPress={() => setTab(TABS.ngos)}>
          <Text style={[styles.tabText, tab === TABS.ngos && styles.tabTextActive]}>NGOs</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, tab === TABS.seniors && styles.tabActive]} onPress={() => setTab(TABS.seniors)}>
          <Text style={[styles.tabText, tab === TABS.seniors && styles.tabTextActive]}>Seniors</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchRow}>
        <MaterialCommunityIcons name="magnify" size={20} color={colors.neutral.gray} />
        <TextInput
          style={styles.searchInput}
          value={q}
          onChangeText={setQ}
          placeholder="Search..."
          placeholderTextColor={colors.neutral.gray}
          returnKeyType="search"
          onSubmitEditing={load}
        />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary.main]} />}
      >
        {loading && (
          <View style={{ paddingVertical: spacing.md }}>
            <ActivityIndicator size="small" color={colors.primary.main} />
          </View>
        )}

        {!loading && list.map((item) => (
          <View key={item.id} style={[styles.card, shadows.sm]}>
            <View style={styles.cardTop}>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.name}</Text>
                {tab === TABS.users && (
                  <Text style={styles.meta}>
                    {String(item.role || '').toUpperCase()} • {item.status === 'blocked' ? 'Blocked' : 'Active'} • {item.region || 'N/A'}
                  </Text>
                )}
                {tab === TABS.ngos && (
                  <Text style={styles.meta}>
                    NGO • {item.status === 'enabled' ? 'Enabled' : 'Disabled'} • {item.verified ? 'Verified' : 'Unverified'}
                  </Text>
                )}
                {tab === TABS.seniors && (
                  <Text style={styles.meta}>
                    SENIOR • {item.status === 'deactivated' ? 'Deactivated' : 'Active'}{item.highRisk ? ' • High-Risk' : ''}
                  </Text>
                )}
              </View>
              <Text style={styles.lastActive}>{timeAgo(item.lastActive)}</Text>
            </View>

            {tab === TABS.ngos && (
              <View style={styles.smallRow}>
                <Text style={styles.smallText}>Regions: {Array.isArray(item.regions) && item.regions.length ? item.regions.join(', ') : '—'}</Text>
                <Text style={styles.smallText}>Services: {Array.isArray(item.serviceTypes) && item.serviceTypes.length ? item.serviceTypes.join(', ') : '—'}</Text>
                {String(item?.raw?.ngo_profile_update_status || '').toLowerCase() === 'pending' && (
                  <View style={styles.updateBox}>
                    <View style={styles.updateRow}>
                      <MaterialCommunityIcons name="clock-outline" size={18} color={colors.accent.orange} />
                      <Text style={styles.updateTitle}>Profile update requested</Text>
                    </View>
                    <Text style={styles.updateText}>
                      {(() => {
                        const patch = item?.raw?.ngo_profile_update_request;
                        if (!patch || typeof patch !== 'object') return '—';
                        const parts = [];
                        if (patch.contactPerson !== undefined) parts.push(`Contact: ${patch.contactPerson || '—'}`);
                        if (patch.phone !== undefined) parts.push(`Phone: ${patch.phone || '—'}`);
                        if (patch.email !== undefined) parts.push(`Email: ${patch.email || '—'}`);
                        return parts.length ? parts.join(' • ') : '—';
                      })()}
                    </Text>
                  </View>
                )}
              </View>
            )}

            <View style={styles.actions}>
              {tab === TABS.users && (
                <>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => blockUser(item)}>
                    <Text style={styles.actionText}>{item.status === 'blocked' ? 'Unblock' : 'Block'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => resetAccess(item)}>
                    <Text style={styles.actionText}>Reset</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => setModal({
                      open: true,
                      type: 'role',
                      target: item,
                      title: 'Change Role',
                      aLabel: 'Role (senior/volunteer/ngo/admin)',
                      a: item.role || '',
                      bLabel: '',
                      b: '',
                    })}
                  >
                    <Text style={styles.actionText}>Role</Text>
                  </TouchableOpacity>
                </>
              )}

              {tab === TABS.ngos && (
                <>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => ngoVerify(item)}>
                    <Text style={styles.actionText}>{item.verified ? 'Unverify' : 'Verify'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => ngoAccess(item)}>
                    <Text style={styles.actionText}>{item.status === 'enabled' ? 'Disable' : 'Enable'}</Text>
                  </TouchableOpacity>
                  {String(item?.raw?.ngo_profile_update_status || '').toLowerCase() === 'pending' && (
                    <>
                      <TouchableOpacity style={styles.actionBtn} onPress={() => ngoProfileUpdateApprove(item)}>
                        <Text style={styles.actionText}>Approve Update</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.actionBtn, styles.actionBtnDanger]} onPress={() => ngoProfileUpdateReject(item)}>
                        <Text style={[styles.actionText, { color: colors.status.error }]}>Reject Update</Text>
                      </TouchableOpacity>
                    </>
                  )}
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => setModal({
                      open: true,
                      type: 'ngo_assign',
                      target: item,
                      title: 'Assign Regions/Services',
                      aLabel: 'Regions (comma separated)',
                      a: Array.isArray(item.regions) ? item.regions.join(', ') : '',
                      bLabel: 'Service types (comma separated)',
                      b: Array.isArray(item.serviceTypes) ? item.serviceTypes.join(', ') : '',
                    })}
                  >
                    <Text style={styles.actionText}>Assign</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => setModal({
                      open: true,
                      type: 'ngo_reject',
                      target: item,
                      title: 'Reject NGO',
                      aLabel: 'Reason',
                      a: '',
                      bLabel: '',
                      b: '',
                    })}
                  >
                    <Text style={styles.actionText}>Reject</Text>
                  </TouchableOpacity>
                </>
              )}

              {tab === TABS.seniors && (
                <>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => seniorDeactivate(item)}>
                    <Text style={styles.actionText}>{item.status === 'deactivated' ? 'Activate' : 'Deactivate'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => setModal({
                      open: true,
                      type: 'senior_flag',
                      target: item,
                      title: item.highRisk ? 'Unflag High-Risk' : 'Flag High-Risk',
                      aLabel: 'Reason',
                      a: item.raw?.high_risk_reason || '',
                      bLabel: '',
                      b: '',
                    })}
                  >
                    <Text style={styles.actionText}>{item.highRisk ? 'Unflag' : 'Flag'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => seniorHistory(item)}>
                    <Text style={styles.actionText}>History</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        ))}

        {!loading && list.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No records</Text>
            <Text style={styles.emptySubtitle}>Try changing the search or tab.</Text>
          </View>
        )}
      </ScrollView>

      <Modal transparent visible={modal.open} animationType="fade" onRequestClose={() => setModal((m) => ({ ...m, open: false }))}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, shadows.md]}>
            <Text style={styles.modalTitle}>{modal.title}</Text>
            {!!modal.aLabel && (
              <View style={{ marginTop: spacing.md }}>
                <Text style={styles.modalLabel}>{modal.aLabel}</Text>
                <TextInput
                  style={styles.modalInput}
                  value={modal.a}
                  onChangeText={(v) => setModal((m) => ({ ...m, a: v }))}
                  placeholderTextColor={colors.neutral.gray}
                />
              </View>
            )}
            {!!modal.bLabel && (
              <View style={{ marginTop: spacing.md }}>
                <Text style={styles.modalLabel}>{modal.bLabel}</Text>
                <TextInput
                  style={styles.modalInput}
                  value={modal.b}
                  onChangeText={(v) => setModal((m) => ({ ...m, b: v }))}
                  placeholderTextColor={colors.neutral.gray}
                />
              </View>
            )}
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.neutral.lightGray }]} onPress={closeModal}>
                <Text style={[styles.modalBtnText, { color: colors.neutral.black }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.primary.main }]} onPress={submitModal}>
                <Text style={[styles.modalBtnText, { color: colors.neutral.white }]}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.neutral.white },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.lightGray,
  },
  iconBtn: { padding: spacing.sm },
  headerTitle: { fontSize: typography.sizes.lg, fontWeight: typography.weights.semiBold, color: colors.neutral.black },
  tabs: { flexDirection: 'row', padding: spacing.md, backgroundColor: colors.neutral.white },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: borderRadius.md,
    backgroundColor: colors.neutral.lightGray,
    marginHorizontal: spacing.xs,
  },
  tabActive: { backgroundColor: colors.primary.main },
  tabText: { fontSize: typography.sizes.sm, color: colors.neutral.darkGray, fontWeight: typography.weights.medium },
  tabTextActive: { color: colors.neutral.white },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.neutral.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.lightGray,
  },
  searchInput: { flex: 1, paddingVertical: spacing.xs, color: colors.neutral.black },
  scroll: { flex: 1, backgroundColor: colors.neutral.lightGray },
  scrollContent: { padding: spacing.md, paddingBottom: spacing.xxl },
  card: { backgroundColor: colors.neutral.white, borderRadius: borderRadius.lg, padding: spacing.md },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  name: { fontSize: typography.sizes.md, fontWeight: typography.weights.semiBold, color: colors.neutral.black },
  meta: { marginTop: 2, fontSize: typography.sizes.sm, color: colors.neutral.darkGray },
  lastActive: { fontSize: typography.sizes.xs, color: colors.neutral.gray, marginLeft: spacing.sm },
  smallRow: { marginTop: spacing.sm, gap: spacing.xs },
  smallText: { fontSize: typography.sizes.sm, color: colors.neutral.darkGray },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  actionBtn: { paddingVertical: spacing.xs, paddingHorizontal: spacing.sm, borderRadius: borderRadius.md, backgroundColor: colors.neutral.lightGray },
  actionBtnDanger: { backgroundColor: '#FFEBEE', borderWidth: 1, borderColor: colors.status.error },
  actionText: { fontSize: typography.sizes.sm, color: colors.neutral.black, fontWeight: typography.weights.medium },
  updateBox: {
    marginTop: spacing.sm,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.accent.orange + '15',
  },
  updateRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  updateTitle: { fontSize: typography.sizes.sm, fontWeight: typography.weights.semiBold, color: colors.neutral.black },
  updateText: { marginTop: spacing.xs, fontSize: typography.sizes.sm, color: colors.neutral.darkGray },
  emptyState: { padding: spacing.lg, alignItems: 'center' },
  emptyTitle: { fontSize: typography.sizes.md, fontWeight: typography.weights.semiBold, color: colors.neutral.black },
  emptySubtitle: { marginTop: spacing.xs, fontSize: typography.sizes.sm, color: colors.neutral.darkGray, textAlign: 'center' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', padding: spacing.lg },
  modalCard: { backgroundColor: colors.neutral.white, borderRadius: borderRadius.lg, padding: spacing.lg },
  modalTitle: { fontSize: typography.sizes.lg, fontWeight: typography.weights.semiBold, color: colors.neutral.black },
  modalLabel: { fontSize: typography.sizes.sm, color: colors.neutral.darkGray, marginBottom: spacing.xs },
  modalInput: {
    borderWidth: 1,
    borderColor: colors.neutral.lightGray,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    color: colors.neutral.black,
    backgroundColor: colors.neutral.white,
  },
  modalActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  modalBtn: { flex: 1, paddingVertical: spacing.sm, borderRadius: borderRadius.md, alignItems: 'center' },
  modalBtnText: { fontSize: typography.sizes.md, fontWeight: typography.weights.semiBold },
});

export default UserManagementScreen;
