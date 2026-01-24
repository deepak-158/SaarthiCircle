// Preferences Screen
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, typography, spacing } from '../../theme';
import { LargeButton } from '../../components/common';
import { BACKEND_URL as API_BASE } from '../../config/backend';

const PreferencesScreen = ({ navigation }) => {
  const [preferences, setPreferences] = useState({
    language: 'en',
    voiceEnabled: true,
    largeText: true,
    highContrast: false,
    notifications: true,
    sosAlerts: true,
    moodReminders: true,
    companionCalls: true,
    soundEffects: true,
    vibration: true,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      setLoading(true);
      
      // First, try to fetch from backend
      try {
        const token = await AsyncStorage.getItem('userToken');
        if (token) {
          const resp = await fetch(`${API_BASE}/me`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
          });

          if (resp.ok) {
            const result = await resp.json();
            const profile = result.profile || result.user || {};
            
            if (profile.preferences) {
              setPreferences({
                language: profile.preferences.language || 'en',
                voiceEnabled: profile.preferences.voiceEnabled !== undefined ? profile.preferences.voiceEnabled : true,
                largeText: profile.preferences.largeText !== undefined ? profile.preferences.largeText : true,
                highContrast: profile.preferences.highContrast !== undefined ? profile.preferences.highContrast : false,
                notifications: profile.preferences.notifications !== undefined ? profile.preferences.notifications : true,
                sosAlerts: profile.preferences.sosAlerts !== undefined ? profile.preferences.sosAlerts : true,
                moodReminders: profile.preferences.moodReminders !== undefined ? profile.preferences.moodReminders : true,
                companionCalls: profile.preferences.companionCalls !== undefined ? profile.preferences.companionCalls : true,
                soundEffects: profile.preferences.soundEffects !== undefined ? profile.preferences.soundEffects : true,
                vibration: profile.preferences.vibration !== undefined ? profile.preferences.vibration : true,
              });
              return; // Successfully loaded from backend
            }
          }
        }
      } catch (backendError) {
        console.warn('Error fetching from backend, falling back to local storage:', backendError);
      }
      
      // Fallback to AsyncStorage
      const prefsJson = await AsyncStorage.getItem('userPreferences');
      if (prefsJson) {
        const parsedPrefs = JSON.parse(prefsJson);
        setPreferences({
          ...preferences,
          ...parsedPrefs,
        });
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const languages = [
    { id: 'en', name: 'English', native: 'English' },
    { id: 'hi', name: 'Hindi', native: 'हिंदी' },
    { id: 'bn', name: 'Bengali', native: 'বাংলা' },
    { id: 'ta', name: 'Tamil', native: 'தமிழ்' },
    { id: 'te', name: 'Telugu', native: 'తెలుగు' },
    { id: 'mr', name: 'Marathi', native: 'मराठी' },
  ];

  const togglePreference = (key) => {
    setPreferences(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      
      const resp = await fetch(`${API_BASE}/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          preferences: preferences,
        }),
      });

      const result = await resp.json();
      if (!resp.ok) throw new Error(result?.error || 'Failed to save preferences');

      // Also save to AsyncStorage as backup
      await AsyncStorage.setItem('userPreferences', JSON.stringify(preferences));
      
      // Update userProfile in AsyncStorage
      try {
        const profileJson = await AsyncStorage.getItem('userProfile');
        if (profileJson) {
          const profile = JSON.parse(profileJson);
          profile.preferences = preferences;
          await AsyncStorage.setItem('userProfile', JSON.stringify(profile));
        }
      } catch (e) {
        console.warn('Failed to update userProfile:', e);
      }
      
      Alert.alert('Saved!', 'Your preferences have been updated.');
    } catch (error) {
      console.error('Error saving preferences:', error);
      Alert.alert('Error', error.message || 'Failed to save preferences');
    } finally {
      setLoading(false);
    }
  };

  const SettingRow = ({ icon, title, subtitle, value, onToggle }) => (
    <View style={styles.settingRow}>
      <View style={styles.settingIconContainer}>
        <MaterialCommunityIcons name={icon} size={24} color={colors.primary.main} />
      </View>
      <View style={styles.settingInfo}>
        <Text style={styles.settingTitle}>{title}</Text>
        {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: colors.neutral.lightGray, true: colors.primary.light }}
        thumbColor={value ? colors.primary.main : colors.neutral.gray}
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialCommunityIcons 
            name="arrow-left" 
            size={28} 
            color={colors.primary.main} 
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Preferences</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {loading && (
          <ActivityIndicator size="large" color={colors.primary.main} style={{ marginTop: 20 }} />
        )}
        {/* Language Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🌐 Language</Text>
          <View style={styles.languageGrid}>
            {languages.map((lang) => (
              <TouchableOpacity
                key={lang.id}
                style={[
                  styles.languageCard,
                  preferences.language === lang.id && styles.languageSelected,
                ]}
                onPress={() => setPreferences({ ...preferences, language: lang.id })}
              >
                <Text style={[
                  styles.languageNative,
                  preferences.language === lang.id && styles.languageTextSelected,
                ]}>
                  {lang.native}
                </Text>
                <Text style={[
                  styles.languageName,
                  preferences.language === lang.id && styles.languageNameSelected,
                ]}>
                  {lang.name}
                </Text>
                {preferences.language === lang.id && (
                  <MaterialCommunityIcons 
                    name="check-circle" 
                    size={20} 
                    color={colors.neutral.white} 
                    style={styles.checkIcon}
                  />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Accessibility Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>♿ Accessibility</Text>
          <View style={styles.settingsCard}>
            <SettingRow
              icon="microphone"
              title="Voice Commands"
              subtitle="Control app with voice"
              value={preferences.voiceEnabled}
              onToggle={() => togglePreference('voiceEnabled')}
            />
            <SettingRow
              icon="format-size"
              title="Large Text"
              subtitle="Increase text size"
              value={preferences.largeText}
              onToggle={() => togglePreference('largeText')}
            />
            <SettingRow
              icon="contrast-circle"
              title="High Contrast"
              subtitle="Better visibility"
              value={preferences.highContrast}
              onToggle={() => togglePreference('highContrast')}
            />
          </View>
        </View>

        {/* Notifications Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔔 Notifications</Text>
          <View style={styles.settingsCard}>
            <SettingRow
              icon="bell"
              title="All Notifications"
              subtitle="Enable notifications"
              value={preferences.notifications}
              onToggle={() => togglePreference('notifications')}
            />
            <SettingRow
              icon="alert"
              title="SOS Alerts"
              subtitle="Emergency notifications"
              value={preferences.sosAlerts}
              onToggle={() => togglePreference('sosAlerts')}
            />
            <SettingRow
              icon="emoticon"
              title="Mood Reminders"
              subtitle="Daily check-in reminders"
              value={preferences.moodReminders}
              onToggle={() => togglePreference('moodReminders')}
            />
            <SettingRow
              icon="phone"
              title="Companion Calls"
              subtitle="Incoming call alerts"
              value={preferences.companionCalls}
              onToggle={() => togglePreference('companionCalls')}
            />
          </View>
        </View>

        {/* Sound Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔊 Sound & Haptics</Text>
          <View style={styles.settingsCard}>
            <SettingRow
              icon="volume-high"
              title="Sound Effects"
              subtitle="Button and interaction sounds"
              value={preferences.soundEffects}
              onToggle={() => togglePreference('soundEffects')}
            />
            <SettingRow
              icon="vibrate"
              title="Vibration"
              subtitle="Haptic feedback"
              value={preferences.vibration}
              onToggle={() => togglePreference('vibration')}
            />
          </View>
        </View>

        {/* Save Button */}
        <View style={styles.buttonContainer}>
          <LargeButton
            title="Save Preferences"
            onPress={handleSave}
            icon="content-save"
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral.background,
  },
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
  backButton: {
    padding: spacing.sm,
  },
  headerTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.neutral.black,
  },
  placeholder: {
    width: 44,
  },
  content: {
    flex: 1,
  },
  section: {
    padding: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.neutral.black,
    marginBottom: spacing.md,
  },
  languageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  languageCard: {
    width: '31%',
    padding: spacing.md,
    backgroundColor: colors.neutral.white,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.neutral.lightGray,
  },
  languageSelected: {
    backgroundColor: colors.primary.main,
    borderColor: colors.primary.main,
  },
  languageNative: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.neutral.black,
  },
  languageTextSelected: {
    color: colors.neutral.white,
  },
  languageName: {
    fontSize: typography.sizes.sm,
    color: colors.neutral.gray,
    marginTop: 4,
  },
  languageNameSelected: {
    color: colors.neutral.white,
  },
  checkIcon: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  settingsCard: {
    backgroundColor: colors.neutral.white,
    borderRadius: 16,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.lightGray,
  },
  settingIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary.light,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  settingTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.medium,
    color: colors.neutral.black,
  },
  settingSubtitle: {
    fontSize: typography.sizes.sm,
    color: colors.neutral.gray,
    marginTop: 2,
  },
  buttonContainer: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
});

export default PreferencesScreen;
