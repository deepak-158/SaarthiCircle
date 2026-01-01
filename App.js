// SaathiCircle - AI-Powered Companionship & Help Platform for Seniors
// Main App Entry Point

import React, { useState, useEffect } from 'react';
import { StatusBar, LogBox, View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Navigators
import {
  AuthNavigator,
  ElderlyNavigator,
  CaregiverNavigator,
  AdminNavigator,
} from './src/navigation';

// Config - Updated to use Firebase
import { USER_ROLES, subscribeToAuthState, getUserProfile } from './src/config/firebase';
import { colors } from './src/theme';

// Ignore specific warnings
LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
  'AsyncStorage has been extracted from react-native core',
]);

const RootStack = createNativeStackNavigator();

const App = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    async function prepare() {
      try {
        // Check auth status
        await checkAuthStatus();
      } catch (e) {
        console.warn('Error loading resources:', e);
      } finally {
        setIsLoading(false);
      }
    }

    prepare();
    
    // Subscribe to Firebase auth state changes
    const unsubscribe = subscribeToAuthState(async (user) => {
      if (user) {
        try {
          const profile = await getUserProfile(user.uid);
          if (profile && profile.isApproved) {
            setIsAuthenticated(true);
            setUserRole(profile.role);
            await AsyncStorage.setItem('userRole', profile.role);
          }
        } catch (error) {
          console.log('Auth state change error:', error);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const checkAuthStatus = async () => {
    try {
      // Check if user is logged in
      const userToken = await AsyncStorage.getItem('userToken');
      const storedRole = await AsyncStorage.getItem('userRole');
      
      if (userToken && storedRole) {
        setIsAuthenticated(true);
        setUserRole(storedRole);
      }
    } catch (error) {
      console.error('Auth check error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Get the appropriate navigator based on user role
  const getNavigatorForRole = () => {
    switch (userRole) {
      case USER_ROLES.ELDERLY:
        return <RootStack.Screen name="ElderlyApp" component={ElderlyNavigator} />;
      case USER_ROLES.VOLUNTEER:
        return <RootStack.Screen name="CaregiverApp" component={CaregiverNavigator} />;
      case USER_ROLES.ADMIN:
        return <RootStack.Screen name="AdminApp" component={AdminNavigator} />;
      default:
        return <RootStack.Screen name="Auth" component={AuthNavigator} />;
    }
  };

  // Show loading screen
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary.main} />
        <Text style={styles.loadingText}>Loading SaathiCircle...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <StatusBar 
        barStyle="dark-content" 
        backgroundColor={colors.neutral.white}
      />
      <NavigationContainer>
        <RootStack.Navigator
          initialRouteName="Auth"
          screenOptions={{
            headerShown: false,
            animation: 'fade',
          }}
        >
          {/* Auth Navigator */}
          <RootStack.Screen name="Auth" component={AuthNavigator} />
          
          {/* Main App Navigators - Always accessible */}
          <RootStack.Screen 
            name="ElderlyApp" 
            component={ElderlyNavigator}
            options={{ animation: 'slide_from_right' }}
          />
          <RootStack.Screen 
            name="CaregiverApp" 
            component={CaregiverNavigator}
            options={{ animation: 'slide_from_right' }}
          />
          <RootStack.Screen 
            name="AdminApp" 
            component={AdminNavigator}
            options={{ animation: 'slide_from_right' }}
          />
        </RootStack.Navigator>
      </NavigationContainer>
    </View>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.neutral.white,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 18,
    color: colors.primary.main,
    fontWeight: '500',
  },
});

export default App;
