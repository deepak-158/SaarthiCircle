// Login Screen with Phone Number + OTP Authentication
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, typography, spacing } from '../../theme';
import {
  getUserByPhone,
  isAdminPhone,
  USER_ROLES,
  ensureAdminExists,
} from '../../config/firebase';

// Sample OTP for testing (in production, use real SMS service)
const SAMPLE_OTP = '123456';

const LoginScreen = ({ navigation }) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [loading, setLoading] = useState(false);

  const formatPhoneNumber = (text) => {
    const cleaned = text.replace(/\D/g, '');
    return cleaned.slice(0, 10);
  };

  const handleSendOtp = async () => {
    if (phoneNumber.length !== 10) {
      Alert.alert('Invalid Number', 'Please enter a valid 10-digit mobile number');
      return;
    }

    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setShowOtpInput(true);
      Alert.alert(
        'OTP Sent!', 
        `Demo OTP: ${SAMPLE_OTP}\n\nIn production, OTP will be sent via SMS.`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) {
      Alert.alert('Invalid OTP', 'Please enter the 6-digit OTP');
      return;
    }

    if (otp !== SAMPLE_OTP) {
      Alert.alert('Wrong OTP', 'The OTP you entered is incorrect. Try: 123456');
      return;
    }

    setLoading(true);
    try {
      const fullPhoneNumber = '+91' + phoneNumber;
      
      // Check if admin phone
      if (isAdminPhone(fullPhoneNumber)) {
        // Ensure admin is registered in Firebase
        const adminProfile = await ensureAdminExists(fullPhoneNumber);
        
        const profileToSave = adminProfile || {
          uid: `admin_${phoneNumber}`,
          phone: fullPhoneNumber,
          role: USER_ROLES.ADMIN,
          isApproved: true,
          isActive: true,
          fullName: 'Admin',
        };
        
        await saveUserSession(profileToSave, USER_ROLES.ADMIN);
        navigation.reset({
          index: 0,
          routes: [{ name: 'AdminApp' }],
        });
        return;
      }

      // Check if user exists in database
      const userProfile = await getUserByPhone(fullPhoneNumber);
      
      if (!userProfile) {
        // New user - need to register
        Alert.alert(
          'Welcome!',
          'You are new here. Please register to continue.',
          [
            {
              text: 'Register as Senior',
              onPress: () => navigation.navigate('Register', { 
                phone: fullPhoneNumber,
                role: USER_ROLES.ELDERLY 
              }),
            },
            {
              text: 'Register as Volunteer',
              onPress: () => navigation.navigate('Register', { 
                phone: fullPhoneNumber,
                role: USER_ROLES.VOLUNTEER 
              }),
            },
            { text: 'Cancel', style: 'cancel' },
          ]
        );
        return;
      }

      // Existing user - check role and approval status
      if (userProfile.role === USER_ROLES.VOLUNTEER && !userProfile.isApproved) {
        Alert.alert(
          'Pending Approval',
          'Your volunteer registration is pending admin approval. Please wait for approval.',
          [{ text: 'OK' }]
        );
        return;
      }

      if (!userProfile.isActive) {
        Alert.alert(
          'Account Inactive',
          'Your account has been deactivated. Please contact support.',
          [{ text: 'OK' }]
        );
        return;
      }

      await saveUserSession(userProfile, userProfile.role);
      navigateByRole(userProfile.role);

    } catch (error) {
      console.error('Login error:', error);
      Alert.alert('Error', 'Failed to login. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const saveUserSession = async (profile, role) => {
    await AsyncStorage.setItem('userToken', profile.uid || profile.id);
    await AsyncStorage.setItem('userRole', role);
    await AsyncStorage.setItem('userProfile', JSON.stringify(profile));
  };

  const navigateByRole = (role) => {
    switch (role) {
      case USER_ROLES.ADMIN:
        navigation.reset({ index: 0, routes: [{ name: 'AdminApp' }] });
        break;
      case USER_ROLES.VOLUNTEER:
        navigation.reset({ index: 0, routes: [{ name: 'CaregiverApp' }] });
        break;
      case USER_ROLES.ELDERLY:
      default:
        navigation.reset({ index: 0, routes: [{ name: 'ElderlyApp' }] });
        break;
    }
  };

  const handleDemoLogin = async (role) => {
    setLoading(true);
    try {
      const demoProfile = {
        uid: `demo_${role}_${Date.now()}`,
        phone: '+919999999999',
        displayName: role === USER_ROLES.ADMIN ? 'Admin' : role === USER_ROLES.VOLUNTEER ? 'Volunteer' : 'Senior',
        role,
        isApproved: true,
        isActive: true,
      };
      await saveUserSession(demoProfile, role);
      navigateByRole(role);
    } catch (error) {
      Alert.alert('Error', 'Demo login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={[colors.primary.light, colors.neutral.white]}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView 
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* Logo */}
            <View style={styles.logoContainer}>
              <View style={styles.logoCircle}>
                <MaterialCommunityIcons name="hand-heart" size={60} color={colors.primary.main} />
              </View>
              <Text style={styles.appName}>SaathiCircle</Text>
              <Text style={styles.tagline}>साथी सर्कल</Text>
              <Text style={styles.subtitle}>Companionship for Seniors</Text>
            </View>

            {/* Phone/OTP Input */}
            <View style={styles.inputContainer}>
              {!showOtpInput ? (
                <>
                  <Text style={styles.inputLabel}>Enter Mobile Number</Text>
                  <View style={styles.phoneInputRow}>
                    <View style={styles.countryCode}>
                      <Text style={styles.countryCodeText}>+91</Text>
                    </View>
                    <TextInput
                      style={styles.phoneInput}
                      placeholder="10-digit mobile number"
                      placeholderTextColor={colors.neutral.gray}
                      keyboardType="phone-pad"
                      maxLength={10}
                      value={phoneNumber}
                      onChangeText={(text) => setPhoneNumber(formatPhoneNumber(text))}
                    />
                  </View>
                  
                  <TouchableOpacity
                    style={[styles.primaryButton, phoneNumber.length !== 10 && styles.buttonDisabled]}
                    onPress={handleSendOtp}
                    disabled={loading || phoneNumber.length !== 10}
                  >
                    {loading ? (
                      <ActivityIndicator color={colors.neutral.white} size="small" />
                    ) : (
                      <Text style={styles.primaryButtonText}>Send OTP</Text>
                    )}
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <Text style={styles.inputLabel}>Enter OTP</Text>
                  <Text style={styles.otpSentText}>OTP sent to +91 {phoneNumber}</Text>
                  
                  <TextInput
                    style={styles.otpInput}
                    placeholder="Enter 6-digit OTP"
                    placeholderTextColor={colors.neutral.gray}
                    keyboardType="number-pad"
                    maxLength={6}
                    value={otp}
                    onChangeText={(text) => setOtp(text.replace(/\D/g, ''))}
                  />

                  <Text style={styles.demoOtpHint}>Demo OTP: 123456</Text>
                  
                  <TouchableOpacity
                    style={[styles.primaryButton, otp.length !== 6 && styles.buttonDisabled]}
                    onPress={handleVerifyOtp}
                    disabled={loading || otp.length !== 6}
                  >
                    {loading ? (
                      <ActivityIndicator color={colors.neutral.white} size="small" />
                    ) : (
                      <Text style={styles.primaryButtonText}>Verify & Login</Text>
                    )}
                  </TouchableOpacity>

                  <View style={styles.otpActions}>
                    <TouchableOpacity onPress={() => { setOtp(''); handleSendOtp(); }}>
                      <Text style={styles.linkText}>Resend OTP</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => { setShowOtpInput(false); setOtp(''); }}>
                      <Text style={styles.linkText}>Change Number</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>

            {/* Demo Mode */}
            <View style={styles.demoSection}>
              <Text style={styles.orText}>─────  or try demo mode  ─────</Text>
              <View style={styles.demoButtons}>
                <TouchableOpacity
                  style={[styles.demoButton, { backgroundColor: colors.primary.main }]}
                  onPress={() => handleDemoLogin(USER_ROLES.ELDERLY)}
                  disabled={loading}
                >
                  <MaterialCommunityIcons name="account" size={24} color={colors.neutral.white} />
                  <Text style={styles.demoButtonText}>Senior</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.demoButton, { backgroundColor: '#4CAF50' }]}
                  onPress={() => handleDemoLogin(USER_ROLES.VOLUNTEER)}
                  disabled={loading}
                >
                  <MaterialCommunityIcons name="hand-heart" size={24} color={colors.neutral.white} />
                  <Text style={styles.demoButtonText}>Volunteer</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.demoButton, { backgroundColor: '#FF6B35' }]}
                  onPress={() => handleDemoLogin(USER_ROLES.ADMIN)}
                  disabled={loading}
                >
                  <MaterialCommunityIcons name="shield-account" size={24} color={colors.neutral.white} />
                  <Text style={styles.demoButtonText}>Admin</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.footer}>
              <Text style={styles.footerText}>By continuing, you agree to our Terms of Service</Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  keyboardView: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  logoContainer: { alignItems: 'center', marginTop: spacing.xxl, marginBottom: spacing.xl },
  logoCircle: {
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: colors.neutral.white,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, shadowRadius: 8, elevation: 8,
  },
  appName: { fontSize: 32, fontWeight: 'bold', color: colors.primary.main, marginTop: spacing.md },
  tagline: { fontSize: 20, color: colors.primary.dark, marginTop: spacing.xs },
  subtitle: { fontSize: 16, color: colors.neutral.gray, marginTop: spacing.xs },
  inputContainer: {
    backgroundColor: colors.neutral.white, borderRadius: 20, padding: spacing.lg,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 4, elevation: 4,
  },
  inputLabel: { fontSize: 18, fontWeight: '600', color: colors.neutral.black, marginBottom: spacing.md, textAlign: 'center' },
  phoneInputRow: { flexDirection: 'row', marginBottom: spacing.md },
  countryCode: {
    backgroundColor: colors.neutral.lightGray, paddingHorizontal: spacing.md,
    justifyContent: 'center', borderRadius: 12, marginRight: spacing.sm,
  },
  countryCodeText: { fontSize: 18, fontWeight: '600', color: colors.neutral.black },
  phoneInput: {
    flex: 1, backgroundColor: colors.neutral.lightGray, borderRadius: 12,
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
    fontSize: 18, color: colors.neutral.black,
  },
  otpInput: {
    backgroundColor: colors.neutral.lightGray, borderRadius: 12,
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
    fontSize: 24, color: colors.neutral.black, textAlign: 'center',
    letterSpacing: 8, marginBottom: spacing.sm,
  },
  otpSentText: { fontSize: 14, color: colors.neutral.gray, textAlign: 'center', marginBottom: spacing.md },
  demoOtpHint: { fontSize: 12, color: '#4CAF50', textAlign: 'center', marginBottom: spacing.md, fontStyle: 'italic' },
  primaryButton: { backgroundColor: colors.primary.main, borderRadius: 12, paddingVertical: spacing.md, alignItems: 'center', marginTop: spacing.sm },
  buttonDisabled: { backgroundColor: colors.neutral.gray, opacity: 0.6 },
  primaryButtonText: { color: colors.neutral.white, fontSize: 18, fontWeight: '600' },
  otpActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.md },
  linkText: { color: colors.primary.main, fontSize: 14, fontWeight: '500' },
  demoSection: { marginTop: spacing.xl },
  orText: { color: colors.neutral.gray, textAlign: 'center', marginBottom: spacing.md, fontSize: 14 },
  demoButtons: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  demoButton: { flex: 1, paddingVertical: spacing.md, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  demoButtonText: { color: colors.neutral.white, fontSize: 12, fontWeight: '600', marginTop: 4 },
  footer: { marginTop: spacing.xl, alignItems: 'center' },
  footerText: { fontSize: 12, color: colors.neutral.gray, textAlign: 'center' },
});

export default LoginScreen;
