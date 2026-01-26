import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, typography, spacing } from '../../theme';
import { BACKEND_URL as API_BASE } from '../../config/backend';
import { logout } from '../../services/authService';
import { getSocket, identify } from '../../services/socketService';

const parseCsv = (value) =>
  String(value || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

const NGOApprovalScreen = ({ navigation }) => {
  const [adminToken, setAdminToken] = useState(null);
  const [activeTab, setActiveTab] = useState('pending');
  const [ngos, setNgos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState(null);

  const [rejectModal, setRejectModal] = useState({ open: false, ngo: null, reason: '' });
  const [assignModal, setAssignModal] = useState({ open: false, ngo: null, regions: '', serviceTypes: '' });

  useEffect(() => {
    (async () => {
      const token = await AsyncStorage.getItem('userToken');
      setAdminToken(token);
    })();
  }, []);

  useEffect(() => {
    if (adminToken) loadNgos();
  }, [adminToken]);

  useEffect(() => {
    if (!adminToken) return;
    let mounted = true;
    (async () => {
      try {
        const profileJson = await AsyncStorage.getItem('userProfile');
        const profile = profileJson ? JSON.parse(profileJson) : null;
        const userId = profile?.id || profile?.uid || profile?.userId;
        if (userId) identify({ userId, role: 'ADMIN' });
        const socket = getSocket();
        const onUpdate = () => {
          if (!mounted) return;
          loadNgos();
        };
        socket.off('admin:update');
        socket.on('admin:update', onUpdate);
      } catch (e) {
        // ignore
      }
    })();
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

  const loadNgos = async () => {
    if (!adminToken) return;
    try {
      setLoading(true);
      const resp = await fetch(`${API_BASE}/admin/ngos?status=all&limit=500`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      if (resp.status === 401) {
        Alert.alert('Session Expired', 'Please login again.');
        await logout();
        return;
      }
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Failed to load NGOs');
      setNgos(Array.isArray(data.ngos) ? data.ngos : []);
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to load NGOs');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const counts = useMemo(() => {
    const pending = ngos.filter((n) => n.applicationStatus === 'pending').length;
    const approved = ngos.filter((n) => n.applicationStatus === 'approved').length;
    const rejected = ngos.filter((n) => n.applicationStatus === 'rejected').length;
    return { pending, approved, rejected };
  }, [ngos]);

  const list = useMemo(() => {
    return ngos.filter((n) => n.applicationStatus === activeTab);
  }, [ngos, activeTab]);

  const onRefresh = () => {
    setRefreshing(true);
    loadNgos();
  };

  const verifyNgo = async (ngo, verified) => {
    if (!adminToken || processingId) return;
    setProcessingId(ngo.id);
    try {
      const resp = await fetch(`${API_BASE}/admin/ngos/${ngo.id}/verify`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ verified }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Verify failed');
      await loadNgos();
    } catch (e) {
      Alert.alert('Error', e.message || 'Verify failed');
    } finally {
      setProcessingId(null);
    }
  };

  const accessNgo = async (ngo, enabled) => {
    if (!adminToken || processingId) return;
    setProcessingId(ngo.id);
    try {
      const resp = await fetch(`${API_BASE}/admin/ngos/${ngo.id}/access`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Access update failed');
      await loadNgos();
    } catch (e) {
      Alert.alert('Error', e.message || 'Access update failed');
    } finally {
      setProcessingId(null);
    }
  };

  const openAssign = (ngo) => {
    const regions = Array.isArray(ngo.regions) ? ngo.regions.join(', ') : '';
    const serviceTypes = Array.isArray(ngo.serviceTypes) ? ngo.serviceTypes.join(', ') : '';
    setAssignModal({ open: true, ngo, regions, serviceTypes });
  };

  const submitAssign = async () => {
    const ngo = assignModal.ngo;
    if (!ngo) return;
    if (!adminToken || processingId) return;
    setProcessingId(ngo.id);
    try {
      const resp = await fetch(`${API_BASE}/admin/ngos/${ngo.id}/assign`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          regions: parseCsv(assignModal.regions),
          serviceTypes: parseCsv(assignModal.serviceTypes),
        }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Assign failed');
      setAssignModal({ open: false, ngo: null, regions: '', serviceTypes: '' });
      await loadNgos();
    } catch (e) {
      Alert.alert('Error', e.message || 'Assign failed');
    } finally {
      setProcessingId(null);
    }
  };

  const approveNgo = async (ngo) => {
    if (!adminToken || processingId) return;
    setProcessingId(ngo.id);
    try {
      const resp = await fetch(`${API_BASE}/admin/ngos/${ngo.id}/approve`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Approve failed');
      await loadNgos();
    } catch (e) {
      Alert.alert('Error', e.message || 'Approve failed');
    } finally {
      setProcessingId(null);
    }
  };

  const rejectNgo = async (ngo) => {
    if (!adminToken || processingId) return;
    setRejectModal({ open: true, ngo, reason: '' });
  };

  const submitReject = async () => {
    const ngo = rejectModal.ngo;
    if (!ngo) return;
    if (!adminToken || processingId) return;
    setProcessingId(ngo.id);
    try {
      const resp = await fetch(`${API_BASE}/admin/ngos/${ngo.id}/reject`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectModal.reason || '' }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Reject failed');
      setRejectModal({ open: false, ngo: null, reason: '' });
      await loadNgos();
    } catch (e) {
      Alert.alert('Error', e.message || 'Reject failed');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="arrow-left" size={28} color={colors.primary.main} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>NGO Approval</Text>
        <TouchableOpacity onPress={loadNgos}>
          <MaterialCommunityIcons name="refresh" size={24} color={colors.primary.main} />
        </TouchableOpacity>
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity style={[styles.tab, activeTab === 'pending' && styles.activeTab]} onPress={() => setActiveTab('pending')}>
          <Text style={[styles.tabText, activeTab === 'pending' && styles.activeTabText]}>Pending ({counts.pending})</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'approved' && styles.activeTab]} onPress={() => setActiveTab('approved')}>
          <Text style={[styles.tabText, activeTab === 'approved' && styles.activeTabText]}>Approved ({counts.approved})</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'rejected' && styles.activeTab]} onPress={() => setActiveTab('rejected')}>
          <Text style={[styles.tabText, activeTab === 'rejected' && styles.activeTabText]}>Rejected ({counts.rejected})</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.primary.main} />
          <Text style={styles.loadingText}>Loading NGOs...</Text>
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxl }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {list.length ? (
            list.map((ngo) => (
              <View key={ngo.id} style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={styles.avatar}>
                    <MaterialCommunityIcons name="office-building" size={26} color={colors.primary.main} />
                  </View>
                  <View style={{ flex: 1, marginLeft: spacing.md }}>
                    <Text style={styles.name}>{ngo.name || 'NGO'}</Text>
                    <Text style={styles.meta}>{ngo.email || '—'} • {ngo.phone || '—'}</Text>
                    <Text style={styles.meta}>Verified: {ngo.verified ? 'yes' : 'no'} • Access: {ngo.status || '—'}</Text>
                  </View>
                </View>

                <View style={styles.details}>
                  <Text style={styles.detailText}>Registration: {ngo.registrationNumber || '—'}</Text>
                  <Text style={styles.detailText}>Contact person: {ngo.contactPerson || '—'}</Text>
                  <Text style={styles.detailText}>
                    Areas: {Array.isArray(ngo.areasOfOperation) && ngo.areasOfOperation.length ? ngo.areasOfOperation.join(', ') : '—'}
                  </Text>
                  <Text style={styles.detailText}>
                    Services: {Array.isArray(ngo.servicesOffered) && ngo.servicesOffered.length ? ngo.servicesOffered.join(', ') : '—'}
                  </Text>
                </View>

                {activeTab === 'pending' && (
                  <View style={styles.actions}>
                    <TouchableOpacity
                      style={[styles.btn, styles.btnDanger]}
                      onPress={() => rejectNgo(ngo)}
                      disabled={processingId === ngo.id}
                    >
                      <Text style={styles.btnTextDanger}>Reject</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.btn, styles.btnPrimary]}
                      onPress={() => approveNgo(ngo)}
                      disabled={processingId === ngo.id}
                    >
                      {processingId === ngo.id ? (
                        <ActivityIndicator color={colors.neutral.white} size="small" />
                      ) : (
                        <Text style={styles.btnTextPrimary}>Approve</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                )}

                {activeTab === 'approved' && (
                  <View style={styles.actionsWrap}>
                    <TouchableOpacity
                      style={[styles.btnSmall, styles.btnNeutral]}
                      onPress={() => verifyNgo(ngo, !ngo.verified)}
                      disabled={processingId === ngo.id}
                    >
                      <Text style={styles.btnTextNeutral}>{ngo.verified ? 'Unverify' : 'Verify'}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.btnSmall, styles.btnNeutral]}
                      onPress={() => accessNgo(ngo, ngo.status === 'disabled')}
                      disabled={processingId === ngo.id}
                    >
                      <Text style={styles.btnTextNeutral}>{ngo.status === 'disabled' ? 'Enable' : 'Disable'}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.btnSmall, styles.btnNeutral]}
                      onPress={() => openAssign(ngo)}
                      disabled={processingId === ngo.id}
                    >
                      <Text style={styles.btnTextNeutral}>Assign</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))
          ) : (
            <View style={styles.empty}>
              <MaterialCommunityIcons name="check-all" size={60} color={colors.neutral.gray} />
              <Text style={styles.emptyTitle}>No NGOs</Text>
              <Text style={styles.emptySubtitle}>No NGOs found for this tab.</Text>
            </View>
          )}
        </ScrollView>
      )}

      <Modal
        transparent
        visible={rejectModal.open}
        animationType="fade"
        onRequestClose={() => setRejectModal({ open: false, ngo: null, reason: '' })}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Reject NGO</Text>
            <Text style={styles.modalLabel}>Reason</Text>
            <TextInput
              style={[styles.modalInput, { height: 90 }]}
              value={rejectModal.reason}
              onChangeText={(v) => setRejectModal((m) => ({ ...m, reason: v }))}
              placeholder="Enter rejection reason"
              placeholderTextColor={colors.neutral.gray}
              multiline
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.neutral.lightGray }]}
                onPress={() => setRejectModal({ open: false, ngo: null, reason: '' })}
                disabled={processingId === rejectModal.ngo?.id}
              >
                <Text style={[styles.modalBtnText, { color: colors.neutral.black }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.status.error }]}
                onPress={submitReject}
                disabled={processingId === rejectModal.ngo?.id}
              >
                {processingId === rejectModal.ngo?.id ? (
                  <ActivityIndicator color={colors.neutral.white} size="small" />
                ) : (
                  <Text style={[styles.modalBtnText, { color: colors.neutral.white }]}>Reject</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        transparent
        visible={assignModal.open}
        animationType="fade"
        onRequestClose={() => setAssignModal({ open: false, ngo: null, regions: '', serviceTypes: '' })}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Assign Regions/Services</Text>
            <Text style={styles.modalLabel}>Regions (comma separated)</Text>
            <TextInput
              style={styles.modalInput}
              value={assignModal.regions}
              onChangeText={(v) => setAssignModal((m) => ({ ...m, regions: v }))}
              placeholder="e.g., Pune, Mumbai"
              placeholderTextColor={colors.neutral.gray}
            />
            <Text style={[styles.modalLabel, { marginTop: spacing.md }]}>Service types (comma separated)</Text>
            <TextInput
              style={styles.modalInput}
              value={assignModal.serviceTypes}
              onChangeText={(v) => setAssignModal((m) => ({ ...m, serviceTypes: v }))}
              placeholder="e.g., medical, food, emergency"
              placeholderTextColor={colors.neutral.gray}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.neutral.lightGray }]}
                onPress={() => setAssignModal({ open: false, ngo: null, regions: '', serviceTypes: '' })}
                disabled={processingId === assignModal.ngo?.id}
              >
                <Text style={[styles.modalBtnText, { color: colors.neutral.black }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.primary.main }]}
                onPress={submitAssign}
                disabled={processingId === assignModal.ngo?.id}
              >
                {processingId === assignModal.ngo?.id ? (
                  <ActivityIndicator color={colors.neutral.white} size="small" />
                ) : (
                  <Text style={[styles.modalBtnText, { color: colors.neutral.white }]}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.neutral.background },
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
  backButton: { padding: spacing.sm },
  headerTitle: { fontSize: typography.sizes.xl, fontWeight: typography.weights.bold, color: colors.neutral.black },
  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.neutral.white,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.lightGray,
  },
  tab: { flex: 1, paddingVertical: spacing.md, alignItems: 'center', borderBottomWidth: 3, borderBottomColor: 'transparent' },
  activeTab: { borderBottomColor: colors.primary.main },
  tabText: { fontSize: typography.sizes.sm, fontWeight: typography.weights.medium, color: colors.neutral.gray },
  activeTabText: { color: colors.primary.main },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: spacing.md, fontSize: typography.sizes.md, color: colors.neutral.gray },
  card: {
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
  cardTop: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary.light,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { fontSize: typography.sizes.lg, fontWeight: typography.weights.bold, color: colors.neutral.black },
  meta: { marginTop: 2, fontSize: typography.sizes.sm, color: colors.neutral.gray },
  details: { marginTop: spacing.md, gap: spacing.xs },
  detailText: { fontSize: typography.sizes.sm, color: colors.neutral.darkGray },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  btn: { flex: 1, paddingVertical: spacing.sm, borderRadius: 12, alignItems: 'center' },
  actionsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  btnSmall: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: 12, alignItems: 'center' },
  btnPrimary: { backgroundColor: colors.primary.main },
  btnDanger: { backgroundColor: '#FFEBEE', borderWidth: 1, borderColor: colors.status.error },
  btnNeutral: { backgroundColor: colors.neutral.lightGray },
  btnTextPrimary: { color: colors.neutral.white, fontSize: typography.sizes.md, fontWeight: typography.weights.medium },
  btnTextDanger: { color: colors.status.error, fontSize: typography.sizes.md, fontWeight: typography.weights.medium },
  btnTextNeutral: { color: colors.neutral.black, fontSize: typography.sizes.md, fontWeight: typography.weights.medium },
  empty: { alignItems: 'center', paddingVertical: spacing.xxl },
  emptyTitle: { marginTop: spacing.md, fontSize: typography.sizes.lg, fontWeight: typography.weights.bold, color: colors.neutral.black },
  emptySubtitle: { marginTop: spacing.xs, fontSize: typography.sizes.md, color: colors.neutral.gray, textAlign: 'center' },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', padding: spacing.lg },
  modalCard: { backgroundColor: colors.neutral.white, borderRadius: 16, padding: spacing.lg },
  modalTitle: { fontSize: typography.sizes.lg, fontWeight: typography.weights.bold, color: colors.neutral.black },
  modalLabel: { fontSize: typography.sizes.sm, color: colors.neutral.darkGray, marginTop: spacing.md, marginBottom: spacing.xs },
  modalInput: {
    borderWidth: 1,
    borderColor: colors.neutral.lightGray,
    borderRadius: 12,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    color: colors.neutral.black,
    backgroundColor: colors.neutral.white,
  },
  modalActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  modalBtn: { flex: 1, paddingVertical: spacing.sm, borderRadius: 12, alignItems: 'center' },
  modalBtnText: { fontSize: typography.sizes.md, fontWeight: typography.weights.medium },
});

export default NGOApprovalScreen;
