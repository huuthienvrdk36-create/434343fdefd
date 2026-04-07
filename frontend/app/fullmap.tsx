import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useThemeContext } from '../src/context/ThemeContext';
import { mapAPI } from '../src/services/api';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

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
  pinType: 'verified' | 'popular' | 'mobile' | 'standard' | 'topMatch';
}

const PIN_COLORS = {
  topMatch: '#EF4444',
  verified: '#22C55E',
  popular: '#F59E0B',
  mobile: '#8B5CF6',
  standard: '#64748B',
};

// Leaflet Map Component
function LeafletMap({ userLocation, providers, selectedProvider, onSelectProvider, radius, colors }: any) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const userMarkerRef = useRef<any>(null);
  const circleRef = useRef<any>(null);

  useEffect(() => {
    if (Platform.OS !== 'web' || !mapContainerRef.current) return;

    const initMap = async () => {
      const L = (await import('leaflet')).default;
      
      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link');
        link.id = 'leaflet-css';
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }

      if (!mapInstanceRef.current) {
        mapInstanceRef.current = L.map(mapContainerRef.current!, {
          center: [userLocation.lat, userLocation.lng],
          zoom: 14,
          zoomControl: false,
        });

        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
          attribution: '&copy; OpenStreetMap',
          subdomains: 'abcd',
          maxZoom: 19,
        }).addTo(mapInstanceRef.current);

        L.control.zoom({ position: 'bottomright' }).addTo(mapInstanceRef.current);
      }

      // User marker
      if (userMarkerRef.current) mapInstanceRef.current.removeLayer(userMarkerRef.current);
      const userIcon = L.divIcon({
        className: 'user-marker',
        html: `<div style="width:24px;height:24px;background:#3B82F6;border:4px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.3);"></div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });
      userMarkerRef.current = L.marker([userLocation.lat, userLocation.lng], { icon: userIcon }).addTo(mapInstanceRef.current);

      // Radius circle
      if (circleRef.current) mapInstanceRef.current.removeLayer(circleRef.current);
      circleRef.current = L.circle([userLocation.lat, userLocation.lng], {
        radius: radius,
        color: '#3B82F6',
        fillColor: '#3B82F6',
        fillOpacity: 0.1,
        weight: 2,
      }).addTo(mapInstanceRef.current);

      // Clear old markers
      markersRef.current.forEach(marker => mapInstanceRef.current.removeLayer(marker));
      markersRef.current = [];

      // Provider markers
      providers.forEach((provider: MapProvider) => {
        const pinColor = PIN_COLORS[provider.pinType as keyof typeof PIN_COLORS] || PIN_COLORS.standard;
        const isTopMatch = provider.pinType === 'topMatch';
        const isSelected = selectedProvider?.id === provider.id;
        const size = isTopMatch ? 44 : isSelected ? 40 : 36;
        
        const providerIcon = L.divIcon({
          className: 'provider-marker',
          html: `<div style="
            width:${size}px;height:${size}px;background:${pinColor};
            border:${isSelected ? '4px' : '3px'} solid white;border-radius:50%;
            display:flex;align-items:center;justify-content:center;
            font-size:${isTopMatch ? 18 : 16}px;font-weight:bold;color:white;
            box-shadow:0 2px 8px rgba(0,0,0,0.3);
          ">${provider.name.charAt(0).toUpperCase()}</div>`,
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
        });

        const marker = L.marker([provider.lat, provider.lng], { icon: providerIcon })
          .addTo(mapInstanceRef.current)
          .on('click', () => onSelectProvider(provider));
        
        markersRef.current.push(marker);
      });

      // Fit bounds
      if (providers.length > 0) {
        const bounds = L.latLngBounds([
          [userLocation.lat, userLocation.lng],
          ...providers.map((p: MapProvider) => [p.lat, p.lng] as [number, number])
        ]);
        mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
      }
    };

    initMap();
  }, [userLocation, providers, selectedProvider, radius]);

  if (Platform.OS !== 'web') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name="map" size={48} color={colors.textMuted} />
        <Text style={{ color: colors.textSecondary, marginTop: 12 }}>Карта доступна в приложении</Text>
      </View>
    );
  }

  return <div ref={mapContainerRef} style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />;
}

