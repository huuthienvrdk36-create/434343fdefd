import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useThemeContext } from '../src/context/ThemeContext';

const { width, height } = Dimensions.get('window');

interface MatchedProvider {
  providerId: string;
  branchId: string;
  name: string;
  matchingScore: number;
  reasons: string[];
  distanceKm: number;
  rating: number;
  reviewsCount?: number;
  isVerified: boolean;
  isPopular: boolean;
  isMobile: boolean;
  hasAvailableSlotsToday: boolean;
  priceFrom?: number;
  avgResponseTimeMinutes?: number;
  hasBoost?: boolean;
  lat: number;
  lng: number;
  address?: string;
  phone?: string;
}

const SERVICE_TYPE_LABELS: Record<string, string> = {
  engine_wont_start: 'Не заводится',
  oil_change: 'Замена масла',
  brakes: 'Тормоза',
  diagnostics: 'Диагностика',
  urgent: 'Срочный ремонт',
  suspension: 'Подвеска',
  electrical: 'Электрика',
  other: 'Другое',
};

export default function QuickMatchingScreen() {
  const { colors } = useThemeContext();
  const params = useLocalSearchParams();
  
  const quoteId = params.quoteId as string;
  const serviceType = params.serviceType as string;
  const matchesParam = params.matches as string;
  
  const [selectedProvider, setSelectedProvider] = useState<MatchedProvider | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');

  const matches: MatchedProvider[] = useMemo(() => {
    try {
      return JSON.parse(matchesParam || '[]');
    } catch {
      return [];
    }
  }, [matchesParam]);

  const handleSelectProvider = (provider: MatchedProvider) => {
    setSelectedProvider(provider);
    // 🔥 DIRECT MODE: Переход на экран решения (не на подтверждение)
    router.push({
      pathname: '/direct',
      params: {
        providerId: provider.providerId || provider.branchId,
        lat: String(provider.lat || 50.4501),
        lng: String(provider.lng || 30.5234),
        mode: 'quick_request', // mode влияет на UI
        providerName: provider.name,
      },
    });
  };

  const renderBadges = (provider: MatchedProvider) => (
    <View style={styles.badgesRow}>
      {provider.isVerified && (
        <View style={[styles.badge, { backgroundColor: '#10B98115' }]}>
          <Ionicons name="checkmark-circle" size={12} color="#10B981" />
          <Text style={[styles.badgeText, { color: '#10B981' }]}>Проверенный</Text>
        </View>
      )}
      {provider.isPopular && (
        <View style={[styles.badge, { backgroundColor: '#F59E0B15' }]}>
          <Ionicons name="flame" size={12} color="#F59E0B" />
          <Text style={[styles.badgeText, { color: '#F59E0B' }]}>Популярный</Text>
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
      {(provider.avgResponseTimeMinutes || 0) <= 10 && (
        <View style={[styles.badge, { backgroundColor: '#EF444415' }]}>
          <Ionicons name="flash" size={12} color="#EF4444" />
          <Text style={[styles.badgeText, { color: '#EF4444' }]}>Быстро</Text>
        </View>
      )}
    </View>
  );

  const renderProviderCard = (provider: MatchedProvider, index: number) => {
    const isTop = index < 3;
    
    return (
      <TouchableOpacity
        key={provider.providerId}
        style={[
          styles.providerCard,
          { backgroundColor: colors.card },
          isTop && { borderLeftColor: '#10B981', borderLeftWidth: 3 },
        ]}
        onPress={() => handleSelectProvider(provider)}
        activeOpacity={0.7}
      >
        {/* Header */}
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <Text style={[styles.providerName, { color: colors.text }]} numberOfLines={1}>
              {provider.name}
            </Text>
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={14} color="#F59E0B" />
              <Text style={[styles.ratingText, { color: colors.text }]}>
                {provider.rating?.toFixed(1) || '4.5'}
              </Text>
              {provider.reviewsCount && (
                <Text style={[styles.reviewsText, { color: colors.textSecondary }]}>
                  ({provider.reviewsCount})
                </Text>
              )}
              <Text style={[styles.distanceText, { color: colors.textSecondary }]}>
                • {provider.distanceKm} км
              </Text>
            </View>
          </View>
          <View style={styles.matchScore}>
            <Text style={styles.matchScoreValue}>{provider.matchingScore}%</Text>
            <Text style={styles.matchScoreLabel}>совпадение</Text>
          </View>
        </View>

        {/* Badges */}
        {renderBadges(provider)}

        {/* Reasons */}
        {provider.reasons.length > 0 && (
          <View style={styles.reasonsSection}>
            <Text style={[styles.reasonsTitle, { color: colors.textSecondary }]}>
              Почему этот мастер:
            </Text>
            <View style={styles.reasonsList}>
              {provider.reasons.slice(0, 3).map((reason, i) => (
                <View key={i} style={styles.reasonItem}>
                  <Ionicons name="checkmark" size={14} color="#10B981" />
                  <Text style={[styles.reasonText, { color: colors.text }]}>{reason}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Price & Action */}
        <View style={styles.cardFooter}>
          {provider.priceFrom ? (
            <Text style={[styles.priceText, { color: colors.text }]}>
              от {provider.priceFrom} ₴
            </Text>
          ) : (
            <Text style={[styles.priceText, { color: colors.textSecondary }]}>
              Цена по запросу
            </Text>
          )}
          <TouchableOpacity
            style={[styles.selectButton, { backgroundColor: colors.primary }]}
            onPress={() => handleSelectProvider(provider)}
          >
            <Text style={styles.selectButtonText}>Выбрать</Text>
          </TouchableOpacity>
        </View>

        {/* Top highlight */}
        {isTop && provider.hasBoost && (
          <View style={styles.topHighlight}>
            <Ionicons name="trending-up" size={12} color="#10B981" />
            <Text style={styles.topHighlightText}>Этот мастер чаще получает заказы</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {SERVICE_TYPE_LABELS[serviceType] || 'Поиск мастеров'}
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            {matches.length} мастеров готовы помочь
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.viewToggle, { backgroundColor: colors.card }]}
          onPress={() => setViewMode(viewMode === 'list' ? 'map' : 'list')}
        >
          <Ionicons
            name={viewMode === 'list' ? 'map-outline' : 'list-outline'}
            size={20}
            color={colors.text}
          />
        </TouchableOpacity>
      </View>

      {/* Info Banner */}
      <View style={[styles.infoBanner, { backgroundColor: colors.card }]}>
        <Ionicons name="flash" size={16} color="#F59E0B" />
        <Text style={[styles.infoBannerText, { color: colors.textSecondary }]}>
          Заявка создана • Мастера уже видят её
        </Text>
      </View>

      {/* Content */}
      {matches.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="search-outline" size={48} color={colors.textSecondary} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            Мастера не найдены
          </Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Попробуйте расширить радиус поиска
          </Text>
        </View>
      ) : (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Top 3 Section */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Лучшие мастера для вас
            </Text>
            {matches.slice(0, 3).map((provider, index) => renderProviderCard(provider, index))}
          </View>

          {/* Other Providers */}
          {matches.length > 3 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                Другие варианты
              </Text>
              {matches.slice(3).map((provider, index) => renderProviderCard(provider, index + 3))}
            </View>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    paddingHorizontal: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  headerSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  viewToggle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 10,
    gap: 8,
  },
  infoBannerText: {
    fontSize: 13,
  },
  content: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  providerCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    position: 'relative',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  cardHeaderLeft: {
    flex: 1,
    marginRight: 12,
  },
  providerName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 13,
    fontWeight: '600',
  },
  reviewsText: {
    fontSize: 12,
  },
  distanceText: {
    fontSize: 12,
  },
  matchScore: {
    backgroundColor: '#10B98115',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
  },
  matchScoreValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#10B981',
  },
  matchScoreLabel: {
    fontSize: 9,
    color: '#10B981',
    textTransform: 'uppercase',
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
  reasonsSection: {
    marginBottom: 12,
  },
  reasonsTitle: {
    fontSize: 12,
    marginBottom: 6,
  },
  reasonsList: {
    gap: 4,
  },
  reasonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  reasonText: {
    fontSize: 13,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  priceText: {
    fontSize: 16,
    fontWeight: '600',
  },
  selectButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  selectButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  topHighlight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#10B98130',
  },
  topHighlightText: {
    fontSize: 11,
    color: '#10B981',
    fontStyle: 'italic',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
});
