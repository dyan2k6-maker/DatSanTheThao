import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import LogoutButton from '../../components/ui/LogoutButton';
import { db } from '../../services/db';
import { formatVND } from '../../utils/format';
import { RADIUS, SPACING, SHADOWS } from '../../constants/theme';
import dayjs from 'dayjs';

const PLATFORM_FEE_RATE = 0.1; // 10% hoa hồng sàn Sportify-VN

export default function AdminDashboardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const [users, setUsers] = useState([]);
  const [courts, setCourts] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadAllStats = useCallback(async () => {
    try {
      const [uList, cList, bList, tList] = await Promise.all([
        db.getAll('users'),
        db.getAll('courts'),
        db.getAll('bookings'),
        db.getAll('tournaments'),
      ]);

      setUsers(uList);
      setCourts(cList);
      setBookings(bList);
      setTournaments(tList);
    } catch (e) {
      console.warn('Lỗi tải dữ liệu dashboard admin:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadAllStats();
  }, [loadAllStats]);

  const onRefresh = () => {
    setRefreshing(true);
    loadAllStats();
  };

  // Valid revenue-generating bookings (completed, confirmed, checked_in)
  const revenueBookings = useMemo(() => {
    return bookings.filter(
      (b) => b.status === 'completed' || b.status === 'confirmed' || b.status === 'checked_in'
    );
  }, [bookings]);

  // Core Financials
  const grossRevenue = useMemo(() => {
    return revenueBookings.reduce((sum, b) => sum + (b.finalAmount || b.totalPrice || 0), 0);
  }, [revenueBookings]);

  const platformFee = useMemo(() => {
    return Math.round(grossRevenue * PLATFORM_FEE_RATE);
  }, [grossRevenue]);

  // Core User & Court Metrics
  const totalUsers = users.filter((u) => u.role === 'user').length;
  const totalOwners = users.filter((u) => u.role === 'owner').length;
  const approvedCourts = courts.filter((c) => c.status === 'approved').length;
  const pendingCourts = courts.filter((c) => c.status === 'pending').length;
  const pendingTournaments = tournaments.filter((t) => t.status === 'pending').length;

  // 7-day revenue trend for mini bar chart
  const weeklyTrend = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = dayjs().subtract(i, 'day');
      const dStr = d.format('YYYY-MM-DD');
      const label = i === 0 ? 'Nay' : d.format('DD/MM');

      const dayRevenue = bookings
        .filter(
          (b) =>
            (b.status === 'completed' || b.status === 'confirmed' || b.status === 'checked_in') &&
            b.date === dStr
        )
        .reduce((sum, b) => sum + (b.finalAmount || b.totalPrice || 0), 0);

      days.push({ label, revenue: dayRevenue });
    }
    const maxRev = Math.max(...days.map((d) => d.revenue), 400000);
    return days.map((d) => ({
      ...d,
      heightPercent: Math.max(12, Math.round((d.revenue / maxRev) * 100)),
    }));
  }, [bookings]);

  // Top courts by booking count
  const topCourts = useMemo(() => {
    return courts
      .map((c) => {
        const count = revenueBookings.filter((b) => b.courtId === c.id).length;
        const rev = revenueBookings
          .filter((b) => b.courtId === c.id)
          .reduce((sum, b) => sum + (b.finalAmount || b.totalPrice || 0), 0);
        return { ...c, bookingCount: count, revenue: rev };
      })
      .sort((a, b) => b.bookingCount - a.bookingCount)
      .slice(0, 4);
  }, [courts, revenueBookings]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: Math.max(insets.top, 14) + 10, paddingBottom: 110 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
      >
        {/* Top Header */}
        <View style={styles.topHeader}>
          <View>
            <View style={styles.badgeRow}>
              <View style={styles.liveDot} />
              <Text style={[styles.badgeText, { color: colors.primary }]}>HỆ THỐNG QUẢN TRỊ TOÀN SÀN</Text>
            </View>
            <Text style={[styles.adminTitle, { color: colors.text }]}>Bảng Điều Khiển</Text>
          </View>

          <LogoutButton compact />
        </View>

        {/* CẢNH BÁO KIỂM DUYỆT (NẾU CÓ SÂN HOẶC GIẢI ĐẤU CHỜ DUYỆT) */}
        {(pendingCourts > 0 || pendingTournaments > 0) && (
          <TouchableOpacity
            style={[styles.moderationAlertCard, { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' }]}
            onPress={() => router.push('/(admin)/moderation')}
            activeOpacity={0.85}
          >
            <Ionicons name="shield-half" size={24} color="#D97706" />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.modAlertTitle}>Yêu cầu kiểm duyệt đang chờ ({pendingCourts + pendingTournaments})</Text>
              <Text style={styles.modAlertSub}>
                {pendingCourts} cụm sân {pendingTournaments > 0 ? `và ${pendingTournaments} giải đấu` : ''} đang chờ phê duyệt.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#D97706" />
          </TouchableOpacity>
        )}

        {/* THẺ DOANH THU TOÀN HỆ THỐNG */}
        <View style={[styles.revenueCard, { backgroundColor: colors.primaryDark }, SHADOWS.md]}>
          <View style={styles.revCardTop}>
            <Text style={styles.revenueHeader}>TỔNG DOANH THU TOÀN SÀN (GMV)</Text>
            <TouchableOpacity
              style={styles.financeLinkBtn}
              onPress={() => router.push('/(admin)/finance')}
            >
              <Text style={styles.financeLinkText}>Chi tiết đối soát</Text>
              <Ionicons name="chevron-forward" size={12} color="#A3E635" />
            </TouchableOpacity>
          </View>

          <Text style={styles.revenueValue}>{formatVND(grossRevenue)}</Text>
          <Text style={styles.revenueSub}>Tính từ {revenueBookings.length} lượt đặt sân hoàn tất trên nền tảng</Text>

          <View style={styles.revSplitRow}>
            <View style={styles.revSplitItem}>
              <Text style={styles.revSplitLabel}>Hoa hồng nền tảng (10%)</Text>
              <Text style={styles.revSplitVal}>+{formatVND(platformFee)}</Text>
            </View>

            <View style={styles.revSplitDivider} />

            <View style={styles.revSplitItem}>
              <Text style={styles.revSplitLabel}>Thực chuyển Chủ sân (90%)</Text>
              <Text style={styles.revSplitVal}>{formatVND(grossRevenue - platformFee)}</Text>
            </View>
          </View>
        </View>

        {/* 4 CHỈ SỐ CỐT LÕI (NGƯỜI DÙNG, CHỦ SÂN, SÂN ĐÃ DUYỆT, SÂN CHỜ DUYỆT) */}
        <View style={styles.metricsGrid}>
          {/* Người dùng */}
          <TouchableOpacity
            style={[styles.metricCard, { backgroundColor: colors.surface, borderColor: colors.border }, SHADOWS.sm]}
            onPress={() => router.push('/admin-users')}
            activeOpacity={0.7}
          >
            <View style={[styles.metricIconWrap, { backgroundColor: '#E0F2FE' }]}>
              <Ionicons name="people" size={20} color="#0284C7" />
            </View>
            <Text style={[styles.metricNumber, { color: colors.text }]}>{totalUsers}</Text>
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Người dùng</Text>
          </TouchableOpacity>

          {/* Chủ sân */}
          <TouchableOpacity
            style={[styles.metricCard, { backgroundColor: colors.surface, borderColor: colors.border }, SHADOWS.sm]}
            onPress={() => router.push('/admin-users')}
            activeOpacity={0.7}
          >
            <View style={[styles.metricIconWrap, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="business" size={20} color="#D97706" />
            </View>
            <Text style={[styles.metricNumber, { color: colors.text }]}>{totalOwners}</Text>
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Chủ sân đối tác</Text>
          </TouchableOpacity>

          {/* Sân đã duyệt */}
          <View style={[styles.metricCard, { backgroundColor: colors.surface, borderColor: colors.border }, SHADOWS.sm]}>
            <View style={[styles.metricIconWrap, { backgroundColor: '#DCFCE7' }]}>
              <Ionicons name="football" size={20} color="#15803D" />
            </View>
            <Text style={[styles.metricNumber, { color: colors.text }]}>{approvedCourts}</Text>
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Sân đã duyệt</Text>
          </View>

          {/* Sân chờ duyệt */}
          <TouchableOpacity
            style={[
              styles.metricCard,
              {
                backgroundColor: colors.surface,
                borderColor: pendingCourts > 0 ? '#F87171' : colors.border,
              },
              SHADOWS.sm,
            ]}
            onPress={() => router.push('/(admin)/moderation')}
            activeOpacity={0.7}
          >
            <View style={[styles.metricIconWrap, { backgroundColor: '#FEE2E2' }]}>
              <Ionicons name="hourglass" size={20} color="#DC2626" />
            </View>
            <Text style={[styles.metricNumber, { color: pendingCourts > 0 ? '#DC2626' : colors.text }]}>
              {pendingCourts}
            </Text>
            <Text style={[styles.metricLabel, { color: pendingCourts > 0 ? '#DC2626' : colors.textSecondary }]}>
              Sân chờ duyệt
            </Text>
          </TouchableOpacity>
        </View>

        {/* TRUY CẬP NHANH CÁC PHÂN HỆ QUẢN TRỊ */}
        <Text style={[styles.sectionHeading, { color: colors.text, marginTop: SPACING.xs, marginBottom: 8 }]}>
          Lối tắt Quản trị
        </Text>
        <View style={styles.quickAccessGrid}>
          <TouchableOpacity
            style={[styles.quickBtn, { backgroundColor: colors.surface, borderColor: colors.border }, SHADOWS.sm]}
            onPress={() => router.push('/(admin)/finance')}
          >
            <View style={[styles.quickIconWrap, { backgroundColor: '#DCFCE7' }]}>
              <Ionicons name="cash" size={20} color="#16A34A" />
            </View>
            <Text style={[styles.quickBtnText, { color: colors.text }]}>Tài chính & Đối soát</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.quickBtn, { backgroundColor: colors.surface, borderColor: colors.border }, SHADOWS.sm]}
            onPress={() => router.push('/(admin)/vouchers')}
          >
            <View style={[styles.quickIconWrap, { backgroundColor: '#EDE9FE' }]}>
              <Ionicons name="pricetag" size={20} color="#8B5CF6" />
            </View>
            <Text style={[styles.quickBtnText, { color: colors.text }]}>Voucher & Ưu đãi</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.quickBtn, { backgroundColor: colors.surface, borderColor: colors.border }, SHADOWS.sm]}
            onPress={() => router.push('/admin-tournaments')}
          >
            <View style={[styles.quickIconWrap, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="trophy" size={20} color="#D97706" />
            </View>
            <Text style={[styles.quickBtnText, { color: colors.text }]}>Quản lý Giải đấu</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.quickBtn, { backgroundColor: colors.surface, borderColor: colors.border }, SHADOWS.sm]}
            onPress={() => router.push('/admin-reviews')}
          >
            <View style={[styles.quickIconWrap, { backgroundColor: '#FEF9C3' }]}>
              <Ionicons name="star" size={20} color="#EAB308" />
            </View>
            <Text style={[styles.quickBtnText, { color: colors.text }]}>Duyệt Đánh giá</Text>
          </TouchableOpacity>
        </View>

        {/* BIỂU ĐỒ DOANH THU 7 NGÀY QUA */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, SHADOWS.sm]}>
          <View style={styles.cardHeaderRow}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Doanh thu 7 ngày gần nhất</Text>
            <Text style={[styles.cardSubText, { color: colors.textSecondary }]}>Theo thời gian thực</Text>
          </View>

          <View style={styles.barsArea}>
            {weeklyTrend.map((day, idx) => (
              <View key={idx} style={styles.barColumn}>
                <Text style={[styles.barValueText, { color: colors.textSecondary }]} numberOfLines={1}>
                  {day.revenue > 0 ? `${Math.round(day.revenue / 1000)}k` : '0'}
                </Text>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      {
                        height: `${day.heightPercent}%`,
                        backgroundColor: idx === 6 ? '#16A34A' : colors.primary,
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.barLabel, { color: colors.text }]}>{day.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* TOP CỤM SÂN ĐƯỢC ĐẶT NHIỀU NHẤT */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, SHADOWS.sm]}>
          <Text style={[styles.cardTitle, { color: colors.text, marginBottom: 8 }]}>Top cụm sân hoạt động sôi nổi 🏆</Text>

          {topCourts.map((c, idx) => (
            <View key={c.id} style={[styles.topCourtRow, { borderBottomColor: colors.border }]}>
              <View
                style={[
                  styles.rankBadge,
                  {
                    backgroundColor:
                      idx === 0 ? '#EAB308' : idx === 1 ? '#94A3B8' : idx === 2 ? '#B45309' : colors.surfaceSecondary,
                  },
                ]}
              >
                <Text style={{ fontSize: 11, fontWeight: '900', color: idx < 3 ? '#FFFFFF' : colors.text }}>
                  {idx + 1}
                </Text>
              </View>

              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={[styles.topCourtName, { color: colors.text }]}>{c.name}</Text>
                <Text style={[styles.topCourtMeta, { color: colors.textSecondary }]}>
                  {c.ownerName || 'Chủ sân đối tác'} • {c.subCourts?.length || 1} sân con
                </Text>
              </View>

              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[styles.topCourtBookings, { color: colors.primary }]}>{c.bookingCount} lượt</Text>
                <Text style={[styles.topCourtRevenue, { color: colors.textSecondary }]}>
                  {formatVND(c.revenue)}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: SPACING.md,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#16A34A',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  adminTitle: {
    fontSize: 22,
    fontWeight: '900',
    marginTop: 2,
  },
  moderationAlertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    marginBottom: SPACING.md,
  },
  modAlertTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#92400E',
  },
  modAlertSub: {
    fontSize: 11,
    color: '#B45309',
    marginTop: 2,
  },
  revenueCard: {
    padding: SPACING.lg,
    borderRadius: RADIUS.xl,
    marginBottom: SPACING.md,
  },
  revCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  revenueHeader: {
    color: '#A3E635',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  financeLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  financeLinkText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#A3E635',
  },
  revenueValue: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '900',
    marginVertical: 4,
  },
  revenueSub: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    marginBottom: 8,
  },
  revSplitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.15)',
  },
  revSplitItem: {
    flex: 1,
  },
  revSplitLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.7)',
  },
  revSplitVal: {
    fontSize: 14,
    fontWeight: '800',
    color: '#A3E635',
    marginTop: 2,
  },
  revSplitDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginHorizontal: 12,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: SPACING.md,
  },
  metricCard: {
    width: '48.5%',
    padding: 12,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    alignItems: 'center',
  },
  metricIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  metricNumber: {
    fontSize: 20,
    fontWeight: '900',
  },
  metricLabel: {
    fontSize: 11,
    marginTop: 2,
    fontWeight: '600',
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '800',
  },
  quickAccessGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: SPACING.md,
  },
  quickBtn: {
    width: '48.5%',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    gap: 8,
  },
  quickIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickBtnText: {
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
  },
  card: {
    padding: SPACING.md,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    marginBottom: SPACING.md,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  cardSubText: {
    fontSize: 11,
  },
  barsArea: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 110,
    paddingTop: 8,
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
  },
  barValueText: {
    fontSize: 9,
    fontWeight: '700',
    marginBottom: 4,
  },
  barTrack: {
    width: 14,
    height: 70,
    backgroundColor: '#F1F5F9',
    borderRadius: 7,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderRadius: 7,
  },
  barLabel: {
    fontSize: 10,
    marginTop: 6,
    fontWeight: '600',
  },
  topCourtRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    borderBottomWidth: 0.5,
  },
  rankBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topCourtName: {
    fontSize: 13,
    fontWeight: '700',
  },
  topCourtMeta: {
    fontSize: 11,
    marginTop: 1,
  },
  topCourtBookings: {
    fontSize: 13,
    fontWeight: '800',
  },
  topCourtRevenue: {
    fontSize: 10,
    marginTop: 1,
  },
});
