import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../src/services/api';
import { useAuth } from '../../src/context/AuthContext';

const { width } = Dimensions.get('window');

export default function ProviderStatsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [period, setPeriod] = useState<'week' | 'month' | 'all'>('month');

  const fetchStats = async () => {
    try {
      const res = await api.get('/provider/stats', { params: { period } });
      setStats(res.data || {
        totalQuotes: 0,
        respondedQuotes: 0,
        totalBookings: 0,
        completedBookings: 0,
        totalRevenue: 0,
        avgResponseTime: 0,
        conversionRate: 0,
        avgRating: 5.0,
      });
    } catch (error) {
      // Mock data for demo
      setStats({
        totalQuotes: 24,
        respondedQuotes: 18,
        totalBookings: 15,
        completedBookings: 12,
        totalRevenue: 156000,
        avgResponseTime: 45,
        conversionRate: 75,
        avgRating: 4.8,
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (user) fetchStats();
    else setLoading(false);
  }, [user, period]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchStats();
  };

  if (!user || (user.role !== 'provider_owner' && user.role !== 'provider_manager')) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.title}>Статистика</Text>
          <View style={{ width: 44 }} />
        </View>
        <View style={styles.authPrompt}>
          <Ionicons name="stats-chart" size={64} color="#6B7280" />
          <Text style={styles.authTitle}>Только для владельцев СТО</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.title}>Статистика</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3B82F6" />}
      >
        {/* Period Selector */}
        <View style={styles.periodRow}>
          {(['week', 'month', 'all'] as const).map((p) => (
            <TouchableOpacity
              key={p}
              style={[styles.periodBtn, period === p && styles.periodBtnActive]}
              onPress={() => setPeriod(p)}
            >
              <Text style={[styles.periodText, period === p && styles.periodTextActive]}>
                {p === 'week' ? 'Неделя' : p === 'month' ? 'Месяц' : 'Всё время'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading ? (
          <ActivityIndicator color="#3B82F6" style={{ marginTop: 40 }} />
        ) : stats ? (
          <>
            {/* Main Stats Grid */}
            <View style={styles.statsGrid}>
              <StatCard
                icon="document-text"
                iconColor="#3B82F6"
                value={stats.totalQuotes}
                label="Заявок получено"
              />
              <StatCard
                icon="checkmark-circle"
                iconColor="#10B981"
                value={stats.completedBookings}
                label="Записей выполнено"
              />
              <StatCard
                icon="cash"
                iconColor="#F59E0B"
                value={`${(stats.totalRevenue / 1000).toFixed(0)}K`}
                label="Доход (₽)"
              />
              <StatCard
                icon="star"
                iconColor="#8B5CF6"
                value={stats.avgRating?.toFixed(1)}
                label="Средний рейтинг"
              />
            </View>

            {/* Conversion Metrics */}
            <Text style={styles.sectionTitle}>Конверсия</Text>
            <View style={styles.conversionCard}>
              <View style={styles.conversionRow}>
                <Text style={styles.conversionLabel}>Ответы на заявки</Text>
                <Text style={styles.conversionValue}>
                  {stats.respondedQuotes}/{stats.totalQuotes} ({Math.round((stats.respondedQuotes / stats.totalQuotes) * 100 || 0)}%)
                </Text>
              </View>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${(stats.respondedQuotes / stats.totalQuotes) * 100 || 0}%`, backgroundColor: '#3B82F6' },
                  ]}
                />
              </View>

              <View style={[styles.conversionRow, { marginTop: 16 }]}>
                <Text style={styles.conversionLabel}>Заявки → Записи</Text>
                <Text style={styles.conversionValue}>
                  {stats.totalBookings}/{stats.respondedQuotes} ({stats.conversionRate}%)
                </Text>
              </View>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${stats.conversionRate}%`, backgroundColor: '#10B981' },
                  ]}
                />
              </View>
            </View>

            {/* Response Time */}
            <Text style={styles.sectionTitle}>Время отклика</Text>
            <View style={styles.responseCard}>
              <View style={styles.responseIcon}>
                <Ionicons name="time" size={28} color="#F59E0B" />
              </View>
              <View style={styles.responseInfo}>
                <Text style={styles.responseValue}>{stats.avgResponseTime} мин</Text>
                <Text style={styles.responseLabel}>Среднее время ответа на заявку</Text>
              </View>
              <View style={styles.responseStatus}>
                {stats.avgResponseTime <= 30 ? (
                  <View style={[styles.statusBadge, { backgroundColor: 'rgba(16,185,129,0.15)' }]}>
                    <Ionicons name="checkmark" size={14} color="#10B981" />
                    <Text style={[styles.statusText, { color: '#10B981' }]}>Отлично</Text>
                  </View>
                ) : stats.avgResponseTime <= 60 ? (
                  <View style={[styles.statusBadge, { backgroundColor: 'rgba(245,158,11,0.15)' }]}>
                    <Ionicons name="time" size={14} color="#F59E0B" />
                    <Text style={[styles.statusText, { color: '#F59E0B' }]}>Хорошо</Text>
                  </View>
                ) : (
                  <View style={[styles.statusBadge, { backgroundColor: 'rgba(239,68,68,0.15)' }]}>
                    <Ionicons name="alert" size={14} color="#EF4444" />
                    <Text style={[styles.statusText, { color: '#EF4444' }]}>Медленно</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Tips */}
            <View style={styles.tipsCard}>
              <Ionicons name="bulb" size={24} color="#F59E0B" />
              <Text style={styles.tipsText}>
                Быстрые ответы повышают конверсию на 40%. Старайтесь отвечать в течение 30 минут.
              </Text>
            </View>
          </>
        ) : (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Нет данных</Text>
          </View>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({ icon, iconColor, value, label }: any) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: `${iconColor}15` }]}>
        <Ionicons name={icon} size={22} color={iconColor} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  backBtn: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: 18, fontWeight: '600', color: '#FFFFFF' },
  content: { flex: 1, paddingHorizontal: 16 },
  periodRow: {
    flexDirection: 'row', marginTop: 16, backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12, padding: 4,
  },
  periodBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center',
  },
  periodBtnActive: { backgroundColor: '#3B82F6' },
  periodText: { fontSize: 14, color: '#9CA3AF' },
  periodTextActive: { color: '#FFFFFF', fontWeight: '600' },
  statsGrid: {
    flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginTop: 20,
  },
  statCard: {
    width: (width - 44) / 2, backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16, padding: 16, marginBottom: 12, alignItems: 'center',
  },
  statIcon: {
    width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
  },
  statValue: { fontSize: 24, fontWeight: '700', color: '#FFFFFF', marginTop: 12 },
  statLabel: { fontSize: 13, color: '#6B7280', marginTop: 4, textAlign: 'center' },
  sectionTitle: {
    fontSize: 13, fontWeight: '600', color: '#6B7280',
    marginTop: 24, marginBottom: 12, textTransform: 'uppercase',
  },
  conversionCard: {
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 16,
  },
  conversionRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8,
  },
  conversionLabel: { fontSize: 14, color: '#FFFFFF' },
  conversionValue: { fontSize: 14, color: '#9CA3AF' },
  progressBar: {
    height: 8, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 4, overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 4 },
  responseCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 16,
  },
  responseIcon: {
    width: 52, height: 52, borderRadius: 14, backgroundColor: 'rgba(245,158,11,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  responseInfo: { flex: 1, marginLeft: 14 },
  responseValue: { fontSize: 22, fontWeight: '700', color: '#FFFFFF' },
  responseLabel: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  responseStatus: {},
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
  },
  statusText: { fontSize: 12, fontWeight: '600' },
  tipsCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: 'rgba(245,158,11,0.1)', borderRadius: 14, padding: 16, marginTop: 16,
  },
  tipsText: { flex: 1, fontSize: 13, color: '#F59E0B', lineHeight: 18 },
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 16, color: '#6B7280' },
  authPrompt: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  authTitle: { fontSize: 18, fontWeight: '600', color: '#FFFFFF', marginTop: 16 },
});