// Provider Card
function ProviderCard({ provider, userLocation, isSelected, onSelect, colors }: any) {
  const pinColor = PIN_COLORS[provider.pinType as keyof typeof PIN_COLORS] || PIN_COLORS.standard;
  
  return (
    <TouchableOpacity
      style={[styles.providerCard, { backgroundColor: colors.card }, isSelected && { borderWidth: 2, borderColor: colors.primary }]}
      onPress={onSelect}
      activeOpacity={0.8}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.cardAvatar, { backgroundColor: pinColor }]}>
          <Text style={styles.cardAvatarText}>{provider.name.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.cardInfo}>
          <Text style={[styles.cardName, { color: colors.text }]} numberOfLines={1}>{provider.name}</Text>
          <View style={styles.cardMeta}>
            <Ionicons name="star" size={12} color="#FFB800" />
            <Text style={[styles.cardRating, { color: colors.text }]}>{provider.rating.toFixed(1)}</Text>
            <Text style={[styles.cardDistance, { color: colors.textSecondary }]}>
              • {provider.distanceKm < 1 ? `${(provider.distanceKm * 1000).toFixed(0)}м` : `${provider.distanceKm.toFixed(1)}км`}
            </Text>
          </View>
        </View>
        {provider.matchingScore > 0 && (
          <View style={[styles.cardScore, { backgroundColor: pinColor + '20' }]}>
            <Text style={[styles.cardScoreText, { color: pinColor }]}>{provider.matchingScore}%</Text>
          </View>
        )}
      </View>

      <View style={styles.cardBadges}>
        {provider.isVerified && (
          <View style={[styles.cardBadge, { backgroundColor: '#22C55E15' }]}>
            <Ionicons name="shield-checkmark" size={10} color="#22C55E" />
            <Text style={[styles.cardBadgeText, { color: '#22C55E' }]}>Проверен</Text>
          </View>
        )}
        {provider.hasAvailableSlotsToday && (
          <View style={[styles.cardBadge, { backgroundColor: '#3B82F615' }]}>
            <Ionicons name="calendar" size={10} color="#3B82F6" />
            <Text style={[styles.cardBadgeText, { color: '#3B82F6' }]}>Сегодня</Text>
          </View>
        )}
        {provider.isMobile && (
          <View style={[styles.cardBadge, { backgroundColor: '#8B5CF615' }]}>
            <Ionicons name="car" size={10} color="#8B5CF6" />
            <Text style={[styles.cardBadgeText, { color: '#8B5CF6' }]}>Выезд</Text>
          </View>
        )}
      </View>

      <TouchableOpacity
        style={[styles.cardCTA, { backgroundColor: colors.primary }]}
        onPress={() => router.push({
          pathname: '/direct',
          params: { providerId: provider.id, lat: String(userLocation.lat), lng: String(userLocation.lng), mode: 'explore', providerName: provider.name }
        })}
      >
        <Text style={styles.cardCTAText}>Выбрать</Text>
        <Ionicons name="arrow-forward" size={14} color="#fff" />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

