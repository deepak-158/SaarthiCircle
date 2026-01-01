// Accessible Input Component with Large Text
import React from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  StyleSheet 
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, typography, borderRadius, spacing } from '../../theme';

const AccessibleInput = ({
  label,
  value,
  onChangeText,
  placeholder,
  icon,
  keyboardType = 'default',
  secureTextEntry = false,
  multiline = false,
  numberOfLines = 1,
  error,
  disabled = false,
  style,
  inputStyle,
}) => {
  return (
    <View style={[styles.container, style]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View
        style={[
          styles.inputContainer,
          error && styles.inputError,
          disabled && styles.inputDisabled,
        ]}
      >
        {icon && (
          <MaterialCommunityIcons
            name={icon}
            size={28}
            color={colors.neutral.darkGray}
            style={styles.icon}
          />
        )}
        <TextInput
          style={[
            styles.input,
            multiline && styles.multilineInput,
            inputStyle,
          ]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.neutral.darkGray}
          keyboardType={keyboardType}
          secureTextEntry={secureTextEntry}
          multiline={multiline}
          numberOfLines={numberOfLines}
          editable={!disabled}
          accessibilityLabel={label}
        />
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: spacing.md,
  },
  label: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.medium,
    color: colors.neutral.black,
    marginBottom: spacing.sm,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral.white,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.neutral.mediumGray,
    paddingHorizontal: spacing.md,
    minHeight: 60,
  },
  inputError: {
    borderColor: colors.status.error,
  },
  inputDisabled: {
    backgroundColor: colors.neutral.lightGray,
    opacity: 0.7,
  },
  icon: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: typography.sizes.lg,
    color: colors.neutral.black,
    paddingVertical: spacing.md,
  },
  multilineInput: {
    textAlignVertical: 'top',
    minHeight: 120,
  },
  errorText: {
    fontSize: typography.sizes.sm,
    color: colors.status.error,
    marginTop: spacing.xs,
  },
});

export default AccessibleInput;
