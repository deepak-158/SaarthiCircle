import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  TextInput,
  RefreshControl,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, typography, spacing } from '../../theme';
import { BACKEND_URL as API_BASE } from '../../config/backend';
import { logout } from '../../services/authService';

const SuperAdminAdminsScreen = ({ navigation }) => {
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [admins, setAdmins] = useState([]);
  const [q, setQ] = useState('');

  const [createForm, setCreateForm] = useState({ email: '', phone: '', name: '' });
  const [creating, setCreating] = useState(false);
  const [processingId, setProcessingId] = useState(null);

  useEffect(() => {
    (async () => {
      const t = await AsyncStorage.getItem('userToken');
      setToken(t);
    })();
  }, []);

  const loadAdmins = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const resp = await fetch(`${API_BASE}/superadmin/admins?q=${encodeURIComponent(q)}&limit=500`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (resp.status === 401 || resp.status === 403) {
        Alert.alert('Session Expired', 'Please login again.');
        await logout();
        return;
      }
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Failed to load admins');
      setAdmins(Array.isArray(data.admins) ? data.admins : []);
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to load admins');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (token) loadAdmins();
  }, [token]);

  const filtered = useMemo(() => {
    const qNorm = String(q || '').trim().toLowerCase();
    if (!qNorm) return admins;
    return admins.filter((a) => `${a.name || ''} ${a.email || ''} ${a.phone || ''}`.toLowerCase().includes(qNorm));
  }, [admins, q]);

  const createAdmin = async () => {
    if (!token || creating) return;
    const email = String(createForm.email || '').trim();
    const phoneRaw = String(createForm.phone || '').trim();
    if (!email || !phoneRaw) {
      Alert.alert('Required', 'Email and phone are required');
      return;
    }
    const phone = phoneRaw.startsWith('+') ? phoneRaw : `+91${phoneRaw.replace(/\D/g, '')}`;

    setCreating(true);
    try {
      const resp = await fetch(`${API_BASE}/superadmin/admins`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, phone, name: createForm.name || '' }),
      });
      const data = await resp.json();
      if (resp.status === 401 || resp.status === 403) {
        Alert.alert('Session Expired', 'Please login again.');
        await logout();
        return;
      }
      if (!resp.ok) throw new Error(data.error || 'Failed to create admin');
      setCreateForm({ email: '', phone: '', name: '' });
      await loadAdmins();
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to create admin');
    } finally {
      setCreating(false);
    }
  };

  const toggleAdmin = async (admin) => {
    if (!token || processingId) return;
    setProcessingId(admin.id);
    try {
      const deactivated = admin.status !== 'disabled';
      const resp = await fetch(`${API_BASE}/superadmin/admins/${admin.id}/deactivate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ deactivated }),
      });
      const data = await resp.json();
      if (resp.status === 401 || resp.status === 403) {
        Alert.alert('Session Expired', 'Please login again.');
        await logout();
        return;
      }
      if (!resp.ok) throw new Error(data.error || 'Failed to update admin');
      await loadAdmins();
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to update admin');
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
        <Text style={styles.headerTitle}>Admins</Text>
        <TouchableOpacity onPress={loadAdmins}>
          <MaterialCommunityIcons name="refresh" size={24} color={colors.primary.main} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxl }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadAdmins(); }} />}
      >
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Create / Promote Admin</Text>
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={colors.neutral.gray}
            value={createForm.email}
            onChangeText={(v) => setCreateForm((s) => ({ ...s, email: v }))}
          />
          <TextInput
            style={styles.input}
            placeholder="Phone (10 digits or +91...)"
            placeholderTextColor={colors.neutral.gray}
            value={createForm.phone}
            onChangeText={(v) => setCreateForm((s) => ({ ...s, phone: v }))}
          />
          <TextInput
            style={styles.input}
            placeholder="Name (optional)"
            placeholderTextColor={colors.neutral.gray}
            value={createForm.name}
            onChangeText={(v) => setCreateForm((s) => ({ ...s, name: v }))}
          />
          <TouchableOpacity style={styles.primaryBtn} onPress={createAdmin} disabled={creating}>
            {creating ? <ActivityIndicator color={colors.neutral.white} /> : <Text style={styles.primaryBtnText}>Create</Text>}
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Search</Text>
          <TextInput
            style={styles.input}
            placeholder="Search by name/email/phone"
            placeholderTextColor={colors.neutral.gray}
            value={q}
            onChangeText={setQ}
            onSubmitEditing={loadAdmins}
          />
        </View>

        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color={colors.primary.main} />
            <Text style={styles.loadingText}>Loading admins...</Text>
          </View>
        ) : (
          filtered.map((a) => (
            <View key={a.id} style={styles.listCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{a.name || 'Admin'}</Text>
                <Text style={styles.meta}>{a.email || '—'} • {a.phone || '—'}</Text>
                <Text style={styles.meta}>Status: {a.status || '—'}</Text>
              </View>
              <TouchableOpacity
                style={[styles.smallBtn, a.status === 'disabled' ? styles.btnGreen : styles.btnRed]}
                onPress={() => toggleAdmin(a)}
                disabled={processingId === a.id}
              >
                {processingId === a.id ? (
                  <ActivityIndicator color={colors.neutral.white} size="small" />
                ) : (
                  <Text style={styles.smallBtnText}>{a.status === 'disabled' ? 'Activate' : 'Deactivate'}</Text>
                )}
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>
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
  card: { backgroundColor: colors.neutral.white, borderRadius: 16, padding: spacing.lg, marginBottom: spacing.md },
  cardTitle: { fontSize: typography.sizes.md, fontWeight: typography.weights.bold, color: colors.neutral.black, marginBottom: spacing.sm },
  input: {
    borderWidth: 1,
    borderColor: colors.neutral.lightGray,
    borderRadius: 12,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    color: colors.neutral.black,
    backgroundColor: colors.neutral.white,
    marginBottom: spacing.sm,
  },
  primaryBtn: { backgroundColor: colors.primary.main, borderRadius: 12, paddingVertical: spacing.sm, alignItems: 'center' },
  primaryBtnText: { color: colors.neutral.white, fontSize: typography.sizes.md, fontWeight: typography.weights.medium },
  loading: { alignItems: 'center', paddingVertical: spacing.xl },
  loadingText: { marginTop: spacing.md, fontSize: typography.sizes.md, color: colors.neutral.gray },
  listCard: {
    backgroundColor: colors.neutral.white,
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  name: { fontSize: typography.sizes.lg, fontWeight: typography.weights.bold, color: colors.neutral.black },
  meta: { marginTop: 2, fontSize: typography.sizes.sm, color: colors.neutral.gray },
  smallBtn: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: 12 },
  btnRed: { backgroundColor: colors.status.error },
  btnGreen: { backgroundColor: colors.status.success },
  smallBtnText: { color: colors.neutral.white, fontSize: typography.sizes.sm, fontWeight: typography.weights.medium },
});

export default SuperAdminAdminsScreen;
