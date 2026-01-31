import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import {
  SuperAdminHomeScreen,
  SuperAdminAdminsScreen,
  SuperAdminNgoRequestsScreen,
  SuperAdminEscalationsScreen,
  SuperAdminAuditLogsScreen,
} from '../screens/superadmin';

const Stack = createNativeStackNavigator();

const SuperAdminNavigator = () => {
  return (
    <Stack.Navigator
      initialRouteName="SuperAdminHome"
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="SuperAdminHome" component={SuperAdminHomeScreen} />
      <Stack.Screen name="SuperAdminAdmins" component={SuperAdminAdminsScreen} />
      <Stack.Screen name="SuperAdminNgoRequests" component={SuperAdminNgoRequestsScreen} />
      <Stack.Screen name="SuperAdminEscalations" component={SuperAdminEscalationsScreen} />
      <Stack.Screen name="SuperAdminAuditLogs" component={SuperAdminAuditLogsScreen} />
    </Stack.Navigator>
  );
};

export default SuperAdminNavigator;
