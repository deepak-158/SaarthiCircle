// Register Screen with Phone Number Authentication
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
  registerUserByPhone,
  USER_ROLES,
} from '../../config/firebase';

const RegisterScreen = ({ navigation, route }) => {
  const { phone, role } = route.params || {};
  
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    age: '',
    city: '',
    address: '',
    // Volunteer specific
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
    if (!validateForm()) return;

    setLoading(true);
    try {
      const userData = {
        phone,
        fullName: formData.fullName.trim(),
        age: parseInt(formData.age),
        city: formData.city.trim(),
        address: formData.address.trim(),
        role,
        isApproved: role === USER_ROLES.ELDERLY, // Seniors auto-approved
        isActive: true,
      };

      if (isVolunteer) {
        userData.skills = formData.skills.split(',').map(s => s.trim()).filter(s => s);
        userData.whyVolunteer = formData.whyVolunteer.trim();
        userData.helpCount = 0;
        userData.rating = 0;
      }

      const userProfile = await registerUserByPhone(userData);

      if (isVolunteer) {
        Alert.alert(
          'Registration Successful!',
          'Your volunteer application has been submitted. Please wait for admin approval before you can login.',
          [
            {
              text: 'OK',
              onPress: () => navigation.navigate('Login'),
            },
          ]
        );
      } else {
        // Senior - auto login
        await AsyncStorage.setItem('userToken', userProfile.id);
        await AsyncStorage.setItem('userRole', role);
        await AsyncStorage.setItem('userProfile', JSON.stringify(userProfile));
        
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
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity 
                style={styles.backButton}
                onPress={() => navigation.goBack()}
              >
                <MaterialCommunityIcons name="arrow-left" size={28} color={colors.primary.main} />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>
                {isVolunteer ? 'Volunteer Registration' : 'Senior Registration'}
              </Text>
            </View>

            {/* Role Badge */}
            <View style={[styles.roleBadge, isVolunteer && styles.volunteerBadge]}>
              <MaterialCommunityIcons 
                name={isVolunteer ? 'hand-heart' : 'account'} 
                size={24} 
                color={colors.neutral.white} 
              />
              <Text style={styles.roleBadgeText}>
                {isVolunteer ? 'Volunteering to Help' : 'Joining as Senior'}
              </Text>
            </View>

            {/* Phone Display */}
            <View style={styles.phoneDisplay}>
              <MaterialCommunityIcons name="phone" size={20} color={colors.primary.main} />
              <Text style={styles.phoneText}>{phone}</Text>
              <MaterialCommunityIcons name="check-circle" size={20} color="#4CAF50" />
            </View>

            {/* Form */}
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

              {/* Volunteer Specific Fields */}
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

              {/* Submit Button */}
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
  volunteerBadge: { backgroundColor: '#4CAF50' },
  roleBadgeText: {
    color: colors.neutral.white,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: spacing.sm,
  },
  phoneDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.neutral.white,
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.lg,
  },
  phoneText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.neutral.black,
    marginHorizontal: spacing.sm,
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
  submitButton: {
    backgroundColor: colors.primary.main,
    borderRadius: 12,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  submitButtonText: {
    color: colors.neutral.white,
    fontSize: 18,
    fontWeight: '600',
  },
});

export default RegisterScreen;
