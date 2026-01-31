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

const SuperAdminAuditLogsScreen = ({ navigation }) => {
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [logs, setLogs] = useState([]);

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
      const resp = await fetch(`${API_BASE}/superadmin/audit-logs?limit=200`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (resp.status === 401 || resp.status === 403) {
        Alert.alert('Session Expired', 'Please login again.');
        await logout();
        return;
      }
      const json = await resp.json();
      if (!resp.ok) throw new Error(json.error || 'Failed to load');
      setLogs(Array.isArray(json.logs) ? json.logs : []);
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
        <Text style={styles.headerTitle}>Audit Logs</Text>
        <TouchableOpacity onPress={load}>
          <MaterialCommunityIcons name="refresh" size={24} color={colors.primary.main} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.primary.main} />
          <Text style={styles.loadingText}>Loading logs...</Text>
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxl }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
        >
          {(logs || []).length ? (
            logs.map((l) => (
              <View key={l.id || `${l.actor_id}-${l.created_at}`} style={styles.card}>
                <Text style={styles.title}>{l.action || 'action'}</Text>
                <Text style={styles.meta}>Actor: {l.actor_id || '—'}</Text>
                <Text style={styles.meta}>Target: {l.target_type || '—'} • {l.target_id || '—'}</Text>
                <Text style={styles.meta}>At: {l.created_at || '—'}</Text>
              </View>
            ))
          ) : (
            <View style={styles.empty}>
              <MaterialCommunityIcons name="clipboard-text" size={60} color={colors.neutral.gray} />
              <Text style={styles.emptyTitle}>No logs</Text>
              <Text style={styles.emptySubtitle}>No audit logs found.</Text>
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
  card: { backgroundColor: colors.neutral.white, borderRadius: 16, padding: spacing.lg, marginBottom: spacing.md },
  title: { fontSize: typography.sizes.md, fontWeight: typography.weights.bold, color: colors.neutral.black },
  meta: { marginTop: 4, fontSize: typography.sizes.sm, color: colors.neutral.gray },
  empty: { alignItems: 'center', paddingVertical: spacing.xxl },
  emptyTitle: { marginTop: spacing.md, fontSize: typography.sizes.lg, fontWeight: typography.weights.bold, color: colors.neutral.black },
  emptySubtitle: { marginTop: spacing.xs, fontSize: typography.sizes.md, color: colors.neutral.gray, textAlign: 'center' },
});

export default SuperAdminAuditLogsScreen;
