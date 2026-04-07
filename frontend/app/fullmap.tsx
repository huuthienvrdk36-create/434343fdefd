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
// FULLMAP SCREEN - with real map view
// ═══════════════════════════════════════════════════════════

export default function FullMapScreen() {
  const { colors, isDark } = useThemeContext();
  const insets = useSafeAreaInsets();

  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [providers, setProviders] = useState<MapProvider[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [radius, setRadius] = useState(1000);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<MapProvider | null>(null);
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');

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

  // Build OpenStreetMap URL
  const getMapUrl = () => {
    if (!userLocation) return '';
    const radiusKm = radius / 1000;
    const delta = radiusKm * 0.02;
    return `https://www.openstreetmap.org/export/embed.html?bbox=${userLocation.lng - delta}%2C${userLocation.lat - delta}%2C${userLocation.lng + delta}%2C${userLocation.lat + delta}&layer=mapnik&marker=${userLocation.lat}%2C${userLocation.lng}`;
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

      {/* View Mode Toggle */}
      <View style={[styles.toggleContainer, { backgroundColor: colors.card }]}>
        <TouchableOpacity
          style={[styles.toggleBtn, viewMode === 'map' && { backgroundColor: colors.primary }]}
          onPress={() => setViewMode('map')}
        >
          <Ionicons name="map" size={16} color={viewMode === 'map' ? '#fff' : colors.textSecondary} />
          <Text style={[styles.toggleText, { color: viewMode === 'map' ? '#fff' : colors.textSecondary }]}>
            Карта
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleBtn, viewMode === 'list' && { backgroundColor: colors.primary }]}
          onPress={() => setViewMode('list')}
        >
          <Ionicons name="list" size={16} color={viewMode === 'list' ? '#fff' : colors.textSecondary} />
          <Text style={[styles.toggleText, { color: viewMode === 'list' ? '#fff' : colors.textSecondary }]}>
            Список
          </Text>
        </TouchableOpacity>
      </View>

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

      {/* Content */}
      {viewMode === 'map' ? (
        // Map View
        <View style={styles.mapContainer}>
          {Platform.OS === 'web' && userLocation ? (
            <>
              <iframe
                src={getMapUrl()}
                style={{ width: '100%', height: '100%', border: 'none' } as any}
                title="Map"
              />
              {/* Markers overlay */}
              <View style={styles.markersOverlay} pointerEvents="box-none">
                {providers.slice(0, 10).map((provider, index) => {
                  const angle = (index / providers.length) * Math.PI * 2;
                  const distance = Math.min(provider.distanceKm * 30, 40);
                  const left = 50 + Math.cos(angle) * distance;
                  const top = 50 + Math.sin(angle) * distance;

                  return (
                    <TouchableOpacity
                      key={provider.id}
                      style={[
                        styles.marker,
                        {
                          left: `${left}%`,
                          top: `${top}%`,
                          backgroundColor: provider.isVerified ? '#22C55E' : 
                                           provider.isPopular ? '#F59E0B' : 
                                           provider.isMobile ? '#8B5CF6' : colors.primary,
                        }
                      ]}
                      onPress={() => setSelectedProvider(provider)}
                    >
                      <Text style={styles.markerText}>{provider.name.charAt(0)}</Text>
                    </TouchableOpacity>
                  );
                })}
                {/* User location */}
                <View style={[styles.userMarker, { left: '50%', top: '50%' }]}>
                  <View style={styles.userDot} />
                </View>
              </View>
            </>
          ) : (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          )}

          {/* Selected provider card */}
          {selectedProvider && (
            <View style={[styles.selectedCard, { backgroundColor: colors.card, bottom: 80 + insets.bottom }]}>
              <View style={styles.selectedHeader}>
                <View style={[styles.selectedAvatar, { backgroundColor: selectedProvider.isVerified ? '#22C55E' : colors.primary }]}>
                  <Text style={styles.selectedAvatarText}>{selectedProvider.name.charAt(0)}</Text>
                </View>
                <View style={styles.selectedInfo}>
                  <Text style={[styles.selectedName, { color: colors.text }]} numberOfLines={1}>
                    {selectedProvider.name}
                  </Text>
                  <View style={styles.selectedMeta}>
                    <Ionicons name="star" size={12} color="#FFB800" />
                    <Text style={[styles.selectedRating, { color: colors.text }]}>
                      {selectedProvider.rating.toFixed(1)}
                    </Text>
                    <Text style={[styles.selectedDistance, { color: colors.textSecondary }]}>
                      • {selectedProvider.distanceKm < 1 ? `${(selectedProvider.distanceKm * 1000).toFixed(0)}м` : `${selectedProvider.distanceKm.toFixed(1)}км`}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => setSelectedProvider(null)}>
                  <Ionicons name="close-circle" size={24} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={[styles.selectedCTA, { backgroundColor: colors.primary }]}
                onPress={() => handleSelectProvider(selectedProvider)}
              >
                <Text style={styles.selectedCTAText}>Выбрать мастера</Text>
                <Ionicons name="arrow-forward" size={16} color="#fff" />
              </TouchableOpacity>
            </View>
          )}

          {/* Provider count badge */}
          <View style={[styles.countBadge, { backgroundColor: colors.card }]}>
            <Ionicons name="location" size={14} color={colors.primary} />
            <Text style={[styles.countText, { color: colors.text }]}>
              {providers.length} мастеров в радиусе {RADIUS_OPTIONS.find(r => r.value === radius)?.label}
            </Text>
          </View>
        </View>
      ) : (
        // List View
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
                Ищем мастеров...
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
      )}

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

  // Toggle
  toggleContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 12,
    padding: 4,
    borderRadius: 12,
    gap: 4,
  },
  toggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
  },
  toggleText: {
    fontSize: 13,
    fontWeight: '600',
  },

  radiusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginTop: 8,
    marginHorizontal: 16,
    borderRadius: 12,
    gap: 10,
  },
  radiusLabel: { fontSize: 13 },
  radiusButtons: { flex: 1, flexDirection: 'row', gap: 6 },
  radiusBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  radiusBtnText: { fontSize: 12, fontWeight: '600' },

  // Map
  mapContainer: { flex: 1, position: 'relative' },
  markersOverlay: {
    ...StyleSheet.absoluteFillObject,
    pointerEvents: 'box-none',
  },
  marker: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -18,
    marginTop: -18,
    borderWidth: 2,
    borderColor: '#fff',
  },
  markerText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  userMarker: {
    position: 'absolute',
    marginLeft: -10,
    marginTop: -10,
  },
  userDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#3B82F6',
    borderWidth: 3,
    borderColor: '#fff',
  },
  countBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 6,
  },
  countText: { fontSize: 12, fontWeight: '600' },
  selectedCard: {
    position: 'absolute',
    left: 16,
    right: 16,
    borderRadius: 16,
    padding: 16,
  },
  selectedHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  selectedAvatar: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  selectedAvatarText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  selectedInfo: { flex: 1, marginLeft: 12 },
  selectedName: { fontSize: 16, fontWeight: '700' },
  selectedMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 2, gap: 4 },
  selectedRating: { fontSize: 13, fontWeight: '600' },
  selectedDistance: { fontSize: 12 },
  selectedCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  selectedCTAText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  // List
  list: { flex: 1 },
  listContent: { padding: 16, gap: 12 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: 16 },
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
  providerScore: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  providerScoreText: { color: '#22C55E', fontSize: 14, fontWeight: '700' },
  providerBadges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
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
