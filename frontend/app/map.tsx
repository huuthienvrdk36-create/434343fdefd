import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Platform,
  ActivityIndicator,
  Animated,
  ScrollView,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useThemeContext } from '../src/context/ThemeContext';
import { mapAPI } from '../src/services/api';

// Conditionally import MapView for native platforms
let MapView: any = null;
let Marker: any = null;

if (Platform.OS !== 'web') {
  try {
    const Maps = require('react-native-maps');
    MapView = Maps.default;
    Marker = Maps.Marker;
  } catch (e) {
    console.log('Maps not available');
  }
}

const { width, height } = Dimensions.get('window');
const KYIV = { lat: 50.4501, lng: 30.5234 };

// Dark map style for Google Maps
const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#1d1d1d' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8a8a8a' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1d1d1d' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2d2d2d' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#6a6a6a' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0e0e0e' }] },
  { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
];

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

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
// PIN COMPONENT (Custom Markers)
// ═══════════════════════════════════════════════════════════

function CustomPin({ provider, isSelected }: { provider: MapProvider; isSelected: boolean }) {
  const getPinColor = () => {
    if (provider.isVerified) return '#22C55E';
    if (provider.isPopular) return '#F59E0B';
    if (provider.isMobile) return '#8B5CF6';
    return '#3B82F6';
  };

  return (
    <View style={[
      styles.pinContainer,
      isSelected && styles.pinSelected,
      { backgroundColor: getPinColor() }
    ]}>
      <Text style={styles.pinText}>
        {provider.rating > 0 ? provider.rating.toFixed(1) : '★'}
      </Text>
      {provider.hasAvailableSlotsToday && (
        <View style={styles.pinBadge}>
          <View style={styles.pinBadgeDot} />
        </View>
      )}
    </View>
  );
}

// ═══════════════════════════════════════════════════════════
// BOTTOM SHEET (Provider Card)
// ═══════════════════════════════════════════════════════════

function ProviderBottomSheet({ 
  provider, 
  userLocation,
  onClose, 
  colors 
}: { 
  provider: MapProvider; 
  userLocation: { lat: number; lng: number };
  onClose: () => void;
  colors: any;
}) {
  const slideAnim = useRef(new Animated.Value(300)).current;
  const insets = useSafeAreaInsets();

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      friction: 8,
    }).start();
  }, []);

  const handleSelect = () => {
    router.push({
      pathname: '/direct',
      params: {
        providerId: provider.id,
        lat: String(userLocation.lat),
        lng: String(userLocation.lng),
        mode: 'explore',
        providerName: provider.name,
      },
    });
  };

  return (
    <Animated.View 
      style={[
        styles.bottomSheet,
        { 
          backgroundColor: colors.card,
          transform: [{ translateY: slideAnim }],
          paddingBottom: Math.max(insets.bottom, 16),
        }
      ]}
    >
      {/* Handle */}
      <View style={styles.sheetHandle}>
        <View style={[styles.sheetHandleBar, { backgroundColor: colors.border }]} />
      </View>

      {/* Header */}
      <View style={styles.sheetHeader}>
        <View style={[styles.sheetAvatar, { backgroundColor: provider.isVerified ? '#22C55E' : colors.primary }]}>
          <Text style={styles.sheetAvatarText}>{provider.name.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.sheetInfo}>
          <Text style={[styles.sheetName, { color: colors.text }]} numberOfLines={1}>
            {provider.name}
          </Text>
          <View style={styles.sheetMeta}>
            <Ionicons name="star" size={14} color="#FFB800" />
            <Text style={[styles.sheetRating, { color: colors.text }]}>
              {provider.rating > 0 ? provider.rating.toFixed(1) : '—'}
            </Text>
            <Text style={[styles.sheetDistance, { color: colors.textSecondary }]}>
              • {provider.distanceKm < 1 ? `${(provider.distanceKm * 1000).toFixed(0)}м` : `${provider.distanceKm.toFixed(1)}км`}
            </Text>
            {provider.avgResponseTimeMinutes > 0 && (
              <Text style={[styles.sheetResponse, { color: colors.textSecondary }]}>
                • ≈{provider.avgResponseTimeMinutes}мин
              </Text>
            )}
          </View>
        </View>
        <TouchableOpacity onPress={onClose} style={styles.sheetClose}>
          <Ionicons name="close" size={24} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Badges */}
      <View style={styles.sheetBadges}>
        {provider.isVerified && (
          <View style={[styles.sheetBadge, { backgroundColor: '#22C55E20' }]}>
            <Ionicons name="shield-checkmark" size={12} color="#22C55E" />
            <Text style={[styles.sheetBadgeText, { color: '#22C55E' }]}>Проверен</Text>
          </View>
        )}
        {provider.hasAvailableSlotsToday && (
          <View style={[styles.sheetBadge, { backgroundColor: '#3B82F620' }]}>
            <Ionicons name="calendar" size={12} color="#3B82F6" />
            <Text style={[styles.sheetBadgeText, { color: '#3B82F6' }]}>Сегодня</Text>
          </View>
        )}
        {provider.isMobile && (
          <View style={[styles.sheetBadge, { backgroundColor: '#8B5CF620' }]}>
            <Ionicons name="car" size={12} color="#8B5CF6" />
            <Text style={[styles.sheetBadgeText, { color: '#8B5CF6' }]}>Выезд</Text>
          </View>
        )}
      </View>

      {/* Reasons */}
      {provider.reasons && provider.reasons.length > 0 && (
        <View style={styles.sheetReasons}>
          {provider.reasons.slice(0, 2).map((reason, i) => (
            <View key={i} style={styles.sheetReasonRow}>
              <Ionicons name="checkmark-circle" size={14} color="#22C55E" />
              <Text style={[styles.sheetReasonText, { color: colors.textSecondary }]}>{reason}</Text>
            </View>
          ))}
        </View>
      )}

      {/* CTA */}
      <TouchableOpacity
        style={[styles.sheetCTA, { backgroundColor: colors.primary }]}
        onPress={handleSelect}
        activeOpacity={0.8}
      >
        <Text style={styles.sheetCTAText}>Записаться за 1 клик</Text>
        <Ionicons name="arrow-forward" size={18} color="#fff" />
      </TouchableOpacity>
    </Animated.View>
  );
}

