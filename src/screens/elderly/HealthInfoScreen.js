// Health Information Screen
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, typography, spacing } from '../../theme';
import { AccessibleInput, LargeButton, LargeCard } from '../../components/common';

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

  const handleSave = () => {
    Alert.alert('Saved!', 'Your health information has been updated.');
    setIsEditing(false);
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
