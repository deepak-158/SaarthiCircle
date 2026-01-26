// Navigation - NGO Stack
import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, spacing, typography } from '../theme';

import NGODashboardScreen from '../screens/ngo/NGODashboardScreen';
import NGOOpenRequestsScreen from '../screens/ngo/NGOOpenRequestsScreen';
import NGOEmergencyAlertsScreen from '../screens/ngo/NGOEmergencyAlertsScreen';
import NGOVolunteersScreen from '../screens/ngo/NGOVolunteersScreen';
import NGOCaseHistoryScreen from '../screens/ngo/NGOCaseHistoryScreen';
import NGOProfileScreen from '../screens/ngo/NGOProfileScreen';

const Tab = createBottomTabNavigator();

const NGONavigator = ({ navigation }) => {
  const [profile, setProfile] = React.useState(null);

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const profileJson = await AsyncStorage.getItem('userProfile');
        const parsed = profileJson ? JSON.parse(profileJson) : null;
        if (mounted) setProfile(parsed);
      } catch {
        if (mounted) setProfile(null);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const handleLogout = async () => {
    await AsyncStorage.multiRemove(['userToken', 'userRole', 'userProfile']);
    try {
      navigation?.reset?.({ index: 0, routes: [{ name: 'Auth', params: { screen: 'Login' } }] });
    } catch {
      // ignore
    }
  };

  const ngoName = profile?.name || profile?.ngo_name || profile?.full_name || 'NGO';
  const verified = profile?.is_verified === true || profile?.verified === true;
  const regions = Array.isArray(profile?.ngo_regions)
    ? profile.ngo_regions
    : Array.isArray(profile?.regions)
    ? profile.regions
    : [];

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle} numberOfLines={1}>{ngoName}</Text>
          <View style={styles.headerMetaRow}>
            {verified && (
              <View style={styles.verifiedBadge}>
                <MaterialCommunityIcons name="check-decagram" size={14} color={colors.secondary.green} />
                <Text style={styles.verifiedText}>Verified</Text>
              </View>
            )}
            <Text style={styles.regionsText} numberOfLines={1}>
              {regions.length ? regions.join(', ') : 'No regions assigned'}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={async () => {
            await handleLogout();
          }}
        >
          <MaterialCommunityIcons name="logout" size={22} color={colors.neutral.black} />
        </TouchableOpacity>
      </View>

      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: colors.primary.main,
          tabBarInactiveTintColor: colors.neutral.gray,
          tabBarStyle: { backgroundColor: colors.neutral.white, borderTopColor: colors.neutral.lightGray },
          tabBarIcon: ({ color, size }) => {
            const name = (() => {
              switch (route.name) {
                case 'Dashboard':
                  return 'view-dashboard';
                case 'Requests':
                  return 'alert-circle-outline';
                case 'Emergencies':
                  return 'alarm-light';
                case 'Volunteers':
                  return 'account-group';
                case 'History':
                  return 'clipboard-text-clock';
                case 'Profile':
                  return 'account-circle';
                default:
                  return 'circle';
              }
            })();
            return <MaterialCommunityIcons name={name} size={size} color={color} />;
          },
        })}
      >
        <Tab.Screen name="Dashboard" component={NGODashboardScreen} />
        <Tab.Screen name="Requests" component={NGOOpenRequestsScreen} />
        <Tab.Screen name="Emergencies" component={NGOEmergencyAlertsScreen} />
        <Tab.Screen name="Volunteers" component={NGOVolunteersScreen} />
        <Tab.Screen name="History" component={NGOCaseHistoryScreen} />
        <Tab.Screen name="Profile" component={NGOProfileScreen} />
      </Tab.Navigator>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.neutral.white },
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.lightGray,
    backgroundColor: colors.neutral.white,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  headerLeft: { flex: 1 },
  headerTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.neutral.black,
  },
  headerMetaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2, gap: spacing.sm },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.secondary.green + '15',
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: 999,
    gap: 4,
  },
  verifiedText: { fontSize: typography.sizes.xs, color: colors.secondary.green, fontWeight: typography.weights.semiBold },
  regionsText: { flex: 1, fontSize: typography.sizes.xs, color: colors.neutral.darkGray },
  logoutBtn: {
    padding: spacing.sm,
    borderRadius: 999,
    backgroundColor: colors.neutral.lightGray,
  },
});

export default NGONavigator;
