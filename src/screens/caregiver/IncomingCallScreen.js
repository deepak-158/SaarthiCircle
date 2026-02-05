// Incoming Call Screen for Volunteers/Caregivers
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, typography, spacing, borderRadius, shadows } from '../../theme';
import socketService, { getSocket, acceptVoiceCall } from '../../services/socketService';
import { useChat } from '../../context/ChatContext';

const IncomingCallScreen = ({ navigation, route }) => {
  const { conversationId, callerId, callerName } = route.params || {};
  const { setCallActive } = useChat();
  const { t } = useTranslation();
  const [currentUserId, setCurrentUserId] = useState(null);

  useEffect(() => {
    const loadUserId = async () => {
      try {
        const profileJson = await AsyncStorage.getItem('userProfile');
        const profile = profileJson ? JSON.parse(profileJson) : null;
        const uid = profile?.id || profile?.uid || profile?.userId;
        setCurrentUserId(uid);
      } catch (e) {
        console.error('Error loading user profile:', e);
      }
    };
    loadUserId();
  }, []);

  const handleAcceptCall = () => {
    if (!conversationId || !callerId || !currentUserId) {
      console.error('Missing call data');
      return;
    }

    // Accept the call via socket
    acceptVoiceCall({
      conversationId,
      callerId,
      calleeId: currentUserId,
    });

    // Navigate to VoiceCallScreen
    navigation.replace('VoiceCall', {
      conversationId,
      callerId,
      calleeId: currentUserId,
      isIncoming: true,
    });
  };

  const handleRejectCall = () => {
    const socket = getSocket();
    if (socket) {
      socket.emit('call:reject', {
        conversationId,
        callerId,
        calleeId: currentUserId,
      });
    }
    navigation.goBack();
  };

  return (
    <LinearGradient
      colors={[colors.primary.light, colors.secondary.cream]}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          {/* Caller Info */}
          <View style={styles.infoSection}>
            <MaterialCommunityIcons
              name="phone-incoming"
              size={80}
              color={colors.secondary.green}
            />
            <Text style={styles.callerName}>{callerName || 'Unknown Caller'}</Text>
            <Text style={styles.incomingText}>is calling...</Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonsSection}>
            <TouchableOpacity
              style={[styles.button, styles.acceptButton]}
              onPress={handleAcceptCall}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons
                name="phone"
                size={36}
                color={colors.neutral.white}
              />
              <Text style={styles.buttonText}>Accept</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.rejectButton]}
              onPress={handleRejectCall}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons
                name="phone-hangup"
                size={36}
                color={colors.neutral.white}
              />
              <Text style={styles.buttonText}>Reject</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  infoSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  callerName: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
    color: colors.neutral.darkGray,
    marginTop: spacing.lg,
  },
  incomingText: {
    fontSize: typography.sizes.lg,
    color: colors.neutral.gray,
    marginTop: spacing.md,
  },
  buttonsSection: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginBottom: spacing.xl,
  },
  button: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.lg,
  },
  acceptButton: {
    backgroundColor: colors.secondary.green,
  },
  rejectButton: {
    backgroundColor: colors.danger.main,
  },
  buttonText: {
    color: colors.neutral.white,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    marginTop: spacing.xs,
  },
});

export default IncomingCallScreen;
