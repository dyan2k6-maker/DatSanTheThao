import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Rect, Text as SvgText, Line } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import LogoutButton from '../../components/ui/LogoutButton';
import { HScroll } from '../../components/ui/HScroll';
import { db } from '../../services/db';
import { formatVND, formatDateVN } from '../../utils/format';
import { calcDashboardKPIs } from '../../utils/revenue';
import { calcPaymentSummary } from '../../utils/payment';
import { confirmAction, notify } from '../../utils/dialog';
import { RADIUS, SPACING, SHADOWS } from '../../constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function OwnerDashboardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { colors } = useTheme();

  const [selectedCourtId, setSelectedCourtId] = useState('all');
  const [allCourts, setAllCourts] = useState([]);
  const [allBookings, setAllBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const loadData = useCallback(async () => {
    if (!user?.id) return;
    try {
      // Lọc nghiêm ngặt sân và đơn của chính chủ sân đăng nhập
      const [cList, bList] = await Promise.all([
        db.getAll('courts', (c) => c.ownerId === user.id),
        db.getAll('bookings', (b) => b.ownerId === user.id),
      ]);
      setAllCourts(cList);
      setAllBookings(bList);
    } catch (e) {
      console.warn('Lỗi tải dữ liệu dashboard chủ sân:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // Tính toán số liệu thống kê thật 100% bằng pure function
  const kpis = calcDashboardKPIs(allBookings, allCourts, user?.id, selectedCourtId);

  // Thao tác duyệt nhanh đơn
  const handleQuickApprove = (booking) => {
    confirmAction(
      'Duyệt đơn đặt sân',
      `Bạn có chắc chắn muốn duyệt đơn ${booking.code} (${booking.courtName}) cho khách ${booking.userName}?`,
      'Duyệt đơn',
      async () => {
        try {
          setActionLoading(true);
          const now = new Date().toISOString();
          await db.update('bookings', booking.id, {
            status: 'confirmed',
            approvedAt: now,
          });

          await db.add('notifications', {
            userId: booking.userId,
            title: 'Lịch đặt sân đã được duyệt 🎉',
            body: `Chủ sân đã duyệt đơn ${booking.code} (${booking.courtName}). Mã QR check-in đã sẵn sàng!`,
            type: 'booking_confirmed',
            read: false,
            createdAt: now,
          });

          notify('Thành công', 'Đã duyệt đơn đặt sân thành công!');
          await loadData();
        } catch (err) {
          notify('Lỗi', err.message || 'Không thể duyệt đơn');
        } finally {
          setActionLoading(false);
        }
      }
    );
  };

  // Thao tác từ chối nhanh
  const handleQuickReject = (booking) => {
    confirmAction(
      'Từ chối đơn đặt sân',
      `Từ chối đơn ${booking.code} của khách ${booking.userName}?`,
      'Từ chối',
      async () => {
        try {
          setActionLoading(true);
          const now = new Date().toISOString();
          await db.update('bookings', booking.id, {
            status: 'rejected',
            rejectReason: 'Chủ sân bận bảo trì hoặc kín lịch đột xuất',
            rejectedAt: now,
          });

          await db.add('notifications', {
            userId: booking.userId,
            title: 'Đơn đặt sân bị từ chối ⚠️',
            body: `Đơn ${booking.code} (${booking.courtName}) bị từ chối do sân bận bảo trì hoặc kín lịch.`,
            type: 'booking_rejected',
            read: false,
            createdAt: now,
          });

          notify('Đã từ chối', 'Đơn đặt sân đã được chuyển sang từ chối.');
          await loadData();
        } catch (err) {
          notify('Lỗi', err.message || 'Không thể từ chối đơn');
        } finally {
          setActionLoading(false);
        }
      },
      true
    );
  };

  // Thao tác check-in nhanh cho đơn hôm nay
  const handleQuickCheckIn = (booking) => {
    confirmAction(
      'Xác nhận Check-in',
      `Check-in đón khách ${booking.userName} vào sân ${booking.subCourt}?`,
      'Check-in ngay',
      async () => {
        try {
          setActionLoading(true);
          const now = new Date().toISOString();
          await db.update('bookings', booking.id, {
            status: 'checked_in',
            checkedInAt: now,
          });

          await db.add('notifications', {
            userId: booking.userId,
            title: 'Đã check-in vào sân ⚽',
            body: `Bạn đã check-in tại ${booking.courtName} (${booking.subCourt}). Chúc bạn có trận đấu tuyệt vời!`,
            type: 'booking_checked_in',
            read: false,
            createdAt: now,
          });

          notify('Thành công', 'Khách đã check-in thành công!');
          await loadData();
        } catch (err) {
          notify('Lỗi', err.message || 'Không thể check-in');
        } finally {
          setActionLoading(false);
        }
      }
    );
  };

  // Thao tác check-out nhanh
  const handleQuickCheckOut = (booking) => {
    router.push(`/booking-detail/${booking.id}`);
  };

  const chartData = kpis.recent7DaysChart;
  const maxChartVal = Math.max(...chartData.map((d) => d.amount), 100000);
  const chartWidth = SCREEN_WIDTH - SPACING.lg * 2 - 32;
  const chartHeight = 150;

  if (loading && !refreshing) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Đang tải dữ liệu cụm sân...
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingTop: Math.max(insets.top, 14) + 10 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
      >
        <View style={styles.topHeaderRow}>
          <View style={{ flex: 1, minWidth: 0, marginRight: SPACING.md }}>
            <Text style={[styles.welcomeText, { color: colors.textSecondary }]}>Kênh quản trị cụm sân</Text>
            <Text
              style={[styles.clusterName, { color: colors.text }]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {user?.courtClusterName || user?.fullName || 'Cụm Sân Thể Thao'}
            </Text>
          </View>
          <LogoutButton compact />
        </View>

        {/* BỘ LỌC CHIP TRÊN CÙNG: "Tất cả sân" + từng sân của chủ sân */}
        <HScroll showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
          <TouchableOpacity
            style={[
              styles.courtChip,
              selectedCourtId === 'all' && { backgroundColor: colors.primary, borderColor: colors.primary },
              selectedCourtId !== 'all' && { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
            onPress={() => setSelectedCourtId('all')}
          >
            <Text style={[styles.courtChipText, { color: selectedCourtId === 'all' ? '#FFFFFF' : colors.text }]}>
              Tất cả sân ({kpis.ownerCourts.length})
            </Text>
          </TouchableOpacity>

          {kpis.ownerCourts.map((c) => {
            const active = selectedCourtId === c.id;
            return (
              <TouchableOpacity
                key={c.id}
                style={[
                  styles.courtChip,
                  active && { backgroundColor: colors.primary, borderColor: colors.primary },
                  !active && { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
                onPress={() => setSelectedCourtId(c.id)}
              >
                <Text style={[styles.courtChipText, { color: active ? '#FFFFFF' : colors.text }]}>
                  {c.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </HScroll>

        {/* THẺ KPI TỪ DỮ LIỆU THẬT */}
        <View style={styles.metricsGrid}>
          {/* Thực thu hôm nay */}
          <View style={[styles.metricCard, { backgroundColor: '#DCFCE7', borderColor: '#86EFAC' }]}>
            <View style={[styles.metricIconCircle, { backgroundColor: '#16A34A' }]}>
              <Ionicons name="cash" size={18} color="#FFFFFF" />
            </View>
            <Text style={styles.metricLabel}>Thực thu hôm nay</Text>
            <Text style={[styles.metricValue, { color: '#15803D' }]}>{formatVND(kpis.todayRevenue)}</Text>
          </View>

          {/* Thực thu tháng này */}
          <View style={[styles.metricCard, { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' }]}>
            <View style={[styles.metricIconCircle, { backgroundColor: '#D97706' }]}>
              <Ionicons name="calendar" size={18} color="#FFFFFF" />
            </View>
            <Text style={styles.metricLabel}>Thực thu tháng này</Text>
            <Text style={[styles.metricValue, { color: '#B45309' }]}>{formatVND(kpis.monthRevenue)}</Text>
          </View>

          {/* Đơn chờ duyệt */}
          <View style={[styles.metricCard, { backgroundColor: '#E0F2FE', borderColor: '#BAE6FD' }]}>
            <View style={[styles.metricIconCircle, { backgroundColor: '#0284C7' }]}>
              <Ionicons name="hourglass" size={18} color="#FFFFFF" />
            </View>
            <Text style={styles.metricLabel}>Đơn chờ duyệt</Text>
            <Text style={[styles.metricValue, { color: '#0369A1' }]}>{kpis.pendingCount} đơn</Text>
          </View>

          {/* Đang thi đấu (đã check-in) */}
          <View style={[styles.metricCard, { backgroundColor: '#F3E8FF', borderColor: '#E9D5FF' }]}>
            <View style={[styles.metricIconCircle, { backgroundColor: '#7E22CE' }]}>
              <Ionicons name="football" size={18} color="#FFFFFF" />
            </View>
            <Text style={styles.metricLabel}>Đang thi đấu</Text>
            <Text style={[styles.metricValue, { color: '#7E22CE' }]}>{kpis.checkedInCount} trận</Text>
          </View>
        </View>

        {/* Thanh trạng thái duyệt sân */}
        <View style={[styles.courtStatusRow, { backgroundColor: colors.surface, borderColor: colors.border }, SHADOWS.sm]}>
          <View style={styles.courtStatusItem}>
            <View style={[styles.statusDot, { backgroundColor: '#16A34A' }]} />
            <Text style={[styles.courtStatusText, { color: colors.text }]}>
              Sân đang hoạt động: <Text style={{ fontWeight: '800' }}>{kpis.activeCourtsCount}</Text>
            </Text>
          </View>
          <View style={styles.courtStatusItem}>
            <View style={[styles.statusDot, { backgroundColor: '#F59E0B' }]} />
            <Text style={[styles.courtStatusText, { color: colors.text }]}>
              Sân chờ Admin duyệt: <Text style={{ fontWeight: '800' }}>{kpis.pendingCourtsCount}</Text>
            </Text>
          </View>
        </View>

        {/* BIỂU ĐỒ CỘT SVG 7 NGÀY GẦN NHẤT */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, SHADOWS.sm]}>
          <View style={styles.chartHeaderRow}>
            <View>
              <Text style={[styles.cardTitle, { color: colors.text }]}>Doanh thu 7 ngày gần nhất</Text>
              <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
                Tính theo các khoản tiền thực thu
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.revenueReportLink, { borderColor: colors.primary }]}
              onPress={() => router.push('/(owner)/revenue')}
            >
              <Text style={[styles.revenueReportLinkText, { color: colors.primary }]}>Xem báo cáo ➔</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.svgWrapper}>
            <Svg width={chartWidth} height={chartHeight}>
              <Line x1="0" y1={chartHeight - 25} x2={chartWidth} y2={chartHeight - 25} stroke={colors.border} strokeWidth="1" />
              {chartData.map((item, idx) => {
                const barWidth = 26;
                const barSpacing = chartWidth / chartData.length;
                const x = idx * barSpacing + (barSpacing - barWidth) / 2;
                const barHeight = Math.max(6, Math.round((item.amount / maxChartVal) * (chartHeight - 55)));
                const y = chartHeight - 25 - barHeight;
                const isToday = idx === chartData.length - 1;

                return (
                  <React.Fragment key={idx}>
                    <Rect
                      x={x}
                      y={y}
                      width={barWidth}
                      height={barHeight}
                      rx={RADIUS.xs}
                      fill={isToday ? '#15803D' : colors.primary}
                    />
                    <SvgText
                      x={x + barWidth / 2}
                      y={chartHeight - 8}
                      fontSize="10"
                      fontWeight="bold"
                      fill={isToday ? colors.primary : colors.textSecondary}
                      textAnchor="middle"
                    >
                      {item.dayName}
                    </SvgText>
                  </React.Fragment>
                );
              })}
            </Svg>
          </View>
        </View>

        {/* KHỐI 1: LỊCH MỚI CẦN DUYỆT */}
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Lịch mới cần duyệt ({kpis.pendingBookings.length})
          </Text>
          {kpis.pendingBookings.length > 0 && (
            <View style={styles.pendingBadge}>
              <Text style={styles.pendingBadgeText}>{kpis.pendingBookings.length} mới</Text>
            </View>
          )}
        </View>

        {kpis.pendingBookings.length === 0 ? (
          <View style={[styles.emptyBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="checkmark-done-circle" size={36} color="#16A34A" />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Hiện tại không có đơn đặt nào đang chờ duyệt.
            </Text>
          </View>
        ) : (
          kpis.pendingBookings.map((b) => {
            const pSummary = calcPaymentSummary(b);
            return (
              <TouchableOpacity
                key={b.id}
                style={[styles.bookingCard, { backgroundColor: colors.surface, borderColor: colors.border }, SHADOWS.sm]}
                activeOpacity={0.8}
                onPress={() => router.push(`/booking-detail/${b.id}`)}
              >
                <View style={styles.bCardTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.bCode, { color: colors.text }]}>{b.code}</Text>
                    <Text style={[styles.bCustomer, { color: colors.textSecondary }]}>
                      Khách: <Text style={{ fontWeight: '700', color: colors.text }}>{b.userName}</Text> ({b.userPhone || 'Không có SĐT'})
                    </Text>
                  </View>
                  <Text style={[styles.bPrice, { color: colors.primary }]}>
                    {formatVND(b.finalAmount || b.totalPrice)}
                  </Text>
                </View>

                <View style={styles.bCardMid}>
                  <Text style={[styles.bCourtInfo, { color: colors.text }]}>
                    🏟 {b.courtName} • <Text style={{ color: colors.primary, fontWeight: '700' }}>{b.subCourt || 'Sân tiêu chuẩn'}</Text>
                  </Text>
                  <Text style={[styles.bTimeInfo, { color: colors.warning }]}>
                    ⏰ {formatDateVN(b.date)} ({b.startTime} - {b.endTime})
                  </Text>
                </View>

                {/* Badge thanh toán: Đã trả bao nhiêu, còn thiếu bao nhiêu */}
                <View style={styles.bPaymentBadgeRow}>
                  <View style={[styles.payBadge, { backgroundColor: pSummary.amountPaid > 0 ? '#DCFCE7' : '#FEF3C7' }]}>
                    <Text style={[styles.payBadgeText, { color: pSummary.amountPaid > 0 ? '#16A34A' : '#D97706' }]}>
                      {pSummary.amountPaid > 0 ? `Đã trả: ${formatVND(pSummary.amountPaid)}` : 'Chưa thanh toán'}
                    </Text>
                  </View>
                  {pSummary.remaining > 0 && (
                    <View style={[styles.payBadge, { backgroundColor: '#FEE2E2' }]}>
                      <Text style={[styles.payBadgeText, { color: '#EF4444' }]}>
                        Còn thiếu: {formatVND(pSummary.remaining)}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Quick actions: Duyệt / Từ chối */}
                <View style={styles.bActionRow}>
                  <TouchableOpacity
                    style={[styles.bRejectBtn, { borderColor: colors.border }]}
                    onPress={() => handleQuickReject(b)}
                  >
                    <Text style={styles.bRejectBtnText}>Từ chối</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.bApproveBtn, { backgroundColor: colors.primary }]}
                    onPress={() => handleQuickApprove(b)}
                  >
                    <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                    <Text style={styles.bApproveBtnText}>Duyệt nhanh</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            );
          })
        )}

        {/* KHỐI 2: HÔM NAY (Đơn confirmed / checked_in sắp xếp theo giờ) */}
        <View style={[styles.sectionHeaderRow, { marginTop: SPACING.md }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Lịch thi đấu hôm nay ({kpis.todayBookings.length})
          </Text>
        </View>

        {kpis.todayBookings.length === 0 ? (
          <View style={[styles.emptyBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="calendar-outline" size={36} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Hôm nay chưa có lịch thi đấu nào đã xác nhận.
            </Text>
          </View>
        ) : (
          kpis.todayBookings.map((b) => {
            const isCheckedIn = b.status === 'checked_in';
            return (
              <TouchableOpacity
                key={b.id}
                style={[
                  styles.todayBookingCard,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                  isCheckedIn && { borderColor: '#16A34A', borderWidth: 1.5 },
                  SHADOWS.sm,
                ]}
                activeOpacity={0.8}
                onPress={() => router.push(`/booking-detail/${b.id}`)}
              >
                <View style={styles.todayTimeBadge}>
                  <Text style={styles.todayTimeText}>{b.startTime}</Text>
                  <Text style={styles.todayTimeSub}>{b.endTime}</Text>
                </View>

                <View style={{ flex: 1, gap: 2 }}>
                  <View style={styles.todayTitleRow}>
                    <Text style={[styles.todayCourt, { color: colors.text }]}>
                      {b.subCourt || b.courtName}
                    </Text>
                    <View
                      style={[
                        styles.todayStatusBadge,
                        { backgroundColor: isCheckedIn ? '#DCFCE7' : '#E0F2FE' },
                      ]}
                    >
                      <Text
                        style={[
                          styles.todayStatusText,
                          { color: isCheckedIn ? '#16A34A' : '#0284C7' },
                        ]}
                      >
                        {isCheckedIn ? 'Đang thi đấu' : 'Đã xác nhận'}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.todayCustomer, { color: colors.textSecondary }]}>
                    Khách: {b.userName} • {b.userPhone || '---'}
                  </Text>
                  <Text style={[styles.todayCourtCluster, { color: colors.textSecondary }]} numberOfLines={1}>
                    {b.courtName}
                  </Text>
                </View>

                {/* Nút hành động nhanh: Check-in hoặc Check-out */}
                <View style={{ justifyContent: 'center' }}>
                  {!isCheckedIn ? (
                    <TouchableOpacity
                      style={[styles.quickCheckInBtn, { backgroundColor: '#16A34A' }]}
                      onPress={() => handleQuickCheckIn(b)}
                    >
                      <Ionicons name="enter-outline" size={16} color="#FFFFFF" />
                      <Text style={styles.quickCheckInText}>Check-in</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={[styles.quickCheckOutBtn, { backgroundColor: '#D97706' }]}
                      onPress={() => handleQuickCheckOut(b)}
                    >
                      <Ionicons name="exit-outline" size={16} color="#FFFFFF" />
                      <Text style={styles.quickCheckInText}>Check-out</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: SPACING.md,
    gap: SPACING.md,
    paddingBottom: 40,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
  },
  topHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  welcomeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  clusterName: {
    fontSize: 20,
    fontWeight: '900',
    marginTop: 2,
    letterSpacing: 0.3,
  },
  chipsScroll: {
    gap: 8,
    paddingVertical: 2,
  },
  courtChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  courtChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  metricCard: {
    width: '48.5%',
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    gap: 4,
  },
  metricIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
  metricValue: {
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  courtStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: SPACING.sm,
    borderRadius: RADIUS.md,
    borderWidth: 1,
  },
  courtStatusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  courtStatusText: {
    fontSize: 12,
  },
  card: {
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  cardSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  chartHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  revenueReportLink: {
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  revenueReportLinkText: {
    fontSize: 11,
    fontWeight: '700',
  },
  svgWrapper: {
    alignItems: 'center',
    paddingTop: 8,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  pendingBadge: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
  },
  pendingBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  emptyBox: {
    padding: SPACING.lg,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    alignItems: 'center',
    gap: 6,
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
  },
  bookingCard: {
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    gap: SPACING.sm,
  },
  bCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  bCode: {
    fontSize: 14,
    fontWeight: '800',
  },
  bCustomer: {
    fontSize: 12,
    marginTop: 2,
  },
  bPrice: {
    fontSize: 15,
    fontWeight: '900',
  },
  bCardMid: {
    gap: 2,
  },
  bCourtInfo: {
    fontSize: 13,
  },
  bTimeInfo: {
    fontSize: 12,
    fontWeight: '700',
  },
  bPaymentBadgeRow: {
    flexDirection: 'row',
    gap: 6,
  },
  payBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.xs,
  },
  payBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  bActionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  bRejectBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bRejectBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#EF4444',
  },
  bApproveBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: RADIUS.sm,
  },
  bApproveBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  todayBookingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    gap: SPACING.md,
  },
  todayTimeBadge: {
    backgroundColor: '#0B3D2E',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
  },
  todayTimeText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#A3E635',
  },
  todayTimeSub: {
    fontSize: 10,
    color: '#E2E8F0',
  },
  todayTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  todayCourt: {
    fontSize: 14,
    fontWeight: '800',
  },
  todayStatusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.xs,
  },
  todayStatusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  todayCustomer: {
    fontSize: 12,
  },
  todayCourtCluster: {
    fontSize: 11,
  },
  quickCheckInBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: RADIUS.sm,
  },
  quickCheckOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: RADIUS.sm,
  },
  quickCheckInText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
