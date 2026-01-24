import React, { useState, useEffect } from 'react';
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

const USER_ROLES = {
  ELDERLY: 'elderly',
  VOLUNTEER: 'volunteer',
};

const RegisterScreen = ({ navigation, route }) => {
  const [email, setEmail] = useState(route.params?.email || '');
  const [phone, setPhone] = useState(route.params?.phone || '');
  const [token, setToken] = useState(route.params?.token || '');
  const [role, setRole] = useState(null);

  useEffect(() => {
    async function getStoredData() {
      console.log('[DEBUG] RegisterScreen initial route params:', route.params);
      
      const storedToken = await AsyncStorage.getItem('userToken');
      const storedProfile = await AsyncStorage.getItem('userProfile');
      
      if (route.params?.token) {
        console.log('[DEBUG] Token found in route params');
        setToken(route.params.token);
      } else if (storedToken) {
        console.log('[DEBUG] Token found in AsyncStorage');
        setToken(storedToken);
      } else {
        console.warn('[DEBUG] No token found in params or storage');
      }

      if (storedProfile) {
        const profile = JSON.parse(storedProfile);
        if (profile.email && !email) setEmail(profile.email);
        if (profile.phone && !phone) setPhone(profile.phone);
      }
    }
    getStoredData();
  }, [route.params]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    age: '',
    city: '',
    address: '',
    gender: 'male',
    skills: '',
    whyVolunteer: '',
  });

  const isVolunteer = role === USER_ROLES.VOLUNTEER;

  const updateForm = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    if (!formData.fullName.trim()) {
      Alert.alert('Required', 'Please enter your full name');
      return false;
    }
    if (!formData.age.trim() || isNaN(formData.age)) {
      Alert.alert('Required', 'Please enter a valid age');
      return false;
    }
    if (!formData.city.trim()) {
      Alert.alert('Required', 'Please enter your city');
      return false;
    }
    if (isVolunteer && !formData.skills.trim()) {
      Alert.alert('Required', 'Please enter your skills');
      return false;
    }
    return true;
  };

  const handleRegister = async () => {
    if (!role) {
      Alert.alert('Required', 'Please select a role');
      return;
    }

    if (!validateForm()) return;

    setLoading(true);
    try {
      const payload = {
        email: email.trim(),
        phone: phone,
        role: role,
        full_name: formData.fullName.trim(),
        age: parseInt(formData.age),
        city: formData.city.trim(),
        address: formData.address.trim(),
        gender: formData.gender,
      };

      if (isVolunteer) {
        payload.skills = formData.skills.split(',').map(s => s.trim()).filter(Boolean);
        payload.why_volunteer = formData.whyVolunteer.trim();
      }

      const endpoint = isVolunteer ? '/register/volunteer' : '/register/senior';
      console.log(`[DEBUG] Attempting POST to ${BACKEND_URL}${endpoint}`);
      console.log(`[DEBUG] Token being used: ${token ? 'Token exists' : 'Token is MISSING'}`);
      
      const response = await fetch(`${BACKEND_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      console.log(`[DEBUG] Response status: ${response.status}`);
      const data = await response.json();
      console.log(`[DEBUG] Response data:`, data);

      if (!response.ok) {
        Alert.alert('Error', data.error || data.message || 'Failed to register');
        return;
      }

      await authLogin(token, role, data.user || {});

      if (isVolunteer) {
        Alert.alert(
          'Registration Submitted',
          'Your volunteer application has been submitted and is pending admin approval.',
          [
            { text: 'OK', onPress: () => navigation.reset({ index: 0, routes: [{ name: 'VolunteerPending' }] }) },
          ]
        );
      } else {
        navigation.reset({
          index: 0,
          routes: [{ name: 'ElderlyApp' }],
        });
      }
    } catch (error) {
      console.error('Registration error:', error);
      Alert.alert('Error', 'Failed to register. Please try again.');
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
            <View style={styles.header}>
              <TouchableOpacity 
                style={styles.backButton}
                onPress={() => navigation.goBack()}
              >
                <MaterialCommunityIcons name="arrow-left" size={28} color={colors.primary.main} />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Complete Registration</Text>
            </View>

            {!role ? (
              <>
                <View style={styles.roleSelectionContainer}>
                  <Text style={styles.roleTitle}>Select Your Role</Text>
                  
                  <TouchableOpacity
                    style={[styles.roleCard, styles.elderlyCard]}
                    onPress={() => setRole(USER_ROLES.ELDERLY)}
                  >
                    <MaterialCommunityIcons name="account" size={48} color={colors.primary.main} />
                    <Text style={styles.roleCardTitle}>Senior</Text>
                    <Text style={styles.roleCardDesc}>I am looking for companionship and support</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.roleCard, styles.volunteerCard]}
                    onPress={() => setRole(USER_ROLES.VOLUNTEER)}
                  >
                    <MaterialCommunityIcons name="hand-heart" size={48} color="#4CAF50" />
                    <Text style={[styles.roleCardTitle, { color: '#4CAF50' }]}>Volunteer</Text>
                    <Text style={styles.roleCardDesc}>I want to help and support seniors</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <View style={styles.roleBadge}>
                  <MaterialCommunityIcons 
                    name={isVolunteer ? 'hand-heart' : 'account'} 
                    size={24} 
                    color={colors.neutral.white} 
                  />
                  <Text style={styles.roleBadgeText}>
                    {isVolunteer ? 'Volunteer Registration' : 'Senior Registration'}
                  </Text>
                </View>

                <View style={styles.formContainer}>
                  <Text style={styles.sectionTitle}>Personal Information</Text>
                  
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Full Name *</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Enter your full name"
                      placeholderTextColor={colors.neutral.gray}
                      value={formData.fullName}
                      onChangeText={(text) => updateForm('fullName', text)}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Age *</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Enter your age"
                      placeholderTextColor={colors.neutral.gray}
                      keyboardType="number-pad"
                      maxLength={3}
                      value={formData.age}
                      onChangeText={(text) => updateForm('age', text.replace(/\D/g, ''))}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Gender *</Text>
                    <View style={styles.genderContainer}>
                      <TouchableOpacity 
                        style={[styles.genderButton, formData.gender === 'male' && styles.genderButtonActive]}
                        onPress={() => updateForm('gender', 'male')}
                      >
                        <MaterialCommunityIcons 
                          name="human-male" 
                          size={20} 
                          color={formData.gender === 'male' ? colors.neutral.white : colors.neutral.gray} 
                        />
                        <Text style={[styles.genderButtonText, formData.gender === 'male' && styles.genderButtonTextActive]}>
                          Male
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={[styles.genderButton, formData.gender === 'female' && styles.genderButtonActive]}
                        onPress={() => updateForm('gender', 'female')}
                      >
                        <MaterialCommunityIcons 
                          name="human-female" 
                          size={20} 
                          color={formData.gender === 'female' ? colors.neutral.white : colors.neutral.gray} 
                        />
                        <Text style={[styles.genderButtonText, formData.gender === 'female' && styles.genderButtonTextActive]}>
                          Female
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>City *</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Enter your city"
                      placeholderTextColor={colors.neutral.gray}
                      value={formData.city}
                      onChangeText={(text) => updateForm('city', text)}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Address</Text>
                    <TextInput
                      style={[styles.input, styles.textArea]}
                      placeholder="Enter your address (optional)"
                      placeholderTextColor={colors.neutral.gray}
                      multiline
                      numberOfLines={2}
                      value={formData.address}
                      onChangeText={(text) => updateForm('address', text)}
                    />
                  </View>

                  {isVolunteer && (
                    <>
                      <Text style={[styles.sectionTitle, { marginTop: spacing.lg }]}>
                        Volunteer Information
                      </Text>
                      
                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Skills * (comma separated)</Text>
                        <TextInput
                          style={styles.input}
                          placeholder="e.g., Grocery Shopping, Healthcare, Tech Help"
                          placeholderTextColor={colors.neutral.gray}
                          value={formData.skills}
                          onChangeText={(text) => updateForm('skills', text)}
                        />
                      </View>

                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Why do you want to volunteer?</Text>
                        <TextInput
                          style={[styles.input, styles.textArea]}
                          placeholder="Share your motivation..."
                          placeholderTextColor={colors.neutral.gray}
                          multiline
                          numberOfLines={3}
                          value={formData.whyVolunteer}
                          onChangeText={(text) => updateForm('whyVolunteer', text)}
                        />
                      </View>

                      <View style={styles.infoBox}>
                        <MaterialCommunityIcons name="information" size={20} color="#E65100" />
                        <Text style={styles.infoText}>
                          Volunteer registrations require admin approval. You'll be notified once approved.
                        </Text>
                      </View>
                    </>
                  )}

                  <View style={styles.buttonContainer}>
                    <TouchableOpacity 
                      style={styles.backRoleButton}
                      onPress={() => setRole(null)}
                    >
                      <Text style={styles.backRoleButtonText}>Back</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={styles.submitButton}
                      onPress={handleRegister}
                      disabled={loading}
                    >
                      {loading ? (
                        <ActivityIndicator color={colors.neutral.white} size="small" />
                      ) : (
                        <Text style={styles.submitButtonText}>
                          {isVolunteer ? 'Submit Application' : 'Complete Registration'}
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              </>
            )}
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
  scrollContent: { flexGrow: 1, paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  backButton: { padding: spacing.sm },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.primary.main,
    marginLeft: spacing.sm,
  },
  roleSelectionContainer: {
    flex: 1,
    justifyContent: 'center',
    marginVertical: spacing.xl,
  },
  roleTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.neutral.black,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  roleCard: {
    backgroundColor: colors.neutral.white,
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.md,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  elderlyCard: {
    borderWidth: 2,
    borderColor: colors.primary.main,
  },
  volunteerCard: {
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  roleCardTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.primary.main,
    marginTop: spacing.md,
  },
  roleCardDesc: {
    fontSize: 14,
    color: colors.neutral.gray,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary.main,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: 20,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  roleBadgeText: {
    color: colors.neutral.white,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: spacing.sm,
  },
  formContainer: {
    backgroundColor: colors.neutral.white,
    borderRadius: 20,
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.neutral.black,
    marginBottom: spacing.md,
  },
  inputGroup: { marginBottom: spacing.md },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.neutral.darkGray,
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: colors.neutral.lightGray,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 16,
    color: colors.neutral.black,
  },
  genderContainer: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  genderButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.neutral.lightGray,
    paddingVertical: spacing.md,
    borderRadius: 12,
    gap: spacing.xs,
  },
  genderButtonActive: {
    backgroundColor: colors.primary.main,
  },
  genderButtonText: {
    fontSize: 16,
    color: colors.neutral.gray,
    fontWeight: '500',
  },
  genderButtonTextActive: {
    color: colors.neutral.white,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFF3E0',
    padding: spacing.md,
    borderRadius: 12,
    marginTop: spacing.md,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#E65100',
    marginLeft: spacing.sm,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  backRoleButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  backRoleButtonText: {
    color: colors.neutral.darkGray,
    fontSize: 16,
    fontWeight: '500',
  },
  submitButton: {
    flex: 1,
    backgroundColor: colors.primary.main,
    borderRadius: 12,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  submitButtonText: {
    color: colors.neutral.white,
    fontSize: 18,
    fontWeight: '600',
  },
});

export default RegisterScreen;
