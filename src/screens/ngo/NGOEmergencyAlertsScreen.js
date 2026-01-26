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

const NGOEmergencyAlertsScreen = () => {
  const [emergencies, setEmergencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState(null);
  const [closeModal, setCloseModal] = useState({ open: false, emergency: null, notes: '' });

  const activeEmergencies = useMemo(() => {
    return (emergencies || []).filter((e) => String(e?.status || '').toLowerCase() === 'active');
  }, [emergencies]);

  const loadEmergencies = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      const resp = await fetch(`${API_BASE}/ngo/emergencies?status=active&limit=500`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || 'Failed to load emergencies');
      setEmergencies(Array.isArray(data?.emergencies) ? data.emergencies : []);
    } catch {
      setEmergencies([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadEmergencies();
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
        if (userId) identify({ userId, role: 'NGO' });

        socket = getSocket();
        onUpdate = (payload) => {
          if (!mounted) return;
          if (payload?.ngoId && userId && String(payload.ngoId) !== String(userId)) return;
          loadEmergencies();
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

  const onRefresh = () => {
    setRefreshing(true);
    loadEmergencies();
  };

  const callSenior = async (emergency) => {
    const phone = emergency?.senior?.phone || emergency?.seniorPhone || emergency?.phone;
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

  const openClose = (emergency) => {
    setCloseModal({ open: true, emergency, notes: '' });
  };

  const submitClose = async () => {
    const emergency = closeModal.emergency;
    if (!emergency?.id || processingId) return;
    setProcessingId(emergency.id);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const resp = await fetch(`${API_BASE}/ngo/emergencies/${emergency.id}/close`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: closeModal.notes || '' }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || 'Close failed');
      setCloseModal({ open: false, emergency: null, notes: '' });
      loadEmergencies();
    } catch (e) {
      Alert.alert('Error', e.message || 'Close failed');
    } finally {
      setProcessingId(null);
    }
  };

  const getEmergencyTitle = (e) => {
    const type = String(e?.type || e?.category || 'SOS').toUpperCase();
    return type === 'PANIC' || type === 'SOS' ? 'SOS Alert' : type;
  };

  return (
    <SafeAreaView style={styles.container}>
      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.primary.main} />
          <Text style={styles.loadingText}>Loading emergencies...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {activeEmergencies.length ? (
            activeEmergencies.map((e) => {
              const seniorName = e?.senior?.name || e?.senior?.full_name || 'Senior';
              const message = e?.message || e?.description || 'SOS alert triggered';
              return (
                <View key={String(e.id)} style={styles.card}>
                  <View style={styles.cardTop}>
                    <View style={styles.cardIcon}>
                      <MaterialCommunityIcons name="alert-octagon" size={22} color={colors.status?.error || colors.accent?.red || colors.primary.main} />
                    </View>
                    <View style={{ flex: 1, marginLeft: spacing.md }}>
                      <Text style={styles.cardTitle}>{getEmergencyTitle(e)}</Text>
                      <Text style={styles.cardMeta}>{seniorName}</Text>
                    </View>
                    <View style={styles.activePill}>
                      <Text style={styles.activePillText}>ACTIVE</Text>
                    </View>
                  </View>

                  <Text style={styles.cardBodyText}>{message}</Text>

                  <View style={styles.actionsRow}>
                    <TouchableOpacity style={[styles.actionBtn, styles.actionBtnNeutral]} onPress={() => callSenior(e)}>
                      <Text style={styles.actionBtnTextNeutral}>Call Senior</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.actionBtnPrimary]}
                      onPress={() => openClose(e)}
                      disabled={processingId === e.id}
                    >
                      <Text style={styles.actionBtnTextPrimary}>Close</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          ) : (
            <View style={styles.empty}>
              <MaterialCommunityIcons name="check-circle" size={64} color={colors.secondary.green} />
              <Text style={styles.emptyTitle}>All clear</Text>
              <Text style={styles.emptySubtitle}>No active emergencies right now.</Text>
            </View>
          )}
        </ScrollView>
      )}

      <Modal
        transparent
        visible={closeModal.open}
        animationType="fade"
        onRequestClose={() => setCloseModal({ open: false, emergency: null, notes: '' })}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Close Emergency</Text>
            <Text style={styles.modalLabel}>Notes</Text>
            <TextInput
              style={[styles.modalInput, { height: 90 }]}
              value={closeModal.notes}
              onChangeText={(v) => setCloseModal((m) => ({ ...m, notes: v }))}
              placeholder="What action was taken?"
              placeholderTextColor={colors.neutral.gray}
              multiline
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.neutral.lightGray }]}
                onPress={() => setCloseModal({ open: false, emergency: null, notes: '' })}
                disabled={processingId === closeModal.emergency?.id}
              >
                <Text style={[styles.modalBtnText, { color: colors.neutral.black }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.primary.main }]}
                onPress={submitClose}
                disabled={processingId === closeModal.emergency?.id}
              >
                {processingId === closeModal.emergency?.id ? (
                  <ActivityIndicator color={colors.neutral.white} size="small" />
                ) : (
                  <Text style={[styles.modalBtnText, { color: colors.neutral.white }]}>Close</Text>
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
    backgroundColor: '#FFEBEE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: { fontSize: typography.sizes.md, fontWeight: typography.weights.bold, color: colors.neutral.black },
  cardMeta: { marginTop: 2, fontSize: typography.sizes.sm, color: colors.neutral.gray },
  activePill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#FFEBEE',
  },
  activePillText: { fontSize: typography.sizes.xs, fontWeight: typography.weights.bold, color: colors.status?.error || '#D32F2F' },
  cardBodyText: { marginTop: spacing.md, fontSize: typography.sizes.sm, color: colors.neutral.darkGray },

  actionsRow: { flexDirection: 'row', marginTop: spacing.md },
  actionBtn: { flex: 1, paddingVertical: spacing.sm, borderRadius: 10, alignItems: 'center' },
  actionBtnNeutral: { backgroundColor: colors.neutral.lightGray, marginRight: spacing.sm },
  actionBtnPrimary: { backgroundColor: colors.primary.main },
  actionBtnTextNeutral: { color: colors.neutral.black, fontWeight: typography.weights.semiBold },
  actionBtnTextPrimary: { color: colors.neutral.white, fontWeight: typography.weights.semiBold },

  empty: { paddingVertical: spacing.xxl, alignItems: 'center' },
  emptyTitle: { marginTop: spacing.md, fontSize: typography.sizes.lg, fontWeight: typography.weights.bold, color: colors.secondary.green },
  emptySubtitle: { marginTop: spacing.xs, fontSize: typography.sizes.md, color: colors.neutral.gray, textAlign: 'center' },

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
});

export default NGOEmergencyAlertsScreen;
