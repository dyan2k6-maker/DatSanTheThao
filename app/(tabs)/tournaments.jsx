import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { EmptyState } from '../../components/ui/EmptyState';
import { Badge } from '../../components/ui/Badge';
import { db } from '../../services/db';
import { formatVND, formatDateVN } from '../../utils/format';
import { RADIUS, SPACING, SHADOWS } from '../../constants/theme';

export default function TournamentsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const [activeTab, setActiveTab] = useState('open'); // 'open' | 'ongoing' | 'completed'
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadTournaments();
    const unsub = db.subscribe('tournaments', (list) => {
      setTournaments(list);
      setLoading(false);
    });
    return () => unsub?.();
  }, []);

  const loadTournaments = async () => {
    setLoading(true);
    try {
      const list = await db.getAll('tournaments');
      setTournaments(list);
    } catch (e) {
    } finally {
      setLoading(false);
    }
  };

  const filteredTournaments = tournaments.filter((t) => t.status === activeTab);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Top Header */}
      <View
        style={[
          styles.headerBar,
          {
            paddingTop: Math.max(insets.top, 14) + 6,
            backgroundColor: colors.surface,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Text style={[styles.headerTitle, { color: colors.text }]}>Giải đấu thể thao 🏆</Text>

        <View style={[styles.tabsRow, { backgroundColor: colors.surfaceSecondary }]}>
          <TouchableOpacity
            style={[
              styles.tabBtn,
              activeTab === 'open' && [styles.activeTabBtn, { backgroundColor: colors.primary }],
            ]}
            onPress={() => setActiveTab('open')}
          >
            <Text
              style={[
                styles.tabText,
                { color: activeTab === 'open' ? '#FFFFFF' : colors.textSecondary },
              ]}
            >
              Mở đăng ký
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabBtn,
              activeTab === 'ongoing' && [styles.activeTabBtn, { backgroundColor: colors.primary }],
            ]}
            onPress={() => setActiveTab('ongoing')}
          >
            <Text
              style={[
                styles.tabText,
                { color: activeTab === 'ongoing' ? '#FFFFFF' : colors.textSecondary },
              ]}
            >
              Đang diễn ra
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabBtn,
              activeTab === 'completed' && [styles.activeTabBtn, { backgroundColor: colors.primary }],
            ]}
            onPress={() => setActiveTab('completed')}
          >
            <Text
              style={[
                styles.tabText,
                { color: activeTab === 'completed' ? '#FFFFFF' : colors.textSecondary },
              ]}
            >
              Đã kết thúc
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={filteredTournaments}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await loadTournaments();
              setRefreshing(false);
            }}
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon="trophy-outline"
            title="Chưa có giải đấu"
            description="Hiện tại chưa có giải đấu nào trong mục này."
          />
        }
        renderItem={({ item }) => {
          const registeredCount = item.teams ? item.teams.length : 0;
          const maxTeams = item.maxTeams || 16;
          const progressPercent = Math.min(100, Math.round((registeredCount / maxTeams) * 100));

          return (
            <TouchableOpacity
              activeOpacity={0.9}
              style={[
                styles.tourCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
                SHADOWS.md,
              ]}
              onPress={() => router.push(`/tournament-detail/${item.id}`)}
            >
              <View style={styles.imageBox}>
                <Image source={{ uri: item.cover }} style={styles.coverImage} />
                <View style={styles.sportBadge}>
                  <Badge label={item.sport?.toUpperCase() || 'GIẢI ĐẤU'} variant="accent" size="sm" />
                </View>
              </View>

              <View style={styles.cardInfo}>
                <Text style={[styles.tourName, { color: colors.text }]}>{item.name}</Text>

                <View style={styles.prizeRow}>
                  <Ionicons name="trophy" size={16} color="#EAB308" />
                  <Text style={[styles.prizeText, { color: colors.primary }]}>{item.prize}</Text>
                </View>

                {/* Progress of teams */}
                <View style={styles.teamsProgressRow}>
                  <Text style={[styles.progressText, { color: colors.textSecondary }]}>
                    Số đội tham gia: <Text style={{ fontWeight: '800', color: colors.text }}>{registeredCount}/{maxTeams} đội</Text>
                  </Text>
                  <View style={[styles.progressBarBg, { backgroundColor: colors.surfaceSecondary }]}>
                    <View
                      style={[
                        styles.progressBarFill,
                        { width: `${progressPercent}%`, backgroundColor: colors.primary },
                      ]}
                    />
                  </View>
                </View>

                <View style={[styles.footerRow, { borderTopColor: colors.border }]}>
                  <View>
                    <Text style={[styles.feeLabel, { color: colors.textMuted }]}>Lệ phí tham gia</Text>
                    <Text style={[styles.feeValue, { color: colors.text }]}>
                      {item.fee ? formatVND(item.fee) : 'Miễn phí'}
                      <Text style={{ fontSize: 11, fontWeight: '500', color: colors.textSecondary }}>/đội</Text>
                    </Text>
                  </View>

                  <View style={[styles.viewDetailBtn, { backgroundColor: colors.accentLight }]}>
                    <Text style={[styles.viewDetailText, { color: '#365314' }]}>Chi tiết & Đăng ký</Text>
                    <Ionicons name="chevron-forward" size={14} color="#365314" />
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  headerBar: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 10,
  },
  tabsRow: {
    flexDirection: 'row',
    borderRadius: RADIUS.md,
    padding: 3,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: RADIUS.sm,
  },
  activeTabBtn: {},
  tabText: {
    fontSize: 13,
    fontWeight: '700',
  },
  listContent: {
    padding: SPACING.lg,
    paddingBottom: 40,
  },
  tourCard: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: SPACING.lg,
  },
  imageBox: {
    width: '100%',
    height: 150,
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  sportBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
  },
  cardInfo: {
    padding: SPACING.md,
  },
  tourName: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 6,
  },
  prizeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  prizeText: {
    fontSize: 13,
    fontWeight: '800',
    marginLeft: 6,
  },
  teamsProgressRow: {
    marginBottom: 10,
  },
  progressText: {
    fontSize: 12,
    marginBottom: 4,
  },
  progressBarBg: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
  },
  feeLabel: {
    fontSize: 11,
  },
  feeValue: {
    fontSize: 14,
    fontWeight: '800',
  },
  viewDetailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: RADIUS.sm,
  },
  viewDetailText: {
    fontSize: 12,
    fontWeight: '800',
    marginRight: 4,
  },
});
