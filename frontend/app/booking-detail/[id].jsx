import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import dayjs from 'dayjs';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Header } from '../../components/ui/Header';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { db } from '../../services/db';
import { formatVND, formatDateVN, formatDateTimeVN } from '../../utils/format';
import { calcPaymentSummary, PAYMENT_STATUS_MAP } from '../../utils/payment';
import { BOOKING_STATUSES } from '../../constants/sports';
import { confirmAction, notify } from '../../utils/dialog';
import { RADIUS, SPACING, SHADOWS } from '../../constants/theme';

export default function BookingDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const { colors } = useTheme();

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [court, setCourt] = useState(null);

  // Modals state
  const [showQrModal, setShowQrModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash'); // cash | qr
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNote, setPaymentNote] = useState('');
  const [showExtraModal, setShowExtraModal] = useState(false);
  const [extraName, setExtraName] = useState('');
  const [extraAmount, setExtraAmount] = useState('');
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [showComplaintModal, setShowComplaintModal] = useState(false);
  const [complaintText, setComplaintText] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const isOwner = user?.role === 'owner' || user?.id === booking?.ownerId;
  const isUser = user?.role === 'user' || user?.id === booking?.userId;

  const loadBooking = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await db.getById('bookings', id);
      if (data) {
        setBooking(data);
        if (data.courtId) {
          const courtData = await db.getById('courts', data.courtId);
          setCourt(courtData);
        }
      }
    } catch (err) {
      console.warn('Lỗi tải đơn đặt:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadBooking();
  }, [loadBooking]);

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Header title="Chi tiết đơn đặt" showBack onBack={() => router.back()} />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Đang tải dữ liệu đơn đặt...
          </Text>
        </View>
      </View>
    );
  }

  if (!booking) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Header title="Chi tiết đơn đặt" showBack onBack={() => router.back()} />
        <View style={styles.centerContainer}>
          <Ionicons name="document-text-outline" size={64} color={colors.textSecondary} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Không tìm thấy đơn đặt</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            Đơn đặt sân có thể đã bị xóa hoặc không tồn tại.
          </Text>
          <Button title="Quay lại" onPress={() => router.back()} style={{ marginTop: SPACING.md }} />
        </View>
      </View>
    );
  }

  const paymentSummary = calcPaymentSummary(booking);
  const statusInfo = BOOKING_STATUSES[booking.status] || {
    label: booking.status,
    color: '#64748B',
    bg: '#F1F5F9',
  };
  const payStatusInfo = PAYMENT_STATUS_MAP[paymentSummary.paymentStatus] || PAYMENT_STATUS_MAP.unpaid;

  // --- HÀNH ĐỘNG CỦA CHỦ SÂN ---

  // 1. Duyệt đơn
  const handleApprove = () => {
    confirmAction(
      'Xác nhận duyệt đơn',
      `Bạn có chắc chắn muốn duyệt đơn ${booking.code} cho khách ${booking.userName}?`,
      'Duyệt ngay',
      async () => {
        try {
          setActionLoading(true);
          const now = new Date().toISOString();
          const updated = await db.update('bookings', booking.id, {
            status: 'confirmed',
            approvedAt: now,
          });
          setBooking(updated);

          // Thông báo cho User
          await db.add('notifications', {
            userId: booking.userId,
            title: 'Lịch đặt sân đã được duyệt 🎉',
            body: `Chủ sân đã duyệt đơn ${booking.code} (${booking.courtName} - ${booking.subCourt}) lúc ${booking.startTime} ngày ${booking.date}. Mã QR check-in đã sẵn sàng!`,
            type: 'booking_confirmed',
            read: false,
            createdAt: now,
          });

          notify('Thành công', 'Đã duyệt đơn đặt sân thành công!');
        } catch (err) {
          notify('Lỗi', err.message || 'Không thể duyệt đơn');
        } finally {
          setActionLoading(false);
        }
      }
    );
  };

  // 2. Từ chối đơn
  const handleReject = async () => {
    if (!rejectReason.trim()) {
      notify('Thiếu thông tin', 'Vui lòng nhập lý do từ chối đơn đặt.');
      return;
    }
    try {
      setActionLoading(true);
      const now = new Date().toISOString();
      const updated = await db.update('bookings', booking.id, {
        status: 'rejected',
        rejectReason: rejectReason.trim(),
        rejectedAt: now,
      });
      setBooking(updated);
      setShowRejectModal(false);

      // Thông báo cho User
      await db.add('notifications', {
        userId: booking.userId,
        title: 'Đơn đặt sân bị từ chối ⚠️',
        body: `Đơn ${booking.code} tại ${booking.courtName} bị từ chối với lý do: "${rejectReason.trim()}".`,
        type: 'booking_rejected',
        read: false,
        createdAt: now,
      });

      notify('Đã từ chối', 'Đơn đặt sân đã được chuyển trạng thái từ chối.');
    } catch (err) {
      notify('Lỗi', err.message || 'Không thể từ chối đơn');
    } finally {
      setActionLoading(false);
    }
  };

  // 3. Check-in
  const handleCheckIn = () => {
    if (booking.status !== 'confirmed') {
      notify('Không thể Check-in', 'Chỉ có thể check-in các đơn ở trạng thái Đã xác nhận.');
      return;
    }
    confirmAction(
      'Xác nhận Check-in',
      `Check-in đón khách ${booking.userName} vào sân ${booking.subCourt}?`,
      'Check-in',
      async () => {
        try {
          setActionLoading(true);
          const now = new Date().toISOString();
          const updated = await db.update('bookings', booking.id, {
            status: 'checked_in',
            checkedInAt: now,
          });
          setBooking(updated);

          // Thông báo cho User
          await db.add('notifications', {
            userId: booking.userId,
            title: 'Đã check-in vào sân ⚽',
            body: `Bạn đã check-in thành công tại ${booking.courtName} (${booking.subCourt}). Chúc bạn có trận đấu tuyệt vời!`,
            type: 'booking_checked_in',
            read: false,
            createdAt: now,
          });

          notify('Thành công', 'Khách đã check-in thành công!');
        } catch (err) {
          notify('Lỗi', err.message || 'Không thể check-in');
        } finally {
          setActionLoading(false);
        }
      }
    );
  };

  // 4. Ghi nhận thanh toán
  const handleSavePayment = async () => {
    const num = Number(paymentAmount.replace(/\D/g, ''));
    if (!num || num <= 0) {
      notify('Số tiền không hợp lệ', 'Vui lòng nhập số tiền thu thực tế lớn hơn 0đ.');
      return;
    }

    try {
      setActionLoading(true);
      const now = new Date().toISOString();
      const newPayment = {
        id: `pay_${Date.now()}`,
        type: paymentSummary.amountPaid === 0 ? 'deposit' : 'balance',
        method: paymentMethod,
        amount: num,
        at: now,
        note: paymentNote.trim() || (paymentMethod === 'cash' ? 'Thu tiền mặt tại sân' : 'Chuyển khoản ngân hàng'),
        recordedBy: user?.fullName || 'Chủ sân',
      };

      const existingPayments = Array.isArray(booking.payments) ? booking.payments : [];
      const updatedPayments = [...existingPayments, newPayment];

      // Tính lại summary
      const tempBooking = { ...booking, payments: updatedPayments };
      const newSummary = calcPaymentSummary(tempBooking);

      const updated = await db.update('bookings', booking.id, {
        payments: updatedPayments,
        amountPaid: newSummary.amountPaid,
        remaining: newSummary.remaining,
        paymentStatus: newSummary.paymentStatus,
      });

      setBooking(updated);
      setShowPaymentModal(false);
      setPaymentAmount('');
      setPaymentNote('');
      notify('Đã ghi nhận', `Đã ghi nhận thanh toán ${formatVND(num)} thành công!`);
    } catch (err) {
      notify('Lỗi', err.message || 'Không thể lưu thanh toán');
    } finally {
      setActionLoading(false);
    }
  };

  // 5. Thêm phát sinh
  const handleAddExtra = async () => {
    const num = Number(extraAmount.replace(/\D/g, ''));
    if (!extraName.trim()) {
      notify('Thiếu thông tin', 'Vui lòng nhập tên dịch vụ/phát sinh.');
      return;
    }
    if (!num || num <= 0) {
      notify('Số tiền không hợp lệ', 'Vui lòng nhập số tiền phát sinh.');
      return;
    }

    try {
      setActionLoading(true);
      const now = new Date().toISOString();
      const newExtra = {
        id: `ec_${Date.now()}`,
        name: extraName.trim(),
        amount: num,
        at: now,
      };

      const existingExtras = Array.isArray(booking.extraCharges) ? booking.extraCharges : [];
      const updatedExtras = [...existingExtras, newExtra];

      const tempBooking = { ...booking, extraCharges: updatedExtras };
      const newSummary = calcPaymentSummary(tempBooking);

      const updated = await db.update('bookings', booking.id, {
        extraCharges: updatedExtras,
        remaining: newSummary.remaining,
        paymentStatus: newSummary.paymentStatus,
      });

      setBooking(updated);
      setShowExtraModal(false);
      setExtraName('');
      setExtraAmount('');
      notify('Đã thêm', `Đã thêm khoản phát sinh "${newExtra.name}" (${formatVND(num)}).`);
    } catch (err) {
      notify('Lỗi', err.message || 'Không thể thêm phát sinh');
    } finally {
      setActionLoading(false);
    }
  };

  // 6. Check-out
  const handleOpenCheckout = () => {
    if (booking.status !== 'checked_in') {
      notify('Không thể Check-out', 'Đơn đặt cần ở trạng thái Đang thi đấu (checked_in) để thực hiện check-out.');
      return;
    }
    setShowCheckoutModal(true);
  };

  const handleFinishCheckout = async (withPayment = false) => {
    try {
      setActionLoading(true);
      const now = new Date().toISOString();
      let updatedPayments = Array.isArray(booking.payments) ? [...booking.payments] : [];

      if (withPayment && paymentSummary.remaining > 0) {
        updatedPayments.push({
          id: `pay_${Date.now()}_checkout`,
          type: 'balance',
          method: 'cash',
          amount: paymentSummary.remaining,
          at: now,
          note: 'Thu nốt tiền mặt khi check-out',
          recordedBy: user?.fullName || 'Chủ sân',
        });
      }

      const tempBooking = { ...booking, payments: updatedPayments };
      const newSummary = calcPaymentSummary(tempBooking);

      const updated = await db.update('bookings', booking.id, {
        status: 'completed',
        checkedOutAt: now,
        completedAt: now,
        payments: updatedPayments,
        amountPaid: newSummary.amountPaid,
        remaining: newSummary.remaining,
        paymentStatus: newSummary.paymentStatus,
      });

      setBooking(updated);
      setShowCheckoutModal(false);

      // Thông báo cho User mời đánh giá
      await db.add('notifications', {
        userId: booking.userId,
        title: 'Hoàn tất trận đấu! Mời đánh giá ⭐',
        body: `Bạn vừa hoàn tất trận đấu tại ${booking.courtName}. Hãy để lại đánh giá để giúp sân nâng cao chất lượng phục vụ nhé!`,
        type: 'booking_completed',
        read: false,
        createdAt: now,
      });

      notify('Hoàn thành', 'Đã check-out và hoàn thành đơn đặt sân thành công!');
    } catch (err) {
      notify('Lỗi', err.message || 'Không thể check-out');
    } finally {
      setActionLoading(false);
    }
  };

  // 7. Đánh dấu không đến (no_show)
  const handleNoShow = () => {
    confirmAction(
      'Khách không đến',
      `Đánh dấu khách ${booking.userName} không đến nhận sân? Đơn sẽ chuyển sang trạng thái "Khách không đến".`,
      'Xác nhận',
      async () => {
        try {
          setActionLoading(true);
          const updated = await db.update('bookings', booking.id, {
            status: 'no_show',
          });
          setBooking(updated);
          notify('Đã cập nhật', 'Đã ghi nhận khách không đến sân.');
        } catch (err) {
          notify('Lỗi', err.message || 'Không thể cập nhật');
        } finally {
          setActionLoading(false);
        }
      },
      true
    );
  };

  // 8. Hủy đơn
  const handleCancel = () => {
    confirmAction(
      'Xác nhận hủy đơn',
      'Bạn có chắc chắn muốn hủy đơn đặt sân này không?',
      'Hủy đơn',
      async () => {
        try {
          setActionLoading(true);
          const now = new Date().toISOString();
          const updated = await db.update('bookings', booking.id, {
            status: 'cancelled',
            cancelledAt: now,
          });
          setBooking(updated);

          // Thông báo cho đối phương
          const targetUserId = isOwner ? booking.userId : booking.ownerId;
          if (targetUserId) {
            await db.add('notifications', {
              userId: targetUserId,
              title: 'Lịch đặt đã bị hủy ❌',
              body: `Đơn ${booking.code} (${booking.courtName}) đã bị hủy bởi ${user?.fullName || 'Người dùng'}.`,
              type: 'booking_cancelled',
              read: false,
              createdAt: now,
            });
          }

          notify('Đã hủy', 'Đơn đặt sân đã được hủy thành công.');
        } catch (err) {
          notify('Lỗi', err.message || 'Không thể hủy đơn');
        } finally {
          setActionLoading(false);
        }
      },
      true
    );
  };

  // 9. Gửi khiếu nại (User)
  const handleSubmitComplaint = async () => {
    if (!complaintText.trim()) {
      notify('Thiếu nội dung', 'Vui lòng nhập nội dung khiếu nại.');
      return;
    }
    try {
      setActionLoading(true);
      await db.add('complaints', {
        bookingId: booking.id,
        bookingCode: booking.code,
        userId: user?.id,
        userName: user?.fullName || 'Người dùng',
        ownerId: booking.ownerId,
        courtName: booking.courtName,
        content: complaintText.trim(),
        status: 'new',
        createdAt: new Date().toISOString(),
      });
      setShowComplaintModal(false);
      setComplaintText('');
      notify('Đã gửi khiếu nại', 'Ban quản trị sẽ xem xét và phản hồi trong thời gian sớm nhất.');
    } catch (err) {
      notify('Lỗi', err.message || 'Không thể gửi khiếu nại');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCall = (phone) => {
    if (!phone) {
      notify('Thông báo', 'Không có số điện thoại liên hệ.');
      return;
    }
    Linking.openURL(`tel:${phone}`);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title="Chi tiết đơn đặt" showBack onBack={() => router.back()} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header Card: Code & Badges */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, SHADOWS.sm]}>
          <View style={styles.headerTopRow}>
            <View>
              <Text style={[styles.labelMuted, { color: colors.textSecondary }]}>MÃ ĐƠN ĐẶT</Text>
              <Text style={[styles.bookingCode, { color: colors.text }]}>{booking.code}</Text>
            </View>
            <View style={styles.badgeRow}>
              <View style={[styles.statusBadge, { backgroundColor: statusInfo.bg }]}>
                <Text style={[styles.statusText, { color: statusInfo.color }]}>
                  {statusInfo.label}
                </Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: payStatusInfo.bg }]}>
                <Text style={[styles.statusText, { color: payStatusInfo.color }]}>
                  {payStatusInfo.label}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Timeline tiến trình */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, SHADOWS.sm]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Tiến trình đơn đặt</Text>
          <View style={styles.timelineRow}>
            {/* Step 1: Đã đặt */}
            <View style={styles.timelineStep}>
              <View style={[styles.timelineDot, { backgroundColor: colors.primary }]}>
                <Ionicons name="receipt" size={14} color="#FFFFFF" />
              </View>
              <Text style={[styles.timelineLabel, { color: colors.text }]}>Đã đặt</Text>
              <Text style={[styles.timelineTime, { color: colors.textSecondary }]}>
                {booking.createdAt ? dayjs(booking.createdAt).format('HH:mm DD/MM') : '---'}
              </Text>
            </View>
            <View style={[styles.timelineLine, { backgroundColor: booking.approvedAt ? colors.primary : colors.border }]} />

            {/* Step 2: Đã duyệt */}
            <View style={styles.timelineStep}>
              <View style={[styles.timelineDot, { backgroundColor: booking.approvedAt ? colors.primary : colors.border }]}>
                <Ionicons name="checkmark-done" size={14} color="#FFFFFF" />
              </View>
              <Text style={[styles.timelineLabel, { color: colors.text }]}>Đã duyệt</Text>
              <Text style={[styles.timelineTime, { color: colors.textSecondary }]}>
                {booking.approvedAt ? dayjs(booking.approvedAt).format('HH:mm DD/MM') : 'Chờ duyệt'}
              </Text>
            </View>
            <View style={[styles.timelineLine, { backgroundColor: booking.checkedInAt ? colors.primary : colors.border }]} />

            {/* Step 3: Check-in */}
            <View style={styles.timelineStep}>
              <View style={[styles.timelineDot, { backgroundColor: booking.checkedInAt ? colors.primary : colors.border }]}>
                <Ionicons name="enter" size={14} color="#FFFFFF" />
              </View>
              <Text style={[styles.timelineLabel, { color: colors.text }]}>Check-in</Text>
              <Text style={[styles.timelineTime, { color: colors.textSecondary }]}>
                {booking.checkedInAt ? dayjs(booking.checkedInAt).format('HH:mm DD/MM') : 'Chưa'}
              </Text>
            </View>
            <View style={[styles.timelineLine, { backgroundColor: booking.completedAt ? colors.primary : colors.border }]} />

            {/* Step 4: Check-out / Hoàn thành */}
            <View style={styles.timelineStep}>
              <View style={[styles.timelineDot, { backgroundColor: booking.completedAt ? colors.primary : colors.border }]}>
                <Ionicons name="flag" size={14} color="#FFFFFF" />
              </View>
              <Text style={[styles.timelineLabel, { color: colors.text }]}>Hoàn thành</Text>
              <Text style={[styles.timelineTime, { color: colors.textSecondary }]}>
                {booking.completedAt ? dayjs(booking.completedAt).format('HH:mm DD/MM') : 'Chưa'}
              </Text>
            </View>
          </View>
        </View>

        {/* Thông tin khách hàng & sân */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, SHADOWS.sm]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Thông tin thi đấu</Text>

          {/* Sân & Sân con */}
          <View style={styles.infoRow}>
            <View style={styles.infoIconBox}>
              <Ionicons name="business" size={18} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Cụm sân</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>{booking.courtName}</Text>
              <Text style={[styles.infoSubValue, { color: colors.primary }]}>{booking.subCourt || 'Sân tiêu chuẩn'}</Text>
            </View>
          </View>

          {/* Thời gian */}
          <View style={styles.infoRow}>
            <View style={styles.infoIconBox}>
              <Ionicons name="calendar" size={18} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Thời gian đá</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>
                {formatDateVN(booking.date)} • {booking.startTime} - {booking.endTime}
              </Text>
            </View>
          </View>

          {/* Khách hàng */}
          <View style={styles.infoRow}>
            <View style={styles.infoIconBox}>
              <Ionicons name="person" size={18} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Người đặt sân</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>{booking.userName || 'Khách thể thao'}</Text>
              <Text style={[styles.infoSubValue, { color: colors.textSecondary }]}>{booking.userPhone || 'Không có SĐT'}</Text>
            </View>
            <View style={styles.contactButtonsRow}>
              <TouchableOpacity
                style={[styles.circleActionBtn, { backgroundColor: '#DCFCE7' }]}
                onPress={() => handleCall(booking.userPhone)}
              >
                <Ionicons name="call" size={16} color="#16A34A" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Ghi chú */}
          {Boolean(booking.note) && (
            <View style={styles.infoRow}>
              <View style={styles.infoIconBox}>
                <Ionicons name="document-text" size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Ghi chú từ khách</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>{booking.note}</Text>
              </View>
            </View>
          )}

          {/* Lý do từ chối nếu có */}
          {Boolean(booking.rejectReason) && (
            <View style={[styles.rejectAlert, { backgroundColor: '#FEE2E2', borderColor: '#FCA5A5' }]}>
              <Ionicons name="alert-circle" size={18} color="#EF4444" />
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '700', color: '#B91C1C' }}>Lý do từ chối:</Text>
                <Text style={{ color: '#991B1B', fontSize: 13, marginTop: 2 }}>{booking.rejectReason}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Bảng chi tiết thanh toán */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, SHADOWS.sm]}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Chi tiết thanh toán</Text>
            {isOwner && booking.status !== 'completed' && booking.status !== 'cancelled' && (
              <TouchableOpacity
                style={styles.addExtraBtn}
                onPress={() => setShowExtraModal(true)}
              >
                <Ionicons name="add-circle-outline" size={16} color={colors.primary} />
                <Text style={[styles.addExtraText, { color: colors.primary }]}>+ Thêm phát sinh</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.billRow}>
            <Text style={[styles.billLabel, { color: colors.textSecondary }]}>Tiền thuê sân:</Text>
            <Text style={[styles.billValue, { color: colors.text }]}>
              {formatVND(booking.totalPrice || booking.finalAmount)}
            </Text>
          </View>

          {Boolean(booking.discountAmount) && (
            <View style={styles.billRow}>
              <Text style={[styles.billLabel, { color: colors.textSecondary }]}>
                Giảm giá voucher ({booking.voucherCode}):
              </Text>
              <Text style={[styles.billValue, { color: '#EF4444' }]}>
                -{formatVND(booking.discountAmount)}
              </Text>
            </View>
          )}

          {/* Danh sách phát sinh */}
          {Array.isArray(booking.extraCharges) && booking.extraCharges.length > 0 && (
            <View style={styles.extrasContainer}>
              <Text style={[styles.extrasTitle, { color: colors.textSecondary }]}>Dịch vụ phát sinh:</Text>
              {booking.extraCharges.map((ec, idx) => (
                <View key={ec.id || idx} style={styles.billRowSub}>
                  <Text style={[styles.billSubLabel, { color: colors.textSecondary }]}>• {ec.name}:</Text>
                  <Text style={[styles.billSubValue, { color: colors.text }]}>+{formatVND(ec.amount)}</Text>
                </View>
              ))}
            </View>
          )}

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* TỔNG PHẢI TRẢ */}
          <View style={styles.billRow}>
            <Text style={[styles.totalLabel, { color: colors.text }]}>TỔNG PHẢI TRẢ:</Text>
            <Text style={[styles.totalValue, { color: colors.text }]}>
              {formatVND(paymentSummary.totalDue)}
            </Text>
          </View>

          {/* Lịch sử các khoản đã thu */}
          <View style={styles.paymentsListContainer}>
            <Text style={[styles.paymentsListTitle, { color: colors.textSecondary }]}>
              Các khoản đã thanh toán:
            </Text>
            {Array.isArray(booking.payments) && booking.payments.length > 0 ? (
              booking.payments.map((p, idx) => (
                <View key={p.id || idx} style={styles.paymentItem}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.paymentMethod, { color: colors.text }]}>
                      {p.method === 'qr' ? '💳 Quét QR chuyển khoản' : '💵 Tiền mặt'}
                      {p.type === 'deposit' ? ' (Đặt cọc)' : p.type === 'refund' ? ' (Hoàn trả)' : ''}
                    </Text>
                    <Text style={[styles.paymentDate, { color: colors.textSecondary }]}>
                      {formatDateTimeVN(p.at)} • {p.note || 'Không có ghi chú'}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.paymentAmount,
                      { color: p.type === 'refund' ? '#EF4444' : '#16A34A' },
                    ]}
                  >
                    {p.type === 'refund' ? '-' : '+'}{formatVND(p.amount)}
                  </Text>
                </View>
              ))
            ) : (
              <Text style={[styles.noPaymentText, { color: colors.textSecondary }]}>
                Chưa có khoản thanh toán nào được ghi nhận.
              </Text>
            )}
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* Đã thanh toán & Còn lại */}
          <View style={styles.billRow}>
            <Text style={[styles.billLabel, { color: colors.textSecondary }]}>Đã thanh toán:</Text>
            <Text style={[styles.billValue, { color: '#16A34A', fontWeight: '800' }]}>
              {formatVND(paymentSummary.amountPaid)}
            </Text>
          </View>

          <View style={styles.billRow}>
            <Text style={[styles.remainingLabel, { color: colors.text }]}>CÒN THIẾU / CÒN LẠI:</Text>
            <Text
              style={[
                styles.remainingValue,
                { color: paymentSummary.remaining > 0 ? '#EF4444' : '#16A34A' },
              ]}
            >
              {formatVND(paymentSummary.remaining)}
            </Text>
          </View>
        </View>

        {/* KHỐI HÀNH ĐỘNG DÀNH CHO CHỦ SÂN */}
        {isOwner && (
          <View style={styles.actionsContainer}>
            {/* Trạng thái PENDING: Duyệt / Từ chối */}
            {booking.status === 'pending' && (
              <View style={styles.buttonRow}>
                <Button
                  title="Từ chối"
                  variant="outline"
                  onPress={() => setShowRejectModal(true)}
                  style={{ flex: 1 }}
                  destructive
                />
                <Button
                  title="Duyệt đơn ngay"
                  variant="primary"
                  onPress={handleApprove}
                  style={{ flex: 1.5 }}
                  loading={actionLoading}
                />
              </View>
            )}

            {/* Trạng thái CONFIRMED: Check-in, Ghi nhận tiền, Hủy, Không đến */}
            {booking.status === 'confirmed' && (
              <View style={styles.buttonStack}>
                <Button
                  title="⚽ Check-in vào sân"
                  variant="primary"
                  size="lg"
                  onPress={handleCheckIn}
                  loading={actionLoading}
                />
                <View style={styles.buttonRow}>
                  {paymentSummary.remaining > 0 && (
                    <Button
                      title="Thu tiền / Ghi nhận"
                      variant="outline"
                      onPress={() => {
                        setPaymentAmount(String(paymentSummary.remaining));
                        setShowPaymentModal(true);
                      }}
                      style={{ flex: 1 }}
                    />
                  )}
                  <Button
                    title="Khách không đến"
                    variant="outline"
                    onPress={handleNoShow}
                    style={{ flex: 1 }}
                  />
                </View>
                <Button
                  title="Hủy đơn đặt sân"
                  variant="ghost"
                  onPress={handleCancel}
                  destructive
                />
              </View>
            )}

            {/* Trạng thái CHECKED_IN: Check-out, Ghi nhận tiền, Thêm phát sinh */}
            {booking.status === 'checked_in' && (
              <View style={styles.buttonStack}>
                <Button
                  title="🏁 Kết thúc & Check-out"
                  variant="primary"
                  size="lg"
                  onPress={handleOpenCheckout}
                  loading={actionLoading}
                />
                {paymentSummary.remaining > 0 && (
                  <Button
                    title="Ghi nhận thanh toán"
                    variant="outline"
                    onPress={() => {
                      setPaymentAmount(String(paymentSummary.remaining));
                      setShowPaymentModal(true);
                    }}
                  />
                )}
              </View>
            )}
          </View>
        )}

        {/* KHỐI HÀNH ĐỘNG DÀNH CHO USER */}
        {isUser && !isOwner && (
          <View style={styles.actionsContainer}>
            {booking.status === 'confirmed' && (
              <Button
                title="Mã QR Check-in của tôi"
                variant="primary"
                size="lg"
                onPress={() => setShowQrModal(true)}
              />
            )}

            {['checked_in', 'completed'].includes(booking.status) && (
              <Button
                title="⭐ Đánh giá sân này"
                variant="outline"
                size="md"
                onPress={() =>
                  router.push({
                    pathname: '/review',
                    params: {
                      bookingId: booking.id,
                      courtId: booking.courtId,
                      courtName: booking.courtName,
                    },
                  })
                }
              />
            )}

            {['pending', 'confirmed'].includes(booking.status) && (
              <Button
                title="Hủy lịch đặt"
                variant="ghost"
                onPress={handleCancel}
                destructive
              />
            )}

            <TouchableOpacity
              style={styles.complaintLink}
              onPress={() => setShowComplaintModal(true)}
            >
              <Ionicons name="chatbubble-ellipses-outline" size={16} color={colors.textSecondary} />
              <Text style={[styles.complaintLinkText, { color: colors.textSecondary }]}>
                Gặp vấn đề? Gửi khiếu nại tới Ban quản trị
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* MODAL 1: QR CODE VIEW CHO USER */}
      <Modal visible={showQrModal} transparent animationType="fade" onRequestClose={() => setShowQrModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalContent, { backgroundColor: '#FFFFFF' }]}>
            <Text style={styles.qrModalHeader}>MÃ CHECK-IN TẠI SÂN</Text>
            <View style={styles.qrBox}>
              <QRCode
                value={booking.qrPayload || booking.code}
                size={220}
                color="#0B3D2E"
                backgroundColor="#FFFFFF"
              />
            </View>
            <Text style={styles.qrModalCode}>{booking.code}</Text>
            <Text style={styles.qrModalSub}>
              Đưa mã QR này cho Chủ sân quét khi bạn đến thi đấu
            </Text>
            <Button title="Đóng" variant="primary" onPress={() => setShowQrModal(false)} style={{ width: '100%', marginTop: 16 }} />
          </View>
        </View>
      </Modal>

      {/* MODAL 2: TỪ CHỐI ĐƠN */}
      <Modal visible={showRejectModal} transparent animationType="slide" onRequestClose={() => setShowRejectModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalFormContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalFormTitle, { color: colors.text }]}>Từ chối đơn đặt sân</Text>
            <Text style={[styles.modalFormDesc, { color: colors.textSecondary }]}>
              Vui lòng nhập lý do từ chối để thông báo cho khách hàng:
            </Text>
            <TextInput
              style={[styles.modalInput, { borderColor: colors.border, color: colors.text }]}
              placeholder="vd: Sân đang tổ chức bảo trì hệ thống đèn..."
              placeholderTextColor={colors.textSecondary}
              value={rejectReason}
              onChangeText={setRejectReason}
              multiline
              numberOfLines={3}
            />
            <View style={styles.modalBtnRow}>
              <Button title="Quay lại" variant="outline" onPress={() => setShowRejectModal(false)} style={{ flex: 1 }} />
              <Button title="Xác nhận từ chối" variant="primary" destructive onPress={handleReject} style={{ flex: 1 }} loading={actionLoading} />
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL 3: GHI NHẬN THANH TOÁN */}
      <Modal visible={showPaymentModal} transparent animationType="slide" onRequestClose={() => setShowPaymentModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalFormContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalFormTitle, { color: colors.text }]}>Ghi nhận thanh toán</Text>
            <Text style={[styles.modalFormDesc, { color: colors.textSecondary }]}>
              Còn lại cần thu: <Text style={{ fontWeight: '800', color: '#EF4444' }}>{formatVND(paymentSummary.remaining)}</Text>
            </Text>

            {/* Chọn hình thức */}
            <View style={styles.payMethodToggleRow}>
              <TouchableOpacity
                style={[
                  styles.payMethodToggle,
                  paymentMethod === 'cash' && { backgroundColor: '#16A34A', borderColor: '#16A34A' },
                ]}
                onPress={() => setPaymentMethod('cash')}
              >
                <Text style={[styles.payMethodToggleText, paymentMethod === 'cash' && { color: '#FFFFFF' }]}>
                  💵 Tiền mặt
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.payMethodToggle,
                  paymentMethod === 'qr' && { backgroundColor: '#16A34A', borderColor: '#16A34A' },
                ]}
                onPress={() => setPaymentMethod('qr')}
              >
                <Text style={[styles.payMethodToggleText, paymentMethod === 'qr' && { color: '#FFFFFF' }]}>
                  💳 Chuyển khoản / QR
                </Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={[styles.modalInput, { borderColor: colors.border, color: colors.text }]}
              placeholder="Số tiền thu (VNĐ)"
              placeholderTextColor={colors.textSecondary}
              keyboardType="numeric"
              value={paymentAmount}
              onChangeText={setPaymentAmount}
            />

            <TextInput
              style={[styles.modalInput, { borderColor: colors.border, color: colors.text }]}
              placeholder="Ghi chú (tùy chọn)"
              placeholderTextColor={colors.textSecondary}
              value={paymentNote}
              onChangeText={setPaymentNote}
            />

            <View style={styles.modalBtnRow}>
              <Button title="Hủy" variant="outline" onPress={() => setShowPaymentModal(false)} style={{ flex: 1 }} />
              <Button title="Lưu thanh toán" variant="primary" onPress={handleSavePayment} style={{ flex: 1 }} loading={actionLoading} />
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL 4: THÊM PHÁT SINH */}
      <Modal visible={showExtraModal} transparent animationType="slide" onRequestClose={() => setShowExtraModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalFormContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalFormTitle, { color: colors.text }]}>Thêm dịch vụ phát sinh</Text>
            <Text style={[styles.modalFormDesc, { color: colors.textSecondary }]}>
              Nước uống, thuê bóng, giày, áo bib, hoặc phí đá quá giờ:
            </Text>

            <TextInput
              style={[styles.modalInput, { borderColor: colors.border, color: colors.text }]}
              placeholder="Tên dịch vụ (vd: 4 chai nước Pocari, thuê 2 vợt...)"
              placeholderTextColor={colors.textSecondary}
              value={extraName}
              onChangeText={setExtraName}
            />

            <TextInput
              style={[styles.modalInput, { borderColor: colors.border, color: colors.text }]}
              placeholder="Số tiền (VNĐ)"
              placeholderTextColor={colors.textSecondary}
              keyboardType="numeric"
              value={extraAmount}
              onChangeText={setExtraAmount}
            />

            <View style={styles.modalBtnRow}>
              <Button title="Hủy" variant="outline" onPress={() => setShowExtraModal(false)} style={{ flex: 1 }} />
              <Button title="Thêm vào đơn" variant="primary" onPress={handleAddExtra} style={{ flex: 1 }} loading={actionLoading} />
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL 5: TỔNG KẾT CHECK-OUT */}
      <Modal visible={showCheckoutModal} transparent animationType="slide" onRequestClose={() => setShowCheckoutModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalFormContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalFormTitle, { color: colors.text }]}>Tổng kết Check-out</Text>

            <View style={styles.checkoutSummaryBox}>
              <View style={styles.billRow}>
                <Text style={{ color: colors.textSecondary }}>Giờ vào sân thực tế:</Text>
                <Text style={{ fontWeight: '700', color: colors.text }}>
                  {booking.checkedInAt ? dayjs(booking.checkedInAt).format('HH:mm') : '---'}
                </Text>
              </View>
              <View style={styles.billRow}>
                <Text style={{ color: colors.textSecondary }}>Giờ ra sân (hiện tại):</Text>
                <Text style={{ fontWeight: '700', color: colors.text }}>{dayjs().format('HH:mm')}</Text>
              </View>
              <View style={styles.billRow}>
                <Text style={{ color: colors.textSecondary }}>Tổng tiền phát sinh:</Text>
                <Text style={{ fontWeight: '700', color: colors.text }}>{formatVND(paymentSummary.extraTotal)}</Text>
              </View>
              <View style={styles.billRow}>
                <Text style={{ color: colors.textSecondary }}>Số tiền còn nợ:</Text>
                <Text
                  style={{
                    fontWeight: '900',
                    fontSize: 16,
                    color: paymentSummary.remaining > 0 ? '#EF4444' : '#16A34A',
                  }}
                >
                  {formatVND(paymentSummary.remaining)}
                </Text>
              </View>
            </View>

            {paymentSummary.remaining > 0 ? (
              <View style={{ gap: 10, marginTop: 12 }}>
                <Button
                  title={`Thu nốt ${formatVND(paymentSummary.remaining)} & Hoàn tất`}
                  variant="primary"
                  onPress={() => handleFinishCheckout(true)}
                  loading={actionLoading}
                />
                <Button
                  title="Xác nhận ghi nợ & Hoàn tất"
                  variant="outline"
                  onPress={() => handleFinishCheckout(false)}
                  loading={actionLoading}
                />
                <Button
                  title="Đóng lại"
                  variant="ghost"
                  onPress={() => setShowCheckoutModal(false)}
                />
              </View>
            ) : (
              <View style={{ gap: 10, marginTop: 12 }}>
                <Button
                  title="Xác nhận hoàn thành trận đấu"
                  variant="primary"
                  onPress={() => handleFinishCheckout(false)}
                  loading={actionLoading}
                />
                <Button
                  title="Đóng lại"
                  variant="ghost"
                  onPress={() => setShowCheckoutModal(false)}
                />
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* MODAL 6: GỬI KHIẾU NẠI */}
      <Modal visible={showComplaintModal} transparent animationType="slide" onRequestClose={() => setShowComplaintModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalFormContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalFormTitle, { color: colors.text }]}>Gửi khiếu nại đơn đặt</Text>
            <Text style={[styles.modalFormDesc, { color: colors.textSecondary }]}>
              Nêu rõ vấn đề bạn gặp phải (tiền cọc, chất lượng sân, thái độ phục vụ...):
            </Text>

            <TextInput
              style={[styles.modalInput, { borderColor: colors.border, color: colors.text }]}
              placeholder="Nhập nội dung khiếu nại..."
              placeholderTextColor={colors.textSecondary}
              value={complaintText}
              onChangeText={setComplaintText}
              multiline
              numberOfLines={4}
            />

            <View style={styles.modalBtnRow}>
              <Button title="Hủy" variant="outline" onPress={() => setShowComplaintModal(false)} style={{ flex: 1 }} />
              <Button title="Gửi khiếu nại" variant="primary" onPress={handleSubmitComplaint} style={{ flex: 1 }} loading={actionLoading} />
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
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: 14,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: SPACING.md,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
  },
  card: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.md,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  labelMuted: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  bookingCode: {
    fontSize: 18,
    fontWeight: '900',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  badgeRow: {
    alignItems: 'flex-end',
    gap: 4,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '800',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: SPACING.md,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  addExtraBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addExtraText: {
    fontSize: 13,
    fontWeight: '700',
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timelineStep: {
    alignItems: 'center',
    flex: 1,
  },
  timelineDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  timelineLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  timelineTime: {
    fontSize: 9,
    marginTop: 2,
  },
  timelineLine: {
    height: 2,
    flex: 0.8,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  infoIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 1,
  },
  infoSubValue: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 1,
  },
  contactButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  circleActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectAlert: {
    flexDirection: 'row',
    gap: 8,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    marginTop: 4,
  },
  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  billLabel: {
    fontSize: 13,
  },
  billValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  extrasContainer: {
    marginVertical: 4,
    paddingLeft: SPACING.sm,
  },
  extrasTitle: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
  },
  billRowSub: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  billSubLabel: {
    fontSize: 12,
  },
  billSubValue: {
    fontSize: 12,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    marginVertical: SPACING.sm,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '800',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '900',
  },
  remainingLabel: {
    fontSize: 14,
    fontWeight: '900',
  },
  remainingValue: {
    fontSize: 17,
    fontWeight: '900',
  },
  paymentsListContainer: {
    marginVertical: 6,
  },
  paymentsListTitle: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  paymentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E2E8F0',
  },
  paymentMethod: {
    fontSize: 13,
    fontWeight: '700',
  },
  paymentDate: {
    fontSize: 11,
    marginTop: 2,
  },
  paymentAmount: {
    fontSize: 14,
    fontWeight: '800',
  },
  noPaymentText: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  actionsContainer: {
    gap: SPACING.md,
    marginTop: SPACING.sm,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  buttonStack: {
    gap: SPACING.sm,
  },
  complaintLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: SPACING.sm,
  },
  complaintLinkText: {
    fontSize: 13,
    textDecorationLine: 'underline',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  modalContent: {
    width: '90%',
    maxWidth: 360,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    alignItems: 'center',
  },
  qrModalHeader: {
    fontSize: 13,
    fontWeight: '900',
    color: '#0B3D2E',
    letterSpacing: 1,
    marginBottom: 16,
  },
  qrBox: {
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.md,
  },
  qrModalCode: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
    marginTop: 14,
  },
  qrModalSub: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 16,
  },
  modalFormContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    gap: SPACING.md,
  },
  modalFormTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  modalFormDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    fontSize: 14,
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.sm,
  },
  payMethodToggleRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  payMethodToggle: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
  },
  payMethodToggleText: {
    fontSize: 13,
    fontWeight: '700',
  },
  checkoutSummaryBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    gap: 4,
  },
});
