// Navigation - Admin Stack
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import {
  AdminHomeScreen,
  AIRiskDashboardScreen,
  IncidentManagementScreen,
  AnalyticsScreen,
  VolunteerApprovalScreen,
  UserManagementScreen,
  AdminProfileScreen,
  AdminNotificationsScreen,
} from '../screens/admin';

const Stack = createNativeStackNavigator();

const AdminNavigator = () => {
  return (
    <Stack.Navigator
      initialRouteName="AdminHome"
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="AdminHome" component={AdminHomeScreen} />
      <Stack.Screen name="AIRiskDashboard" component={AIRiskDashboardScreen} />
      <Stack.Screen name="IncidentManagement" component={IncidentManagementScreen} />
      <Stack.Screen name="Analytics" component={AnalyticsScreen} />
      <Stack.Screen name="VolunteerApproval" component={VolunteerApprovalScreen} />
      <Stack.Screen name="UserManagement" component={UserManagementScreen} />
      <Stack.Screen name="AdminProfile" component={AdminProfileScreen} />
      <Stack.Screen name="Notifications" component={AdminNotificationsScreen} />
    </Stack.Navigator>
  );
};

export default AdminNavigator;
