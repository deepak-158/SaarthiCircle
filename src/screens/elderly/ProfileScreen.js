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
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, typography, spacing } from '../../theme';
import { LargeButton, LargeCard } from '../../components/common';

// Default profile data for display
const DEFAULT_USER = {
  fullName: 'Guest User',
  phone: '+91 XXXXX XXXXX',
  city: 'Not set',
  age: null,
  language: 'English',
  emergencyContact: 'Not set',
};

const ProfileScreen = ({ navigation }) => {
  const [user, setUser] = useState(DEFAULT_USER);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      const profileJson = await AsyncStorage.getItem('userProfile');
      if (profileJson) {
        const profile = JSON.parse(profileJson);
        setUser({
          ...DEFAULT_USER,
          ...profile,
          // Format phone for display
          phone: profile.phone || DEFAULT_USER.phone,
          fullName: profile.fullName || DEFAULT_USER.fullName,
        });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.multiRemove(['userToken', 'userRole', 'userProfile']);
            navigation.reset({
              index: 0,
              routes: [{ name: 'Auth' }],
            });
          },
        },
      ]
    );
  };

  const menuItems = [
    {
      id: 'personal',
      title: 'Personal Information',
      icon: 'account-circle',
      subtitle: 'Name, phone, address',
      screen: 'PersonalInfo',
    },
    {
      id: 'emergency',
      title: 'Emergency Contacts',
      icon: 'phone-alert',
      subtitle: 'Add family contacts',
      screen: 'EmergencyContacts',
    },
    {
      id: 'health',
      title: 'Health Information',
      icon: 'heart-pulse',
      subtitle: 'Medical conditions, medications',
      screen: 'HealthInfo',
    },
    {
      id: 'preferences',
      title: 'Preferences',
      icon: 'cog',
      subtitle: 'Language, notifications',
      screen: 'Preferences',
    },
    {
      id: 'help',
      title: 'Help & Support',
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
          <Text style={styles.headerTitle}>Profile</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <MaterialCommunityIcons 
              name="account-circle" 
              size={80} 
              color={colors.primary.main} 
            />
          </View>
          <Text style={styles.userName}>{user.fullName}</Text>
          <Text style={styles.userPhone}>{user.phone}</Text>
          {user.city && user.city !== 'Not set' && (
            <Text style={styles.userLocation}>📍 {user.city}</Text>
          )}
          {user.age && (
            <Text style={styles.userAge}>{user.age} years old</Text>
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
            title="Logout"
            onPress={handleLogout}
            variant="outline"
            icon="logout"
          />
        </View>

        {/* App Version */}
        <Text style={styles.versionText}>SaathiCircle v1.0.0</Text>
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
