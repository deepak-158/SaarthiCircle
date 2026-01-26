import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, spacing, typography } from '../../theme';
import { BACKEND_URL as API_BASE } from '../../config/backend';
import { getSocket, identify } from '../../services/socketService';

const formatDateTime = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString();
};

const NGOCaseHistoryScreen = () => {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const list = useMemo(() => {
    return Array.isArray(cases) ? cases : [];
  }, [cases]);

  const loadCases = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      const resp = await fetch(`${API_BASE}/ngo/case-history?limit=500`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || 'Failed to load case history');
      setCases(Array.isArray(data?.cases) ? data.cases : []);
    } catch {
      setCases([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadCases();
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
          loadCases();
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
    loadCases();
  };

  return (
    <SafeAreaView style={styles.container}>
      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.primary.main} />
          <Text style={styles.loadingText}>Loading case history...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {list.length ? (
            list.map((c) => {
              const seniorName = c?.senior?.name || c?.senior?.full_name || 'Senior';
              const volunteerName = c?.volunteer?.name || c?.volunteer?.full_name || null;
              const status = String(c?.status || '').toUpperCase();
              const completedAt = c?.completed_at || c?.completedAt;
              const updatedAt = c?.updated_at || c?.updatedAt;
              return (
                <View key={String(c.id)} style={styles.card}>
                  <View style={styles.cardTop}>
                    <View style={styles.cardIcon}>
                      <MaterialCommunityIcons name="clipboard-check" size={22} color={colors.secondary.green} />
                    </View>
                    <View style={{ flex: 1, marginLeft: spacing.md }}>
                      <Text style={styles.cardTitle}>{seniorName}</Text>
                      <Text style={styles.cardMeta}>{status}</Text>
                    </View>
                  </View>

                  <Text style={styles.lineText}>Volunteer: {volunteerName || 'NGO handled'}</Text>
                  <Text style={styles.lineText}>Completed: {formatDateTime(completedAt || updatedAt)}</Text>
                  <Text style={styles.idText} numberOfLines={1}>Case ID: {String(c.id)}</Text>
                </View>
              );
            })
          ) : (
            <View style={styles.empty}>
              <MaterialCommunityIcons name="clipboard-text-clock" size={64} color={colors.neutral.gray} />
              <Text style={styles.emptyTitle}>No history</Text>
              <Text style={styles.emptySubtitle}>Closed cases will appear here.</Text>
            </View>
          )}
        </ScrollView>
      )}
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
    backgroundColor: colors.secondary.green + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: { fontSize: typography.sizes.md, fontWeight: typography.weights.semiBold, color: colors.neutral.black },
  cardMeta: { marginTop: 2, fontSize: typography.sizes.sm, color: colors.neutral.gray },
  lineText: { marginTop: spacing.md, fontSize: typography.sizes.sm, color: colors.neutral.darkGray },
  idText: { marginTop: spacing.sm, fontSize: typography.sizes.xs, color: colors.neutral.gray },

  empty: { paddingVertical: spacing.xxl, alignItems: 'center' },
  emptyTitle: { marginTop: spacing.md, fontSize: typography.sizes.lg, fontWeight: typography.weights.bold, color: colors.neutral.black },
  emptySubtitle: { marginTop: spacing.xs, fontSize: typography.sizes.md, color: colors.neutral.gray, textAlign: 'center' },
});

export default NGOCaseHistoryScreen;
