// Navigation - Auth Stack
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import {
  LanguageSelectionScreen,
  OnboardingStep1,
  OnboardingStep2,
  OnboardingStep3,
  LoginScreen,
  RegisterScreen,
  VolunteerPendingScreen,
  NGOPendingScreen,
} from '../screens/auth';

const Stack = createNativeStackNavigator();

const AuthNavigator = ({ route }) => {
  const initialRoute = route?.params?.screen || 'Login';
  return (
    <Stack.Navigator
      initialRouteName={initialRoute}
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="LanguageSelection" component={LanguageSelectionScreen} />
      <Stack.Screen name="Onboarding1" component={OnboardingStep1} />
      <Stack.Screen name="Onboarding2" component={OnboardingStep2} />
      <Stack.Screen name="Onboarding3" component={OnboardingStep3} />
      <Stack.Screen name="VolunteerPending" component={VolunteerPendingScreen} />
      <Stack.Screen name="NGOPending" component={NGOPendingScreen} />
    </Stack.Navigator>
  );
};

export default AuthNavigator;
