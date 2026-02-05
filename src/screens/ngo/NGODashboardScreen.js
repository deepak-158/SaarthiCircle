import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../../theme';
import { BACKEND_URL as API_BASE } from '../../config/backend';
import { getSocket, identify } from '../../services/socketService';

const NGODashboardScreen = () => {
  const { t } = useTranslation();
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      const resp = await fetch(`${API_BASE}/ngo/dashboard`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || 'Failed to load dashboard');
      setOverview(data?.overview || null);
    } catch {
      setOverview(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboard();
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
          loadDashboard();
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
    loadDashboard();
  };

  return (
    <SafeAreaView style={styles.container}>
      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.primary.main} />
          <Text style={styles.loadingText}>Loading dashboard...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          <View style={styles.grid}>
            <View style={styles.card}>
              <View style={styles.cardIcon}>
                <MaterialCommunityIcons name="alert-circle-outline" size={22} color={colors.accent.orange} />
              </View>
              <Text style={styles.cardLabel}>{t('ngo.escalated')}</Text>
              <Text style={styles.cardValue}>{overview?.escalatedActive ?? 0}</Text>
            </View>

            <View style={styles.card}>
              <View style={styles.cardIcon}>
                <MaterialCommunityIcons name="alarm-light" size={22} color={colors.accent.red} />
              </View>
              <Text style={styles.cardLabel}>{t('ngo.emergencies')}</Text>
              <Text style={styles.cardValue}>{overview?.emergenciesActive ?? 0}</Text>
            </View>

            <View style={styles.card}>
              <View style={styles.cardIcon}>
                <MaterialCommunityIcons name="account-group" size={22} color={colors.secondary.green} />
              </View>
              <Text style={styles.cardLabel}>{t('ngo.volunteers')}</Text>
              <Text style={styles.cardValue}>{overview?.availableVolunteers ?? 0}</Text>
            </View>

            <View style={styles.card}>
              <View style={styles.cardIcon}>
                <MaterialCommunityIcons name="map-marker-radius" size={22} color={colors.primary.main} />
              </View>
              <Text style={styles.cardLabel}>{t('ngo.regions')}</Text>
              <Text style={styles.cardValue}>{Array.isArray(overview?.regions) ? overview.regions.length : 0}</Text>
            </View>
          </View>

          <View style={styles.regionsCard}>
            <Text style={styles.regionsTitle}>{t('ngo.regionsCovered')}</Text>
            <Text style={styles.regionsValue}>
              {Array.isArray(overview?.regions) && overview.regions.length ? overview.regions.join(', ') : t('ngo.noRegions')}
            </Text>
          </View>
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
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  card: {
    width: '48%',
    backgroundColor: colors.neutral.white,
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.neutral.lightGray,
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.neutral.lightGray,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardLabel: { marginTop: spacing.sm, fontSize: typography.sizes.sm, color: colors.neutral.gray },
  cardValue: { marginTop: 4, fontSize: typography.sizes.xl, fontWeight: typography.weights.bold, color: colors.neutral.black },
  regionsCard: {
    backgroundColor: colors.neutral.white,
    borderRadius: 16,
    padding: spacing.lg,
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.neutral.lightGray,
  },
  regionsTitle: { fontSize: typography.sizes.lg, fontWeight: typography.weights.bold, color: colors.neutral.black },
  regionsValue: { marginTop: spacing.sm, fontSize: typography.sizes.md, color: colors.neutral.darkGray },
});

export default NGODashboardScreen;
