import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Pressable,
  Modal,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, spacing, typography } from '../../theme';
import { BACKEND_URL as API_BASE } from '../../config/backend';
import { getSocket, identify } from '../../services/socketService';

const NGOVolunteersScreen = () => {
  const [volunteers, setVolunteers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [addForm, setAddForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    city: '',
    address: '',
    gender: 'male',
    skills: '',
    why_volunteer: '',
  });

  const sorted = useMemo(() => {
    const list = Array.isArray(volunteers) ? volunteers : [];
    return list.slice().sort((a, b) => {
      const ao = a?.is_online === true ? 1 : 0;
      const bo = b?.is_online === true ? 1 : 0;
      if (ao !== bo) return bo - ao;
      const an = String(a?.name || a?.full_name || '').toLowerCase();
      const bn = String(b?.name || b?.full_name || '').toLowerCase();
      return an < bn ? -1 : an > bn ? 1 : 0;
    });
  }, [volunteers]);

  const loadVolunteers = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      const resp = await fetch(`${API_BASE}/ngo/volunteers?limit=500`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || 'Failed to load volunteers');
      setVolunteers(Array.isArray(data?.volunteers) ? data.volunteers : []);
    } catch {
      setVolunteers([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const openAddVolunteer = () => {
    setAddForm({
      full_name: '',
      email: '',
      phone: '',
      city: '',
      address: '',
      gender: 'male',
      skills: '',
      why_volunteer: '',
    });
    setAddOpen(true);
  };

  const submitAddVolunteer = async () => {
    if (adding) return;
    const email = String(addForm.email || '').trim().toLowerCase();
    const fullName = String(addForm.full_name || '').trim();
    if (!fullName) {
      if (Platform.OS === 'web') window.alert('Please enter full name');
      else Alert.alert('Required', 'Please enter full name');
      return;
    }
    if (!email) {
      if (Platform.OS === 'web') window.alert('Please enter email');
      else Alert.alert('Required', 'Please enter email');
      return;
    }
    setAdding(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        if (Platform.OS === 'web') window.alert('Session expired. Please login again.');
        else Alert.alert('Session expired', 'Please login again.');
        return;
      }
      const payload = {
        full_name: fullName,
        email,
        phone: String(addForm.phone || '').trim() || undefined,
        city: String(addForm.city || '').trim() || undefined,
        address: String(addForm.address || '').trim() || undefined,
        gender: addForm.gender,
        skills: String(addForm.skills || '')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        why_volunteer: String(addForm.why_volunteer || '').trim() || undefined,
      };

      const resp = await fetch(`${API_BASE}/ngo/volunteers/add`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const raw = await resp.text();
      let data = null;
      try {
        data = raw ? JSON.parse(raw) : null;
      } catch {
        data = null;
      }
      if (!resp.ok) {
        const msg = data?.error || data?.message || raw || `Failed to add volunteer (HTTP ${resp.status})`;
        throw new Error(msg);
      }

      setAddOpen(false);
      await loadVolunteers();
      if (Platform.OS === 'web') window.alert('Volunteer has been added and is pending admin approval.');
      else Alert.alert('Added', 'Volunteer has been added and is pending admin approval.');
    } catch (e) {
      const msg = e?.message || 'Failed to add volunteer';
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Error', msg);
    } finally {
      setAdding(false);
    }
  };

  useEffect(() => {
    loadVolunteers();
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
          loadVolunteers();
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
    loadVolunteers();
  };

  return (
    <SafeAreaView style={styles.container}>
      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.primary.main} />
          <Text style={styles.loadingText}>Loading volunteers...</Text>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <View style={styles.topActionsRow}>
            <Pressable
              style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.85 }]}
              onPress={openAddVolunteer}
              hitSlop={12}
            >
              <MaterialCommunityIcons name="account-plus" size={18} color={colors.neutral.white} />
              <Text style={styles.addBtnText}>Add Volunteer</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.refreshBtn, pressed && { opacity: 0.85 }]}
              onPress={onRefresh}
              hitSlop={12}
            >
              <MaterialCommunityIcons name="refresh" size={18} color={colors.primary.main} />
              <Text style={styles.refreshBtnText}>Refresh</Text>
            </Pressable>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          >
            {sorted.length ? (
              sorted.map((v) => {
              const name = v?.name || v?.full_name || 'Volunteer';
              const region = v?.region || v?.city || v?.area || '—';
              const online = v?.is_online === true;
              const skills = Array.isArray(v?.skills) ? v.skills : Array.isArray(v?.service_types) ? v.service_types : [];
              const role = String(v?.role || '').toLowerCase();
              const approved = v?.is_approved === true || role === 'volunteer';
              return (
                <View key={String(v.id)} style={styles.card}>
                  <View style={styles.cardTop}>
                    <View style={[styles.statusDot, { backgroundColor: online ? colors.secondary.green : colors.neutral.gray }]} />
                    <View style={{ flex: 1, marginLeft: spacing.sm }}>
                      <Text style={styles.cardTitle}>{name}</Text>
                      <Text style={styles.cardMeta}>
                        {online ? 'Online' : 'Offline'} • {region} • {approved ? 'Approved' : 'Pending'}
                      </Text>
                    </View>
                    <Text style={styles.idText} numberOfLines={1}>ID: {String(v.id).slice(0, 8)}...</Text>
                  </View>

                  {skills.length ? (
                    <Text style={styles.skillsText} numberOfLines={2}>Skills: {skills.join(', ')}</Text>
                  ) : (
                    <Text style={styles.skillsText} numberOfLines={2}>Skills: —</Text>
                  )}
                </View>
              );
              })
            ) : (
              <View style={styles.empty}>
                <MaterialCommunityIcons name="account-group" size={64} color={colors.neutral.gray} />
                <Text style={styles.emptyTitle}>No volunteers</Text>
                <Text style={styles.emptySubtitle}>No volunteers found for your regions.</Text>
              </View>
            )}
          </ScrollView>
        </View>
      )}

      <Modal
        visible={addOpen}
        transparent
        animationType="fade"
        presentationStyle="overFullScreen"
        statusBarTranslucent
        onRequestClose={() => setAddOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Volunteer</Text>
              <TouchableOpacity onPress={() => setAddOpen(false)}>
                <MaterialCommunityIcons name="close" size={22} color={colors.neutral.black} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 420 }}>
              <Text style={styles.inputLabel}>Full Name *</Text>
              <TextInput
                value={addForm.full_name}
                onChangeText={(t) => setAddForm((p) => ({ ...p, full_name: t }))}
                style={styles.input}
                placeholder="e.g. Rohan Sharma"
              />

              <Text style={styles.inputLabel}>Email *</Text>
              <TextInput
                value={addForm.email}
                onChangeText={(t) => setAddForm((p) => ({ ...p, email: t }))}
                style={styles.input}
                placeholder="e.g. rohan@example.com"
                autoCapitalize="none"
                keyboardType="email-address"
              />

              <Text style={styles.inputLabel}>Phone</Text>
              <TextInput
                value={addForm.phone}
                onChangeText={(t) => setAddForm((p) => ({ ...p, phone: t }))}
                style={styles.input}
                placeholder="e.g. 9876543210"
                keyboardType="phone-pad"
              />

              <Text style={styles.inputLabel}>City / Region</Text>
              <TextInput
                value={addForm.city}
                onChangeText={(t) => setAddForm((p) => ({ ...p, city: t }))}
                style={styles.input}
                placeholder="e.g. Pune"
              />

              <Text style={styles.inputLabel}>Address</Text>
              <TextInput
                value={addForm.address}
                onChangeText={(t) => setAddForm((p) => ({ ...p, address: t }))}
                style={styles.input}
                placeholder="Optional"
              />

              <Text style={styles.inputLabel}>Gender</Text>
              <View style={styles.genderRow}>
                {['male', 'female', 'other'].map((g) => {
                  const selected = addForm.gender === g;
                  return (
                    <TouchableOpacity
                      key={g}
                      style={[styles.genderChip, selected && styles.genderChipActive]}
                      onPress={() => setAddForm((p) => ({ ...p, gender: g }))}
                    >
                      <Text style={[styles.genderChipText, selected && styles.genderChipTextActive]}>{g}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.inputLabel}>Skills (comma separated)</Text>
              <TextInput
                value={addForm.skills}
                onChangeText={(t) => setAddForm((p) => ({ ...p, skills: t }))}
                style={styles.input}
                placeholder="e.g. First aid, Counselling"
              />

              <Text style={styles.inputLabel}>Why volunteer</Text>
              <TextInput
                value={addForm.why_volunteer}
                onChangeText={(t) => setAddForm((p) => ({ ...p, why_volunteer: t }))}
                style={[styles.input, { height: 90, textAlignVertical: 'top' }]}
                placeholder="Optional"
                multiline
              />
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setAddOpen(false)} disabled={adding}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={submitAddVolunteer} disabled={adding}>
                {adding ? (
                  <ActivityIndicator size="small" color={colors.neutral.white} />
                ) : (
                  <Text style={styles.saveBtnText}>Add</Text>
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

  topActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  addBtn: {
    flex: 1,
    backgroundColor: colors.primary.main,
    paddingVertical: spacing.sm,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  addBtnText: { color: colors.neutral.white, fontSize: typography.sizes.sm, fontWeight: typography.weights.semiBold },
  refreshBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 12,
    backgroundColor: colors.neutral.white,
    borderWidth: 1,
    borderColor: colors.neutral.lightGray,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  refreshBtnText: { color: colors.primary.main, fontSize: typography.sizes.sm, fontWeight: typography.weights.semiBold },

  card: {
    backgroundColor: colors.neutral.white,
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.neutral.lightGray,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center' },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  cardTitle: { fontSize: typography.sizes.md, fontWeight: typography.weights.semiBold, color: colors.neutral.black },
  cardMeta: { marginTop: 2, fontSize: typography.sizes.sm, color: colors.neutral.gray },
  idText: { fontSize: typography.sizes.xs, color: colors.neutral.gray },
  skillsText: { marginTop: spacing.md, fontSize: typography.sizes.sm, color: colors.neutral.darkGray },

  empty: { paddingVertical: spacing.xxl, alignItems: 'center' },
  emptyTitle: { marginTop: spacing.md, fontSize: typography.sizes.lg, fontWeight: typography.weights.bold, color: colors.neutral.black },
  emptySubtitle: { marginTop: spacing.xs, fontSize: typography.sizes.md, color: colors.neutral.gray, textAlign: 'center' },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    backgroundColor: colors.neutral.white,
    borderRadius: 16,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.neutral.lightGray,
  },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  modalTitle: { fontSize: typography.sizes.lg, fontWeight: typography.weights.bold, color: colors.neutral.black },

  inputLabel: { marginTop: spacing.sm, fontSize: typography.sizes.sm, color: colors.neutral.darkGray, fontWeight: typography.weights.semiBold },
  input: {
    marginTop: 6,
    backgroundColor: colors.neutral.white,
    borderWidth: 1,
    borderColor: colors.neutral.lightGray,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: typography.sizes.md,
    color: colors.neutral.black,
  },
  genderRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm, marginBottom: spacing.sm },
  genderChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.neutral.lightGray,
    backgroundColor: colors.neutral.white,
  },
  genderChipActive: { backgroundColor: colors.primary.main + '15', borderColor: colors.primary.main },
  genderChipText: { fontSize: typography.sizes.sm, color: colors.neutral.darkGray, fontWeight: typography.weights.semiBold },
  genderChipTextActive: { color: colors.primary.main },

  modalActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  cancelBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.neutral.lightGray,
  },
  cancelBtnText: { color: colors.neutral.black, fontSize: typography.sizes.md, fontWeight: typography.weights.semiBold },
  saveBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary.main,
  },
  saveBtnText: { color: colors.neutral.white, fontSize: typography.sizes.md, fontWeight: typography.weights.semiBold },
});

export default NGOVolunteersScreen;
