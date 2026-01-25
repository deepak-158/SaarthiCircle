// Navigation - Caregiver Stack
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import {
  CaregiverDashboard,
  CaregiverInteractionScreen,
  SOSAlertsScreen,
  VolunteerProfileScreen,
  IncomingCallScreen,
} from '../screens/caregiver';
import VolunteerSessionScreen from '../screens/caregiver/VolunteerSessionScreen';
import ChatScreen from '../screens/elderly/ChatScreen';
import { VoiceCallScreen } from '../screens/elderly';

const Stack = createNativeStackNavigator();

const CaregiverNavigator = () => {
  return (
    <Stack.Navigator
      initialRouteName="CaregiverDashboard"
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="CaregiverDashboard" component={CaregiverDashboard} />
      <Stack.Screen name="VolunteerSession" component={VolunteerSessionScreen} />
      <Stack.Screen name="Chat" component={ChatScreen} />
      <Stack.Screen 
        name="IncomingCall" 
        component={IncomingCallScreen}
        options={{
          animation: 'slide_from_bottom',
          presentation: 'fullScreenModal',
        }}
      />
      <Stack.Screen 
        name="VoiceCall" 
        component={VoiceCallScreen}
        options={{
          animation: 'slide_from_bottom',
          presentation: 'fullScreenModal',
        }}
      />
      <Stack.Screen name="CaregiverInteraction" component={CaregiverInteractionScreen} />
      <Stack.Screen 
        name="SOSAlerts" 
        component={SOSAlertsScreen}
        options={{
          animation: 'fade',
        }}
      />
      <Stack.Screen 
        name="VolunteerProfile" 
        component={VolunteerProfileScreen}
        options={{
          animation: 'slide_from_right',
        }}
      />
    </Stack.Navigator>
  );
};

export default CaregiverNavigator;
