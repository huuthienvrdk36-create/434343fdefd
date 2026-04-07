import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  Animated,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { useThemeContext } from '../../src/context/ThemeContext';
import { useLanguage } from '../../src/context/LanguageContext';
import { useAuth } from '../../src/context/AuthContext';
import { api } from '../../src/services/api';

const { width, height } = Dimensions.get('window');

// ═══════════════════════════════════════════════════════════
// 🔥 V5 UX — ГЛАВНАЯ = РЕШЕНИЕ ЗАДАЧИ, НЕ МЕНЮ
// 
// Структура:
// 1. HERO: "Что случилось с машиной?" + 2 кнопки
// 2. SMART MATCHING: 1-2 лучших мастера
// 3. QUICK ACTIONS: компактные иконки
// 4. NEARBY: при скролле
// ═══════════════════════════════════════════════════════════

// 🔥 PROVIDER HOME (без изменений)
function ProviderHome() {
  const router = useRouter();
  const { colors, isDark } = useThemeContext();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({ pending: 0, today: 0, completed: 0, revenue: 0 });
  const [pendingQuotes, setPendingQuotes] = useState<any[]>([]);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const fetchData = useCallback(async () => {
    try {
      // Fetch incoming quotes for provider
      const quotesRes = await api.get('/quotes/incoming');
      const quotes = quotesRes.data || [];
      setPendingQuotes(quotes.filter((q: any) => q.status === 'pending').slice(0, 3));
      
      setStats({
        pending: quotes.filter((q: any) => q.status === 'pending').length,
        today: quotes.filter((q: any) => {
          const date = new Date(q.createdAt);
          return date.toDateString() === new Date().toDateString();
        }).length,
        completed: 0,
        revenue: 0,
      });
    } catch (error) {
      console.log('Provider fetch error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <Animated.ScrollView
          style={{ opacity: fadeAnim }}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        >
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={[styles.greeting, { color: colors.textSecondary }]}>Панель мастера</Text>
              <Text style={[styles.userName, { color: colors.text }]}>{user?.firstName || 'Мастер'}</Text>
            </View>
            <TouchableOpacity
              style={[styles.headerIconBtn, { backgroundColor: colors.card }]}
              onPress={() => router.push('/settings')}
            >
              <Ionicons name="settings-outline" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Stats Cards */}
          <View style={styles.providerStats}>
            <View style={[styles.statCard, { backgroundColor: '#EF444415' }]}>
              <Ionicons name="time" size={24} color="#EF4444" />
              <Text style={[styles.statValue, { color: colors.text }]}>{stats.pending}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Ожидают</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: '#3B82F615' }]}>
              <Ionicons name="today" size={24} color="#3B82F6" />
              <Text style={[styles.statValue, { color: colors.text }]}>{stats.today}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Сегодня</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: '#10B98115' }]}>
              <Ionicons name="checkmark-circle" size={24} color="#10B981" />
              <Text style={[styles.statValue, { color: colors.text }]}>{stats.completed}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Выполнено</Text>
            </View>
          </View>

          {/* Pending Quotes */}
          {pendingQuotes.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Новые заявки</Text>
              {pendingQuotes.map((quote) => (
                <TouchableOpacity
                  key={quote._id}
                  style={[styles.quoteCard, { backgroundColor: colors.card }]}
                  onPress={() => router.push({ pathname: '/quote-details', params: { id: quote._id } })}
                >
                  <View style={styles.quoteHeader}>
                    <Text style={[styles.quoteTitle, { color: colors.text }]} numberOfLines={1}>
                      {quote.description || 'Заявка'}
                    </Text>
                    <View style={[styles.newBadge, { backgroundColor: '#EF4444' }]}>
                      <Text style={styles.newBadgeText}>Новая</Text>
                    </View>
                  </View>
                  <View style={styles.quoteFooter}>
                    <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
                    <Text style={[styles.quoteTime, { color: colors.textSecondary }]}>
                      {new Date(quote.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Quick Actions */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Быстрые действия</Text>
            <View style={styles.providerActions}>
              <TouchableOpacity
                style={[styles.providerActionBtn, { backgroundColor: colors.card }]}
                onPress={() => router.push('/my-quotes')}
              >
                <Ionicons name="document-text" size={24} color={colors.primary} />
                <Text style={[styles.providerActionText, { color: colors.text }]}>Заявки</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.providerActionBtn, { backgroundColor: colors.card }]}
                onPress={() => router.push('/my-bookings')}
              >
                <Ionicons name="calendar" size={24} color="#10B981" />
                <Text style={[styles.providerActionText, { color: colors.text }]}>Записи</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.providerActionBtn, { backgroundColor: colors.card }]}
                onPress={() => router.push('/provider-dashboard')}
              >
                <Ionicons name="stats-chart" size={24} color="#F59E0B" />
                <Text style={[styles.providerActionText, { color: colors.text }]}>Статистика</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={{ height: 100 }} />
        </Animated.ScrollView>
      </SafeAreaView>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════
// 🔥 V5 CUSTOMER HOME — UBER-STYLE UX
// ═══════════════════════════════════════════════════════════
function CustomerHome() {
  const router = useRouter();
  const { colors, isDark } = useThemeContext();
  const { t } = useLanguage();
  const { user } = useAuth();

  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [matchedProviders, setMatchedProviders] = useState<any[]>([]);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    initLocation();
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, []);

  const initLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setUserLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude });
        fetchMatching(loc.coords.latitude, loc.coords.longitude);
      } else {
        // Default: Kyiv
        setUserLocation({ lat: 50.4501, lng: 30.5234 });
        fetchMatching(50.4501, 30.5234);
      }
    } catch {
      setUserLocation({ lat: 50.4501, lng: 30.5234 });
      fetchMatching(50.4501, 30.5234);
    }
  };

  const fetchMatching = async (lat: number, lng: number) => {
    try {
      const res = await api.get('/matching/nearby', { params: { lat, lng, limit: 3 } });
      setMatchedProviders(res.data || []);
    } catch (error) {
      console.log('Matching error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    if (userLocation) {
      fetchMatching(userLocation.lat, userLocation.lng);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Доброе утро';
    if (hour < 18) return 'Добрый день';
    return 'Добрый вечер';
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <Animated.ScrollView
          style={{ opacity: fadeAnim }}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        >
          {/* ═══════ HEADER — 3 ICONS (Alerts, Messages, Map) ═══════ */}
          <View style={styles.header}>
            <View>
              <Text style={[styles.greeting, { color: colors.textSecondary }]}>{getGreeting()}</Text>
              <Text style={[styles.userName, { color: colors.text }]}>{user?.firstName || 'Гость'}</Text>
            </View>
            <View style={styles.headerRight}>
              {/* Notifications/Alerts */}
              <TouchableOpacity
                style={[styles.headerIconBtn, { backgroundColor: colors.card }]}
                onPress={() => router.push('/notifications')}
              >
                <Ionicons name="notifications-outline" size={20} color={colors.text} />
                {/* Badge for unread */}
                <View style={styles.headerBadge}>
                  <Text style={styles.headerBadgeText}>2</Text>
                </View>
              </TouchableOpacity>

              {/* Messages */}
              <TouchableOpacity
                style={[styles.headerIconBtn, { backgroundColor: colors.card }]}
                onPress={() => router.push('/messages')}
              >
                <Ionicons name="chatbubble-outline" size={20} color={colors.text} />
              </TouchableOpacity>

              {/* Map - opens full Google Maps */}
              <TouchableOpacity
                style={[styles.headerIconBtn, { backgroundColor: colors.primary }]}
                onPress={() => router.push('/fullmap')}
              >
                <Ionicons name="map" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>

          {/* ═══════ 🔥 HERO — ОДНО ДЕЙСТВИЕ ═══════ */}
          <View style={styles.heroSection}>
            <Text style={[styles.heroQuestion, { color: colors.text }]}>
              Что случилось с машиной?
            </Text>

            {/* Primary CTA — Quick Request */}
            <TouchableOpacity activeOpacity={0.9} onPress={() => router.push('/quick-request')}>
              <LinearGradient
                colors={['#EF4444', '#DC2626', '#B91C1C']}
                style={styles.primaryCTA}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="flash" size={24} color="#fff" />
                <View style={styles.ctaTextBlock}>
                  <Text style={styles.primaryCTATitle}>Быстро решить</Text>
                  <Text style={styles.primaryCTASub}>1 tap — мастера уже ищут</Text>
                </View>
                <Ionicons name="arrow-forward-circle" size={28} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>

            {/* Secondary CTA — Services */}
            <TouchableOpacity
              style={[styles.secondaryCTA, { backgroundColor: colors.card }]}
              onPress={() => router.push('/services')}
              activeOpacity={0.7}
            >
              <View style={[styles.secondaryCTAIcon, { backgroundColor: colors.primary + '15' }]}>
                <Ionicons name="list" size={20} color={colors.primary} />
              </View>
              <Text style={[styles.secondaryCTAText, { color: colors.text }]}>Выбрать услугу</Text>
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* ═══════ 🔥 SMART MATCHING — 1-2 КАРТОЧКИ ═══════ */}
          {matchedProviders.length > 0 && (
            <View style={styles.matchingSection}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Лучшие мастера рядом
              </Text>
              
              {matchedProviders.slice(0, 2).map((provider, index) => (
                <TouchableOpacity
                  key={provider.providerId || provider._id || index}
                  style={[styles.providerCard, { backgroundColor: colors.card }]}
                  onPress={() => router.push({ 
                    pathname: '/direct', 
                    params: { 
                      providerId: provider.providerId || provider.organizationId || provider._id,
                      lat: String(userLocation?.lat || 50.4501),
                      lng: String(userLocation?.lng || 30.5234),
                      mode: 'explore',
                      providerName: provider.name,
                    } 
                  })}
                  activeOpacity={0.7}
                >
                  <View style={styles.providerCardHeader}>
                    <View style={[styles.providerAvatar, { backgroundColor: colors.primary }]}>
                      <Text style={styles.providerAvatarText}>
                        {(provider.name || 'М').charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.providerInfo}>
                      <Text style={[styles.providerName, { color: colors.text }]} numberOfLines={1}>
                        {provider.name || 'Мастер'}
                      </Text>
                      <View style={styles.providerMeta}>
                        <Ionicons name="star" size={14} color="#F59E0B" />
                        <Text style={[styles.providerRating, { color: colors.text }]}>
                          {(provider.ratingAvg || provider.rating || 4.5).toFixed(1)}
                        </Text>
                        <Text style={[styles.providerDistance, { color: colors.textSecondary }]}>
                          • {provider.distanceKm?.toFixed(1) || '1.2'} км
                        </Text>
                        {provider.avgResponseTimeMinutes && (
                          <Text style={[styles.providerResponse, { color: colors.textSecondary }]}>
                            • ≈{provider.avgResponseTimeMinutes} мин
                          </Text>
                        )}
                      </View>
                    </View>
                    {provider.matchingScore && (
                      <View style={styles.matchBadge}>
                        <Text style={styles.matchBadgeText}>{provider.matchingScore}%</Text>
                      </View>
                    )}
                  </View>

                  {/* Badges */}
                  <View style={styles.badgesRow}>
                    {provider.isVerified && (
                      <View style={[styles.badge, { backgroundColor: '#10B98115' }]}>
                        <Ionicons name="checkmark-circle" size={12} color="#10B981" />
                        <Text style={[styles.badgeText, { color: '#10B981' }]}>Проверенный</Text>
                      </View>
                    )}
                    {provider.hasAvailableSlotsToday && (
                      <View style={[styles.badge, { backgroundColor: '#3B82F615' }]}>
                        <Ionicons name="calendar" size={12} color="#3B82F6" />
                        <Text style={[styles.badgeText, { color: '#3B82F6' }]}>Сегодня</Text>
                      </View>
                    )}
                    {provider.isMobile && (
                      <View style={[styles.badge, { backgroundColor: '#8B5CF615' }]}>
                        <Ionicons name="car" size={12} color="#8B5CF6" />
                        <Text style={[styles.badgeText, { color: '#8B5CF6' }]}>Выезд</Text>
                      </View>
                    )}
                  </View>

                  {/* Why this provider */}
                  {provider.reasons && provider.reasons.length > 0 && (
                    <View style={styles.reasonsBlock}>
                      {provider.reasons.slice(0, 2).map((reason: string, i: number) => (
                        <View key={i} style={styles.reasonItem}>
                          <Ionicons name="checkmark" size={12} color="#10B981" />
                          <Text style={[styles.reasonText, { color: colors.textSecondary }]}>{reason}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  <TouchableOpacity
                    style={[styles.selectBtn, { backgroundColor: colors.primary }]}
                    onPress={() => router.push({ 
                      pathname: '/direct', 
                      params: { 
                        providerId: provider.providerId || provider.organizationId || provider._id,
                        lat: String(userLocation?.lat || 50.4501),
                        lng: String(userLocation?.lng || 30.5234),
                        mode: 'explore',
                        providerName: provider.name,
                      } 
                    })}
                  >
                    <Text style={styles.selectBtnText}>Выбрать</Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}

              {/* See all */}
              <TouchableOpacity
                style={styles.seeAllBtn}
                onPress={() => router.push('/map')}
              >
                <Text style={[styles.seeAllText, { color: colors.primary }]}>Показать всех на карте</Text>
                <Ionicons name="map-outline" size={16} color={colors.primary} />
              </TouchableOpacity>
            </View>
          )}

          {/* ═══════ QUICK ACTIONS — COMPACT ═══════ */}
          <View style={styles.quickActionsSection}>
            <View style={styles.quickActionsRow}>
              <TouchableOpacity
                style={[styles.quickActionItem, { backgroundColor: colors.card }]}
                onPress={() => router.push('/map')}
              >
                <Ionicons name="location" size={22} color="#EF4444" />
                <Text style={[styles.quickActionText, { color: colors.text }]}>Найти СТО</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.quickActionItem, { backgroundColor: colors.card }]}
                onPress={() => router.push('/my-garage')}
              >
                <Ionicons name="car-sport" size={22} color="#3B82F6" />
                <Text style={[styles.quickActionText, { color: colors.text }]}>Мой гараж</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.quickActionItem, { backgroundColor: colors.card }]}
                onPress={() => router.push('/my-bookings')}
              >
                <Ionicons name="calendar" size={22} color="#10B981" />
                <Text style={[styles.quickActionText, { color: colors.text }]}>Записи</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.quickActionItem, { backgroundColor: colors.card }]}
                onPress={() => router.push('/my-quotes')}
              >
                <Ionicons name="document-text" size={22} color="#F59E0B" />
                <Text style={[styles.quickActionText, { color: colors.text }]}>Заявки</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={{ height: 120 }} />
        </Animated.ScrollView>
      </SafeAreaView>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════
// MAIN EXPORT
// ═══════════════════════════════════════════════════════════
export default function HomeScreen() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  if (user?.role === 'provider_owner') {
    return <ProviderHome />;
  }

  return <CustomerHome />;
}

// ═══════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
  greeting: {
    fontSize: 14,
  },
  userName: {
    fontSize: 22,
    fontWeight: '700',
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    gap: 10,
  },
  headerIconBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  headerBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#EF4444',
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },

  // Hero Section
  heroSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  heroQuestion: {
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 16,
    lineHeight: 32,
  },
  primaryCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    borderRadius: 16,
    gap: 14,
  },
  ctaTextBlock: {
    flex: 1,
  },
  primaryCTATitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  primaryCTASub: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
  },
  secondaryCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    marginTop: 10,
  },
  secondaryCTAIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  secondaryCTAText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },

  // Matching Section
  matchingSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 14,
  },
  providerCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  providerCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  providerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  providerAvatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
  },
  providerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  providerName: {
    fontSize: 16,
    fontWeight: '600',
  },
  providerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  providerRating: {
    fontSize: 13,
    fontWeight: '600',
  },
  providerDistance: {
    fontSize: 13,
  },
  providerResponse: {
    fontSize: 12,
  },
  matchBadge: {
    backgroundColor: '#10B98120',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  matchBadgeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#10B981',
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '500',
  },
  reasonsBlock: {
    marginBottom: 12,
  },
  reasonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  reasonText: {
    fontSize: 12,
  },
  selectBtn: {
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 10,
  },
  selectBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Quick Actions
  quickActionsSection: {
    paddingHorizontal: 20,
  },
  quickActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickActionItem: {
    width: (width - 60) / 4,
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 14,
  },
  quickActionText: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 8,
    textAlign: 'center',
  },

  // Provider Home Styles
  providerStats: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 10,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 14,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  quoteCard: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  quoteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  quoteTitle: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
    marginRight: 10,
  },
  newBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  newBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  quoteFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  quoteTime: {
    fontSize: 12,
  },
  providerActions: {
    flexDirection: 'row',
    gap: 10,
  },
  providerActionBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 18,
    borderRadius: 14,
  },
  providerActionText: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 8,
  },
});