export default function FullMapScreenV7() {
  const { colors } = useThemeContext();
  const insets = useSafeAreaInsets();
  const bottomSheetRef = useRef<BottomSheet>(null);

  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [providers, setProviders] = useState<MapProvider[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<MapProvider | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [radius, setRadius] = useState(2000);

  const snapPoints = useMemo(() => ['12%', '45%', '85%'], []);

  const requestLocation = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        const coords = { lat: loc.coords.latitude, lng: loc.coords.longitude };
        setUserLocation(coords);
        return coords;
      }
      setUserLocation(KYIV);
      return KYIV;
    } catch {
      setUserLocation(KYIV);
      return KYIV;
    }
  }, []);

  const fetchProviders = useCallback(async (lat: number, lng: number, r: number) => {
    try {
      setIsLoading(true);
      const res = await mapAPI.getNearby(lat, lng, r / 1000, 20);
      const sorted = (res.data || []).sort((a: MapProvider, b: MapProvider) => (b.matchingScore || 0) - (a.matchingScore || 0));
      const withTopMatch = sorted.map((p: MapProvider, i: number) => ({
        ...p,
        pinType: i === 0 && p.matchingScore >= 90 ? 'topMatch' : p.pinType
      }));
      setProviders(withTopMatch);
    } catch {
      setProviders([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      const loc = await requestLocation();
      await fetchProviders(loc.lat, loc.lng, radius);
    };
    init();
  }, []);

  const handleRadiusChange = useCallback((newRadius: number) => {
    setRadius(newRadius);
    if (userLocation) fetchProviders(userLocation.lat, userLocation.lng, newRadius);
  }, [userLocation, fetchProviders]);

  const handleSelectProvider = useCallback((provider: MapProvider) => {
    setSelectedProvider(provider);
    bottomSheetRef.current?.snapToIndex(1);
  }, []);

  const handleRefresh = useCallback(async () => {
    const loc = await requestLocation();
    await fetchProviders(loc.lat, loc.lng, radius);
  }, [radius, fetchProviders, requestLocation]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.mapContainer}>
          {userLocation ? (
            <LeafletMap userLocation={userLocation} providers={providers} selectedProvider={selectedProvider} onSelectProvider={handleSelectProvider} radius={radius} colors={colors} />
          ) : (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Определяем местоположение...</Text>
            </View>
          )}
        </View>

        <SafeAreaView edges={['top']} style={[styles.topBar, { backgroundColor: colors.card + 'F0' }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.topBarBtn}>
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.topBarTitle}>
            <Text style={[styles.topBarTitleText, { color: colors.text }]}>Карта мастеров</Text>
            {userLocation && <Text style={[styles.topBarSubtitle, { color: colors.textSecondary }]}>{providers.length} мастеров • радиус {radius >= 1000 ? `${radius/1000}км` : `${radius}м`}</Text>}
          </View>
          <TouchableOpacity onPress={handleRefresh} style={[styles.topBarBtn, { backgroundColor: colors.backgroundTertiary }]}>
            <Ionicons name="refresh" size={20} color={colors.primary} />
          </TouchableOpacity>
        </SafeAreaView>

        <View style={[styles.radiusSelector, { backgroundColor: colors.card + 'F0', top: insets.top + 70 }]}>
          {RADIUS_OPTIONS.map((opt) => (
            <TouchableOpacity key={opt.value} style={[styles.radiusBtn, { backgroundColor: radius === opt.value ? colors.primary : 'transparent' }]} onPress={() => handleRadiusChange(opt.value)}>
              <Text style={[styles.radiusBtnText, { color: radius === opt.value ? '#fff' : colors.textSecondary }]}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={[styles.quickFab, { bottom: height * 0.15 + insets.bottom }]} onPress={() => router.push('/quick-request')} activeOpacity={0.8}>
          <Ionicons name="flash" size={24} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity style={[styles.locationFab, { bottom: height * 0.15 + insets.bottom, backgroundColor: colors.card }]} onPress={handleRefresh} activeOpacity={0.8}>
          <Ionicons name="locate" size={22} color={colors.primary} />
        </TouchableOpacity>

        <BottomSheet ref={bottomSheetRef} index={0} snapPoints={snapPoints} backgroundStyle={{ backgroundColor: colors.card }} handleIndicatorStyle={{ backgroundColor: colors.border, width: 40 }} enablePanDownToClose={false}>
          <View style={styles.sheetHeader}>
            <Text style={[styles.sheetTitle, { color: colors.text }]}>{selectedProvider ? selectedProvider.name : `${providers.length} мастеров рядом`}</Text>
            {selectedProvider && <TouchableOpacity onPress={() => setSelectedProvider(null)}><Text style={[styles.sheetClear, { color: colors.primary }]}>Все</Text></TouchableOpacity>}
          </View>
          <BottomSheetScrollView contentContainerStyle={styles.sheetContent} showsVerticalScrollIndicator={false}>
            {isLoading ? (
              <View style={styles.sheetLoading}><ActivityIndicator color={colors.primary} /></View>
            ) : selectedProvider ? (
              <ProviderCard provider={selectedProvider} userLocation={userLocation || KYIV} isSelected={true} onSelect={() => {}} colors={colors} />
            ) : (
              providers.map((provider) => (
                <ProviderCard key={provider.id} provider={provider} userLocation={userLocation || KYIV} isSelected={selectedProvider?.id === provider.id} onSelect={() => handleSelectProvider(provider)} colors={colors} />
              ))
            )}
          </BottomSheetScrollView>
        </BottomSheet>
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  mapContainer: { ...StyleSheet.absoluteFillObject, zIndex: 0 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  loadingText: { fontSize: 14 },
  topBar: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  topBarBtn: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  topBarTitle: { flex: 1, alignItems: 'center' },
  topBarTitleText: { fontSize: 17, fontWeight: '700' },
  topBarSubtitle: { fontSize: 12, marginTop: 2 },
  radiusSelector: { position: 'absolute', left: 16, flexDirection: 'row', padding: 4, borderRadius: 12, gap: 4 },
  radiusBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  radiusBtnText: { fontSize: 13, fontWeight: '600' },
  quickFab: { position: 'absolute', left: 16, width: 56, height: 56, borderRadius: 16, backgroundColor: '#EF4444', alignItems: 'center', justifyContent: 'center' },
  locationFab: { position: 'absolute', right: 16, width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 12 },
  sheetTitle: { fontSize: 18, fontWeight: '700' },
  sheetClear: { fontSize: 14, fontWeight: '600' },
  sheetContent: { paddingHorizontal: 16, paddingBottom: 100, gap: 12 },
  sheetLoading: { paddingVertical: 40 },
  providerCard: { borderRadius: 16, padding: 16 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  cardAvatar: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  cardAvatarText: { color: '#fff', fontSize: 20, fontWeight: '700' },
  cardInfo: { flex: 1, marginLeft: 12 },
  cardName: { fontSize: 16, fontWeight: '700' },
  cardMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 3, gap: 4 },
  cardRating: { fontSize: 13, fontWeight: '600' },
  cardDistance: { fontSize: 12 },
  cardScore: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  cardScoreText: { fontSize: 14, fontWeight: '700' },
  cardBadges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  cardBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, gap: 4 },
  cardBadgeText: { fontSize: 11, fontWeight: '600' },
  cardCTA: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12, gap: 8 },
  cardCTAText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
