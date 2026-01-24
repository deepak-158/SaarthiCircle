// Companion Matching Screen
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView,
  ActivityIndicator,
  Animated,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LargeButton, LargeCard, ActiveChatOverlay } from '../../components/common';
import { colors, typography, spacing, borderRadius, shadows } from '../../theme';
import { getTranslation } from '../../i18n/translations';
// Firebase imports removed
import socketService, { getSocket, identify, requestCompanion } from '../../services/socketService';
import { BACKEND_URL as API_BASE } from '../../config/backend';
import { useChat } from '../../context/ChatContext';

// Available companions (dummy + will be combined with real data)
const dummyCompanions = [
  {
    id: 'dummy1',
    fullName: 'Priya Sharma',
    phone: '+91 98765 43210',
    language: 'Hindi, English',
    interests: ['Music', 'Daily Life', 'Stories'],
    availableTime: 'Available Now',
    rating: 4.8,
    helpCount: 45,
    city: 'Delhi',
    isReal: false,
  },
  {
    id: 'dummy2',
    fullName: 'Rajesh Kumar',
    phone: '+91 87654 32109',
    language: 'Hindi, Punjabi',
    interests: ['Health', 'News', 'Family'],
    availableTime: 'Available Now',
    rating: 4.9,
    helpCount: 62,
    city: 'Mumbai',
    isReal: false,
  },
  {
    id: 'dummy3',
    fullName: 'Anita Patel',
    phone: '+91 76543 21098',
    language: 'Gujarati, Hindi, English',
    interests: ['Cooking', 'Gardening', 'Spirituality'],
    availableTime: 'Available in 10 min',
    rating: 4.7,
    helpCount: 38,
    city: 'Ahmedabad',
    isReal: false,
  },
];

// Emergency contacts
const EMERGENCY_CONTACTS = {
  police: '100',
  ambulance: '102',
  women_helpline: '1091',
  senior_citizen: '14567',
  emergency: '112',
};

