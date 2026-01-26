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
  Modal,
  TextInput,
  Alert,
  Linking,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, spacing, typography } from '../../theme';
import { BACKEND_URL as API_BASE } from '../../config/backend';
import { getSocket, identify } from '../../services/socketService';

const NGOOpenRequestsScreen = ({ navigation }) => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [processingId, setProcessingId] = useState(null);

  const [assignModal, setAssignModal] = useState({
    open: false,
    request: null,
    volunteerId: '',
    volunteers: [],
    loading: false,
  });
  const [handledModal, setHandledModal] = useState({ open: false, request: null, notes: '' });
  const [rejectModal, setRejectModal] = useState({ open: false, request: null, reason: '' });

  const openRequests = useMemo(() => {
    return (requests || []).filter((r) => {
      const s = String(r?.status || '').toLowerCase();
      return s && s !== 'completed' && s !== 'cancelled';
    });
  }, [requests]);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      const resp = await fetch(`${API_BASE}/ngo/requests?status=escalated&limit=500`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || 'Failed to load requests');
      setRequests(Array.isArray(data?.requests) ? data.requests : []);
    } catch (e) {
      setRequests([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadAvailableVolunteers = async () => {
    const token = await AsyncStorage.getItem('userToken');
    const resp = await fetch(`${API_BASE}/volunteers/available`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await resp.json();
    if (!resp.ok) throw new Error(data?.error || 'Failed to load volunteers');
    return Array.isArray(data?.volunteers) ? data.volunteers : [];
  };

  useEffect(() => {
    loadRequests();
  }, []);

  useEffect(() => {
    let mounted = true;
    let socket;
    let onUpdate;
    (async () => {
      try {
        const profileJson = await AsyncStorage.getItem('userProfile');
        const profile = profileJson ? JSON.parse(profileJson) : null;
        const userId = profile?.id || profile?.uid || profile?.userId;
        if (userId) {
          identify({ userId, role: 'NGO' });
        }

        socket = getSocket();
        onUpdate = (payload) => {
          if (!mounted) return;
          if (payload?.ngoId && userId && String(payload.ngoId) !== String(userId)) return;
          loadRequests();
        };

        socket.off('ngo:update', onUpdate);
        socket.on('ngo:update', onUpdate);
      } catch {
        // ignore
      }
    })();

    return () => {
      mounted = false;
      try {
        if (socket && onUpdate) {
          socket.off('ngo:update', onUpdate);
        }
      } catch {
        // ignore
      }
    };
  }, []);

  const callSenior = async (request) => {
    const phone = request?.senior?.phone || request?.seniorPhone || request?.phone;
    if (!phone) {
      Alert.alert('Missing Phone', 'Senior phone number is not available.');
      return;
    }
    try {
      await Linking.openURL(`tel:${phone}`);
    } catch {
      Alert.alert('Call Failed', 'Could not place call from this device.');
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadRequests();
  };

  const toggleExpanded = (id) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const openAssign = async (request) => {
    setAssignModal({ open: true, request, volunteerId: '', volunteers: [], loading: true });
    try {
      const volunteers = await loadAvailableVolunteers();
      setAssignModal((m) => ({ ...m, volunteers, loading: false }));
    } catch {
      setAssignModal((m) => ({ ...m, volunteers: [], loading: false }));
    }
  };

  const submitAssign = async () => {
    const reqItem = assignModal.request;
    if (!reqItem?.id) return;

    const volunteerId = String(assignModal.volunteerId || '').trim();
    if (!volunteerId) {
      Alert.alert('Missing', 'Please enter a volunteer ID.');
      return;
    }
    if (processingId) return;

    setProcessingId(reqItem.id);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const resp = await fetch(`${API_BASE}/ngo/requests/${reqItem.id}/assign-volunteer`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ volunteerId }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || 'Assign failed');
      setAssignModal({ open: false, request: null, volunteerId: '', volunteers: [], loading: false });
      loadRequests();
    } catch (e) {
      Alert.alert('Error', e.message || 'Assign failed');
    } finally {
      setProcessingId(null);
    }
  };

  const openHandled = (request) => {
    setHandledModal({ open: true, request, notes: '' });
  };

  const submitHandled = async () => {
    const reqItem = handledModal.request;
    if (!reqItem?.id) return;
    if (processingId) return;

    setProcessingId(reqItem.id);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const resp = await fetch(`${API_BASE}/ngo/requests/${reqItem.id}/handled`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: handledModal.notes || '' }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || 'Update failed');
      setHandledModal({ open: false, request: null, notes: '' });
      loadRequests();
    } catch (e) {
      Alert.alert('Error', e.message || 'Update failed');
    } finally {
      setProcessingId(null);
    }
  };

  const openReject = (request) => {
    setRejectModal({ open: true, request, reason: '' });
  };

  const submitReject = async () => {
    const reqItem = rejectModal.request;
    if (!reqItem?.id) return;
    if (processingId) return;
    const reason = String(rejectModal.reason || '').trim();
    if (!reason) {
      Alert.alert('Missing', 'Please enter a reason.');
      return;
    }
    setProcessingId(reqItem.id);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const resp = await fetch(`${API_BASE}/ngo/requests/${reqItem.id}/reject`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || 'Reject failed');
      setRejectModal({ open: false, request: null, reason: '' });
      loadRequests();
    } catch (e) {
      Alert.alert('Error', e.message || 'Reject failed');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.primary.main} />
          <Text style={styles.loadingText}>Loading requests...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {openRequests.length ? (
            openRequests.map((r) => {
              const id = r.id;
              const seniorName = r?.senior?.name || r?.senior_name || 'Senior';
              const category = r?.category || r?.helpType || 'Request';
              const status = String(r?.status || '').toUpperCase();
              const description = r?.description || r?.message || '';
              const isExpanded = expandedId === id;
              const showActions = true;

              return (
                <TouchableOpacity
                  key={String(id)}
                  activeOpacity={0.85}
                  style={styles.card}
                  onPress={() => toggleExpanded(id)}
                >
                  <View style={styles.cardTop}>
                    <View style={styles.cardIcon}>
                      <MaterialCommunityIcons name="hand-heart" size={22} color={colors.primary.main} />
                    </View>
                    <View style={{ flex: 1, marginLeft: spacing.md }}>
                      <Text style={styles.cardTitle}>{seniorName}</Text>
                      <Text style={styles.cardMeta}>{category} • {status}</Text>
                    </View>
                    <MaterialCommunityIcons
                      name={isExpanded ? 'chevron-up' : 'chevron-down'}
                      size={22}
                      color={colors.neutral.gray}
                    />
                  </View>

                  {isExpanded && (
                    <View style={styles.cardBody}>
                      <Text style={styles.cardBodyText}>{description || 'No description provided.'}</Text>

                      {showActions && (
                        <View style={styles.actionsRow}>
                          <TouchableOpacity
                            style={[styles.actionBtn, styles.actionBtnPrimary]}
                            onPress={() => openAssign(r)}
                            disabled={processingId === id}
                          >
                            <Text style={styles.actionBtnTextPrimary}>Assign Volunteer</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.actionBtn, styles.actionBtnNeutral]}
                            onPress={() => callSenior(r)}
                            disabled={processingId === id}
                          >
                            <Text style={styles.actionBtnTextNeutral}>Call Senior</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.actionBtn, styles.actionBtnNeutral, { marginLeft: spacing.sm }]}
                            onPress={() => openHandled(r)}
                            disabled={processingId === id}
                          >
                            <Text style={styles.actionBtnTextNeutral}>Mark Handled</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.actionBtn, styles.actionBtnDanger, { marginLeft: spacing.sm }]}
                            onPress={() => openReject(r)}
                            disabled={processingId === id}
                          >
                            <Text style={styles.actionBtnTextDanger}>Reject</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  )}
                </TouchableOpacity>
              );
            })
          ) : (
            <View style={styles.empty}>
              <MaterialCommunityIcons name="inbox-outline" size={64} color={colors.neutral.gray} />
              <Text style={styles.emptyTitle}>No open requests</Text>
              <Text style={styles.emptySubtitle}>New requests will appear here as they come in.</Text>
            </View>
          )}
        </ScrollView>
      )}

      <Modal
        transparent
        visible={assignModal.open}
        animationType="fade"
        onRequestClose={() => setAssignModal({ open: false, request: null, volunteerId: '', volunteers: [], loading: false })}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Assign Volunteer</Text>

            {assignModal.loading ? (
              <View style={styles.modalLoading}>
                <ActivityIndicator color={colors.primary.main} />
              </View>
            ) : (
              <>
                {!!assignModal.volunteers?.length && (
                  <View style={styles.volunteerList}>
                    {assignModal.volunteers.slice(0, 6).map((v) => (
                      <TouchableOpacity
                        key={String(v.id)}
                        style={styles.volunteerChip}
                        onPress={() => setAssignModal((m) => ({ ...m, volunteerId: String(v.id) }))}
                      >
                        <Text style={styles.volunteerChipText}>{v.name || v.full_name || 'Volunteer'}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                <Text style={styles.modalLabel}>Volunteer ID</Text>
                <TextInput
                  style={styles.modalInput}
                  value={assignModal.volunteerId}
                  onChangeText={(v) => setAssignModal((m) => ({ ...m, volunteerId: v }))}
                  placeholder="Paste volunteerId"
                  placeholderTextColor={colors.neutral.gray}
                  autoCapitalize="none"
                />
              </>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.neutral.lightGray }]}
                onPress={() => setAssignModal({ open: false, request: null, volunteerId: '', volunteers: [], loading: false })}
                disabled={processingId === assignModal.request?.id}
              >
                <Text style={[styles.modalBtnText, { color: colors.neutral.black }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.primary.main }]}
                onPress={submitAssign}
                disabled={processingId === assignModal.request?.id}
              >
                {processingId === assignModal.request?.id ? (
                  <ActivityIndicator color={colors.neutral.white} size="small" />
                ) : (
                  <Text style={[styles.modalBtnText, { color: colors.neutral.white }]}>Assign</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        transparent
        visible={handledModal.open}
        animationType="fade"
        onRequestClose={() => setHandledModal({ open: false, request: null, notes: '' })}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Mark Handled</Text>
            <Text style={styles.modalLabel}>Notes (optional)</Text>
            <TextInput
              style={[styles.modalInput, { height: 90 }]}
              value={handledModal.notes}
              onChangeText={(v) => setHandledModal((m) => ({ ...m, notes: v }))}
              placeholder="Write what was done"
              placeholderTextColor={colors.neutral.gray}
              multiline
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.neutral.lightGray }]}
                onPress={() => setHandledModal({ open: false, request: null, notes: '' })}
                disabled={processingId === handledModal.request?.id}
              >
                <Text style={[styles.modalBtnText, { color: colors.neutral.black }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.primary.main }]}
                onPress={submitHandled}
                disabled={processingId === handledModal.request?.id}
              >
                {processingId === handledModal.request?.id ? (
                  <ActivityIndicator color={colors.neutral.white} size="small" />
                ) : (
                  <Text style={[styles.modalBtnText, { color: colors.neutral.white }]}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        transparent
        visible={rejectModal.open}
        animationType="fade"
        onRequestClose={() => setRejectModal({ open: false, request: null, reason: '' })}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Reject Request</Text>
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
                onPress={() => setRejectModal({ open: false, request: null, reason: '' })}
                disabled={processingId === rejectModal.request?.id}
              >
                <Text style={[styles.modalBtnText, { color: colors.neutral.black }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.status.error }]}
                onPress={submitReject}
                disabled={processingId === rejectModal.request?.id}
              >
                {processingId === rejectModal.request?.id ? (
                  <ActivityIndicator color={colors.neutral.white} size="small" />
                ) : (
                  <Text style={[styles.modalBtnText, { color: colors.neutral.white }]}>Reject</Text>
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
  container: { flex: 1, backgroundColor: colors.neutral.white },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: spacing.md, fontSize: typography.sizes.md, color: colors.neutral.gray },
  scroll: { flex: 1, backgroundColor: colors.neutral.lightGray },
  scrollContent: { padding: spacing.md, paddingBottom: spacing.xxl },
  card: {
    backgroundColor: colors.neutral.white,
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.neutral.lightGray,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center' },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary.light,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: { fontSize: typography.sizes.md, fontWeight: typography.weights.semiBold, color: colors.neutral.black },
  cardMeta: { marginTop: 2, fontSize: typography.sizes.sm, color: colors.neutral.gray },
  cardBody: { marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.neutral.lightGray },
  cardBodyText: { fontSize: typography.sizes.sm, color: colors.neutral.darkGray },
  actionsRow: { flexDirection: 'row', marginTop: spacing.md },
  actionBtn: { flex: 1, paddingVertical: spacing.sm, borderRadius: 10, alignItems: 'center' },
  actionBtnPrimary: { backgroundColor: colors.primary.main, marginRight: spacing.sm },
  actionBtnNeutral: { backgroundColor: colors.neutral.lightGray },
  actionBtnDanger: { backgroundColor: '#FFEBEE', borderWidth: 1, borderColor: colors.status.error },
  actionBtnTextPrimary: { color: colors.neutral.white, fontWeight: typography.weights.semiBold },
  actionBtnTextNeutral: { color: colors.neutral.black, fontWeight: typography.weights.semiBold },
  actionBtnTextDanger: { color: colors.status.error, fontWeight: typography.weights.semiBold },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: spacing.lg },
  modalCard: { backgroundColor: colors.neutral.white, borderRadius: 16, padding: spacing.lg },
  modalTitle: { fontSize: typography.sizes.lg, fontWeight: typography.weights.bold, color: colors.neutral.black },
  modalLabel: { marginTop: spacing.md, fontSize: typography.sizes.sm, color: colors.neutral.gray },
  modalInput: {
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.neutral.lightGray,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.neutral.black,
  },
  modalActions: { flexDirection: 'row', marginTop: spacing.lg },
  modalBtn: { flex: 1, paddingVertical: spacing.sm, borderRadius: 12, alignItems: 'center' },
  modalBtnText: { fontSize: typography.sizes.md, fontWeight: typography.weights.semiBold },
  modalLoading: { paddingVertical: spacing.lg, alignItems: 'center' },

  volunteerList: { flexDirection: 'row', flexWrap: 'wrap', marginTop: spacing.md },
  volunteerChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    backgroundColor: colors.primary.light,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  volunteerChipText: { color: colors.primary.main, fontWeight: typography.weights.semiBold },
  empty: { paddingVertical: spacing.xxl, alignItems: 'center' },
  emptyTitle: { marginTop: spacing.md, fontSize: typography.sizes.lg, fontWeight: typography.weights.bold, color: colors.neutral.black },
  emptySubtitle: { marginTop: spacing.xs, fontSize: typography.sizes.md, color: colors.neutral.gray, textAlign: 'center' },
});

export default NGOOpenRequestsScreen;
