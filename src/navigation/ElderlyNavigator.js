// Navigation - Elderly User Stack
import React from 'react';
import { View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import {
  HomeScreen,
  CompanionMatchingScreen,
  ChatScreen,
  HelpCategoriesScreen,
  VoiceHelpInputScreen,
  HelpProcessingScreen,
  HelpStatusScreen,
  SOSScreen,
  MoodCheckInScreen,
  ProfileScreen,
  PersonalInfoScreen,
  EmergencyContactsScreen,
  HealthInfoScreen,
  PreferencesScreen,
  HelpSupportScreen,
} from '../screens/elderly';

import { colors, typography, spacing } from '../theme';
import { ActiveSessionOverlay, ActiveChatOverlay } from '../components/common';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Tab Navigator for main elderly screens
const ElderlyTabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          height: 70,
          paddingBottom: spacing.sm,
          paddingTop: spacing.sm,
          backgroundColor: colors.neutral.white,
          borderTopColor: colors.neutral.lightGray,
          borderTopWidth: 1,
        },
        tabBarActiveTintColor: colors.primary.main,
        tabBarInactiveTintColor: colors.neutral.gray,
        tabBarLabelStyle: {
          fontSize: typography.sizes.sm,
          fontWeight: typography.weights.medium,
        },
      }}
    >
      <Tab.Screen 
        name="HomeTab" 
        component={HomeScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="home" color={color} size={28} />
          ),
        }}
      />
      <Tab.Screen 
        name="CompanionTab" 
        component={CompanionMatchingScreen}
        options={{
          tabBarLabel: 'Companion',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="account-heart" color={color} size={28} />
          ),
        }}
      />
      <Tab.Screen 
        name="HelpTab" 
        component={HelpCategoriesScreen}
        options={{
          tabBarLabel: 'Help',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="hand-heart" color={color} size={28} />
          ),
        }}
      />
      <Tab.Screen 
        name="MoodTab" 
        component={MoodCheckInScreen}
        options={{
          tabBarLabel: 'Mood',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="emoticon" color={color} size={28} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

const ElderlyMainScreen = () => {
  return (
    <View style={{ flex: 1 }}>
      <ElderlyTabNavigator />
      <ActiveSessionOverlay />
      <ActiveChatOverlay />
    </View>
  );
};

// Stack Navigator wrapping tabs for modal screens
const ElderlyNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="ElderlyMain" component={ElderlyMainScreen} />
      <Stack.Screen name="CompanionMatching" component={CompanionMatchingScreen} />
      <Stack.Screen name="Chat" component={ChatScreen} />
      <Stack.Screen name="HelpCategories" component={HelpCategoriesScreen} />
      <Stack.Screen name="VoiceHelpInput" component={VoiceHelpInputScreen} />
      <Stack.Screen name="HelpProcessing" component={HelpProcessingScreen} />
      <Stack.Screen name="HelpStatus" component={HelpStatusScreen} />
      <Stack.Screen 
        name="SOS" 
        component={SOSScreen}
        options={{
          animation: 'fade',
          presentation: 'fullScreenModal',
        }}
      />
      <Stack.Screen name="MoodCheckIn" component={MoodCheckInScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="PersonalInfo" component={PersonalInfoScreen} />
      <Stack.Screen name="EmergencyContacts" component={EmergencyContactsScreen} />
      <Stack.Screen name="HealthInfo" component={HealthInfoScreen} />
      <Stack.Screen name="Preferences" component={PreferencesScreen} />
      <Stack.Screen name="HelpSupport" component={HelpSupportScreen} />
    </Stack.Navigator>
  );
};

export default ElderlyNavigator;