const CompanionMatchingScreen = ({ navigation }) => {
  const [language] = useState('en');
  const t = getTranslation(language);
  const { startSession, setCallStatus, activeChats } = useChat();
  const [searching, setSearching] = useState(true);
  const [companion, setCompanion] = useState(null);
  const [allCompanions, setAllCompanions] = useState([]);
  const [userProfile, setUserProfile] = useState(null);
  const [conversationId, setConversationId] = useState(null);
  const pulseAnim = React.useRef(new Animated.Value(1)).current;

  useEffect(() => {
    loadUserProfile();
    fetchCompanions();
  }, []);

  // Initialize socket and request a real companion session
  useEffect(() => {
    const initSocket = async () => {
      try {
        const profileJson = await AsyncStorage.getItem('userProfile');
        const profile = profileJson ? JSON.parse(profileJson) : null;
        const userId = profile?.id || profile?.uid || profile?.userId;
        const socket = getSocket();

        socket.off('session:started');
        socket.on('session:started', ({ conversationId: cid, seniorId, volunteerId }) => {
          setConversationId(cid);
          const companionObj = { id: volunteerId, isReal: true };
          setCompanion(companionObj);
          setSearching(false);
          startSession({ conversationId: cid, companion: companionObj });
          navigation.navigate('Chat', { mode: 'text', companion: companionObj, conversationId: cid });
        });

        socket.off('seeker:queued');
        socket.on('seeker:queued', () => {
          setSearching(true);
        });

        if (userId) {
          identify({ userId, role: 'SENIOR' });
          requestCompanion({ seniorId: userId });
        }
      } catch (e) {
        console.error('Socket init error:', e);
      }
    };
    initSocket();
    return () => {
      const socket = getSocket();
      socket.off('session:started');
      socket.off('seeker:queued');
    };
  }, [navigation]);

  useEffect(() => {
    // Pulse animation during search
    if (searching) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [searching]);

  const loadUserProfile = async () => {
    try {
      const profileJson = await AsyncStorage.getItem('userProfile');
      if (profileJson) {
        setUserProfile(JSON.parse(profileJson));
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const fetchCompanions = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch(`${API_BASE}/volunteers/available`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Failed to fetch real volunteers');
      
      const data = await response.json();
      const realCompanions = (data.volunteers || []).map(v => ({
        id: v.id,
        fullName: v.name || v.full_name || 'Friendly Volunteer',
        phone: v.phone || '',
        language: Array.isArray(v.skills) ? v.skills.join(', ') : 'Hindi, English',
        interests: v.skills || ['General Help'],
        availableTime: 'Available Now',
        isReal: true,
        rating: v.rating || 4.5,
      }));

      // Combine real and dummy companions
      const combined = [...realCompanions, ...dummyCompanions];
      setAllCompanions(combined);

      // Select a random companion after delay
      setTimeout(() => {
        const randomIndex = Math.floor(Math.random() * combined.length);
        setCompanion(combined[randomIndex]);
        setSearching(false);
      }, 2500);

    } catch (error) {
      console.error('Error fetching companions:', error);
      // Fallback to dummy data
      setAllCompanions(dummyCompanions);
      setTimeout(() => {
        const randomIndex = Math.floor(Math.random() * dummyCompanions.length);
        setCompanion(dummyCompanions[randomIndex]);
        setSearching(false);
      }, 2500);
    }
  };

  const findAnotherCompanion = () => {
    setSearching(true);
    setCompanion(null);
    
    setTimeout(() => {
      if (allCompanions.length > 0) {
        // Filter out current companion and pick another
        const others = allCompanions.filter(c => c.id !== companion?.id);
        const pool = others.length > 0 ? others : allCompanions;
        const randomIndex = Math.floor(Math.random() * pool.length);
        setCompanion(pool[randomIndex]);
      }
      setSearching(false);
    }, 2000);
  };

  const getOrCreateConversationId = async (selectedCompanion) => {
    if (conversationId) return conversationId;

    const comp = selectedCompanion || companion;
    const cidFromState = conversationId;
    if (cidFromState) return cidFromState;

    const profileJson = await AsyncStorage.getItem('userProfile');
    const profile = profileJson ? JSON.parse(profileJson) : null;
    const seniorId = profile?.id || profile?.uid || profile?.userId;

    const companionId = comp?.id;
    if (!seniorId || !companionId) {
      return `local-${Date.now()}`;
    }

    const isLikelyReal = comp?.isReal && !String(companionId).startsWith('dummy');
    if (!isLikelyReal) {
      return `local-${seniorId}-${companionId}`;
    }

    const resp = await fetch(`${API_BASE}/conversations/find-or-create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ seniorId, companionId }),
    });
    const data = await resp.json();
    const newId = data?.conversation?.id;

    if (!resp.ok || !newId) {
      return `local-${seniorId}-${companionId}`;
    }

    setConversationId(newId);
    return newId;
  };

  const handleVoiceCall = () => {
    (async () => {
      const cid = await getOrCreateConversationId(companion);
      startSession({ conversationId: cid, companion });
      setCallStatus(true);
      navigation.navigate('Chat', { mode: 'voice', companion, conversationId: cid });
    })();
  };

  const handleTextChat = () => {
    (async () => {
      const cid = await getOrCreateConversationId(companion);
      startSession({ conversationId: cid, companion });
      setCallStatus(false);
      navigation.navigate('Chat', { mode: 'text', companion, conversationId: cid });
    })();
  };

  // Emergency SOS Handler
  const handleEmergencySOS = () => {
    navigation.navigate('SOS');
  };

  // Quick Emergency Call
  const handleQuickEmergencyCall = (type) => {
    const number = EMERGENCY_CONTACTS[type];
    Alert.alert(
      'Emergency Call',
      `Call ${type.replace('_', ' ').toUpperCase()} (${number})?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Call Now', 
          style: 'destructive',
          onPress: () => Linking.openURL(`tel:${number}`)
        },
      ]
    );
  };

  if (searching) {
    return (
      <LinearGradient
        colors={[colors.primary.light, colors.secondary.cream]}
        style={styles.container}
      >
        <SafeAreaView style={styles.safeArea}>
          {/* Emergency SOS Button - Always visible */}
          <TouchableOpacity 
            style={styles.sosButtonFloating}
            onPress={handleEmergencySOS}
          >
            <MaterialCommunityIcons name="alarm-light" size={24} color={colors.neutral.white} />
            <Text style={styles.sosButtonText}>SOS</Text>
          </TouchableOpacity>

          <View style={styles.searchingContainer}>
            <Animated.View
              style={[
                styles.searchingCircle,
                { transform: [{ scale: pulseAnim }] },
              ]}
            >
              <MaterialCommunityIcons
                name="account-search"
                size={80}
                color={colors.primary.main}
              />
            </Animated.View>
            <Text style={styles.searchingTitle}>{t.companion.title}</Text>
            <Text style={styles.searchingSubtitle}>
              Please wait a moment...
            </Text>
            <ActivityIndicator 
              size="large" 
              color={colors.primary.main} 
              style={styles.loader}
            />
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={[colors.primary.light, colors.secondary.cream]}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        {/* Active Chat Overlay */}
        <ActiveChatOverlay navigation={navigation} activeChats={activeChats} />
        
        {/* Emergency SOS Button - Always visible */}
        <TouchableOpacity 
          style={styles.sosButtonFloating}
          onPress={handleEmergencySOS}
        >
          <MaterialCommunityIcons name="alarm-light" size={24} color={colors.neutral.white} />
          <Text style={styles.sosButtonText}>SOS</Text>
        </TouchableOpacity>

        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Success Icon */}
          <View style={styles.successIcon}>
            <MaterialCommunityIcons
              name="heart-circle"
              size={80}
              color={colors.accent.orange}
            />
          </View>

          {/* Found Message */}
          <Text style={styles.foundTitle}>🎉</Text>
          <Text style={styles.foundMessage}>{t.companion.foundMessage}</Text>

          {/* Companion Name & Rating */}
          {companion && (
            <View style={styles.companionHeader}>
              <Text style={styles.companionName}>
                {companion.fullName || 'Friendly Volunteer'}
              </Text>
              {companion.rating && (
                <View style={styles.ratingBadge}>
                  <MaterialCommunityIcons name="star" size={16} color="#FFD700" />
                  <Text style={styles.ratingText}>{companion.rating}</Text>
                </View>
              )}
              {companion.isReal && (
                <View style={styles.verifiedBadge}>
                  <MaterialCommunityIcons name="check-decagram" size={16} color="#4CAF50" />
                  <Text style={styles.verifiedText}>Verified</Text>
                </View>
              )}
            </View>
          )}

          {/* Companion Info Cards */}
          <View style={styles.infoCards}>
            <View style={[styles.infoCard, shadows.sm]}>
              <MaterialCommunityIcons
                name="translate"
                size={32}
                color={colors.primary.main}
              />
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>{t.companion.language}</Text>
                <Text style={styles.infoValue}>
                  {companion?.language || 'Hindi, English'}
                </Text>
              </View>
            </View>

            <View style={[styles.infoCard, shadows.sm]}>
              <MaterialCommunityIcons
                name="heart-multiple"
                size={32}
                color={colors.accent.orange}
              />
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>{t.companion.interest}</Text>
                <Text style={styles.infoValue}>
                  {Array.isArray(companion?.interests) 
                    ? companion.interests.join(', ') 
                    : companion?.interest || 'General Support'}
                </Text>
              </View>
            </View>

            <View style={[styles.infoCard, shadows.sm]}>
              <MaterialCommunityIcons
                name="clock-check"
                size={32}
                color={colors.secondary.green}
              />
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>Availability</Text>
                <Text style={[styles.infoValue, styles.availableText]}>
                  {companion?.availableTime || 'Available Now'}
                </Text>
              </View>
            </View>

            {companion?.city && (
              <View style={[styles.infoCard, shadows.sm]}>
                <MaterialCommunityIcons
                  name="map-marker"
                  size={32}
                  color={colors.primary.main}
                />
                <View style={styles.infoTextContainer}>
                  <Text style={styles.infoLabel}>Location</Text>
                  <Text style={styles.infoValue}>{companion.city}</Text>
                </View>
              </View>
            )}

            {companion?.helpCount > 0 && (
              <View style={[styles.infoCard, shadows.sm]}>
                <MaterialCommunityIcons
                  name="hand-heart"
                  size={32}
                  color="#9C27B0"
                />
                <View style={styles.infoTextContainer}>
                  <Text style={styles.infoLabel}>People Helped</Text>
                  <Text style={styles.infoValue}>{companion.helpCount}+ seniors</Text>
                </View>
              </View>
            )}
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <LargeButton
              title={t.companion.voiceCall}
              onPress={handleVoiceCall}
              icon="phone"
              variant="primary"
              size="xl"
              style={styles.callButton}
            />

            <LargeButton
              title={t.companion.textChat}
              onPress={handleTextChat}
              icon="message-text"
              variant="outline"
              size="xl"
              style={styles.chatButton}
            />
          </View>

          {/* Find Another Button */}
          <LargeButton
            title="Find Another Companion"
            onPress={findAnotherCompanion}
            variant="outline"
            size="md"
            style={styles.backButton}
          />

          {/* Safety & Emergency Section */}
          <View style={styles.emergencySection}>
            <Text style={styles.emergencySectionTitle}>🚨 Safety & Emergency</Text>
            
            <View style={styles.emergencyButtons}>
              <TouchableOpacity 
                style={[styles.emergencyBtn, styles.emergencyBtnRed]}
                onPress={handleEmergencySOS}
              >
                <MaterialCommunityIcons name="alarm-light" size={28} color={colors.neutral.white} />
                <Text style={styles.emergencyBtnText}>SOS Alert</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.emergencyBtn, styles.emergencyBtnOrange]}
                onPress={() => handleQuickEmergencyCall('ambulance')}
              >
                <MaterialCommunityIcons name="ambulance" size={28} color={colors.neutral.white} />
                <Text style={styles.emergencyBtnText}>Ambulance</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.emergencyBtn, styles.emergencyBtnBlue]}
                onPress={() => handleQuickEmergencyCall('police')}
              >
                <MaterialCommunityIcons name="shield-account" size={28} color={colors.neutral.white} />
                <Text style={styles.emergencyBtnText}>Police</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              style={styles.emergencyHelpline}
              onPress={() => handleQuickEmergencyCall('emergency')}
            >
              <MaterialCommunityIcons name="phone-alert" size={24} color={colors.accent.red} />
              <View style={styles.helplineText}>
                <Text style={styles.helplineTitle}>National Emergency</Text>
                <Text style={styles.helplineNumber}>112</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={24} color={colors.neutral.gray} />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.emergencyHelpline}
              onPress={() => handleQuickEmergencyCall('senior_citizen')}
            >
              <MaterialCommunityIcons name="account-heart" size={24} color={colors.primary.main} />
              <View style={styles.helplineText}>
                <Text style={styles.helplineTitle}>Senior Citizen Helpline</Text>
                <Text style={styles.helplineNumber}>14567</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={24} color={colors.neutral.gray} />
            </TouchableOpacity>
          </View>

          <View style={{ height: spacing.xxl }} />
        </ScrollView>
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
  sosButtonFloating: {
    position: 'absolute',
    top: 50,
    right: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accent.red,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    zIndex: 100,
    ...shadows.lg,
  },
  sosButtonText: {
    color: colors.neutral.white,
    fontWeight: typography.weights.bold,
    marginLeft: spacing.xs,
    fontSize: typography.sizes.md,
  },
  searchingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  searchingCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: colors.neutral.white,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.lg,
  },
  searchingTitle: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
    color: colors.neutral.black,
    marginTop: spacing.xl,
    textAlign: 'center',
  },
  searchingSubtitle: {
    fontSize: typography.sizes.lg,
    color: colors.neutral.darkGray,
    marginTop: spacing.md,
  },
  loader: {
    marginTop: spacing.xl,
  },
  scrollContent: {
    flexGrow: 1,
    padding: spacing.lg,
    alignItems: 'center',
    paddingBottom: spacing.xxl,
    paddingTop: spacing.xxl,
  },
  successIcon: {
    marginTop: spacing.xl,
  },
  foundTitle: {
    fontSize: 60,
    marginTop: spacing.md,
  },
  foundMessage: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.semiBold,
    color: colors.neutral.black,
    textAlign: 'center',
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  companionHeader: {
    alignItems: 'center',
    marginTop: spacing.md,
  },
  companionName: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
    color: colors.primary.main,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E1',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.full,
    marginTop: spacing.sm,
  },
  ratingText: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semiBold,
    color: '#F57C00',
    marginLeft: spacing.xs,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.full,
    marginTop: spacing.xs,
  },
  verifiedText: {
    fontSize: typography.sizes.sm,
    color: '#4CAF50',
    marginLeft: spacing.xs,
  },
  infoCards: {
    width: '100%',
    marginTop: spacing.xl,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  infoTextContainer: {
    marginLeft: spacing.md,
    flex: 1,
  },
  infoLabel: {
    fontSize: typography.sizes.md,
    color: colors.neutral.darkGray,
  },
  infoValue: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semiBold,
    color: colors.neutral.black,
    marginTop: spacing.xs,
  },
  availableText: {
    color: colors.secondary.green,
  },
  actionButtons: {
    width: '100%',
    marginTop: spacing.xl,
  },
  callButton: {
    marginBottom: spacing.md,
  },
  chatButton: {
    marginBottom: spacing.md,
  },
  backButton: {
    marginTop: spacing.md,
  },
  // Emergency Section Styles
  emergencySection: {
    width: '100%',
    marginTop: spacing.xxl,
    backgroundColor: colors.neutral.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.sm,
  },
  emergencySectionTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.neutral.black,
    marginBottom: spacing.md,
  },
  emergencyButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  emergencyBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    marginHorizontal: spacing.xs,
  },
  emergencyBtnRed: {
    backgroundColor: colors.accent.red,
  },
  emergencyBtnOrange: {
    backgroundColor: '#FF9800',
  },
  emergencyBtnBlue: {
    backgroundColor: '#2196F3',
  },
  emergencyBtnText: {
    color: colors.neutral.white,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semiBold,
    marginTop: spacing.xs,
  },
  emergencyHelpline: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral.lightGray,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  helplineText: {
    flex: 1,
    marginLeft: spacing.md,
  },
  helplineTitle: {
    fontSize: typography.sizes.md,
    color: colors.neutral.black,
    fontWeight: typography.weights.medium,
  },
  helplineNumber: {
    fontSize: typography.sizes.lg,
    color: colors.primary.main,
    fontWeight: typography.weights.bold,
  },
});

export default CompanionMatchingScreen;
