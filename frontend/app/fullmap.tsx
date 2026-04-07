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
            {provider.avgResponseTimeMinutes > 0 && (
              <Text style={[styles.cardETA, { color: colors.primary }]}>• ≈{provider.avgResponseTimeMinutes}мин</Text>
            )}
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

      {provider.reasons?.length > 0 && (
        <View style={styles.cardReasons}>
          {provider.reasons.slice(0, 2).map((reason: string, i: number) => (
            <View key={i} style={styles.cardReasonItem}>
              <Ionicons name="checkmark-circle" size={12} color="#10B981" />
              <Text style={[styles.cardReasonText, { color: colors.textSecondary }]}>{reason}</Text>
            </View>
          ))}
        </View>
      )}

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

export default function FullMapScreenV6() {
  const { colors } = useThemeContext();
  const insets = useSafeAreaInsets();
  const bottomSheetRef = useRef<BottomSheet>(null);

  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [providers, setProviders] = useState<MapProvider[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<MapProvider | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [radius, setRadius] = useState(2000);

  const snapPoints = useMemo(() => ['12%', '45%', '85%'], []);

  const getUserLocation = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setUserLocation(KYIV);
        return KYIV;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
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
      const loc = await getUserLocation();
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

  const handleCenterOnUser = useCallback(async () => {
    const loc = await getUserLocation();
    fetchProviders(loc.lat, loc.lng, radius);
  }, [radius, fetchProviders]);

  const getMapUrl = useCallback(() => {
    if (!userLocation) return '';
    const delta = Math.max((radius / 1000) * 0.015, 0.02);
    return `https://www.openstreetmap.org/export/embed.html?bbox=${userLocation.lng - delta}%2C${userLocation.lat - delta}%2C${userLocation.lng + delta}%2C${userLocation.lat + delta}&layer=mapnik&marker=${userLocation.lat}%2C${userLocation.lng}`;
  }, [userLocation, radius]);

  const getMarkerPosition = useCallback((provider: MapProvider) => {
    if (!userLocation) return { left: '50%', top: '50%' };
    const deltaLat = provider.lat - userLocation.lat;
    const deltaLng = provider.lng - userLocation.lng;
    const scale = 35 / (radius / 1000);
    const left = 50 + deltaLng * scale * 100;
    const top = 50 - deltaLat * scale * 100;
    return { left: `${Math.max(5, Math.min(95, left))}%`, top: `${Math.max(15, Math.min(75, top))}%` };
  }, [userLocation, radius]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* MAP */}
        <View style={styles.mapContainer}>
          {Platform.OS === 'web' && userLocation ? (
            <>
              <iframe src={getMapUrl()} style={{ width: '100%', height: '100%', border: 'none' } as any} title="Map" />
              <View style={styles.markersOverlay} pointerEvents="box-none">
                {providers.map((provider) => {
                  const pos = getMarkerPosition(provider);
                  const pinColor = PIN_COLORS[provider.pinType as keyof typeof PIN_COLORS] || PIN_COLORS.standard;
                  const isSelected = selectedProvider?.id === provider.id;
                  const isTopMatch = provider.pinType === 'topMatch';
                  
                  return (
                    <TouchableOpacity
                      key={provider.id}
                      style={[styles.marker, {
                        left: pos.left, top: pos.top, backgroundColor: pinColor,
                        width: isTopMatch ? 44 : isSelected ? 40 : 36,
                        height: isTopMatch ? 44 : isSelected ? 40 : 36,
                        borderRadius: isTopMatch ? 22 : isSelected ? 20 : 18,
                        borderWidth: isSelected ? 3 : 2,
                        borderColor: isSelected ? '#fff' : 'rgba(255,255,255,0.8)',
                        zIndex: isTopMatch ? 100 : isSelected ? 50 : 10,
                      }]}
                      onPress={() => handleSelectProvider(provider)}
                    >
                      <Text style={[styles.markerText, { fontSize: isTopMatch ? 16 : 14 }]}>{provider.name.charAt(0)}</Text>
                    </TouchableOpacity>
                  );
                })}
                <View style={[styles.userMarker, { left: '50%', top: '50%' }]}>
                  <View style={styles.userMarkerOuter}><View style={styles.userMarkerInner} /></View>
                </View>
              </View>
            </>
          ) : (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Определяем местоположение...</Text>
            </View>
          )}
        </View>

        {/* TOP BAR */}
        <SafeAreaView edges={['top']} style={[styles.topBar, { backgroundColor: colors.card + 'F0' }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.topBarBtn}>
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.topBarTitle}>
            <Text style={[styles.topBarTitleText, { color: colors.text }]}>Карта мастеров</Text>
            {userLocation && <Text style={[styles.topBarSubtitle, { color: colors.textSecondary }]}>{providers.length} мастеров рядом</Text>}
          </View>
          <TouchableOpacity onPress={handleCenterOnUser} style={[styles.topBarBtn, { backgroundColor: colors.backgroundTertiary }]}>
            <Ionicons name="refresh" size={20} color={colors.primary} />
          </TouchableOpacity>
        </SafeAreaView>

        {/* RADIUS SELECTOR */}
        <View style={[styles.radiusSelector, { backgroundColor: colors.card + 'F0', top: insets.top + 70 }]}>
          {RADIUS_OPTIONS.map((opt) => (
            <TouchableOpacity key={opt.value} style={[styles.radiusBtn, { backgroundColor: radius === opt.value ? colors.primary : 'transparent' }]} onPress={() => handleRadiusChange(opt.value)}>
              <Text style={[styles.radiusBtnText, { color: radius === opt.value ? '#fff' : colors.textSecondary }]}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* FLOATING CONTROLS */}
        <View style={[styles.floatingControls, { bottom: height * 0.15 + insets.bottom }]}>
          <TouchableOpacity style={[styles.floatingBtn, { backgroundColor: colors.card }]} onPress={handleCenterOnUser}>
            <Ionicons name="locate" size={22} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* QUICK FAB */}
        <TouchableOpacity style={[styles.quickFab, { bottom: height * 0.15 + insets.bottom }]} onPress={() => router.push('/quick-request')} activeOpacity={0.8}>
          <Ionicons name="flash" size={24} color="#fff" />
        </TouchableOpacity>

        {/* BOTTOM SHEET */}
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
  markersOverlay: { ...StyleSheet.absoluteFillObject, pointerEvents: 'box-none' },
  marker: { position: 'absolute', alignItems: 'center', justifyContent: 'center', marginLeft: -18, marginTop: -18 },
  markerText: { color: '#fff', fontWeight: '700' },
  userMarker: { position: 'absolute', marginLeft: -16, marginTop: -16 },
  userMarkerOuter: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(59, 130, 246, 0.3)', alignItems: 'center', justifyContent: 'center' },
  userMarkerInner: { width: 16, height: 16, borderRadius: 8, backgroundColor: '#3B82F6', borderWidth: 3, borderColor: '#fff' },
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
  floatingControls: { position: 'absolute', right: 16, gap: 12 },
  floatingBtn: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  quickFab: { position: 'absolute', left: 16, width: 56, height: 56, borderRadius: 16, backgroundColor: '#EF4444', alignItems: 'center', justifyContent: 'center' },
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
  cardETA: { fontSize: 12, fontWeight: '600' },
  cardScore: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  cardScoreText: { fontSize: 14, fontWeight: '700' },
  cardBadges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  cardBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, gap: 4 },
  cardBadgeText: { fontSize: 11, fontWeight: '600' },
  cardReasons: { marginBottom: 12 },
  cardReasonItem: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  cardReasonText: { fontSize: 12 },
  cardCTA: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12, gap: 8 },
  cardCTAText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
