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

const NGOVolunteersScreen = () => {
  const [volunteers, setVolunteers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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
              return (
                <View key={String(v.id)} style={styles.card}>
                  <View style={styles.cardTop}>
                    <View style={[styles.statusDot, { backgroundColor: online ? colors.secondary.green : colors.neutral.gray }]} />
                    <View style={{ flex: 1, marginLeft: spacing.sm }}>
                      <Text style={styles.cardTitle}>{name}</Text>
                      <Text style={styles.cardMeta}>{online ? 'Online' : 'Offline'} • {region}</Text>
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
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  cardTitle: { fontSize: typography.sizes.md, fontWeight: typography.weights.semiBold, color: colors.neutral.black },
  cardMeta: { marginTop: 2, fontSize: typography.sizes.sm, color: colors.neutral.gray },
  idText: { fontSize: typography.sizes.xs, color: colors.neutral.gray },
  skillsText: { marginTop: spacing.md, fontSize: typography.sizes.sm, color: colors.neutral.darkGray },

  empty: { paddingVertical: spacing.xxl, alignItems: 'center' },
  emptyTitle: { marginTop: spacing.md, fontSize: typography.sizes.lg, fontWeight: typography.weights.bold, color: colors.neutral.black },
  emptySubtitle: { marginTop: spacing.xs, fontSize: typography.sizes.md, color: colors.neutral.gray, textAlign: 'center' },
});

export default NGOVolunteersScreen;
