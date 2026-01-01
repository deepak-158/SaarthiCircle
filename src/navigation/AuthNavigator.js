// Navigation - Auth Stack
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import {
  SplashScreen,
  LanguageSelectionScreen,
  OnboardingStep1,
  OnboardingStep2,
  OnboardingStep3,
  LoginScreen,
  RegisterScreen,
} from '../screens/auth';

const Stack = createNativeStackNavigator();

const AuthNavigator = () => {
  return (
    <Stack.Navigator
      initialRouteName="Splash"
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="Splash" component={SplashScreen} />
      <Stack.Screen name="LanguageSelection" component={LanguageSelectionScreen} />
      <Stack.Screen name="Onboarding1" component={OnboardingStep1} />
      <Stack.Screen name="Onboarding2" component={OnboardingStep2} />
      <Stack.Screen name="Onboarding3" component={OnboardingStep3} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
};

export default AuthNavigator;
