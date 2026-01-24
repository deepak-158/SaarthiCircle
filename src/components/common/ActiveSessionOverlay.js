import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Animated 
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useChat } from '../../context/ChatContext';
import { colors, typography, spacing, borderRadius, shadows } from '../../theme';

const ActiveSessionOverlay = () => {
  const navigation = useNavigation();
  const { activeSession, isCallActive, callDuration } = useChat();
  
  // Don't show if no active session
  if (!activeSession) return null;

  // Don't show if we're already on the Chat screen
  const state = navigation.getState();
  const currentRouteName = state?.routes[state.index]?.name;
  if (currentRouteName === 'Chat') return null;

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePress = () => {
    navigation.navigate('Chat', { 
      conversationId: activeSession.conversationId, 
      companion: activeSession.companion,
      mode: isCallActive ? 'voice' : 'text'
    });
  };

  return (
    <TouchableOpacity 
      style={[styles.container, shadows.lg]} 
      onPress={handlePress}
      activeOpacity={0.9}
    >
      <View style={styles.content}>
        <View style={[styles.indicator, isCallActive ? styles.callIndicator : styles.textIndicator]}>
          <MaterialCommunityIcons 
            name={isCallActive ? "phone-in-talk" : "message-text"} 
            size={20} 
            color={colors.neutral.white} 
          />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.title}>
            {isCallActive ? 'Active Call' : 'Active Chat'}
          </Text>
          <Text style={styles.subtitle}>
            {isCallActive ? formatDuration(callDuration) : 'Tap to return to conversation'}
          </Text>
        </View>
        <MaterialCommunityIcons 
          name="chevron-right" 
          size={24} 
          color={colors.neutral.darkGray} 
        />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 90, // Above the bottom tabs
    left: spacing.md,
    right: spacing.md,
    backgroundColor: colors.neutral.white,
    borderRadius: borderRadius.lg,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.neutral.lightGray,
    zIndex: 999,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  indicator: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  callIndicator: {
    backgroundColor: colors.accent.red,
  },
  textIndicator: {
    backgroundColor: colors.primary.main,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.neutral.black,
  },
  subtitle: {
    fontSize: typography.sizes.sm,
    color: colors.neutral.darkGray,
  },
});

export default ActiveSessionOverlay;
