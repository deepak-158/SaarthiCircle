import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, typography, spacing } from '../../theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BACKEND_URL } from '../../config/backend';

const NGOPendingScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    await AsyncStorage.multiRemove(['userToken', 'userRole', 'userProfile']);
    navigation.reset({
      index: 0,
      routes: [{ name: 'Login' }],
    });
  };

  const checkStatus = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        handleLogout();
        return;
      }

      const response = await fetch(`${BACKEND_URL}/auth/check-ngo-status`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          handleLogout();
          return;
        }
        throw new Error('Failed to fetch status');
      }

      const data = await response.json();
      const user = data.user;

      if (user && user.role) {
        await AsyncStorage.setItem('userRole', user.role);
        await AsyncStorage.setItem('userProfile', JSON.stringify(user));

        if (user.role === 'ngo') {
          Alert.alert('Approved!', 'Your NGO has been approved. You can now access the NGO dashboard.', [
            { text: 'Continue', onPress: () => navigation.reset({ index: 0, routes: [{ name: 'Splash' }] }) },
          ]);
        } else if (user.role === 'ngo_rejected' || user.isActive === false) {
          Alert.alert('Application Status', 'Your NGO application was not approved at this time.', [
            { text: 'OK', onPress: handleLogout },
          ]);
        } else {
          Alert.alert('Still Pending', 'Your NGO application is still under review. Please check back later.');
        }
      }
    } catch (error) {
      console.error('Check NGO status error:', error);
      Alert.alert('Error', 'Could not check status. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={[colors.primary.light, colors.neutral.white]} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <MaterialCommunityIcons name="office-building-clock" size={80} color={colors.primary.main} />
          </View>

          <Text style={styles.title}>NGO Application Pending</Text>
          <Text style={styles.subtitle}>Your NGO verification is currently being reviewed by the admin.</Text>

          <View style={styles.infoBox}>
            <MaterialCommunityIcons name="information" size={24} color={colors.primary.main} />
            <Text style={styles.infoText}>
              Pending NGOs cannot access the NGO dashboard or view requests until approved.
            </Text>
          </View>

          <TouchableOpacity style={styles.refreshButton} onPress={checkStatus} disabled={loading}>
            {loading ? (
              <ActivityIndicator color={colors.neutral.white} size="small" />
            ) : (
              <>
                <MaterialCommunityIcons name="refresh" size={20} color={colors.neutral.white} />
                <Text style={styles.refreshButtonText}>Check Status</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} disabled={loading}>
            <Text style={styles.logoutButtonText}>Log Out</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  content: {
    flex: 1,
    padding: spacing.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: colors.neutral.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: colors.neutral.black,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: colors.neutral.gray,
    textAlign: 'center',
    marginBottom: spacing.xxl,
    lineHeight: 24,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: colors.primary.light + '40',
    padding: spacing.lg,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  infoText: {
    flex: 1,
    marginLeft: spacing.md,
    fontSize: 15,
    color: colors.primary.dark,
    lineHeight: 22,
  },
  refreshButton: {
    flexDirection: 'row',
    backgroundColor: colors.primary.main,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxl,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  refreshButtonText: {
    color: colors.neutral.white,
    fontSize: 18,
    fontWeight: '600',
    marginLeft: spacing.sm,
  },
  logoutButton: { padding: spacing.md },
  logoutButtonText: {
    color: colors.neutral.gray,
    fontSize: 16,
    fontWeight: '500',
  },
});

export default NGOPendingScreen;
