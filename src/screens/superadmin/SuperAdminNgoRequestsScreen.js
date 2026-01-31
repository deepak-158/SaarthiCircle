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
  RefreshControl,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, typography, spacing } from '../../theme';
import { BACKEND_URL as API_BASE } from '../../config/backend';
import { logout } from '../../services/authService';

const SuperAdminNgoRequestsScreen = ({ navigation }) => {
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [requests, setRequests] = useState([]);
  const [processingId, setProcessingId] = useState(null);

  useEffect(() => {
    (async () => {
      const t = await AsyncStorage.getItem('userToken');
      setToken(t);
    })();
  }, []);

  const loadRequests = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const resp = await fetch(`${API_BASE}/superadmin/ngos/requests?limit=500`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (resp.status === 401 || resp.status === 403) {
        Alert.alert('Session Expired', 'Please login again.');
        await logout();
        return;
      }
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Failed to load requests');
      setRequests(Array.isArray(data.requests) ? data.requests : []);
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to load requests');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (token) loadRequests();
  }, [token]);

  const decide = async (ngoId, decision) => {
    if (!token || processingId) return;
    setProcessingId(ngoId);
    try {
      const resp = await fetch(`${API_BASE}/superadmin/ngos/${ngoId}/requests/decide`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision }),
      });
      const data = await resp.json();
      if (resp.status === 401 || resp.status === 403) {
        Alert.alert('Session Expired', 'Please login again.');
        await logout();
        return;
      }
      if (!resp.ok) throw new Error(data.error || 'Failed to decide');
      await loadRequests();
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to decide');
    } finally {
      setProcessingId(null);
    }
  };

  const labelForType = (type) => {
    const t = String(type || '').toLowerCase();
    if (t === 'ngo_approve') return 'Approve NGO';
    if (t === 'ngo_reject') return 'Reject NGO';
    if (t === 'ngo_assign') return 'Assign regions/services';
    if (t === 'ngo_access') return 'Enable/Disable NGO';
    if (t === 'ngo_verify') return 'Verify/Unverify NGO';
    if (t === 'ngo_profile_update_approve') return 'Approve profile update';
    if (t === 'ngo_profile_update_reject') return 'Reject profile update';
    return type || 'Request';
  };

  const items = useMemo(() => requests, [requests]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="arrow-left" size={28} color={colors.primary.main} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>NGO Requests</Text>
        <TouchableOpacity onPress={loadRequests}>
          <MaterialCommunityIcons name="refresh" size={24} color={colors.primary.main} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.primary.main} />
          <Text style={styles.loadingText}>Loading requests...</Text>
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxl }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadRequests(); }} />}
        >
          {items.length ? (
            items.map((r) => (
              <View key={r.id} style={styles.card}>
                <Text style={styles.name}>{r.name || 'NGO'}</Text>
                <Text style={styles.meta}>{r.email || '—'} • {r.phone || '—'}</Text>
                <Text style={styles.meta}>Request: {labelForType(r.request?.type)}</Text>

                <View style={styles.actions}>
                  <TouchableOpacity
                    style={[styles.btn, styles.btnDanger]}
                    onPress={() => decide(r.id, 'reject')}
                    disabled={processingId === r.id}
                  >
                    {processingId === r.id ? (
                      <ActivityIndicator color={colors.status.error} size="small" />
                    ) : (
                      <Text style={styles.btnTextDanger}>Reject</Text>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.btn, styles.btnPrimary]}
                    onPress={() => decide(r.id, 'approve')}
                    disabled={processingId === r.id}
                  >
                    {processingId === r.id ? (
                      <ActivityIndicator color={colors.neutral.white} size="small" />
                    ) : (
                      <Text style={styles.btnTextPrimary}>Approve</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.empty}>
              <MaterialCommunityIcons name="check-all" size={60} color={colors.neutral.gray} />
              <Text style={styles.emptyTitle}>No requests</Text>
              <Text style={styles.emptySubtitle}>There are no pending NGO requests.</Text>
            </View>
          )}
        </ScrollView>
      )}
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
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: spacing.md, fontSize: typography.sizes.md, color: colors.neutral.gray },
  card: {
    backgroundColor: colors.neutral.white,
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  name: { fontSize: typography.sizes.lg, fontWeight: typography.weights.bold, color: colors.neutral.black },
  meta: { marginTop: 2, fontSize: typography.sizes.sm, color: colors.neutral.gray },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  btn: { flex: 1, paddingVertical: spacing.sm, borderRadius: 12, alignItems: 'center' },
  btnPrimary: { backgroundColor: colors.primary.main },
  btnDanger: { backgroundColor: '#FFEBEE', borderWidth: 1, borderColor: colors.status.error },
  btnTextPrimary: { color: colors.neutral.white, fontSize: typography.sizes.md, fontWeight: typography.weights.medium },
  btnTextDanger: { color: colors.status.error, fontSize: typography.sizes.md, fontWeight: typography.weights.medium },
  empty: { alignItems: 'center', paddingVertical: spacing.xxl },
  emptyTitle: { marginTop: spacing.md, fontSize: typography.sizes.lg, fontWeight: typography.weights.bold, color: colors.neutral.black },
  emptySubtitle: { marginTop: spacing.xs, fontSize: typography.sizes.md, color: colors.neutral.gray, textAlign: 'center' },
});

export default SuperAdminNgoRequestsScreen;
