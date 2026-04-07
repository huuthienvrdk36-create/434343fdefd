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
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useThemeContext } from '../src/context/ThemeContext';
import { mapAPI } from '../src/services/api';

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
// WEB VERSION - List View Only (no react-native-maps import!)
// ═══════════════════════════════════════════════════════════

export default function FullMapScreen() {
  const { colors } = useThemeContext();
  const insets = useSafeAreaInsets();

  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [providers, setProviders] = useState<MapProvider[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [radius, setRadius] = useState(1000);
  const [refreshing, setRefreshing] = useState(false);

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
      const res = await mapAPI.getNearby(lat, lng, r / 1000, 50);
      const filtered = (res.data || []).filter((p: MapProvider) => p.distanceKm <= r / 1000);
      setProviders(filtered);
    } catch (error) {
      setProviders([]);
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
    if (userLocation) {
      fetchProviders(userLocation.lat, userLocation.lng, newRadius);
    }
  }, [userLocation, fetchProviders]);

  const handleRefresh = async () => {
    setRefreshing(true);
    if (userLocation) {
      await fetchProviders(userLocation.lat, userLocation.lng, radius);
    }
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
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
              Ищем мастеров в радиусе {RADIUS_OPTIONS.find(r => r.value === radius)?.label}...
            </Text>
          </View>
        ) : providers.length === 0 ? (
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
                onPress={() => router.push({
                  pathname: '/direct',
                  params: {
                    providerId: provider.id,
                    lat: String(userLocation?.lat || KYIV.lat),
                    lng: String(userLocation?.lng || KYIV.lng),
                    mode: 'explore',
                    providerName: provider.name,
                  },
                })}
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
                </View>

                <TouchableOpacity
                  style={[styles.providerCTA, { backgroundColor: colors.primary }]}
                  onPress={() => router.push({
                    pathname: '/direct',
                    params: {
                      providerId: provider.id,
                      lat: String(userLocation?.lat || KYIV.lat),
                      lng: String(userLocation?.lng || KYIV.lng),
                      mode: 'explore',
                      providerName: provider.name,
                    },
                  })}
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
        style={[styles.fab, { backgroundColor: colors.primary, bottom: 30 + insets.bottom }]}
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
  providerAvatar: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  providerAvatarText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  providerInfo: { flex: 1, marginLeft: 12 },
  providerName: { fontSize: 16, fontWeight: '700' },
  providerMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 3, gap: 4 },
  providerRating: { fontSize: 13, fontWeight: '600' },
  providerDistance: { fontSize: 12 },
  providerScore: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  providerScoreText: { color: '#22C55E', fontSize: 13, fontWeight: '700' },
  providerBadges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  providerBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, gap: 4 },
  providerBadgeText: { fontSize: 11, fontWeight: '600' },
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
