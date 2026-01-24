// Health Information Screen
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, typography, spacing } from '../../theme';
import { AccessibleInput, LargeButton, LargeCard } from '../../components/common';
import { BACKEND_URL as API_BASE } from '../../config/backend';

const HealthInfoScreen = ({ navigation }) => {
  const [healthData, setHealthData] = useState({
    bloodGroup: '',
    allergies: '',
    medications: '',
    conditions: [],
    doctorName: '',
    doctorPhone: '',
    hospitalName: '',
  });
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadHealthInfo();
  }, []);

  const loadHealthInfo = async () => {
    try {
      setLoading(true);
      
      // First, try to fetch from backend
      try {
        const token = await AsyncStorage.getItem('userToken');
        if (token) {
          const resp = await fetch(`${API_BASE}/me`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
          });

          if (resp.ok) {
            const result = await resp.json();
            const profile = result.profile || result.user || {};
            
            if (profile.health_info) {
              setHealthData({
                bloodGroup: profile.health_info.bloodGroup || '',
                allergies: profile.health_info.allergies || '',
                medications: profile.health_info.medications || '',
                conditions: profile.health_info.conditions || [],
                doctorName: profile.health_info.doctorName || '',
                doctorPhone: profile.health_info.doctorPhone || '',
                hospitalName: profile.health_info.hospitalName || '',
              });
              return; // Successfully loaded from backend
            }
          }
        }
      } catch (backendError) {
        console.warn('Error fetching from backend, falling back to local storage:', backendError);
      }
      
      // Fallback to AsyncStorage
      const healthJson = await AsyncStorage.getItem('healthInfo');
      if (healthJson) {
        const parsedHealth = JSON.parse(healthJson);
        setHealthData({
          bloodGroup: parsedHealth.bloodGroup || '',
          allergies: parsedHealth.allergies || '',
          medications: parsedHealth.medications || '',
          conditions: parsedHealth.conditions || [],
          doctorName: parsedHealth.doctorName || '',
          doctorPhone: parsedHealth.doctorPhone || '',
          hospitalName: parsedHealth.hospitalName || '',
        });
      }
    } catch (error) {
      console.error('Error loading health info:', error);
    } finally {
      setLoading(false);
    }
  };

  const commonConditions = [
    { id: 'diabetes', label: 'Diabetes', icon: '🩸' },
    { id: 'hypertension', label: 'High BP', icon: '❤️' },
    { id: 'heart', label: 'Heart Disease', icon: '💗' },
    { id: 'arthritis', label: 'Arthritis', icon: '🦴' },
    { id: 'asthma', label: 'Asthma', icon: '🫁' },
    { id: 'thyroid', label: 'Thyroid', icon: '🦋' },
  ];

  const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

  const toggleCondition = (id) => {
    setHealthData(prev => ({
      ...prev,
      conditions: prev.conditions.includes(id)
        ? prev.conditions.filter(c => c !== id)
        : [...prev.conditions, id],
    }));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      
      const resp = await fetch(`${API_BASE}/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          health_info: healthData,
        }),
      });

      const result = await resp.json();
      if (!resp.ok) throw new Error(result?.error || 'Failed to save health information');

      // Also save to AsyncStorage as backup
      await AsyncStorage.setItem('healthInfo', JSON.stringify(healthData));
      
      // Update userProfile in AsyncStorage
      try {
        const profileJson = await AsyncStorage.getItem('userProfile');
        if (profileJson) {
          const profile = JSON.parse(profileJson);
          profile.health_info = healthData;
          await AsyncStorage.setItem('userProfile', JSON.stringify(profile));
        }
      } catch (e) {
        console.warn('Failed to update userProfile:', e);
      }
      
      Alert.alert('Saved!', 'Your health information has been updated.');
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving health info:', error);
      Alert.alert('Error', error.message || 'Failed to save health information');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialCommunityIcons 
            name="arrow-left" 
            size={28} 
            color={colors.primary.main} 
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Health Information</Text>
        <TouchableOpacity 
          style={styles.editButton}
          onPress={() => setIsEditing(!isEditing)}
        >
          <MaterialCommunityIcons 
            name={isEditing ? "close" : "pencil"} 
            size={24} 
            color={colors.primary.main} 
          />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {loading && !isEditing && (
          <ActivityIndicator size="large" color={colors.primary.main} style={{ marginTop: 20 }} />
        )}
        {/* Important Note */}
        <View style={styles.noteCard}>
          <MaterialCommunityIcons 
            name="alert-circle" 
            size={24} 
            color={colors.status.warning} 
          />
          <Text style={styles.noteText}>
            This information helps emergency responders provide better care.
          </Text>
        </View>

        {/* Blood Group Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Blood Group</Text>
          <View style={styles.bloodGroupGrid}>
            {bloodGroups.map((group) => (
              <TouchableOpacity
                key={group}
                style={[
                  styles.bloodGroupButton,
                  healthData.bloodGroup === group && styles.bloodGroupSelected,
                ]}
                onPress={() => isEditing && setHealthData({ ...healthData, bloodGroup: group })}
                disabled={!isEditing}
              >
                <Text style={[
                  styles.bloodGroupText,
                  healthData.bloodGroup === group && styles.bloodGroupTextSelected,
                ]}>
                  {group}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Medical Conditions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Medical Conditions</Text>
          <View style={styles.conditionsGrid}>
            {commonConditions.map((condition) => (
              <TouchableOpacity
                key={condition.id}
                style={[
                  styles.conditionCard,
                  healthData.conditions.includes(condition.id) && styles.conditionSelected,
                ]}
                onPress={() => isEditing && toggleCondition(condition.id)}
                disabled={!isEditing}
              >
                <Text style={styles.conditionIcon}>{condition.icon}</Text>
                <Text style={[
                  styles.conditionLabel,
                  healthData.conditions.includes(condition.id) && styles.conditionLabelSelected,
                ]}>
                  {condition.label}
                </Text>
                {healthData.conditions.includes(condition.id) && (
                  <MaterialCommunityIcons 
                    name="check-circle" 
                    size={20} 
                    color={colors.status.success} 
                    style={styles.checkIcon}
                  />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Allergies */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Allergies</Text>
          <AccessibleInput
            value={healthData.allergies}
            onChangeText={(value) => setHealthData({ ...healthData, allergies: value })}
            placeholder="e.g., Penicillin, Peanuts, Dust"
            multiline
            editable={isEditing}
            icon="alert-octagon"
          />
        </View>

        {/* Current Medications */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Current Medications</Text>
          <AccessibleInput
            value={healthData.medications}
            onChangeText={(value) => setHealthData({ ...healthData, medications: value })}
            placeholder="List your current medications"
            multiline
            editable={isEditing}
            icon="pill"
          />
        </View>

        {/* Doctor Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Primary Doctor</Text>
          <AccessibleInput
            label="Doctor's Name"
            value={healthData.doctorName}
            onChangeText={(value) => setHealthData({ ...healthData, doctorName: value })}
            placeholder="Dr. Name"
            editable={isEditing}
            icon="doctor"
          />
          <AccessibleInput
            label="Doctor's Phone"
            value={healthData.doctorPhone}
            onChangeText={(value) => setHealthData({ ...healthData, doctorPhone: value })}
            placeholder="+91 XXXXX XXXXX"
            keyboardType="phone-pad"
            editable={isEditing}
            icon="phone"
          />
          <AccessibleInput
            label="Preferred Hospital"
            value={healthData.hospitalName}
            onChangeText={(value) => setHealthData({ ...healthData, hospitalName: value })}
            placeholder="Hospital name"
            editable={isEditing}
            icon="hospital-building"
          />
        </View>

        {/* Save Button */}
        {isEditing && (
          <View style={styles.buttonContainer}>
            <LargeButton
              title="Save Health Information"
              onPress={handleSave}
              icon="content-save"
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.neutral.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.lightGray,
  },
  backButton: {
    padding: spacing.sm,
  },
  headerTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.neutral.black,
  },
  editButton: {
    padding: spacing.sm,
  },
  content: {
    flex: 1,
  },
  noteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    padding: spacing.md,
    margin: spacing.md,
    borderRadius: 12,
  },
  noteText: {
    flex: 1,
    marginLeft: spacing.sm,
    fontSize: typography.sizes.md,
    color: colors.status.warning,
  },
  section: {
    padding: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.neutral.black,
    marginBottom: spacing.md,
  },
  bloodGroupGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  bloodGroupButton: {
    width: 60,
    height: 50,
    borderRadius: 12,
    backgroundColor: colors.neutral.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.neutral.lightGray,
  },
  bloodGroupSelected: {
    backgroundColor: colors.primary.main,
    borderColor: colors.primary.main,
  },
  bloodGroupText: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.neutral.gray,
  },
  bloodGroupTextSelected: {
    color: colors.neutral.white,
  },
  conditionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  conditionCard: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.neutral.white,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.neutral.lightGray,
  },
  conditionSelected: {
    borderColor: colors.status.success,
    backgroundColor: '#E8F5E9',
  },
  conditionIcon: {
    fontSize: 24,
    marginRight: spacing.sm,
  },
  conditionLabel: {
    flex: 1,
    fontSize: typography.sizes.md,
    color: colors.neutral.gray,
  },
  conditionLabelSelected: {
    color: colors.neutral.black,
    fontWeight: typography.weights.medium,
  },
  checkIcon: {
    marginLeft: spacing.xs,
  },
  buttonContainer: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
});

export default HealthInfoScreen;
