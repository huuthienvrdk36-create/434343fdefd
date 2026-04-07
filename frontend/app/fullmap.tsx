import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useThemeContext } from '../src/context/ThemeContext';
import { mapAPI } from '../src/services/api';

const KYIV = { lat: 50.4501, lng: 30.5234 };

const RADIUS_OPTIONS = [
  { value: 1000, label: '1км' },
  { value: 2000, label: '2км' },
  { value: 5000, label: '5км' },
  { value: 10000, label: '10км' },
];

interface MapProvider {
  id: string;
  name: string;
  lat: number;
  lng: number;
  distanceKm: number;
  rating: number;
  isVerified: boolean;
  isPopular: boolean;
  isMobile: boolean;
}

const PIN_COLORS = {
  verified: '#22C55E',
  popular: '#F59E0B',
  mobile: '#8B5CF6',
  standard: '#3B82F6',
};

// Leaflet Map Component - Light Theme
function LeafletMapLight({ userLocation, providers, selectedProvider, onSelectProvider, radius }: any) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

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
          zoom: 13,
          zoomControl: true,
        });

        // Light theme
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap',
          maxZoom: 19,
        }).addTo(mapInstanceRef.current);
      } else {
        mapInstanceRef.current.setView([userLocation.lat, userLocation.lng], 13);
      }

      // User marker
      const userIcon = L.divIcon({
        className: 'user-marker',
        html: `<div style="width:20px;height:20px;background:#3B82F6;border:3px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      });
      L.marker([userLocation.lat, userLocation.lng], { icon: userIcon, zIndexOffset: 1000 }).addTo(mapInstanceRef.current);

      // Radius circle
      L.circle([userLocation.lat, userLocation.lng], {
        radius: radius,
        color: '#3B82F6',
        fillColor: '#3B82F6',
        fillOpacity: 0.08,
        weight: 2,
        dashArray: '5, 5',
      }).addTo(mapInstanceRef.current);

      // Clear markers
      markersRef.current.forEach(m => mapInstanceRef.current.removeLayer(m));
      markersRef.current = [];

      // Provider markers
      providers.forEach((provider: MapProvider) => {
        if (!provider.lat || !provider.lng) return;
        
        const pinColor = provider.isVerified ? PIN_COLORS.verified : 
                         provider.isPopular ? PIN_COLORS.popular :
                         provider.isMobile ? PIN_COLORS.mobile : PIN_COLORS.standard;
        
        const size = selectedProvider?.id === provider.id ? 40 : 34;
        
        const providerIcon = L.divIcon({
          className: 'provider-marker',
          html: `<div style="width:${size}px;height:${size}px;background:${pinColor};border:3px solid white;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:600;color:white;box-shadow:0 2px 8px rgba(0,0,0,0.25);cursor:pointer;">${provider.name.charAt(0).toUpperCase()}</div>`,
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
        const allPoints = [[userLocation.lat, userLocation.lng], ...providers.filter((p: MapProvider) => p.lat && p.lng).map((p: MapProvider) => [p.lat, p.lng])];
        const bounds = L.latLngBounds(allPoints as [number, number][]);
        mapInstanceRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
      }
    };

    initMap();
  }, [userLocation, providers, selectedProvider, radius, onSelectProvider]);

  if (Platform.OS !== 'web') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F3F4F6' }}>
        <Ionicons name="map-outline" size={48} color="#9CA3AF" />
        <Text style={{ marginTop: 12, color: '#6B7280' }}>Карта доступна в приложении</Text>
      </View>
    );
  }

  return <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />;
}

// Provider Card
function ProviderCard({ provider, userLocation, isSelected, onSelect, colors }: any) {
  const pinColor = provider.isVerified ? PIN_COLORS.verified : 
                   provider.isPopular ? PIN_COLORS.popular :
                   provider.isMobile ? PIN_COLORS.mobile : PIN_COLORS.standard;
  
  return (
    <TouchableOpacity
      style={[styles.providerCard, { backgroundColor: colors.card }, isSelected && { borderColor: colors.primary, borderWidth: 2 }]}
      onPress={onSelect}
      activeOpacity={0.7}
    >
      <View style={styles.cardRow}>
        <View style={[styles.cardAvatar, { backgroundColor: pinColor }]}>
          <Text style={styles.cardAvatarText}>{provider.name.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.cardContent}>
          <Text style={[styles.cardName, { color: colors.text }]} numberOfLines={1}>{provider.name}</Text>
          <View style={styles.cardMeta}>
            <Ionicons name="star" size={14} color="#F59E0B" />
            <Text style={[styles.cardRating, { color: colors.text }]}>{provider.rating > 0 ? provider.rating.toFixed(1) : '—'}</Text>
            <Text style={[styles.cardDot, { color: colors.textSecondary }]}>•</Text>
            <Text style={[styles.cardDistance, { color: colors.textSecondary }]}>
              {provider.distanceKm < 1 ? `${Math.round(provider.distanceKm * 1000)}м` : `${provider.distanceKm.toFixed(1)}км`}
            </Text>
          </View>
        </View>
        <TouchableOpacity 
          style={[styles.cardSelectBtn, { backgroundColor: colors.primary }]}
          onPress={() => router.push({
            pathname: '/direct',
            params: { providerId: provider.id, lat: String(userLocation.lat), lng: String(userLocation.lng), providerName: provider.name }
          })}
        >
          <Text style={styles.cardSelectText}>Выбрать</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

export default function FullMapScreen() {
  const { colors } = useThemeContext();
  const insets = useSafeAreaInsets();

  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [providers, setProviders] = useState<MapProvider[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<MapProvider | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [radius, setRadius] = useState(2000);

  const requestLocation = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setUserLocation(KYIV);
        return KYIV;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const coords = { lat: loc.coords.latitude, lng: loc.coords.longitude };
      setUserLocation(coords);
      return coords;
    } catch {
      setUserLocation(KYIV);
      return KYIV;
    }
  }, []);

  const fetchProviders = useCallback(async (lat: number, lng: number, r: number) => {
    try {
      setIsLoading(true);
      const res = await mapAPI.getNearby(lat, lng, r / 1000, 30);
      const validProviders = (res.data || []).filter((p: MapProvider) => p.lat && p.lng && p.lat !== 0 && p.lng !== 0);
      setProviders(validProviders);
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

  const handleRadiusChange = (newRadius: number) => {
    setRadius(newRadius);
    if (userLocation) fetchProviders(userLocation.lat, userLocation.lng, newRadius);
  };

  const handleRefresh = async () => {
    const loc = await requestLocation();
    await fetchProviders(loc.lat, loc.lng, radius);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.mapWrapper}>
        {userLocation ? (
          <LeafletMapLight userLocation={userLocation} providers={providers} selectedProvider={selectedProvider} onSelectProvider={setSelectedProvider} radius={radius} />
        ) : (
          <View style={styles.loadingWrapper}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Определяем местоположение...</Text>
          </View>
        )}
      </View>

      <SafeAreaView edges={['top']} style={styles.topBar}>
        <View style={[styles.topBarInner, { backgroundColor: 'white' }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>Карта мастеров</Text>
          <TouchableOpacity onPress={handleRefresh} style={styles.refreshBtn}>
            <Ionicons name="refresh" size={22} color="#3B82F6" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <View style={[styles.radiusBar, { top: insets.top + 60 }]}>
        {RADIUS_OPTIONS.map((opt) => (
          <TouchableOpacity key={opt.value} style={[styles.radiusBtn, radius === opt.value && styles.radiusBtnActive]} onPress={() => handleRadiusChange(opt.value)}>
            <Text style={[styles.radiusBtnText, radius === opt.value && styles.radiusBtnTextActive]}>{opt.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={[styles.quickFab, { bottom: 220 + insets.bottom }]} onPress={() => router.push('/quick-request')}>
        <Ionicons name="flash" size={24} color="white" />
      </TouchableOpacity>

      <TouchableOpacity style={[styles.locationFab, { bottom: 220 + insets.bottom }]} onPress={handleRefresh}>
        <Ionicons name="locate" size={22} color="#3B82F6" />
      </TouchableOpacity>

      <View style={[styles.bottomPanel, { paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.bottomHandle} />
        <Text style={styles.bottomTitle}>{providers.length > 0 ? `${providers.length} мастеров рядом` : 'Нет мастеров в этом радиусе'}</Text>
        {isLoading ? (
          <ActivityIndicator color="#3B82F6" style={{ marginTop: 20 }} />
        ) : providers.length > 0 ? (
          <ScrollView style={styles.providersList} showsVerticalScrollIndicator={false}>
            {providers.map((provider) => (
              <ProviderCard key={provider.id} provider={provider} userLocation={userLocation || KYIV} isSelected={selectedProvider?.id === provider.id} onSelect={() => setSelectedProvider(provider)} colors={colors} />
            ))}
          </ScrollView>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="search-outline" size={40} color="#9CA3AF" />
            <Text style={styles.emptyText}>Попробуйте увеличить радиус поиска</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  mapWrapper: { flex: 1 },
  loadingWrapper: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F3F4F6' },
  loadingText: { marginTop: 12, fontSize: 14 },
  topBar: { position: 'absolute', top: 0, left: 0, right: 0 },
  topBarInner: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, marginHorizontal: 16, marginTop: 8, borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
  backBtn: { padding: 4 },
  topBarTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '600', color: '#1F2937' },
  refreshBtn: { padding: 4 },
  radiusBar: { position: 'absolute', left: 16, flexDirection: 'row', backgroundColor: 'white', borderRadius: 12, padding: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 3 },
  radiusBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  radiusBtnActive: { backgroundColor: '#3B82F6' },
  radiusBtnText: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  radiusBtnTextActive: { color: 'white' },
  quickFab: { position: 'absolute', left: 16, width: 52, height: 52, borderRadius: 14, backgroundColor: '#EF4444', alignItems: 'center', justifyContent: 'center', shadowColor: '#EF4444', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
  locationFab: { position: 'absolute', right: 16, width: 48, height: 48, borderRadius: 14, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 3 },
  bottomPanel: { backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 12, paddingHorizontal: 16, minHeight: 200, maxHeight: 320, shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 10 },
  bottomHandle: { width: 40, height: 4, backgroundColor: '#E5E7EB', borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  bottomTitle: { fontSize: 18, fontWeight: '700', color: '#1F2937', marginBottom: 12 },
  providersList: { flex: 1 },
  emptyState: { alignItems: 'center', paddingVertical: 24 },
  emptyText: { marginTop: 12, fontSize: 14, color: '#6B7280' },
  providerCard: { borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#E5E7EB' },
  cardRow: { flexDirection: 'row', alignItems: 'center' },
  cardAvatar: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cardAvatarText: { color: 'white', fontSize: 18, fontWeight: '700' },
  cardContent: { flex: 1, marginLeft: 12 },
  cardName: { fontSize: 15, fontWeight: '600' },
  cardMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  cardRating: { fontSize: 13, fontWeight: '600', marginLeft: 4 },
  cardDot: { marginHorizontal: 6 },
  cardDistance: { fontSize: 13 },
  cardSelectBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  cardSelectText: { color: 'white', fontSize: 14, fontWeight: '600' },
});
