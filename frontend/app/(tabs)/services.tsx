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
  RefreshControl,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useThemeContext } from '../../src/context/ThemeContext';
import { mapAPI } from '../../src/services/api';

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

// Dark map style
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
// PIN COMPONENT (for native maps)
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
// BOTTOM SHEET
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
      <View style={styles.sheetHandle}>
        <View style={[styles.sheetHandleBar, { backgroundColor: colors.border }]} />
      </View>

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
          </View>
        </View>
        <TouchableOpacity onPress={onClose} style={styles.sheetClose}>
          <Ionicons name="close" size={24} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

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
      </View>

      <TouchableOpacity
        style={[styles.sheetCTA, { backgroundColor: colors.primary }]}
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
        activeOpacity={0.8}
      >
        <Text style={styles.sheetCTAText}>Записаться за 1 клик</Text>
        <Ionicons name="arrow-forward" size={18} color="#fff" />
      </TouchableOpacity>
    </Animated.View>
  );
}

// ═══════════════════════════════════════════════════════════
// PROVIDER CARD (List item)
// ═══════════════════════════════════════════════════════════

function ProviderCard({ 
  provider, 
  userLocation,
  colors 
}: { 
  provider: MapProvider; 
  userLocation: { lat: number; lng: number };
  colors: any;
}) {
  return (
    <TouchableOpacity
      style={[styles.listCard, { backgroundColor: colors.card }]}
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
            {provider.avgResponseTimeMinutes > 0 && (
              <Text style={[styles.listResponse, { color: colors.textSecondary }]}>
                • ≈{provider.avgResponseTimeMinutes}мин
              </Text>
            )}
          </View>
        </View>
        {provider.matchingScore > 0 && (
          <View style={[styles.listScore, { backgroundColor: '#22C55E20' }]}>
            <Text style={styles.listScoreText}>{provider.matchingScore}%</Text>
          </View>
        )}
      </View>

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
        {provider.isMobile && (
          <View style={[styles.listBadge, { backgroundColor: '#8B5CF615' }]}>
            <Ionicons name="car" size={10} color="#8B5CF6" />
            <Text style={[styles.listBadgeText, { color: '#8B5CF6' }]}>Выезд</Text>
          </View>
        )}
        {provider.isPopular && (
          <View style={[styles.listBadge, { backgroundColor: '#F59E0B15' }]}>
            <Ionicons name="flame" size={10} color="#F59E0B" />
            <Text style={[styles.listBadgeText, { color: '#F59E0B' }]}>Популярный</Text>
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
  );
}

// ═══════════════════════════════════════════════════════════
// WEB MAP COMPONENT (using iframe with OpenStreetMap)
// ═══════════════════════════════════════════════════════════

function WebMapView({ 
  providers, 
  userLocation,
  selectedProvider,
  onSelectProvider,
  colors 
}: {
  providers: MapProvider[];
  userLocation: { lat: number; lng: number };
  selectedProvider: MapProvider | null;
  onSelectProvider: (p: MapProvider | null) => void;
  colors: any;
}) {
  const insets = useSafeAreaInsets();

  // Build OpenStreetMap URL with markers
  const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${userLocation.lng - 0.05}%2C${userLocation.lat - 0.05}%2C${userLocation.lng + 0.05}%2C${userLocation.lat + 0.05}&layer=mapnik&marker=${userLocation.lat}%2C${userLocation.lng}`;

  return (
    <View style={styles.webMapContainer}>
      {/* Map iframe */}
      <View style={styles.mapIframeContainer}>
        {Platform.OS === 'web' ? (
          <iframe
            src={mapUrl}
            style={{ width: '100%', height: '100%', border: 'none' }}
            title="Map"
          />
        ) : (
          <View style={[styles.mapPlaceholder, { backgroundColor: colors.backgroundTertiary }]}>
            <Ionicons name="map" size={48} color={colors.textMuted} />
            <Text style={[styles.mapPlaceholderText, { color: colors.textSecondary }]}>
              Карта доступна на мобильном устройстве
            </Text>
          </View>
        )}
      </View>

      {/* Provider markers overlay */}
      <View style={styles.markersOverlay}>
        {providers.slice(0, 10).map((provider, index) => {
          // Calculate position based on distance (simplified)
          const angle = (index / providers.length) * Math.PI * 2;
          const distance = Math.min(provider.distanceKm * 20, 80); // Scale distance
          const left = 50 + Math.cos(angle) * distance;
          const top = 50 + Math.sin(angle) * distance;

          return (
            <TouchableOpacity
              key={provider.id}
              style={[
                styles.markerPin,
                {
                  left: `${left}%`,
                  top: `${top}%`,
                  backgroundColor: provider.isVerified ? '#22C55E' : 
                                   provider.isPopular ? '#F59E0B' : 
                                   provider.isMobile ? '#8B5CF6' : colors.primary,
                  borderWidth: selectedProvider?.id === provider.id ? 3 : 2,
                  borderColor: selectedProvider?.id === provider.id ? '#fff' : 'transparent',
                  transform: [{ scale: selectedProvider?.id === provider.id ? 1.2 : 1 }],
                }
              ]}
              onPress={() => onSelectProvider(provider)}
            >
              <Text style={styles.markerText}>{provider.name.charAt(0)}</Text>
            </TouchableOpacity>
          );
        })}

        {/* User location marker */}
        <View style={[styles.userMarker, { left: '50%', top: '50%' }]}>
          <View style={styles.userMarkerInner}>
            <View style={styles.userMarkerDot} />
          </View>
        </View>
      </View>

      {/* Selected provider card */}
      {selectedProvider && (
        <View style={[styles.selectedCard, { backgroundColor: colors.card, bottom: 20 + insets.bottom }]}>
          <View style={styles.selectedCardHeader}>
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
                  • {selectedProvider.distanceKm.toFixed(1)}км
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => onSelectProvider(null)}>
              <Ionicons name="close-circle" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={[styles.selectedCTA, { backgroundColor: colors.primary }]}
            onPress={() => router.push({
              pathname: '/direct',
              params: {
                providerId: selectedProvider.id,
                lat: String(userLocation.lat),
                lng: String(userLocation.lng),
                mode: 'explore',
                providerName: selectedProvider.name,
              },
            })}
          >
            <Text style={styles.selectedCTAText}>Выбрать мастера</Text>
            <Ionicons name="arrow-forward" size={16} color="#fff" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════

export default function MapTabScreen() {
  const { colors, isDark } = useThemeContext();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<any>(null);

  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [providers, setProviders] = useState<MapProvider[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<MapProvider | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // View mode: 'list' or 'map'
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');

  const getUserLocation = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        setUserLocation(KYIV);
        return KYIV;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      
      const coords = { lat: loc.coords.latitude, lng: loc.coords.longitude };
      setUserLocation(coords);
      return coords;
    } catch (error) {
      setUserLocation(KYIV);
      return KYIV;
    }
  }, []);

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
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      const loc = await getUserLocation();
      await fetchProviders(loc.lat, loc.lng);
    };
    init();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    const loc = userLocation || KYIV;
    await fetchProviders(loc.lat, loc.lng);
  }, [userLocation, fetchProviders]);

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

  const handleMarkerPress = (provider: MapProvider) => {
    setSelectedProvider(provider);
    if (mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: provider.lat,
        longitude: provider.lng,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      }, 500);
    }
  };

  const isNativeMapAvailable = Platform.OS !== 'web' && MapView !== null;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <SafeAreaView edges={['top']} style={[styles.header, { backgroundColor: colors.card }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Карта мастеров</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity 
            onPress={onRefresh} 
            style={[styles.headerBtn, { backgroundColor: colors.backgroundTertiary }]}
          >
            <Ionicons name="refresh" size={18} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* View Mode Toggle */}
      <View style={[styles.toggleContainer, { backgroundColor: colors.card }]}>
        <TouchableOpacity
          style={[
            styles.toggleBtn,
            viewMode === 'list' && { backgroundColor: colors.primary }
          ]}
          onPress={() => setViewMode('list')}
        >
          <Ionicons 
            name="list" 
            size={18} 
            color={viewMode === 'list' ? '#fff' : colors.textSecondary} 
          />
          <Text style={[
            styles.toggleText,
            { color: viewMode === 'list' ? '#fff' : colors.textSecondary }
          ]}>
            Список
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.toggleBtn,
            viewMode === 'map' && { backgroundColor: colors.primary }
          ]}
          onPress={() => setViewMode('map')}
        >
          <Ionicons 
            name="map" 
            size={18} 
            color={viewMode === 'map' ? '#fff' : colors.textSecondary} 
          />
          <Text style={[
            styles.toggleText,
            { color: viewMode === 'map' ? '#fff' : colors.textSecondary }
          ]}>
            Карта
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content based on view mode */}
      {viewMode === 'map' ? (
        // Map View
        isNativeMapAvailable && userLocation ? (
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

            <View style={[styles.mapControls, { top: insets.top + 140 }]}>
              <TouchableOpacity
                style={[styles.mapControlBtn, { backgroundColor: colors.card }]}
                onPress={centerOnUser}
              >
                <Ionicons name="locate" size={22} color={colors.primary} />
              </TouchableOpacity>
            </View>

            <View style={[styles.countBadge, { backgroundColor: colors.card }]}>
              <Ionicons name="car" size={14} color={colors.primary} />
              <Text style={[styles.countText, { color: colors.text }]}>
                {providers.length} мастеров
              </Text>
            </View>

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
          // Web Map View
          userLocation ? (
            <WebMapView
              providers={providers}
              userLocation={userLocation}
              selectedProvider={selectedProvider}
              onSelectProvider={setSelectedProvider}
              colors={colors}
            />
          ) : (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          )
        )
      ) : (
        // List View
        <ScrollView 
          style={styles.listContainer}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
        >
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                Ищем мастеров рядом...
              </Text>
            </View>
          ) : providers.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="location-outline" size={48} color={colors.textMuted} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>Нет мастеров рядом</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                Попробуйте увеличить радиус поиска
              </Text>
            </View>
          ) : (
            <>
              <View style={styles.listHeader}>
                <Text style={[styles.listTitle, { color: colors.text }]}>
                  Найдено {providers.length} мастеров
                </Text>
                <View style={[styles.locationBadge, { backgroundColor: colors.backgroundTertiary }]}>
                  <Ionicons name="location" size={12} color={colors.primary} />
                  <Text style={[styles.locationText, { color: colors.textSecondary }]}>Киев</Text>
                </View>
              </View>
              
              {providers.map((provider) => (
                <ProviderCard
                  key={provider.id}
                  provider={provider}
                  userLocation={userLocation || KYIV}
                  colors={colors}
                />
              ))}

              {/* Show on map button */}
              <TouchableOpacity
                style={[styles.showMapBtn, { borderColor: colors.primary }]}
                onPress={() => setViewMode('map')}
              >
                <Ionicons name="map-outline" size={20} color={colors.primary} />
                <Text style={[styles.showMapText, { color: colors.primary }]}>
                  Показать всех на карте
                </Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      )}

      {/* Quick Request FAB */}
      <TouchableOpacity
        style={[
          styles.fab, 
          { 
            backgroundColor: '#EF4444', 
            bottom: (selectedProvider && viewMode === 'map' ? 280 : 100) + insets.bottom 
          }
        ]}
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

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  headerTitle: { fontSize: 20, fontWeight: '700' },
  headerRight: { flexDirection: 'row', gap: 8 },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Toggle
  toggleContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginVertical: 12,
    padding: 4,
    borderRadius: 12,
    gap: 4,
  },
  toggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Map Container
  mapContainer: { flex: 1 },
  map: { ...StyleSheet.absoluteFillObject },
  mapControls: {
    position: 'absolute',
    right: 16,
  },
  mapControlBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  countBadge: {
    position: 'absolute',
    top: 140,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
  },
  countText: { fontSize: 13, fontWeight: '600' },

  // Web Map
  webMapContainer: { flex: 1, position: 'relative' },
  mapIframeContainer: { flex: 1 },
  mapPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  mapPlaceholderText: { fontSize: 14 },
  markersOverlay: {
    ...StyleSheet.absoluteFillObject,
    pointerEvents: 'box-none',
  },
  markerPin: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -20,
    marginTop: -20,
  },
  markerText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  userMarker: {
    position: 'absolute',
    marginLeft: -12,
    marginTop: -12,
  },
  userMarkerInner: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(59, 130, 246, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userMarkerDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#3B82F6',
    borderWidth: 2,
    borderColor: '#fff',
  },
  selectedCard: {
    position: 'absolute',
    left: 16,
    right: 16,
    borderRadius: 16,
    padding: 16,
  },
  selectedCardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
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

  // Pin
  pinContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  pinSelected: {
    transform: [{ scale: 1.2 }],
    borderWidth: 3,
  },
  pinText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  pinBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#22C55E',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  pinBadgeDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#fff' },

  // Bottom Sheet
  bottomSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  sheetHandle: { alignItems: 'center', marginBottom: 16 },
  sheetHandleBar: { width: 40, height: 4, borderRadius: 2 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  sheetAvatar: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  sheetAvatarText: { color: '#fff', fontSize: 20, fontWeight: '700' },
  sheetInfo: { flex: 1, marginLeft: 12 },
  sheetName: { fontSize: 17, fontWeight: '700' },
  sheetMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 2, gap: 4 },
  sheetRating: { fontSize: 14, fontWeight: '600' },
  sheetDistance: { fontSize: 13 },
  sheetClose: { padding: 4 },
  sheetBadges: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  sheetBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, gap: 4 },
  sheetBadgeText: { fontSize: 12, fontWeight: '600' },
  sheetCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 14,
    gap: 8,
  },
  sheetCTAText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  // List View
  listContainer: { flex: 1 },
  listContent: { padding: 16, paddingBottom: 120 },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  listTitle: { fontSize: 16, fontWeight: '700' },
  locationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  locationText: { fontSize: 12, fontWeight: '500' },

  // List Card
  listCard: { borderRadius: 16, padding: 16, marginBottom: 12 },
  listCardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  listAvatar: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  listAvatarText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  listInfo: { flex: 1, marginLeft: 12 },
  listName: { fontSize: 16, fontWeight: '700' },
  listMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 2, gap: 4 },
  listRating: { fontSize: 13, fontWeight: '600' },
  listDistance: { fontSize: 12 },
  listResponse: { fontSize: 11 },
  listScore: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  listScoreText: { color: '#22C55E', fontSize: 14, fontWeight: '700' },
  listBadges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  listBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, gap: 4 },
  listBadgeText: { fontSize: 11, fontWeight: '600' },
  reasonsBlock: { marginBottom: 12 },
  reasonItem: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  reasonText: { fontSize: 12 },
  listCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  listCTAText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  // Show on map button
  showMapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    gap: 8,
    marginTop: 8,
    marginBottom: 20,
  },
  showMapText: { fontSize: 15, fontWeight: '600' },

  // Loading
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  loadingText: { fontSize: 14, marginTop: 16 },

  // Empty
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptySubtitle: { fontSize: 14, textAlign: 'center' },

  // FAB
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
