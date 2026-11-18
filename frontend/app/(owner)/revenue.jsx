import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Modal,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Header } from '../../components/ui/Header';
import { HScroll } from '../../components/ui/HScroll';
import { db } from '../../services/db';
import { formatVND, formatDateTimeVN } from '../../utils/format';
import { calcRevenueStats, isValidDateInput } from '../../utils/revenue';
import { RADIUS, SPACING, SHADOWS } from '../../constants/theme';

const PERIODS = [
  { id: 'today', label: 'Hôm nay' },
  { id: 'week', label: 'Tuần này' },
  { id: 'month', label: 'Tháng này' },
  { id: 'year', label: 'Năm nay' },
  { id: 'custom', label: 'Tùy chọn' },
];

export default function OwnerRevenueScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { colors } = useTheme();

  const [period, setPeriod] = useState('month');
  const [offset, setOffset] = useState(0); // Offset chuyển kỳ trước/sau
  const [selectedCourtId, setSelectedCourtId] = useState('all');
  const [selectedMethod, setSelectedMethod] = useState('all'); // all | cash | qr
  const [customFrom, setCustomFrom] = useState(dayjs().subtract(30, 'day').format('YYYY-MM-DD'));
  const [customTo, setCustomTo] = useState(dayjs().format('YYYY-MM-DD'));
  const [customApplied, setCustomApplied] = useState(false);
  const [customError, setCustomError] = useState('');
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [bookings, setBookings] = useState([]);
  const [courts, setCourts] = useState([]);
  const [activeTooltip, setActiveTooltip] = useState(null); // { label, value }

  const loadData = useCallback(async () => {
    if (!user?.id) return;
    try {
      const [allB, allC] = await Promise.all([db.getAll('bookings'), db.getAll('courts')]);
      setBookings(allB);
      setCourts(allC);
    } catch (err) {
      console.warn('Lỗi tải dữ liệu doanh thu:', err);
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

  const handlePeriodChange = (newPeriod) => {
    setPeriod(newPeriod);
    setOffset(0);
    setActiveTooltip(null);
    if (newPeriod === 'custom') {
      setShowCustomModal(true);
    }
  };

  const applyCustomRange = () => {
    if (!isValidDateInput(customFrom) || !isValidDateInput(customTo)) {
      setCustomError('Ngày không hợp lệ. Nhập đúng dạng YYYY-MM-DD (vd: 2026-10-01).');
      return;
    }
    if (customFrom > customTo) {
      setCustomError('Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.');
      return;
    }
    setCustomError('');
    setCustomApplied(true);
    setActiveTooltip(null);
    setShowCustomModal(false);
  };

  const cancelCustomRange = () => {
    setCustomError('');
    setShowCustomModal(false);
    if (!customApplied) setPeriod('month'); // chưa từng áp dụng thì quay về Tháng này
  };

  // Tính toán số liệu bằng pure function
  const stats = useMemo(
    () =>
      calcRevenueStats(bookings, courts, {
        ownerId: user?.id,
        courtId: selectedCourtId,
        method: selectedMethod,
        period,
        offset,
        customFrom,
        customTo,
      }),
    [bookings, courts, user?.id, selectedCourtId, selectedMethod, period, offset, customFrom, customTo]
  );

  const chartData = stats.chartData || [];
  const maxChartVal = Math.max(...chartData.map((d) => d.value), 100000);
  const hasGrowth = stats.growthPercent !== null;
  const growthUp = (stats.growthPercent ?? 0) >= 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title="Báo cáo Doanh thu" />

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
        >
          {/* Bộ lọc kỳ thời gian (Tabs) */}
          <View style={styles.periodRow}>
            {PERIODS.map((p) => {
              const active = period === p.id;
              return (
                <TouchableOpacity
                  key={p.id}
                  style={[
                    styles.periodTab,
                    active && { backgroundColor: colors.primary, borderColor: colors.primary },
                    !active && { backgroundColor: colors.surface, borderColor: colors.border },
                  ]}
                  onPress={() => handlePeriodChange(p.id)}
                >
                  <Text style={[styles.periodTabText, { color: active ? '#FFFFFF' : colors.textSecondary }]}>
                    {p.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Thanh chuyển kỳ trước / sau */}
          {period !== 'custom' && (
            <View style={[styles.dateNavRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <TouchableOpacity
                style={styles.navBtn}
                onPress={() => {
                  setOffset((prev) => prev - 1);
                  setActiveTooltip(null);
                }}
              >
                <Ionicons name="chevron-back" size={20} color={colors.text} />
                <Text style={[styles.navBtnText, { color: colors.text }]}>Kỳ trước</Text>
              </TouchableOpacity>

              <View style={styles.dateLabelContainer}>
                <Text style={[styles.dateLabel, { color: colors.text }]}>{stats.range.label}</Text>
                <Text style={[styles.dateSubLabel, { color: colors.textSecondary }]}>
                  {stats.range.subLabel}
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.navBtn, offset >= 0 && styles.navBtnDisabled]}
                disabled={offset >= 0}
                onPress={() => {
                  setOffset((prev) => prev + 1);
                  setActiveTooltip(null);
                }}
              >
                <Text style={[styles.navBtnText, { color: offset >= 0 ? colors.textMuted : colors.text }]}>
                  Kỳ sau
                </Text>
                <Ionicons name="chevron-forward" size={20} color={offset >= 0 ? colors.textMuted : colors.text} />
              </TouchableOpacity>
            </View>
          )}

          {/* Kỳ tùy chọn: hiện khoảng ngày + nút sửa */}
          {period === 'custom' && (
            <TouchableOpacity
              style={[styles.dateNavRow, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => setShowCustomModal(true)}
            >
              <View style={styles.dateLabelContainer}>
                <Text style={[styles.dateLabel, { color: colors.text }]}>{stats.range.label}</Text>
                <Text style={[styles.dateSubLabel, { color: colors.textSecondary }]}>
                  Chạm để đổi khoảng ngày
                </Text>
              </View>
              <Ionicons name="calendar-outline" size={20} color={colors.primary} />
            </TouchableOpacity>
          )}

          {/* Bộ lọc Chips: Theo Sân */}
          <HScroll showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
            <TouchableOpacity
              style={[
                styles.filterChip,
                selectedCourtId === 'all' && { backgroundColor: colors.primary, borderColor: colors.primary },
                selectedCourtId !== 'all' && { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
              onPress={() => setSelectedCourtId('all')}
            >
              <Text style={[styles.chipText, { color: selectedCourtId === 'all' ? '#FFFFFF' : colors.text }]}>
                Tất cả sân ({stats.ownerCourts.length})
              </Text>
            </TouchableOpacity>
            {stats.ownerCourts.map((c) => {
              const active = selectedCourtId === c.id;
              return (
                <TouchableOpacity
                  key={c.id}
                  style={[
                    styles.filterChip,
                    active && { backgroundColor: colors.primary, borderColor: colors.primary },
                    !active && { backgroundColor: colors.surface, borderColor: colors.border },
                  ]}
                  onPress={() => setSelectedCourtId(c.id)}
                >
                  <Text style={[styles.chipText, { color: active ? '#FFFFFF' : colors.text }]}>{c.name}</Text>
                </TouchableOpacity>
              );
            })}
          </HScroll>

          {/* Bộ lọc Phương thức: Tất cả / Tiền mặt / Chuyển khoản */}
          <View style={styles.methodToggleRow}>
            {[
              { id: 'all', label: 'Tất cả phương thức' },
              { id: 'cash', label: '💵 Tiền mặt' },
              { id: 'qr', label: '💳 Chuyển khoản/QR' },
            ].map((m) => {
              const active = selectedMethod === m.id;
              return (
                <TouchableOpacity
                  key={m.id}
                  style={[
                    styles.methodToggleBtn,
                    active && { backgroundColor: colors.surfaceSecondary, borderColor: colors.primary },
                    !active && { borderColor: colors.border },
                  ]}
                  onPress={() => setSelectedMethod(m.id)}
                >
                  <Text style={[styles.methodToggleText, { color: active ? colors.primary : colors.textSecondary }]}>
                    {m.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Thẻ Chỉ số chính (Hero KPI) */}
          <View style={[styles.heroKpiCard, { backgroundColor: colors.surface, borderColor: colors.border }, SHADOWS.md]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>THỰC THU TRONG KỲ</Text>
              <TouchableOpacity onPress={() => setShowInfo((v) => !v)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
              </TouchableOpacity>
            </View>

            {showInfo && (
              <View
                style={{
                  backgroundColor: colors.surfaceSecondary,
                  borderRadius: 10,
                  padding: 10,
                  marginTop: 8,
                  gap: 4,
                }}
              >
                <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                  • Thực thu: tiền khách đã trả, tính theo ngày nhận tiền (gồm cả tiền cọc cho lịch sắp tới).
                </Text>
                <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                  • Dự kiến: tiền còn phải thu của đơn đã xác nhận / đang chơi có ngày chơi trong kỳ.
                </Text>
                <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                  • Công nợ: tiền còn thiếu của đơn đã hoàn thành trong kỳ.
                </Text>
                <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                  • Trung bình/đơn: thực thu chia số đơn có phát sinh thu tiền.
                </Text>
                <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                  • Lấp đầy: số giờ đã đặt chia số giờ mở cửa, tính đến hôm nay.
                </Text>
              </View>
            )}

            <Text style={[styles.heroKpiValue, { color: colors.primary }]}>{formatVND(stats.realRevenue)}</Text>

            {/* % So sánh kỳ trước */}
            {hasGrowth ? (
              <View style={styles.growthBadgeRow}>
                <View style={[styles.growthBadge, { backgroundColor: growthUp ? '#DCFCE7' : '#FEE2E2' }]}>
                  <Ionicons
                    name={growthUp ? 'trending-up' : 'trending-down'}
                    size={14}
                    color={growthUp ? '#16A34A' : '#EF4444'}
                  />
                  <Text style={[styles.growthBadgeText, { color: growthUp ? '#16A34A' : '#EF4444' }]}>
                    {growthUp ? `+${stats.growthPercent}%` : `${stats.growthPercent}%`}
                  </Text>
                </View>
                <Text style={[styles.growthSubText, { color: colors.textSecondary }]}>
                  so với {stats.comparePartial ? 'cùng kỳ' : 'kỳ trước'} {stats.compareLabel} ({formatVND(stats.prevRealRevenue)})
                </Text>
              </View>
            ) : (
              <Text style={[styles.growthSubText, { color: colors.textSecondary, marginTop: 6 }]}>
                Chưa có dữ liệu kỳ trước ({stats.compareLabel}) để so sánh
              </Text>
            )}

            {/* Grid 4 chỉ số phụ */}
            <View style={styles.kpiGrid}>
              <View style={styles.kpiCol}>
                <Text style={[styles.kpiSubLabel, { color: colors.textSecondary }]}>Doanh thu dự kiến</Text>
                <Text style={[styles.kpiSubVal, { color: colors.warning }]}>{formatVND(stats.expectedRevenue)}</Text>
                <Text style={[styles.kpiTiny, { color: colors.textSecondary }]}>Đơn xác nhận chưa thu</Text>
              </View>

              <View style={styles.kpiCol}>
                <Text style={[styles.kpiSubLabel, { color: colors.textSecondary }]}>Công nợ còn lại</Text>
                <Text style={[styles.kpiSubVal, { color: '#EF4444' }]}>{formatVND(stats.debt)}</Text>
                <Text style={[styles.kpiTiny, { color: colors.textSecondary }]}>Khách chưa thanh toán</Text>
              </View>

              <View style={styles.kpiCol}>
                <Text style={[styles.kpiSubLabel, { color: colors.textSecondary }]}>Đơn hoàn thành</Text>
                <Text style={[styles.kpiSubVal, { color: colors.text }]}>{stats.completedCount} đơn</Text>
                <Text style={[styles.kpiTiny, { color: colors.textSecondary }]}>
                  Có thu tiền: {stats.paidOrdersCount} • Hủy/Bỏ: {stats.cancelledCount}
                </Text>
              </View>

              <View style={styles.kpiCol}>
                <Text style={[styles.kpiSubLabel, { color: colors.textSecondary }]}>Trung bình / đơn</Text>
                <Text style={[styles.kpiSubVal, { color: colors.text }]}>
                  {stats.avgOrderValue === null ? '—' : formatVND(stats.avgOrderValue)}
                </Text>
                <Text style={[styles.kpiTiny, { color: colors.textSecondary }]}>
                  Lấp đầy: {stats.occupancyRate === null ? '—' : `${stats.occupancyRate}%`}
                </Text>
              </View>
            </View>
          </View>

          {/* Biểu đồ cột (dùng View thay SVG để chạy ổn định cả web lẫn điện thoại) */}
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, SHADOWS.sm]}>
            <View style={styles.chartHeader}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>Biểu đồ doanh thu</Text>
              {activeTooltip && (
                <View style={styles.activeTooltipBadge}>
                  <Text style={styles.tooltipText}>
                    {activeTooltip.label}: {formatVND(activeTooltip.value)}
                  </Text>
                </View>
              )}
            </View>

            {chartData.length > 0 ? (
              <HScroll showsHorizontalScrollIndicator={false}>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'flex-end',
                    height: 170,
                    paddingTop: 10,
                    paddingHorizontal: 8,
                    borderBottomWidth: 1,
                    borderBottomColor: colors.border,
                  }}
                >
                  {chartData.map((d, idx) => {
                    const barHeight = d.value > 0 ? Math.max(4, Math.round((d.value / maxChartVal) * 120)) : 2;
                    const selected = activeTooltip?.label === d.label;
                    return (
                      <TouchableOpacity
                        key={`${d.label}_${idx}`}
                        activeOpacity={0.7}
                        onPress={() => setActiveTooltip({ label: d.label, value: d.value })}
                        style={{ width: 44, height: 160, alignItems: 'center', justifyContent: 'flex-end' }}
                      >
                        <View
                          style={{
                            width: 26,
                            height: barHeight,
                            borderRadius: 5,
                            backgroundColor: selected ? '#15803D' : d.value > 0 ? colors.primary : colors.border,
                          }}
                        />
                        <Text
                          numberOfLines={1}
                          style={{ fontSize: 10, fontWeight: '600', marginTop: 6, color: colors.textSecondary }}
                        >
                          {d.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </HScroll>
            ) : (
              <Text style={{ color: colors.textSecondary, textAlign: 'center', paddingVertical: 20 }}>
                Không có dữ liệu biểu đồ trong kỳ này.
              </Text>
            )}
            <Text style={[styles.chartHint, { color: colors.textSecondary }]}>
              * Chạm vào cột để xem số tiền chi tiết
            </Text>
          </View>

          {/* Tỷ trọng thanh toán (Tiền mặt vs QR) */}
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, SHADOWS.sm]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Tỷ trọng phương thức thanh toán</Text>
            <View style={styles.methodProgressTrack}>
              <View style={[styles.progressCash, { width: `${stats.cashPercent}%` }]} />
              <View style={[styles.progressQr, { width: `${stats.qrPercent}%` }]} />
            </View>
            <View style={styles.methodLegendRow}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#F59E0B' }]} />
                <Text style={[styles.legendText, { color: colors.textSecondary }]}>
                  Tiền mặt:{' '}
                  <Text style={{ fontWeight: '800', color: colors.text }}>{formatVND(stats.cashRevenue)}</Text> (
                  {stats.cashPercent}%)
                </Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#16A34A' }]} />
                <Text style={[styles.legendText, { color: colors.textSecondary }]}>
                  Chuyển khoản / QR:{' '}
                  <Text style={{ fontWeight: '800', color: colors.text }}>{formatVND(stats.qrRevenue)}</Text> (
                  {stats.qrPercent}%)
                </Text>
              </View>
            </View>
          </View>

          {/* Doanh thu theo từng sân */}
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, SHADOWS.sm]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Doanh thu theo sân & môn</Text>
            {stats.courtBreakdown.length > 0 ? (
              stats.courtBreakdown.map((item) => (
                <View key={item.courtId} style={styles.courtRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.courtName, { color: colors.text }]}>{item.courtName}</Text>
                    <Text style={[styles.courtSub, { color: colors.textSecondary }]}>
                      {item.bookingsCount} lượt đặt sân
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.courtRev, { color: colors.primary }]}>{formatVND(item.revenue)}</Text>
                    <Text style={[styles.courtPercent, { color: colors.textSecondary }]}>{item.percent}%</Text>
                  </View>
                </View>
              ))
            ) : (
              <Text style={{ color: colors.textSecondary }}>Chưa có dữ liệu sân.</Text>
            )}
          </View>

          {/* Danh sách giao dịch trong kỳ */}
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, SHADOWS.sm]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              Lịch sử giao dịch ({stats.transactions.length})
            </Text>

            {stats.transactions.length > 0 ? (
              stats.transactions.map((tx) => (
                <TouchableOpacity
                  key={tx.id}
                  style={styles.txRow}
                  onPress={() => router.push(`/booking-detail/${tx.bookingId}`)}
                >
                  <View style={[styles.txIconBox, { backgroundColor: tx.method === 'qr' ? '#DCFCE7' : '#FEF3C7' }]}>
                    <Ionicons
                      name={tx.method === 'qr' ? 'qr-code-outline' : 'cash-outline'}
                      size={20}
                      color={tx.method === 'qr' ? '#16A34A' : '#D97706'}
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={[styles.txCode, { color: colors.text }]}>{tx.bookingCode}</Text>
                    <Text style={[styles.txDesc, { color: colors.textSecondary }]} numberOfLines={1}>
                      {tx.userName} • {tx.subCourt}
                    </Text>
                    <Text style={[styles.txDate, { color: colors.textSecondary }]}>{formatDateTimeVN(tx.at)}</Text>
                  </View>

                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.txAmount, { color: tx.type === 'refund' ? '#EF4444' : '#16A34A' }]}>
                      {tx.type === 'refund' ? '-' : '+'}
                      {formatVND(tx.amount)}
                    </Text>
                    <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
                  </View>
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons name="receipt-outline" size={40} color={colors.textSecondary} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  Không có giao dịch nào trong kỳ đã chọn.
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      )}

      {/* Modal Tùy chọn ngày */}
      <Modal visible={showCustomModal} transparent animationType="slide" onRequestClose={cancelCustomRange}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalBox, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Chọn khoảng ngày tùy chỉnh</Text>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Từ ngày (YYYY-MM-DD):</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.border, color: colors.text }]}
                value={customFrom}
                onChangeText={(t) => {
                  setCustomFrom(t);
                  setCustomError('');
                }}
                placeholder="2026-10-01"
                placeholderTextColor={colors.textSecondary}
                keyboardType="numbers-and-punctuation"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Đến ngày (YYYY-MM-DD):</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.border, color: colors.text }]}
                value={customTo}
                onChangeText={(t) => {
                  setCustomTo(t);
                  setCustomError('');
                }}
                placeholder="2026-11-02"
                placeholderTextColor={colors.textSecondary}
                keyboardType="numbers-and-punctuation"
              />
            </View>

            {customError !== '' && (
              <Text style={{ color: '#EF4444', fontSize: 12, marginBottom: 8 }}>{customError}</Text>
            )}

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={[styles.modalBtn, { borderColor: colors.border, borderWidth: 1 }]}
                onPress={cancelCustomRange}
              >
                <Text style={{ color: colors.textSecondary }}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.primary }]} onPress={applyCustomRange}>
                <Text style={{ color: '#FFFFFF', fontWeight: '800' }}>Áp dụng</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.md,
    gap: SPACING.md,
    paddingBottom: 40,
  },
  periodRow: {
    flexDirection: 'row',
    gap: 6,
  },
  periodTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  periodTabText: {
    fontSize: 12,
    fontWeight: '700',
  },
  dateNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.sm,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
  },
  navBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  navBtnDisabled: {
    opacity: 0.4,
  },
  navBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  dateLabelContainer: {
    alignItems: 'center',
  },
  dateLabel: {
    fontSize: 14,
    fontWeight: '800',
  },
  dateSubLabel: {
    fontSize: 11,
    marginTop: 1,
  },
  chipsScroll: {
    gap: 8,
    paddingVertical: 2,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  methodToggleRow: {
    flexDirection: 'row',
    gap: 6,
  },
  methodToggleBtn: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    alignItems: 'center',
  },
  methodToggleText: {
    fontSize: 11,
    fontWeight: '700',
  },
  heroKpiCard: {
    padding: SPACING.lg,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
  },
  kpiLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  heroKpiValue: {
    fontSize: 28,
    fontWeight: '900',
    marginTop: 4,
    letterSpacing: 0.5,
  },
  growthBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  growthBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  growthBadgeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  growthSubText: {
    fontSize: 11,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    gap: SPACING.md,
  },
  kpiCol: {
    width: '47%',
  },
  kpiSubLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  kpiSubVal: {
    fontSize: 15,
    fontWeight: '800',
    marginTop: 2,
  },
  kpiTiny: {
    fontSize: 10,
    marginTop: 2,
  },
  card: {
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: SPACING.md,
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  activeTooltipBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
  },
  tooltipText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#16A34A',
  },
  chartHint: {
    fontSize: 10,
    fontStyle: 'italic',
    marginTop: 8,
    textAlign: 'center',
  },
  methodProgressTrack: {
    height: 14,
    borderRadius: 7,
    flexDirection: 'row',
    overflow: 'hidden',
    backgroundColor: '#E2E8F0',
  },
  progressCash: {
    backgroundColor: '#F59E0B',
    height: '100%',
  },
  progressQr: {
    backgroundColor: '#16A34A',
    height: '100%',
  },
  methodLegendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACING.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 11,
  },
  courtRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E2E8F0',
  },
  courtName: {
    fontSize: 13,
    fontWeight: '700',
  },
  courtSub: {
    fontSize: 11,
    marginTop: 2,
  },
  courtRev: {
    fontSize: 14,
    fontWeight: '800',
  },
  courtPercent: {
    fontSize: 11,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E2E8F0',
    gap: SPACING.md,
  },
  txIconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txCode: {
    fontSize: 13,
    fontWeight: '800',
  },
  txDesc: {
    fontSize: 11,
    marginTop: 1,
  },
  txDate: {
    fontSize: 10,
    marginTop: 1,
  },
  txAmount: {
    fontSize: 14,
    fontWeight: '900',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
    gap: 6,
  },
  emptyText: {
    fontSize: 13,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  modalBox: {
    width: '100%',
    maxWidth: 360,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  inputGroup: {
    gap: 4,
  },
  inputLabel: {
    fontSize: 12,
  },
  input: {
    borderWidth: 1,
    borderRadius: RADIUS.md,
    padding: 10,
    fontSize: 14,
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.sm,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
