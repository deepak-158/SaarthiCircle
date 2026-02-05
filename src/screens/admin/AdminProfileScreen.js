// Admin Profile Screen - Complete Profile Management
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Switch,
  Modal,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, typography, spacing, borderRadius, shadows } from '../../theme';
import { logout } from '../../services/authService';
import { useTranslation } from 'react-i18next';
import { BACKEND_URL as API_BASE } from '../../config/backend';

// Default admin profile
const DEFAULT_ADMIN = {
  fullName: 'Admin User',
  email: 'admin@saathicircle.com',
  phone: '+91 XXXXX XXXXX',
  role: 'admin',
  department: 'Operations',
  joinedDate: '2024-01-01',
};

const AdminProfileScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [profile, setProfile] = useState(DEFAULT_ADMIN);
  const [editedProfile, setEditedProfile] = useState({});

  // Settings modals
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);
  const [showActivityLog, setShowActivityLog] = useState(false);

  // Notification preferences
  const [notifications, setNotifications] = useState({
    sosAlerts: true,
    volunteerRequests: true,
    systemUpdates: true,
    dailyReports: false,
  });

  // Activity log (dummy data)
  const [activityLog] = useState([
    { id: '1', action: 'Approved volunteer Rahul Sharma', time: '2 hours ago' },
    { id: '2', action: 'Resolved SOS alert #1234', time: '5 hours ago' },
    { id: '3', action: 'Updated system settings', time: '1 day ago' },
    { id: '4', action: 'Rejected volunteer application', time: '2 days ago' },
    { id: '5', action: 'Viewed analytics dashboard', time: '3 days ago' },
  ]);

  // Admin stats
  const [stats] = useState({
    volunteersApproved: 45,
    incidentsResolved: 128,
    seniorsHelped: 1247,
    avgResponseTime: '12 min',
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('userToken');

      // Try fetching fresh profile from backend
      try {
        const resp = await fetch(`${API_BASE}/me`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (resp.status === 401) {
          await logout();
          return;
        }

        if (resp.ok) {
          const data = await resp.json();
          if (data.user) {
            setProfile({ ...DEFAULT_ADMIN, ...data.user, fullName: data.user.name || data.user.full_name || DEFAULT_ADMIN.fullName });
            await AsyncStorage.setItem('userProfile', JSON.stringify(data.user));
            setLoading(false);
            return;
          }
        }
      } catch (e) {
        console.warn('Failed to fetch profile from backend:', e);
      }

      const profileJson = await AsyncStorage.getItem('userProfile');
      if (profileJson) {
        const storedProfile = JSON.parse(profileJson);
        setProfile({
          ...DEFAULT_ADMIN,
          ...storedProfile,
          fullName: storedProfile.name || storedProfile.full_name || DEFAULT_ADMIN.fullName
        });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    setEditedProfile({ ...profile });
    setEditMode(true);
  };

  const handleCancel = () => {
    setEditedProfile({});
    setEditMode(false);
  };

  const handleSave = async () => {
    if (!editedProfile.fullName?.trim()) {
      Alert.alert(t('common.error'), t('profile.fields.fullName') + ' is required');
      return;
    }

    setSaving(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const resp = await fetch(`${API_BASE}/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          full_name: editedProfile.fullName,
          phone: editedProfile.phone,
          // other fields
        }),
      });

      if (resp.status === 401) {
        Alert.alert(t('common.error'), 'Your session has expired. Please login again.');
        await logout();
        return;
      }

      const result = await resp.json();
      if (!resp.ok) throw new Error(result?.error || 'Failed to update profile');

      // Update local storage
      const updatedProfile = { ...profile, ...result.profile };
      await AsyncStorage.setItem('userProfile', JSON.stringify(updatedProfile));
      setProfile({ ...updatedProfile, fullName: updatedProfile.name || updatedProfile.full_name });
      setEditMode(false);

      Alert.alert(t('caregiver.interaction.success'), t('profile.save') + ' successful!');
    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert(t('common.error'), error.message || 'Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field, value) => {
    setEditedProfile(prev => ({ ...prev, [field]: value }));
  };

  const handleNotificationToggle = (key) => {
    setNotifications(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSaveNotifications = async () => {
    try {
      await AsyncStorage.setItem('adminNotificationSettings', JSON.stringify(notifications));
      setShowNotificationSettings(false);
      Alert.alert(t('caregiver.interaction.success'), 'Notification preferences saved!');
    } catch (error) {
      Alert.alert(t('common.error'), 'Failed to save preferences');
    }
  };

  const handleChangePassword = () => {
    Alert.alert(
      t('profile.admin.changePassword'),
      'Since you login with OTP, password is not required. Your phone number is your identity.',
      [{ text: t('common.ok') }]
    );
  };

  const handleLogout = async () => {
    if (Platform.OS === 'web') {
      if (window.confirm(t('profile.logoutConfirmMessage'))) {
        await logout();
      }
      return;
    }

    Alert.alert(
      t('profile.logoutConfirmTitle'),
      t('profile.logoutConfirmMessage'),
      [
        { text: t('profile.cancel'), style: 'cancel' },
        {
          text: t('profile.logout'),
          style: 'destructive',
          onPress: async () => {
            await logout();
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary.main} />
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={[colors.primary.main, colors.primary.dark]}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <MaterialCommunityIcons name="arrow-left" size={28} color={colors.neutral.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('profile.adminProfile')}</Text>
          {!editMode ? (
            <TouchableOpacity style={styles.editButton} onPress={handleEdit}>
              <MaterialCommunityIcons name="pencil" size={24} color={colors.neutral.white} />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 40 }} />
          )}
        </View>

        {/* Profile Avatar */}
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <MaterialCommunityIcons name="shield-account" size={60} color={colors.primary.main} />
          </View>
          <View style={styles.adminBadge}>
            <MaterialCommunityIcons name="check-decagram" size={24} color="#FFD700" />
          </View>
        </View>

        <Text style={styles.profileName}>{profile.fullName}</Text>
        <View style={styles.roleTag}>
          <MaterialCommunityIcons name="shield-crown" size={16} color={colors.neutral.white} />
          <Text style={styles.roleTagText}>Administrator</Text>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{stats.volunteersApproved}</Text>
            <Text style={styles.statLabel}>{t('profile.stats.approved')}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{stats.incidentsResolved}</Text>
            <Text style={styles.statLabel}>{t('profile.stats.resolved')}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{stats.seniorsHelped}</Text>
            <Text style={styles.statLabel}>{t('profile.stats.seniors')}</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Personal Information */}
        <View style={[styles.section, shadows.sm]}>
          <Text style={styles.sectionTitle}>{t('profile.personalInfo')}</Text>

          <View style={styles.fieldRow}>
            <MaterialCommunityIcons name="account" size={22} color={colors.primary.main} />
            <View style={styles.fieldContent}>
              <Text style={styles.fieldLabel}>{t('profile.fields.fullName')}</Text>
              {editMode ? (
                <TextInput
                  style={styles.input}
                  value={editedProfile.fullName}
                  onChangeText={(text) => updateField('fullName', text)}
                  placeholder="Enter full name"
                />
              ) : (
                <Text style={styles.fieldValue}>{profile.fullName}</Text>
              )}
            </View>
          </View>

          <View style={styles.fieldRow}>
            <MaterialCommunityIcons name="email" size={22} color={colors.primary.main} />
            <View style={styles.fieldContent}>
              <Text style={styles.fieldLabel}>{t('profile.fields.email')}</Text>
              <Text style={styles.fieldValue}>{profile.email || 'Not set'}</Text>
            </View>
          </View>

          <View style={styles.fieldRow}>
            <MaterialCommunityIcons name="phone" size={22} color={colors.primary.main} />
            <View style={styles.fieldContent}>
              <Text style={styles.fieldLabel}>{t('profile.fields.phone')}</Text>
              {editMode ? (
                <TextInput
                  style={styles.input}
                  value={editedProfile.phone}
                  onChangeText={(text) => updateField('phone', text)}
                  placeholder="Enter phone"
                  keyboardType="phone-pad"
                />
              ) : (
                <Text style={styles.fieldValue}>{profile.phone || 'Not set'}</Text>
              )}
            </View>
          </View>

          <View style={styles.fieldRow}>
            <MaterialCommunityIcons name="domain" size={22} color={colors.primary.main} />
            <View style={styles.fieldContent}>
              <Text style={styles.fieldLabel}>{t('profile.fields.department')}</Text>
              {editMode ? (
                <TextInput
                  style={styles.input}
                  value={editedProfile.department}
                  onChangeText={(text) => updateField('department', text)}
                  placeholder="Enter department"
                />
              ) : (
                <Text style={styles.fieldValue}>{profile.department || 'Operations'}</Text>
              )}
            </View>
          </View>
        </View>

        {/* Admin Capabilities */}
        <View style={[styles.section, shadows.sm]}>
          <Text style={styles.sectionTitle}>{t('profile.admin.capabilities')}</Text>

          <View style={styles.capabilityItem}>
            <MaterialCommunityIcons name="account-check" size={24} color={colors.secondary.green} />
            <Text style={styles.capabilityText}>{t('profile.admin.approveReject')}</Text>
          </View>

          <View style={styles.capabilityItem}>
            <MaterialCommunityIcons name="alert-circle" size={24} color={colors.accent.red} />
            <Text style={styles.capabilityText}>{t('profile.admin.manageSOS')}</Text>
          </View>

          <View style={styles.capabilityItem}>
            <MaterialCommunityIcons name="chart-line" size={24} color={colors.primary.main} />
            <Text style={styles.capabilityText}>{t('profile.admin.viewAnalytics')}</Text>
          </View>

          <View style={styles.capabilityItem}>
            <MaterialCommunityIcons name="brain" size={24} color={colors.accent.orange} />
            <Text style={styles.capabilityText}>{t('profile.admin.aiRisk')}</Text>
          </View>
        </View>

        {/* Account Settings */}
        <View style={[styles.section, shadows.sm]}>
          <Text style={styles.sectionTitle}>{t('profile.admin.accountSettings')}</Text>

          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => setShowNotificationSettings(true)}
          >
            <MaterialCommunityIcons name="bell" size={24} color={colors.primary.main} />
            <Text style={styles.settingText}>{t('profile.admin.notifications')}</Text>
            <MaterialCommunityIcons name="chevron-right" size={24} color={colors.neutral.gray} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingItem}
            onPress={handleChangePassword}
          >
            <MaterialCommunityIcons name="lock" size={24} color={colors.primary.main} />
            <Text style={styles.settingText}>{t('profile.admin.changePassword')}</Text>
            <MaterialCommunityIcons name="chevron-right" size={24} color={colors.neutral.gray} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => setShowActivityLog(true)}
          >
            <MaterialCommunityIcons name="history" size={24} color={colors.primary.main} />
            <Text style={styles.settingText}>{t('profile.admin.activityLog')}</Text>
            <MaterialCommunityIcons name="chevron-right" size={24} color={colors.neutral.gray} />
          </TouchableOpacity>
        </View>

        {/* Edit Mode Buttons */}
        {editMode && (
          <View style={styles.editButtons}>
            <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
              <Text style={styles.cancelButtonText}>{t('profile.cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color={colors.neutral.white} size="small" />
              ) : (
                <Text style={styles.saveButtonText}>{t('profile.save')}</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Logout Button */}
        {!editMode && (
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <MaterialCommunityIcons name="logout" size={24} color={colors.accent.red} />
            <Text style={styles.logoutText}>{t('profile.logout')}</Text>
          </TouchableOpacity>
        )}

        <Text style={styles.versionText}>{t('profile.version', { version: '1.0.0' })}</Text>
      </ScrollView>

      {/* Notification Settings Modal */}
      <Modal
        visible={showNotificationSettings}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowNotificationSettings(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('profile.admin.notifications')}</Text>
              <TouchableOpacity onPress={() => setShowNotificationSettings(false)}>
                <MaterialCommunityIcons name="close" size={24} color={colors.neutral.darkGray} />
              </TouchableOpacity>
            </View>

            <View style={styles.notificationOption}>
              <View style={styles.notificationInfo}>
                <MaterialCommunityIcons name="alert-circle" size={24} color={colors.accent.red} />
                <Text style={styles.notificationLabel}>{t('profile.admin.notificationOptions.sosAlerts')}</Text>
              </View>
              <Switch
                value={notifications.sosAlerts}
                onValueChange={() => handleNotificationToggle('sosAlerts')}
                trackColor={{ false: colors.neutral.gray, true: colors.primary.light }}
                thumbColor={notifications.sosAlerts ? colors.primary.main : colors.neutral.lightGray}
              />
            </View>

            <View style={styles.notificationOption}>
              <View style={styles.notificationInfo}>
                <MaterialCommunityIcons name="account-plus" size={24} color={colors.primary.main} />
                <Text style={styles.notificationLabel}>{t('profile.admin.notificationOptions.volunteerRequests')}</Text>
              </View>
              <Switch
                value={notifications.volunteerRequests}
                onValueChange={() => handleNotificationToggle('volunteerRequests')}
                trackColor={{ false: colors.neutral.gray, true: colors.primary.light }}
                thumbColor={notifications.volunteerRequests ? colors.primary.main : colors.neutral.lightGray}
              />
            </View>

            <View style={styles.notificationOption}>
              <View style={styles.notificationInfo}>
                <MaterialCommunityIcons name="cog" size={24} color={colors.accent.orange} />
                <Text style={styles.notificationLabel}>{t('profile.admin.notificationOptions.systemUpdates')}</Text>
              </View>
              <Switch
                value={notifications.systemUpdates}
                onValueChange={() => handleNotificationToggle('systemUpdates')}
                trackColor={{ false: colors.neutral.gray, true: colors.primary.light }}
                thumbColor={notifications.systemUpdates ? colors.primary.main : colors.neutral.lightGray}
              />
            </View>

            <View style={styles.notificationOption}>
              <View style={styles.notificationInfo}>
                <MaterialCommunityIcons name="chart-bar" size={24} color={colors.secondary.green} />
                <Text style={styles.notificationLabel}>{t('profile.admin.notificationOptions.dailyReports')}</Text>
              </View>
              <Switch
                value={notifications.dailyReports}
                onValueChange={() => handleNotificationToggle('dailyReports')}
                trackColor={{ false: colors.neutral.gray, true: colors.primary.light }}
                thumbColor={notifications.dailyReports ? colors.primary.main : colors.neutral.lightGray}
              />
            </View>

            <TouchableOpacity style={styles.modalSaveButton} onPress={handleSaveNotifications}>
              <Text style={styles.modalSaveButtonText}>{t('profile.admin.notificationOptions.savePreferences')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Activity Log Modal */}
      <Modal
        visible={showActivityLog}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowActivityLog(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('profile.admin.activityLog')}</Text>
              <TouchableOpacity onPress={() => setShowActivityLog(false)}>
                <MaterialCommunityIcons name="close" size={24} color={colors.neutral.darkGray} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.activityList}>
              {activityLog.map((activity) => (
                <View key={activity.id} style={styles.activityItem}>
                  <MaterialCommunityIcons name="circle-small" size={24} color={colors.primary.main} />
                  <View style={styles.activityDetails}>
                    <Text style={styles.activityAction}>{activity.action}</Text>
                    <Text style={styles.activityTime}>{activity.time}</Text>
                  </View>
                </View>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowActivityLog(false)}
            >
              <Text style={styles.modalCloseButtonText}>{t('profile.admin.close')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral.lightGray,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.neutral.white,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: typography.sizes.md,
    color: colors.neutral.darkGray,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    borderBottomLeftRadius: borderRadius.xl,
    borderBottomRightRadius: borderRadius.xl,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    padding: spacing.sm,
  },
  headerTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.neutral.white,
  },
  editButton: {
    padding: spacing.sm,
  },
  avatarContainer: {
    alignItems: 'center',
    marginTop: spacing.md,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.neutral.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  adminBadge: {
    position: 'absolute',
    bottom: 0,
    right: '35%',
    backgroundColor: colors.neutral.white,
    borderRadius: 12,
    padding: 2,
  },
  profileName: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
    color: colors.neutral.white,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  roleTag: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    alignSelf: 'center',
    marginTop: spacing.sm,
  },
  roleTagText: {
    color: colors.neutral.white,
    fontSize: typography.sizes.sm,
    marginLeft: spacing.xs,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginTop: spacing.lg,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.neutral.white,
  },
  statLabel: {
    fontSize: typography.sizes.sm,
    color: 'rgba(255,255,255,0.8)',
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  section: {
    backgroundColor: colors.neutral.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semiBold,
    color: colors.neutral.black,
    marginBottom: spacing.md,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  fieldContent: {
    flex: 1,
    marginLeft: spacing.md,
  },
  fieldLabel: {
    fontSize: typography.sizes.sm,
    color: colors.neutral.darkGray,
  },
  fieldValue: {
    fontSize: typography.sizes.md,
    color: colors.neutral.black,
    marginTop: spacing.xs,
  },
  input: {
    backgroundColor: colors.neutral.lightGray,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: typography.sizes.md,
    color: colors.neutral.black,
    marginTop: spacing.xs,
  },
  capabilityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  capabilityText: {
    fontSize: typography.sizes.md,
    color: colors.neutral.black,
    marginLeft: spacing.md,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.lightGray,
  },
  settingText: {
    flex: 1,
    fontSize: typography.sizes.md,
    color: colors.neutral.black,
    marginLeft: spacing.md,
  },
  editButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.neutral.darkGray,
    borderRadius: borderRadius.md,
    marginRight: spacing.sm,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: typography.sizes.md,
    color: colors.neutral.darkGray,
    fontWeight: typography.weights.semiBold,
  },
  saveButton: {
    flex: 1,
    paddingVertical: spacing.md,
    backgroundColor: colors.primary.main,
    borderRadius: borderRadius.md,
    marginLeft: spacing.sm,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: typography.sizes.md,
    color: colors.neutral.white,
    fontWeight: typography.weights.semiBold,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    backgroundColor: colors.neutral.white,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.accent.red,
    marginBottom: spacing.md,
  },
  logoutText: {
    fontSize: typography.sizes.md,
    color: colors.accent.red,
    fontWeight: typography.weights.semiBold,
    marginLeft: spacing.sm,
  },
  versionText: {
    textAlign: 'center',
    fontSize: typography.sizes.sm,
    color: colors.neutral.gray,
    marginTop: spacing.md,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.neutral.white,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.lg,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.lightGray,
  },
  modalTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.neutral.black,
  },
  notificationOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.lightGray,
  },
  notificationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  notificationLabel: {
    fontSize: typography.sizes.md,
    color: colors.neutral.black,
    marginLeft: spacing.md,
  },
  modalSaveButton: {
    backgroundColor: colors.primary.main,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  modalSaveButtonText: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semiBold,
    color: colors.neutral.white,
  },
  modalCloseButton: {
    backgroundColor: colors.neutral.lightGray,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  modalCloseButtonText: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semiBold,
    color: colors.neutral.darkGray,
  },
  activityList: {
    maxHeight: 300,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: spacing.sm,
  },
  activityDetails: {
    flex: 1,
  },
  activityAction: {
    fontSize: typography.sizes.md,
    color: colors.neutral.black,
  },
  activityTime: {
    fontSize: typography.sizes.sm,
    color: colors.neutral.gray,
    marginTop: spacing.xs,
  },
});

export default AdminProfileScreen;
