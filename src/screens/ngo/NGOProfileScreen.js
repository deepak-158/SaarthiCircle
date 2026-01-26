import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, spacing, typography } from '../../theme';
import { BACKEND_URL as API_BASE } from '../../config/backend';

const NGOProfileScreen = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [profile, setProfile] = useState(null);
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  const derived = useMemo(() => {
    const ngoName = profile?.name || profile?.ngo_name || profile?.full_name || 'NGO';
    const verified = profile?.is_verified === true || profile?.verified === true;
    const regions = Array.isArray(profile?.ngo_regions)
      ? profile.ngo_regions
      : Array.isArray(profile?.regions)
      ? profile.regions
      : [];
    const registrationNumber = profile?.registration_number || profile?.registrationNumber || '—';
    const status = profile?.ngo_profile_update_status || profile?.profile_update_status || null;
    return { ngoName, verified, regions, registrationNumber, status };
  }, [profile]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      const resp = await fetch(`${API_BASE}/ngo/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || 'Failed to load profile');

      const ngo = data?.ngo;
      setProfile(ngo || null);
      setContactPerson(String(ngo?.contactPerson || ngo?.contact_person || ''));
      setPhone(String(ngo?.phone || ''));
      setEmail(String(ngo?.email || ''));
    } catch {
      try {
        const cached = await AsyncStorage.getItem('userProfile');
        const parsed = cached ? JSON.parse(cached) : null;
        setProfile(parsed);
        setContactPerson(String(parsed?.contactPerson || parsed?.contact_person || ''));
        setPhone(String(parsed?.phone || ''));
        setEmail(String(parsed?.email || ''));
      } catch {
        setProfile(null);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadProfile();
  };

  const submit = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const resp = await fetch(`${API_BASE}/ngo/profile/request-update`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactPerson, phone, email }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || 'Request failed');

      if (data?.ngo) {
        await AsyncStorage.setItem('userProfile', JSON.stringify(data.ngo));
      }

      Alert.alert('Submitted', 'Your profile change request has been sent for admin approval.');
      await loadProfile();
    } catch (e) {
      Alert.alert('Error', e.message || 'Request failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.primary.main} />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Organization</Text>

            <View style={styles.row}>
              <Text style={styles.label}>NGO Name</Text>
              <Text style={styles.value}>{derived.ngoName}</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Registration ID</Text>
              <Text style={styles.value}>{derived.registrationNumber}</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Regions</Text>
              <Text style={styles.value}>{derived.regions.length ? derived.regions.join(', ') : '—'}</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Verification</Text>
              <View style={styles.inline}>
                <MaterialCommunityIcons
                  name={derived.verified ? 'check-decagram' : 'alert-circle-outline'}
                  size={18}
                  color={derived.verified ? colors.secondary.green : colors.neutral.gray}
                />
                <Text style={[styles.value, { marginLeft: spacing.xs }]}>
                  {derived.verified ? 'Verified' : 'Not verified'}
                </Text>
              </View>
            </View>

            {derived.status && (
              <View style={styles.notice}>
                <MaterialCommunityIcons name="clock-outline" size={18} color={colors.accent.orange} />
                <Text style={styles.noticeText}>Update status: {String(derived.status).toUpperCase()}</Text>
              </View>
            )}
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Contact Details</Text>

            <Text style={styles.inputLabel}>Contact Person</Text>
            <TextInput
              style={styles.input}
              value={contactPerson}
              onChangeText={setContactPerson}
              placeholder="Enter contact person"
              placeholderTextColor={colors.neutral.gray}
            />

            <Text style={styles.inputLabel}>Phone</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="Enter phone"
              placeholderTextColor={colors.neutral.gray}
              keyboardType="phone-pad"
            />

            <Text style={styles.inputLabel}>Support Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="Enter email"
              placeholderTextColor={colors.neutral.gray}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <TouchableOpacity style={styles.primaryBtn} onPress={submit} disabled={saving}>
              {saving ? (
                <ActivityIndicator color={colors.neutral.white} size="small" />
              ) : (
                <Text style={styles.primaryBtnText}>Request Update</Text>
              )}
            </TouchableOpacity>

            <Text style={styles.hintText}>
              Changes require admin approval.
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

  card: {
    backgroundColor: colors.neutral.white,
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.neutral.lightGray,
  },
  sectionTitle: { fontSize: typography.sizes.lg, fontWeight: typography.weights.bold, color: colors.neutral.black },

  row: { marginTop: spacing.md },
  label: { fontSize: typography.sizes.sm, color: colors.neutral.gray },
  value: { marginTop: 4, fontSize: typography.sizes.md, color: colors.neutral.black, fontWeight: typography.weights.semiBold },
  inline: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },

  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: 12,
    backgroundColor: colors.accent.orange + '15',
  },
  noticeText: { marginLeft: spacing.sm, color: colors.neutral.black, fontSize: typography.sizes.sm, fontWeight: typography.weights.medium },

  inputLabel: { marginTop: spacing.lg, fontSize: typography.sizes.sm, color: colors.neutral.gray },
  input: {
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.neutral.lightGray,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.neutral.black,
    backgroundColor: colors.neutral.white,
  },
  primaryBtn: {
    marginTop: spacing.lg,
    backgroundColor: colors.primary.main,
    paddingVertical: spacing.md,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryBtnText: { color: colors.neutral.white, fontSize: typography.sizes.md, fontWeight: typography.weights.semiBold },
  hintText: { marginTop: spacing.sm, fontSize: typography.sizes.sm, color: colors.neutral.gray },
});

export default NGOProfileScreen;