// ═══════════════════════════════════════════════════════════
// WEB FALLBACK (List View)
// ═══════════════════════════════════════════════════════════

function WebFallbackList({ 
  providers, 
  userLocation,
  onSelectProvider,
  colors,
  isLoading,
}: { 
  providers: MapProvider[];
  userLocation: { lat: number; lng: number };
  onSelectProvider: (p: MapProvider) => void;
  colors: any;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Ищем мастеров рядом...
        </Text>
      </View>
    );
  }

  if (providers.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="location-outline" size={48} color={colors.textMuted} />
        <Text style={[styles.emptyTitle, { color: colors.text }]}>Нет мастеров рядом</Text>
        <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
          Попробуйте увеличить радиус поиска
        </Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.listContainer}
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.listTitle, { color: colors.text }]}>
        Найдено {providers.length} мастеров
      </Text>
      
      {providers.map((provider) => (
        <TouchableOpacity
          key={provider.id}
          style={[styles.listCard, { backgroundColor: colors.card }]}
          onPress={() => onSelectProvider(provider)}
          activeOpacity={0.7}
        >
          <View style={styles.listCardHeader}>
            <View style={[styles.listAvatar, { backgroundColor: provider.isVerified ? '#22C55E' : colors.primary }]}>
              <Text style={styles.listAvatarText}>{provider.name.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={styles.listInfo}>
              <Text style={[styles.listName, { color: colors.text }]} numberOfLines={1}>
                {provider.name}
              </Text>
              <View style={styles.listMeta}>
                <Ionicons name="star" size={12} color="#FFB800" />
                <Text style={[styles.listRating, { color: colors.text }]}>
                  {provider.rating > 0 ? provider.rating.toFixed(1) : '—'}
                </Text>
                <Text style={[styles.listDistance, { color: colors.textSecondary }]}>
                  • {provider.distanceKm < 1 ? `${(provider.distanceKm * 1000).toFixed(0)}м` : `${provider.distanceKm.toFixed(1)}км`}
                </Text>
              </View>
            </View>
            {provider.matchingScore > 0 && (
              <View style={[styles.listScore, { backgroundColor: '#22C55E20' }]}>
                <Text style={[styles.listScoreText, { color: '#22C55E' }]}>{provider.matchingScore}%</Text>
              </View>
            )}
          </View>

          {/* Badges */}
          <View style={styles.listBadges}>
            {provider.isVerified && (
              <View style={[styles.listBadge, { backgroundColor: '#22C55E15' }]}>
                <Ionicons name="shield-checkmark" size={10} color="#22C55E" />
                <Text style={[styles.listBadgeText, { color: '#22C55E' }]}>Проверен</Text>
              </View>
            )}
            {provider.hasAvailableSlotsToday && (
              <View style={[styles.listBadge, { backgroundColor: '#3B82F615' }]}>
                <Ionicons name="calendar" size={10} color="#3B82F6" />
                <Text style={[styles.listBadgeText, { color: '#3B82F6' }]}>Сегодня</Text>
              </View>
            )}
          </View>

          {/* CTA */}
          <TouchableOpacity
            style={[styles.listCTA, { backgroundColor: colors.primary }]}
            onPress={() => router.push({
              pathname: '/direct',
              params: {
                providerId: provider.id,
                lat: String(userLocation.lat),
                lng: String(userLocation.lng),
                mode: 'explore',
                providerName: provider.name,
              },
            })}
          >
            <Text style={styles.listCTAText}>Выбрать</Text>
            <Ionicons name="arrow-forward" size={14} color="#fff" />
          </TouchableOpacity>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════

export default function MapScreen() {
  const { colors, isDark } = useThemeContext();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<any>(null);

  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [providers, setProviders] = useState<MapProvider[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<MapProvider | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [locationStatus, setLocationStatus] = useState<'loading' | 'granted' | 'denied'>('loading');

  // Get user location
  const getUserLocation = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        setLocationStatus('denied');
        setUserLocation(KYIV);
        return KYIV;
      }

      setLocationStatus('granted');
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      
      const coords = { lat: loc.coords.latitude, lng: loc.coords.longitude };
      setUserLocation(coords);
      return coords;
    } catch (error) {
      console.log('Location error:', error);
      setLocationStatus('denied');
      setUserLocation(KYIV);
      return KYIV;
    }
  }, []);

  // Fetch nearby providers
  const fetchProviders = useCallback(async (lat: number, lng: number) => {
    try {
      setIsLoading(true);
      const res = await mapAPI.getNearby(lat, lng, 15, 30);
      setProviders(res.data || []);
    } catch (error) {
      console.log('Fetch providers error:', error);
      setProviders([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initialize
  useEffect(() => {
    const init = async () => {
      const loc = await getUserLocation();
      await fetchProviders(loc.lat, loc.lng);
    };
    init();
  }, []);

  // Center on user
  const centerOnUser = useCallback(() => {
    if (mapRef.current && userLocation) {
      mapRef.current.animateToRegion({
        latitude: userLocation.lat,
        longitude: userLocation.lng,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      }, 500);
    }
  }, [userLocation]);

  // Handle marker press
  const handleMarkerPress = (provider: MapProvider) => {
    setSelectedProvider(provider);
    
    // Animate to provider location
    if (mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: provider.lat,
        longitude: provider.lng,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      }, 500);
    }
  };

  // Check if native maps available
  const isNativeMapAvailable = Platform.OS !== 'web' && MapView !== null;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <SafeAreaView edges={['top']} style={[styles.header, { backgroundColor: colors.card }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Карта мастеров</Text>
        <TouchableOpacity 
          onPress={() => fetchProviders(userLocation?.lat || KYIV.lat, userLocation?.lng || KYIV.lng)} 
          style={styles.refreshBtn}
        >
          <Ionicons name="refresh" size={22} color={colors.primary} />
        </TouchableOpacity>
      </SafeAreaView>

      {/* Map or List */}
      {isNativeMapAvailable && userLocation ? (
        <View style={styles.mapContainer}>
          <MapView
            ref={mapRef}
            style={styles.map}
            initialRegion={{
              latitude: userLocation.lat,
              longitude: userLocation.lng,
              latitudeDelta: 0.08,
              longitudeDelta: 0.08,
            }}
            showsUserLocation
            showsMyLocationButton={false}
            customMapStyle={isDark ? darkMapStyle : undefined}
          >
            {providers.map((provider) => (
              <Marker
                key={provider.id}
                coordinate={{ latitude: provider.lat, longitude: provider.lng }}
                onPress={() => handleMarkerPress(provider)}
              >
                <CustomPin 
                  provider={provider} 
                  isSelected={selectedProvider?.id === provider.id} 
                />
              </Marker>
            ))}
          </MapView>

          {/* Map Controls */}
          <View style={[styles.mapControls, { top: insets.top + 60 }]}>
            <TouchableOpacity
              style={[styles.mapControlBtn, { backgroundColor: colors.card }]}
              onPress={centerOnUser}
            >
              <Ionicons name="locate" size={22} color={colors.primary} />
            </TouchableOpacity>
          </View>

          {/* Provider count badge */}
          <View style={[styles.countBadge, { backgroundColor: colors.card }]}>
            <Ionicons name="car" size={14} color={colors.primary} />
            <Text style={[styles.countText, { color: colors.text }]}>
              {providers.length} мастеров
            </Text>
          </View>

          {/* Selected provider bottom sheet */}
          {selectedProvider && userLocation && (
            <ProviderBottomSheet
              provider={selectedProvider}
              userLocation={userLocation}
              onClose={() => setSelectedProvider(null)}
              colors={colors}
            />
          )}
        </View>
      ) : (
        // Web Fallback - List View
        <WebFallbackList
          providers={providers}
          userLocation={userLocation || KYIV}
          onSelectProvider={(p) => router.push({
            pathname: '/direct',
            params: {
              providerId: p.id,
              lat: String(userLocation?.lat || KYIV.lat),
              lng: String(userLocation?.lng || KYIV.lng),
              mode: 'explore',
              providerName: p.name,
            },
          })}
          colors={colors}
          isLoading={isLoading}
        />
      )}

      {/* Quick Request FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary, bottom: (selectedProvider ? 280 : 30) + insets.bottom }]}
        onPress={() => router.push('/quick-request')}
        activeOpacity={0.8}
      >
        <Ionicons name="flash" size={24} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  backBtn: { padding: 4 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', textAlign: 'center' },
  refreshBtn: { padding: 4 },

  // Map
  mapContainer: { flex: 1 },
  map: { flex: 1 },

  // Map Controls
  mapControls: {
    position: 'absolute',
    right: 16,
    gap: 8,
  },
  mapControlBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
      android: { elevation: 4 },
    }),
  },

  // Count Badge
  countBadge: {
    position: 'absolute',
    top: 70,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
      android: { elevation: 4 },
    }),
  },
  countText: { fontSize: 13, fontWeight: '600' },

  // Custom Pin
  pinContainer: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 40,
  },
  pinSelected: {
    transform: [{ scale: 1.2 }],
  },
  pinText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  pinBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22C55E',
  },

  // Bottom Sheet
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 16,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.15, shadowRadius: 12 },
      android: { elevation: 16 },
    }),
  },
  sheetHandle: { alignItems: 'center', marginBottom: 12 },
  sheetHandleBar: { width: 40, height: 4, borderRadius: 2 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  sheetAvatar: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  sheetAvatarText: { color: '#fff', fontSize: 20, fontWeight: '700' },
  sheetInfo: { flex: 1, marginLeft: 12 },
  sheetName: { fontSize: 17, fontWeight: '700' },
  sheetMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 4 },
  sheetRating: { fontSize: 14, fontWeight: '600' },
  sheetDistance: { fontSize: 13 },
  sheetResponse: { fontSize: 13 },
  sheetClose: { padding: 4 },
  sheetBadges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  sheetBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, gap: 4 },
  sheetBadgeText: { fontSize: 12, fontWeight: '600' },
  sheetReasons: { marginBottom: 12, gap: 6 },
  sheetReasonRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sheetReasonText: { fontSize: 13 },
  sheetCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
  },
  sheetCTAText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  // FAB
  fab: {
    position: 'absolute',
    right: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 },
      android: { elevation: 8 },
    }),
  },

  // Web Fallback
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  loadingText: { fontSize: 15 },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptySubtitle: { fontSize: 14 },
  listContainer: { flex: 1 },
  listContent: { padding: 16, gap: 12 },
  listTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
  listCard: { borderRadius: 16, padding: 16 },
  listCardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  listAvatar: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  listAvatarText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  listInfo: { flex: 1, marginLeft: 12 },
  listName: { fontSize: 16, fontWeight: '700' },
  listMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 3, gap: 4 },
  listRating: { fontSize: 13, fontWeight: '600' },
  listDistance: { fontSize: 12 },
  listScore: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  listScoreText: { fontSize: 13, fontWeight: '700' },
  listBadges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  listBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, gap: 4 },
  listBadgeText: { fontSize: 11, fontWeight: '600' },
  listCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  listCTAText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
