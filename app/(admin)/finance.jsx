import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { Header } from '../../components/ui/Header';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { db } from '../../services/db';
import { formatVND, formatDateVN } from '../../utils/format';
import { confirmAction, notify } from '../../utils/dialog';
import { RADIUS, SPACING, SHADOWS } from '../../constants/theme';
import dayjs from 'dayjs';

const PLATFORM_COMMISSION_RATE = 0.1; // 10% phí nền tảng

export default function AdminFinanceScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const [bookings, setBookings] = useState([]);
  const [courts, setCourts] = useState([]);
  const [owners, setOwners] = useState([]);
  const [settlements, setSettlements] = useState({}); // { [courtId]: { status: 'settled' | 'pending', refCode, settledAt } }
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filter
  const [timePeriod, setTimePeriod] = useState('30d'); // '7d' | '30d' | '90d' | 'all'
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'pending' | 'settled'
  const [search, setSearch] = useState('');

  // Settlement Action Modal
  const [settlingCourt, setSettlingCourt] = useState(null);
  const [settlementRef, setSettlementRef] = useState('');
  const [settlementNote, setSettlementNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Detail Modal
  const [inspectingCourt, setInspectingCourt] = useState(null);

  const loadData = useCallback(async () => {
    try {
      const [allBookings, allCourts, allUsers] = await Promise.all([
        db.getAll('bookings'),
        db.getAll('courts'),
        db.getAll('users'),
      ]);

      setBookings(allBookings);
      setCourts(allCourts);
      setOwners(allUsers.filter((u) => u.role === 'owner'));
    } catch (e) {
      console.warn('Lỗi tải dữ liệu tài chính:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // Filter bookings according to period
  const periodBookings = useMemo(() => {
    const now = dayjs();
    let cutoff = null;
    if (timePeriod === '7d') cutoff = now.subtract(7, 'day');
    else if (timePeriod === '30d') cutoff = now.subtract(30, 'day');
    else if (timePeriod === '90d') cutoff = now.subtract(90, 'day');

    return bookings.filter((b) => {
      const isValid = b.status === 'completed' || b.status === 'confirmed' || b.status === 'checked_in';
      if (!isValid) return false;
      if (!cutoff) return true;
      const bDate = dayjs(b.date || b.createdAt);
      return bDate.isAfter(cutoff) || bDate.isSame(cutoff, 'day');
    });
  }, [bookings, timePeriod]);

  // Aggregate stats per court
  const courtFinanceList = useMemo(() => {
    const ownerMap = {};
    owners.forEach((o) => {
      ownerMap[o.id] = o;
    });

    const map = {};
    courts.forEach((c) => {
      const owner = ownerMap[c.ownerId] || null;
      map[c.id] = {
        courtId: c.id,
        courtName: c.name,
        sport: c.sport,
        ownerId: c.ownerId,
        ownerName: owner?.fullName || c.ownerName || 'Chủ sân đối tác',
        ownerPhone: owner?.phone || c.phone || '---',
        ownerBank: owner?.bankInfo || {
          bankName: 'Vietcombank',
          accountNumber: '9988776655',
          accountName: owner?.fullName?.toUpperCase() || 'CHU SAN',
        },
        bookingCount: 0,
        grossRevenue: 0,
        platformFee: 0,
        netPayout: 0,
        status: settlements[c.id]?.status || 'pending', // 'pending' | 'settled'
        settlementRef: settlements[c.id]?.refCode || '',
        settledAt: settlements[c.id]?.settledAt || null,
      };
    });

    periodBookings.forEach((b) => {
      if (map[b.courtId]) {
        const val = b.finalAmount || b.totalPrice || 0;
        map[b.courtId].bookingCount += 1;
        map[b.courtId].grossRevenue += val;
      }
    });

    // Compute fee & net payout
    Object.values(map).forEach((item) => {
      item.platformFee = Math.round(item.grossRevenue * PLATFORM_COMMISSION_RATE);
      item.netPayout = item.grossRevenue - item.platformFee;
    });

    let list = Object.values(map);

    // Apply status filter
    if (statusFilter !== 'all') {
      list = list.filter((item) => item.status === statusFilter);
    }

    // Apply search
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter(
        (item) =>
          item.courtName.toLowerCase().includes(q) ||
          item.ownerName.toLowerCase().includes(q) ||
          item.ownerPhone.includes(q)
      );
    }

    // Sort by revenue descending
    list.sort((a, b) => b.grossRevenue - a.grossRevenue);
    return list;
  }, [courts, owners, periodBookings, settlements, statusFilter, search]);

  // Overall Financial Totals
  const totalGross = useMemo(
    () => courtFinanceList.reduce((acc, c) => acc + c.grossRevenue, 0),
    [courtFinanceList]
  );
  const totalFee = useMemo(
    () => Math.round(totalGross * PLATFORM_COMMISSION_RATE),
    [totalGross]
  );
  const totalNet = useMemo(() => totalGross - totalFee, [totalGross, totalFee]);

  const settledAmount = useMemo(() => {
    return courtFinanceList
      .filter((c) => c.status === 'settled')
      .reduce((acc, c) => acc + c.netPayout, 0);
  }, [courtFinanceList]);

  const pendingAmount = useMemo(() => {
    return courtFinanceList
      .filter((c) => c.status === 'pending')
      .reduce((acc, c) => acc + c.netPayout, 0);
  }, [courtFinanceList]);

  // Confirm Settlement / Transfer
  const handleConfirmSettlement = async () => {
    if (!settlingCourt) return;
    try {
      setSubmitting(true);
      const nowIso = new Date().toISOString();
      const code = settlementRef.trim() || `CK-DS${Date.now().toString().slice(-6)}`;

      setSettlements((prev) => ({
        ...prev,
        [settlingCourt.courtId]: {
          status: 'settled',
          refCode: code,
          settledAt: nowIso,
          note: settlementNote.trim(),
        },
      }));

      // Notify owner
      if (settlingCourt.ownerId) {
        await db.add('notifications', {
          userId: settlingCourt.ownerId,
          title: 'Đối soát & Quyết toán hoàn tất 💵',
          body: `Hệ thống Sportify-VN đã chuyển số tiền ${formatVND(
            settlingCourt.netPayout
          )} (đã khấu trừ 10% phí sàn) tới STK ${settlingCourt.ownerBank?.bankName || 'Ngân hàng'}. Mã GD: ${code}.`,
          type: 'settlement_success',
          read: false,
          createdAt: nowIso,
        });
      }

      notify(
        'Đối soát thành công ✅',
        `Đã ghi nhận chuyển khoản ${formatVND(settlingCourt.netPayout)} cho chủ sân "${settlingCourt.ownerName}".`
      );
      setSettlingCourt(null);
      setSettlementRef('');
      setSettlementNote('');
    } catch (e) {
      notify('Lỗi đối soát', e.message || 'Không thể lưu đối soát');
    } finally {
      setSubmitting(false);
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    const header = 'STT,Cum San,Chu San,SDT,Ngan Hang,So Tai Khoan,So Don,Doanh Thu Gop,Phi San 10%,Thuc Chuyen 90%,Trang Thai\n';
    const rows = courtFinanceList
      .map(
        (c, idx) =>
          `${idx + 1},"${c.courtName}","${c.ownerName}","${c.ownerPhone}","${c.ownerBank.bankName}","${
            c.ownerBank.accountNumber
          }",${c.bookingCount},${c.grossRevenue},${c.platformFee},${c.netPayout},"${
            c.status === 'settled' ? 'Da quyet toan' : 'Cho doi soat'
          }"`
      )
      .join('\n');

    notify(
      'Xuất sao kê thành công 📥',
      `Đã trích xuất sao kê dòng tiền (${courtFinanceList.length} đối tác, Tổng chuyển: ${formatVND(
        totalNet
      )}).`
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title="Quản lý Tài chính & Đối soát" showBack={false} />

      {/* TOP EXECUTIVE OVERVIEW CARDS */}
      <View style={styles.topSummaryWrapper}>
        <View style={[styles.mainKpiCard, { backgroundColor: colors.primaryDark }, SHADOWS.md]}>
          <View style={styles.kpiRow}>
            <View>
              <Text style={styles.mainKpiLabel}>TỔNG DÒNG TIỀN GIAO DỊCH (GMV)</Text>
              <Text style={styles.mainKpiVal}>{formatVND(totalGross)}</Text>
              <Text style={styles.mainKpiSub}>
                Từ {periodBookings.length} lượt đặt sân hoàn tất ({timePeriod.toUpperCase()})
              </Text>
            </View>

            <TouchableOpacity style={styles.exportIconBtn} onPress={handleExportCSV}>
              <Ionicons name="download-outline" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Sub KPIs inside main card */}
          <View style={styles.subKpiRow}>
            <View style={styles.subKpiBox}>
              <Text style={styles.subKpiLabel}>Hoa hồng sàn (10%)</Text>
              <Text style={styles.subKpiValPositive}>+{formatVND(totalFee)}</Text>
            </View>
            <View style={styles.subKpiDivider} />
            <View style={styles.subKpiBox}>
              <Text style={styles.subKpiLabel}>Thực trả Chủ sân (90%)</Text>
              <Text style={styles.subKpiVal}>{formatVND(totalNet)}</Text>
            </View>
          </View>
        </View>

        {/* 2 Settlement Status Pill Cards */}
        <View style={styles.settlementPillsRow}>
          <View style={[styles.settlePill, { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' }]}>
            <Ionicons name="hourglass-outline" size={18} color="#D97706" />
            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text style={[styles.settlePillTitle, { color: '#B45309' }]}>Chờ đối soát</Text>
              <Text style={[styles.settlePillVal, { color: '#92400E' }]}>{formatVND(pendingAmount)}</Text>
            </View>
          </View>

          <View style={[styles.settlePill, { backgroundColor: '#DCFCE7', borderColor: '#BBF7D0' }]}>
            <Ionicons name="checkmark-done-circle-outline" size={18} color="#15803D" />
            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text style={[styles.settlePillTitle, { color: '#166534' }]}>Đã quyết toán</Text>
              <Text style={[styles.settlePillVal, { color: '#14532D' }]}>{formatVND(settledAmount)}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* FILTER BAR: PERIOD & STATUS */}
      <View style={[styles.filterBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        {/* Search Input */}
        <View style={[styles.searchBox, { backgroundColor: colors.surfaceSecondary }]}>
          <Ionicons name="search" size={17} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Tìm theo cụm sân, tên chủ sân, SĐT..."
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
          />
          {Boolean(search) && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Period Pills */}
        <View style={styles.pillsRow}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
            {[
              { id: '7d', label: '7 ngày qua' },
              { id: '30d', label: '30 ngày qua' },
              { id: '90d', label: 'Quý này' },
              { id: 'all', label: 'Toàn thời gian' },
            ].map((p) => {
              const active = timePeriod === p.id;
              return (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.pillBtn, active && { backgroundColor: colors.primary }]}
                  onPress={() => setTimePeriod(p.id)}
                >
                  <Text style={[styles.pillText, { color: active ? '#FFFFFF' : colors.textSecondary }]}>
                    {p.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Status Segmented */}
          <View style={[styles.statusToggle, { backgroundColor: colors.surfaceSecondary }]}>
            <TouchableOpacity
              style={[styles.statusToggleItem, statusFilter === 'all' && [styles.statusToggleActive, { backgroundColor: colors.surface }]]}
              onPress={() => setStatusFilter('all')}
            >
              <Text style={[styles.statusToggleText, { color: statusFilter === 'all' ? colors.text : colors.textSecondary }]}>
                Tất cả
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.statusToggleItem, statusFilter === 'pending' && [styles.statusToggleActive, { backgroundColor: colors.surface }]]}
              onPress={() => setStatusFilter('pending')}
            >
              <Text style={[styles.statusToggleText, { color: statusFilter === 'pending' ? '#D97706' : colors.textSecondary }]}>
                Chờ duyệt
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.statusToggleItem, statusFilter === 'settled' && [styles.statusToggleActive, { backgroundColor: colors.surface }]]}
              onPress={() => setStatusFilter('settled')}
            >
              <Text style={[styles.statusToggleText, { color: statusFilter === 'settled' ? '#16A34A' : colors.textSecondary }]}>
                Đã trả
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* LIST OF COURTS & SETTLEMENTS */}
      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Đang tính toán dòng tiền...</Text>
        </View>
      ) : (
        <FlatList
          data={courtFinanceList}
          keyExtractor={(item) => item.courtId}
          contentContainerStyle={[styles.listContent, { paddingBottom: 110 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
          ListEmptyComponent={
            <EmptyState
              icon="wallet-outline"
              title="Không có dữ liệu đối soát"
              description="Chưa phát sinh doanh thu trong kỳ lọc đã chọn."
            />
          }
          renderItem={({ item }) => {
            const isSettled = item.status === 'settled';

            return (
              <View
                style={[
                  styles.settleCard,
                  { backgroundColor: colors.surface, borderColor: isSettled ? '#BBF7D0' : colors.border },
                  SHADOWS.sm,
                ]}
              >
                {/* Header row: Court name & status badge */}
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.courtTitle, { color: colors.text }]}>{item.courtName}</Text>
                    <Text style={[styles.ownerSub, { color: colors.textSecondary }]}>
                      Chủ sân: {item.ownerName} • {item.ownerPhone}
                    </Text>
                  </View>

                  <Badge
                    label={isSettled ? 'Đã chuyển tiền' : 'Chờ đối soát'}
                    variant={isSettled ? 'success' : 'warning'}
                    size="sm"
                  />
                </View>

                {/* Financial 3-column breakdown */}
                <View style={[styles.matrixRow, { backgroundColor: colors.surfaceSecondary }]}>
                  <View style={styles.matrixCol}>
                    <Text style={[styles.matrixLabel, { color: colors.textSecondary }]}>Doanh thu gộp</Text>
                    <Text style={[styles.matrixVal, { color: colors.text }]}>{formatVND(item.grossRevenue)}</Text>
                    <Text style={[styles.matrixCount, { color: colors.textSecondary }]}>
                      {item.bookingCount} đơn
                    </Text>
                  </View>

                  <View style={styles.matrixDivider} />

                  <View style={styles.matrixCol}>
                    <Text style={[styles.matrixLabel, { color: colors.textSecondary }]}>Phí sàn (10%)</Text>
                    <Text style={[styles.matrixVal, { color: '#16A34A', fontWeight: '800' }]}>
                      -{formatVND(item.platformFee)}
                    </Text>
                    <Text style={[styles.matrixCount, { color: colors.textSecondary }]}>Khấu trừ</Text>
                  </View>

                  <View style={styles.matrixDivider} />

                  <View style={styles.matrixCol}>
                    <Text style={[styles.matrixLabel, { color: colors.textSecondary }]}>Thực nhận (90%)</Text>
                    <Text style={[styles.matrixVal, { color: colors.primary, fontWeight: '900' }]}>
                      {formatVND(item.netPayout)}
                    </Text>
                    <Text style={[styles.matrixCount, { color: colors.textSecondary }]}>Cần chuyển</Text>
                  </View>
                </View>

                {/* Bank Account Info */}
                <View style={[styles.bankInfoBox, { borderColor: colors.border }]}>
                  <Ionicons name="card-outline" size={16} color={colors.primary} />
                  <Text style={[styles.bankInfoText, { color: colors.text }]}>
                    {item.ownerBank.bankName} • STK: <Text style={{ fontWeight: '800' }}>{item.ownerBank.accountNumber}</Text> ({item.ownerBank.accountName})
                  </Text>
                </View>

                {/* Actions row */}
                <View style={[styles.actionsRow, { borderTopColor: colors.border }]}>
                  <TouchableOpacity
                    style={[styles.inspectBtn, { borderColor: colors.border }]}
                    onPress={() => setInspectingCourt(item)}
                  >
                    <Ionicons name="document-text-outline" size={15} color={colors.textSecondary} />
                    <Text style={[styles.inspectBtnText, { color: colors.text }]}>Chi tiết</Text>
                  </TouchableOpacity>

                  {isSettled ? (
                    <View style={styles.settledInfo}>
                      <Ionicons name="checkmark-circle" size={16} color="#16A34A" />
                      <Text style={[styles.settledRefText, { color: '#16A34A' }]}>
                        Mã GD: {item.settlementRef}
                      </Text>
                    </View>
                  ) : (
                    <Button
                      title="Xác nhận đối soát & Chuyển tiền"
                      variant="primary"
                      size="sm"
                      icon={<Ionicons name="cash-outline" size={15} color="#FFFFFF" />}
                      onPress={() => {
                        setSettlingCourt(item);
                        setSettlementRef(`CK-DS${Date.now().toString().slice(-6)}`);
                        setSettlementNote(`Quyết toán kỳ ${timePeriod.toUpperCase()} cho cụm sân ${item.courtName}`);
                      }}
                      disabled={item.netPayout <= 0}
                    />
                  )}
                </View>
              </View>
            );
          }}
        />
      )}

      {/* MODAL 1: XÁC NHẬN ĐỐI SOÁT & CHUYỂN TIỀN CHO CHỦ SÂN */}
      {settlingCourt && (
        <Modal
          visible={Boolean(settlingCourt)}
          transparent
          animationType="fade"
          onRequestClose={() => setSettlingCourt(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, { backgroundColor: colors.surface }, SHADOWS.lg]}>
              <View style={styles.modalHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="checkmark-done-circle" size={24} color={colors.primary} />
                  <Text style={[styles.modalTitle, { color: colors.text }]}>Quyết toán đối soát</Text>
                </View>
                <TouchableOpacity onPress={() => setSettlingCourt(null)}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

              <View style={[styles.payoutSummaryBox, { backgroundColor: colors.surfaceSecondary }]}>
                <Text style={[styles.payoutTitle, { color: colors.textSecondary }]}>Số tiền thực chuyển trả đối tác:</Text>
                <Text style={[styles.payoutAmount, { color: colors.primary }]}>{formatVND(settlingCourt.netPayout)}</Text>
                <Text style={[styles.payoutSub, { color: colors.textSecondary }]}>
                  (Doanh thu: {formatVND(settlingCourt.grossRevenue)} - Phí hoa hồng sàn 10%: {formatVND(settlingCourt.platformFee)})
                </Text>
              </View>

              <View style={[styles.bankCardPreview, { backgroundColor: '#F8FAFC', borderColor: '#E2E8F0' }]}>
                <Text style={styles.bankPreviewLabel}>THÔNG TIN NGÂN HÀNG THỤ HƯỞNG</Text>
                <Text style={styles.bankPreviewName}>{settlingCourt.ownerBank.bankName}</Text>
                <Text style={styles.bankPreviewAcc}>{settlingCourt.ownerBank.accountNumber}</Text>
                <Text style={styles.bankPreviewHolder}>{settlingCourt.ownerBank.accountName}</Text>
              </View>

              <Text style={[styles.inputLabel, { color: colors.text }]}>Mã giao dịch ngân hàng / Tham chiếu:</Text>
              <TextInput
                style={[styles.inputBox, { backgroundColor: colors.surfaceSecondary, color: colors.text, borderColor: colors.border }]}
                value={settlementRef}
                onChangeText={setSettlementRef}
                placeholder="VD: FT240900123456"
                placeholderTextColor={colors.textMuted}
              />

              <Text style={[styles.inputLabel, { color: colors.text }]}>Ghi chú chuyển khoản:</Text>
              <TextInput
                style={[styles.inputBox, { backgroundColor: colors.surfaceSecondary, color: colors.text, borderColor: colors.border }]}
                value={settlementNote}
                onChangeText={setSettlementNote}
                placeholder="Nội dung chuyển khoản"
                placeholderTextColor={colors.textMuted}
              />

              <View style={styles.modalBtnRow}>
                <Button
                  title="Hủy bỏ"
                  variant="outline"
                  size="md"
                  onPress={() => setSettlingCourt(null)}
                  style={{ flex: 1 }}
                />
                <Button
                  title="Xác nhận đã chuyển"
                  variant="primary"
                  size="md"
                  loading={submitting}
                  onPress={handleConfirmSettlement}
                  style={{ flex: 1.5 }}
                />
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* MODAL 2: XEM CHI TIẾT DÒNG TIỀN CỤM SÂN */}
      {inspectingCourt && (
        <Modal
          visible={Boolean(inspectingCourt)}
          transparent
          animationType="slide"
          onRequestClose={() => setInspectingCourt(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, { backgroundColor: colors.surface }, SHADOWS.lg]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.text }]} numberOfLines={1}>
                  Báo cáo: {inspectingCourt.courtName}
                </Text>
                <TouchableOpacity onPress={() => setInspectingCourt(null)}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Chủ sở hữu:</Text>
                <Text style={[styles.infoVal, { color: colors.text }]}>{inspectingCourt.ownerName}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Số điện thoại:</Text>
                <Text style={[styles.infoVal, { color: colors.text }]}>{inspectingCourt.ownerPhone}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Tổng số lượt đặt sân:</Text>
                <Text style={[styles.infoVal, { color: colors.text }]}>{inspectingCourt.bookingCount} đơn</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Tổng doanh thu gộp:</Text>
                <Text style={[styles.infoVal, { color: colors.text, fontWeight: '800' }]}>{formatVND(inspectingCourt.grossRevenue)}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Hoa hồng Sportify-VN (10%):</Text>
                <Text style={[styles.infoVal, { color: '#16A34A', fontWeight: '800' }]}>{formatVND(inspectingCourt.platformFee)}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Chủ sân thực nhận (90%):</Text>
                <Text style={[styles.infoVal, { color: colors.primary, fontWeight: '900' }]}>{formatVND(inspectingCourt.netPayout)}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Trạng thái đối soát:</Text>
                <Badge
                  label={inspectingCourt.status === 'settled' ? 'Đã quyết toán' : 'Chờ đối soát'}
                  variant={inspectingCourt.status === 'settled' ? 'success' : 'warning'}
                  size="sm"
                />
              </View>

              <View style={{ marginTop: 16 }}>
                <Button
                  title="Đóng"
                  variant="outline"
                  size="md"
                  onPress={() => setInspectingCourt(null)}
                />
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  topSummaryWrapper: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.xs,
    paddingBottom: SPACING.xs,
    gap: 8,
  },
  mainKpiCard: {
    padding: SPACING.md,
    borderRadius: RADIUS.xl,
  },
  kpiRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  mainKpiLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#A3E635',
    letterSpacing: 0.8,
  },
  mainKpiVal: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFFFFF',
    marginVertical: 4,
  },
  mainKpiSub: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
  },
  exportIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  subKpiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.15)',
  },
  subKpiBox: {
    flex: 1,
  },
  subKpiLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 2,
  },
  subKpiVal: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  subKpiValPositive: {
    fontSize: 15,
    fontWeight: '800',
    color: '#A3E635',
  },
  subKpiDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginHorizontal: 12,
  },
  settlementPillsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  settlePill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: RADIUS.md,
    borderWidth: 1,
  },
  settlePillTitle: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  settlePillVal: {
    fontSize: 14,
    fontWeight: '900',
    marginTop: 1,
  },
  filterBar: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.xs,
    paddingBottom: SPACING.xs,
    borderBottomWidth: 1,
    gap: 8,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderRadius: RADIUS.full,
    height: 38,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    paddingVertical: 0,
  },
  pillsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  pillBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
  },
  pillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  statusToggle: {
    flexDirection: 'row',
    padding: 2,
    borderRadius: RADIUS.md,
  },
  statusToggleItem: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
  },
  statusToggleActive: {
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  statusToggleText: {
    fontSize: 11,
    fontWeight: '700',
  },
  listContent: {
    padding: SPACING.md,
    gap: SPACING.md,
  },
  settleCard: {
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  courtTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  ownerSub: {
    fontSize: 12,
    marginTop: 2,
  },
  matrixRow: {
    flexDirection: 'row',
    padding: 10,
    borderRadius: RADIUS.md,
    marginVertical: 6,
  },
  matrixCol: {
    flex: 1,
    alignItems: 'center',
  },
  matrixDivider: {
    width: 1,
    height: '100%',
    backgroundColor: '#CBD5E1',
  },
  matrixLabel: {
    fontSize: 10,
    marginBottom: 2,
  },
  matrixVal: {
    fontSize: 13,
    fontWeight: '700',
  },
  matrixCount: {
    fontSize: 9,
    marginTop: 2,
  },
  bankInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    borderTopWidth: 0.5,
    marginTop: 2,
  },
  bankInfoText: {
    fontSize: 11,
    flex: 1,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  inspectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
  },
  inspectBtnText: {
    fontSize: 11,
    fontWeight: '600',
  },
  settledInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  settledRefText: {
    fontSize: 11,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  modalCard: {
    width: '100%',
    maxWidth: 440,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  payoutSummaryBox: {
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    marginBottom: 10,
  },
  payoutTitle: {
    fontSize: 12,
  },
  payoutAmount: {
    fontSize: 22,
    fontWeight: '900',
    marginVertical: 4,
  },
  payoutSub: {
    fontSize: 10,
    textAlign: 'center',
  },
  bankCardPreview: {
    padding: 12,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    marginBottom: 12,
  },
  bankPreviewLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  bankPreviewName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 2,
  },
  bankPreviewAcc: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0284C7',
    letterSpacing: 1,
    marginVertical: 2,
  },
  bankPreviewHolder: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
  },
  inputBox: {
    borderWidth: 1,
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    height: 40,
    fontSize: 13,
    marginBottom: 10,
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E2E8F0',
  },
  infoLabel: {
    fontSize: 13,
  },
  infoVal: {
    fontSize: 13,
  },
});
