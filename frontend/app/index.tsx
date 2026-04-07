import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useThemeContext } from '../src/context/ThemeContext';
import { useLanguage } from '../src/context/LanguageContext';
import { useAuth } from '../src/context/AuthContext';

const { width, height } = Dimensions.get('window');

// Custom SVG-style icons as components
const SearchIcon = ({ color, size }: { color: string; size: number }) => (
  <Ionicons name="search-outline" size={size} color={color} />
);

const StarIcon = ({ color, size }: { color: string; size: number }) => (
  <Ionicons name="star-outline" size={size} color={color} />
);

const CalendarIcon = ({ color, size }: { color: string; size: number }) => (
  <Ionicons name="calendar-outline" size={size} color={color} />
);

const ShieldIcon = ({ color, size }: { color: string; size: number }) => (
  <Ionicons name="shield-checkmark-outline" size={size} color={color} />
);

export default function WelcomeScreen() {
  const router = useRouter();
  const { colors, isDark } = useThemeContext();
  const { t } = useLanguage();
  const { user, isLoading } = useAuth();

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const logoScale = useRef(new Animated.Value(0.8)).current;
  const featuresAnim = useRef(new Animated.Value(0)).current;
  const buttonsAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // 🔥 КРИТИЧНО: Чекаємо поки auth завантажиться
    if (isLoading) {
      return;
    }
    
    // If user is already logged in, redirect to home
    if (user) {
      router.replace('/(tabs)');
      return;
    }

    // Staggered animations (only when not loading and no user)
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(logoScale, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(featuresAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(buttonsAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [user, isLoading]);
  
  // 🔥 КРИТИЧНО: Показуємо loading screen поки auth ініціалізується
  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const features = [
    { icon: SearchIcon, text: t.welcome.feature1 },
    { icon: StarIcon, text: t.welcome.feature2 },
    { icon: CalendarIcon, text: t.welcome.feature3 },
    { icon: ShieldIcon, text: t.welcome.feature4 },
  ];

  const handleLogin = () => router.push('/login');
  const handleRegister = () => router.push('/register');
  const handleSkip = () => router.replace('/(tabs)');

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Background gradient */}
      {isDark ? (
        <LinearGradient
          colors={['#0A0E14', '#0F1419', '#0A0E14']}
          style={StyleSheet.absoluteFillObject}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
      ) : (
        <LinearGradient
          colors={['#F0F4FF', '#E0E7FF', '#F0F4FF']}
          style={StyleSheet.absoluteFillObject}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
      )}

      {/* Decorative circles */}
      <View style={[styles.decorCircle1, { backgroundColor: isDark ? 'rgba(59,130,246,0.08)' : 'rgba(59,130,246,0.15)' }]} />
      <View style={[styles.decorCircle2, { backgroundColor: isDark ? 'rgba(139,92,246,0.06)' : 'rgba(139,92,246,0.1)' }]} />

      <SafeAreaView style={styles.safeArea}>
        {/* Logo Section */}
        <Animated.View
          style={[
            styles.logoSection,
            {
              opacity: fadeAnim,
              transform: [{ scale: logoScale }],
            },
          ]}
        >
          {/* Modern car icon */}
          <View style={[styles.logoContainer, { backgroundColor: colors.primary }]}>
            <Ionicons name="car-sport" size={48} color="#FFFFFF" />
          </View>
          
          <Text style={[styles.brandName, { color: colors.text }]}>
            {t.appName}
          </Text>
        </Animated.View>

        {/* Title Section */}
        <Animated.View
          style={[
            styles.titleSection,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <Text style={[styles.title, { color: colors.text }]}>
            {t.welcome.title}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {t.welcome.subtitle}
          </Text>
        </Animated.View>

        {/* Features Grid */}
        <Animated.View style={[styles.featuresGrid, { opacity: featuresAnim }]}>
          {features.map((feature, index) => (
            <View
              key={index}
              style={[
                styles.featureItem,
                { backgroundColor: isDark ? colors.card : colors.backgroundSecondary },
              ]}
            >
              <View style={[styles.featureIconWrap, { backgroundColor: colors.infoBg }]}>
                <feature.icon color={colors.primary} size={22} />
              </View>
              <Text style={[styles.featureText, { color: colors.text }]} numberOfLines={2}>
                {feature.text}
              </Text>
            </View>
          ))}
        </Animated.View>

        {/* Action Buttons */}
        <Animated.View style={[styles.actionsSection, { opacity: buttonsAnim }]}>
          {/* Login Button - Primary */}
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleLogin}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={[colors.primary, colors.primaryDark]}
              style={styles.gradientButton}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.primaryButtonText}>{t.welcome.login}</Text>
              <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
            </LinearGradient>
          </TouchableOpacity>

          {/* Register Button - Secondary */}
          <TouchableOpacity
            style={[
              styles.secondaryButton,
              { 
                backgroundColor: isDark ? colors.card : colors.backgroundSecondary,
                borderColor: colors.border,
              },
            ]}
            onPress={handleRegister}
            activeOpacity={0.8}
          >
            <Text style={[styles.secondaryButtonText, { color: colors.text }]}>
              {t.welcome.register}
            </Text>
          </TouchableOpacity>

          {/* Skip Link */}
          <TouchableOpacity
            style={styles.skipButton}
            onPress={handleSkip}
            activeOpacity={0.7}
          >
            <Text style={[styles.skipText, { color: colors.textMuted }]}>
              {t.welcome.skip}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
    paddingBottom: Platform.OS === 'ios' ? 20 : 24,
    paddingTop: Platform.OS === 'web' ? 20 : 0,
  },

  // Decorative
  decorCircle1: {
    position: 'absolute',
    width: width * 1.2,
    height: width * 1.2,
    borderRadius: width * 0.6,
    top: -width * 0.4,
    right: -width * 0.3,
  },
  decorCircle2: {
    position: 'absolute',
    width: width * 0.8,
    height: width * 0.8,
    borderRadius: width * 0.4,
    bottom: -width * 0.2,
    left: -width * 0.3,
  },

  // Logo
  logoSection: {
    alignItems: 'center',
    paddingTop: height * 0.03,
  },
  logoContainer: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  brandName: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.5,
  },

  // Title
  titleSection: {
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Features
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  featureItem: {
    width: (width - 56) / 2,
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    alignItems: 'center',
  },
  featureIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  featureText: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 16,
  },

  // Actions
  actionsSection: {
    gap: 12,
  },
  primaryButton: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  gradientButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    gap: 8,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
  secondaryButton: {
    height: 56,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  secondaryButtonText: {
    fontSize: 17,
    fontWeight: '600',
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  skipText: {
    fontSize: 15,
    fontWeight: '500',
  },
});
