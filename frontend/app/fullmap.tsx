import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  Animated,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useThemeContext } from '../src/context/ThemeContext';
import { mapAPI } from '../src/services/api';

const { width, height } = Dimensions.get('window');
const KYIV = { lat: 50.4501, lng: 30.5234 };

const RADIUS_OPTIONS = [
  { value: 500, label: '500м', km: 0.5 },
  { value: 1000, label: '1км', km: 1 },
  { value: 2000, label: '2км', km: 2 },
  { value: 5000, label: '5км', km: 5 },
];

interface MapProvider {
  id: string;
  name: string;
  lat: number;
  lng: number;
  distanceKm: number;
  rating: number;
  reviewsCount: number;
  isVerified: boolean;
  isPopular: boolean;
  isMobile: boolean;
  hasAvailableSlotsToday: boolean;
  avgResponseTimeMinutes: number;
  matchingScore: number;
  specializations: string[];
  reasons: string[];
}

// ═══════════════════════════════════════════════════════════
// FULLMAP SCREEN - Works on all platforms
// Web: List view with radar animation
// Native: List view with radar animation (no actual map to avoid react-native-maps issues)
// ═══════════════════════════════════════════════════════════

export default function FullMapScreen() {
  const { colors, isDark } = useThemeContext();
  const insets = useSafeAreaInsets();

  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [providers, setProviders] = useState<MapProvider[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [radius, setRadius] = useState(1000);
  const [refreshing, setRefreshing] = useState(false);
  const [showRadar, setShowRadar] = useState(true);
  
  // Radar animation
  const radarAnim = useRef(new Animated.Value(0)).current;
  const radarOpacity = useRef(new Animated.Value(1)).current;

  // Radar pulse animation
  useEffect(() => {
    if (showRadar) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(radarAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(radarAnim, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [showRadar]);

  const getUserLocation = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      let lat = KYIV.lat;
      let lng = KYIV.lng;

      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        lat = loc.coords.latitude;
        lng = loc.coords.longitude;
      }

      setUserLocation({ lat, lng });
      return { lat, lng };
    } catch (error) {
      setUserLocation(KYIV);
      return KYIV;
    }
  }, []);

  const fetchProviders = useCallback(async (lat: number, lng: number, r: number) => {
    try {
      setIsLoading(true);
      setShowRadar(true);
      const res = await mapAPI.getNearby(lat, lng, r / 1000, 50);
      const filtered = (res.data || []).filter((p: MapProvider) => p.distanceKm <= r / 1000);
      setProviders(filtered);
      
      // Hide radar after data loaded
      setTimeout(() => {
        setShowRadar(false);
        Animated.timing(radarOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start();
      }, 1500);
    } catch (error) {
      setProviders([]);
      setShowRadar(false);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      const loc = await getUserLocation();
      await fetchProviders(loc.lat, loc.lng, radius);
    };
    init();
  }, []);

  const handleRadiusChange = useCallback((newRadius: number) => {
    setRadius(newRadius);
    setShowRadar(true);
    radarOpacity.setValue(1);
    if (userLocation) {
      fetchProviders(userLocation.lat, userLocation.lng, newRadius);
    }
  }, [userLocation, fetchProviders]);

  const handleRefresh = async () => {
    setRefreshing(true);
    setShowRadar(true);
    radarOpacity.setValue(1);
    if (userLocation) {
      await fetchProviders(userLocation.lat, userLocation.lng, radius);
    }
  };

  const handleSelectProvider = (provider: MapProvider) => {
    router.push({
      pathname: '/direct',
      params: {
        providerId: provider.id,
        lat: String(userLocation?.lat || KYIV.lat),
        lng: String(userLocation?.lng || KYIV.lng),
        mode: 'explore',
        providerName: provider.name,
      },
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <SafeAreaView edges={['top']} style={[styles.header, { backgroundColor: colors.card }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Карта мастеров</Text>
        <TouchableOpacity onPress={handleRefresh} style={styles.refreshBtn}>
          <Ionicons name="refresh" size={22} color={colors.primary} />
        </TouchableOpacity>
      </SafeAreaView>

      {/* Radar Animation */}
      {showRadar && (
        <Animated.View 
          style={[
            styles.radarContainer, 
            { opacity: radarOpacity }
          ]}
          pointerEvents="none"
        >
          <View style={styles.radarCenter}>
            <Ionicons name="locate" size={24} color={colors.primary} />
          </View>
          <Animated.View
            style={[
              styles.radarPulse,
              {
                borderColor: colors.primary,
                opacity: radarAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.8, 0],
                }),
                transform: [
                  {
                    scale: radarAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.5, 2.5],
                    }),
                  },
                ],
              },
            ]}
          />
          <Animated.View
            style={[
              styles.radarPulse,
              {
                borderColor: colors.primary,
                opacity: radarAnim.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [0, 0.6, 0],
                }),
                transform: [
                  {
                    scale: radarAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.3, 2],
                    }),
                  },
                ],
              },
            ]}
          />
          <Text style={[styles.radarText, { color: colors.textSecondary }]}>
            Сканируем в радиусе {RADIUS_OPTIONS.find(r => r.value === radius)?.label}...
          </Text>
        </Animated.View>
      )}

      {/* Radius Selector */}
      <View style={[styles.radiusBar, { backgroundColor: colors.card }]}>
        <Text style={[styles.radiusLabel, { color: colors.textSecondary }]}>Радиус:</Text>
        <View style={styles.radiusButtons}>
          {RADIUS_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[
                styles.radiusBtn,
                { backgroundColor: radius === opt.value ? colors.primary : colors.backgroundTertiary }
              ]}
              onPress={() => handleRadiusChange(opt.value)}
            >
              <Text style={[
                styles.radiusBtnText,
                { color: radius === opt.value ? '#fff' : colors.text }
              ]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Providers List */}
      <ScrollView
        style={styles.list}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 80 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
        }
      >
        {isLoading && !showRadar ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
              Ищем мастеров...
            </Text>
          </View>
        ) : providers.length === 0 && !isLoading ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="location-outline" size={48} color={colors.textMuted} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Нет мастеров в радиусе</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              Попробуйте увеличить радиус поиска
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.listHeader}>
              <Ionicons name="location" size={16} color={colors.primary} />
              <Text style={[styles.listHeaderText, { color: colors.text }]}>
                {providers.length} мастеров в радиусе {RADIUS_OPTIONS.find(r => r.value === radius)?.label}
              </Text>
            </View>

            {providers.map((provider) => (
              <TouchableOpacity
                key={provider.id}
                style={[styles.providerCard, { backgroundColor: colors.card }]}
                onPress={() => handleSelectProvider(provider)}
                activeOpacity={0.7}
              >
                <View style={styles.providerHeader}>
                  <View style={[styles.providerAvatar, { backgroundColor: provider.isVerified ? '#22C55E' : colors.primary }]}>
                    <Text style={styles.providerAvatarText}>{provider.name.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={styles.providerInfo}>
                    <Text style={[styles.providerName, { color: colors.text }]} numberOfLines={1}>
                      {provider.name}
                    </Text>
                    <View style={styles.providerMeta}>
                      <Ionicons name="star" size={12} color="#FFB800" />
                      <Text style={[styles.providerRating, { color: colors.text }]}>
                        {provider.rating > 0 ? provider.rating.toFixed(1) : '—'}
                      </Text>
                      <Text style={[styles.providerDistance, { color: colors.textSecondary }]}>
                        • {provider.distanceKm < 1 ? `${(provider.distanceKm * 1000).toFixed(0)}м` : `${provider.distanceKm.toFixed(1)}км`}
                      </Text>
                      {provider.avgResponseTimeMinutes > 0 && (
                        <Text style={[styles.providerResponse, { color: colors.textSecondary }]}>
                          • ≈{provider.avgResponseTimeMinutes}мин
                        </Text>
                      )}
                    </View>
                  </View>
                  {provider.matchingScore > 0 && (
                    <View style={[styles.providerScore, { backgroundColor: '#22C55E20' }]}>
                      <Text style={styles.providerScoreText}>{provider.matchingScore}%</Text>
                    </View>
                  )}
                </View>

                <View style={styles.providerBadges}>
                  {provider.isVerified && (
                    <View style={[styles.providerBadge, { backgroundColor: '#22C55E15' }]}>
                      <Ionicons name="shield-checkmark" size={10} color="#22C55E" />
                      <Text style={[styles.providerBadgeText, { color: '#22C55E' }]}>Проверен</Text>
                    </View>
                  )}
                  {provider.hasAvailableSlotsToday && (
                    <View style={[styles.providerBadge, { backgroundColor: '#3B82F615' }]}>
                      <Ionicons name="calendar" size={10} color="#3B82F6" />
                      <Text style={[styles.providerBadgeText, { color: '#3B82F6' }]}>Сегодня</Text>
                    </View>
                  )}
                  {provider.isMobile && (
                    <View style={[styles.providerBadge, { backgroundColor: '#8B5CF615' }]}>
                      <Ionicons name="car" size={10} color="#8B5CF6" />
                      <Text style={[styles.providerBadgeText, { color: '#8B5CF6' }]}>Выезд</Text>
                    </View>
                  )}
                  {provider.isPopular && (
                    <View style={[styles.providerBadge, { backgroundColor: '#F59E0B15' }]}>
                      <Ionicons name="flame" size={10} color="#F59E0B" />
                      <Text style={[styles.providerBadgeText, { color: '#F59E0B' }]}>Популярный</Text>
                    </View>
                  )}
                </View>

                {/* Reasons */}
                {provider.reasons && provider.reasons.length > 0 && (
                  <View style={styles.reasonsBlock}>
                    {provider.reasons.slice(0, 2).map((reason, i) => (
                      <View key={i} style={styles.reasonItem}>
                        <Ionicons name="checkmark-circle" size={12} color="#10B981" />
                        <Text style={[styles.reasonText, { color: colors.textSecondary }]}>{reason}</Text>
                      </View>
                    ))}
                  </View>
                )}

                <TouchableOpacity
                  style={[styles.providerCTA, { backgroundColor: colors.primary }]}
                  onPress={() => handleSelectProvider(provider)}
                >
                  <Text style={styles.providerCTAText}>Выбрать</Text>
                  <Ionicons name="arrow-forward" size={14} color="#fff" />
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </>
        )}
      </ScrollView>

      {/* Quick Request FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: '#EF4444', bottom: 30 + insets.bottom }]}
        onPress={() => router.push('/quick-request')}
        activeOpacity={0.8}
      >
        <Ionicons name="flash" size={24} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  backBtn: { padding: 4 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', textAlign: 'center' },
  refreshBtn: { padding: 4 },
  
  // Radar
  radarContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  radarCenter: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  radarPulse: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
  },
  radarText: {
    marginTop: 80,
    fontSize: 14,
    fontWeight: '500',
  },

  radiusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  radiusLabel: { fontSize: 14 },
  radiusButtons: { flex: 1, flexDirection: 'row', gap: 8 },
  radiusBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  radiusBtnText: { fontSize: 13, fontWeight: '600' },

  list: { flex: 1 },
  listContent: { padding: 16, gap: 12 },
  loadingContainer: { alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: 16 },
  loadingText: { fontSize: 14 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptySubtitle: { fontSize: 14, textAlign: 'center' },

  listHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  listHeaderText: { fontSize: 14, fontWeight: '600' },

  providerCard: { borderRadius: 16, padding: 16 },
  providerHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  providerAvatar: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  providerAvatarText: { color: '#fff', fontSize: 20, fontWeight: '700' },
  providerInfo: { flex: 1, marginLeft: 12 },
  providerName: { fontSize: 16, fontWeight: '700' },
  providerMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 3, gap: 4 },
  providerRating: { fontSize: 13, fontWeight: '600' },
  providerDistance: { fontSize: 12 },
  providerResponse: { fontSize: 11 },
  providerScore: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  providerScoreText: { color: '#22C55E', fontSize: 14, fontWeight: '700' },
  providerBadges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  providerBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, gap: 4 },
  providerBadgeText: { fontSize: 11, fontWeight: '600' },
  
  reasonsBlock: { marginBottom: 12 },
  reasonItem: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  reasonText: { fontSize: 12 },
  
  providerCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  providerCTAText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  fab: {
    position: 'absolute',
    right: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
