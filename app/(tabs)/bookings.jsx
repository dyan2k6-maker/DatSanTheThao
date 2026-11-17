import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import dayjs from 'dayjs';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useBookings } from '../../hooks/useBookings';
import { db } from '../../services/db';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { ScreenTransition } from '../../components/ui/ScreenTransition';
import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated';
import { confirmAction, notify } from '../../utils/dialog';
import { calcPaymentSummary } from '../../utils/payment';
import { BOOKING_STATUSES } from '../../constants/sports';
import { formatVND, formatDateVN } from '../../utils/format';
import { RADIUS, SPACING, SHADOWS } from '../../constants/theme';

export default function BookingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { colors } = useTheme();

  const [activeTab, setActiveTab] = useState('upcoming'); // 'upcoming' | 'completed' | 'cancelled'
  const { bookings, loading, refetch } = useBookings(user?.id);

  // QR Modal
  const [qrModalVisible, setQrModalVisible] = useState(false);
  const [selectedBookingForQr, setSelectedBookingForQr] = useState(null);

  // Cancel Modal
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [bookingToCancel, setBookingToCancel] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);

  // Lọc theo tab
  const filteredList = bookings.filter((b) => {
    if (activeTab === 'upcoming') {
      return b.status === 'confirmed' || b.status === 'pending' || b.status === 'checked_in';
    }
    if (activeTab === 'completed') {
      return b.status === 'completed';
    }
    if (activeTab === 'cancelled') {
      return b.status === 'cancelled' || b.status === 'rejected';
    }
    return true;
  });

  const openQrModal = (booking) => {
    setSelectedBookingForQr(booking);
    setQrModalVisible(true);
  };

  const handleStartCancel = (booking) => {
    // Kiểm tra chính sách: có trước giờ thi đấu 2 tiếng không?
    const bookingDateTime = dayjs(`${booking.date} ${booking.startTime}`);
    const now = dayjs();
    const hoursDiff = bookingDateTime.diff(now, 'hour', true);

    if (hoursDiff < 2 && hoursDiff > 0) {
      notify(
        'Không thể hủy trực tiếp',
        'Lịch đặt chỉ có thể hủy trước giờ thi đấu ít nhất 2 tiếng theo quy chế. Vui lòng liên hệ trực tiếp với chủ sân để được hỗ trợ.'
      );
      return;
    }

    setBookingToCancel(booking);
    setCancelReason('');
    setCancelModalVisible(true);
  };

  const submitCancel = async () => {
    if (!bookingToCancel) return;
    setCancelLoading(true);
    try {
      await db.update('bookings', bookingToCancel.id, {
        status: 'cancelled',
        cancelReason: cancelReason.trim() || 'Người dùng hủy qua ứng dụng',
        cancelledAt: new Date().toISOString(),
      });
      setCancelModalVisible(false);
      notify('Thành công', 'Đã hủy lịch đặt sân thành công');
      await refetch();
    } catch (e) {
      notify('Lỗi', 'Không thể hủy lịch đặt sân');
    } finally {
      setCancelLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenTransition>
        {/* Header bar */}
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
        <Text style={[styles.headerTitle, { color: colors.text }]}>Lịch sử đặt sân</Text>

        {/* 3 Tabs */}
        <View style={[styles.tabsWrapper, { backgroundColor: colors.surfaceSecondary }]}>
          <TouchableOpacity
            style={[
              styles.tabBtn,
              activeTab === 'upcoming' && [styles.activeTabBtn, { backgroundColor: colors.primary }],
            ]}
            onPress={() => setActiveTab('upcoming')}
          >
            <Text
              style={[
                styles.tabText,
                { color: activeTab === 'upcoming' ? '#FFFFFF' : colors.textSecondary },
              ]}
            >
              Sắp tới
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
              Đã xong
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabBtn,
              activeTab === 'cancelled' && [styles.activeTabBtn, { backgroundColor: colors.primary }],
            ]}
            onPress={() => setActiveTab('cancelled')}
          >
            <Text
              style={[
                styles.tabText,
                { color: activeTab === 'cancelled' ? '#FFFFFF' : colors.textSecondary },
              ]}
            >
              Đã hủy
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* List of Bookings */}
      <FlatList
        data={filteredList}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState
            icon="calendar-outline"
            title="Chưa có lịch đặt nào"
            description="Bạn chưa có lịch đặt nào trong mục này. Hãy tìm sân và đặt ngay nhé!"
            actionTitle="Tìm sân ngay"
            onAction={() => router.push('/(tabs)/search')}
          />
        }
        renderItem={({ item, index }) => {
          const statusInfo = BOOKING_STATUSES[item.status] || {
            label: item.status,
            color: colors.textSecondary,
            bg: colors.surfaceSecondary,
          };
          const pay = calcPaymentSummary(item);
          let payBadgeText = 'Chưa trả';
          let payBadgeColor = '#EF4444';
          let payBadgeBg = '#FEE2E2';
          if (pay.paymentStatus === 'paid') {
            payBadgeText = 'Đã thanh toán đủ';
            payBadgeColor = '#10B981';
            payBadgeBg = '#D1FAE5';
          } else if (pay.paymentStatus === 'partial') {
            payBadgeText = `Đã cọc ${formatVND(pay.amountPaid)}`;
            payBadgeColor = '#F59E0B';
            payBadgeBg = '#FEF3C7';
          }

          return (
            <Animated.View
              entering={index < 8 ? FadeInDown.delay(index * 45).duration(260) : undefined}
              layout={LinearTransition.springify().damping(16).stiffness(180)}
            >
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => router.push(`/booking-detail/${item.id}`)}
                style={[
                  styles.bookingCard,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                  SHADOWS.md,
                ]}
              >
              {/* Card Header: Code & Status */}
              <View style={styles.cardHeader}>
                <View style={styles.codeRow}>
                  <Ionicons name="receipt-outline" size={16} color={colors.primary} />
                  <Text style={[styles.codeText, { color: colors.text }]}>{item.code}</Text>
                </View>

                <View style={{ flexDirection: 'row', gap: 6 }}>
                  <View style={[styles.statusBadge, { backgroundColor: payBadgeBg }]}>
                    <Text style={[styles.statusText, { color: payBadgeColor }]}>
                      {payBadgeText}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: statusInfo.bg }]}>
                    <Text style={[styles.statusText, { color: statusInfo.color }]}>
                      {statusInfo.label}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Court info */}
              <Text style={[styles.courtName, { color: colors.text }]}>{item.courtName}</Text>
              <Text style={[styles.subCourtName, { color: colors.textSecondary }]}>
                {item.subCourt || 'Sân tiêu chuẩn'}
              </Text>

              {/* Time & Date */}
              <View style={styles.infoRow}>
                <View style={styles.metaItem}>
                  <Ionicons name="calendar-outline" size={15} color={colors.primary} />
                  <Text style={[styles.metaText, { color: colors.text }]}>
                    {formatDateVN(item.date)}
                  </Text>
                </View>

                <View style={styles.metaItem}>
                  <Ionicons name="time-outline" size={15} color={colors.warning} />
                  <Text style={[styles.metaText, { color: colors.warning }]}>
                    {item.startTime} - {item.endTime}
                  </Text>
                </View>
              </View>

              {/* Price */}
              <View style={[styles.priceRow, { borderTopColor: colors.border }]}>
                <Text style={{ color: colors.textSecondary, fontSize: 13 }}>Tổng thanh toán:</Text>
                <Text style={[styles.priceValue, { color: colors.primary }]}>
                  {formatVND(item.finalAmount || item.totalPrice)}
                </Text>
              </View>

              {/* Action Buttons */}
              <View style={styles.actionsRow}>
                {/* QR Check-in button: only when confirmed or checked_in */}
                {(item.status === 'confirmed' || item.status === 'checked_in') && (
                  <TouchableOpacity
                    style={[styles.qrBtn, { backgroundColor: colors.primaryDark }]}
                    onPress={() => openQrModal(item)}
                  >
                    <Ionicons name="qr-code-outline" size={16} color="#A3E635" />
                    <Text style={styles.qrBtnText}>Mã Check-in</Text>
                  </TouchableOpacity>
                )}

                {item.status === 'pending' && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4 }}>
                    <Ionicons name="time-outline" size={14} color="#F59E0B" />
                    <Text style={{ fontSize: 12, color: '#F59E0B', fontWeight: '600' }}>Chờ chủ sân duyệt</Text>
                  </View>
                )}

                {/* Cancel button (pending or confirmed) */}
                {(item.status === 'pending' || item.status === 'confirmed') && (
                  <TouchableOpacity
                    style={[styles.cancelBtn, { borderColor: colors.danger }]}
                    onPress={() => handleStartCancel(item)}
                  >
                    <Text style={[styles.cancelBtnText, { color: colors.danger }]}>Hủy lịch</Text>
                  </TouchableOpacity>
                )}

                {/* Review button (checked_in or completed) */}
                {(item.status === 'checked_in' || item.status === 'completed') && (
                  <TouchableOpacity
                    style={[styles.reviewBtn, { backgroundColor: colors.warning }]}
                    onPress={() =>
                      router.push({
                        pathname: '/review',
                        params: {
                          bookingId: item.id,
                          courtId: item.courtId,
                          courtName: item.courtName,
                        },
                      })
                    }
                  >
                    <Ionicons name="star" size={15} color="#FFFFFF" />
                    <Text style={styles.reviewBtnText}>Đánh giá</Text>
                  </TouchableOpacity>
                )}

                {/* Re-book button */}
                <TouchableOpacity
                  style={[styles.rebookBtn, { backgroundColor: colors.surfaceSecondary }]}
                  onPress={() => router.push(`/court-detail/${item.courtId}`)}
                >
                  <Text style={[styles.rebookBtnText, { color: colors.text }]}>Đặt lại</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </Animated.View>
        );
        }}
      />

      {/* Large QR Check-in Modal */}
      <Modal visible={qrModalVisible} transparent animationType="fade" onRequestClose={() => setQrModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.qrModalCard, { backgroundColor: '#FFFFFF' }]}>
            <Text style={styles.qrModalHeader}>MÃ CHECK-IN TẠI SÂN</Text>
            <Text style={styles.qrModalSub}>Chủ sân sẽ dùng điện thoại quét mã này để xác nhận</Text>

            {selectedBookingForQr && (
              <View style={styles.qrWrapper}>
                <QRCode
                  value={selectedBookingForQr.qrPayload || selectedBookingForQr.code}
                  size={200}
                  color="#0B3D2E"
                  backgroundColor="#FFFFFF"
                />
              </View>
            )}

            <Text style={styles.modalCode}>{selectedBookingForQr?.code}</Text>
            <Text style={styles.modalCourtName}>{selectedBookingForQr?.courtName}</Text>
            <Text style={styles.modalTime}>
              {selectedBookingForQr?.startTime} - {selectedBookingForQr?.endTime} ({formatDateVN(selectedBookingForQr?.date)})
            </Text>

            <Button
              title="Đóng"
              onPress={() => setQrModalVisible(false)}
              variant="primary"
              size="md"
              style={{ width: '100%', marginTop: 16 }}
            />
          </View>
        </View>
      </Modal>

      {/* Cancel Confirmation Modal */}
      <Modal visible={cancelModalVisible} transparent animationType="slide" onRequestClose={() => setCancelModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.cancelModalCard, { backgroundColor: colors.surface }]}>
            <View style={styles.cancelWarningIcon}>
              <Ionicons name="alert-circle" size={40} color={colors.danger} />
            </View>
            <Text style={[styles.cancelModalTitle, { color: colors.text }]}>Hủy lịch đặt sân?</Text>
            <Text style={[styles.cancelModalDesc, { color: colors.textSecondary }]}>
              Bạn có chắc chắn muốn hủy đơn đặt sân {bookingToCancel?.courtName} lúc {bookingToCancel?.startTime} ngày {formatDateVN(bookingToCancel?.date)} không?
            </Text>

            <TextInput
              style={[
                styles.cancelInput,
                { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, color: colors.text },
              ]}
              placeholder="Nhập lý do hủy (bận việc, thời tiết...)"
              placeholderTextColor={colors.textMuted}
              value={cancelReason}
              onChangeText={setCancelReason}
            />

            <View style={styles.cancelModalActions}>
              <Button
                title="Giữ lịch"
                onPress={() => setCancelModalVisible(false)}
                variant="ghost"
                style={{ flex: 1, marginRight: 8 }}
              />
              <Button
                title="Xác nhận hủy"
                onPress={submitCancel}
                loading={cancelLoading}
                variant="danger"
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>
      </ScreenTransition>
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
  tabsWrapper: {
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
  bookingCard: {
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    marginBottom: SPACING.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  codeText: {
    fontSize: 13,
    fontWeight: '800',
    marginLeft: 4,
  },
  statusBadge: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: RADIUS.full,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
  },
  courtName: {
    fontSize: 16,
    fontWeight: '800',
  },
  subCourtName: {
    fontSize: 13,
    marginTop: 2,
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  metaText: {
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 4,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    marginBottom: 10,
  },
  priceValue: {
    fontSize: 16,
    fontWeight: '900',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  qrBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: RADIUS.sm,
    marginRight: 8,
  },
  qrBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    marginLeft: 4,
  },
  cancelBtn: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    marginRight: 8,
  },
  cancelBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  reviewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: RADIUS.sm,
    marginRight: 8,
  },
  reviewBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    marginLeft: 4,
  },
  rebookBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: RADIUS.sm,
  },
  rebookBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  qrModalCard: {
    width: '100%',
    padding: SPACING.xl,
    borderRadius: RADIUS.xl,
    alignItems: 'center',
  },
  qrModalHeader: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0B3D2E',
    letterSpacing: 1,
  },
  qrModalSub: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  qrWrapper: {
    padding: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  modalCode: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
    marginTop: 14,
  },
  modalCourtName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#16A34A',
    marginTop: 2,
  },
  modalTime: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  cancelModalCard: {
    width: '100%',
    padding: SPACING.xl,
    borderRadius: RADIUS.xl,
    alignItems: 'center',
  },
  cancelWarningIcon: {
    marginBottom: 10,
  },
  cancelModalTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 6,
  },
  cancelModalDesc: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 14,
  },
  cancelInput: {
    width: '100%',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    padding: 10,
    fontSize: 13,
    marginBottom: 16,
  },
  cancelModalActions: {
    flexDirection: 'row',
    width: '100%',
  },
});
