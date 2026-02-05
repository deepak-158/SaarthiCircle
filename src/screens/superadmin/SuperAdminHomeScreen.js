import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, typography, spacing } from '../../theme';
import { BACKEND_URL as API_BASE } from '../../config/backend';
import { logout } from '../../services/authService';

const SuperAdminHomeScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [health, setHealth] = useState(null);

  useEffect(() => {
    (async () => {
      const t = await AsyncStorage.getItem('userToken');
      setToken(t);
    })();
  }, []);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        setLoading(true);
        const resp = await fetch(`${API_BASE}/superadmin/health`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (resp.status === 401 || resp.status === 403) {
          Alert.alert('Session Expired', 'Please login again.');
          await logout();
          return;
        }
        const data = await resp.json();
        if (!resp.ok) throw new Error(data.error || 'Failed to load');
        setHealth(data);
      } catch (e) {
        setHealth(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('superadmin.title')}</Text>
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={async () => {
            await AsyncStorage.multiRemove(['userToken', 'userRole', 'userProfile']);
            try {
              navigation?.reset?.({ index: 0, routes: [{ name: 'Auth', params: { screen: 'Login' } }] });
            } catch {
              // ignore
            }
          }}
        >
          <MaterialCommunityIcons name="logout" size={22} color={colors.neutral.black} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.primary.main} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      ) : (
        <View style={styles.content}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t('superadmin.access')}</Text>
            <Text style={styles.cardSub}>{t('superadmin.role')}: {health?.role || 'unknown'}</Text>
          </View>

          <View style={styles.grid}>
            <TouchableOpacity style={styles.tile} onPress={() => navigation.navigate('SuperAdminAdmins')}>
              <MaterialCommunityIcons name="shield-account" size={26} color={colors.primary.main} />
              <Text style={styles.tileText}>{t('superadmin.tiles.admins')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.tile} onPress={() => navigation.navigate('SuperAdminNgoRequests')}>
              <MaterialCommunityIcons name="office-building" size={26} color={colors.primary.main} />
              <Text style={styles.tileText}>{t('superadmin.tiles.ngoRequests')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.tile} onPress={() => navigation.navigate('SuperAdminEscalations')}>
              <MaterialCommunityIcons name="alert-decagram" size={26} color={colors.primary.main} />
              <Text style={styles.tileText}>{t('superadmin.tiles.escalations')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.tile} onPress={() => navigation.navigate('SuperAdminAuditLogs')}>
              <MaterialCommunityIcons name="clipboard-text" size={26} color={colors.primary.main} />
              <Text style={styles.tileText}>{t('superadmin.tiles.auditLogs')}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.note}>
            <Text style={styles.noteText}>
              {t('superadmin.note')}
            </Text>
          </View>
        </View>
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
  headerTitle: { fontSize: typography.sizes.xl, fontWeight: typography.weights.bold, color: colors.neutral.black },
  logoutBtn: { padding: spacing.sm, borderRadius: 999, backgroundColor: colors.neutral.lightGray },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: spacing.md, fontSize: typography.sizes.md, color: colors.neutral.gray },
  content: { padding: spacing.md },
  card: {
    backgroundColor: colors.neutral.white,
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  cardTitle: { fontSize: typography.sizes.lg, fontWeight: typography.weights.bold, color: colors.neutral.black },
  cardSub: { marginTop: 4, fontSize: typography.sizes.sm, color: colors.neutral.gray },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  tile: {
    flexGrow: 1,
    flexBasis: '48%',
    backgroundColor: colors.neutral.white,
    borderRadius: 16,
    padding: spacing.lg,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.neutral.lightGray,
  },
  tileText: { fontSize: typography.sizes.md, fontWeight: typography.weights.medium, color: colors.neutral.black },
  note: { marginTop: spacing.lg, padding: spacing.md, borderRadius: 16, backgroundColor: colors.neutral.white },
  noteText: { fontSize: typography.sizes.sm, color: colors.neutral.darkGray },
});

export default SuperAdminHomeScreen;
