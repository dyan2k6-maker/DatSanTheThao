import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import dayjs from 'dayjs';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Header } from '../../components/ui/Header';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { ScreenTransition } from '../../components/ui/ScreenTransition';
import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated';
import { db } from '../../services/db';
import { parseBookingQrPayload } from '../../utils/qr';
import { formatVND, formatDateVN } from '../../utils/format';
import { calcPaymentSummary, PAYMENT_STATUS_MAP } from '../../utils/payment';
import { BOOKING_STATUSES } from '../../constants/sports';
import { confirmAction, notify } from '../../utils/dialog';
import { RADIUS, SPACING, SHADOWS } from '../../constants/theme';

export default function BookingsRequestScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { colors } = useTheme();

  const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'confirmed' | 'history'
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  // Camera QR Scanner State
  const [permission, requestPermission] = useCameraPermissions();
  const [scannerVisible, setScannerVisible] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [manualCode, setManualCode] = useState('');

  const loadBookings = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      // Lọc nghiêm ngặt đơn của chính chủ sân
      const allBookings = await db.getAll('bookings', (b) => b.ownerId === user.id);
      allBookings.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      setBookings(allBookings);
    } catch (e) {
      console.warn('Lỗi tải lịch đặt sân:', e);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      loadBookings();
    }, [loadBookings])
  );

  const pendingList = bookings.filter((b) => b.status === 'pending');
  const confirmedList = bookings.filter((b) => b.status === 'confirmed' || b.status === 'checked_in');
  const historyList = bookings.filter(
    (b) => b.status === 'completed' || b.status === 'cancelled' || b.status === 'rejected' || b.status === 'no_show'
  );

  const filteredBookings =
    activeTab === 'pending'
      ? pendingList
      : activeTab === 'confirmed'
      ? confirmedList
      : historyList;

  const handleApprove = async (booking) => {
    confirmAction(
      'Xác nhận duyệt',
      `Duyệt đơn đặt ${booking.code} (${booking.courtName}) cho khách ${booking.userName}?`,
      'Duyệt đơn',
      async () => {
        const now = new Date().toISOString();
        await db.update('bookings', booking.id, {
          status: 'confirmed',
          approvedAt: now,
        });
        await db.add('notifications', {
          userId: booking.userId,
          title: 'Chủ sân đã duyệt lịch ✅',
          body: `Lịch đặt ${booking.courtName} (${booking.subCourt}) lúc ${booking.startTime} ngày ${formatDateVN(booking.date)} đã được xác nhận.`,
          type: 'booking_confirmed',
          read: false,
          createdAt: now,
        });
        notify('Thành công', 'Đã xác nhận đơn đặt sân');
        await loadBookings();
      }
    );
  };

  const handleReject = (booking) => {
    confirmAction(
      'Từ chối đơn đặt',
      'Bạn có chắc chắn muốn từ chối đơn đặt sân này?',
      'Từ chối',
      async () => {
        const now = new Date().toISOString();
        await db.update('bookings', booking.id, {
          status: 'rejected',
          rejectReason: 'Chủ sân từ chối do lịch thi đấu kín',
          rejectedAt: now,
        });
        await db.add('notifications', {
          userId: booking.userId,
          title: 'Lịch đặt bị từ chối ❌',
          body: `Lịch đặt ${booking.courtName} (${booking.subCourt}) lúc ${booking.startTime} đã bị chủ sân từ chối.`,
          type: 'booking_rejected',
          read: false,
          createdAt: now,
        });
        notify('Đã từ chối', 'Đơn đặt sân đã được chuyển trạng thái từ chối');
        await loadBookings();
      },
      true
    );
  };

  // Mở máy quét QR
  const openScanner = async () => {
    if (!permission || !permission.granted) {
      const res = await requestPermission();
      if (!res.granted) {
        notify('Quyền truy cập', 'Vui lòng cấp quyền máy ảnh để quét mã QR check-in');
        return;
      }
    }
    setScanned(false);
    setScannerVisible(true);
  };

  // Xử lý mã QR / mã nhập tay
  const processQrCode = async (dataString) => {
    let parseRes = { success: false };
    try {
      parseRes = parseBookingQrPayload(dataString) || parseRes;
    } catch (e) {}

    let targetCode = dataString;
    let targetBookingId = null;

    if (parseRes.success && parseRes.data) {
      targetCode = parseRes.data.code;
      targetBookingId = parseRes.data.bookingId;
    }

    // Chỉ tìm trong các đơn thuộc chủ sân này
    const matched = bookings.find(
      (b) =>
        (targetBookingId && b.id === targetBookingId) ||
        (targetCode && b.code?.toUpperCase() === String(targetCode).trim().toUpperCase())
    );

    if (!matched) {
      notify('Không tồn tại ❌', `Không tìm thấy đơn đặt sân thuộc cụm sân của bạn với mã: ${targetCode}`);
      return false;
    }

    if (matched.status === 'pending') {
      notify('Đơn chưa được duyệt ⏳', 'Bạn cần bấm "Duyệt" đơn này ở tab "Chờ duyệt" trước khi check-in.');
      return false;
    }

    if (matched.status === 'checked_in') {
      notify(
        'Đã Check-in từ trước ⚠️',
        `Khách hàng "${matched.userName}" đã check-in vào sân lúc ${matched.checkedInAt ? dayjs(matched.checkedInAt).format('HH:mm DD/MM') : 'trước đó'}.`
      );
      return false;
    }

    if (matched.status === 'completed') {
      notify('Đơn đã hoàn thành ⚠️', 'Trận đấu của đơn này đã kết thúc, không thể check-in lại.');
      return false;
    }

    if (matched.status === 'cancelled' || matched.status === 'rejected' || matched.status === 'no_show') {
      notify(
        'Đơn không hợp lệ 🚫',
        `Đơn đặt sân này đã ở trạng thái: ${matched.status}.`
      );
      return false;
    }

    const todayStr = dayjs().format('YYYY-MM-DD');
    let dateWarning = '';
    if (matched.date !== todayStr) {
      dateWarning = `\n(Lưu ý: Lịch đặt là ngày ${formatDateVN(matched.date)})`;
    }

    // Cập nhật trạng thái thành đã check-in
    await db.update('bookings', matched.id, {
      status: 'checked_in',
      checkedInAt: new Date().toISOString(),
    });

    setScannerVisible(false);
    setActiveTab('confirmed');
    await loadBookings();

    notify(
      'Check-in Hợp lệ! ✅',
      `Khách hàng: ${matched.userName}\nSân: ${matched.courtName} (${matched.subCourt})\nGiờ: ${matched.startTime} - ${matched.endTime}${dateWarning}`
    );
    return true;
  };

  const handleBarcodeScanned = async ({ data }) => {
    if (scanned) return;
    setScanned(true);
    await processQrCode(data);
    setTimeout(() => setScanned(false), 2000);
  };

  const handleManualCheckIn = () => {
    if (!manualCode.trim()) {
      notify('Thiếu mã', 'Vui lòng nhập mã đơn đặt sân');
      return;
    }
    processQrCode(manualCode.trim());
    setManualCode('');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenTransition>
        <Header title="Lịch đặt & Quét QR" />

      {/* Top Banner quét QR */}
      <View style={[styles.scannerBanner, { backgroundColor: colors.primaryDark }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.bannerTitle}>Check-in khách tại sân</Text>
          <Text style={styles.bannerSubtitle}>
            Quét mã QR trên máy khách hoặc nhập mã để check-in tức thì
          </Text>
        </View>
        <TouchableOpacity style={styles.scanBtn} onPress={openScanner}>
          <Ionicons name="qr-code" size={20} color="#0B3D2E" />
          <Text style={styles.scanBtnText}>Quét QR</Text>
        </TouchableOpacity>
      </View>

      {/* Manual Code Input */}
      <View style={[styles.manualInputRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Ionicons name="search" size={18} color={colors.textSecondary} style={{ marginRight: 8 }} />
        <TextInput
          style={[styles.input, { color: colors.text }]}
          placeholder="Hoặc nhập mã đơn (vd: DS-261102-1001)..."
          placeholderTextColor={colors.textSecondary}
          value={manualCode}
          onChangeText={setManualCode}
          autoCapitalize="characters"
        />
        <Button
          title="Check-in"
          onPress={handleManualCheckIn}
          variant="primary"
          size="sm"
          style={{ marginLeft: 8 }}
        />
      </View>

      {/* Tabs với số lượng đếm */}
      <View style={[styles.tabsRow, { backgroundColor: colors.surfaceSecondary }]}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'pending' && [styles.tabActive, { backgroundColor: colors.primary }]]}
          onPress={() => setActiveTab('pending')}
        >
          <Text style={[styles.tabText, { color: activeTab === 'pending' ? '#FFFFFF' : colors.textSecondary }]}>
            Chờ duyệt ({pendingList.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'confirmed' && [styles.tabActive, { backgroundColor: colors.primary }]]}
          onPress={() => setActiveTab('confirmed')}
        >
          <Text style={[styles.tabText, { color: activeTab === 'confirmed' ? '#FFFFFF' : colors.textSecondary }]}>
            Đã xác nhận ({confirmedList.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'history' && [styles.tabActive, { backgroundColor: colors.primary }]]}
          onPress={() => setActiveTab('history')}
        >
          <Text style={[styles.tabText, { color: activeTab === 'history' ? '#FFFFFF' : colors.textSecondary }]}>
            Lịch sử ({historyList.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Bookings List */}
      <FlatList
        data={filteredBookings}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState
            icon="calendar-outline"
            title="Không có lịch đặt"
            description="Hiện không có lịch đặt sân nào trong trạng thái này."
          />
        }
        renderItem={({ item, index }) => {
          const statusInfo = BOOKING_STATUSES[item.status] || {
            label: item.status,
            color: colors.textSecondary,
            bg: colors.surfaceSecondary,
          };
          const pSummary = calcPaymentSummary(item);
          const payStatusInfo = PAYMENT_STATUS_MAP[pSummary.paymentStatus] || PAYMENT_STATUS_MAP.unpaid;

          return (
            <Animated.View
              entering={index < 8 ? FadeInDown.delay(index * 45).duration(260) : undefined}
              layout={LinearTransition.springify().damping(16).stiffness(180)}
            >
              <TouchableOpacity
                style={[
                  styles.itemCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
                item.status === 'checked_in' && { borderColor: '#16A34A', borderWidth: 1.5 },
                SHADOWS.sm,
              ]}
              activeOpacity={0.8}
              onPress={() => router.push(`/booking-detail/${item.id}`)}
            >
              <View style={styles.cardTop}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={[styles.codeText, { color: colors.text }]} numberOfLines={1}>{item.code}</Text>
                  <Text style={[styles.courtName, { color: colors.text }]} numberOfLines={2}>
                    {item.courtName} • <Text style={{ color: colors.primary, fontWeight: '700' }}>{item.subCourt}</Text>
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                  <View style={[styles.statusBadge, { backgroundColor: statusInfo.bg }]}>
                    <Text style={[styles.statusText, { color: statusInfo.color }]} numberOfLines={1}>
                      {statusInfo.label}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: payStatusInfo.bg }]}>
                    <Text style={[styles.statusText, { color: payStatusInfo.color }]} numberOfLines={1}>
                      {payStatusInfo.label}
                    </Text>
                  </View>
                </View>
              </View>

              <Text style={[styles.customerInfo, { color: colors.textSecondary }]} numberOfLines={1}>
                Khách: <Text style={{ fontWeight: '700', color: colors.text }}>{item.userName}</Text> • SĐT: {item.userPhone || '0981112233'}
              </Text>

              <View style={styles.timeRow}>
                <Ionicons name="time" size={14} color={colors.warning} />
                <Text style={[styles.timeText, { color: colors.warning }]} numberOfLines={1}>
                  {item.startTime} - {item.endTime} ({formatDateVN(item.date)})
                </Text>
              </View>

              {item.note ? (
                <Text style={[styles.noteText, { color: colors.textMuted }]} numberOfLines={1}>
                  Ghi chú: "{item.note}"
                </Text>
              ) : null}

              <View style={[styles.cardBottom, { borderTopColor: colors.border }]}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={[styles.amountText, { color: colors.primary }]} numberOfLines={1}>
                    {formatVND(item.finalAmount || item.totalPrice)}
                  </Text>
                  {pSummary.remaining > 0 && (
                    <Text style={styles.remainingText} numberOfLines={1}>
                      Thiếu: {formatVND(pSummary.remaining)}
                    </Text>
                  )}
                </View>

                {/* Hành động nhanh */}
                {item.status === 'pending' && (
                  <View style={styles.actionButtons}>
                    <TouchableOpacity
                      style={[styles.rejectBtn, { borderColor: colors.danger }]}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleReject(item);
                      }}
                    >
                      <Text style={[styles.rejectText, { color: colors.danger }]}>Từ chối</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.approveBtn, { backgroundColor: colors.primary }]}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleApprove(item);
                      }}
                    >
                      <Text style={styles.approveText}>Duyệt</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {item.status === 'confirmed' && (
                  <TouchableOpacity
                    style={[styles.checkInQuickBtn, { backgroundColor: colors.primaryDark }]}
                    onPress={(e) => {
                      e.stopPropagation();
                      processQrCode(item.code);
                    }}
                  >
                    <Ionicons name="checkmark-done" size={16} color="#A3E635" />
                    <Text style={styles.checkInQuickText}>Check-in ngay</Text>
                  </TouchableOpacity>
                )}

                {item.status === 'checked_in' && (
                  <TouchableOpacity
                    style={[styles.checkInQuickBtn, { backgroundColor: '#D97706' }]}
                    onPress={(e) => {
                      e.stopPropagation();
                      router.push(`/booking-detail/${item.id}`);
                    }}
                  >
                    <Ionicons name="exit-outline" size={16} color="#FFFFFF" />
                    <Text style={styles.checkInQuickText}>🏁 Check-out</Text>
                  </TouchableOpacity>
                )}
              </View>
            </TouchableOpacity>
          </Animated.View>
        );
        }}
      />

      {/* Camera QR Scanner Modal */}
      <Modal visible={scannerVisible} animationType="slide">
        <View style={styles.scannerContainer}>
          <CameraView
            style={StyleSheet.absoluteFillObject}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
          />

          {/* Scanner Overlay UI */}
          <View style={styles.scannerOverlay}>
            <View style={[styles.scannerHeader, { paddingTop: insets.top + 10 }]}>
              <Text style={styles.scannerTitle}>Quét mã QR Check-in</Text>
              <TouchableOpacity style={styles.closeScannerBtn} onPress={() => setScannerVisible(false)}>
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <View style={styles.scanTargetBox}>
              <View style={[styles.corner, styles.cornerTL]} />
              <View style={[styles.corner, styles.cornerTR]} />
              <View style={[styles.corner, styles.cornerBL]} />
              <View style={[styles.corner, styles.cornerBR]} />
            </View>

            <Text style={styles.scannerInstructions}>
              Hướng camera vào mã QR trên điện thoại khách hàng để tự động check-in
            </Text>
          </View>
        </View>
      </Modal>
      </ScreenTransition>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scannerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    marginHorizontal: SPACING.md,
    marginTop: SPACING.md,
    borderRadius: RADIUS.lg,
    gap: SPACING.md,
  },
  bannerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  bannerSubtitle: {
    fontSize: 12,
    color: '#E2E8F0',
    marginTop: 2,
    lineHeight: 16,
  },
  scanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#A3E635',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
  },
  scanBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0B3D2E',
  },
  manualInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: SPACING.md,
    marginTop: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: RADIUS.md,
    borderWidth: 1,
  },
  input: {
    flex: 1,
    fontSize: 13,
    paddingVertical: 4,
  },
  tabsRow: {
    flexDirection: 'row',
    marginHorizontal: SPACING.md,
    marginTop: SPACING.sm,
    borderRadius: RADIUS.md,
    padding: 3,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.sm,
  },
  tabActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '700',
  },
  listContent: {
    padding: SPACING.md,
    gap: SPACING.md,
  },
  itemCard: {
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    gap: 6,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  codeText: {
    fontSize: 14,
    fontWeight: '800',
  },
  courtName: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.xs,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
  },
  customerInfo: {
    fontSize: 12,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  noteText: {
    fontSize: 11,
    fontStyle: 'italic',
  },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 0.5,
  },
  amountText: {
    fontSize: 15,
    fontWeight: '900',
  },
  remainingText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#EF4444',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  rejectBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
  },
  rejectText: {
    fontSize: 12,
    fontWeight: '700',
  },
  approveBtn: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: RADIUS.sm,
  },
  approveText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  checkInQuickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.sm,
  },
  checkInQuickText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  scannerContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  scannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 60,
  },
  scannerHeader: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
  },
  scannerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  closeScannerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanTargetBox: {
    width: 260,
    height: 260,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: '#A3E635',
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
  },
  scannerInstructions: {
    fontSize: 13,
    color: '#FFFFFF',
    textAlign: 'center',
    paddingHorizontal: SPACING.xl,
    lineHeight: 18,
  },
});