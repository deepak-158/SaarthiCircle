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
import { BACKEND_URL } from '../../config/backend';
import { login as authLogin } from '../../services/authService';

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('credentials');

  const formatPhoneNumber = (text) => {
    const cleaned = text.replace(/\D/g, '');
    return cleaned.slice(0, 10);
  };

  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const handleSendOtp = async () => {
    if (!email.trim() || !validateEmail(email)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address');
      return;
    }

    if (phone.length !== 10) {
      Alert.alert('Invalid Phone', 'Please enter a valid 10-digit phone number');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          phone: `+91${phone}`,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        Alert.alert('Error', data.message || 'Failed to send OTP');
        return;
      }

      setShowOtpInput(true);
      setStep('otp');
      Alert.alert('OTP Sent', `OTP has been sent to ${email}`, [{ text: 'OK' }]);
    } catch (error) {
      console.error('Send OTP error:', error);
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

    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          phone: `+91${phone}`,
          token: otp,
        }),
      });

    const data = await response.json();

    if (!response.ok) {
      Alert.alert('Error', data.message || 'Invalid OTP');
      return;
    }

    if (data.access_token) {
      const role = data.user?.role;
      await authLogin(data.access_token, role || 'user', data.user || {});

      // If user has no role, redirect to Register screen
      if (!role) {
        navigation.reset({
          index: 0,
          routes: [{ 
            name: 'Register', 
            params: { 
              email: email.trim(), 
              phone: `+91${phone}`, 
              token: data.access_token 
            } 
          }],
        });
      } else {
        if (role === 'admin') {
          navigation.reset({ index: 0, routes: [{ name: 'AdminApp' }] });
        } else if (role === 'volunteer') {
          navigation.reset({ index: 0, routes: [{ name: 'CaregiverApp' }] });
        } else if (role === 'volunteer_pending') {
          navigation.reset({ index: 0, routes: [{ name: 'VolunteerPending' }] });
        } else if (role === 'elderly') {
          navigation.reset({ index: 0, routes: [{ name: 'ElderlyApp' }] });
        } else {
          // Default fallback
          navigation.reset({ index: 0, routes: [{ name: 'Auth' }] });
        }
      }
    }
    } catch (error) {
      console.error('Verify OTP error:', error);
      Alert.alert('Error', 'Failed to verify OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (role) => {
    setLoading(true);
    try {
      const demoProfile = {
        token: `demo_${role}_${Date.now()}`,
        user: {
          id: `demo_${role}_${Date.now()}`,
          email: `demo_${role}@saathicircle.com`,
          phone: '+919999999999',
          displayName: role === 'admin' ? 'Admin' : role === 'volunteer' ? 'Volunteer' : 'Senior',
          role,
        },
      };
      
      await authLogin(demoProfile.token, role, demoProfile.user);

      if (role === 'admin') {
        navigation.reset({ index: 0, routes: [{ name: 'AdminApp' }] });
      } else if (role === 'volunteer') {
        navigation.reset({ index: 0, routes: [{ name: 'CaregiverApp' }] });
      } else if (role === 'elderly') {
        navigation.reset({ index: 0, routes: [{ name: 'ElderlyApp' }] });
      }
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
            <View style={styles.logoContainer}>
              <View style={styles.logoCircle}>
                <MaterialCommunityIcons name="hand-heart" size={60} color={colors.primary.main} />
              </View>
              <Text style={styles.appName}>SaathiCircle</Text>
              <Text style={styles.tagline}>साथी सर्कल</Text>
              <Text style={styles.subtitle}>Companionship for Seniors</Text>
            </View>

            <View style={styles.inputContainer}>
              {!showOtpInput ? (
                <>
                  <Text style={styles.inputLabel}>Login / Register</Text>
                  
                  <View style={styles.inputGroup}>
                    <Text style={styles.fieldLabel}>Email Address</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="your@email.com"
                      placeholderTextColor={colors.neutral.gray}
                      keyboardType="email-address"
                      value={email}
                      onChangeText={setEmail}
                      editable={!loading}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.fieldLabel}>Phone Number</Text>
                    <View style={styles.phoneInputRow}>
                      <View style={styles.countryCode}>
                        <Text style={styles.countryCodeText}>+91</Text>
                      </View>
                      <TextInput
                        style={styles.phoneInput}
                        placeholder="10-digit number"
                        placeholderTextColor={colors.neutral.gray}
                        keyboardType="phone-pad"
                        maxLength={10}
                        value={phone}
                        onChangeText={(text) => setPhone(formatPhoneNumber(text))}
                        editable={!loading}
                      />
                    </View>
                  </View>
                  
                  <TouchableOpacity
                    style={[
                      styles.primaryButton,
                      (!email || !validateEmail(email) || phone.length !== 10) && styles.buttonDisabled
                    ]}
                    onPress={handleSendOtp}
                    disabled={loading || !email || !validateEmail(email) || phone.length !== 10}
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
                  <Text style={styles.otpSentText}>OTP sent to {email}</Text>
                  
                  <TextInput
                    style={styles.otpInput}
                    placeholder="Enter 6-digit OTP"
                    placeholderTextColor={colors.neutral.gray}
                    keyboardType="number-pad"
                    maxLength={6}
                    value={otp}
                    onChangeText={(text) => setOtp(text.replace(/\D/g, ''))}
                    editable={!loading}
                  />
                  
                  <TouchableOpacity
                    style={[styles.primaryButton, otp.length !== 6 && styles.buttonDisabled]}
                    onPress={handleVerifyOtp}
                    disabled={loading || otp.length !== 6}
                  >
                    {loading ? (
                      <ActivityIndicator color={colors.neutral.white} size="small" />
                    ) : (
                      <Text style={styles.primaryButtonText}>Verify & Continue</Text>
                    )}
                  </TouchableOpacity>

                  <View style={styles.otpActions}>
                    <TouchableOpacity onPress={() => { setOtp(''); handleSendOtp(); }}>
                      <Text style={styles.linkText}>Resend OTP</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => { setShowOtpInput(false); setOtp(''); }}>
                      <Text style={styles.linkText}>Change Email/Phone</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}

              <TouchableOpacity 
                style={styles.registerLink} 
                onPress={() => navigation.navigate('Register')}
              >
                <Text style={styles.registerLinkText}>
                  Don't have an account? <Text style={styles.registerLinkHighlight}>Register</Text>
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.demoSection}>
              <Text style={styles.orText}>─────  or try demo mode  ─────</Text>
              <View style={styles.demoButtons}>
                <TouchableOpacity
                  style={[styles.demoButton, { backgroundColor: colors.primary.main }]}
                  onPress={() => handleDemoLogin('elderly')}
                  disabled={loading}
                >
                  <MaterialCommunityIcons name="account" size={24} color={colors.neutral.white} />
                  <Text style={styles.demoButtonText}>Senior</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.demoButton, { backgroundColor: '#4CAF50' }]}
                  onPress={() => handleDemoLogin('volunteer')}
                  disabled={loading}
                >
                  <MaterialCommunityIcons name="hand-heart" size={24} color={colors.neutral.white} />
                  <Text style={styles.demoButtonText}>Volunteer</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.demoButton, { backgroundColor: '#FF6B35' }]}
                  onPress={() => handleDemoLogin('admin')}
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
  inputGroup: { marginBottom: spacing.md },
  fieldLabel: { fontSize: 14, fontWeight: '500', color: colors.neutral.darkGray, marginBottom: spacing.xs },
  input: {
    backgroundColor: colors.neutral.lightGray, borderRadius: 12,
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
    fontSize: 16, color: colors.neutral.black,
  },
  phoneInputRow: { flexDirection: 'row', marginBottom: spacing.md },
  countryCode: {
    backgroundColor: colors.neutral.lightGray, paddingHorizontal: spacing.md,
    justifyContent: 'center', borderRadius: 12, marginRight: spacing.sm,
  },
  countryCodeText: { fontSize: 18, fontWeight: '600', color: colors.neutral.black },
  phoneInput: {
    flex: 1, backgroundColor: colors.neutral.lightGray, borderRadius: 12,
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
    fontSize: 16, color: colors.neutral.black,
  },
  otpInput: {
    backgroundColor: colors.neutral.lightGray, borderRadius: 12,
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
    fontSize: 24, color: colors.neutral.black, textAlign: 'center',
    letterSpacing: 8, marginBottom: spacing.sm,
  },
  otpSentText: { fontSize: 14, color: colors.neutral.gray, textAlign: 'center', marginBottom: spacing.md },
  primaryButton: { backgroundColor: colors.primary.main, borderRadius: 12, paddingVertical: spacing.md, alignItems: 'center', marginTop: spacing.sm },
  buttonDisabled: { backgroundColor: colors.neutral.gray, opacity: 0.6 },
  primaryButtonText: { color: colors.neutral.white, fontSize: 18, fontWeight: '600' },
  otpActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.md },
  linkText: { color: colors.primary.main, fontSize: 14, fontWeight: '500' },
  registerLink: { marginTop: spacing.lg, alignItems: 'center' },
  registerLinkText: { fontSize: 14, color: colors.neutral.darkGray },
  registerLinkHighlight: { color: colors.primary.main, fontWeight: '600' },
  demoSection: { marginTop: spacing.xl },
  orText: { color: colors.neutral.gray, textAlign: 'center', marginBottom: spacing.md, fontSize: 14 },
  demoButtons: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  demoButton: { flex: 1, paddingVertical: spacing.md, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  demoButtonText: { color: colors.neutral.white, fontSize: 12, fontWeight: '600', marginTop: 4 },
  footer: { marginTop: spacing.xl, alignItems: 'center' },
  footerText: { fontSize: 12, color: colors.neutral.gray, textAlign: 'center' },
});

export default LoginScreen;
