// Volunteer Profile Screen - Complete Profile Management
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
  Image,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import { colors, typography, spacing, borderRadius, shadows } from '../../theme';
import { logout } from '../../services/authService';
import { LargeButton } from '../../components/common';

import { BACKEND_URL as API_BASE } from '../../config/backend';

const availabilityOptions = [
  { id: 'weekdays' },
  { id: 'weekends' },
  { id: 'evenings' },
  { id: 'anytime' },
];

const helpTypes = [
  { id: 'emotional', icon: 'heart' },
  { id: 'daily', icon: 'tools' },
  { id: 'health', icon: 'stethoscope' },
  { id: 'emergency', icon: 'alert-circle' },
];

const VolunteerProfileScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [profile, setProfile] = useState({
    full_name: '',
    phone: '',
    age: '',
    city: '',
    address: '',
    skills: [],
    why_volunteer: '',
    help_count: 0,
    rating: 0,
    is_approved: false,
    avatar_emoji: '🧑',
    availability: 'weekdays',
    preferred_help_types: [],
  });

  const [editedProfile, setEditedProfile] = useState({});

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
        if (resp.ok) {
          const data = await resp.json();
          if (data.user) {
            const userData = data.user;
            if (!userData.full_name && userData.name) {
              userData.full_name = userData.name;
            }
            const merged = { ...profile, ...userData };
            setProfile(merged);
            setEditedProfile(merged);
            await AsyncStorage.setItem('userProfile', JSON.stringify(userData));
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
        if (!storedProfile.full_name && storedProfile.name) {
          storedProfile.full_name = storedProfile.name;
        }
        setProfile(prev => ({ ...prev, ...storedProfile }));
        setEditedProfile(storedProfile);
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
    const nameToSave = editedProfile.full_name;
    if (!nameToSave?.trim()) {
      Alert.alert(t('common.error'), t('profile.fields.fullName') + ' is required');
      return;
    }

    setSaving(true);
    try {
      const token = await AsyncStorage.getItem('userToken');

      const updateData = {
        full_name: editedProfile.full_name,
        name: editedProfile.full_name,
        gender: editedProfile.gender,
        phone: editedProfile.phone,
        role: editedProfile.role,
        age: editedProfile.age,
        city: editedProfile.city,
        address: editedProfile.address,
        skills: editedProfile.skills,
        why_volunteer: editedProfile.why_volunteer,
        availability: editedProfile.availability,
        preferred_help_types: editedProfile.preferred_help_types,
      };

      const resp = await fetch(`${API_BASE}/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(updateData),
      });

      const result = await resp.json();
      if (!resp.ok) throw new Error(result?.error || 'Failed to update profile');

      const serverProfile = result.profile;

      const updatedProfile = {
        ...profile,
        ...editedProfile,
        ...serverProfile,
        full_name: serverProfile.name || editedProfile.full_name
      };

      await AsyncStorage.setItem('userProfile', JSON.stringify(updatedProfile));
      setProfile(updatedProfile);
      setEditedProfile(updatedProfile);
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

  const toggleHelpType = (helpTypeId) => {
    const current = editedProfile.preferred_help_types || [];
    const updated = current.includes(helpTypeId)
      ? current.filter(id => id !== helpTypeId)
      : [...current, helpTypeId];
    updateField('preferred_help_types', updated);
  };

  const handleLogout = async () => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm(t('profile.logoutConfirmMessage'));
      if (confirmed) {
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
    <SafeAreaView style={styles.safeArea}>
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
          <Text style={styles.headerTitle}>{t('profile.myProfile')}</Text>
          {!editMode ? (
            <View style={{ flexDirection: 'row' }}>
              <TouchableOpacity style={styles.editButton} onPress={handleEdit}>
                <MaterialCommunityIcons name="pencil" size={24} color={colors.neutral.white} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.editButton} onPress={handleLogout}>
                <MaterialCommunityIcons name="logout" size={24} color={colors.neutral.white} />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ width: 40 }} />
          )}
        </View>

        {/* Profile Avatar */}
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={{ fontSize: 50 }}>{profile.avatar_emoji || '🧑'}</Text>
          </View>
          {profile.is_approved && (
            <View style={styles.verifiedBadge}>
              <MaterialCommunityIcons name="check-decagram" size={24} color="#4CAF50" />
            </View>
          )}
        </View>

        <Text style={styles.profileName}>{profile.full_name || profile.name || 'Volunteer'}</Text>
        <View style={styles.roleTag}>
          <MaterialCommunityIcons name="hand-heart" size={16} color={colors.neutral.white} />
          <Text style={styles.roleTagText}>Volunteer</Text>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{profile.help_count || 0}</Text>
            <Text style={styles.statLabel}>{t('profile.stats.helped')}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{profile.rating || '0.0'}</Text>
            <Text style={styles.statLabel}>{t('profile.stats.rating')}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <MaterialCommunityIcons
              name={profile.is_approved ? 'check-circle' : 'clock-outline'}
              size={24}
              color={profile.is_approved ? '#4CAF50' : '#FF9800'}
            />
            <Text style={[styles.statLabel, { marginTop: 4 }]}>
              {profile.is_approved ? t('profile.stats.approved') : t('profile.stats.pending')}
            </Text>
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
                  value={editedProfile.full_name}
                  onChangeText={(text) => updateField('full_name', text)}
                  placeholder={t('profile.fields.fullName')}
                />
              ) : (
                <Text style={styles.fieldValue}>{profile.full_name || profile.name || 'Not set'}</Text>
              )}
            </View>
          </View>

          <View style={styles.fieldRow}>
            <MaterialCommunityIcons name="phone" size={22} color={colors.primary.main} />
            <View style={styles.fieldContent}>
              <Text style={styles.fieldLabel}>{t('profile.fields.phone')}</Text>
              <Text style={styles.fieldValue}>{profile.phone || 'Not set'}</Text>
            </View>
          </View>

          <View style={styles.fieldRow}>
            <MaterialCommunityIcons name="cake" size={22} color={colors.primary.main} />
            <View style={styles.fieldContent}>
              <Text style={styles.fieldLabel}>{t('profile.fields.age')}</Text>
              {editMode ? (
                <TextInput
                  style={styles.input}
                  value={String(editedProfile.age || '')}
                  onChangeText={(text) => updateField('age', text.replace(/\D/g, ''))}
                  placeholder={t('profile.fields.age')}
                  keyboardType="number-pad"
                />
              ) : (
                <Text style={styles.fieldValue}>{profile.age ? `${profile.age}` : 'Not set'}</Text>
              )}
            </View>
          </View>

          <View style={styles.fieldRow}>
            <MaterialCommunityIcons name="city" size={22} color={colors.primary.main} />
            <View style={styles.fieldContent}>
              <Text style={styles.fieldLabel}>{t('profile.fields.city')}</Text>
              {editMode ? (
                <TextInput
                  style={styles.input}
                  value={editedProfile.city}
                  onChangeText={(text) => updateField('city', text)}
                  placeholder={t('profile.fields.city')}
                />
              ) : (
                <Text style={styles.fieldValue}>{profile.city || 'Not set'}</Text>
              )}
            </View>
          </View>

          <View style={styles.fieldRow}>
            <MaterialCommunityIcons name="map-marker" size={22} color={colors.primary.main} />
            <View style={styles.fieldContent}>
              <Text style={styles.fieldLabel}>{t('profile.fields.address')}</Text>
              {editMode ? (
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={editedProfile.address}
                  onChangeText={(text) => updateField('address', text)}
                  placeholder={t('profile.fields.address')}
                  multiline
                />
              ) : (
                <Text style={styles.fieldValue}>{profile.address || 'Not set'}</Text>
              )}
            </View>
          </View>
        </View>

        {/* Skills */}
        <View style={[styles.section, shadows.sm]}>
          <Text style={styles.sectionTitle}>{t('profile.volunteer.skills')}</Text>
          <View style={styles.skillsContainer}>
            {(profile.skills || []).length > 0 ? (
              (profile.skills || []).map((skill, index) => (
                <View key={index} style={styles.skillTag}>
                  <Text style={styles.skillText}>{skill}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>{t('profile.volunteer.noSkills')}</Text>
            )}
          </View>
          {editMode && (
            <TextInput
              style={styles.input}
              value={(editedProfile.skills || []).join(', ')}
              onChangeText={(text) => updateField('skills', text.split(',').map(s => s.trim()).filter(s => s))}
              placeholder="Enter skills (comma separated)"
            />
          )}
        </View>

        {/* Availability */}
        <View style={[styles.section, shadows.sm]}>
          <Text style={styles.sectionTitle}>{t('profile.volunteer.availability')}</Text>
          {editMode ? (
            <View style={styles.availabilityOptions}>
              {availabilityOptions.map((option) => (
                <TouchableOpacity
                  key={option.id}
                  style={[
                    styles.availabilityOption,
                    editedProfile.availability === option.id && styles.selectedAvailability,
                  ]}
                  onPress={() => updateField('availability', option.id)}
                >
                  <Text style={[
                    styles.availabilityText,
                    editedProfile.availability === option.id && styles.selectedAvailabilityText,
                  ]}>
                    {t(`profile.volunteer.${option.id}`)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.fieldRow}>
              <MaterialCommunityIcons name="calendar-clock" size={22} color={colors.primary.main} />
              <Text style={styles.availabilityValue}>
                {t(`profile.volunteer.${profile.availability || 'weekdays'}`)}
              </Text>
            </View>
          )}
        </View>

        {/* Preferred Help Types */}
        <View style={[styles.section, shadows.sm]}>
          <Text style={styles.sectionTitle}>{t('profile.volunteer.helpTypes')}</Text>
          <View style={styles.helpTypesGrid}>
            {helpTypes.map((helpType) => {
              const isSelected = editMode
                ? (editedProfile.preferred_help_types || []).includes(helpType.id)
                : (profile.preferred_help_types || []).includes(helpType.id);

              return (
                <TouchableOpacity
                  key={helpType.id}
                  style={[styles.helpTypeCard, isSelected && styles.selectedHelpType]}
                  onPress={() => editMode && toggleHelpType(helpType.id)}
                  disabled={!editMode}
                >
                  <MaterialCommunityIcons
                    name={helpType.icon}
                    size={28}
                    color={isSelected ? colors.neutral.white : colors.primary.main}
                  />
                  <Text style={[styles.helpTypeLabel, isSelected && styles.selectedHelpTypeLabel]}>
                    {t(`profile.volunteer.${helpType.id}`)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Motivation */}
        <View style={[styles.section, shadows.sm]}>
          <Text style={styles.sectionTitle}>{t('profile.volunteer.whyVolunteer')}</Text>
          {editMode ? (
            <TextInput
              style={[styles.input, styles.textArea]}
              value={editedProfile.why_volunteer}
              onChangeText={(text) => updateField('why_volunteer', text)}
              placeholder="Share your motivation..."
              multiline
              numberOfLines={3}
            />
          ) : (
            <Text style={styles.motivationText}>
              {profile.why_volunteer || 'No motivation shared yet'}
            </Text>
          )}
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
          <View style={{ marginTop: spacing.lg }}>
            <LargeButton
              title={t('profile.logout')}
              onPress={handleLogout}
              variant="outline"
              icon="logout"
            />
          </View>
        )}

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
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
  verifiedBadge: {
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
    fontSize: typography.sizes.xxl,
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
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacing.sm,
  },
  skillTag: {
    backgroundColor: colors.primary.light,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  skillText: {
    fontSize: typography.sizes.sm,
    color: colors.primary.dark,
  },
  emptyText: {
    fontSize: typography.sizes.md,
    color: colors.neutral.darkGray,
    fontStyle: 'italic',
  },
  availabilityOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  availabilityOption: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.primary.main,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  selectedAvailability: {
    backgroundColor: colors.primary.main,
  },
  availabilityText: {
    fontSize: typography.sizes.sm,
    color: colors.primary.main,
  },
  selectedAvailabilityText: {
    color: colors.neutral.white,
  },
  availabilityValue: {
    fontSize: typography.sizes.md,
    color: colors.neutral.black,
    marginLeft: spacing.md,
  },
  helpTypesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  helpTypeCard: {
    width: '48%',
    backgroundColor: colors.neutral.lightGray,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  selectedHelpType: {
    backgroundColor: colors.primary.main,
  },
  helpTypeLabel: {
    fontSize: typography.sizes.sm,
    color: colors.neutral.darkGray,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  selectedHelpTypeLabel: {
    color: colors.neutral.white,
  },
  motivationText: {
    fontSize: typography.sizes.md,
    color: colors.neutral.darkGray,
    lineHeight: 22,
  },
  editButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.md,
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
});

export default VolunteerProfileScreen;
