// Volunteer Session Screen - brings a volunteer online and waits for a match
import React, { useEffect, useState, useRef } from 'react';
import { View, Text, SafeAreaView, StyleSheet, TouchableOpacity, ActivityIndicator, Animated } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius, shadows } from '../../theme';
import { ActiveChatOverlay } from '../../components/common';
import { useChat } from '../../context/ChatContext';
import socketService, { getSocket, identify } from '../../services/socketService';

const VolunteerSessionScreen = ({ navigation }) => {
  const [isOnline, setIsOnline] = useState(false);
  const [userId, setUserId] = useState(null);
  const [pendingSeniorId, setPendingSeniorId] = useState(null);
  const [pendingRequestType, setPendingRequestType] = useState('chat');
  const [pendingNote, setPendingNote] = useState('');
  const { activeChats } = useChat();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const isOnlineRef = useRef(false);

  useEffect(() => {
    isOnlineRef.current = isOnline;
  }, [isOnline]);

  useEffect(() => {
    (async () => {
      try {
        const profileJson = await AsyncStorage.getItem('userProfile');
        const profile = profileJson ? JSON.parse(profileJson) : null;
        const id = profile?.id || profile?.uid || profile?.userId;
        setUserId(id);
      } catch {}
    })();
  }, []);

  useEffect(() => {
    const socket = getSocket();

    socket.off('session:started');
    socket.on('session:started', ({ conversationId, seniorId, volunteerId }) => {
      if (!isOnlineRef.current) return;
      navigation.navigate('Chat', { mode: 'text', companion: { id: seniorId, isReal: true }, conversationId });
    });

    socket.off('seeker:incoming');
    socket.on('seeker:incoming', ({ seniorId, requestType = 'chat', note = '' }) => {
      if (!isOnlineRef.current) return;
      setPendingSeniorId((prev) => prev || seniorId);
      setPendingRequestType((prev) => prev || requestType);
      setPendingNote((prev) => prev || note);
    });

    socket.off('request:claimed');
    socket.on('request:claimed', ({ seniorId }) => {
      if (pendingSeniorId === seniorId) {
        setPendingSeniorId(null);
        setPendingRequestType('chat');
        setPendingNote('');
      }
    });

    return () => {
      socket.off('session:started');
      socket.off('seeker:incoming');
      socket.off('request:claimed');
    };
  }, [isOnline, navigation]);

  useEffect(() => {
    if (isOnline) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.1, duration: 900, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
        ])
      ).start();
    }
  }, [isOnline]);

  const handleGoOnline = () => {
    if (!userId) return;
    isOnlineRef.current = true;
    setIsOnline(true);
    identify({ userId, role: 'VOLUNTEER' });
  };

  const handleGoOffline = () => {
    setIsOnline(false);
  };

  const handleAccept = () => {
    const socket = getSocket();
    if (pendingSeniorId && userId) {
      socket.emit('volunteer:accept', { seniorId: pendingSeniorId, volunteerId: userId });
      // wait for session:started, clear local placeholder
      setPendingSeniorId(null);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Active Chat Overlay */}
      <ActiveChatOverlay navigation={navigation} activeChats={activeChats} />
      
      <View style={styles.container}>
        <View style={styles.header}>
          <MaterialCommunityIcons name="account-heart" size={48} color={colors.primary.main} />
          <Text style={styles.title}>Volunteer Mode</Text>
          <Text style={styles.subtitle}>Go online to be matched with a senior seeking companionship</Text>
        </View>

        {isOnline ? (
          <View style={styles.statusCard}>
            <Animated.View style={[styles.statusIcon, { transform: [{ scale: pulseAnim }] }]}>
              <MaterialCommunityIcons name="radar" size={40} color={colors.primary.main} />
            </Animated.View>
            <Text style={styles.statusText}>
              {pendingSeniorId ? `Incoming ${pendingRequestType} request...` : 'Waiting for a match...'}
            </Text>
            {pendingNote ? (
              <Text style={{ marginTop: spacing.xs, color: colors.neutral.darkGray }}>{pendingNote}</Text>
            ) : null}
            <ActivityIndicator color={colors.primary.main} style={{ marginTop: spacing.md }} />
            {pendingSeniorId && (
              <TouchableOpacity style={styles.onlineBtn} onPress={handleAccept}>
                <MaterialCommunityIcons name="check" size={24} color={colors.neutral.white} />
                <Text style={styles.onlineBtnText}>
                  {pendingRequestType === 'voice' ? 'Accept Voice Call' : pendingRequestType === 'emotional' ? 'Accept Support Request' : 'Accept Chat'}
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={[styles.offlineBtn]} onPress={handleGoOffline}>
              <MaterialCommunityIcons name="power" size={22} color={colors.neutral.white} />
              <Text style={styles.offlineBtnText}>Go Offline</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.onlineBtn} onPress={handleGoOnline}>
            <MaterialCommunityIcons name="power" size={24} color={colors.neutral.white} />
            <Text style={styles.onlineBtnText}>Go Online</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.neutral.white,
  },
  container: {
    flex: 1,
    padding: spacing.lg,
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  title: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
    color: colors.primary.main,
    marginTop: spacing.sm,
  },
  subtitle: {
    fontSize: typography.sizes.md,
    color: colors.neutral.darkGray,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  statusCard: {
    marginTop: spacing.xl,
    width: '100%',
    backgroundColor: colors.neutral.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    ...shadows.sm,
  },
  statusIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary.light,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusText: {
    fontSize: typography.sizes.lg,
    color: colors.neutral.black,
    marginTop: spacing.md,
  },
  onlineBtn: {
    marginTop: spacing.xxl,
    width: '80%',
    height: 56,
    borderRadius: borderRadius.full,
    backgroundColor: colors.secondary.green,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  onlineBtnText: {
    color: colors.neutral.white,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semiBold,
    marginLeft: spacing.sm,
  },
  offlineBtn: {
    marginTop: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.full,
    backgroundColor: colors.accent.red,
  },
  offlineBtnText: {
    color: colors.neutral.white,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.medium,
    marginLeft: spacing.xs,
  },
});

export default VolunteerSessionScreen;
