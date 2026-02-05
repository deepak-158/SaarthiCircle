// Profile Screen for Elderly Users
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import { colors, typography, spacing } from '../../theme';
import { LargeButton, LargeCard } from '../../components/common';
import { logout } from '../../services/authService';

import { BACKEND_URL as API_BASE } from '../../config/backend';

// Default profile data for display
const DEFAULT_USER = {
  fullName: 'Guest User',
  full_name: 'Guest User',
  phone: '+91 XXXXX XXXXX',
  city: 'Not set',
  age: null,
  language: 'English',
  emergencyContact: 'Not set',
  avatar_emoji: '🧑',
};

const ProfileScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const [user, setUser] = useState(DEFAULT_USER);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
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
            setUser({ ...DEFAULT_USER, ...userData });
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
        const profile = JSON.parse(profileJson);
        if (!profile.full_name && profile.name) {
          profile.full_name = profile.name;
        }
        setUser({
          ...DEFAULT_USER,
          ...profile,
        });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
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
            // App.js will handle navigation reset via state change
          },
        },
      ]
    );
  };

  const menuItems = [
    {
      id: 'personal',
      title: t('profile.personalInfo'),
      icon: 'account-circle',
      subtitle: t('profile.fields.fullName') + ', ' + t('profile.fields.phone'),
      screen: 'PersonalInfo',
    },
    {
      id: 'emergency',
      title: t('profile.emergencyContacts'),
      icon: 'phone-alert',
      subtitle: t('profile.fields.contactDetails'),
      screen: 'EmergencyContacts',
    },
    {
      id: 'health',
      title: t('profile.healthInfo'),
      icon: 'heart-pulse',
      subtitle: t('profile.fields.age'),
      screen: 'HealthInfo',
    },
    {
      id: 'preferences',
      title: t('profile.preferences'),
      icon: 'cog',
      subtitle: t('profile.fields.address'),
      screen: 'Preferences',
    },
    {
      id: 'help',
      title: t('profile.helpSupport'),
      icon: 'help-circle',
      subtitle: 'FAQs, contact support',
      screen: 'HelpSupport',
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
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
          <Text style={styles.headerTitle}>{t('profile.title')}</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <Text style={{ fontSize: 72 }}>{user.avatar_emoji || '🧑'}</Text>
          </View>
          <Text style={styles.userName}>{user.full_name || user.name || user.fullName}</Text>
          <Text style={styles.userPhone}>{user.phone}</Text>
          {user.city && user.city !== 'Not set' && (
            <Text style={styles.userLocation}>📍 {user.city}</Text>
          )}
          {user.age && (
            <Text style={styles.userAge}>{user.age} {t('profile.fields.age')}</Text>
          )}
        </View>

        {/* Menu Items */}
        <View style={styles.menuContainer}>
          {menuItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.menuItem}
              onPress={() => navigation.navigate(item.screen)}
            >
              <View style={styles.menuIconContainer}>
                <MaterialCommunityIcons
                  name={item.icon}
                  size={28}
                  color={colors.primary.main}
                />
              </View>
              <View style={styles.menuTextContainer}>
                <Text style={styles.menuTitle}>{item.title}</Text>
                <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
              </View>
              <MaterialCommunityIcons
                name="chevron-right"
                size={24}
                color={colors.neutral.gray}
              />
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout Button */}
        <View style={styles.logoutContainer}>
          <LargeButton
            title={t('profile.logout')}
            onPress={handleLogout}
            variant="outline"
            icon="logout"
          />
        </View>

        {/* App Version */}
        <Text style={styles.versionText}>{t('profile.version', { version: '1.0.0' })}</Text>
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
  profileCard: {
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: colors.neutral.white,
    marginBottom: spacing.md,
  },
  avatarContainer: {
    marginBottom: spacing.md,
  },
  userName: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
    color: colors.neutral.black,
    marginBottom: spacing.xs,
  },
  userPhone: {
    fontSize: typography.sizes.lg,
    color: colors.neutral.gray,
  },
  userLocation: {
    fontSize: typography.sizes.md,
    color: colors.primary.main,
    marginTop: spacing.xs,
  },
  userAge: {
    fontSize: typography.sizes.md,
    color: colors.neutral.darkGray,
    marginTop: spacing.xs,
  },
  menuContainer: {
    backgroundColor: colors.neutral.white,
    marginBottom: spacing.md,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.lightGray,
  },
  menuIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary.light,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  menuTextContainer: {
    flex: 1,
  },
  menuTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.medium,
    color: colors.neutral.black,
    marginBottom: spacing.xs,
  },
  menuSubtitle: {
    fontSize: typography.sizes.md,
    color: colors.neutral.gray,
  },
  logoutContainer: {
    padding: spacing.lg,
  },
  versionText: {
    textAlign: 'center',
    fontSize: typography.sizes.sm,
    color: colors.neutral.gray,
    marginBottom: spacing.xl,
  },
});

export default ProfileScreen;
