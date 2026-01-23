// Splash Screen - First screen users see
import React, { useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Animated, 
  Dimensions 
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, typography, spacing } from '../../theme';
import { checkAuth } from '../../services/authService';

const { width, height } = Dimensions.get('window');

const SplashScreen = ({ navigation }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const taglineAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Animate logo
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();

    // Animate tagline after logo
    setTimeout(() => {
      Animated.timing(taglineAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }).start();
    }, 500);

    const checkAndNavigate = async () => {
      try {
        const { isAuthenticated, userRole } = await checkAuth();
        const firstTime = await AsyncStorage.getItem('isFirstTime');
        const isFirstTime = firstTime === null;

        setTimeout(() => {
          if (!isAuthenticated) {
            navigation.replace('Auth', { 
              screen: isFirstTime ? 'LanguageSelection' : 'Login' 
            });
          } else {
            // Navigate based on role
            if (userRole === 'admin') {
              navigation.replace('AdminApp');
            } else if (userRole === 'volunteer' || userRole === 'caregiver') {
              navigation.replace('CaregiverApp');
            } else if (userRole === 'elderly') {
              navigation.replace('ElderlyApp');
            } else if (userRole === 'volunteer_pending') {
              navigation.replace('Auth', { screen: 'VolunteerPending' });
            } else {
              navigation.replace('Auth', { screen: 'Login' });
            }
          }
        }, 2500);
      } catch (error) {
        console.error('Splash navigation error:', error);
        navigation.replace('Auth', { screen: 'Login' });
      }
    };

    checkAndNavigate();
  }, []);

  return (
    <LinearGradient
      colors={[colors.primary.light, colors.secondary.cream, colors.primary.light]}
      style={styles.container}
    >
      <View style={styles.content}>
        {/* Logo */}
        <Animated.View
          style={[
            styles.logoContainer,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <View style={styles.logoCircle}>
            <MaterialCommunityIcons
              name="account-group-outline"
              size={80}
              color={colors.primary.main}
            />
          </View>
          <Text style={styles.appName}>SaathiCircle</Text>
        </Animated.View>

        {/* Tagline */}
        <Animated.View
          style={[
            styles.taglineContainer,
            {
              opacity: taglineAnim,
              transform: [
                {
                  translateY: taglineAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <Text style={styles.tagline}>You are not alone.</Text>
          <Text style={styles.taglineHindi}>आप अकेले नहीं हैं।</Text>
        </Animated.View>

        {/* Decorative hearts */}
        <View style={styles.heartsContainer}>
          <MaterialCommunityIcons
            name="heart"
            size={24}
            color={colors.accent.orange}
            style={[styles.heart, { top: -40, left: -20 }]}
          />
          <MaterialCommunityIcons
            name="heart"
            size={16}
            color={colors.secondary.green}
            style={[styles.heart, { top: 20, right: -30 }]}
          />
          <MaterialCommunityIcons
            name="heart"
            size={20}
            color={colors.primary.main}
            style={[styles.heart, { bottom: -30, left: 10 }]}
          />
        </View>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  logoContainer: {
    alignItems: 'center',
  },
  logoCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: colors.neutral.white,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary.main,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  appName: {
    fontSize: typography.sizes.hero,
    fontWeight: typography.weights.bold,
    color: colors.primary.dark,
    marginTop: spacing.lg,
    letterSpacing: 1,
  },
  taglineContainer: {
    marginTop: spacing.xxl,
    alignItems: 'center',
  },
  tagline: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.medium,
    color: colors.neutral.darkGray,
    textAlign: 'center',
  },
  taglineHindi: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.medium,
    color: colors.neutral.darkGray,
    textAlign: 'center',
    marginTop: spacing.sm,
    opacity: 0.8,
  },
  heartsContainer: {
    position: 'absolute',
    width: 200,
    height: 200,
  },
  heart: {
    position: 'absolute',
    opacity: 0.6,
  },
});

export default SplashScreen;
