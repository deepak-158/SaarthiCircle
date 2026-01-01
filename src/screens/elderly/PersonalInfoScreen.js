// Personal Information Screen
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
import { AccessibleInput, LargeButton } from '../../components/common';

const PersonalInfoScreen = ({ navigation }) => {
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    email: '',
    dateOfBirth: '',
    address: '',
    city: '',
    pincode: '',
  });
  const [isEditing, setIsEditing] = useState(false);

  const handleSave = () => {
    Alert.alert('Saved!', 'Your personal information has been updated.');
    setIsEditing(false);
  };

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
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
        <Text style={styles.headerTitle}>Personal Information</Text>
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
        {/* Avatar Section */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarContainer}>
            <MaterialCommunityIcons 
              name="account-circle" 
              size={100} 
              color={colors.primary.main} 
            />
            {isEditing && (
              <TouchableOpacity style={styles.cameraButton}>
                <MaterialCommunityIcons 
                  name="camera" 
                  size={20} 
                  color={colors.neutral.white} 
                />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Form Fields */}
        <View style={styles.formSection}>
          <AccessibleInput
            label="Full Name"
            value={formData.fullName}
            onChangeText={(value) => updateField('fullName', value)}
            placeholder="Enter your full name"
            editable={isEditing}
            icon="account"
          />

          <AccessibleInput
            label="Phone Number"
            value={formData.phone}
            onChangeText={(value) => updateField('phone', value)}
            placeholder="+91 XXXXX XXXXX"
            keyboardType="phone-pad"
            editable={isEditing}
            icon="phone"
          />

          <AccessibleInput
            label="Email (Optional)"
            value={formData.email}
            onChangeText={(value) => updateField('email', value)}
            placeholder="your@email.com"
            keyboardType="email-address"
            editable={isEditing}
            icon="email"
          />

          <AccessibleInput
            label="Date of Birth"
            value={formData.dateOfBirth}
            onChangeText={(value) => updateField('dateOfBirth', value)}
            placeholder="DD/MM/YYYY"
            editable={isEditing}
            icon="calendar"
          />

          <AccessibleInput
            label="Address"
            value={formData.address}
            onChangeText={(value) => updateField('address', value)}
            placeholder="Enter your address"
            multiline
            editable={isEditing}
            icon="home"
          />

          <AccessibleInput
            label="City"
            value={formData.city}
            onChangeText={(value) => updateField('city', value)}
            placeholder="Enter city"
            editable={isEditing}
            icon="city"
          />

          <AccessibleInput
            label="PIN Code"
            value={formData.pincode}
            onChangeText={(value) => updateField('pincode', value)}
            placeholder="XXXXXX"
            keyboardType="number-pad"
            editable={isEditing}
            icon="map-marker"
          />
        </View>

        {/* Save Button */}
        {isEditing && (
          <View style={styles.buttonContainer}>
            <LargeButton
              title="Save Changes"
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
  avatarSection: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    backgroundColor: colors.neutral.white,
  },
  avatarContainer: {
    position: 'relative',
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: colors.primary.main,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.neutral.white,
  },
  formSection: {
    padding: spacing.lg,
  },
  buttonContainer: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
});

export default PersonalInfoScreen;
