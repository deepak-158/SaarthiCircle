import React, { useEffect, useState } from 'react';
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

const SuperAdminEscalationsScreen = ({ navigation }) => {
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState({ helpRequests: [], sosAlerts: [] });

  useEffect(() => {
    (async () => {
      const t = await AsyncStorage.getItem('userToken');
      setToken(t);
    })();
  }, []);

  const load = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const resp = await fetch(`${API_BASE}/superadmin/escalations?limit=200`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (resp.status === 401 || resp.status === 403) {
        Alert.alert('Session Expired', 'Please login again.');
        await logout();
        return;
      }
      const json = await resp.json();
      if (!resp.ok) throw new Error(json.error || 'Failed to load');
      setData({
        helpRequests: Array.isArray(json.helpRequests) ? json.helpRequests : [],
        sosAlerts: Array.isArray(json.sosAlerts) ? json.sosAlerts : [],
      });
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to load');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (token) load();
  }, [token]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="arrow-left" size={28} color={colors.primary.main} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Escalations</Text>
        <TouchableOpacity onPress={load}>
          <MaterialCommunityIcons name="refresh" size={24} color={colors.primary.main} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.primary.main} />
          <Text style={styles.loadingText}>Loading escalations...</Text>
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxl }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
        >
          <Text style={styles.sectionTitle}>Help Requests (Escalated)</Text>
          {(data.helpRequests || []).length ? (
            data.helpRequests.map((r) => (
              <View key={r.id} style={styles.card}>
                <Text style={styles.meta}>Request #{String(r.id).slice(0, 8)}</Text>
                <Text style={styles.desc}>{r.description || '—'}</Text>
                <Text style={styles.meta}>Priority: {r.priority || '—'} • Created: {r.created_at || '—'}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>No escalated help requests.</Text>
          )}

          <Text style={[styles.sectionTitle, { marginTop: spacing.lg }]}>SOS Alerts (Active)</Text>
          {(data.sosAlerts || []).length ? (
            data.sosAlerts.map((s) => (
              <View key={s.id} style={styles.card}>
                <Text style={styles.meta}>SOS #{String(s.id).slice(0, 8)}</Text>
                <Text style={styles.desc}>{s.message || s.description || 'SOS alert triggered'}</Text>
                <Text style={styles.meta}>Status: {s.status || '—'} • Created: {s.created_at || '—'}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>No active SOS alerts.</Text>
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
  sectionTitle: { fontSize: typography.sizes.lg, fontWeight: typography.weights.semiBold, color: colors.neutral.black, marginBottom: spacing.md },
  card: { backgroundColor: colors.neutral.white, borderRadius: 16, padding: spacing.lg, marginBottom: spacing.md },
  meta: { fontSize: typography.sizes.sm, color: colors.neutral.gray },
  desc: { marginTop: spacing.xs, fontSize: typography.sizes.md, color: colors.neutral.black },
  emptyText: { fontSize: typography.sizes.sm, color: colors.neutral.gray, marginBottom: spacing.md },
});

export default SuperAdminEscalationsScreen;
